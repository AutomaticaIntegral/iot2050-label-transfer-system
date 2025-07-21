/**
 * Servidor web para monitoreo y API
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Proyecto: IoT Label Transfer System - Plataforma de Monitoreo Industrial
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { log, initializeLogger } = require('../utils/logger');
const { getAllLabels, getLabelById } = require('../utils/file-handler');
const { getSystemConfig, saveSystemConfig } = require('../utils/system-config');
const { printLabel } = require('../services/printer-service');
const { getReadStatus, resetReadMarks } = require('../services/label-service');
const config = require('../config');

// Datos de autenticación
const AUTH_USER = 'admin';
const AUTH_PASS = 'admin123';

// Token simple basado en hash para sesiones
const generateToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Almacén simple de sesiones en memoria
const sessions = {};

// Crear aplicación Express
const app = express();
const server = http.createServer(app);

// Configurar Socket.io con opciones de CORS para permitir conexiones desde cualquier origen
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Inicializar logger con Socket.io
initializeLogger(io);

// Log para verificar inicialización
log('Socket.io inicializado para transmisión de logs en tiempo real', 'WEB', 'success');

// Directorio de archivos estáticos
const PUBLIC_DIR = path.join(__dirname, '../../public');

// Configuración de middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para procesar cookies manualmente
app.use((req, res, next) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = parts[1].trim();
    });
  }
  
  req.cookies = cookies;
  next();
});

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  // Verificar si es la página de login o solicitud de login
  if (req.path === '/login' || req.path === '/api/login') {
    return next();
  }
  
  // EXCLUIR TODAS LAS RUTAS /api/ de autenticación (entorno seguro)
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Verificar token de sesión para páginas web
  const sessionToken = req.cookies['sessionToken'];
  
  if (sessionToken && sessions[sessionToken]) {
    // Sesión válida
    return next();
  }
  
  // Redirigir a login si no está autenticado (solo páginas web)
  if (req.path === '/') {
    return res.redirect('/login');
  }
  
  next();
};

// Aplicar middleware de autenticación a todas las rutas
app.use(authMiddleware);

// Servir archivos estáticos después del middleware de autenticación
app.use(express.static(PUBLIC_DIR));

// Ruta de login
app.get('/login', (req, res) => {
  // Verificar si ya está autenticado
  const sessionToken = req.cookies['sessionToken'];
  
  if (sessionToken && sessions[sessionToken]) {
    return res.redirect('/');
  }
  
  // Servir página de login
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// API para login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === AUTH_USER && password === AUTH_PASS) {
    // Credenciales correctas, crear sesión
    const token = generateToken();
    sessions[token] = {
      username,
      created: Date.now()
    };
    
    log(`Usuario ${username} autenticado correctamente`, 'WEB', 'success');
    
    // Establecer cookie de sesión
    res.setHeader('Set-Cookie', `sessionToken=${token}; Path=/; HttpOnly`);
    res.json({ success: true, redirect: '/' });
  } else {
    log(`Intento de login fallido: ${username}`, 'WEB', 'warn');
    res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
  }
});

// Ruta de logout
app.get('/api/logout', (req, res) => {
  const sessionToken = req.cookies['sessionToken'];
  
  if (sessionToken) {
    // Eliminar sesión
    delete sessions[sessionToken];
  }
  
  // Limpiar cookie de sesión
  res.setHeader('Set-Cookie', 'sessionToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/login');
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Ruta para la página de depuración
app.get('/debug', (req, res) => {
  log('Acceso a la página de depuración', 'WEB');
  res.sendFile(path.join(PUBLIC_DIR, 'debug.html'));
});

// Eventos Socket.io
io.on('connection', (socket) => {
  log('Nuevo cliente web conectado', 'WEB', 'success');
  
  // Enviar evento de prueba para verificar la conexión
  socket.emit('log', {
    timestamp: new Date().toISOString(),
    category: 'WEB',
    message: 'Conexión Socket.io establecida correctamente',
    level: 'success'
  });
  
  socket.on('disconnect', () => {
    log('Cliente web desconectado', 'WEB');
  });
});

// API para obtener todas las etiquetas
app.get('/api/labels', (req, res) => {
  log('Solicitud API recibida: GET /api/labels', 'MONITOR');
  const labels = getAllLabels();
  res.json(labels);
});

// API para obtener una etiqueta específica por ID
app.get('/api/labels/:id', (req, res) => {
  const id = req.params.id;
  log(`Solicitud API recibida: GET /api/labels/${id}`, 'MONITOR');
  
  const label = getLabelById(id);
  if (!label) {
    return res.status(404).json({ error: 'Etiqueta no encontrada' });
  }
  
  res.json(label);
});

// API para imprimir una etiqueta específica
app.post('/api/labels/:id/print', async (req, res) => {
  const id = req.params.id;
  const { printer } = req.body;
  
  log(`Solicitud API recibida: POST /api/labels/${id}/print (impresora: ${printer})`, 'MONITOR');
  
  try {
    const label = getLabelById(id);
    if (!label) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }
    
    if (!label.zpl) {
      return res.status(400).json({ error: 'La etiqueta no tiene contenido ZPL válido' });
    }
    
    const result = await printLabel(label, printer);
    res.json({
      success: true,
      message: result.message || `Etiqueta enviada a impresora ${printer}`
    });
  } catch (error) {
    log(`Error al imprimir etiqueta ${id}: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API para obtener archivos ZPL enviados a impresoras
app.get('/api/printer-files', (req, res) => {
  log('Solicitud API recibida: GET /api/printer-files', 'MONITOR');
  
  try {
    const zplPath = path.join(__dirname, '../../data/zpl');
    
    if (!fs.existsSync(zplPath)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(zplPath)
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const filePath = path.join(zplPath, file);
        const stats = fs.statSync(filePath);
        
        // Extraer timestamp del nombre del archivo (zpl-timestamp.txt)
        const timestampMatch = file.match(/zpl-(\d+)\.txt/);
        const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : stats.mtimeMs;
        
        // Detectar tipo de etiqueta basado en tamaño del archivo
        // RFID: menos de 400 bytes
        // Normal: más de 500 bytes
        let labelType = 'normal';
        let printerTarget = 'producto';
        
        if (stats.size < 400) {
          labelType = 'rfid';
          printerTarget = 'rfid';
        } else if (stats.size > 500) {
          labelType = 'normal';
          printerTarget = 'producto';
        } else {
          // Tamaño intermedio: revisar contenido como fallback
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Detectar RFID por comandos específicos
            if (content.includes('^RFW') || content.includes('^HV') || content.includes('RFID')) {
              labelType = 'rfid';
              printerTarget = 'rfid';
            } else if (content.includes('^PQ1')) {
              labelType = 'rfid'; // Las etiquetas IBC suelen ser ^PQ1
              printerTarget = 'rfid';
            } else if (content.includes('^PQ4')) {
              labelType = 'normal'; // Las etiquetas bidón suelen ser ^PQ4
              printerTarget = 'producto';
            }
            
          } catch (error) {
            // Si no puede leer el archivo, usar tamaño como criterio final
            labelType = stats.size < 450 ? 'rfid' : 'normal';
            printerTarget = labelType === 'rfid' ? 'rfid' : 'producto';
            log(`Error al leer archivo ZPL ${file}: ${error.message}`, 'MONITOR', 'warn');
          }
        }
        
        return {
          id: file.replace('.txt', ''),
          filename: file,
          timestamp: new Date(timestamp).toISOString(),
          size: stats.size,
          created: stats.birthtime.toISOString(),
          labelType: labelType,
          printerTarget: printerTarget,
          isRfid: labelType === 'rfid'
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100); // Limitar a últimos 100 archivos
    
    res.json(files);
  } catch (error) {
    log(`Error al obtener archivos ZPL: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al obtener archivos de impresora' });
  }
});

// API para obtener contenido de un archivo ZPL específico
app.get('/api/printer-files/:filename', (req, res) => {
  const filename = req.params.filename;
  log(`Solicitud API recibida: GET /api/printer-files/${filename}`, 'MONITOR');
  
  try {
    const zplPath = path.join(__dirname, '../../data/zpl');
    const filePath = path.join(zplPath, filename + '.txt');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    res.json({
      filename: filename + '.txt',
      content: content,
      size: stats.size,
      created: stats.birthtime.toISOString()
    });
  } catch (error) {
    log(`Error al leer archivo ZPL: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al leer archivo' });
  }
});

// API para obtener información de impresoras
app.get('/api/printers-info', (req, res) => {
  log('Solicitud API recibida: GET /api/printers-info', 'MONITOR');
  
  try {
    const printersInfo = {
      product: {
        name: 'Impresora Producto',
        host: config.PRODUCT_PRINTER_HOST,
        port: config.PRODUCT_PRINTER_PORT,
        type: 'Etiquetas Normales',
        status: 'online', // En un entorno real, esto se verificaría con ping
        description: 'Impresora principal para etiquetas de bidones'
      },
      rfid: {
        name: 'Impresora RFID',
        host: config.RFID_PRINTER_HOST,
        port: config.RFID_PRINTER_PORT,
        type: 'Etiquetas RFID',
        status: 'online',
        description: 'Impresora especializada para etiquetas IBC con RFID'
      }
    };
    
    res.json(printersInfo);
  } catch (error) {
    log(`Error al obtener información de impresoras: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al obtener información de impresoras' });
  }
});

// API para actualizar configuración de impresoras
app.post('/api/printers-config', (req, res) => {
  log('Solicitud API recibida: POST /api/printers-config', 'MONITOR');
  
  try {
    const { productPrinter, rfidPrinter } = req.body;
    
    // Validaciones básicas
    if (!productPrinter || !rfidPrinter) {
      return res.status(400).json({ error: 'Configuración incompleta' });
    }
    
    // Validar IPs
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^localhost$/;
    if (!ipRegex.test(productPrinter.host) || !ipRegex.test(rfidPrinter.host)) {
      return res.status(400).json({ error: 'Dirección IP inválida' });
    }
    
    // Validar puertos
    if (productPrinter.port < 1 || productPrinter.port > 65535 ||
        rfidPrinter.port < 1 || rfidPrinter.port > 65535) {
      return res.status(400).json({ error: 'Puerto inválido (1-65535)' });
    }
    
    // Actualizar configuración en memoria (temporal)
    config.PRODUCT_PRINTER_HOST = productPrinter.host;
    config.PRODUCT_PRINTER_PORT = productPrinter.port;
    config.RFID_PRINTER_HOST = rfidPrinter.host;
    config.RFID_PRINTER_PORT = rfidPrinter.port;
    
    // Guardar en archivo de configuración
    const envPath = path.join(__dirname, '../../env.production');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Actualizar o añadir líneas de configuración
    const updateEnvVar = (content, key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(content)) {
        return content.replace(regex, newLine);
      } else {
        return content + '\n' + newLine;
      }
    };
    
    envContent = updateEnvVar(envContent, 'PRINTER_PRODUCT_IP', productPrinter.host);
    envContent = updateEnvVar(envContent, 'PRINTER_PRODUCT_PORT', productPrinter.port);
    envContent = updateEnvVar(envContent, 'PRINTER_RFID_IP', rfidPrinter.host);
    envContent = updateEnvVar(envContent, 'PRINTER_RFID_PORT', rfidPrinter.port);
    
    fs.writeFileSync(envPath, envContent);
    
    log(`Configuración de impresoras actualizada: Producto ${productPrinter.host}:${productPrinter.port}, RFID ${rfidPrinter.host}:${rfidPrinter.port}`, 'MONITOR', 'success');
    
    res.json({
      success: true,
      message: 'Configuración de impresoras actualizada correctamente',
      restart_required: true
    });
    
  } catch (error) {
    log(`Error al actualizar configuración de impresoras: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// API para obtener configuración del sistema
app.get('/api/config', (req, res) => {
  log('Solicitud API recibida: GET /api/config', 'MONITOR');
  res.json(getSystemConfig());
});

// API para actualizar configuración del sistema
app.post('/api/config', (req, res) => {
  log('Solicitud API recibida: POST /api/config', 'MONITOR');
  
  try {
    const newConfig = req.body;
    const updatedConfig = saveSystemConfig(newConfig);
    
    log(`Configuración actualizada: Esperar comando ${updatedConfig.waitForCommand === 'none' ? 'ninguno' : updatedConfig.waitForCommand}`, 'MONITOR', 'success');
    
    res.json({
      success: true, 
      config: updatedConfig
    });
  } catch (error) {
    log(`Error al actualizar configuración: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// API para obtener información de contadores NORMAL/RFID
app.get('/api/counters', (req, res) => {
  log('Solicitud API recibida: GET /api/counters', 'MONITOR');
  
  try {
    const labels = getAllLabels();
    
    // Separar etiquetas NORMAL y RFID
    let normalLabels = [];
    let rfidLabels = [];
    
    labels.forEach(label => {
      // Detectar tipo de etiqueta basado en isRfid o tipo detectado
      if (label.isRfid === true || 
          (label.type && label.type.toLowerCase().includes('rfid')) ||
          (label.zpl && label.zpl.includes('^HV'))) {
        rfidLabels.push(label);
      } else {
        normalLabels.push(label);
      }
    });
    
    // Obtener último contador de cada tipo
    let lastNormalCounter = '0000';
    let lastRfidCounter = '0000';
    
    if (normalLabels.length > 0) {
      const lastNormal = normalLabels[normalLabels.length - 1];
      const counterMatch = lastNormal.gs1 ? lastNormal.gs1.match(/\(21\)(\d+)/) : null;
      if (counterMatch) {
        lastNormalCounter = counterMatch[1].padStart(4, '0');
      }
    }
    
    if (rfidLabels.length > 0) {
      const lastRfid = rfidLabels[rfidLabels.length - 1];
      const counterMatch = lastRfid.gs1 ? lastRfid.gs1.match(/\(21\)(\d+)/) : null;
      if (counterMatch) {
        lastRfidCounter = counterMatch[1].padStart(4, '0');
      }
    }
    
    const countersData = {
      normal: {
        lastCounter: lastNormalCounter,
        labelsCount: normalLabels.length,
        printsCount: 0 // Se actualizará desde logs
      },
      rfid: {
        lastCounter: lastRfidCounter,
        labelsCount: rfidLabels.length,
        printsCount: 0 // Se actualizará desde logs
      },
      total: {
        labelsCount: labels.length,
        normalCount: normalLabels.length,
        rfidCount: rfidLabels.length
      }
    };
    
    res.json(countersData);
  } catch (error) {
    log(`Error al obtener contadores: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al obtener información de contadores' });
  }
});

// ✅ NUEVA API: Obtener estado de marcas de lectura PLC
app.get('/api/read-status', (req, res) => {
  log('Solicitud API recibida: GET /api/read-status', 'MONITOR');
  
  try {
    const readStatus = getReadStatus();
    res.json({
      success: true,
      readStatus: readStatus
    });
  } catch (error) {
    log(`Error al obtener estado de lectura: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ error: 'Error al obtener estado de marcas de lectura' });
  }
});

// ✅ NUEVA API: Resetear marcas de lectura PLC
app.post('/api/reset-read-marks', (req, res) => {
  log('Solicitud API recibida: POST /api/reset-read-marks (desde monitor web)', 'MONITOR');
  
  try {
    const result = resetReadMarks();
    
    // Emitir evento por Socket.io para notificar a todos los clientes conectados
    io.emit('log', {
      timestamp: new Date().toISOString(),
      category: 'MONITOR',
      message: '🔄 Marcas de lectura PLC reseteadas desde monitor web',
      level: 'success'
    });
    
    res.json(result);
  } catch (error) {
    log(`Error al resetear marcas de lectura: ${error.message}`, 'MONITOR', 'error');
    res.status(500).json({ 
      success: false,
      error: 'Error al resetear marcas de lectura' 
    });
  }
});

// Socket.io para comunicación en tiempo real
io.on('connection', (socket) => {
  log('Nuevo cliente conectado al monitor', 'MONITOR');
  
  socket.on('disconnect', () => {
    log('Cliente desconectado del monitor', 'MONITOR');
  });
});

// Función para iniciar el servidor web
function startWebServer() {
  return new Promise((resolve, reject) => {
    server.listen(config.WEB_PORT, '0.0.0.0', () => {
      log(`Servidor web escuchando en http://localhost:${config.WEB_PORT}`, 'WEB', 'success');
      resolve(server);
    }).on('error', (err) => {
      log(`Error al iniciar servidor web: ${err.message}`, 'WEB', 'error');
      reject(err);
    });
  });
}

// Función para detener el servidor
function stopWebServer() {
  return new Promise((resolve) => {
    if (server.listening) {
      server.close(() => {
        log('Servidor web detenido', 'WEB');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Crear archivo de login si no existe
function ensureLoginPageExists() {
  const loginPath = path.join(PUBLIC_DIR, 'login.html');
  
  if (!fs.existsSync(loginPath)) {
    const loginHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TCP Label Transfer - Sistema de Gestión</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: #333;
    }
    .login-container {
      background-color: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      width: 400px;
      backdrop-filter: blur(10px);
    }
    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .login-header .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #4CAF50, #2E7D32);
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      font-weight: bold;
    }
    .login-header h1 {
      color: #2c3e50;
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .login-header p {
      color: #7f8c8d;
      margin: 0;
      font-size: 16px;
    }
    .login-form {
      display: flex;
      flex-direction: column;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #555;
      font-size: 14px;
    }
    .form-group input {
      width: 100%;
      padding: 14px;
      border: 2px solid #e1e8ed;
      border-radius: 8px;
      box-sizing: border-box;
      font-size: 16px;
      transition: border-color 0.3s ease;
    }
    .form-group input:focus {
      outline: none;
      border-color: #4CAF50;
    }
    .login-button {
      background: linear-gradient(135deg, #4CAF50, #2E7D32);
      color: white;
      border: none;
      padding: 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      margin-top: 10px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .login-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    }
    .error-message {
      color: #e74c3c;
      margin-top: 15px;
      text-align: center;
      display: none;
      padding: 10px;
      background-color: #fdf2f2;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
    .features {
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
    .features h3 {
      font-size: 14px;
      color: #666;
      margin: 0 0 10px 0;
      text-align: center;
      font-weight: 600;
    }
    .features ul {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 12px;
      color: #888;
    }
    .features li {
      padding: 2px 0;
      display: flex;
      align-items: center;
    }
    .features li:before {
      content: "✓";
      color: #4CAF50;
      font-weight: bold;
      margin-right: 8px;
    }
    .company-info {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="login-header">
      <div class="logo">TCP</div>
      <h1>TCP Label Transfer</h1>
      <p>Sistema de Gestión de Etiquetas</p>
    </div>
    <form class="login-form" id="loginForm">
      <div class="form-group">
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" required autofocus placeholder="Ingrese su usuario">
      </div>
      <div class="form-group">
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" required placeholder="Ingrese su contraseña">
      </div>
      <button type="submit" class="login-button">Iniciar Sesión</button>
    </form>
    <div class="error-message" id="errorMessage">
      Usuario o contraseña incorrectos
    </div>
    <div class="features">
      <h3>Características del Sistema</h3>
      <ul>
        <li>Monitoreo en tiempo real</li>
        <li>Gestión de etiquetas ZPL</li>
        <li>Control de impresoras</li>
        <li>Interfaz web moderna</li>
      </ul>
    </div>
    <div class="company-info">
      &copy; 2025 Automática Integral<br>
      Versión 2.0 - Sistema Profesional
    </div>
  </div>

  <script>
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          window.location.href = data.redirect || '/';
        } else {
          document.getElementById('errorMessage').style.display = 'block';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        document.getElementById('errorMessage').style.display = 'block';
      });
    });
  </script>
</body>
</html>
`;
    
    fs.writeFileSync(loginPath, loginHtml);
    log(`Página de login creada en ${loginPath}`, 'WEB', 'success');
  }
}

// Exportar funciones y objetos necesarios
module.exports = {
  app,
  server,
  io,
  startWebServer: async function() {
    // Asegurar que existe la página de login
    ensureLoginPageExists();
    
    // Iniciar el servidor
    return startWebServer();
  },
  stopWebServer
};
