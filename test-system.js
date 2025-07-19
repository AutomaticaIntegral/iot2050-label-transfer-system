/**
 * Script de prueba para el sistema modular
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

console.log('Probando sistema modular...');

// Importar y probar los módulos principales
try {
  console.log('1. Cargando configuración...');
  const config = require('./src/config');
  console.log('   ✓ Configuración cargada correctamente');
  console.log(`   - Puerto web: ${config.WEB_PORT}`);
  console.log(`   - Puerto PLC: ${config.PLC_PORT}`);
  console.log(`   - Puerto ADI: ${config.LABEL_RECEIVE_PORT}`);
  
  console.log('\n2. Probando utilidades...');
  const { log } = require('./src/utils/logger');
  log('   ✓ Sistema de logging funciona correctamente', 'TEST', 'success');
  
  const { loadSystemConfig } = require('./src/utils/system-config');
  const systemConfig = loadSystemConfig();
  console.log(`   ✓ Configuración del sistema cargada: ${JSON.stringify(systemConfig)}`);
  
  console.log('\n3. Probando servicios...');
  const { getCurrentCounter, initLabelService } = require('./src/services/label-service');
  initLabelService();
  console.log(`   ✓ Servicio de etiquetas inicializado, contador actual: ${getCurrentCounter()}`);
  
  console.log('\nSistema modular verificado correctamente.');
  console.log('Para iniciar el sistema, ejecute: node index.js');
} catch (error) {
  console.error(`\n❌ ERROR: ${error.message}`);
  console.error(error);
}
