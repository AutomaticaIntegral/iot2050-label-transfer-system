/**
 * Utilidades para el manejo de la configuración del sistema
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../config');

// Ruta del archivo de configuración del sistema
const SYSTEM_CONFIG_FILE = path.join(config.DATA_DIR, 'system-config.json');

// Variable para mantener la configuración en memoria
let systemConfig = { ...config.DEFAULT_SYSTEM_CONFIG };

/**
 * Carga la configuración del sistema desde el archivo
 * @returns {Object} Configuración del sistema
 */
function loadSystemConfig() {
  try {
    if (fs.existsSync(SYSTEM_CONFIG_FILE)) {
      const configData = fs.readFileSync(SYSTEM_CONFIG_FILE, 'utf8');
      try {
        const loadedConfig = JSON.parse(configData);
        systemConfig = { ...config.DEFAULT_SYSTEM_CONFIG, ...loadedConfig };
        log('Configuración del sistema cargada correctamente', 'SERVER', 'success');
      } catch (parseError) {
        log(`Error al parsear archivo de configuración: ${parseError.message}. Usando valores predeterminados.`, 'SERVER', 'error');
        systemConfig = { ...config.DEFAULT_SYSTEM_CONFIG };
      }
    } else {
      log('No existe archivo de configuración, usando valores predeterminados', 'SERVER', 'warn');
      systemConfig = { ...config.DEFAULT_SYSTEM_CONFIG };
      // Guardar configuración predeterminada
      saveSystemConfig(systemConfig);
    }
    return systemConfig;
  } catch (error) {
    log(`Error al cargar configuración: ${error.message}`, 'SERVER', 'error');
    return { ...config.DEFAULT_SYSTEM_CONFIG };
  }
}

/**
 * Guarda la configuración del sistema en el archivo
 * @param {Object} newConfig - Nueva configuración a guardar
 * @returns {Object} Configuración guardada
 */
function saveSystemConfig(newConfig) {
  try {
    // Actualizar configuración en memoria
    systemConfig = {
      ...systemConfig,
      ...newConfig
    };
    
    // Guardar en archivo
    fs.writeFileSync(SYSTEM_CONFIG_FILE, JSON.stringify(systemConfig, null, 2), 'utf8');
    log('Configuración del sistema guardada correctamente', 'SERVER', 'success');
    
    return systemConfig;
  } catch (error) {
    log(`Error al guardar configuración: ${error.message}`, 'SERVER', 'error');
    throw error;
  }
}

/**
 * Obtiene la configuración actual del sistema
 * @returns {Object} Configuración actual
 */
function getSystemConfig() {
  return { ...systemConfig };
}

/**
 * Actualiza un valor específico de la configuración
 * @param {string} key - Clave a actualizar
 * @param {any} value - Nuevo valor
 * @returns {Object} Configuración actualizada
 */
function updateConfigValue(key, value) {
  systemConfig[key] = value;
  saveSystemConfig(systemConfig);
  log(`Configuración actualizada: ${key} = ${value}`, 'SERVER', 'success');
  return { ...systemConfig };
}

// Cargar configuración al iniciar el módulo
loadSystemConfig();

module.exports = {
  loadSystemConfig,
  saveSystemConfig,
  getSystemConfig,
  updateConfigValue
};
