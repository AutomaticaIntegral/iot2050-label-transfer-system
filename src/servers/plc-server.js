/**
 * Servidor TCP para comunicación con PLC
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const { log } = require('../utils/logger');
const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
const { printToProductPrinter, printToRfidPrinter } = require('../services/printer-service');
const { 
  getLastLabelInfo, 
  getLastLabelInfoForPrinting,
  getLastLabelInfoForCmd80,
  getLastRfidLabelInfo,
  getLastRfidLabelInfoForPrinting,
  getLastRfidLabelInfoForCmd81,
  getCurrentCounter, 
  getCurrentRfidCounter,
  incrementSystemCounter, 
  incrementRfidSystemCounter,
  generateCurrentGs1,
  generateCurrentRfidGs1
} = require('../services/label-service');
const config = require('../config');
const fs = require('fs');

// Código de barras base para generar GS1 con contadores del PLC
const baseBarcode = '(01)03531520010127(17)300506(10)782512600(21)';

// Mapa para conexiones activas
const activeConnections = new Map();
let nextConnectionId = 1;

// Array para almacenar messageIds procesados y evitar duplicados
const processedMessageIds = [];
const MAX_MESSAGE_IDS = 200; // Límite máximo de messageIds almacenados

// Función para registrar messageIds en el log para debugging
function logMessageIdStatus(messageId, isDuplicate) {
  const logMessage = `MessageID: ${messageId}, Duplicado: ${isDuplicate ? 'SI' : 'NO'}`;
  log(logMessage, 'PLC', isDuplicate ? 'warn' : 'info');
  
  // También guardar en un archivo para análisis posterior
  const logLine = `${new Date().toISOString()} - ${logMessage}\n`;
  // Usar la carpeta 'data' que ya existe en el proyecto
  const logFilePath = './data/messageid_FORCE.txt';
  fs.appendFile(logFilePath, logLine, (err) => {
    if (err) {
      log(`Error al escribir en archivo de log: ${err.message}`, 'PLC', 'error');
    }
  });
}

// Función para verificar si un messageId ya ha sido procesado
function isDuplicateMessageId(messageId) {
  // Convertir a string para asegurar comparación consistente
  const messageIdStr = String(messageId);
  return processedMessageIds.includes(messageIdStr);
}

// Función para registrar un nuevo messageId
function registerMessageId(messageId) {
  // Convertir a string para almacenamiento consistente
  const messageIdStr = String(messageId);
  
  // Evitar duplicados en el array
  if (!processedMessageIds.includes(messageIdStr)) {
    // Agregar el nuevo messageId al inicio del array
    processedMessageIds.unshift(messageIdStr);
    
    // Limitar el tamaño del array
    if (processedMessageIds.length > MAX_MESSAGE_IDS) {
      processedMessageIds.pop(); // Eliminar el más antiguo
    }
  }
}

// Utilizaremos el bus de eventos global para la comunicación entre servidores
// Este enfoque evita las referencias circulares y hace que los módulos sean realmente independientes

// Crear servidor TCP para comandos del PLC
const tcpServer = net.createServer((socket) => {
  const connectionId = nextConnectionId++;
  activeConnections.set(connectionId, socket);
  log(`Nueva conexión PLC desde ${socket.remoteAddress}:${socket.remotePort} (ID: ${connectionId})`, 'PLC');
  
  socket.on('data', (data) => {
    try {
      const commandData = data.toString();
      
      // Mostrar datos raw recibidos
      log('\n--- INICIO DATOS RAW RECIBIDOS DE PLC ---', 'PLC');
      log(commandData, 'PLC');
      log('--- FIN DATOS RAW RECIBIDOS DE PLC ---\n', 'PLC');
      
      // Limpiar caracteres adicionales (como '#' al final)
      const cleanData = commandData.replace(/#$/, '');
      const command = JSON.parse(cleanData);
      
      // Procesar según el tipo de comando
      const messageId = command.messageId || 125;
      const cmdReceived = command.cmd.toString();
      
      // Notificar al servidor ADI sobre el comando recibido a través del bus de eventos
      log(`Emitiendo evento plcCommand: ${cmdReceived}`, 'PLC');
      global.eventBus.emit('plcCommand', cmdReceived);
      
      // Agregar un pequeño retraso para asegurar que el evento general se procese primero
      setTimeout(() => {
        // Emitir evento específico para este comando
        log(`Emitiendo evento específico para comando ${cmdReceived}`, 'PLC');
        global.eventBus.emit(`plcCommand_${cmdReceived}`, command);
      }, 100);
      
      // Manejar diferentes tipos de comandos
      if (command.cmd === 10) {
        // Comando 10: Impresión estándar
        handlePrintCommand(socket, command, messageId);
      } 
      else if (command.cmd === 11) {
        // Comando 11: Impresión RFID
        handleRfidPrintCommand(socket, command, messageId);
      }
      else if (command.cmd === 40) {
        // Comando 40: Consulta o actualización del contador
        handleCounterCommand(socket, command, messageId);
      } 
      else if (command.cmd === 80) {
        // Comando 80: Consulta de última etiqueta NORMAL
        handleLastLabelCommand(socket, command, messageId);
      } 
      else if (command.cmd === 81) {
        // Comando 81: Consulta de última etiqueta RFID
        handleRfidLabelCommand(socket, command, messageId);
      } 
      else {
        // Comando no soportado en esta versión simplificada
        log(`Comando ${command.cmd} no soportado en esta versión simplificada`, 'PLC');
        socket.write(JSON.stringify({
          status: 'success', // Respondemos success para no bloquear al PLC
          code: 'COMMAND_SIMULATED',
          messageId: messageId,
          message: `Comando ${command.cmd} simulado correctamente`
        }) + '#');
      }
    } catch (error) {
      log(`Error al procesar comando: ${error.message}`, 'PLC', 'error');
      try {
        socket.write(JSON.stringify({
          status: 'error',
          code: 'COMMAND_PROCESSING_ERROR',
          message: 'Error al procesar comando',
          details: error.message
        }) + '#');
      } catch (writeError) {
        log(`Error al enviar respuesta de error: ${writeError.message}`, 'PLC', 'error');
      }
    }
  });
  
  socket.on('error', (err) => {
    log(`Error en conexión: ${err.message}`, 'PLC', 'error');
  });
  
  socket.on('close', () => {
    log('Conexión cerrada', 'PLC');
    // Eliminar conexión del mapa de conexiones activas
    activeConnections.delete(connectionId);
    log(`Conexión ${connectionId} eliminada del registro`, 'PLC');
  });
});

/**
 * Maneja el comando de impresión (cmd 10)
 * @param {net.Socket} socket - Socket de conexión
 * @param {Object} command - Comando recibido
 * @param {number} messageId - ID del mensaje
 */
function handlePrintCommand(socket, command, messageId) {
  log('⚙️ Procesando comando de impresión estándar con contador PLC', 'PLC', 'success');
  
  // NUEVO: Extraer contador del comando PLC
  const plcCounter = command.counter;
  log(`[PLC] 📋 CMD 10 recibido con contador: "${plcCounter}"`, 'PLC', 'info');
  
  // Verificar si el messageId es un duplicado
  const isDuplicate = isDuplicateMessageId(messageId);
  logMessageIdStatus(messageId, isDuplicate);
  
  // Si no es duplicado, registrarlo para futuras comprobaciones
  if (!isDuplicate) {
    registerMessageId(messageId);
  }
  
  // Validar contador del PLC
  if (!plcCounter || !validatePlcCounter(plcCounter)) {
    log(`[PLC] ❌ ERROR: Contador inválido o faltante en CMD 10: "${plcCounter}"`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'INVALID_COUNTER',
      messageId: messageId,
      message: `Contador inválido: "${plcCounter}". Debe ser 0-9999`,
      isDuplicate: isDuplicate
    }) + '#');
    return;
  }
  
  // Normalizar contador del PLC
  const normalizedCounter = normalizeCounter(plcCounter);
  log(`[PLC] 🔄 Contador normalizado: "${plcCounter}" → "${normalizedCounter}"`, 'PLC', 'success');
  
  // ✅ LÓGICA: CMD 10 usa SOLO etiquetas NORMALES (función original restaurada)
  const lastNormalLabel = getLastLabelInfo();
  
  if (lastNormalLabel) {
    log('[PLC] 📄 CMD 10: Usando última etiqueta NORMAL', 'PLC', 'info');
    
    const labelType = 'NORMAL';
    const printerTarget = 'PRODUCTO';
    
    // IMPORTANTE: Enviar exactamente la misma etiqueta ZPL que llegó del ERP
    const originalZplCommand = lastNormalLabel.zpl || '';
    
    if (originalZplCommand) {
      log(`[PLC] 🖨️ Enviando a impresora ${printerTarget} con contador del PLC: ${normalizedCounter}`, 'PLC', 'success');
      
      // Reemplazar el contador en el ZPL original con el contador del PLC
      const updatedZpl = updateCounterInZpl(originalZplCommand, normalizedCounter);
      
      // Enviar a impresora de producto (principal) - Siempre imprimimos, sea duplicado o no
      printToProductPrinter(updatedZpl)
        .then(() => {
          
          // Obtener el número de copias desde la etiqueta
          const copies = lastNormalLabel.copies || 1;
          
          // Responder al PLC con el nuevo formato
          socket.write(JSON.stringify({
            status: 'success',
            code: isDuplicate ? 'DUPLICATE_MESSAGEID' : 'PRINT_OK',
            messageId: messageId,
            labelType: labelType,
            gs1: baseBarcode + normalizedCounter,  // ← GS1 con contador del PLC
            counterUsed: normalizedCounter,        // ← Contador usado del PLC
            counterOriginal: plcCounter,           // ← Contador original del PLC
            copies: copies,
            printerTarget: printerTarget,
            isDuplicate: isDuplicate
          }) + '#');
          
          if (isDuplicate) {
            log(`[PLC] 🔄 Etiqueta ${labelType} con MessageID ${messageId} procesada como duplicada, contador PLC: ${normalizedCounter}`, 'PLC', 'warn');
          } else {
            log(`[PLC] ✅ Etiqueta ${labelType} con MessageID ${messageId} impresa correctamente con contador PLC: ${normalizedCounter}`, 'PLC', 'success');
          }
        })
        .catch(error => {
          log(`Error al imprimir: ${error.message}`, 'PLC', 'error');
          socket.write(JSON.stringify({
            status: 'error',
            code: 'PRINT_ERROR',
            messageId: messageId,
            error: error.message,
            counterUsed: normalizedCounter,
            isDuplicate: isDuplicate
          }) + '#');
        });
    } else {
      // Si no hay ZPL original
      log('[PLC] No se encontró ZPL original', 'PLC', 'error');
      
      socket.write(JSON.stringify({
        status: 'error',
        code: 'MISSING_ZPL',
        messageId: messageId,
        message: 'No se encontró contenido ZPL para la etiqueta',
        labelType: labelType,
        isDuplicate: isDuplicate
      }) + '#');
    }
  } else {
    log('[PLC] No hay etiqueta NORMAL pendiente del ERP', 'PLC', 'warn');
    
    socket.write(JSON.stringify({
      status: 'warning',
      code: 'NO_NORMAL_LABEL_INFO',
      messageId: messageId,
      message: 'No hay información de etiqueta NORMAL disponible',
      labelType: 'NORMAL',
      isDuplicate: isDuplicate
    }) + '#');
  }
}

/**
 * Maneja el comando de impresión RFID (cmd 11)
 * @param {net.Socket} socket - Socket de conexión
 * @param {Object} command - Comando recibido
 * @param {number} messageId - ID del mensaje
 */
function handleRfidPrintCommand(socket, command, messageId) {
  log('⚙️ Procesando comando de impresión RFID con contador PLC', 'PLC', 'success');
  
  // NUEVO: Extraer contador del comando PLC
  const plcCounter = command.counter;
  log(`[PLC] 📋 CMD 11 recibido con contador: "${plcCounter}"`, 'PLC', 'info');
  
  // Verificar si el messageId es un duplicado
  const isDuplicate = isDuplicateMessageId(messageId);
  logMessageIdStatus(messageId, isDuplicate);
  
  // Si no es duplicado, registrarlo para futuras comprobaciones
  if (!isDuplicate) {
    registerMessageId(messageId);
  }
  
  // Validar contador del PLC
  if (!plcCounter || !validatePlcCounter(plcCounter)) {
    log(`[PLC] ❌ ERROR: Contador inválido o faltante en CMD 11: "${plcCounter}"`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'INVALID_COUNTER',
      messageId: messageId,
      message: `Contador inválido: "${plcCounter}". Debe ser 0-9999`,
      isDuplicate: isDuplicate
    }) + '#');
    return;
  }
  
  // Normalizar contador del PLC
  const normalizedCounter = normalizeCounter(plcCounter);
  log(`[PLC] 🔄 Contador normalizado: "${plcCounter}" → "${normalizedCounter}"`, 'PLC', 'success');
  
  // ✅ LÓGICA: CMD 11 usa SOLO etiquetas RFID (función original restaurada)
  const lastRfidLabel = getLastRfidLabelInfo();
  
  // 🛡️ FASE 1A: VALIDACIÓN DE ENTRADA ESTRICTA
  if (!lastRfidLabel) {
    log('[PLC] ❌ CMD 11 RECHAZADO: No hay etiquetas RFID disponibles', 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'NO_RFID_DATA_AVAILABLE',
      message: 'No hay datos RFID disponibles para procesar',
      messageId: messageId,
      isDuplicate: isDuplicate
    }) + '#');
    return; // ❌ SALIR INMEDIATAMENTE
  }

  const originalZplCommand = lastRfidLabel.zpl || '';
  
  if (!originalZplCommand || !originalZplCommand.includes('^RFW')) {
    log('[PLC] ❌ CMD 11 RECHAZADO: ZPL no contiene comandos RFID válidos', 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'INVALID_RFID_ZPL',
      message: 'El ZPL disponible no contiene comandos RFID válidos',
      messageId: messageId,
      isDuplicate: isDuplicate
    }) + '#');
    return; // ❌ SALIR INMEDIATAMENTE
  }

  log('[PLC] 🏷️ CMD 11: Usando última etiqueta RFID - Validación inicial exitosa', 'PLC', 'info');
  
  const labelType = 'RFID';
  const printerTarget = 'RFID';
  
  log(`[PLC] 🖨️ Enviando a impresora ${printerTarget} con contador del PLC: ${normalizedCounter}`, 'PLC', 'success');
  
  // Reemplazar el contador en el ZPL original con el contador del PLC y sincronizar memoria RFID
  const updatedZpl = updateCounterAndRfidMemory(originalZplCommand, normalizedCounter);
  
  // 🛡️ FASE 1B: VALIDACIÓN POST-PROCESAMIENTO
  const originalRfidCount = (originalZplCommand.match(/\^RFW/g) || []).length;
  const updatedRfidCount = (updatedZpl.match(/\^RFW/g) || []).length;
  
  if (originalRfidCount !== updatedRfidCount) {
    log(`[PLC] ❌ INCONSISTENCIA DETECTADA: ${originalRfidCount} comandos RFID originales vs ${updatedRfidCount} procesados`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'RFID_PROCESSING_ERROR',
      message: `Inconsistencia en comandos RFID: ${originalRfidCount} originales vs ${updatedRfidCount} procesados`,
      messageId: messageId,
      isDuplicate: isDuplicate
    }) + '#');
    return; // ❌ NO ENVIAR A IMPRESORA
  }
  
  if (originalRfidCount === 0) {
    log(`[PLC] ❌ ERROR CRÍTICO: No se encontraron comandos RFID para validar`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'NO_RFID_COMMANDS_FOUND',
      message: 'No se encontraron comandos RFID en la etiqueta',
      messageId: messageId,
      isDuplicate: isDuplicate
    }) + '#');
    return; // ❌ NO ENVIAR A IMPRESORA
  }
  
  // 🔍 VALIDACIÓN ADICIONAL: Verificar que el contador hexadecimal esté presente
  const { convertCounterToHex } = require('../utils/zpl-utils');
  const expectedHexCounter = convertCounterToHex(normalizedCounter).toUpperCase();
  const hexCounterOccurrences = (updatedZpl.match(new RegExp(expectedHexCounter, 'g')) || []).length;
  
  if (hexCounterOccurrences === 0) {
    log(`[PLC] ❌ VALIDACIÓN HEXADECIMAL FALLÓ: Contador ${normalizedCounter} (hex: ${expectedHexCounter}) no encontrado en ZPL actualizado`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'HEX_COUNTER_NOT_FOUND',
      message: `Contador hexadecimal ${expectedHexCounter} no encontrado en ZPL procesado`,
      messageId: messageId,
      isDuplicate: isDuplicate,
      expectedCounter: normalizedCounter,
      expectedHex: expectedHexCounter
    }) + '#');
    return; // ❌ NO ENVIAR A IMPRESORA
  }
  
  log(`[PLC] ✅ VALIDACIÓN HEXADECIMAL EXITOSA: Contador ${expectedHexCounter} encontrado ${hexCounterOccurrences} vez(es)`, 'PLC', 'success');
  
  // 🔍 VALIDACIÓN CRUZADA: GS1 y Memoria 2 deben tener el MISMO contador
  const gs1CounterMatch = updatedZpl.match(/\(21\)(\d{4})/);
  const memory2CounterMatch = updatedZpl.match(/\^RFW,H,2,16,1\^FD[A-F0-9]{23}(\d{3})[A-F0-9]{6}\^FS/);

  if (!gs1CounterMatch || !memory2CounterMatch) {
    log(`[PLC] ❌ VALIDACIÓN CRUZADA FALLÓ: No se pudieron extraer contadores para comparar`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'COUNTER_EXTRACTION_FAILED',
      message: 'No se pudieron extraer contadores del GS1 y Memoria 2 para validación cruzada',
      messageId: messageId,
      isDuplicate: isDuplicate
    }) + '#');
    return; // ❌ NO ENVIAR A IMPRESORA
  }

  const gs1Counter = gs1CounterMatch[1];
  const memory2CounterHex = memory2CounterMatch[1];
  const memory2CounterDec = parseInt(memory2CounterHex, 10).toString().padStart(4, '0');

  if (gs1Counter !== normalizedCounter || memory2CounterDec !== normalizedCounter) {
    log(`[PLC] ❌ INCONSISTENCIA CRÍTICA DETECTADA:`, 'PLC', 'error');
    log(`[PLC]   - PLC Counter: ${normalizedCounter}`, 'PLC', 'error');
    log(`[PLC]   - GS1 Counter: ${gs1Counter}`, 'PLC', 'error');
    log(`[PLC]   - Mem2 Counter: ${memory2CounterDec} (hex: ${memory2CounterHex})`, 'PLC', 'error');
    socket.write(JSON.stringify({
      status: 'error',
      code: 'COUNTER_INCONSISTENCY_DETECTED',
      message: `Inconsistencia crítica: PLC=${normalizedCounter}, GS1=${gs1Counter}, Memoria2=${memory2CounterDec}`,
      messageId: messageId,
      isDuplicate: isDuplicate,
      plcCounter: normalizedCounter,
      gs1Counter: gs1Counter,
      memory2Counter: memory2CounterDec
    }) + '#');
    return; // ❌ NO ENVIAR A IMPRESORA
  }

  log(`[PLC] ✅ VALIDACIÓN CRUZADA EXITOSA: PLC=${normalizedCounter}, GS1=${gs1Counter}, Memoria2=${memory2CounterDec}`, 'PLC', 'success');
  log(`[PLC] ✅ TODAS LAS VALIDACIONES EXITOSAS: ${originalRfidCount} comandos RFID procesados correctamente`, 'PLC', 'success');
  
  // Enviar a impresora RFID - Solo después de TODAS las validaciones exitosas
  printToRfidPrinter(updatedZpl)
    .then(() => {
      
      // Obtener el número de copias desde la etiqueta
      const copies = lastRfidLabel.copies || 1;
      
      // Responder al PLC con el nuevo formato
      socket.write(JSON.stringify({
        status: 'success',
        code: isDuplicate ? 'DUPLICATE_MESSAGEID' : 'PRINT_OK',
        messageId: messageId,
        labelType: labelType,
        gs1: baseBarcode + normalizedCounter,  // ← GS1 con contador del PLC
        counterUsed: normalizedCounter,        // ← Contador usado del PLC
        counterOriginal: plcCounter,           // ← Contador original del PLC
        copies: copies,
        printerTarget: printerTarget,
        isDuplicate: isDuplicate
      }) + '#');
      
      if (isDuplicate) {
        log(`[PLC] 🔄 Etiqueta ${labelType} con MessageID ${messageId} procesada como duplicada, contador PLC: ${normalizedCounter}`, 'PLC', 'warn');
      } else {
        log(`[PLC] ✅ Etiqueta ${labelType} con MessageID ${messageId} impresa correctamente con contador PLC: ${normalizedCounter}`, 'PLC', 'success');
      }
    })
    .catch(error => {
      log(`Error al imprimir: ${error.message}`, 'PLC', 'error');
      socket.write(JSON.stringify({
        status: 'error',
        code: 'PRINT_ERROR',
        messageId: messageId,
        error: error.message,
        counterUsed: normalizedCounter,
        isDuplicate: isDuplicate
      }) + '#');
    });
}

/**
 * Maneja el comando de consulta o actualización del contador (cmd 40)
 * @param {net.Socket} socket - Socket de conexión
 * @param {Object} command - Comando recibido
 * @param {number} messageId - ID del mensaje
 */
function handleCounterCommand(socket, command, messageId) {
  if (command.data && command.data.setCounter) {
    log(`[PLC] Solicitud de actualización de contador a: ${command.data.setCounter}`, 'PLC');
    
    // CORRIGIENDO: Por ahora solo consultamos el contador, no lo modificamos automáticamente
    // El contador se debe manejar desde el flujo normal de etiquetas
    log(`[PLC] ADVERTENCIA: Comando 40 con setCounter no implementado para evitar conflictos`, 'PLC', 'warn');
    
    // Responder con el contador actual
    socket.write(JSON.stringify({
      status: 'success',
      code: 'COUNTER_CURRENT', // Cambio de código para indicar que solo consultamos
      messageId: messageId,
      counter: getCurrentCounter(),
      note: 'Contador no modificado - se gestiona automáticamente con etiquetas'
    }) + '#');
  } else {
    log('[PLC] Consultando contador actual', 'PLC');
    
    // Responder con el contador actual (sin incrementar)
    socket.write(JSON.stringify({
      status: 'success',
      code: 'COUNTER_VALUE',
      messageId: messageId,
      counter: getCurrentCounter()
    }) + '#');
  }
}

/**
 * Maneja el comando de consulta de última etiqueta NORMAL (cmd 80)
 * @param {net.Socket} socket - Socket de conexión
 * @param {Object} command - Comando recibido
 * @param {number} messageId - ID del mensaje
 * @returns {boolean} Indica si el comando es el esperado para ADI
 */
function handleLastLabelCommand(socket, command, messageId) {
  const cmdReceived = command.cmd.toString();
  log(`[PLC] Procesando comando ${cmdReceived} (consulta de última etiqueta NORMAL)`, 'PLC');
  
  // Emitir un evento específico para el comando 80 para asegurar que ADI lo procese
  if (global.eventBus) {
    log(`Emitiendo evento específico para comando 80`, 'PLC');
    global.eventBus.emit('plcCommand', '80');
  }
  
  const lastNormalLabel = getLastLabelInfoForCmd80(); // Solo etiquetas NORMALES no leídas
  
  // Respuesta al PLC
  if (lastNormalLabel) {
    // ✅ NUEVA FUNCIONALIDAD: Marcar como leída por el PLC
    const { markNormalLabelAsRead } = require('../services/label-service');
    markNormalLabelAsRead();
    
    // Responder con la información de la última etiqueta NORMAL
    log(`[PLC] Devolviendo información de última etiqueta NORMAL: ${lastNormalLabel.gs1} (marcada como leída)`, 'PLC');
    
    // Formato actualizado que incluye contador extraído y tipo
    socket.write(JSON.stringify({
      status: 'success',
      code: 'LAST_LABEL_INFO',
      messageId: messageId,
      gs1: lastNormalLabel.gs1,
      counter: lastNormalLabel.counter,    // ← Contador extraído
      type: "normal",                      // ← Siempre "normal"
      copies: lastNormalLabel.copies || 1
    }) + '#');
  } else {
    // No hay información de etiqueta NORMAL disponible o ya fue leída
    log('[PLC] No hay etiqueta NORMAL nueva para enviar (sin etiquetas o ya leída)', 'PLC', 'warn');
    
    socket.write(JSON.stringify({
      status: 'warning',
      code: 'NO_NEW_NORMAL_LABEL_INFO',
      messageId: messageId,
      message: 'No hay nueva información de etiqueta NORMAL disponible',
      type: "normal"
    }) + '#');
    
    log(`[PLC] Devolviendo respuesta: sin etiqueta NORMAL nueva disponible`, 'PLC');
  }
  
  // Retornar true para indicar que este es el comando 80
  return cmdReceived === '80';
}

/**
 * Maneja el comando de consulta de última etiqueta RFID (cmd 81)
 * @param {net.Socket} socket - Socket de conexión
 * @param {Object} command - Comando recibido
 * @param {number} messageId - ID del mensaje
 * @returns {boolean} Indica si el comando es el esperado para ADI
 */
function handleRfidLabelCommand(socket, command, messageId) {
  const cmdReceived = command.cmd.toString();
  log(`[PLC] Procesando comando ${cmdReceived} (consulta de última etiqueta RFID)`, 'PLC');
  
  // Emitir un evento específico para el comando 81 para asegurar que ADI lo procese
  if (global.eventBus) {
    log(`Emitiendo evento específico para comando 81`, 'PLC');
    global.eventBus.emit('plcCommand', '81');
  }
  
  const lastRfidLabel = getLastRfidLabelInfoForCmd81(); // Solo etiquetas RFID no leídas
  
  // Respuesta al PLC
  if (lastRfidLabel) {
    // ✅ NUEVA FUNCIONALIDAD: Marcar como leída por el PLC
    const { markRfidLabelAsRead } = require('../services/label-service');
    markRfidLabelAsRead();
    
    // Responder con la información de la última etiqueta RFID
    log(`[PLC] Devolviendo información de última etiqueta RFID: ${lastRfidLabel.gs1} (marcada como leída)`, 'PLC');
    
    // Formato exacto que espera el PLC en producción
    socket.write(JSON.stringify({
      status: 'success',
      code: 'LAST_RFID_LABEL_INFO',
      messageId: messageId,
      gs1: lastRfidLabel.gs1,
      counter: lastRfidLabel.counter,    // ← Contador extraído
      type: "rfid",                      // ← Siempre "rfid"
      copies: lastRfidLabel.copies || 1
    }) + '#');
  } else {
    // No hay información de etiqueta RFID disponible o ya fue leída
    log('[PLC] No hay etiqueta RFID nueva para enviar (sin etiquetas o ya leída)', 'PLC', 'warn');
    
    socket.write(JSON.stringify({
      status: 'warning',
      code: 'NO_NEW_RFID_LABEL_INFO',
      messageId: messageId,
      message: 'No hay nueva información de etiqueta RFID disponible',
      type: "rfid"
    }) + '#');
    
    log(`[PLC] Devolviendo respuesta: sin etiqueta RFID nueva disponible`, 'PLC');
  }
  
  // Retornar true para indicar que este es el comando 81
  return cmdReceived === '81';
}

/**
 * Inicia el servidor PLC
 * @returns {Promise<net.Server>} Promise que se resuelve con el servidor iniciado
 */
function startPlcServer() {
  return new Promise((resolve, reject) => {
    tcpServer.listen(config.PLC_PORT, '0.0.0.0', () => {
      log(`Servidor PLC escuchando en puerto ${config.PLC_PORT}`, 'PLC', 'success');
      log(`Simulando dispositivo IOT2050 con IP ${config.IOT_IP}`, 'PLC');
      resolve(tcpServer);
    }).on('error', (err) => {
      log(`Error al iniciar servidor PLC: ${err.message}`, 'PLC', 'error');
      reject(err);
    });
  });
}

/**
 * Detiene el servidor PLC
 * @returns {Promise<void>} Promise que se resuelve cuando el servidor está detenido
 */
function stopPlcServer() {
  return new Promise((resolve) => {
    if (tcpServer.listening) {
      tcpServer.close(() => {
        log('Servidor PLC detenido', 'PLC');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Obtiene información sobre el comando esperado para responder a ADI
 * @param {string} commandReceived - Comando recibido del PLC
 * @param {string} waitForCommand - Comando configurado para esperar
 * @returns {boolean} Indica si el comando recibido es el esperado
 */
function isExpectedCommand(commandReceived, waitForCommand) {
  return commandReceived === waitForCommand || waitForCommand === 'any';
}

/**
 * Obtiene todas las conexiones activas del PLC
 * @returns {Map<number, net.Socket>} Mapa de conexiones activas
 */
function getActiveConnections() {
  return activeConnections;
}

module.exports = {
  startPlcServer,
  stopPlcServer,
  handleLastLabelCommand,
  handleRfidLabelCommand,
  handleRfidPrintCommand,
  isExpectedCommand,
  getActiveConnections
};
