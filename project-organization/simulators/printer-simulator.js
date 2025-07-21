/**
 * Simulador de Impresoras Online
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Sistema: Simulador para testing de configuración de impresoras
 */

const net = require('net');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// Configuración del simulador
const WEB_PORT = 3002; // Puerto diferente para no interferir
const SIMULATORS = {
  product: {
    name: 'Impresora Producto (Bidón)',
    port: 9103,  // Cambiado para evitar conflicto con sistema principal
    host: '0.0.0.0', // Escucha en todas las interfaces
    type: 'Normal',
    description: 'Simula impresora principal para etiquetas de bidón',
    status: 'online',
    receivedCount: 0,
    lastReceived: null,
    logs: []
  },
  rfid: {
    name: 'Impresora RFID (IBC)',
    port: 9104, // Cambiado para evitar conflicto
    host: '0.0.0.0',
    type: 'RFID', 
    description: 'Simula impresora RFID para etiquetas IBC',
    status: 'online',
    receivedCount: 0,
    lastReceived: null,
    logs: []
  },
  test1: {
    name: 'Impresora Test 1',
    port: 9101,
    host: '0.0.0.0',
    type: 'Test',
    description: 'Impresora de prueba 1',
    status: 'online', 
    receivedCount: 0,
    lastReceived: null,
    logs: []
  },
  test2: {
    name: 'Impresora Test 2',
    port: 9102,
    host: '0.0.0.0',
    type: 'Test',
    description: 'Impresora de prueba 2',
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

// Función para logging con timestamp
function log(message, printer = 'SYSTEM', level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    printer,
    level,
    message
  };
  
  console.log(`[${timestamp}] [${printer}] ${message}`);
  
  // Emitir log a la interfaz web
  io.emit('log', logEntry);
  
  // Guardar en logs del simulador específico
  if (SIMULATORS[printer.toLowerCase()]) {
    SIMULATORS[printer.toLowerCase()].logs.unshift(logEntry);
    // Mantener solo últimos 50 logs por impresora
    if (SIMULATORS[printer.toLowerCase()].logs.length > 50) {
      SIMULATORS[printer.toLowerCase()].logs = SIMULATORS[printer.toLowerCase()].logs.slice(0, 50);
    }
  }
}

// Función para crear servidor TCP para una impresora simulada
function createPrinterSimulator(printerKey, config) {
  const server = net.createServer((socket) => {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    log(`📱 Nueva conexión desde ${clientInfo}`, printerKey.toUpperCase(), 'success');
    
    socket.on('data', (data) => {
      const zplData = data.toString();
      const timestamp = new Date().toISOString();
      
      // Actualizar estadísticas
      config.receivedCount++;
      config.lastReceived = timestamp;
      
      // Detectar tipo de etiqueta por contenido
      let labelType = 'Normal';
      if (zplData.includes('^RFW') || zplData.includes('RFID') || zplData.length < 400) {
        labelType = 'RFID';
      }
      
      log(`📄 Etiqueta ${labelType} recibida (${zplData.length} bytes)`, printerKey.toUpperCase(), 'success');
      
      // Crear entrada de datos recibidos
      const receivedData = {
        id: `${printerKey}-${Date.now()}`,
        timestamp,
        clientInfo,
        labelType,
        size: zplData.length,
        content: zplData,
        printer: printerKey
      };
      
      // Emitir datos recibidos a la interfaz web
      io.emit('printerData', receivedData);
      io.emit('printerStatus', getSimulatorStatus());
      
      // Simular respuesta de impresora (opcional)
      socket.write('OK\n');
      
      log(`✅ Datos procesados y respuesta enviada`, printerKey.toUpperCase(), 'info');
    });
    
    socket.on('error', (err) => {
      log(`❌ Error en conexión: ${err.message}`, printerKey.toUpperCase(), 'error');
    });
    
    socket.on('close', () => {
      log(`🔌 Conexión cerrada desde ${clientInfo}`, printerKey.toUpperCase(), 'info');
    });
  });
  
  server.listen(config.port, config.host, () => {
    log(`🖨️ ${config.name} simulada escuchando en ${config.host}:${config.port}`, printerKey.toUpperCase(), 'success');
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

// Función para obtener estado de todos los simuladores
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

// Middlewares
app.use(express.json());
// NOTA: NO servir archivos estáticos para evitar conflictos con el sistema principal

// API para obtener estado de simuladores
app.get('/api/simulator/status', (req, res) => {
  res.json(getSimulatorStatus());
});

// API para obtener logs de un simulador específico
app.get('/api/simulator/:printer/logs', (req, res) => {
  const printer = req.params.printer.toLowerCase();
  if (SIMULATORS[printer]) {
    res.json(SIMULATORS[printer].logs);
  } else {
    res.status(404).json({ error: 'Simulador no encontrado' });
  }
});

// API para limpiar logs
app.post('/api/simulator/clear-logs', (req, res) => {
  Object.keys(SIMULATORS).forEach(key => {
    SIMULATORS[key].logs = [];
    SIMULATORS[key].receivedCount = 0;
    SIMULATORS[key].lastReceived = null;
  });
  
  log('🧹 Logs limpiados por usuario', 'SYSTEM', 'info');
  io.emit('printerStatus', getSimulatorStatus());
  res.json({ success: true, message: 'Logs limpiados correctamente' });
});

// API para reiniciar un simulador específico
app.post('/api/simulator/:printer/restart', (req, res) => {
  const printer = req.params.printer.toLowerCase();
  if (!SIMULATORS[printer]) {
    return res.status(404).json({ error: 'Simulador no encontrado' });
  }
  
  // Cerrar servidor existente
  if (tcpServers.has(printer)) {
    tcpServers.get(printer).close();
    tcpServers.delete(printer);
  }
  
  // Reiniciar después de un breve delay
  setTimeout(() => {
    const server = createPrinterSimulator(printer, SIMULATORS[printer]);
    tcpServers.set(printer, server);
    log(`🔄 Simulador ${SIMULATORS[printer].name} reiniciado`, printer.toUpperCase(), 'success');
  }, 1000);
  
  res.json({ success: true, message: `Simulador ${printer} reiniciando...` });
});

// Servir página principal del simulador
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulador de Impresoras - ADISSEO IoT</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            min-height: 100vh;
            padding: 1rem;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            text-align: center;
            padding: 2rem 0;
            border-bottom: 2px solid rgba(255,255,255,0.2);
            margin-bottom: 2rem;
        }
        .title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            background: linear-gradient(45deg, #FFD700, #FFA500);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle { font-size: 1.2rem; opacity: 0.9; }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .printer-card {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
        }
        .printer-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .printer-name {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4CAF50;
            animation: pulse 2s infinite;
        }
        .status-dot.error { background: #f44336; }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .printer-info {
            font-size: 0.9rem;
            line-height: 1.6;
            opacity: 0.9;
        }
        .counter {
            font-size: 2rem;
            font-weight: bold;
            color: #FFD700;
            margin: 0.5rem 0;
        }
        
        .logs-section {
            background: rgba(0,0,0,0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
        }
        .logs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .logs-title {
            font-size: 1.3rem;
            font-weight: bold;
        }
        .controls {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .btn.danger {
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
        }
        
        .logs-container {
            max-height: 400px;
            overflow-y: auto;
            background: rgba(0,0,0,0.5);
            border-radius: 8px;
            padding: 1rem;
        }
        .log-entry {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            border-left: 3px solid #4CAF50;
            background: rgba(255,255,255,0.05);
        }
        .log-entry.error { border-left-color: #f44336; }
        .log-entry.warn { border-left-color: #ff9800; }
        .log-timestamp {
            color: #888;
            margin-right: 0.5rem;
        }
        .log-printer {
            color: #FFD700;
            font-weight: bold;
            margin-right: 0.5rem;
        }
        
        .connection-info {
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 2rem;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .connection-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #FFD700;
        }
        .ip-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 0.5rem;
            font-family: 'Courier New', monospace;
        }
        
        @media (max-width: 768px) {
            .title { font-size: 2rem; }
            .stats-grid { grid-template-columns: 1fr; }
            .controls { justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🖨️ Simulador de Impresoras</div>
            <div class="subtitle">ADISSEO IoT System - Desarrollado por Automática Integral</div>
        </div>
        
        <div class="connection-info">
            <div class="connection-title">📡 Direcciones para Configurar en Monitor Principal:</div>
                         <div class="ip-list">
                 <div>🏷️ Producto: localhost:9103</div>
                 <div>📡 RFID: localhost:9104</div>
                 <div>🧪 Test 1: localhost:9101</div>
                 <div>🧪 Test 2: localhost:9102</div>
             </div>
        </div>
        
        <div class="stats-grid" id="printersGrid">
            <!-- Tarjetas de impresoras se cargan aquí -->
        </div>
        
        <div class="logs-section">
            <div class="logs-header">
                <div class="logs-title">📋 Logs en Tiempo Real</div>
                <div class="controls">
                    <button class="btn" onclick="clearLogs()">🧹 Limpiar Logs</button>
                    <button class="btn" onclick="toggleAutoScroll()">📜 Auto-scroll: <span id="autoScrollStatus">ON</span></button>
                </div>
            </div>
            <div class="logs-container" id="logsContainer">
                <!-- Logs aparecen aquí -->
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let autoScroll = true;
        let printers = {};
        
        // Actualizar estado de impresoras
        socket.on('printerStatus', (status) => {
            printers = {};
            status.forEach(printer => {
                printers[printer.key] = printer;
            });
            updatePrintersGrid();
        });
        
        // Recibir logs en tiempo real
        socket.on('log', (logEntry) => {
            addLogEntry(logEntry);
        });
        
        // Recibir datos de impresora
        socket.on('printerData', (data) => {
            addLogEntry({
                timestamp: data.timestamp,
                printer: data.printer.toUpperCase(),
                level: 'success',
                message: \`📄 Etiqueta \${data.labelType} recibida: \${data.size} bytes desde \${data.clientInfo}\`
            });
        });
        
        function updatePrintersGrid() {
            const grid = document.getElementById('printersGrid');
            grid.innerHTML = Object.entries(printers).map(([key, printer]) => \`
                <div class="printer-card">
                    <div class="printer-name">
                        <div class="status-dot \${printer.status === 'error' ? 'error' : ''}"></div>
                        \${printer.name}
                    </div>
                    <div class="printer-info">
                        <div><strong>Puerto:</strong> \${printer.port}</div>
                        <div><strong>Tipo:</strong> \${printer.type}</div>
                        <div><strong>Estado:</strong> \${printer.status}</div>
                        <div><strong>Descripción:</strong> \${printer.description}</div>
                    </div>
                    <div class="counter">\${printer.receivedCount}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">
                        Etiquetas recibidas
                    </div>
                    <div style="font-size: 0.8rem; margin-top: 0.5rem;">
                        <strong>Última:</strong> \${printer.lastReceived ? new Date(printer.lastReceived).toLocaleTimeString() : 'Ninguna'}
                    </div>
                </div>
            \`).join('');
        }
        
        function addLogEntry(logEntry) {
            const container = document.getElementById('logsContainer');
            const logDiv = document.createElement('div');
            logDiv.className = \`log-entry \${logEntry.level}\`;
            
            const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
            logDiv.innerHTML = \`
                <span class="log-timestamp">[\${timestamp}]</span>
                <span class="log-printer">[\${logEntry.printer}]</span>
                \${logEntry.message}
            \`;
            
            container.insertBefore(logDiv, container.firstChild);
            
            // Mantener solo últimos 100 logs
            while (container.children.length > 100) {
                container.removeChild(container.lastChild);
            }
            
            if (autoScroll) {
                container.scrollTop = 0;
            }
        }
        
        function clearLogs() {
            if (confirm('¿Limpiar todos los logs?')) {
                fetch('/api/simulator/clear-logs', { method: 'POST' })
                    .then(() => {
                        document.getElementById('logsContainer').innerHTML = '';
                    });
            }
        }
        
        function toggleAutoScroll() {
            autoScroll = !autoScroll;
            document.getElementById('autoScrollStatus').textContent = autoScroll ? 'ON' : 'OFF';
        }
        
        // Cargar estado inicial
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

// Socket.io para tiempo real
io.on('connection', (socket) => {
  log('🌐 Cliente web conectado al simulador', 'SYSTEM', 'info');
  
  socket.on('disconnect', () => {
    log('🌐 Cliente web desconectado del simulador', 'SYSTEM', 'info');
  });
});

// Inicializar simuladores
function startSimulators() {
  log('🚀 Iniciando Simulador de Impresoras ADISSEO', 'SYSTEM', 'success');
  log('⚙️ Desarrollado por Automática Integral', 'SYSTEM', 'info');
  
  Object.entries(SIMULATORS).forEach(([key, config]) => {
    const server = createPrinterSimulator(key, config);
    tcpServers.set(key, server);
  });
}

// Iniciar servidor web
server.listen(WEB_PORT, () => {
  log(`🌐 Interfaz web del simulador disponible en http://localhost:${WEB_PORT}`, 'SYSTEM', 'success');
  log('📋 Usar esta URL para monitorear las impresoras simuladas', 'SYSTEM', 'info');
  startSimulators();
});

// Manejo de errores
process.on('uncaughtException', (err) => {
  log(`❌ Error no manejado: ${err.message}`, 'SYSTEM', 'error');
});

process.on('SIGINT', () => {
  log('🔌 Cerrando simulador de impresoras...', 'SYSTEM', 'info');
  
  // Cerrar todos los servidores TCP
  tcpServers.forEach((server, key) => {
    server.close();
    log(`🔌 Simulador ${key} cerrado`, 'SYSTEM', 'info');
  });
  
  // Cerrar servidor web
  server.close(() => {
    log('👋 Simulador de impresoras cerrado correctamente', 'SYSTEM', 'success');
    process.exit(0);
  });
});

log('✅ Simulador de Impresoras iniciado correctamente', 'SYSTEM', 'success'); 