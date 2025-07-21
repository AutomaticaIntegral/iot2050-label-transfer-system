/**
 * Script de Configuración para Testing Local
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Función: Configurar automáticamente el sistema para testing local con simuladores
 */

const fs = require('fs');
const path = require('path');

// Configuración para testing local
const LOCAL_CONFIG = {
  // Puertos del simulador
  PRINTER_PRODUCT_IP: 'localhost',
  PRINTER_PRODUCT_PORT: 9103,  // Puerto del simulador de impresora producto
  PRINTER_RFID_IP: 'localhost',
  PRINTER_RFID_PORT: 9104,     // Puerto del simulador de impresora RFID
  
  // Configuración del sistema
  NODE_ENV: 'development',
  DEBUG_MODE: true,
  
  // Puertos del sistema
  SERVER_PORT: 9110,
  PLC_SERVER_PORT: 9200,
  WEB_PORT: 3001,
  
  // Configuración de red local
  IOT_IP: '192.168.214.1',
  IOT_REMOTE_IP: 'localhost',
  
  // PLC local
  PLC_ENABLED: true,
  PLC_HOST: 'localhost',
  PLC_PORT: 9200,
  PLC_DEBUG: true,
  
  // Sistema de etiquetas
  WAIT_FOR_COMMAND: '80',
  AUTO_SPLIT_ENABLED: false,
  AUTO_GENERATE_RFID: false,
  
  // Timeouts
  IMMEDIATE_RESPONSE_DELAY: 2000,
  PLC_COMMAND_TIMEOUT: 8000
};

// Función para actualizar archivo .env
function updateEnvFile(filePath, config) {
  console.log(`📝 Actualizando archivo: ${filePath}`);
  
  let envContent = '';
  
  // Leer archivo existente si existe
  if (fs.existsSync(filePath)) {
    envContent = fs.readFileSync(filePath, 'utf8');
  }
  
  // Función para actualizar o añadir variable
  function updateEnvVar(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(content)) {
      return content.replace(regex, newLine);
    } else {
      return content + '\n' + newLine;
    }
  }
  
  // Actualizar todas las variables
  Object.entries(config).forEach(([key, value]) => {
    envContent = updateEnvVar(envContent, key, value);
  });
  
  // Escribir archivo actualizado
  fs.writeFileSync(filePath, envContent);
  console.log(`✅ Archivo ${filePath} actualizado correctamente`);
}

// Función para crear script de inicio
function createStartScript() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Añadir scripts de testing si no existen
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    // Scripts para testing local
    packageJson.scripts['test:local'] = 'node setup-local-testing.js && npm start';
    packageJson.scripts['simulator'] = 'node printer-simulator.js';
    packageJson.scripts['cmd11'] = 'node test-cmd11-local.js';
    packageJson.scripts['test:cmd11'] = 'node test-cmd11-local.js localhost 9200';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Scripts añadidos a package.json');
  }
}

// Función para mostrar instrucciones
function showInstructions() {
  console.log('\n🎯 CONFIGURACIÓN COMPLETADA PARA TESTING LOCAL');
  console.log('=' .repeat(60));
  console.log('\n📋 PASOS SIGUIENTES:\n');
  
  console.log('1️⃣ **INICIAR SIMULADOR DE IMPRESORAS:**');
  console.log('   npm run simulator');
  console.log('   🌐 Monitor: http://localhost:3002\n');
  
  console.log('2️⃣ **INICIAR SISTEMA IOT (en otra terminal):**');
  console.log('   npm start');
  console.log('   🌐 Monitor: http://localhost:3001\n');
  
  console.log('3️⃣ **ENVIAR CMD 11 DE PRUEBA (en otra terminal):**');
  console.log('   npm run cmd11                    # Con valores por defecto');
  console.log('   npm run test:cmd11               # Equivalente');
  console.log('   node test-cmd11-local.js --help  # Ver todas las opciones\n');
  
  console.log('4️⃣ **EJEMPLOS DE CMD 11:**');
  console.log('   # Básico con contador automático:');
  console.log('   node test-cmd11-local.js');
  console.log('   ');
  console.log('   # Con contador específico:');
  console.log('   node test-cmd11-local.js localhost 9200 123456 0042');
  console.log('   ');
  console.log('   # Al IoT real (cuando esté disponible):');
  console.log('   node test-cmd11-local.js 192.168.214.50 9200 789012 0100\n');
  
  console.log('🔍 **MONITOREO:**');
  console.log('   📊 Sistema principal: http://localhost:3001');
  console.log('   🖨️ Simulador impresoras: http://localhost:3002');
  console.log('   📋 Dashboard avanzado: http://localhost:3001/dashboard.html\n');
  
  console.log('⚙️ **CONFIGURACIÓN APLICADA:**');
  console.log(`   🏷️ Impresora Producto: localhost:${LOCAL_CONFIG.PRINTER_PRODUCT_PORT}`);
  console.log(`   📡 Impresora RFID: localhost:${LOCAL_CONFIG.PRINTER_RFID_PORT}`);
  console.log(`   🔌 Servidor PLC: localhost:${LOCAL_CONFIG.PLC_SERVER_PORT}`);
  console.log(`   🌐 Servidor Web: localhost:${LOCAL_CONFIG.WEB_PORT}\n`);
  
  console.log('💡 **FLUJO DE TRABAJO:**');
  console.log('   1. El CMD 11 se envía al sistema IoT (puerto 9200)');
  console.log('   2. El sistema procesa y envía ZPL a impresoras simuladas');
  console.log('   3. Los simuladores reciben y muestran las etiquetas');
  console.log('   4. Puedes ver todo en tiempo real en los monitores web');
  
  console.log('\n✅ ¡Sistema listo para testing local!');
  console.log('=' .repeat(60));
}

// Función principal
function main() {
  console.log('🔧 CONFIGURANDO SISTEMA PARA TESTING LOCAL');
  console.log('⚙️ Desarrollado por Automática Integral para ADISSEO');
  console.log('=' .repeat(60));
  
  try {
    // Actualizar archivo env.local
    const envLocalPath = path.join(__dirname, 'env.local');
    updateEnvFile(envLocalPath, LOCAL_CONFIG);
    
    // Crear scripts en package.json
    createStartScript();
    
    console.log('\n✅ Configuración completada exitosamente');
    
    // Mostrar instrucciones
    showInstructions();
    
  } catch (error) {
    console.error(`❌ Error durante la configuración: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar configuración
main(); 