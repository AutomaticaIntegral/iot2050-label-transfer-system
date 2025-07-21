/**
 * Simulador VPN Mejorado - ADISSEO IoT
 * Cliente: ADISSEO  
 * IP VPN: 100.97.189.85
 * Funcionalidad: Muestra contenido ZPL completo
 */

const net = require('net');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Configuración
const VPN_IP = '100.97.189.85';
const IOT_IP = '192.168.214.50';
const WEB_PORT = 3002;

const SIMULATORS = {
  rfid_vpn: {
    name: 'RFID VPN (desde IoT Real)',
    port: 9105,
    host: '0.0.0.0',
    type: 'RFID_VPN',
    receivedCount: 0,
    lastReceived: null,
    logs: [],
    lastZplContent: null
  },
  product_vpn: {
    name: 'Producto VPN (desde IoT Real)',
    port: 9106,
    host: '0.0.0.0',
    type: 'PRODUCT_VPN',
    receivedCount: 0,
    lastReceived: null,
    logs: [],
    lastZplContent: null
  }
};

// Almacenar todas las etiquetas recibidas
const receivedLabels = [];

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
      config.lastZplContent = zplData; // Guardar último ZPL
      
      let labelType = 'Normal';
      if (zplData.includes('^RFW') || zplData.includes('RFID')) {
        labelType = 'RFID';
      }
      
      log(`📄 ETIQUETA ${labelType} VÍA VPN (${zplData.length} bytes)`, printerKey.toUpperCase(), 'success');
      
      // Extraer información detallada
      const labelInfo = {
        rfidData: null,
        gs1Code: null,
        counter: null,
        barcode: null,
        lotNumber: null,
        productCode: null
      };
      
      if (labelType === 'RFID') {
        const rfidMatch = zplData.match(/\^RFW,H\^FD(.+?)\^FS/);
        const gs1Match = zplData.match(/\^FD(\d{20})\^FS/) || zplData.match(/\^FD\(01\)(.+?)\^FS/);
        const counterMatch = zplData.match(/\(21\)(\d+)/);
        const barcodeMatch = zplData.match(/\^FD(\d{13,20})\^FS/);
        const lotMatch = zplData.match(/\^FD([A-Z0-9]{8,12})\^FS/);
        
        if (rfidMatch) {
          labelInfo.rfidData = rfidMatch[1];
          log(`🔗 DATOS RFID: ${rfidMatch[1]}`, printerKey.toUpperCase(), 'info');
        }
        if (gs1Match) {
          labelInfo.gs1Code = gs1Match[1];
          log(`🏷️ GS1 CODE: ${gs1Match[1]}`, printerKey.toUpperCase(), 'info');
        }
        if (counterMatch) {
          labelInfo.counter = counterMatch[1];
          log(`🔢 CONTADOR: ${counterMatch[1]}`, printerKey.toUpperCase(), 'info');
        }
        if (barcodeMatch) {
          labelInfo.barcode = barcodeMatch[1];
        }
        if (lotMatch) {
          labelInfo.lotNumber = lotMatch[1];
        }
      }
      
      // Mostrar contenido ZPL completo en consola
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 CONTENIDO ZPL COMPLETO (${labelType}) - ${timestamp}`);
      console.log(`🔗 Cliente: ${clientInfo}`);
      console.log(`${'='.repeat(80)}`);
      console.log(zplData);
      console.log(`${'='.repeat(80)}\n`);
      
      const receivedData = {
        id: `${printerKey}-${Date.now()}`,
        timestamp,
        clientInfo,
        labelType,
        size: zplData.length,
        content: zplData,
        printer: printerKey,
        printerName: config.name,
        labelInfo: labelInfo
      };
      
      // Guardar en histórico
      receivedLabels.unshift(receivedData);
      if (receivedLabels.length > 100) {
        receivedLabels.pop();
      }
      
      io.emit('printerData', receivedData);
      io.emit('printerStatus', getSimulatorStatus());
      io.emit('newLabel', receivedData); // Evento específico para nueva etiqueta
      
      socket.write('OK\n');
      log(`✅ RESPUESTA ENVIADA AL IOT`, printerKey.toUpperCase(), 'info');
    });
    
    socket.on('error', (err) => {
      log(`❌ Error VPN: ${err.message}`, printerKey.toUpperCase(), 'error');
    });
    
    socket.on('close', () => {
      log(`🔌 IoT desconectado: ${clientInfo}`, printerKey.toUpperCase(), 'info');
    });
  });
  
  server.listen(config.port, config.host, () => {
    log(`🖨️ ${config.name} escuchando en ${config.host}:${config.port}`, printerKey.toUpperCase(), 'success');
    io.emit('printerStatus', getSimulatorStatus());
  });
  
  server.on('error', (err) => {
    log(`❌ Error: ${err.message}`, printerKey.toUpperCase(), 'error');
  });
  
  return server;
}

function getSimulatorStatus() {
  return Object.entries(SIMULATORS).map(([key, config]) => ({
    key, ...config
  }));
}

// APIs
app.use(express.json());

app.get('/api/simulator/status', (req, res) => {
  res.json(getSimulatorStatus());
});

app.get('/api/simulator/labels', (req, res) => {
  res.json(receivedLabels);
});

app.get('/api/simulator/labels/:id', (req, res) => {
  const label = receivedLabels.find(l => l.id === req.params.id);
  if (label) {
    res.json(label);
  } else {
    res.status(404).json({ error: 'Etiqueta no encontrada' });
  }
});

app.post('/api/simulator/clear-logs', (req, res) => {
  Object.keys(SIMULATORS).forEach(key => {
    SIMULATORS[key].logs = [];
    SIMULATORS[key].receivedCount = 0;
    SIMULATORS[key].lastReceived = null;
    SIMULATORS[key].lastZplContent = null;
  });
  receivedLabels.length = 0;
  log('🧹 Logs y etiquetas limpiados', 'SYSTEM', 'info');
  io.emit('printerStatus', getSimulatorStatus());
  io.emit('labelsCleared');
  res.json({ success: true });
});

// Página web mejorada
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Simulador VPN Mejorado - ADISSEO IoT</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #0d1421; color: white; }
        .header { text-align: center; padding: 20px; border-bottom: 2px solid #4CAF50; background: #1a1a2e; }
        .title { font-size: 2.2rem; color: #4CAF50; margin-bottom: 10px; font-weight: bold; }
        .subtitle { color: #81C784; font-size: 1.1rem; }
        
        .container { display: flex; height: calc(100vh - 120px); }
        .left-panel { flex: 1; padding: 20px; border-right: 2px solid #4CAF50; overflow-y: auto; }
        .right-panel { flex: 1; padding: 20px; overflow-y: auto; }
        
        .config-info { background: #263238; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #4CAF50; }
        .highlight { color: #4CAF50; font-weight: bold; }
        
        .printer-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 20px; }
        .printer-card { background: #37474F; padding: 15px; border-radius: 10px; border: 2px solid #4CAF50; }
        .printer-name { font-size: 1.1rem; font-weight: bold; color: #4CAF50; margin-bottom: 8px; }
        .counter { font-size: 1.8rem; color: #81C784; margin: 8px 0; text-align: center; }
        
        .zpl-section { background: #1a1a2e; border-radius: 8px; padding: 15px; }
        .zpl-header { color: #4CAF50; font-weight: bold; margin-bottom: 15px; font-size: 1.3rem; }
        .zpl-tabs { display: flex; margin-bottom: 15px; }
        .zpl-tab { background: #37474F; color: white; border: none; padding: 8px 15px; cursor: pointer; margin-right: 5px; border-radius: 5px; }
        .zpl-tab.active { background: #4CAF50; }
        .zpl-content { background: #000; padding: 15px; border-radius: 5px; border: 1px solid #4CAF50; }
        .zpl-raw { font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; color: #00ff00; max-height: 400px; overflow-y: auto; }
        .zpl-info { background: #263238; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
        .zpl-info-item { margin: 5px 0; }
        
        .labels-history { margin-top: 20px; }
        .label-item { background: #37474F; padding: 10px; margin: 5px 0; border-radius: 5px; cursor: pointer; border: 1px solid #666; }
        .label-item:hover { border-color: #4CAF50; }
        .label-item.selected { border-color: #4CAF50; background: #2d5a2d; }
        
        .btn { background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #45a049; }
        .btn-copy { background: #2196F3; }
        .btn-download { background: #FF9800; }
        
        .logs { background: #000; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; margin-top: 20px; }
        .log-entry { padding: 6px; margin: 3px 0; font-family: monospace; font-size: 0.85rem; border-radius: 3px; }
        .log-entry.success { background: #1B5E20; border-left: 3px solid #4CAF50; }
        .log-entry.info { background: #0D47A1; border-left: 3px solid #2196F3; }
        .log-entry.error { background: #B71C1C; border-left: 3px solid #f44336; }
        
        .status-indicator { width: 12px; height: 12px; border-radius: 50%; background: #4CAF50; display: inline-block; margin-right: 8px; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        
        .no-labels { text-align: center; color: #666; padding: 40px; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🌐 Simulador VPN Mejorado - ADISSEO</div>
        <div class="subtitle">Recibiendo desde IoT Real (${IOT_IP}) via VPN (${VPN_IP})</div>
    </div>
    
    <div class="container">
        <div class="left-panel">
            <div class="config-info">
                <div style="color: #4CAF50; font-weight: bold; margin-bottom: 10px;">⚙️ CONFIGURACIÓN PARA IOT:</div>
                <div><strong>🖨️ Impresora Producto:</strong> <span class="highlight">${VPN_IP}:9106</span></div>
                <div><strong>📡 Impresora RFID:</strong> <span class="highlight">${VPN_IP}:9105</span></div>
                <div style="margin-top: 10px;">
                    <strong>🌐 Configurar en:</strong> http://${IOT_IP}:3001/printer-monitor.html
                </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <button class="btn" onclick="clearAll()">🧹 Limpiar Todo</button>
                <button class="btn" onclick="location.reload()">🔄 Actualizar</button>
            </div>
            
            <div class="printer-grid" id="printersGrid"></div>
            
            <div class="labels-history">
                <h3 style="color: #4CAF50; margin-bottom: 15px;">📋 Historial de Etiquetas</h3>
                <div id="labelsHistory"></div>
            </div>
            
            <div class="logs">
                <h3 style="color: #4CAF50; margin-bottom: 10px;">📋 Logs en Tiempo Real</h3>
                <div id="logsContainer"></div>
            </div>
        </div>
        
        <div class="right-panel">
            <div class="zpl-section">
                <div class="zpl-header">📄 Contenido ZPL Completo</div>
                
                <div class="zpl-tabs">
                    <button class="zpl-tab active" onclick="showTab('info')">📊 Información</button>
                    <button class="zpl-tab" onclick="showTab('raw')">📋 ZPL Raw</button>
                </div>
                
                <div id="zpl-info-tab" class="zpl-tab-content">
                    <div id="labelInfo" class="no-labels">Selecciona una etiqueta para ver su información</div>
                </div>
                
                <div id="zpl-raw-tab" class="zpl-tab-content" style="display: none;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <button class="btn btn-copy" onclick="copyZpl()">📋 Copiar ZPL</button>
                        <button class="btn btn-download" onclick="downloadZpl()">💾 Descargar ZPL</button>
                    </div>
                    <div class="zpl-content">
                        <div id="zplRaw" class="zpl-raw">Selecciona una etiqueta para ver su contenido ZPL completo</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let printers = {};
        let labels = [];
        let selectedLabel = null;
        
        socket.on('printerStatus', (status) => {
            printers = {};
            status.forEach(printer => printers[printer.key] = printer);
            updatePrintersGrid();
        });
        
        socket.on('log', addLogEntry);
        socket.on('newLabel', handleNewLabel);
        socket.on('labelsCleared', () => {
            labels = [];
            updateLabelsHistory();
            clearZplDisplay();
        });
        
        function handleNewLabel(label) {
            labels.unshift(label);
            if (labels.length > 100) labels.pop();
            updateLabelsHistory();
            
            // Auto-seleccionar la nueva etiqueta
            selectLabel(label);
            
            addLogEntry({
                timestamp: label.timestamp,
                printer: label.printer.toUpperCase(),
                level: 'success',
                message: 'Etiqueta ' + label.labelType + ' recibida: ' + label.size + ' bytes'
            });
        }
        
        function updatePrintersGrid() {
            const grid = document.getElementById('printersGrid');
            grid.innerHTML = Object.entries(printers).map(([key, printer]) => 
                '<div class="printer-card">' +
                    '<div class="printer-name"><span class="status-indicator"></span>' + printer.name + '</div>' +
                    '<div><strong>Puerto:</strong> ' + printer.port + '</div>' +
                    '<div><strong>Tipo:</strong> ' + printer.type + '</div>' +
                    '<div class="counter">' + printer.receivedCount + '</div>' +
                    '<div style="text-align: center;">Etiquetas recibidas</div>' +
                    '<div style="font-size: 0.8rem; margin-top: 5px; text-align: center;">' +
                        '<strong>Última:</strong> ' + (printer.lastReceived ? new Date(printer.lastReceived).toLocaleTimeString() : 'Ninguna') +
                    '</div>' +
                '</div>'
            ).join('');
        }
        
        function updateLabelsHistory() {
            const container = document.getElementById('labelsHistory');
            if (labels.length === 0) {
                container.innerHTML = '<div class="no-labels">No hay etiquetas recibidas aún</div>';
                return;
            }
            
            container.innerHTML = labels.map(label => 
                '<div class="label-item ' + (selectedLabel && selectedLabel.id === label.id ? 'selected' : '') + '" onclick="selectLabel(' + JSON.stringify(label).replace(/"/g, '&quot;') + ')">' +
                    '<div><strong>' + label.labelType + '</strong> - ' + new Date(label.timestamp).toLocaleTimeString() + '</div>' +
                    '<div style="font-size: 0.9rem; color: #ccc;">' + label.printerName + ' (' + label.size + ' bytes)</div>' +
                '</div>'
            ).join('');
        }
        
        function selectLabel(label) {
            selectedLabel = label;
            updateLabelsHistory();
            updateZplDisplay();
        }
        
        function updateZplDisplay() {
            if (!selectedLabel) return;
            
            // Actualizar información
            const infoDiv = document.getElementById('labelInfo');
            let infoHtml = '<div class="zpl-info">';
            infoHtml += '<div class="zpl-info-item"><strong>🏷️ Tipo:</strong> ' + selectedLabel.labelType + '</div>';
            infoHtml += '<div class="zpl-info-item"><strong>⏰ Timestamp:</strong> ' + new Date(selectedLabel.timestamp).toLocaleString() + '</div>';
            infoHtml += '<div class="zpl-info-item"><strong>📐 Tamaño:</strong> ' + selectedLabel.size + ' bytes</div>';
            infoHtml += '<div class="zpl-info-item"><strong>🖨️ Impresora:</strong> ' + selectedLabel.printerName + '</div>';
            infoHtml += '<div class="zpl-info-item"><strong>🔗 Cliente:</strong> ' + selectedLabel.clientInfo + '</div>';
            
            if (selectedLabel.labelInfo) {
                const info = selectedLabel.labelInfo;
                if (info.rfidData) infoHtml += '<div class="zpl-info-item"><strong>📡 RFID:</strong> ' + info.rfidData + '</div>';
                if (info.gs1Code) infoHtml += '<div class="zpl-info-item"><strong>🏷️ GS1:</strong> ' + info.gs1Code + '</div>';
                if (info.counter) infoHtml += '<div class="zpl-info-item"><strong>🔢 Contador:</strong> ' + info.counter + '</div>';
                if (info.barcode) infoHtml += '<div class="zpl-info-item"><strong>📊 Código de barras:</strong> ' + info.barcode + '</div>';
            }
            
            infoHtml += '</div>';
            infoDiv.innerHTML = infoHtml;
            
            // Actualizar ZPL raw
            document.getElementById('zplRaw').textContent = selectedLabel.content;
        }
        
        function clearZplDisplay() {
            document.getElementById('labelInfo').innerHTML = '<div class="no-labels">Selecciona una etiqueta para ver su información</div>';
            document.getElementById('zplRaw').textContent = 'Selecciona una etiqueta para ver su contenido ZPL completo';
            selectedLabel = null;
        }
        
        function showTab(tabName) {
            document.querySelectorAll('.zpl-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.zpl-tab-content').forEach(content => content.style.display = 'none');
            
            event.target.classList.add('active');
            document.getElementById('zpl-' + tabName + '-tab').style.display = 'block';
        }
        
        function copyZpl() {
            if (!selectedLabel) {
                alert('Selecciona una etiqueta primero');
                return;
            }
            
            navigator.clipboard.writeText(selectedLabel.content).then(() => {
                alert('Contenido ZPL copiado al portapapeles');
            });
        }
        
        function downloadZpl() {
            if (!selectedLabel) {
                alert('Selecciona una etiqueta primero');
                return;
            }
            
            const blob = new Blob([selectedLabel.content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'etiqueta-' + selectedLabel.labelType + '-' + new Date(selectedLabel.timestamp).toISOString().slice(0, 19).replace(/:/g, '-') + '.zpl';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
        function addLogEntry(logEntry) {
            const container = document.getElementById('logsContainer');
            const logDiv = document.createElement('div');
            logDiv.className = 'log-entry ' + logEntry.level;
            logDiv.innerHTML = 
                '<span>[' + new Date(logEntry.timestamp).toLocaleTimeString() + ']</span> ' +
                '<span>[' + logEntry.printer + ']</span> ' +
                logEntry.message;
            container.insertBefore(logDiv, container.firstChild);
            while (container.children.length > 100) {
                container.removeChild(container.lastChild);
            }
        }
        
        function clearAll() {
            if (confirm('¿Limpiar todos los logs y etiquetas?')) {
                fetch('/api/simulator/clear-logs', { method: 'POST' });
            }
        }
        
        // Cargar datos iniciales
        fetch('/api/simulator/status')
            .then(response => response.json())
            .then(status => {
                printers = {};
                status.forEach(printer => printers[printer.key] = printer);
                updatePrintersGrid();
            });
            
        fetch('/api/simulator/labels')
            .then(response => response.json())
            .then(data => {
                labels = data;
                updateLabelsHistory();
            });
    </script>
</body>
</html>`;
  res.send(html);
});

function startSimulators() {
  log('🚀 Iniciando Simulador VPN Mejorado', 'SYSTEM', 'success');
  log(`🌐 IP VPN: ${VPN_IP}`, 'SYSTEM', 'info');
  log(`📡 Esperando desde IoT: ${IOT_IP}`, 'SYSTEM', 'info');
  
  Object.entries(SIMULATORS).forEach(([key, config]) => {
    const server = createPrinterSimulator(key, config);
    tcpServers.set(key, server);
  });
}

io.on('connection', (socket) => {
  log('🌐 Cliente web conectado', 'SYSTEM', 'info');
});

server.listen(WEB_PORT, () => {
  log(`🌐 Monitor VPN Mejorado disponible en http://localhost:${WEB_PORT}`, 'SYSTEM', 'success');
  startSimulators();
});

process.on('SIGINT', () => {
  log('🔌 Cerrando simulador VPN mejorado...', 'SYSTEM', 'info');
  tcpServers.forEach((server) => server.close());
  server.close(() => {
    log('👋 Simulador VPN mejorado cerrado', 'SYSTEM', 'success');
    process.exit(0);
  });
});

log('✅ Simulador VPN Mejorado iniciado correctamente', 'SYSTEM', 'success'); 