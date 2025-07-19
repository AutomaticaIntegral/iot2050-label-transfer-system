/**
 * Servicio de impresión
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const { log } = require('../utils/logger');
const { saveZplCommand } = require('../utils/file-handler');
const config = require('../config');

/**
 * Envía un comando ZPL a una impresora
 * @param {string} host - Host de la impresora
 * @param {number} port - Puerto de la impresora
 * @param {string} zplCommand - Comando ZPL a enviar
 * @param {string} printerType - Tipo de impresora ('product' o 'rfid')
 * @returns {Promise<boolean>} Promise que se resuelve cuando la impresión es exitosa
 */
function sendZplCommand(host, port, zplCommand, printerType = 'product') {
  return new Promise((resolve, reject) => {
    log(`Enviando comando ZPL a impresora ${printerType} (${host}:${port})...`, 'PRINTER');
    
    // Guardar el comando ZPL en un archivo para referencia
    saveZplCommand(zplCommand);
    
    // Crear cliente TCP para enviar a la impresora
    const client = new net.Socket();
    
    // Establecer timeout para evitar conexiones colgadas
    client.setTimeout(5000);
    
    client.connect(port, host, () => {
      log(`Conexión establecida con impresora ${printerType}`, 'PRINTER', 'success');
      
      // Enviar comando ZPL
      client.write(zplCommand, 'utf8', (err) => {
        if (err) {
          log(`Error al enviar datos a impresora ${printerType}: ${err.message}`, 'PRINTER', 'error');
          client.destroy();
          reject(err);
          return;
        }
        
        log(`Comando ZPL enviado a impresora ${printerType}`, 'PRINTER', 'success');
        
        // Cerrar la conexión después de enviar
        client.end();
        resolve(true);
      });
    });
    
    client.on('error', (err) => {
      log(`Error de conexión con impresora ${printerType}: ${err.message}`, 'PRINTER', 'error');
      reject(err);
    });
    
    client.on('timeout', () => {
      log(`Timeout en conexión con impresora ${printerType}`, 'PRINTER', 'error');
      client.destroy();
      reject(new Error('Timeout en conexión'));
    });
    
    client.on('close', () => {
      log(`Conexión cerrada con impresora ${printerType}`, 'PRINTER');
    });
  });
}

/**
 * Envía una etiqueta a la impresora de producto
 * @param {string} zplCommand - Comando ZPL a enviar
 * @returns {Promise<boolean>} Promise que se resuelve cuando la impresión es exitosa
 */
function printToProductPrinter(zplCommand) {
  return sendZplCommand(
    config.PRODUCT_PRINTER_HOST,
    config.PRODUCT_PRINTER_PORT,
    zplCommand,
    'product'
  );
}

/**
 * Envía una etiqueta a la impresora RFID
 * @param {string} zplCommand - Comando ZPL a enviar
 * @returns {Promise<boolean>} Promise que se resuelve cuando la impresión es exitosa
 */
function printToRfidPrinter(zplCommand) {
  return sendZplCommand(
    config.RFID_PRINTER_HOST,
    config.RFID_PRINTER_PORT,
    zplCommand,
    'rfid'
  );
}

/**
 * Imprime una etiqueta específica en la impresora designada
 * @param {Object} label - Información de la etiqueta
 * @param {string} printerType - Tipo de impresora ('product' o 'rfid')
 * @returns {Promise<Object>} Promise que se resuelve con el resultado de la impresión
 */
async function printLabel(label, printerType = 'product') {
  try {
    if (!label || !label.zpl) {
      throw new Error('La etiqueta no tiene contenido ZPL válido');
    }
    
    log(`Imprimiendo etiqueta ${label.id} en impresora ${printerType}`, 'PRINTER');
    
    if (printerType === 'rfid') {
      await printToRfidPrinter(label.zpl);
    } else {
      await printToProductPrinter(label.zpl);
    }
    
    return {
      success: true,
      message: `Etiqueta ${label.id} impresa correctamente en impresora ${printerType}`
    };
  } catch (error) {
    log(`Error al imprimir etiqueta: ${error.message}`, 'PRINTER', 'error');
    throw error;
  }
}

module.exports = {
  sendZplCommand,
  printToProductPrinter,
  printToRfidPrinter,
  printLabel
};
