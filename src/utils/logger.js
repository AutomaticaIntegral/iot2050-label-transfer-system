/**
 * Utilidades para el manejo de logs
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

let io = null;

/**
 * Inicializa el servicio de logs con Socket.io
 * @param {Object} socketIo - Instancia de Socket.io para emitir eventos
 */
function initializeLogger(socketIo) {
  io = socketIo;
}

/**
 * Registra un mensaje de log y lo emite vía Socket.io si está disponible
 * @param {string} message - Mensaje a registrar
 * @param {string} category - Categoría del log (SERVER, PLC, ADI, PRINTER, MONITOR, etc.)
 * @param {string} level - Nivel del log (info, success, warn, error)
 */
function log(message, category = 'SERVER', level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${category}] ${message}`;

  // Mostrar en consola con colores según nivel
  switch (level) {
    case 'success':
      console.log('\x1b[32m%s\x1b[0m', logMessage); // Verde
      break;
    case 'warn':
      console.log('\x1b[33m%s\x1b[0m', logMessage); // Amarillo
      break;
    case 'error':
      console.log('\x1b[31m%s\x1b[0m', logMessage); // Rojo
      break;
    default:
      console.log(logMessage); // Sin color
  }

  // Emitir evento vía Socket.io si está disponible
  if (io) {
    io.emit('log', {
      timestamp,
      category,
      message,
      level
    });
  }
}

module.exports = {
  initializeLogger,
  log
};
