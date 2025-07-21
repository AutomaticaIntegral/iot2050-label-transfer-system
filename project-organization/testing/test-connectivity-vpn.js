/**
 * Script de Verificación de Conectividad VPN
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Función: Verificar conectividad IoT ↔ PC VPN
 */

const net = require('net');
const http = require('http');

// Configuración VPN
const VPN_CONFIG = {
  YOUR_VPN_IP: '100.97.189.85',
  IOT_REAL_IP: '192.168.214.50',
  RFID_PORT: 9105,
  PRODUCT_PORT: 9106,
  IOT_WEB_PORT: 3001,
  IOT_PLC_PORT: 9200
};

// Colores para terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red :
                type === 'warning' ? colors.yellow : colors.blue;
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// 1. Verificar que tus puertos están abiertos y escuchando
function testLocalPorts() {
  return new Promise((resolve) => {
    log('🔍 VERIFICANDO PUERTOS LOCALES', 'info');
    
    const results = {
      rfid: false,
      product: false
    };
    
    let completed = 0;
    
    // Test puerto RFID
    const serverRfid = net.createServer();
    serverRfid.listen(VPN_CONFIG.RFID_PORT, '0.0.0.0', () => {
      log(`✅ Puerto RFID ${VPN_CONFIG.RFID_PORT} DISPONIBLE`, 'success');
      results.rfid = true;
      serverRfid.close();
      if (++completed === 2) resolve(results);
    });
    
    serverRfid.on('error', (err) => {
      log(`❌ Puerto RFID ${VPN_CONFIG.RFID_PORT} NO DISPONIBLE: ${err.message}`, 'error');
      if (++completed === 2) resolve(results);
    });
    
    // Test puerto Producto
    const serverProduct = net.createServer();
    serverProduct.listen(VPN_CONFIG.PRODUCT_PORT, '0.0.0.0', () => {
      log(`✅ Puerto Producto ${VPN_CONFIG.PRODUCT_PORT} DISPONIBLE`, 'success');
      results.product = true;
      serverProduct.close();
      if (++completed === 2) resolve(results);
    });
    
    serverProduct.on('error', (err) => {
      log(`❌ Puerto Producto ${VPN_CONFIG.PRODUCT_PORT} NO DISPONIBLE: ${err.message}`, 'error');
      if (++completed === 2) resolve(results);
    });
  });
}

// 2. Verificar conectividad con el IoT
function testIotConnectivity() {
  return new Promise((resolve) => {
    log('🌐 VERIFICANDO CONECTIVIDAD CON IOT', 'info');
    
    const results = {
      web: false,
      plc: false
    };
    
    let completed = 0;
    
    // Test puerto web del IoT
    const reqWeb = http.request({
      hostname: VPN_CONFIG.IOT_REAL_IP,
      port: VPN_CONFIG.IOT_WEB_PORT,
      path: '/api/system/status',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      log(`✅ IoT Web ${VPN_CONFIG.IOT_REAL_IP}:${VPN_CONFIG.IOT_WEB_PORT} ACCESIBLE`, 'success');
      results.web = true;
      if (++completed === 2) resolve(results);
    });
    
    reqWeb.on('error', (err) => {
      log(`❌ IoT Web NO ACCESIBLE: ${err.message}`, 'error');
      if (++completed === 2) resolve(results);
    });
    
    reqWeb.on('timeout', () => {
      log(`⏰ IoT Web TIMEOUT`, 'error');
      reqWeb.destroy();
      if (++completed === 2) resolve(results);
    });
    
    reqWeb.end();
    
    // Test puerto PLC del IoT
    const socketPlc = new net.Socket();
    socketPlc.setTimeout(5000);
    
    socketPlc.connect(VPN_CONFIG.IOT_PLC_PORT, VPN_CONFIG.IOT_REAL_IP, () => {
      log(`✅ IoT PLC ${VPN_CONFIG.IOT_REAL_IP}:${VPN_CONFIG.IOT_PLC_PORT} ACCESIBLE`, 'success');
      results.plc = true;
      socketPlc.destroy();
      if (++completed === 2) resolve(results);
    });
    
    socketPlc.on('error', (err) => {
      log(`❌ IoT PLC NO ACCESIBLE: ${err.message}`, 'error');
      if (++completed === 2) resolve(results);
    });
    
    socketPlc.on('timeout', () => {
      log(`⏰ IoT PLC TIMEOUT`, 'error');
      socketPlc.destroy();
      if (++completed === 2) resolve(results);
    });
  });
}

// 3. Test de conectividad desde IoT hacia tu PC (simulado)
function createConnectivityTestServer() {
  return new Promise((resolve) => {
    log('🧪 CREANDO SERVIDOR DE TEST DE CONECTIVIDAD', 'info');
    
    const testPort = 9199; // Puerto temporal para test
    const server = net.createServer((socket) => {
      const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
      log(`🎯 CONEXIÓN RECIBIDA DESDE: ${clientInfo}`, 'success');
      
      // Responder con información de test
      const response = JSON.stringify({
        status: 'connection_ok',
        timestamp: new Date().toISOString(),
        your_ip: socket.remoteAddress,
        test_port: testPort,
        message: 'Conectividad VPN confirmada'
      });
      
      socket.write(response + '\n');
      socket.end();
      
      log(`✅ Test de conectividad EXITOSO desde ${clientInfo}`, 'success');
    });
    
    server.listen(testPort, '0.0.0.0', () => {
      log(`🟢 Servidor de test escuchando en puerto ${testPort}`, 'success');
      log(`📝 URL para test desde IoT: http://${VPN_CONFIG.YOUR_VPN_IP}:${testPort}`, 'info');
      resolve(server);
    });
    
    server.on('error', (err) => {
      log(`❌ Error en servidor de test: ${err.message}`, 'error');
      resolve(null);
    });
  });
}

// 4. Generar comando para ejecutar en el IoT
function generateIotTestCommands() {
  log('📋 COMANDOS PARA EJECUTAR EN EL IOT:', 'info');
  console.log('\n' + colors.yellow + '═'.repeat(60) + colors.reset);
  console.log(colors.bright + '🏭 CONECTAR AL IOT Y EJECUTAR:' + colors.reset);
  console.log(colors.yellow + '═'.repeat(60) + colors.reset);
  
  console.log('\n1️⃣ Conectar al IoT via SSH:');
  console.log(colors.blue + `ssh root@${VPN_CONFIG.IOT_REAL_IP}` + colors.reset);
  
  console.log('\n2️⃣ Test de conectividad a tus puertos:');
  console.log(colors.green + `# Test puerto RFID:` + colors.reset);
  console.log(`telnet ${VPN_CONFIG.YOUR_VPN_IP} ${VPN_CONFIG.RFID_PORT}`);
  console.log(colors.green + `# Test puerto Producto:` + colors.reset);
  console.log(`telnet ${VPN_CONFIG.YOUR_VPN_IP} ${VPN_CONFIG.PRODUCT_PORT}`);
  
  console.log('\n3️⃣ Test con netcat (alternativo):');
  console.log(`nc -zv ${VPN_CONFIG.YOUR_VPN_IP} ${VPN_CONFIG.RFID_PORT}`);
  console.log(`nc -zv ${VPN_CONFIG.YOUR_VPN_IP} ${VPN_CONFIG.PRODUCT_PORT}`);
  
  console.log('\n4️⃣ Test con curl:');
  console.log(`curl -v --connect-timeout 5 ${VPN_CONFIG.YOUR_VPN_IP}:${VPN_CONFIG.RFID_PORT}`);
  
  console.log('\n' + colors.yellow + '═'.repeat(60) + colors.reset);
}

// 5. Verificar firewall local
function checkLocalFirewall() {
  log('🔥 VERIFICACIÓN DE FIREWALL LOCAL', 'warning');
  
  console.log('\n' + colors.yellow + '🛡️ COMANDOS PARA VERIFICAR FIREWALL:' + colors.reset);
  
  if (process.platform === 'darwin') {
    console.log('\n📱 macOS - Verificar firewall:');
    console.log(colors.blue + 'sudo pfctl -sr | grep 9105' + colors.reset);
    console.log(colors.blue + 'sudo pfctl -sr | grep 9106' + colors.reset);
    console.log('\n📱 O verificar en Preferencias del Sistema > Seguridad > Firewall');
  } else if (process.platform === 'linux') {
    console.log('\n🐧 Linux - Verificar iptables:');
    console.log(colors.blue + 'sudo iptables -L | grep 9105' + colors.reset);
    console.log(colors.blue + 'sudo iptables -L | grep 9106' + colors.reset);
    console.log(colors.blue + 'sudo ufw status' + colors.reset);
  } else if (process.platform === 'win32') {
    console.log('\n🪟 Windows - Verificar firewall:');
    console.log(colors.blue + 'netsh advfirewall firewall show rule name="Node.js"' + colors.reset);
  }
}

// Función principal
async function main() {
  console.log(colors.bright + '🎯 VERIFICACIÓN DE CONECTIVIDAD VPN - ADISSEO IoT' + colors.reset);
  console.log(colors.blue + '⚙️ Desarrollado por Automática Integral' + colors.reset);
  console.log('═'.repeat(60));
  
  log(`🌐 Tu IP VPN: ${VPN_CONFIG.YOUR_VPN_IP}`, 'info');
  log(`🏭 IoT Real: ${VPN_CONFIG.IOT_REAL_IP}`, 'info');
  log(`🖨️ Puerto RFID: ${VPN_CONFIG.RFID_PORT}`, 'info');
  log(`🏷️ Puerto Producto: ${VPN_CONFIG.PRODUCT_PORT}`, 'info');
  
  console.log('\n' + '═'.repeat(60));
  
  // Test 1: Puertos locales
  const localResults = await testLocalPorts();
  
  console.log('\n' + '─'.repeat(40));
  
  // Test 2: Conectividad IoT
  const iotResults = await testIotConnectivity();
  
  console.log('\n' + '─'.repeat(40));
  
  // Test 3: Servidor de test
  const testServer = await createConnectivityTestServer();
  
  console.log('\n' + '─'.repeat(40));
  
  // Test 4: Comandos para IoT
  generateIotTestCommands();
  
  console.log('\n' + '─'.repeat(40));
  
  // Test 5: Firewall
  checkLocalFirewall();
  
  console.log('\n' + '═'.repeat(60));
  
  // Resumen
  log('📊 RESUMEN DE VERIFICACIÓN:', 'info');
  
  if (localResults.rfid && localResults.product) {
    log('✅ Puertos locales: DISPONIBLES', 'success');
  } else {
    log('❌ Puertos locales: PROBLEMAS DETECTADOS', 'error');
    log('💡 Solución: Cerrar el simulador anterior y reiniciar', 'warning');
  }
  
  if (iotResults.web && iotResults.plc) {
    log('✅ Conectividad IoT: DISPONIBLE', 'success');
  } else {
    log('❌ Conectividad IoT: PROBLEMAS DETECTADOS', 'error');
    log('💡 Solución: Verificar VPN y acceso a red', 'warning');
  }
  
  console.log('\n' + colors.bright + '🎯 PRÓXIMOS PASOS:' + colors.reset);
  console.log('1. Ejecutar comandos en el IoT para verificar conectividad');
  console.log('2. Si hay problemas, verificar firewall local');
  console.log('3. Cambiar IPs en el monitor del IoT');
  console.log('4. Enviar CMD 11 y verificar en el simulador');
  
  // Mantener servidor de test activo por 2 minutos
  if (testServer) {
    log('⏰ Servidor de test activo por 2 minutos...', 'info');
    setTimeout(() => {
      testServer.close();
      log('🔌 Servidor de test cerrado', 'info');
      process.exit(0);
    }, 120000);
  } else {
    process.exit(0);
  }
}

// Ejecutar verificación
main().catch(err => {
  log(`❌ Error en verificación: ${err.message}`, 'error');
  process.exit(1);
}); 