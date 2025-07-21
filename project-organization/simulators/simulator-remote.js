/**
 * Simulador Especial para Testing Remoto con IoT Real
 * Cliente: ADISSEO
 * Configuración: Puertos especiales para recibir del IoT remoto
 */

const net = require('net');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Configuración especial para IoT remoto
const WEB_PORT = 3002;
const SIMULATORS = {
  rfid_remote: {
    name: 'Impresora RFID (desde IoT Real)',
    port: 9105,
    host: '0.0.0.0',
    type: 'RFID_REMOTE',
    description: 'Recibe etiquetas RFID desde IoT real (192.168.214.50)',
    status: 'online',
    receivedCount: 0,
    lastReceived: null,
    logs: []
  },
  product_remote: {
    name: 'Impresora Producto (desde IoT Real)',
    port: 9106,
    host: '0.0.0.0',
    type: 'PRODUCT_REMOTE',
    description: 'Recibe etiquetas normales desde IoT real (192.168.214.50)',
    status: 'online',
    receivedCount: 0,
    lastReceived: null,
    logs: []
  }
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Almacenar servidores TCP activos
const tcpServers = new Map();

// Función para logging
function log(message, printer = 'SYSTEM', level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    printer,
    level,
    message
  };
  
  console.log(`[📡 REMOTO] [${timestamp}] [${printer}] ${message}`);
  
  // Emitir log a la interfaz web
  io.emit('log', logEntry);
  
  // Guardar en logs del simulador específico
  if (SIMULATORS[printer.toLowerCase()]) {
    SIMULATORS[printer.toLowerCase()].logs.unshift(logEntry);
    if (SIMULATORS[printer.toLowerCase()].logs.length > 50) {
      SIMULATORS[printer.toLowerCase()].logs = SIMULATORS[printer.toLowerCase()].logs.slice(0, 50);
    }
  }
}

// Función para crear servidor TCP
function createPrinterSimulator(printerKey, config) {
  const server = net.createServer((socket) => {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    log(`🏭 CONEXIÓN DESDE IOT REAL: ${clientInfo}`, printerKey.toUpperCase(), 'success');
    
    socket.on('data', (data) => {
      const zplData = data.toString();
      const timestamp = new Date().toISOString();
      
      // Actualizar estadísticas
      config.receivedCount++;
      config.lastReceived = timestamp;
      
      // Detectar tipo de etiqueta
      let labelType = 'Normal';
      if (zplData.includes('^RFW') || zplData.includes('RFID')) {
        labelType = 'RFID';
      }
      
      log(`📄 ETIQUETA ${labelType} RECIBIDA DEL IOT REAL (${zplData.length} bytes)`, printerKey.toUpperCase(), 'success');
      
      // ⭐ INFORMACIÓN CRÍTICA: Mostrar datos específicos
      if (labelType === 'RFID') {
        // Extraer información RFID específica
        const rfidMatch = zplData.match(/\^RFW,H\^FD(.+?)\^FS/);
        const gs1Match = zplData.match(/\^FD(\d{20})\^FS/);
        
        if (rfidMatch) {
          log(`🔗 DATOS RFID: ${rfidMatch[1]}`, printerKey.toUpperCase(), 'info');
        }
        if (gs1Match) {
          log(`🏷️ GS1 CODE: ${gs1Match[1]}`, printerKey.toUpperCase(), 'info');
        }
      }
      
      // Crear entrada de datos recibidos
      const receivedData = {
        id: `${printerKey}-${Date.now()}`,
        timestamp,
        clientInfo,
        labelType,
        size: zplData.length,
        content: zplData,
        printer: printerKey,
        source: 'IoT_Real_${IOT_REAL_IP}'
      };
      
      // Emitir datos recibidos a la interfaz web
      io.emit('printerData', receivedData);
      io.emit('printerStatus', getSimulatorStatus());
      
      // Responder al IoT
      socket.write('OK\n');
      
      log(`✅ RESPUESTA ENVIADA AL IOT REAL`, printerKey.toUpperCase(), 'info');
    });
    
    socket.on('error', (err) => {
      log(`❌ Error en conexión desde IoT: ${err.message}`, printerKey.toUpperCase(), 'error');
    });
    
    socket.on('close', () => {
      log(`🔌 IoT Real desconectado desde ${clientInfo}`, printerKey.toUpperCase(), 'info');
    });
  });
  
  server.listen(config.port, config.host, () => {
    log(`🖨️ ${config.name} escuchando en ${config.host}:${config.port} para IoT Real`, printerKey.toUpperCase(), 'success');
    config.status = 'online';
    io.emit('printerStatus', getSimulatorStatus());
  });
  
  server.on('error', (err) => {
    log(`❌ Error al iniciar ${config.name}: ${err.message}`, printerKey.toUpperCase(), 'error');
    config.status = 'error';
    io.emit('printerStatus', getSimulatorStatus());
  });
  
  return server;
}

// Función para obtener estado
function getSimulatorStatus() {
  return Object.entries(SIMULATORS).map(([key, config]) => ({
    key,
    name: config.name,
    port: config.port,
    host: config.host,
    type: config.type,
    description: config.description,
    status: config.status,
    receivedCount: config.receivedCount,
    lastReceived: config.lastReceived
  }));
}

// APIs
app.use(express.json());

app.get('/api/simulator/status', (req, res) => {
  res.json(getSimulatorStatus());
});

app.get('/api/simulator/:printer/logs', (req, res) => {
  const printer = req.params.printer.toLowerCase();
  if (SIMULATORS[printer]) {
    res.json(SIMULATORS[printer].logs);
  } else {
    res.status(404).json({ error: 'Simulador no encontrado' });
  }
});

// Página principal
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Simulador Remoto - ADISSEO IoT</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: white; }
        .header { text-align: center; padding: 20px; border-bottom: 2px solid #16213e; }
        .title { font-size: 2rem; color: #0f3460; margin-bottom: 10px; }
        .subtitle { color: #0f3460; }
        .config-info { background: #16213e; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .config-title { color: #e94560; font-weight: bold; margin-bottom: 10px; }
        .printer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .printer-card { background: #0f3460; padding: 20px; border-radius: 10px; border: 2px solid #16213e; }
        .printer-name { font-size: 1.2rem; font-weight: bold; color: #e94560; margin-bottom: 10px; }
        .counter { font-size: 2rem; color: #0f3460; margin: 10px 0; }
        .logs { background: #000; padding: 15px; border-radius: 8px; max-height: 400px; overflow-y: auto; margin-top: 20px; }
        .log-entry { padding: 5px; margin: 5px 0; font-family: monospace; font-size: 0.9rem; }
        .log-entry.success { border-left: 3px solid #4CAF50; }
        .log-entry.info { border-left: 3px solid #2196F3; }
        .log-entry.error { border-left: 3px solid #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">📡 Simulador Remoto IoT</div>
        <div class="subtitle">Recibiendo etiquetas desde IoT Real (192.168.214.50)</div>
    </div>
    
    <div class="config-info">
        <div class="config-title">⚙️ Configuración para Monitor de Impresoras del IoT:</div>
        <div><strong>🖨️ Impresora Producto:</strong> 172.20.10.13:9106</div>
        <div><strong>📡 Impresora RFID:</strong> 172.20.10.13:9105</div>
        <div style="margin-top: 10px; color: #e94560;">
            <strong>🌐 Configurar en:</strong> http://192.168.214.50:3001/printer-monitor.html
        </div>
    </div>
    
    <div class="printer-grid" id="printersGrid"></div>
    
    <div class="logs">
        <h3>📋 Logs en Tiempo Real</h3>
        <div id="logsContainer"></div>
    </div>

    <script>
        const socket = io();
        let printers = {};
        
        socket.on('printerStatus', (status) => {
            printers = {};
            status.forEach(printer => {
                printers[printer.key] = printer;
            });
            updatePrintersGrid();
        });
        
        socket.on('log', (logEntry) => {
            addLogEntry(logEntry);
        });
        
        socket.on('printerData', (data) => {
            addLogEntry({
                timestamp: data.timestamp,
                printer: data.printer.toUpperCase(),
                level: 'success',
                message: `📄 ${data.labelType} recibida del IoT Real: ${data.size} bytes`
            });
        });
        
        function updatePrintersGrid() {
            const grid = document.getElementById('printersGrid');
            grid.innerHTML = Object.entries(printers).map(([key, printer]) => `
                <div class="printer-card">
                    <div class="printer-name">${printer.name}</div>
                    <div><strong>Puerto:</strong> ${printer.port}</div>
                    <div><strong>Tipo:</strong> ${printer.type}</div>
                    <div><strong>Estado:</strong> ${printer.status}</div>
                    <div class="counter">${printer.receivedCount}</div>
                    <div>Etiquetas del IoT Real</div>
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
        
        fetch('/api/simulator/status')
            .then(response => response.json())
            .then(status => {
                printers = {};
                status.forEach(printer => {
                    printers[printer.key] = printer;
                });
                updatePrintersGrid();
            });
    </script>
</body>
</html>
  `);
});

// Inicializar simuladores
function startSimulators() {
  log('🚀 Iniciando Simulador Remoto para IoT Real', 'SYSTEM', 'success');
  log(`📡 Esperando conexiones desde ${IOT_REAL_IP}`, 'SYSTEM', 'info');
  
  Object.entries(SIMULATORS).forEach(([key, config]) => {
    const server = createPrinterSimulator(key, config);
    tcpServers.set(key, server);
  });
}

// Socket.io
io.on('connection', (socket) => {
  log('🌐 Cliente web conectado al simulador remoto', 'SYSTEM', 'info');
});

// Iniciar servidor web
server.listen(WEB_PORT, () => {
  log(`🌐 Simulador remoto disponible en http://localhost:${WEB_PORT}`, 'SYSTEM', 'success');
  startSimulators();
});

// Manejo de errores
process.on('SIGINT', () => {
  log('🔌 Cerrando simulador remoto...', 'SYSTEM', 'info');
  tcpServers.forEach((server) => server.close());
  server.close(() => {
    log('👋 Simulador remoto cerrado correctamente', 'SYSTEM', 'success');
    process.exit(0);
  });
});

const IOT_REAL_IP = '192.168.214.50';
log('✅ Simulador Remoto iniciado correctamente', 'SYSTEM', 'success');
