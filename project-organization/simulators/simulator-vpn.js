/**
 * Simulador Especial para Testing VPN con IoT Real
 * Cliente: ADISSEO
 * IP VPN: 100.97.189.85
 */

const net = require('net');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const WEB_PORT = 3002;
const SIMULATORS = {
  rfid_vpn: {
    name: 'Impresora RFID (VPN desde IoT)',
    port: 9105,
    host: '0.0.0.0',
    type: 'RFID_VPN',
    description: 'Recibe etiquetas RFID desde IoT real via VPN',
    status: 'online',
    receivedCount: 0,
    lastReceived: null,
    logs: []
  },
  product_vpn: {
    name: 'Impresora Producto (VPN desde IoT)',
    port: 9106,
    host: '0.0.0.0',
    type: 'PRODUCT_VPN',
    description: 'Recibe etiquetas normales desde IoT real via VPN',
    status: 'online',
    receivedCount: 0,
    lastReceived: null,
    logs: []
  }
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const tcpServers = new Map();

function log(message, printer = 'SYSTEM', level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, printer, level, message };
  
  console.log(`[📡 VPN] [${timestamp}] [${printer}] ${message}`);
  io.emit('log', logEntry);
  
  if (SIMULATORS[printer.toLowerCase()]) {
    SIMULATORS[printer.toLowerCase()].logs.unshift(logEntry);
    if (SIMULATORS[printer.toLowerCase()].logs.length > 50) {
      SIMULATORS[printer.toLowerCase()].logs = SIMULATORS[printer.toLowerCase()].logs.slice(0, 50);
    }
  }
}

function createPrinterSimulator(printerKey, config) {
  const server = net.createServer((socket) => {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    log(`🏭 CONEXIÓN VPN DESDE IOT: ${clientInfo}`, printerKey.toUpperCase(), 'success');
    
    socket.on('data', (data) => {
      const zplData = data.toString();
      const timestamp = new Date().toISOString();
      
      config.receivedCount++;
      config.lastReceived = timestamp;
      
      let labelType = 'Normal';
      if (zplData.includes('^RFW') || zplData.includes('RFID')) {
        labelType = 'RFID';
      }
      
      log(`📄 ETIQUETA ${labelType} VÍA VPN (${zplData.length} bytes)`, printerKey.toUpperCase(), 'success');
      
      if (labelType === 'RFID') {
        const rfidMatch = zplData.match(/\^RFW,H\^FD(.+?)\^FS/);
        const gs1Match = zplData.match(/\^FD(\d{20})\^FS/) || zplData.match(/\^FD\(01\)(.+?)\^FS/);
        
        if (rfidMatch) {
          log(`🔗 DATOS RFID: ${rfidMatch[1]}`, printerKey.toUpperCase(), 'info');
        }
        if (gs1Match) {
          log(`🏷️ GS1 CODE: ${gs1Match[1]}`, printerKey.toUpperCase(), 'info');
        }
        
        // Extraer más detalles
        const counterMatch = zplData.match(/\(21\)(\d+)/);
        if (counterMatch) {
          log(`🔢 CONTADOR DETECTADO: ${counterMatch[1]}`, printerKey.toUpperCase(), 'info');
        }
      }
      
      const receivedData = {
        id: `${printerKey}-${Date.now()}`,
        timestamp,
        clientInfo,
        labelType,
        size: zplData.length,
        content: zplData,
        printer: printerKey,
        source: 'IoT_VPN_192.168.214.50'
      };
      
      io.emit('printerData', receivedData);
      io.emit('printerStatus', getSimulatorStatus());
      
      socket.write('OK\n');
      log(`✅ RESPUESTA VPN ENVIADA AL IOT`, printerKey.toUpperCase(), 'info');
    });
    
    socket.on('error', (err) => {
      log(`❌ Error VPN: ${err.message}`, printerKey.toUpperCase(), 'error');
    });
    
    socket.on('close', () => {
      log(`🔌 IoT VPN desconectado: ${clientInfo}`, printerKey.toUpperCase(), 'info');
    });
  });
  
  server.listen(config.port, config.host, () => {
    log(`🖨️ ${config.name} VPN escuchando en ${config.host}:${config.port}`, printerKey.toUpperCase(), 'success');
    config.status = 'online';
    io.emit('printerStatus', getSimulatorStatus());
  });
  
  server.on('error', (err) => {
    log(`❌ Error VPN: ${err.message}`, printerKey.toUpperCase(), 'error');
    config.status = 'error';
  });
  
  return server;
}

function getSimulatorStatus() {
  return Object.entries(SIMULATORS).map(([key, config]) => ({
    key, ...config
  }));
}

app.use(express.json());

app.get('/api/simulator/status', (req, res) => {
  res.json(getSimulatorStatus());
});

app.post('/api/simulator/clear-logs', (req, res) => {
  Object.keys(SIMULATORS).forEach(key => {
    SIMULATORS[key].logs = [];
    SIMULATORS[key].receivedCount = 0;
    SIMULATORS[key].lastReceived = null;
  });
  log('🧹 Logs VPN limpiados', 'SYSTEM', 'info');
  io.emit('printerStatus', getSimulatorStatus());
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.send(\`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Simulador VPN - ADISSEO IoT</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: white; }
        .header { text-align: center; padding: 20px; border-bottom: 2px solid #16213e; }
        .title { font-size: 2rem; color: #4CAF50; margin-bottom: 10px; }
        .subtitle { color: #81C784; }
        .config-info { background: #263238; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px solid #4CAF50; }
        .config-title { color: #4CAF50; font-weight: bold; margin-bottom: 10px; }
        .printer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin: 20px 0; }
        .printer-card { background: #37474F; padding: 20px; border-radius: 10px; border: 2px solid #4CAF50; }
        .printer-name { font-size: 1.2rem; font-weight: bold; color: #4CAF50; margin-bottom: 10px; }
        .counter { font-size: 2rem; color: #81C784; margin: 10px 0; text-align: center; }
        .status { padding: 5px 10px; border-radius: 5px; background: #4CAF50; color: white; font-size: 0.8rem; }
        .logs { background: #000; padding: 15px; border-radius: 8px; max-height: 400px; overflow-y: auto; margin-top: 20px; }
        .log-entry { padding: 8px; margin: 5px 0; font-family: monospace; font-size: 0.9rem; border-radius: 4px; }
        .log-entry.success { background: #1B5E20; border-left: 3px solid #4CAF50; }
        .log-entry.info { background: #0D47A1; border-left: 3px solid #2196F3; }
        .log-entry.error { background: #B71C1C; border-left: 3px solid #f44336; }
        .controls { margin: 15px 0; text-align: center; }
        .btn { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 0 5px; }
        .btn:hover { background: #45a049; }
        .highlight { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🌐 Simulador VPN IoT</div>
        <div class="subtitle">Recibiendo etiquetas desde IoT Real (192.168.214.50) via VPN (100.97.189.85)</div>
    </div>
    
    <div class="config-info">
        <div class="config-title">⚙️ CONFIGURACIÓN PARA MONITOR DEL IOT:</div>
        <div><strong>🖨️ Impresora Producto:</strong> <span class="highlight">100.97.189.85:9106</span></div>
        <div><strong>📡 Impresora RFID:</strong> <span class="highlight">100.97.189.85:9105</span></div>
        <div style="margin-top: 10px; color: #4CAF50;">
            <strong>🌐 Configurar en:</strong> http://192.168.214.50:3001/printer-monitor.html
        </div>
    </div>
    
    <div class="controls">
        <button class="btn" onclick="clearLogs()">🧹 Limpiar Logs</button>
        <button class="btn" onclick="location.reload()">🔄 Actualizar</button>
    </div>
    
    <div class="printer-grid" id="printersGrid"></div>
    
    <div class="logs">
        <h3>📋 Logs VPN en Tiempo Real</h3>
        <div id="logsContainer"></div>
    </div>

    <script>
        const socket = io();
        let printers = {};
        
        socket.on('printerStatus', (status) => {
            printers = {};
            status.forEach(printer => printers[printer.key] = printer);
            updatePrintersGrid();
        });
        
        socket.on('log', addLogEntry);
        
        socket.on('printerData', (data) => {
            addLogEntry({
                timestamp: data.timestamp,
                printer: data.printer.toUpperCase(),
                level: 'success',
                message: `📄 ${data.labelType} via VPN: ${data.size} bytes desde IoT`
            });
        });
        
        function updatePrintersGrid() {
            const grid = document.getElementById('printersGrid');
            grid.innerHTML = Object.entries(printers).map(([key, printer]) => `
                <div class="printer-card">
                    <div class="printer-name">${printer.name}</div>
                    <div><strong>Puerto:</strong> ${printer.port}</div>
                    <div><strong>Tipo:</strong> ${printer.type}</div>
                    <div><span class="status">${printer.status.toUpperCase()}</span></div>
                    <div class="counter">${printer.receivedCount}</div>
                    <div style="text-align: center;">Etiquetas via VPN</div>
                    <div style="font-size: 0.8rem; margin-top: 5px;">
                        <strong>Última:</strong> ${printer.lastReceived ? new Date(printer.lastReceived).toLocaleTimeString() : 'Ninguna'}
                    </div>
                </div>
            `).join('');
        }
        
        function addLogEntry(logEntry) {
            const container = document.getElementById('logsContainer');
            const logDiv = document.createElement('div');
            logDiv.className = `log-entry ${logEntry.level}`;
            logDiv.innerHTML = `
                <span>[${new Date(logEntry.timestamp).toLocaleTimeString()}]</span>
                <span>[${logEntry.printer}]</span>
                ${logEntry.message}
            `;
            container.insertBefore(logDiv, container.firstChild);
            while (container.children.length > 100) {
                container.removeChild(container.lastChild);
            }
        }
        
        function clearLogs() {
            if (confirm('¿Limpiar todos los logs?')) {
                fetch('/api/simulator/clear-logs', { method: 'POST' })
                    .then(() => document.getElementById('logsContainer').innerHTML = '');
            }
        }
        
        fetch('/api/simulator/status')
            .then(response => response.json())
            .then(status => {
                printers = {};
                status.forEach(printer => printers[printer.key] = printer);
                updatePrintersGrid();
            });
    </script>
</body>
</html>`);
});

function startSimulators() {
  log('🚀 Iniciando Simulador VPN para IoT Real', 'SYSTEM', 'success');
  log(`🌐 IP VPN: ${YOUR_VPN_IP}`, 'SYSTEM', 'info');
  log(`📡 Esperando desde ${IOT_REAL_IP}`, 'SYSTEM', 'info');
  
  Object.entries(SIMULATORS).forEach(([key, config]) => {
    const server = createPrinterSimulator(key, config);
    tcpServers.set(key, server);
  });
}

io.on('connection', (socket) => {
  log('🌐 Cliente web conectado', 'SYSTEM', 'info');
});

server.listen(WEB_PORT, () => {
  log(`🌐 Monitor VPN disponible en http://localhost:${WEB_PORT}`, 'SYSTEM', 'success');
  startSimulators();
});

process.on('SIGINT', () => {
  log('🔌 Cerrando simulador VPN...', 'SYSTEM', 'info');
  tcpServers.forEach((server) => server.close());
  server.close(() => {
    log('👋 Simulador VPN cerrado', 'SYSTEM', 'success');
    process.exit(0);
  });
});

const YOUR_VPN_IP = '100.97.189.85';
const IOT_REAL_IP = '192.168.214.50';
log('✅ Simulador VPN iniciado correctamente', 'SYSTEM', 'success');
