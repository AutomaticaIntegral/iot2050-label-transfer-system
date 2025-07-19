/**
 * Utilidades para el manejo de archivos
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const config = require('../config');

// Archivos para contadores separados
const RFID_COUNTER_FILE = path.join(config.DATA_DIR, 'rfid-counter.txt');

/**
 * Guarda la información de etiqueta en el archivo de etiquetas
 * @param {Object} labelInfo - Información de la etiqueta a guardar
 */
function saveLabelInfo(labelInfo) {
  try {
    // Asegurar que tengamos un ID único para la etiqueta
    if (!labelInfo.id) {
      labelInfo.id = Date.now().toString();
    }
    
    // Leer las etiquetas existentes o inicializar un array vacío
    let labels = [];
    if (fs.existsSync(config.LABELS_FILE)) {
      const labelsData = fs.readFileSync(config.LABELS_FILE, 'utf8');
      try {
        labels = JSON.parse(labelsData);
        // Asegurar que sea un array
        if (!Array.isArray(labels)) {
          labels = [];
        }
      } catch (parseError) {
        log(`Error al parsear archivo de etiquetas: ${parseError.message}. Iniciando nuevo archivo.`, 'SERVER', 'error');
        labels = [];
      }
    }
    
    // Añadir la nueva etiqueta al principio (para que las más recientes estén primero)
    labels.unshift(labelInfo);
    
    // Limitar a 100 etiquetas para evitar archivos demasiado grandes
    if (labels.length > 100) {
      labels = labels.slice(0, 100);
    }
    
    // Guardar todas las etiquetas en el archivo
    fs.writeFileSync(config.LABELS_FILE, JSON.stringify(labels, null, 2), 'utf8');
    log(`Etiqueta guardada con ID: ${labelInfo.id}`, 'SERVER', 'success');
    
    return labelInfo;
  } catch (error) {
    log(`Error al guardar información de etiqueta: ${error.message}`, 'SERVER', 'error');
    throw error;
  }
}

/**
 * Obtiene todas las etiquetas guardadas
 * @returns {Array} Array de etiquetas
 */
function getAllLabels() {
  try {
    if (fs.existsSync(config.LABELS_FILE)) {
      const labelsData = fs.readFileSync(config.LABELS_FILE, 'utf8');
      try {
        const labels = JSON.parse(labelsData);
        return Array.isArray(labels) ? labels : [];
      } catch (parseError) {
        log(`Error al parsear archivo de etiquetas: ${parseError.message}`, 'SERVER', 'error');
        return [];
      }
    }
    return [];
  } catch (error) {
    log(`Error al leer etiquetas: ${error.message}`, 'SERVER', 'error');
    return [];
  }
}

/**
 * Obtiene una etiqueta por su ID
 * @param {string} id - ID de la etiqueta
 * @returns {Object|null} Etiqueta encontrada o null
 */
function getLabelById(id) {
  const labels = getAllLabels();
  return labels.find(label => label.id === id) || null;
}

/**
 * Guarda el valor actual del contador
 * @param {string} counter - Valor del contador
 */
function saveCounter(counter) {
  try {
    fs.writeFileSync(config.COUNTER_FILE, counter, 'utf8');
    log(`Contador guardado: ${counter}`, 'SERVER', 'success');
  } catch (error) {
    log(`Error al guardar contador: ${error.message}`, 'SERVER', 'error');
  }
}

/**
 * Obtiene el valor actual del contador
 * @returns {string} Valor del contador
 */
function getCounter() {
  try {
    if (fs.existsSync(config.COUNTER_FILE)) {
      return fs.readFileSync(config.COUNTER_FILE, 'utf8').trim();
    }
    return '0001';
  } catch (error) {
    log(`Error al leer contador: ${error.message}`, 'SERVER', 'error');
    return '0001';
  }
}

/**
 * Incrementa el contador actual
 * @param {string} currentCounter - Contador actual
 * @returns {string} Nuevo valor del contador
 */
function incrementCounter(currentCounter) {
  try {
    // Convertir a número y sumar 1
    let counterNum = parseInt(currentCounter, 10);
    counterNum++;
    
    // Formatear de vuelta a string con ceros a la izquierda
    const newCounter = counterNum.toString().padStart(4, '0');
    log(`Contador incrementado: ${currentCounter} -> ${newCounter}`, 'SERVER');
    
    return newCounter;
  } catch (error) {
    log(`Error al incrementar contador: ${error.message}`, 'SERVER', 'error');
    return currentCounter;
  }
}

/**
 * Guarda el valor actual del contador RFID
 * @param {string} counter - Valor del contador RFID
 */
function saveRfidCounter(counter) {
  try {
    fs.writeFileSync(RFID_COUNTER_FILE, counter, 'utf8');
    log(`Contador RFID guardado: ${counter}`, 'SERVER', 'success');
  } catch (error) {
    log(`Error al guardar contador RFID: ${error.message}`, 'SERVER', 'error');
  }
}

/**
 * Obtiene el valor actual del contador RFID
 * @returns {string} Valor del contador RFID
 */
function getRfidCounter() {
  try {
    if (fs.existsSync(RFID_COUNTER_FILE)) {
      return fs.readFileSync(RFID_COUNTER_FILE, 'utf8').trim();
    }
    return '0001';
  } catch (error) {
    log(`Error al leer contador RFID: ${error.message}`, 'SERVER', 'error');
    return '0001';
  }
}

/**
 * Incrementa el contador RFID actual
 * @param {string} currentRfidCounter - Contador RFID actual
 * @returns {string} Nuevo valor del contador RFID
 */
function incrementRfidCounter(currentRfidCounter) {
  try {
    // Convertir a número y sumar 1
    let counterNum = parseInt(currentRfidCounter, 10);
    counterNum++;
    
    // Formatear de vuelta a string con ceros a la izquierda
    const newCounter = counterNum.toString().padStart(4, '0');
    log(`Contador RFID incrementado: ${currentRfidCounter} -> ${newCounter}`, 'SERVER');
    
    return newCounter;
  } catch (error) {
    log(`Error al incrementar contador RFID: ${error.message}`, 'SERVER', 'error');
    return currentRfidCounter;
  }
}

/**
 * Guarda el comando ZPL en un archivo
 * @param {string} zplCommand - Comando ZPL a guardar
 * @returns {string} Ruta del archivo guardado
 */
function saveZplCommand(zplCommand) {
  try {
    const timestamp = Date.now();
    const zplFile = path.join(config.ZPL_DIR, `zpl-${timestamp}.txt`);
    fs.writeFileSync(zplFile, zplCommand);
    log(`Comando ZPL guardado en ${zplFile}`, 'SERVER');
    return zplFile;
  } catch (error) {
    log(`Error al guardar comando ZPL: ${error.message}`, 'SERVER', 'error');
    return null;
  }
}

module.exports = {
  saveLabelInfo,
  getAllLabels,
  getLabelById,
  saveCounter,
  getCounter,
  incrementCounter,
  saveRfidCounter,
  getRfidCounter,
  incrementRfidCounter,
  saveZplCommand
};
