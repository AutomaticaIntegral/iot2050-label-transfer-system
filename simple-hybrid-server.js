/**
 * Servidor IOT2050 Híbrido Simplificado - Entorno de Pruebas
 * Cliente: Adisseo
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

// Cargar el servicio PLC real de producción
const { PlcService } = require('../../src/services/plcService');

// Configuración
const PLC_PORT = 9200;
const IOT_IP = '10.108.220.100';

console.log(`[HÍBRIDO] Iniciando entorno simplificado con IP simulada: ${IOT_IP}`);

// Crear instancia del servicio PLC real
const plcService = new PlcService();

// Crear servidor TCP que escuche en el puerto 9200 (puerto PLC)
const tcpServer = net.createServer((socket) => {
  console.log(`[PLC] Nueva conexión desde ${socket.remoteAddress}:${socket.remotePort}`);
  
  socket.on('data', (data) => {
    // Procesar comando usando el plcService real
    try {
      const commandData = data.toString();
      console.log(`[PLC] Comando recibido: ${commandData}`);
      
      // Usar la implementación real para procesar el comando
      plcService.handleCommand(socket, commandData, { simulationMode: true });
    } catch (error) {
      console.error(`[PLC] Error al procesar comando: ${error.message}`);
      socket.write(JSON.stringify({
        status: 'error',
        message: 'Error interno del servidor'
      }));
    }
  });
  
  socket.on('error', (err) => {
    console.error(`[PLC] Error en conexión: ${err.message}`);
  });
  
  socket.on('close', () => {
    console.log('[PLC] Conexión cerrada');
  });
});

// Iniciar servidor PLC
tcpServer.listen(PLC_PORT, '0.0.0.0', () => {
  console.log(`[HÍBRIDO] Servicio PLC REAL escuchando en puerto ${PLC_PORT}`);
  console.log('[HÍBRIDO] Este entorno usa el código REAL de producción en un entorno simulado');
  console.log('[HÍBRIDO] Puedes probar con: node ../../test-plc-cmd10.js 10');
});

// Manejar cierre del servidor
process.on('SIGINT', () => {
  console.log('Cerrando servidor híbrido...');
  tcpServer.close();
  process.exit(0);
});
