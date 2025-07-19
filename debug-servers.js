/**
 * Script de diagnóstico para verificar el inicio de servidores individuales
 */

async function testServers() {
  try {
    console.log('INICIANDO DIAGNÓSTICO DE SERVIDORES\n');
    
    // 1. Verificar configuración
    console.log('1. Verificando configuración...');
    const config = require('./src/config');
    console.log(`   - Puerto web: ${config.WEB_PORT}`);
    console.log(`   - Puerto PLC: ${config.PLC_PORT}`);
    console.log(`   - Puerto ADI: ${config.LABEL_RECEIVE_PORT}`);
    console.log('   ✓ Configuración cargada correctamente\n');

    // 2. Verificar logger
    console.log('2. Verificando logger...');
    const { log } = require('./src/utils/logger');
    log('   ✓ Sistema de logging funcionando', 'DEBUG', 'success');
    console.log('   ✓ Logger inicializado correctamente\n');
    
    // 3. Verificar servidor web
    console.log('3. Intentando iniciar servidor web...');
    try {
      const { startWebServer } = require('./src/servers/web-server');
      const webServer = await startWebServer();
      console.log(`   ✓ Servidor web iniciado correctamente en puerto ${config.WEB_PORT}\n`);
    } catch (webError) {
      console.error(`   ❌ ERROR AL INICIAR SERVIDOR WEB: ${webError.message}\n`);
      console.error(webError);
    }
    
    // 4. Verificar servidor PLC
    console.log('4. Intentando iniciar servidor PLC...');
    try {
      const { startPlcServer } = require('./src/servers/plc-server');
      const plcServer = await startPlcServer();
      console.log(`   ✓ Servidor PLC iniciado correctamente en puerto ${config.PLC_PORT}\n`);
    } catch (plcError) {
      console.error(`   ❌ ERROR AL INICIAR SERVIDOR PLC: ${plcError.message}\n`);
      console.error(plcError);
    }
    
    console.log('DIAGNÓSTICO COMPLETO\n');
    
  } catch (error) {
    console.error(`ERROR GENERAL: ${error.message}`);
    console.error(error);
  }
}

// Ejecutar diagnóstico
testServers();
