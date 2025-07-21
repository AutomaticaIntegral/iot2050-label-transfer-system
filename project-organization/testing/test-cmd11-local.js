/**
 * Script para Enviar CMD 11 desde PC Local
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Función: Enviar comandos CMD 11 completos al sistema IoT
 */

const net = require('net');

// Configuración por defecto
const DEFAULT_CONFIG = {
  // Conectar al sistema IoT (en producción o local)
  IOT_HOST: 'localhost',      // Cambiar por '192.168.214.50' para IoT real
  IOT_PORT: 9200,             // Puerto del servidor PLC
  
  // Configuración del comando
  MESSAGE_ID: Date.now(),     // ID único del mensaje
  COUNTER: '0001'             // Contador PLC (0001-9999)
};

// Función para enviar comando CMD 11
function sendCmd11(host, port, messageId, counter) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    
    // Construir comando CMD 11 según formato del sistema
    const command = {
      cmd: 11,
      messageId: messageId,
      counter: counter,
      data: {}
    };
    
    const jsonCommand = JSON.stringify(command) + '#';
    
    console.log('🚀 ENVIANDO CMD 11 AL SISTEMA IOT');
    console.log('=' .repeat(50));
    console.log(`📡 Destino: ${host}:${port}`);
    console.log(`📋 Comando: ${JSON.stringify(command, null, 2)}`);
    console.log(`📤 Payload: ${jsonCommand}`);
    console.log('=' .repeat(50));
    
    let responseData = '';
    
    client.connect(port, host, () => {
      console.log(`✅ Conectado al sistema IoT en ${host}:${port}`);
      console.log(`📤 Enviando CMD 11 con MessageID: ${messageId}, Contador: ${counter}`);
      client.write(jsonCommand);
    });
    
    client.on('data', (data) => {
      responseData += data.toString();
      
      // El sistema envía respuestas terminadas en '#'
      if (responseData.includes('#')) {
        const responses = responseData.split('#').filter(r => r.trim());
        
        responses.forEach(response => {
          if (response.trim()) {
            try {
              const parsedResponse = JSON.parse(response);
              console.log('\n📥 RESPUESTA DEL SISTEMA:');
              console.log('=' .repeat(30));
              console.log(JSON.stringify(parsedResponse, null, 2));
              console.log('=' .repeat(30));
              
              if (parsedResponse.status === 'success') {
                console.log('✅ CMD 11 procesado exitosamente');
                if (parsedResponse.gs1) {
                  console.log(`🏷️ GS1 generado: ${parsedResponse.gs1}`);
                }
                if (parsedResponse.counterUsed) {
                  console.log(`🔢 Contador usado: ${parsedResponse.counterUsed}`);
                }
                if (parsedResponse.printerTarget) {
                  console.log(`🖨️ Enviado a impresora: ${parsedResponse.printerTarget}`);
                }
              } else {
                console.log(`❌ Error en CMD 11: ${parsedResponse.message}`);
              }
            } catch (e) {
              console.log(`📄 Respuesta raw: ${response}`);
            }
          }
        });
        
        client.destroy();
        resolve(responseData);
      }
    });
    
    client.on('close', () => {
      console.log(`🔌 Conexión cerrada con ${host}:${port}`);
    });
    
    client.on('error', (err) => {
      console.log(`❌ Error conectando a ${host}:${port}: ${err.message}`);
      console.log(`💡 Verifica que el sistema IoT esté ejecutándose en ${host}:${port}`);
      reject(err);
    });
    
    // Timeout de 10 segundos
    setTimeout(() => {
      console.log('⏰ Timeout - Cerrando conexión');
      client.destroy();
      reject(new Error('Timeout'));
    }, 10000);
  });
}

// Función para validar contador
function validateCounter(counter) {
  const num = parseInt(counter);
  return !isNaN(num) && num >= 0 && num <= 9999;
}

// Función principal
async function main() {
  console.log('🎯 SCRIPT CMD 11 - ADISSEO IoT System');
  console.log('⚙️ Desarrollado por Automática Integral');
  console.log('\n');
  
  // Leer argumentos de línea de comandos
  const args = process.argv.slice(2);
  const host = args[0] || DEFAULT_CONFIG.IOT_HOST;
  const port = parseInt(args[1]) || DEFAULT_CONFIG.IOT_PORT;
  const messageId = parseInt(args[2]) || DEFAULT_CONFIG.MESSAGE_ID;
  const counter = args[3] || DEFAULT_CONFIG.COUNTER;
  
  // Validaciones
  if (!validateCounter(counter)) {
    console.log('❌ Error: Contador debe ser entre 0000 y 9999');
    console.log('💡 Uso: node test-cmd11-local.js [host] [port] [messageId] [counter]');
    process.exit(1);
  }
  
  // Mostrar configuración
  console.log('📋 CONFIGURACIÓN:');
  console.log(`   Host: ${host}`);
  console.log(`   Puerto: ${port}`);
  console.log(`   Message ID: ${messageId}`);
  console.log(`   Contador: ${counter}`);
  console.log('\n');
  
  try {
    await sendCmd11(host, port, messageId, counter);
    console.log('\n🎉 Comando enviado exitosamente');
    console.log('📊 Revisa el monitor web en: http://localhost:3001');
    console.log('🖨️ Revisa las impresoras simuladas en: http://localhost:3002');
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.log('\n🔧 SOLUCIONES:');
    console.log('   1. Verifica que el sistema IoT esté ejecutándose');
    console.log('   2. Para local: npm start');
    console.log('   3. Para IoT real: cambiar host a 192.168.214.50');
    process.exit(1);
  }
}

// Mostrar ayuda si se solicita
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎯 SCRIPT CMD 11 - Envío de Comandos RFID');
  console.log('⚙️ Desarrollado por Automática Integral para ADISSEO\n');
  console.log('📖 USO:');
  console.log('   node test-cmd11-local.js [host] [port] [messageId] [counter]\n');
  console.log('📋 PARÁMETROS:');
  console.log('   host      - IP del sistema IoT (default: localhost)');
  console.log('   port      - Puerto PLC del sistema (default: 9200)');
  console.log('   messageId - ID único del mensaje (default: timestamp)');
  console.log('   counter   - Contador PLC 0000-9999 (default: 0001)\n');
  console.log('💡 EJEMPLOS:');
  console.log('   # Enviar a sistema local:');
  console.log('   node test-cmd11-local.js');
  console.log('   node test-cmd11-local.js localhost 9200 123456 0042\n');
  console.log('   # Enviar a IoT real:');
  console.log('   node test-cmd11-local.js 192.168.214.50 9200 789012 0100\n');
  console.log('🔗 MONITOREO:');
  console.log('   Sistema local: http://localhost:3001');
  console.log('   Simulador: http://localhost:3002');
  console.log('   IoT real: http://192.168.214.50:3001');
  process.exit(0);
}

// Ejecutar script
main(); 