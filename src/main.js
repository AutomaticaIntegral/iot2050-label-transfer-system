/**
 * Archivo principal del servidor híbrido
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer (Sistema de Transferencia de Etiquetas)
 * 
 * Este archivo coordina la inicialización de todos los módulos:
 * - Servidor web para monitoreo y API
 * - Servidor TCP para comunicación con PLC
 * - Servidor TCP para recepción de etiquetas ADI
 * - Servicios de etiquetas e impresión
 */

// Primero importamos configuración y utilidades básicas
const config = require('./config/index');
const { loadSystemConfig } = require('./utils/system-config');

// Importamos módulos sin inicializar los servidores todavía
const logger = require('./utils/logger');
const { log } = logger;
const { initLabelService } = require('./services/label-service');

// Módulos de servidores (solo importamos, no iniciamos)
let webServer, plcServer, adiServer;

// Banner inicial
console.log('\n');
console.log('═════════════════════════════════════════════════════');
console.log('  SERVIDOR HÍBRIDO DE SIMULACIÓN - ADISSEO');
console.log('  TCP Label Transfer - Sistema de Transferencia de Etiquetas');
console.log('═════════════════════════════════════════════════════');
console.log('\n');

// Función principal para iniciar todos los servicios
async function startHybridServer() {
  try {
    log('Iniciando servicios...', 'SERVER');
    
    // Cargar configuración del sistema
    const systemConfig = loadSystemConfig();
    log(`Configuración cargada: Esperar comando ${systemConfig.waitForCommand === 'none' ? 'ninguno' : systemConfig.waitForCommand}`, 'SERVER');
    
    // Inicializar el servicio de etiquetas
    initLabelService();
    
    // 1. Inicializar y cargar el servidor web primero (para que los logs funcionen)
    log('Inicializando servidor web...', 'SERVER');
    webServer = require('./servers/web-server');
    await webServer.startWebServer();
    
    // 2. Crear un bus de eventos central para comunicación entre módulos
    const EventEmitter = require('events');
    global.eventBus = new EventEmitter();
    log('Bus de eventos central inicializado para comunicación entre módulos', 'SERVER');
    
    // 3. Inicializar servidor PLC
    log('Inicializando servidor PLC...', 'SERVER');
    plcServer = require('./servers/plc-server');
    await plcServer.startPlcServer();
    
    // 4. Inicializar servidor ADI
    log('Inicializando servidor ADI...', 'SERVER');
    adiServer = require('./servers/adi-server');
    await adiServer.startAdiServer();
    
    // 5. Configurar comunicación entre módulos a través del bus de eventos
    // Configurar los listeners del servidor ADI después de crear el eventBus
    log('Configurando eventos del bus para servidor ADI...', 'SERVER');
    adiServer.setupEventBusListeners();
    
    // Cuando llegue un comando PLC, notificar al servidor ADI
    global.eventBus.on('plcCommand', (command) => {
      log(`Evento recibido: Comando PLC ${command}`, 'SERVER');
      if (adiServer && adiServer.processPlcCommand) {
        try {
          // Llamar directamente a la función processPlcCommand con el comando recibido
          const result = adiServer.processPlcCommand(command);
          
          if (result) {
            log(`Comando ${command} procesado correctamente por ADI`, 'SERVER', 'success');
          } else {
            log(`Comando ${command} no requiere procesamiento por ADI (no hay conexión pendiente o comando no coincide)`, 'SERVER');
          }
        } catch (error) {
          log(`Error al procesar comando en ADI: ${error.message}`, 'SERVER', 'error');
          
          // Registrar información adicional para depuración
          console.error('Error completo:', error);
          log('Verificando pendingAdiConnection y waitForCommand...', 'SERVER');
          
          // Verificar el estado del sistema para depuración
          if (adiServer) {
            const sysConfig = require('./utils/system-config').getSystemConfig();
            log(`Configuración actual: waitForCommand=${sysConfig.waitForCommand}`, 'SERVER');
          }
        }
      }
    });
    
    // Log para confirmar que todo está conectado correctamente
    log('Comunicación entre módulos configurada correctamente', 'SERVER', 'success');
    
    // Mostrar información de uso
    log('=== SERVIDOR HÍBRIDO DE PRUEBAS INICIADO ===', 'SERVER', 'success');
    log('Cliente: Adisseo', 'SERVER');
    log(`Simulando IP: ${config.IOT_IP}`, 'SERVER');
    log(`Puerto PLC: ${config.PLC_PORT}`, 'SERVER');
    log(`Puerto recepción etiquetas: ${config.LABEL_RECEIVE_PORT}`, 'SERVER');
    log(`Interfaz web: http://localhost:${config.WEB_PORT}`, 'SERVER');
    log('', 'SERVER');
    log('Para detener todos los servicios de Node.js: Get-Process -Name "node" | Stop-Process', 'SERVER', 'warn');
    log('', 'SERVER');
    
    // Instrucciones de prueba
    log('Para probar el servidor:', 'SERVER');
    log('  1. Enviar comandos PLC:', 'SERVER');
    log('     cd ..\\..', 'SERVER');
    log('     node test-plc-cmd10.js 10', 'SERVER');
    log('', 'SERVER');
    log('  2. Simular envío de etiquetas desde ADI:', 'SERVER');
    log('     cd ..\\adi', 'SERVER');
    log('     node adi-erp-simulator.js bidon1', 'SERVER');
    log('', 'SERVER');
    
    // Configurar manejo de señales para cierre ordenado
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    
  } catch (error) {
    log(`Error al iniciar servidor híbrido: ${error.message}`, 'SERVER', 'error');
    process.exit(1);
  }
}

// Función para manejar el cierre ordenado del servidor
async function handleShutdown() {
  log('Cerrando servidores...', 'SERVER', 'warn');
  
  try {
    // Limpiar el bus de eventos global
    if (global.eventBus) {
      global.eventBus.removeAllListeners();
      log('Bus de eventos limpiado', 'SERVER');
    }
    
    // Detener servidores en orden inverso (si están inicializados)
    if (adiServer && adiServer.stopAdiServer) {
      await adiServer.stopAdiServer();
      log('Servidor ADI detenido', 'SERVER');
    }
    
    if (plcServer && plcServer.stopPlcServer) {
      await plcServer.stopPlcServer();
      log('Servidor PLC detenido', 'SERVER');
    }
    
    if (webServer && webServer.stopWebServer) {
      await webServer.stopWebServer();
      log('Servidor web detenido', 'SERVER');
    }
    
    log('Todos los servidores han sido cerrados correctamente', 'SERVER', 'success');
    process.exit(0);
  } catch (error) {
    log(`Error al cerrar servidores: ${error.message}`, 'SERVER', 'error');
    process.exit(1);
  }
}

// Iniciar el servidor híbrido
startHybridServer();
