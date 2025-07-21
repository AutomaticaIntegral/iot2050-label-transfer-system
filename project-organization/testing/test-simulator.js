/**
 * Script de Prueba para Simulador de Impresoras
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Sistema: Testing del simulador de impresoras
 */

const net = require('net');

// Datos ZPL de ejemplo para testing
const ZPL_SAMPLES = {
  normal: `^XA
^FO20,30^A0N,25,25^FDEtiqueta Bidón Normal^FS
^FO20,60^A0N,20,20^FDProducto: PRODUCTO_TEST^FS
^FO20,90^A0N,20,20^FDLote: LOTE_123456^FS
^FO20,120^A0N,20,20^FDFecha: ${new Date().toLocaleDateString()}^FS
^FO20,150^BY2^BCN,60,Y,N,N^FD123456789^FS
^XZ`,
  
  rfid: `^XA
^RFW,H^FD${Date.now()}^FS
^FO30,30^A0N,15,15^FDRFID IBC^FS
^FO30,50^A0N,12,12^FD${Date.now()}^FS
^XZ`
};

// Función para enviar datos a una impresora simulada
function sendToSimulator(host, port, data, type) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    console.log(`📤 Enviando etiqueta ${type} a ${host}:${port}...`);
    
    client.connect(port, host, () => {
      console.log(`✅ Conectado a simulador ${host}:${port}`);
      client.write(data);
    });
    
    client.on('data', (response) => {
      console.log(`📥 Respuesta recibida: ${response.toString().trim()}`);
      client.destroy();
      resolve(response.toString());
    });
    
    client.on('close', () => {
      console.log(`🔌 Conexión cerrada con ${host}:${port}`);
    });
    
    client.on('error', (err) => {
      console.log(`❌ Error conectando a ${host}:${port}: ${err.message}`);
      reject(err);
    });
    
    // Timeout de 5 segundos
    setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout'));
    }, 5000);
  });
}

// Función principal de testing
async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DEL SIMULADOR DE IMPRESORAS');
  console.log('⚙️ Desarrollado por Automática Integral para ADISSEO');
  console.log('=' .repeat(60));
  
  const tests = [
    // Simuladores específicos (nuevos puertos)
    { host: 'localhost', port: 9103, data: ZPL_SAMPLES.normal, type: 'Normal → Producto (9103)' },
    { host: 'localhost', port: 9104, data: ZPL_SAMPLES.rfid, type: 'RFID → RFID Simulado (9104)' },
    
    // Test units (puertos de prueba)
    { host: 'localhost', port: 9101, data: ZPL_SAMPLES.normal, type: 'Normal → Test1 (9101)' },
    { host: 'localhost', port: 9102, data: ZPL_SAMPLES.rfid, type: 'RFID → Test2 (9102)' },
    
    // Testing cruzado
    { host: 'localhost', port: 9101, data: ZPL_SAMPLES.rfid, type: 'RFID → Test1 (Cruzado)' },
    { host: 'localhost', port: 9102, data: ZPL_SAMPLES.normal, type: 'Normal → Test2 (Cruzado)' }
  ];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n📋 Test ${i + 1}/${tests.length}: ${test.type}`);
    
    try {
      await sendToSimulator(test.host, test.port, test.data, test.type);
      console.log(`✅ Test ${i + 1} completado exitosamente`);
    } catch (error) {
      console.log(`❌ Test ${i + 1} falló: ${error.message}`);
    }
    
    // Delay entre tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 PRUEBAS COMPLETADAS');
  console.log('📊 Revisa el simulador en: http://localhost:3002');
  console.log('📈 Verifica los contadores y logs en tiempo real');
  console.log('\n🔧 PUERTOS ACTUALIZADOS:');
  console.log('  🏷️ Producto: localhost:9103');
  console.log('  📡 RFID: localhost:9104');
  console.log('  🧪 Test1: localhost:9101');
  console.log('  🧪 Test2: localhost:9102');
  console.log('=' .repeat(60));
}

// Verificar si el simulador está ejecutándose
function checkSimulator() {
  console.log('🔍 Verificando estado del simulador...');
  
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/api/simulator/status',
    method: 'GET',
    timeout: 3000
  }, (res) => {
    console.log('✅ Simulador detectado, iniciando pruebas...\n');
    runTests();
  });
  
  req.on('error', (err) => {
    console.log('❌ Error: Simulador no está ejecutándose');
    console.log('💡 Ejecuta primero: npm run simulator');
    console.log('🌐 Luego abre: http://localhost:3002');
    process.exit(1);
  });
  
  req.on('timeout', () => {
    console.log('⏰ Timeout: Simulador no responde');
    console.log('💡 Verifica que esté ejecutándose en puerto 3002');
    process.exit(1);
  });
  
  req.end();
}

// Ejecutar verificación y pruebas
checkSimulator(); 