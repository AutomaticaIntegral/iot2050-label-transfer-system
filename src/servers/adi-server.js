/**
 * Servidor TCP para recepción de etiquetas desde ADI
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const { log } = require('../utils/logger');
const { getSystemConfig } = require('../utils/system-config');
const { processReceivedLabel, setLastLabelInfo, updateSystemCounter } = require('../services/label-service');
const { saveLabelInfo } = require('../utils/file-handler');
// En lugar de usar eventos locales, utilizaremos el bus de eventos global
// que se inicializa en main.js
// Esto elimina cualquier referencia circular entre los módulos
const config = require('../config');

// Variables para manejo de conexiones ADI pendientes
let pendingAdiConnection = null;
let adiTimeout = null;

// Configuración de timeouts para respuesta a Adisseo
const ADI_RESPONSE_CONFIG = {
  // Tiempo de espera antes de enviar respuesta cuando NO se espera comando PLC (modo inmediato)
  IMMEDIATE_RESPONSE_DELAY: 2000, // 2 segundos por defecto
  
  // Tiempo de espera cuando SÍ se espera comando PLC antes de timeout
  PLC_COMMAND_TIMEOUT: 8000, // 8 segundos por defecto
  
  // Tiempo adicional después de enviar respuesta para que Adisseo cierre la conexión
  WAIT_FOR_CLIENT_CLOSE: 5000, // 5 segundos para que cliente cierre
  
  // Respuesta simple sin caracteres de control
  RESPONSE_SUCCESS: 'OK',
  RESPONSE_ERROR_TIMEOUT: 'ERROR+9999',
  RESPONSE_ERROR_PROCESSING: 'ERROR+1000'
};

/**
 * Procesa un comando PLC y responde a ADI si corresponde
 * @param {string} commandReceived - Comando recibido del PLC
 * @returns {boolean} - Indica si se procesó una respuesta a ADI
 */
/**
 * Determina si un comando coincide con el comando esperado según la configuración
 * @param {string} commandReceived - Comando recibido
 * @param {string} waitForCommand - Comando configurado para esperar
 * @returns {boolean} - Indica si el comando coincide
 */
function checkCommandMatch(commandReceived, waitForCommand) {
  return waitForCommand === 'any' || commandReceived === waitForCommand;
}

/**
 * Procesa un comando PLC y responde a ADI si corresponde
 * @param {string} commandReceived - Comando recibido del PLC
 * @returns {boolean} - Indica si se procesó una respuesta a ADI
 */
/**
 * Procesa un comando PLC y responde a ADI si corresponde
 * @param {string} commandReceived - Comando recibido del PLC
 * @returns {boolean} - Indica si se procesó una respuesta a ADI
 */
function processPlcCommand(commandReceived) {
  try {
    // Si no hay conexión ADI pendiente, no hacemos nada
    if (!pendingAdiConnection) {
      log(`Comando PLC ${commandReceived} recibido, pero no hay conexión ADI pendiente`, 'ADI');
      return false;
    }
    
    // Obtener la configuración actual
    const config = getSystemConfig();
    const waitForCommand = config.waitForCommand;
    
    // Verificar si este es el comando que estamos esperando usando la función auxiliar
    const isCommandExpected = checkCommandMatch(commandReceived, waitForCommand);
      
    log(`Comando PLC ${commandReceived} recibido, esperando: ${waitForCommand}`, 'ADI');
      
    if (isCommandExpected) {
      log(`⚠️ Comando ${commandReceived} coincide con el esperado (${waitForCommand})`, 'ADI', 'success');
      
      // Procesar la respuesta a la conexión ADI pendiente
      return processPendingLabelResponse(true);
    }
    
    return false;
  } catch (error) {
    log(`Error al procesar comando PLC para ADI: ${error.message}`, 'ADI', 'error');
    return false;
  }
}

// Crear servidor TCP para recibir etiquetas del ERP ADI
const labelReceiveServer = net.createServer((socket) => {
  log(`Nueva conexión desde ${socket.remoteAddress}:${socket.remotePort}`, 'ADI');
  
  // Configurar timeout de socket como failsafe (30 segundos)
  socket.setTimeout(30000);
  
  socket.on('timeout', () => {
    log('⚠️ Timeout de socket ADI (30s) - Cerrando conexión', 'ADI', 'error');
    socket.destroy();
  });
  
  let dataBuffer = '';
  
  socket.on('data', (data) => {
    const labelData = data.toString();
    dataBuffer += labelData;
    
    log(`Recibiendo datos de etiqueta (${labelData.length} bytes)...`, 'ADI');
    log(`📊 Conexión desde: ${socket.remoteAddress}:${socket.remotePort}`, 'ADI');
    log(`📊 Buffer actual: ${dataBuffer.length} bytes`, 'ADI');
    
    // Mostrar datos raw recibidos
    log('\n--- INICIO DATOS RAW RECIBIDOS DE ADI ---', 'ADI');
    log(labelData, 'ADI');
    log('--- FIN DATOS RAW RECIBIDOS DE ADI ---\n', 'ADI');
    
    // Analizar la etiqueta recibida
    try {
      // Procesar la etiqueta usando el servicio de etiquetas
      const labelInfo = processReceivedLabel(dataBuffer);
      
      // Verificar la configuración de espera de comandos
      const currentConfig = getSystemConfig();
      
      if (currentConfig.waitForCommand === 'none') {
        // No esperamos comando del PLC, respondemos después de un delay configurable
        log('Configuración actual: No esperar comando PLC. Procesando inmediatamente con delay configurable.', 'ADI', 'warn');
        
        // Guardar la etiqueta inmediatamente
        setLastLabelInfo(labelInfo);
        saveLabelInfo(labelInfo);
        
        // Actualizar el contador con el de la etiqueta
        if (labelInfo.counter) {
          updateSystemCounter(labelInfo.counter);
        }
        
        // Emitir evento de nueva etiqueta para el monitor
        const { io } = require('./web-server');
        if (io) {
          io.emit('labelReceived', labelInfo);
        }
        
        // Esperar tiempo configurable antes de responder para permitir que Adisseo esté listo
        log(`Esperando ${ADI_RESPONSE_CONFIG.IMMEDIATE_RESPONSE_DELAY}ms antes de enviar respuesta`, 'ADI', 'info');
        setTimeout(() => {
          if (socket && socket.writable) {
            // Responder a ADI solo con "OK" (sin \r)
            socket.write(ADI_RESPONSE_CONFIG.RESPONSE_SUCCESS);
            log(`Respuesta enviada a ADI: ${ADI_RESPONSE_CONFIG.RESPONSE_SUCCESS}`, 'ADI', 'success');
            
            // NO cerramos la conexión - que Adisseo la cierre
            log(`Conexión mantenida abierta. Esperando que Adisseo cierre la conexión.`, 'ADI', 'info');
            
            // Timeout de seguridad para evitar conexiones colgadas
            setTimeout(() => {
              if (socket && socket.writable) {
                log('Timeout de seguridad alcanzado. Cerrando conexión como último recurso.', 'ADI', 'warn');
                socket.end();
              }
            }, ADI_RESPONSE_CONFIG.WAIT_FOR_CLIENT_CLOSE);
          }
        }, ADI_RESPONSE_CONFIG.IMMEDIATE_RESPONSE_DELAY);
        
      } else {
        // Esperamos al comando configurado del PLC
        const cmdToWait = currentConfig.waitForCommand;
        log(`Etiqueta recibida y parseada. Se guardará cuando se reciba cmd ${cmdToWait}`, 'ADI', 'warn');
        
        // No respondemos inmediatamente, guardamos la conexión para responder cuando
        // recibamos el comando configurado del PLC o cuando se cumpla el timeout
        log(`Guardando conexión ADI pendiente de respuesta hasta comando ${cmdToWait} o timeout`, 'ADI', 'warn');
        
        // IMPORTANTE: No guardamos la etiqueta aquí, solo la mantenemos en pendingAdiConnection
        // para evitar duplicaciones cuando se procese el comando PLC
        
        // Guardar la conexión ADI pendiente
        pendingAdiConnection = {
          socket: socket,
          timestamp: Date.now(),
          labelInfo: labelInfo,
          waitForCommand: cmdToWait // Guardar qué comando estamos esperando
        };
        
        // Configurar timeout configurable para comando PLC
        clearTimeout(adiTimeout); // Limpiamos timeout anterior si existe
        log(`Configurando timeout de ${ADI_RESPONSE_CONFIG.PLC_COMMAND_TIMEOUT}ms para comando PLC`, 'ADI', 'info');
        adiTimeout = setTimeout(() => {
          if (pendingAdiConnection && pendingAdiConnection.socket) {
            log(`\n⚠️ TIMEOUT: No se recibió comando ${cmdToWait} del PLC en ${ADI_RESPONSE_CONFIG.PLC_COMMAND_TIMEOUT}ms`, 'ADI', 'error');
            log(`Enviando ${ADI_RESPONSE_CONFIG.RESPONSE_ERROR_TIMEOUT} al ADI (código para timeout PLC)`, 'ADI', 'error');
            
            try {
              // Intentar enviar respuesta de error (sin \r)
              pendingAdiConnection.socket.write(ADI_RESPONSE_CONFIG.RESPONSE_ERROR_TIMEOUT);
              log(`Respuesta ${ADI_RESPONSE_CONFIG.RESPONSE_ERROR_TIMEOUT} enviada exitosamente`, 'ADI', 'error');
              
              // NO forzamos cierre - que Adisseo cierre la conexión
              log('Conexión mantenida abierta para que Adisseo la cierre', 'ADI', 'info');
              
              // Timeout de seguridad para evitar conexiones colgadas
              setTimeout(() => {
                if (pendingAdiConnection && pendingAdiConnection.socket) {
                  log('Timeout de seguridad alcanzado. Cerrando conexión ADI como último recurso', 'ADI', 'warn');
                  pendingAdiConnection.socket.end();
                }
              }, ADI_RESPONSE_CONFIG.WAIT_FOR_CLIENT_CLOSE);
              
            } catch (error) {
              log(`Error al enviar respuesta de timeout: ${error.message}`, 'ADI', 'error');
              // Forzar cierre inmediato si no se puede enviar respuesta
              if (pendingAdiConnection && pendingAdiConnection.socket) {
                pendingAdiConnection.socket.destroy();
              }
            }
            
            log('No se guarda la etiqueta ni se actualiza el contador debido al timeout', 'ADI', 'error');
            pendingAdiConnection = null;
          }
        }, ADI_RESPONSE_CONFIG.PLC_COMMAND_TIMEOUT);
      }
    } catch (error) {
      log(`Error al procesar etiqueta: ${error.message}`, 'ADI', 'error');
      socket.write(ADI_RESPONSE_CONFIG.RESPONSE_ERROR_PROCESSING);
      log(`Enviando ${ADI_RESPONSE_CONFIG.RESPONSE_ERROR_PROCESSING} al ADI (error de procesamiento)`, 'ADI', 'error');
      
      // Mantener conexión abierta para que Adisseo la cierre
      log('Conexión mantenida abierta para que Adisseo la cierre tras error', 'ADI', 'info');
    }
  });
  
  socket.on('error', (err) => {
    log(`Error en conexión: ${err.message}`, 'ADI', 'error');
  });
  
  socket.on('close', () => {
    log('Conexión cerrada', 'ADI');
  });
});

/**
 * Configurar eventos del bus global - se llamará después de inicializar el eventBus
 */
function setupEventBusListeners() {
  if (global.eventBus) {
    // Suscribirse al evento específico para el comando 80
    global.eventBus.on('plcCommand_80', (commandData) => {
      log('Evento específico para comando 80 recibido', 'ADI');
      
      // Procesar el comando 80 (consulta de última etiqueta)
      if (pendingAdiConnection) {
        log('Procesando comando 80 - Etiqueta ADI pendiente encontrada', 'ADI', 'success');
        processPendingLabelResponse(true);
      } else {
        log('Comando 80 recibido pero no hay etiqueta ADI pendiente', 'ADI', 'warn');
      }
    });
    
    log('Eventos del bus configurados para servidor ADI', 'ADI', 'success');
  } else {
    log('Global eventBus no disponible al configurar eventos ADI', 'ADI', 'warn');
  }
}

/**
 * Inicia el servidor de recepción de etiquetas
 * @returns {Promise<net.Server>} Promesa que se resuelve con el servidor
 */
function startAdiServer() {
  return new Promise((resolve, reject) => {
    // Crear el servidor TCP
    labelReceiveServer.listen(config.LABEL_RECEIVE_PORT, '0.0.0.0', () => {
      log(`Servidor ADI escuchando en puerto ${config.LABEL_RECEIVE_PORT}`, 'ADI', 'success');
      
      // Configurar eventos del bus (si ya está disponible)
      setupEventBusListeners();
      
      resolve(labelReceiveServer);
    }).on('error', (err) => {
      log(`Error al iniciar servidor ADI: ${err.message}`, 'ADI', 'error');
      reject(err);
    });
  });
}

/**
 * Detiene el servidor de recepción de etiquetas
 * @returns {Promise<void>} Promise que se resuelve cuando el servidor está detenido
 */
function stopAdiServer() {
  return new Promise((resolve) => {
    if (labelReceiveServer.listening) {
      labelReceiveServer.close(() => {
        log('Servidor ADI detenido', 'ADI');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Procesa una respuesta pendiente a una conexión ADI
 * @param {boolean} success - Indica si la respuesta es exitosa
 */
function processPendingLabelResponse(success) {
  if (!pendingAdiConnection || !pendingAdiConnection.socket) {
    log('No hay conexión ADI pendiente para procesar', 'ADI', 'warn');
    return false;
  }
  
  const waitForCmd = pendingAdiConnection.waitForCommand || '80';
  
  if (success) {
    log(`\n✅ Procesando respuesta exitosa para ADI pendiente`, 'ADI', 'success');
    
    // Guardar la información de la etiqueta y actualizar contador
    if (pendingAdiConnection.labelInfo) {
      // VERIFICAR: Solo guardar si la etiqueta no fue guardada previamente
      // Durante processReceivedLabel ya se procesa y guarda la etiqueta
      // Aquí solo necesitamos establecerla como la última y actualizar el contador
      
      // Establecer como última etiqueta (sin duplicar el guardado)
      setLastLabelInfo(pendingAdiConnection.labelInfo);
      
      // IMPORTANTE: La etiqueta ya fue guardada en processReceivedLabel -> processIndividualLabel
      // NO volvemos a guardarla para evitar duplicaciones
      // saveLabelInfo(pendingAdiConnection.labelInfo); // COMENTADO: Evita duplicación
      
      log(`💾 Etiqueta establecida como última: ${pendingAdiConnection.labelInfo.gs1}`, 'SERVER', 'success');
      
      // Si la etiqueta tiene un contador, actualizarlo
      if (pendingAdiConnection.labelInfo.counter) {
        updateSystemCounter(pendingAdiConnection.labelInfo.counter);
      }
      
      log(`📋 Información de etiqueta actualizada y contador sincronizado`, 'ADI', 'success');
      
      // Emitir evento de nueva etiqueta para el monitor
      try {
        const webServer = require('./web-server');
        if (webServer && webServer.io) {
          webServer.io.emit('labelReceived', pendingAdiConnection.labelInfo);
        }
      } catch (error) {
        log(`No se pudo emitir evento al monitor: ${error.message}`, 'ADI', 'warn');
      }
    }
    
    // Enviar la respuesta OK al ADI (sin \r)
    pendingAdiConnection.socket.write(ADI_RESPONSE_CONFIG.RESPONSE_SUCCESS);
    log(`Respuesta ${ADI_RESPONSE_CONFIG.RESPONSE_SUCCESS} enviada a ADI`, 'ADI', 'success');
    
    // NO cerramos la conexión - que Adisseo la cierre
    log(`Conexión mantenida abierta. Esperando que Adisseo cierre la conexión.`, 'ADI', 'info');
  } else {
    // En caso de error, enviar ERROR (sin \r)
    pendingAdiConnection.socket.write(ADI_RESPONSE_CONFIG.RESPONSE_ERROR_TIMEOUT);
    log(`Respuesta ${ADI_RESPONSE_CONFIG.RESPONSE_ERROR_TIMEOUT} enviada a ADI (procesamiento fallido)`, 'ADI', 'error');
    
    // NO cerramos la conexión - que Adisseo la cierre
    log(`Conexión mantenida abierta tras error. Esperando que Adisseo cierre la conexión.`, 'ADI', 'info');
  }
  
  // Limpiar el timeout y la conexión pendiente
  clearTimeout(adiTimeout);
  const processedConnection = pendingAdiConnection;
  pendingAdiConnection = null;
  
  log(`Completado procesamiento de etiqueta ADI pendiente`, 'ADI', 'success');
  return true;
}

/**
 * Obtiene información sobre la conexión ADI pendiente
 * @returns {Object|null} Información de la conexión pendiente
 */
function getPendingAdiConnection() {
  return pendingAdiConnection;
}

/**
 * Obtiene la configuración actual de respuesta ADI
 * @returns {Object} Configuración de timeouts y respuestas
 */
function getAdiResponseConfig() {
  return { ...ADI_RESPONSE_CONFIG };
}

/**
 * Actualiza la configuración de respuesta ADI
 * @param {Object} newConfig - Nueva configuración
 */
function updateAdiResponseConfig(newConfig) {
  Object.assign(ADI_RESPONSE_CONFIG, newConfig);
  log(`Configuración ADI actualizada: ${JSON.stringify(ADI_RESPONSE_CONFIG)}`, 'ADI', 'info');
}

/**
 * Obtiene estadísticas del servidor ADI
 * @returns {Object} Estadísticas del servidor
 */
function getAdiServerStats() {
  return {
    isListening: labelReceiveServer.listening,
    port: config.LABEL_RECEIVE_PORT,
    hasPendingConnection: pendingAdiConnection !== null,
    pendingConnectionInfo: pendingAdiConnection ? {
      timestamp: pendingAdiConnection.timestamp,
      waitForCommand: pendingAdiConnection.waitForCommand,
      remoteAddress: pendingAdiConnection.socket ? pendingAdiConnection.socket.remoteAddress : null
    } : null,
    config: ADI_RESPONSE_CONFIG
  };
}

module.exports = {
  startAdiServer,
  stopAdiServer,
  processPlcCommand,
  setupEventBusListeners,
  getPendingAdiConnection,
  processPendingLabelResponse,
  getAdiResponseConfig,
  updateAdiResponseConfig,
  getAdiServerStats
};
