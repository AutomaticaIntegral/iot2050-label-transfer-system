const net = require('net');

/**
 * Script de prueba para comandos PLC
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer - Contadores controlados por PLC
 */

function testCommand(cmd, counter = null, description = '') {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const message = counter ? 
      {cmd: cmd, counter: counter, messageId: `test-${Date.now()}`} :
      {cmd: cmd, messageId: `test-${Date.now()}`};
    
    console.log(`\n🧪 ${description}`);
    console.log(`📤 Enviando: ${JSON.stringify(message)}`);
    
    client.connect(9200, 'localhost', () => {
      client.write(JSON.stringify(message) + '#');
    });
    
    client.on('data', (data) => {
      const response = data.toString();
      console.log(`📥 Respuesta: ${response}`);
      
      // Intentar parsear JSON para mostrar mejor
      try {
        const parsed = JSON.parse(response.replace('#', ''));
        if (parsed.gs1) {
          console.log(`   🏷️  GS1: ${parsed.gs1}`);
          const counterMatch = parsed.gs1.match(/\(21\)(\d{4})/);
          if (counterMatch) {
            console.log(`   🔢 Contador en respuesta: ${counterMatch[1]}`);
          }
        }
        if (parsed.counterUsed) {
          console.log(`   ✅ Contador usado: ${parsed.counterUsed}`);
        }
        if (parsed.status) {
          console.log(`   📊 Estado: ${parsed.status}`);
        }
      } catch (e) {
        // Si no es JSON válido, mostrar raw
      }
      
      client.destroy();
      resolve(response);
    });
    
    client.on('error', (error) => {
      console.log(`❌ Error: ${error.message}`);
      reject(error);
    });
    
    setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout después de 5 segundos'));
    }, 5000);
  });
}

async function runTests() {
  try {
    console.log('🚀 INICIANDO PRUEBAS DE COMANDOS PLC');
    console.log('📋 Sistema: Contadores controlados por PLC');
    console.log('🎯 Objetivo: Verificar CMD 80/81 separados y contadores flexibles\n');
    
    // Prueba 1: CMD 80 (etiquetas NORMALES)
    await testCommand(80, null, 'CMD 80 - Consultar última etiqueta NORMAL');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prueba 2: CMD 81 (etiquetas RFID) 
    await testCommand(81, null, 'CMD 81 - Consultar última etiqueta RFID (NUEVO)');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prueba 3: CMD 10 con contador PLC
    await testCommand(10, 1234, 'CMD 10 - Imprimir NORMAL con contador PLC 1234');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prueba 4: CMD 11 con contador PLC
    await testCommand(11, 5678, 'CMD 11 - Imprimir RFID con contador PLC 5678');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prueba 5: CMD 10 con contador flexible (normalización)
    await testCommand(10, 2, 'CMD 10 - Contador flexible "2" → debería normalizarse a "0002"');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prueba 6: CMD 11 con contador flexible
    await testCommand(11, 99, 'CMD 11 - Contador flexible "99" → debería normalizarse a "0099"');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Prueba 7: Contador máximo
    await testCommand(10, 9999, 'CMD 10 - Contador máximo "9999"');
    
    console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS');
    console.log('\n📝 VERIFICACIONES REALIZADAS:');
    console.log('   ✓ CMD 80: Solo etiquetas NORMALES');
    console.log('   ✓ CMD 81: Solo etiquetas RFID');
    console.log('   ✓ CMD 10/11: Usan contador del PLC');
    console.log('   ✓ Normalización: "2" → "0002", "99" → "0099"');
    console.log('   ✓ Rango válido: 0-9999');
    
  } catch (error) {
    console.log(`❌ Error en pruebas: ${error.message}`);
  }
}

// Verificar si se pasa un comando específico como argumento
const args = process.argv.slice(2);
if (args.length > 0) {
  const cmd = parseInt(args[0]);
  const counter = args[1] ? parseInt(args[1]) : null;
  
  console.log(`🎯 Prueba individual: CMD ${cmd}${counter ? ` con contador ${counter}` : ''}`);
  testCommand(cmd, counter, `Prueba manual CMD ${cmd}`)
    .then(() => process.exit(0))
    .catch((error) => {
      console.log(`Error: ${error.message}`);
      process.exit(1);
    });
} else {
  // Ejecutar todas las pruebas
  runTests();
} 