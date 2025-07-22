/**
 * Utilidades para el manejo de comandos ZPL
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const { log } = require('./logger');

/**
 * Actualiza el contador en un comando ZPL
 * @param {string} zplCommand - Comando ZPL original
 * @param {string} newCounter - Nuevo valor del contador
 * @returns {string} Comando ZPL actualizado
 */
function updateCounterInZpl(zplCommand, newCounter) {
  try {
    // Buscar el patrón del código de barras con el contador
    const gs1Regex = /\(21\)(\d{4})/g;
    
    // Reemplazar todas las ocurrencias del contador en el ZPL
    const updatedZpl = zplCommand.replace(gs1Regex, (match, counter) => {
      return `(21)${newCounter}`;
    });
    
    log(`Contador actualizado en ZPL: (21)${newCounter}`, 'SERVER');
    return updatedZpl;
  } catch (error) {
    log(`Error al actualizar contador en ZPL: ${error.message}`, 'SERVER', 'error');
    return zplCommand; // Devolver el original en caso de error
  }
}

/**
 * Extrae el contador de un comando ZPL
 * @param {string} zplCommand - Comando ZPL
 * @returns {string|null} Contador extraído o null si no se encuentra
 */
function extractCounterFromZpl(zplCommand) {
  try {
    const gs1Regex = /\(21\)(\d{4})/;
    const match = zplCommand.match(gs1Regex);
    
    if (match && match[1]) {
      log(`Contador extraído de ZPL: ${match[1]}`, 'SERVER');
      return match[1];
    }
    
    log('No se pudo extraer el contador del ZPL', 'SERVER', 'warn');
    return null;
  } catch (error) {
    log(`Error al extraer contador del ZPL: ${error.message}`, 'SERVER', 'error');
    return null;
  }
}

/**
 * Extrae el número de copias de un comando ZPL
 * @param {string} zplCommand - Comando ZPL
 * @returns {number} Número de copias (por defecto 1)
 */
function extractCopiesFromZpl(zplCommand) {
  try {
    const pqRegex = /\^PQ(\d+)/i;
    const match = zplCommand.match(pqRegex);
    
    if (match && match[1]) {
      const copies = parseInt(match[1], 10);
      log(`Número de copias extraído de ZPL: ${copies}`, 'SERVER');
      return copies;
    }
    
    log('No se pudo extraer el número de copias del ZPL, usando valor por defecto: 1', 'SERVER', 'warn');
    return 1;
  } catch (error) {
    log(`Error al extraer número de copias del ZPL: ${error.message}`, 'SERVER', 'error');
    return 1;
  }
}

/**
 * Determina el tipo de contenedor basado en el número de copias
 * @param {number} copies - Número de copias
 * @returns {string} Tipo de contenedor ('bidon' o 'ibc')
 */
function determineContainerType(copies) {
  // Según la lógica establecida:
  // - 4 copias = bidón
  // - 1 copia = IBC
  return copies > 1 ? 'bidon' : 'ibc';
}

/**
 * Extrae el número de lote del final del comando ZPL y limpia el ZPL para impresión
 * @param {string} zplCommand - Comando ZPL original
 * @returns {Object} Objeto con ZPL limpio y número de lote
 */
function extractLotNumberAndCleanZpl(zplCommand) {
  try {
    // Buscar patrón: ^XZ seguido de espacios y números al final
    const lotRegex = /(\^XZ)\s+(\d+)\s*$/;
    const match = zplCommand.match(lotRegex);
    
    if (match && match[2]) {
      const lotNumber = parseInt(match[2], 10);
      // Limpiar el ZPL removiendo el número de lote al final
      const cleanZpl = zplCommand.replace(lotRegex, '$1'); // Solo dejar ^XZ
      
      log(`🏷️ Número de lote extraído: ${lotNumber} envases`, 'SERVER', 'info');
      log(`🧹 ZPL limpiado para impresión (sin número de lote)`, 'SERVER', 'info');
      
      return {
        cleanZpl: cleanZpl.trim(),
        lotNumber: lotNumber,
        hasLotNumber: true
      };
    }
    
    // Si no hay número de lote al final, devolver ZPL original
    log('📄 No se encontró número de lote al final del ZPL', 'SERVER', 'info');
    return {
      cleanZpl: zplCommand.trim(),
      lotNumber: null,
      hasLotNumber: false
    };
  } catch (error) {
    log(`❌ Error al extraer número de lote del ZPL: ${error.message}`, 'SERVER', 'error');
    return {
      cleanZpl: zplCommand.trim(),
      lotNumber: null,
      hasLotNumber: false
    };
  }
}

/**
 * Procesa y prepara ZPL para impresión
 * Extrae información del lote y limpia el ZPL
 * @param {string} rawZpl - ZPL crudo recibido
 * @returns {Object} Datos procesados del ZPL
 */
function processZplForPrinting(rawZpl) {
  try {
    // 1. Extraer número de lote y limpiar ZPL
    const { cleanZpl, lotNumber, hasLotNumber } = extractLotNumberAndCleanZpl(rawZpl);
    
    // 2. Extraer otras informaciones del ZPL limpio
    const counter = extractCounterFromZpl(cleanZpl);
    const copies = extractCopiesFromZpl(cleanZpl);
    const containerType = determineContainerType(copies);
    
    // 3. Preparar resultado
    const result = {
      originalZpl: rawZpl.trim(),           // ZPL original completo (para logs/monitoreo)
      cleanZpl: cleanZpl,                   // ZPL limpio para enviar a impresora
      counter: counter,
      copies: copies,
      containerType: containerType,
      lotNumber: lotNumber,                 // Número de envases del lote
      hasLotNumber: hasLotNumber,
      sizeOriginal: rawZpl.length,
      sizeClean: cleanZpl.length
    };
    
    log(`📊 ZPL procesado: Contador=${counter}, Copias=${copies}, Tipo=${containerType}, Lote=${lotNumber || 'N/A'} envases`, 'SERVER', 'success');
    
    return result;
  } catch (error) {
    log(`❌ Error al procesar ZPL: ${error.message}`, 'SERVER', 'error');
    throw error;
  }
}

/**
 * Valida que el contador del PLC tenga formato correcto
 * @param {string|number} counter - Contador del PLC
 * @returns {boolean} True si el contador es válido
 */
function validatePlcCounter(counter) {
  try {
    // Validar que sea string o número
    if (typeof counter !== 'string' && typeof counter !== 'number') {
      log(`Contador inválido - tipo incorrecto: ${typeof counter}`, 'SERVER', 'error');
      return false;
    }
    
    // Convertir a string y validar formato numérico
    const counterStr = counter.toString().trim();
    const regex = /^\d{1,4}$/; // 1 a 4 dígitos
    if (!regex.test(counterStr)) {
      log(`Contador inválido - formato incorrecto: "${counterStr}"`, 'SERVER', 'error');
      return false;
    }
    
    // Validar rango: 0 a 9999
    const num = parseInt(counterStr, 10);
    if (num < 0 || num > 9999) {
      log(`Contador inválido - fuera de rango (0-9999): ${num}`, 'SERVER', 'error');
      return false;
    }
    
    log(`Contador PLC válido: "${counter}" → ${num}`, 'SERVER', 'info');
    return true;
  } catch (error) {
    log(`Error al validar contador PLC: ${error.message}`, 'SERVER', 'error');
    return false;
  }
}

/**
 * Normaliza el contador a formato de 4 dígitos con ceros a la izquierda
 * @param {string|number} counter - Contador del PLC
 * @returns {string} Contador normalizado (ej: "2" → "0002")
 */
function normalizeCounter(counter) {
  try {
    const counterStr = counter.toString().trim();
    const normalized = counterStr.padStart(4, '0');
    log(`Contador normalizado: "${counter}" → "${normalized}"`, 'SERVER', 'info');
    return normalized;
  } catch (error) {
    log(`Error al normalizar contador: ${error.message}`, 'SERVER', 'error');
    return '0000'; // Fallback seguro
  }
}

/**
 * Convierte un contador decimal a formato hexadecimal de 3 dígitos
 * @param {string|number} counter - Contador en formato decimal (ej: "0001", "0255", "1000")
 * @returns {string} Contador en hexadecimal de 3 dígitos (ej: "001", "0FF", "3E8")
 */
function convertCounterToHex(counter) {
  try {
    // Convertir a número entero
    const num = parseInt(counter.toString(), 10);
    
    // Validar rango (0-4095, que es FFF en hex)
    if (num < 0 || num > 4095) {
      log(`⚠️ Contador fuera de rango para hexadecimal (0-4095): ${num}`, 'SERVER', 'warn');
      return '000'; // Fallback seguro
    }
    
    // Convertir a hex y formatear a 3 dígitos
    const hex = num.toString(16).toUpperCase().padStart(3, '0');
    
    log(`🔄 Contador convertido: ${counter} (dec) → ${hex} (hex)`, 'SERVER', 'info');
    return hex;
  } catch (error) {
    log(`❌ Error al convertir contador a hex: ${error.message}`, 'SERVER', 'error');
    return '000'; // Fallback seguro
  }
}

/**
 * Actualiza la memoria RFID en comandos ^RFW,H con el contador en hexadecimal
 * @param {string} zplCommand - Comando ZPL con comandos RFID
 * @param {string} newCounter - Nuevo contador en decimal (ej: "0002")
 * @returns {string} ZPL con memoria RFID actualizada
 */
function updateRfidMemoryWithCounter(zplCommand, newCounter) {
  try {
    // 🔧 FASE 2: REGEX MEJORADO - SOPORTE MÚLTIPLES COMANDOS RFID
    let updatedZpl = zplCommand;
    let totalUpdateCount = 0;
    
    // Convertir contador a hexadecimal
    const hexCounter = convertCounterToHex(newCounter);
    log(`🔍 Iniciando actualización RFID con contador hex: ${hexCounter}`, 'SERVER', 'info');
    
    // ✅ SOLO Memoria 2: La Memoria 1 (4000) debe mantenerse FIJA
    const rfidPatterns = [
      {
        name: 'Memoria 2 (16 bytes)',
        regex: /(\^RFW,H,2,16,1\^FD[A-F0-9]{23})([A-F0-9]{3})([A-F0-9]{6}\^FS)/g,
        counterLength: 3
      }
    ];
    
    // Procesar cada patrón RFID
    rfidPatterns.forEach(pattern => {
      const matches = [...updatedZpl.matchAll(pattern.regex)];
      
      if (matches.length > 0) {
        const paddedHex = hexCounter.padStart(pattern.counterLength, '0').toUpperCase();
        
        updatedZpl = updatedZpl.replace(pattern.regex, (match, prefix, oldHexCounter, suffix) => {
          totalUpdateCount++;
          log(`🔧 ${pattern.name}: ${oldHexCounter} → ${paddedHex}`, 'SERVER', 'info');
          return prefix + paddedHex + suffix;
        });
        
        log(`✅ ${pattern.name}: ${matches.length} comando(s) actualizado(s)`, 'SERVER', 'success');
      } else {
        log(`ℹ️ ${pattern.name}: No se encontraron comandos para actualizar`, 'SERVER', 'info');
      }
    });
    
    // Resumen final
    if (totalUpdateCount > 0) {
      log(`🎯 TOTAL: ${totalUpdateCount} comando(s) RFID actualizados exitosamente`, 'SERVER', 'success');
    } else {
      log(`⚠️ ADVERTENCIA: No se encontraron comandos RFID para actualizar`, 'SERVER', 'warn');
      // NO lanzar error aquí, dejar que la validación post-procesamiento lo maneje
    }
    
    return updatedZpl;
  } catch (error) {
    log(`❌ Error al actualizar memoria RFID: ${error.message}`, 'SERVER', 'error');
    throw error; // ✅ NUEVO: Lanzar error para que sea capturado en validación
  }
}

/**
 * Actualiza tanto el contador GS1 como la memoria RFID en formato ZPL
 * @param {string} zplCommand - Comando ZPL original
 * @param {string} newCounter - Nuevo contador (ej: "0002")
 * @returns {string} ZPL completamente actualizado
 */
function updateCounterAndRfidMemory(zplCommand, newCounter) {
  try {
    log(`🔄 Actualizando ZPL completo con contador: ${newCounter}`, 'SERVER', 'info');
    
    // 1. Actualizar contador en códigos GS1
    let updatedZpl = updateCounterInZpl(zplCommand, newCounter);
    
    // 2. Actualizar memoria RFID con contador en hexadecimal
    updatedZpl = updateRfidMemoryWithCounter(updatedZpl, newCounter);
    
    log(`✅ ZPL actualizado completamente (GS1 + RFID)`, 'SERVER', 'success');
    return updatedZpl;
  } catch (error) {
    log(`❌ Error al actualizar ZPL completo: ${error.message}`, 'SERVER', 'error');
    return zplCommand; // Devolver original en caso de error
  }
}

module.exports = {
  updateCounterInZpl,
  extractCounterFromZpl,
  extractCopiesFromZpl,
  determineContainerType,
  extractLotNumberAndCleanZpl,
  processZplForPrinting,
  validatePlcCounter,
  normalizeCounter,
  convertCounterToHex,
  updateRfidMemoryWithCounter,
  updateCounterAndRfidMemory
};
