/**
 * Sistema de configuración basado en archivos .env
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 * 
 * Carga automáticamente la configuración correcta según el entorno:
 * - LOCAL: env.local
 * - PRODUCTION: env.production
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Cargar variables de entorno del sistema

// Determinar el entorno actual
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isLocal = NODE_ENV === 'development' || NODE_ENV === 'local';

// Función para cargar archivo .env específico
function loadEnvFile(envFile) {
  const envPath = path.join(__dirname, '../..', envFile);
  
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ Archivo de configuración no encontrado: ${envPath}`);
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  // Parsear el archivo .env manualmente
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  console.log(`✅ Configuración cargada desde: ${envFile}`);
  return envVars;
}

// Cargar configuración según el entorno
let envConfig = {};

if (isProduction) {
  console.log('🚀 Iniciando en modo PRODUCCIÓN');
  envConfig = loadEnvFile('env.production');
} else {
  console.log('🛠️ Iniciando en modo DESARROLLO LOCAL');
  envConfig = loadEnvFile('env.local');
}

// Función helper para obtener valor con fallback
function getEnvValue(key, defaultValue = undefined) {
  return envConfig[key] || process.env[key] || defaultValue;
}

// Función helper para obtener valor numérico
function getEnvNumber(key, defaultValue = 0) {
  const value = getEnvValue(key, defaultValue);
  return parseInt(value, 10) || defaultValue;
}

// Función helper para obtener valor booleano
function getEnvBoolean(key, defaultValue = false) {
  const value = getEnvValue(key, defaultValue);
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return value || defaultValue;
}

// Rutas de archivos (calculadas dinámicamente)
const DATA_DIR = path.join(__dirname, '../../data');
const LABELS_FILE = path.join(DATA_DIR, 'labels.json');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.txt');
const ZPL_DIR = path.join(DATA_DIR, 'zpl');

// Configuración exportada
const config = {
  // Información del entorno
  NODE_ENV,
  isProduction,
  isLocal,
  DEBUG_MODE: getEnvBoolean('DEBUG_MODE', !isProduction),
  
  // Puertos de los servidores
  WEB_PORT: getEnvNumber('WEB_PORT', 3001),
  PLC_PORT: getEnvNumber('PLC_SERVER_PORT', 9200),
  LABEL_RECEIVE_PORT: getEnvNumber('SERVER_PORT', isProduction ? 9100 : 9110),
  
  // Configuración de red
  IOT_IP: getEnvValue('IOT_IP', '192.168.214.1'),
  IOT_REMOTE_IP: getEnvValue('IOT_REMOTE_IP', isProduction ? '192.168.214.50' : 'localhost'),
  
  // Impresoras
  PRODUCT_PRINTER_HOST: getEnvValue('PRINTER_PRODUCT_IP', isProduction ? '10.108.220.10' : 'localhost'),
  PRODUCT_PRINTER_PORT: getEnvNumber('PRINTER_PRODUCT_PORT', 9100),
  RFID_PRINTER_HOST: getEnvValue('PRINTER_RFID_IP', isProduction ? '10.108.220.15' : 'localhost'),
  RFID_PRINTER_PORT: getEnvNumber('PRINTER_RFID_PORT', isProduction ? 9100 : 9101),
  
  // PLC
  PLC_ENABLED: getEnvBoolean('PLC_ENABLED', true),
  PLC_HOST: getEnvValue('PLC_HOST', isProduction ? '192.168.214.1' : 'localhost'),
  PLC_PORT_SIEMENS: getEnvNumber('PLC_PORT', isProduction ? 102 : 9200),
  PLC_RACK: getEnvNumber('PLC_RACK', 0),
  PLC_SLOT: getEnvNumber('PLC_SLOT', 2),
  PLC_DEBUG: getEnvBoolean('PLC_DEBUG', !isProduction),
  
  // Sistema de etiquetas
  WAIT_FOR_COMMAND: getEnvValue('WAIT_FOR_COMMAND', isProduction ? 'none' : '80'),
  AUTO_SPLIT_ENABLED: getEnvBoolean('AUTO_SPLIT_ENABLED', false),
  AUTO_GENERATE_RFID: getEnvBoolean('AUTO_GENERATE_RFID', false),
  
  // Timeouts de respuesta ADI
  IMMEDIATE_RESPONSE_DELAY: getEnvNumber('IMMEDIATE_RESPONSE_DELAY', isProduction ? 1000 : 2000),
  PLC_COMMAND_TIMEOUT: getEnvNumber('PLC_COMMAND_TIMEOUT', 8000),
  WAIT_FOR_CLIENT_CLOSE: getEnvNumber('WAIT_FOR_CLIENT_CLOSE', 5000),
  
  // Archivos y carpetas
  OUTPUT_FOLDER: getEnvValue('OUTPUT_FOLDER', isProduction ? './received_files' : './data/received_files'),
  LOGS_PATH: getEnvValue('LOGS_PATH', isProduction ? '/opt/tcp-label-transfer/logs' : './data/logs'),
  RECEIVED_FILES_PATH: getEnvValue('RECEIVED_FILES_PATH', isProduction ? '/opt/tcp-label-transfer/received_files' : './data/received_files'),
  
  // Configuración especial
  SPECIAL_IPS: getEnvValue('SPECIAL_IPS', '192.168.214.1,192.168.214.20,192.168.214.30').split(','),
  FIXED_BYTES_SIZE: getEnvNumber('FIXED_BYTES_SIZE', 254),
  PLC_JSON_DELIMITER: getEnvValue('PLC_JSON_DELIMITER', '#'),
  PLC_MAX_MESSAGE_SIZE: getEnvNumber('PLC_MAX_MESSAGE_SIZE', 254),
  ALLOWED_EXTENSIONS: getEnvValue('ALLOWED_EXTENSIONS', '.prn,.nlbl').split(','),
  FORWARD_ENABLED: getEnvBoolean('FORWARD_ENABLED', true),
  
  // Rutas internas (calculadas)
  DATA_DIR,
  LABELS_FILE,
  COUNTER_FILE,
  ZPL_DIR,
  
  // Configuración predeterminada del sistema
  DEFAULT_SYSTEM_CONFIG: {
    waitForCommand: getEnvValue('WAIT_FOR_COMMAND', isProduction ? 'none' : '80')
  }
};

// Asegurar que existan las carpetas necesarias
const ensureDirectories = () => {
  const directories = [
    DATA_DIR,
    ZPL_DIR,
    path.dirname(config.LOGS_PATH),
    config.RECEIVED_FILES_PATH
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
      } catch (error) {
        console.warn(`⚠️ No se pudo crear directorio ${dir}:`, error.message);
      }
    }
  });
};

// Crear directorios al cargar el módulo
ensureDirectories();

// Mostrar resumen de configuración
console.log(`
📋 CONFIGURACIÓN ACTIVA:
   🌍 Entorno: ${NODE_ENV}
   🔗 Puerto PLC: ${config.PLC_PORT}
   📨 Puerto ADI: ${config.LABEL_RECEIVE_PORT}
   🌐 Puerto Web: ${config.WEB_PORT}
   🖨️ Impresora Producto: ${config.PRODUCT_PRINTER_HOST}:${config.PRODUCT_PRINTER_PORT}
   🏷️ Impresora RFID: ${config.RFID_PRINTER_HOST}:${config.RFID_PRINTER_PORT}
   ⏳ Esperar comando: ${config.WAIT_FOR_COMMAND}
`);

module.exports = config; 