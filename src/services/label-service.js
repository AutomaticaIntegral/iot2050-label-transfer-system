/**
 * Servicio de gestión de etiquetas
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const { log } = require('../utils/logger');
const { 
  saveLabelInfo, 
  getAllLabels, 
  getLabelById, 
  saveCounter, 
  getCounter,
  incrementCounter,
  getRfidCounter,
  saveRfidCounter,
  incrementRfidCounter
} = require('../utils/file-handler');
const { 
  updateCounterInZpl, 
  extractCounterFromZpl, 
  extractCopiesFromZpl,
  determineContainerType,
  processZplForPrinting
} = require('../utils/zpl-utils');

// Configuración del comportamiento del sistema de etiquetas
const LABEL_PROCESSING_CONFIG = {
  // Desactivar el split automático de etiquetas concatenadas
  AUTO_SPLIT_ENABLED: false,
  
  // Generar automáticamente etiquetas RFID desde normales
  AUTO_GENERATE_RFID: false,
  
  // Criterios de detección de etiquetas RFID
  RFID_DETECTION_PATTERNS: ['^RFW', '^RF,H', '^RB'],
  
  // Logging detallado de tipos de etiqueta
  DETAILED_TYPE_LOGGING: true
};

// Información de la última etiqueta recibida
let lastLabelInfo = null;
let lastRfidLabelInfo = null;

// Marcas de lectura por PLC - para evitar devolver la misma etiqueta múltiples veces
let normalLabelReadByPlc = false;
let rfidLabelReadByPlc = false;
// Contador actual
let currentCounter = '0001';
// Contador RFID actual
let currentRfidCounter = '0001';
// Código de barras base
let baseBarcode = '(01)03531520010127(17)300506(10)782512600(21)';

/**
 * Inicializa el servicio de etiquetas
 */
function initLabelService() {
  // Cargar contador normal actual
  currentCounter = getCounter() || '0001';
  log(`Contador normal inicializado: ${currentCounter}`, 'SERVER');
  
  // Cargar contador RFID actual
  currentRfidCounter = getRfidCounter() || '0001';
  log(`Contador RFID inicializado: ${currentRfidCounter}`, 'SERVER');
  
  // 🆕 CORREGIDO: Cargar etiquetas existentes y detectar tipos automáticamente
  const labels = getAllLabels();
  if (labels.length > 0) {
    log(`Cargando ${labels.length} etiquetas existentes desde archivo...`, 'SERVER');
    
    // Buscar la última etiqueta NORMAL y la última etiqueta RFID
    let foundNormalLabel = null;
    let foundRfidLabel = null;
    
    for (const label of labels) {
      // Detectar automáticamente si es RFID basándose en el contenido ZPL
      const isRfidDetected = detectLabelTypeFromStorage(label);
      
      if (isRfidDetected) {
        // Es una etiqueta RFID
        if (!foundRfidLabel) {
          foundRfidLabel = { ...label, isRfid: true };
          log(`Etiqueta RFID detectada y cargada: ${label.id} (${label.type})`, 'SERVER', 'info');
        }
      } else {
        // Es una etiqueta NORMAL
        if (!foundNormalLabel) {
          foundNormalLabel = { ...label, isRfid: false };
          log(`Etiqueta NORMAL detectada y cargada: ${label.id} (${label.type})`, 'SERVER', 'info');
        }
      }
      
      // Si ya encontramos ambos tipos, podemos parar
      if (foundNormalLabel && foundRfidLabel) {
        break;
      }
    }
    
    // Asignar las etiquetas encontradas
    if (foundNormalLabel) {
      lastLabelInfo = foundNormalLabel;
      log(`Última etiqueta NORMAL cargada: ${foundNormalLabel.id}`, 'SERVER', 'success');
    }
    
    if (foundRfidLabel) {
      lastRfidLabelInfo = foundRfidLabel;
      log(`Última etiqueta RFID cargada: ${foundRfidLabel.id}`, 'SERVER', 'success');
    }
    
    if (!foundNormalLabel && !foundRfidLabel) {
      log(`No se pudieron cargar etiquetas del archivo (formato incompatible)`, 'SERVER', 'warn');
    }
  } else {
    log(`No hay etiquetas guardadas en el archivo`, 'SERVER', 'info');
  }
}

/**
 * Detecta si una etiqueta guardada es RFID basándose en su contenido
 * @param {Object} label - Etiqueta del archivo
 * @returns {boolean} True si es RFID, false si es NORMAL
 */
function detectLabelTypeFromStorage(label) {
  // Si ya tiene el campo isRfid, usarlo
  if (typeof label.isRfid === 'boolean') {
    return label.isRfid;
  }
  
  // Detectar basándose en el contenido ZPL
  const zpl = label.zpl || label.originalZpl || '';
  
  // Patrones que indican etiqueta RFID
  const rfidPatterns = ['^RFW', '^RF,H', '^RB'];
  const hasRfidCommand = rfidPatterns.some(pattern => zpl.includes(pattern));
  
  // Patrones que indican etiqueta NORMAL
  const hasMultipleCopies = zpl.includes('^PQ4') || (label.copies && parseInt(label.copies) > 1);
  const isBidon = label.type === 'bidon';
  
  // Lógica de detección:
  // - Si tiene comandos RFID -> RFID
  // - Si tiene múltiples copias o es bidón -> NORMAL
  // - Por defecto -> NORMAL
  
  if (hasRfidCommand) {
    return true; // Es RFID
  } else if (hasMultipleCopies || isBidon) {
    return false; // Es NORMAL
  } else {
    return false; // Por defecto NORMAL
  }
}

/**
 * Procesa una etiqueta recibida
 * @param {string} labelData - Datos de la etiqueta en formato ZPL
 * @returns {Object} Información de la etiqueta procesada
 */
function processReceivedLabel(labelData) {
  try {
    log('Procesando etiqueta recibida...', 'SERVER');
    
    // NUEVA LÓGICA: Procesar solo UNA etiqueta por conexión
    // Eliminar el split automático según especificaciones de Adisseo
    
    // Detectar automáticamente el tipo de etiqueta
    const isRfid = labelData.includes('^RFW') || labelData.includes('^RF,H');
    const labelType = isRfid ? 'RFID' : 'NORMAL';
    
    log(`Etiqueta detectada como: ${labelType}`, 'SERVER', 'info');
    
    // Procesar la etiqueta única
    return processIndividualLabel(labelData, isRfid);
  } catch (error) {
    log(`Error al procesar etiqueta: ${error.message}`, 'SERVER', 'error');
    throw error;
  }
}

/**
 * Procesa una etiqueta individual
 * @param {string} labelData - Datos de la etiqueta en formato ZPL
 * @param {boolean} isRfidLabel - Si ya sabemos que es una etiqueta RFID
 * @returns {Object} Información de la etiqueta procesada
 */
function processIndividualLabel(labelData, isRfidLabel = null) {
  try {
    // 🆕 NUEVO: Procesar ZPL para extraer número de lote y limpiar para impresión
    const zplProcessed = processZplForPrinting(labelData);
    
    // Extraer información importante de la etiqueta usando los datos procesados
    const counter = zplProcessed.counter || currentCounter;
    const copies = zplProcessed.copies;
    const containerType = zplProcessed.containerType;
    const gs1 = baseBarcode + counter;
    
    // Determinar si es una etiqueta RFID (si no se especificó)
    if (isRfidLabel === null) {
      isRfidLabel = labelData.includes('^RFW') || labelData.includes('^RF,H');
    }
    
    // Logging detallado del tipo de etiqueta detectada (INCLUYENDO INFORMACIÓN DE LOTE)
    const labelTypeInfo = {
      isRfid: isRfidLabel,
      copies: copies,
      containerType: containerType,
      hasRfidCommands: labelData.includes('^RFW') || labelData.includes('^RF,H'),
      hasPQ1: labelData.includes('^PQ1'),
      hasPQ4: labelData.includes('^PQ4'),
      lotNumber: zplProcessed.lotNumber,
      hasLotNumber: zplProcessed.hasLotNumber,
      originalSize: zplProcessed.sizeOriginal,
      cleanSize: zplProcessed.sizeClean
    };
    
    log(`Análisis de etiqueta: ${JSON.stringify(labelTypeInfo)}`, 'SERVER', 'info');
    
    // Construir objeto de información de etiqueta
    const labelInfo = {
      id: Date.now().toString() + (isRfidLabel ? '_rfid' : ''),
      timestamp: new Date().toISOString(),
      counter: counter,
      gs1: gs1,
      copies: copies,
      type: containerType,
      size: zplProcessed.sizeOriginal,           // Tamaño original (con número de lote)
      
      // 🆕 IMPORTANTE: Separar ZPL original vs ZPL para impresión
      originalZpl: zplProcessed.originalZpl,     // ZPL completo original (para logs/monitor)
      zpl: zplProcessed.cleanZpl,                // ZPL limpio (para enviar a impresora)
      
      // 🆕 NUEVA INFORMACIÓN DE LOTE
      lotNumber: zplProcessed.lotNumber,         // Número de envases del lote (ej: 200)
      hasLotNumber: zplProcessed.hasLotNumber,   // Si tiene información de lote
      
      printed: false,
      isRfid: isRfidLabel
    };
    
    // 🆕 LOGGING MEJORADO con información de lote
    const lotInfo = labelInfo.hasLotNumber ? `, Lote=${labelInfo.lotNumber} envases` : ', Sin lote';
    log(`Etiqueta procesada: ID=${labelInfo.id}, Contador=${counter}, Tipo=${containerType}, Copias=${copies}, RFID=${isRfidLabel}${lotInfo}`, 'SERVER', 'success');
    
    // Información adicional sobre el procesamiento ZPL
    if (labelInfo.hasLotNumber) {
      log(`📦 Información de lote: ${labelInfo.lotNumber} envases en el lote actual`, 'SERVER', 'info');
      log(`📏 ZPL original: ${zplProcessed.sizeOriginal} bytes → ZPL limpio: ${zplProcessed.sizeClean} bytes`, 'SERVER', 'info');
    }
    
    // Guardar la etiqueta en el sistema según su tipo
    if (isRfidLabel) {
      setLastRfidLabelInfo(labelInfo);
      log(`Última etiqueta RFID actualizada: ${labelInfo.id}`, 'SERVER', 'success');
    } else {
      setLastLabelInfo(labelInfo);
      log(`Última etiqueta NORMAL actualizada: ${labelInfo.id}`, 'SERVER', 'success');
      
      // Para etiquetas normales, ya NO generamos automáticamente la RFID
      // Esto elimina la duplicación de etiquetas
      log(`Etiqueta normal procesada sin generar RFID automática`, 'SERVER', 'info');
    }
    
    // Guardar etiqueta (solo una vez)
    saveLabelInfo(labelInfo);
    
    return labelInfo;
  } catch (error) {
    log(`Error al procesar etiqueta individual: ${error.message}`, 'SERVER', 'error');
    throw error;
  }
}

/**
 * Actualiza el contador del sistema con el valor de una etiqueta
 * @param {string} newCounter - Nuevo valor del contador
 */
function updateSystemCounter(newCounter) {
  currentCounter = newCounter;
  saveCounter(currentCounter);
  log(`Contador del sistema actualizado a: ${currentCounter}`, 'SERVER', 'success');
  return currentCounter;
}

/**
 * Obtiene la información de la última etiqueta recibida (solo si no ha sido leída por PLC)
 * @returns {Object|null} Información de la última etiqueta o null si ya fue leída
 */
function getLastLabelInfo() {
  // ⚡ DESACTIVADO TEMPORALMENTE PARA PRODUCCIÓN
  return lastLabelInfo; // Devuelve siempre, sin verificar marca de lectura
  
  // CÓDIGO ORIGINAL (comentado):
  // if (lastLabelInfo && !normalLabelReadByPlc) {
  //   return lastLabelInfo;
  // }
  // return null; // Ya fue leída o no existe
}

/**
 * ✅ NUEVA: Obtiene la información de la última etiqueta NORMAL sin verificar marca de lectura
 * Esta función es para CMD 10 (impresión) que debe funcionar siempre
 * @returns {Object|null} Información de la última etiqueta NORMAL o null si no existe
 */
function getLastLabelInfoForPrinting() {
  return lastLabelInfo; // Devuelve la etiqueta sin verificar si fue leída
}

/**
 * Obtiene la información de la última etiqueta RFID recibida (solo si no ha sido leída por PLC)
 * @returns {Object|null} Información de la última etiqueta RFID o null si ya fue leída
 */
function getLastRfidLabelInfo() {
  // ⚡ DESACTIVADO TEMPORALMENTE PARA PRODUCCIÓN
  return lastRfidLabelInfo; // Devuelve siempre, sin verificar marca de lectura
  
  // CÓDIGO ORIGINAL (comentado):
  // if (lastRfidLabelInfo && !rfidLabelReadByPlc) {
  //   return lastRfidLabelInfo;
  // }
  // return null; // Ya fue leída o no existe
}

/**
 * ✅ NUEVA: Obtiene la información de la última etiqueta RFID sin verificar marca de lectura
 * Esta función es para CMD 11 (impresión RFID) que debe funcionar siempre
 * @returns {Object|null} Información de la última etiqueta RFID o null si no existe
 */
function getLastRfidLabelInfoForPrinting() {
  return lastRfidLabelInfo; // Devuelve la etiqueta sin verificar si fue leída
}

/**
 * Establece una nueva etiqueta como la última recibida
 * @param {Object} labelInfo - Información de la etiqueta
 * @returns {Object} Información de la etiqueta actualizada
 */
function setLastLabelInfo(labelInfo) {
  // 🚨 CORRECCIÓN CRÍTICA: NO mezclar etiquetas RFID con normales
  if (labelInfo && labelInfo.isRfid) {
    // Si es RFID, va SOLO a lastRfidLabelInfo
    lastRfidLabelInfo = labelInfo;
    rfidLabelReadByPlc = false; // ✅ NUEVA: Resetear marca de lectura
    log(`Etiqueta RFID actualizada: ${labelInfo.id} (no leída por PLC)`, 'SERVER', 'info');
  } else {
    // Si es NORMAL, va SOLO a lastLabelInfo
    lastLabelInfo = labelInfo;
    normalLabelReadByPlc = false; // ✅ NUEVA: Resetear marca de lectura
    log(`Etiqueta NORMAL actualizada: ${labelInfo.id} (no leída por PLC)`, 'SERVER', 'info');
  }
  return labelInfo;
}

/**
 * Establece una nueva etiqueta RFID como la última recibida
 * @param {Object} labelInfo - Información de la etiqueta RFID
 * @returns {Object} Información de la etiqueta actualizada
 */
function setLastRfidLabelInfo(labelInfo) {
  lastRfidLabelInfo = labelInfo;
  rfidLabelReadByPlc = false; // ✅ NUEVA: Resetear marca de lectura
  return lastRfidLabelInfo;
}

/**
 * ✅ NUEVA: Marca la última etiqueta NORMAL como leída por el PLC
 * Se llama cuando el PLC envía CMD 80
 */
function markNormalLabelAsRead() {
  if (lastLabelInfo) {
    normalLabelReadByPlc = true;
    log(`Etiqueta NORMAL marcada como leída por PLC: ${lastLabelInfo.id}`, 'SERVER', 'success');
    return true;
  }
  return false;
}

/**
 * ✅ NUEVA: Marca la última etiqueta RFID como leída por el PLC
 * Se llama cuando el PLC envía CMD 81
 */
function markRfidLabelAsRead() {
  if (lastRfidLabelInfo) {
    rfidLabelReadByPlc = true;
    log(`Etiqueta RFID marcada como leída por PLC: ${lastRfidLabelInfo.id}`, 'SERVER', 'success');
    return true;
  }
  return false;
}

/**
 * ✅ NUEVA: Obtiene etiqueta NORMAL solo para CMD 80 (con marca de lectura)
 * @returns {Object|null} Información de la última etiqueta NORMAL o null si ya fue leída
 */
function getLastLabelInfoForCmd80() {
  if (lastLabelInfo && !normalLabelReadByPlc) {
    return lastLabelInfo;
  }
  return null; // Ya fue leída o no existe
}

/**
 * ✅ NUEVA: Obtiene etiqueta RFID solo para CMD 81 (con marca de lectura)
 * @returns {Object|null} Información de la última etiqueta RFID o null si ya fue leída
 */
function getLastRfidLabelInfoForCmd81() {
  if (lastRfidLabelInfo && !rfidLabelReadByPlc) {
    return lastRfidLabelInfo;
  }
  return null; // Ya fue leída o no existe
}

/**
 * ✅ NUEVA: Obtiene el estado de lectura de las etiquetas
 * @returns {Object} Estado de las marcas de lectura
 */
function getReadStatus() {
  return {
    normalLabel: {
      exists: lastLabelInfo !== null,
      readByPlc: normalLabelReadByPlc,
      id: lastLabelInfo ? lastLabelInfo.id : null
    },
    rfidLabel: {
      exists: lastRfidLabelInfo !== null,
      readByPlc: rfidLabelReadByPlc,
      id: lastRfidLabelInfo ? lastRfidLabelInfo.id : null
    }
  };
}

/**
 * ✅ NUEVA: Resetea las marcas de lectura del PLC (para testing/debugging)
 * Permite que el PLC vuelva a leer etiquetas que ya había leído
 */
function resetReadMarks() {
  const previousStatus = getReadStatus();
  
  normalLabelReadByPlc = false;
  rfidLabelReadByPlc = false;
  
  log('🔄 Marcas de lectura reseteadas por monitor web', 'SERVER', 'info');
  log(`   • Etiqueta NORMAL: ${previousStatus.normalLabel.readByPlc ? 'Era leída → Ahora disponible' : 'Ya estaba disponible'}`, 'SERVER', 'info');
  log(`   • Etiqueta RFID: ${previousStatus.rfidLabel.readByPlc ? 'Era leída → Ahora disponible' : 'Ya estaba disponible'}`, 'SERVER', 'info');
  
  return {
    success: true,
    message: 'Marcas de lectura reseteadas correctamente',
    previousStatus: previousStatus,
    newStatus: getReadStatus()
  };
}

/**
 * Obtiene el contador actual del sistema
 * @returns {string} Contador actual
 */
function getCurrentCounter() {
  return currentCounter;
}

/**
 * Obtiene el contador RFID actual del sistema
 * @returns {string} Contador RFID actual
 */
function getCurrentRfidCounter() {
  return currentRfidCounter;
}

/**
 * Incrementa y actualiza el contador del sistema
 * @returns {string} Nuevo valor del contador
 */
function incrementSystemCounter() {
  const newCounter = incrementCounter(currentCounter);
  currentCounter = newCounter;
  saveCounter(currentCounter);
  log(`Contador incrementado a: ${currentCounter}`, 'SERVER');
  return currentCounter;
}

/**
 * Incrementa y actualiza el contador RFID del sistema
 * @returns {string} Nuevo valor del contador RFID
 */
function incrementRfidSystemCounter() {
  const newCounter = incrementRfidCounter(currentRfidCounter);
  currentRfidCounter = newCounter;
  saveRfidCounter(currentRfidCounter);
  log(`Contador RFID incrementado a: ${currentRfidCounter}`, 'SERVER');
  return currentRfidCounter;
}

/**
 * Genera un nuevo código GS1 con el contador actual
 * @returns {string} Código GS1 completo
 */
function generateCurrentGs1() {
  return baseBarcode + currentCounter;
}

/**
 * Genera un nuevo código GS1 con el contador RFID actual
 * @returns {string} Código GS1 completo para RFID
 */
function generateCurrentRfidGs1() {
  return baseBarcode + currentRfidCounter;
}

/**
 * Genera una etiqueta RFID a partir de una etiqueta normal
 * @param {Object} normalLabelInfo - Información de la etiqueta normal
 * @returns {Object} Información de la etiqueta RFID generada
 */
function generateRfidLabelFromNormal(normalLabelInfo) {
  try {
    log(`Generando etiqueta RFID a partir de etiqueta normal ID=${normalLabelInfo.id}`, 'SERVER');
    
    // Generar un ID RFID único para este tag (simulado)
    const rfidId = `AD000402495EE7766FA${generateRandomHex(16)}`;
    
    // Crear la plantilla de etiqueta RFID con el mismo código GS1
    const rfidZpl = `~JA^XA^LT0^PON^LH0,0^LRN^CI27^BY1,2,50^FO90,100^BCR,N,N,N,A^FD${normalLabelInfo.gs1}^FS^FO30,50^A0R,30,30^FD${normalLabelInfo.gs1}^FS^RFW,H^FD${rfidId}^FS^PQ1^XZ`;
    
    // Construir objeto de información de etiqueta RFID
    const rfidLabelInfo = {
      id: `${Date.now().toString()}_rfid`,
      timestamp: new Date().toISOString(),
      counter: normalLabelInfo.counter,
      gs1: normalLabelInfo.gs1,
      copies: "1", // Las etiquetas RFID siempre tienen una copia
      type: normalLabelInfo.type, // Mantener el mismo tipo de contenedor
      size: rfidZpl.length,
      zpl: rfidZpl,
      printed: false,
      isRfid: true,
      linkedToLabelId: normalLabelInfo.id // Referencia a la etiqueta normal
    };
    
    log(`Etiqueta RFID generada: ID=${rfidLabelInfo.id}, GS1=${rfidLabelInfo.gs1}`, 'SERVER', 'success');
    return rfidLabelInfo;
  } catch (error) {
    log(`Error al generar etiqueta RFID: ${error.message}`, 'SERVER', 'error');
    throw error;
  }
}

/**
 * Genera una cadena hexadecimal aleatoria
 * @param {number} length - Longitud de la cadena
 * @returns {string} - Cadena hexadecimal
 */
function generateRandomHex(length) {
  let result = '';
  const characters = '0123456789ABCDEF';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Obtiene la configuración actual del procesamiento de etiquetas
 * @returns {Object} Configuración actual
 */
function getLabelProcessingConfig() {
  return { ...LABEL_PROCESSING_CONFIG };
}

/**
 * Actualiza la configuración del procesamiento de etiquetas
 * @param {Object} newConfig - Nueva configuración
 */
function updateLabelProcessingConfig(newConfig) {
  Object.assign(LABEL_PROCESSING_CONFIG, newConfig);
  log(`Configuración de etiquetas actualizada: ${JSON.stringify(LABEL_PROCESSING_CONFIG)}`, 'SERVER', 'info');
}

/**
 * Obtiene estadísticas del procesamiento de etiquetas
 * @returns {Object} Estadísticas detalladas
 */
function getLabelProcessingStats() {
  const allLabels = getAllLabels();
  const rfidLabels = allLabels.filter(label => label.isRfid);
  const normalLabels = allLabels.filter(label => !label.isRfid);
  
  return {
    total: allLabels.length,
    rfid: rfidLabels.length,
    normal: normalLabels.length,
    lastRfidLabel: lastRfidLabelInfo ? {
      id: lastRfidLabelInfo.id,
      timestamp: lastRfidLabelInfo.timestamp,
      counter: lastRfidLabelInfo.counter
    } : null,
    lastNormalLabel: lastLabelInfo ? {
      id: lastLabelInfo.id,
      timestamp: lastLabelInfo.timestamp,
      counter: lastLabelInfo.counter
    } : null,
    config: LABEL_PROCESSING_CONFIG
  };
}

/**
 * Detecta el tipo de etiqueta basado en su contenido ZPL
 * @param {string} zplContent - Contenido ZPL de la etiqueta
 * @returns {Object} Información del tipo detectado
 */
function detectLabelType(zplContent) {
  const detection = {
    isRfid: false,
    confidence: 0,
    indicators: [],
    patterns: []
  };
  
  // Verificar patrones RFID
  LABEL_PROCESSING_CONFIG.RFID_DETECTION_PATTERNS.forEach(pattern => {
    if (zplContent.includes(pattern)) {
      detection.isRfid = true;
      detection.confidence += 0.4;
      detection.patterns.push(pattern);
    }
  });
  
  // Verificar indicadores adicionales
  if (zplContent.includes('^PQ1')) {
    detection.indicators.push('PQ1 (1 copia - típico IBC/RFID)');
    detection.confidence += 0.2;
  }
  
  if (zplContent.includes('^PQ4')) {
    detection.indicators.push('PQ4 (4 copias - típico Bidón/Normal)');
    detection.confidence += 0.1;
  }
  
  // Normalizar confianza
  detection.confidence = Math.min(detection.confidence, 1.0);
  detection.type = detection.isRfid ? 'RFID' : 'NORMAL';
  
  return detection;
}

module.exports = {
  initLabelService,
  processReceivedLabel,
  updateSystemCounter,
  getLastLabelInfo,
  getLastLabelInfoForPrinting,
  getLastLabelInfoForCmd80,      // ✅ NUEVA para CMD 80
  getLastRfidLabelInfo,
  getLastRfidLabelInfoForPrinting,
  getLastRfidLabelInfoForCmd81,  // ✅ NUEVA para CMD 81
  setLastLabelInfo,
  setLastRfidLabelInfo,
  markNormalLabelAsRead,    // ✅ NUEVA
  markRfidLabelAsRead,      // ✅ NUEVA
  getReadStatus,            // ✅ NUEVA
  resetReadMarks,           // ✅ NUEVA
  getCurrentCounter,
  getCurrentRfidCounter,
  incrementSystemCounter,
  incrementRfidSystemCounter,
  generateCurrentGs1,
  generateCurrentRfidGs1,
  generateRfidLabelFromNormal,
  getLabelProcessingConfig,
  updateLabelProcessingConfig,
  getLabelProcessingStats,
  detectLabelType,
  detectLabelTypeFromStorage
};
