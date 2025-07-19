const net = require('net');

/**
 * Script de debugging para tipos de CMD
 * Objetivo: Verificar si CMD 81 falla por comparación string vs number
 */

function testCommandType(cmdValue, description) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const message = {cmd: cmdValue, messageId: `test-${Date.now()}`};
    
    console.log(`\n🧪 ${description}`);
    console.log('   cmd valor:', cmdValue);
    console.log('   cmd tipo:', typeof cmdValue);
    console.log('   Mensaje:', JSON.stringify(message));
    
    client.connect(9200, 'localhost', () => {
      client.write(JSON.stringify(message) + '#');
    });
    
    client.on('data', (data) => {
      const response = data.toString();
      console.log('   📥 Respuesta:', response.slice(0, 100) + '...');
      
      try {
        const parsed = JSON.parse(response.replace('#', ''));
        console.log('   📊 Código:', parsed.code);
        
        if (parsed.code === 'COMMAND_SIMULATED') {
          console.log('   ❌ Cayó en ELSE (comando no reconocido)');
        } else if (parsed.code === 'LAST_RFID_LABEL_INFO') {
          console.log('   ✅ Ejecutó handleRfidLabelCommand correctamente');
        } else {
          console.log('   ⚠️  Respuesta inesperada');
        }
      } catch (e) {
        console.log('   ❌ Error parseando JSON');
      }
      
      client.destroy();
      resolve();
    });
    
    client.on('error', (error) => {
      console.log('   ❌ Error:', error.message);
      reject(error);
    });
    
    setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout'));
    }, 3000);
  });
}

async function runTypeTests() {
  console.log('🚀 INICIANDO DEBUGGING DE TIPOS DE CMD\n');
  
  try {
    // Test 1: CMD 81 como number (como en nuestro script)
    await testCommandType(81, 'CMD 81 como NUMBER');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 2: CMD 81 como string
    await testCommandType("81", 'CMD 81 como STRING');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 3: CMD 80 como number (funciona)
    await testCommandType(80, 'CMD 80 como NUMBER (control)');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 4: CMD 80 como string
    await testCommandType("80", 'CMD 80 como STRING (control)');
    
    console.log('\n🎯 ANÁLISIS:');
    console.log('   Si CMD 81 funciona como STRING pero no como NUMBER:');
    console.log('   → El problema es comparación de tipos en el código');
    console.log('   Si ambos fallan:'); 
    console.log('   → handleRfidLabelCommand tiene otro problema');
    console.log('   Si CMD 80 funciona en ambos casos:');
    console.log('   → La lógica del switch está bien');
    
  } catch (error) {
    console.log('❌ Error en tests:', error.message);
  }
}

runTypeTests(); 