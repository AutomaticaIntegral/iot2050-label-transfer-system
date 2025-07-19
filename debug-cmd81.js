const net = require('net');

/**
 * Script de debugging para CMD 81
 * Objetivo: Identificar por qué CMD 81 devuelve COMMAND_SIMULATED
 */

function debugCommand() {
  const client = new net.Socket();
  const message = {cmd: 81, messageId: "debug-cmd81-type"};
  
  console.log('🔍 DEBUGGING CMD 81');
  console.log('📤 Enviando CMD 81 para debugging...');
  console.log('   Tipo de cmd:', typeof message.cmd);
  console.log('   Valor de cmd:', message.cmd);
  console.log('   Mensaje completo:', JSON.stringify(message));
  
  client.connect(9200, 'localhost', () => {
    client.write(JSON.stringify(message) + '#');
  });
  
  client.on('data', (data) => {
    const response = data.toString();
    console.log('\n📥 Respuesta completa:', response);
    
    try {
      const parsed = JSON.parse(response.replace('#', ''));
      
      if (response.includes('COMMAND_SIMULATED')) {
        console.log('❌ PROBLEMA: CMD 81 cayó en el ELSE - no ejecutó handleRfidLabelCommand');
        console.log('   Código respuesta:', parsed.code);
        console.log('   Mensaje:', parsed.message);
      } else if (response.includes('LAST_RFID_LABEL_INFO')) {
        console.log('✅ ÉXITO: CMD 81 ejecutó handleRfidLabelCommand correctamente');
        console.log('   Código respuesta:', parsed.code);
        if (parsed.gs1) {
          console.log('   GS1 RFID:', parsed.gs1);
        }
      } else {
        console.log('⚠️  RESPUESTA INESPERADA');
        console.log('   Código:', parsed.code);
        console.log('   Estado:', parsed.status);
      }
    } catch (e) {
      console.log('❌ Error parseando respuesta JSON');
    }
    
    client.destroy();
  });
  
  client.on('error', (error) => {
    console.log('❌ Error de conexión:', error.message);
  });
}

console.log('🧪 INICIANDO DEBUGGING DE CMD 81\n');
debugCommand(); 