/**
 * Script de diagnóstico para verificar el estado del sistema
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n');
console.log('═════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO DEL SISTEMA - ADISSEO TCP LABEL TRANSFER');
console.log('═════════════════════════════════════════════════════');
console.log('\n');

// Verificar estructura de directorios
const rootDir = __dirname;
const srcDir = path.join(rootDir, 'src');
const dataDir = path.join(rootDir, 'data');
const zplDir = path.join(dataDir, 'zpl');

console.log('VERIFICANDO ESTRUCTURA DE DIRECTORIOS:');
checkDir(rootDir, 'Directorio principal');
checkDir(srcDir, 'Directorio de código fuente (src)');
checkDir(dataDir, 'Directorio de datos');
checkDir(zplDir, 'Directorio de archivos ZPL');

console.log('\nVERIFICANDO ARCHIVOS DE CONFIGURACIÓN:');
checkFile(path.join(dataDir, 'system-config.json'), 'Configuración del sistema');
checkFile(path.join(dataDir, 'counter.txt'), 'Contador de etiquetas');
checkFile(path.join(dataDir, 'labels.json'), 'Historial de etiquetas');

console.log('\nVERIFICANDO MÓDULOS PRINCIPALES:');
checkFile(path.join(rootDir, 'index.js'), 'Punto de entrada principal');
checkFile(path.join(srcDir, 'main.js'), 'Archivo principal');
checkFile(path.join(srcDir, 'config', 'index.js'), 'Configuración');
checkFile(path.join(srcDir, 'servers', 'web-server.js'), 'Servidor web');
checkFile(path.join(srcDir, 'servers', 'plc-server.js'), 'Servidor PLC');
checkFile(path.join(srcDir, 'servers', 'adi-server.js'), 'Servidor ADI');
checkFile(path.join(srcDir, 'services', 'label-service.js'), 'Servicio de etiquetas');
checkFile(path.join(srcDir, 'services', 'printer-service.js'), 'Servicio de impresión');

console.log('\nINFORMACIÓN DEL SISTEMA:');
console.log(`Sistema operativo: ${os.type()} ${os.release()}`);
console.log(`Nombre de host: ${os.hostname()}`);
console.log(`Memoria total: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
console.log(`Memoria libre: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`);
console.log(`CPUs: ${os.cpus().length} cores`);
console.log(`Versión de Node.js: ${process.version}`);

console.log('\nINSTRUCCIONES PARA INICIAR EL SISTEMA:');
console.log('1. Desde PowerShell, ejecutar:');
console.log('   .\\start-hybrid-environment.ps1');
console.log('\n2. O para iniciar solo el servidor:');
console.log('   node index.js');

console.log('\n');
console.log('═════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO COMPLETADO');
console.log('═════════════════════════════════════════════════════');

// Funciones auxiliares
function checkDir(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`✅ ${description}: OK (${dirPath})`);
  } else {
    console.log(`❌ ${description}: NO ENCONTRADO (${dirPath})`);
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const stats = fs.statSync(filePath);
    const size = Math.round(stats.size / 1024);
    console.log(`✅ ${description}: OK (${size} KB)`);
  } else {
    console.log(`❌ ${description}: NO ENCONTRADO (${filePath})`);
  }
}
