/**
 * Configuración del sistema
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 * 
 * ¡MIGRADO A SISTEMA ENV! Este archivo ahora importa de env-config.js
 * para mantener compatibilidad hacia atrás.
 */

// Importar la nueva configuración basada en archivos .env
const envConfig = require('./env-config');

// Exportar toda la configuración manteniendo la compatibilidad
module.exports = envConfig;
