/**
 * Script de Organización del Proyecto
 * Cliente: ADISSEO
 * Desarrollador: Automática Integral
 * Función: Organizar archivos por categorías
 */

const fs = require('fs');
const path = require('path');

// Configuración de organización
const ORGANIZATION = {
  'project-organization/simulators/': [
    'printer-simulator.js',
    'simple-vpn-simulator.js', 
    'enhanced-vpn-simulator.js',
    'simulator-remote.js',
    'simulator-vpn.js'
  ],
  
  'project-organization/testing/': [
    'test-cmd11-local.js',
    'test-connectivity-vpn.js',
    'test-simulator.js',
    'test-iot-connection.sh',
    'test-iot-connection-with-password.sh',
    'quick-connectivity-test.sh'
  ],
  
  'project-organization/scripts/': [
    'setup-local-testing.js',
    'setup-iot-remote-testing.js', 
    'setup-iot-vpn-testing.js',
    'quick-test.sh',
    'change-iot-ip.sh',
    'cleanup-production-safe.sh',
    'create-backup-from-iot.sh',
    'create-backup-with-password.sh',
    'execute-cleanup-on-iot.sh',
    'iot-config.sh',
    'setup-ssh-config.sh'
  ],
  
  'project-organization/documentation/': [
    'DOCUMENTACION-COMPLETA-SESIONES.md',
    'README-TESTING-LOCAL.md',
    'PROCESO-COMPLETO-ADISSEO.md',
    'GUIA-DESCUBRIMIENTO-IOT-ONLINE.md',
    'GUIA-RAPIDA.md',
    'README-SCRIPTS.md',
    'CAMBIOS-APLICAR-IOT.md',
    'docs/'
  ],
  
  'project-organization/config/': [
    'env.local',
    'env.local.example',
    'env.production', 
    'env.production.example'
  ],
  
  'project-organization/backup/': [
    'backup/',
    'backups/'
  ]
};

// Archivos que deben quedarse en la raíz (en producción/online)
const KEEP_IN_ROOT = [
  'index.js',
  'start-server.js', 
  'package.json',
  'package-lock.json',
  'README.md',
  'src/',
  'public/',
  'data/'
];

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m', 
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const color = colors[type] || colors.info;
  console.log(`${color}[${new Date().toLocaleTimeString()}] ${message}${colors.reset}`);
}

function createDirectoryIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`📁 Creado directorio: ${dir}`, 'success');
  }
}

function moveFile(source, destination) {
  try {
    if (fs.existsSync(source)) {
      // Crear directorio destino si no existe
      const destDir = path.dirname(destination);
      createDirectoryIfNotExists(destDir);
      
      // Mover archivo
      fs.renameSync(source, destination);
      log(`📦 Movido: ${source} → ${destination}`, 'success');
      return true;
    } else {
      log(`⚠️ Archivo no encontrado: ${source}`, 'warning');
      return false;
    }
  } catch (error) {
    log(`❌ Error moviendo ${source}: ${error.message}`, 'error');
    return false;
  }
}

function copyFile(source, destination) {
  try {
    if (fs.existsSync(source)) {
      const destDir = path.dirname(destination);
      createDirectoryIfNotExists(destDir);
      
      fs.copyFileSync(source, destination);
      log(`📋 Copiado: ${source} → ${destination}`, 'success');
      return true;
    } else {
      log(`⚠️ Archivo no encontrado: ${source}`, 'warning');
      return false;
    }
  } catch (error) {
    log(`❌ Error copiando ${source}: ${error.message}`, 'error');
    return false;
  }
}

function organizeProject() {
  log('🗂️ INICIANDO ORGANIZACIÓN DEL PROYECTO', 'info');
  log('⚙️ Desarrollado por Automática Integral para ADISSEO', 'info');
  console.log('═'.repeat(60));
  
  let movedFiles = 0;
  let totalFiles = 0;
  
  // Organizar archivos por categorías
  Object.entries(ORGANIZATION).forEach(([destFolder, files]) => {
    log(`\n📂 Organizando categoría: ${destFolder}`, 'info');
    
    files.forEach(file => {
      totalFiles++;
      
      // Verificar si es un directorio
      if (file.endsWith('/')) {
        const sourceDir = file;
        const destDir = path.join(destFolder, file);
        
        if (fs.existsSync(sourceDir)) {
          // Mover directorio completo
          createDirectoryIfNotExists(destFolder);
          fs.renameSync(sourceDir, destDir);
          log(`📁 Movido directorio: ${sourceDir} → ${destDir}`, 'success');
          movedFiles++;
        }
      } else {
        // Mover archivo individual
        const source = file;
        const destination = path.join(destFolder, file);
        
        if (moveFile(source, destination)) {
          movedFiles++;
        }
      }
    });
  });
  
  // Crear archivo README en cada categoría
  Object.keys(ORGANIZATION).forEach(folder => {
    const readmePath = path.join(folder, 'README.md');
    const categoryName = folder.split('/')[1];
    
    const readmeContent = `# 📂 ${categoryName.toUpperCase()}\n\n` +
      `Archivos de ${categoryName} del proyecto ADISSEO IoT2050.\n\n` +
      `**Cliente:** ADISSEO\n` +
      `**Desarrollador:** Automática Integral\n` +
      `**Categoría:** ${categoryName}\n\n` +
      `## Archivos en esta categoría:\n\n` +
      ORGANIZATION[folder].map(file => `- \`${file}\``).join('\n') + '\n\n' +
      `**Nota:** Estos archivos no están en producción en el IoT.`;
    
    fs.writeFileSync(readmePath, readmeContent);
    log(`📝 Creado README para ${categoryName}`, 'success');
  });
  
  console.log('\n' + '═'.repeat(60));
  log('📊 RESUMEN DE ORGANIZACIÓN:', 'info');
  log(`📦 Archivos procesados: ${totalFiles}`, 'info');
  log(`✅ Archivos movidos: ${movedFiles}`, 'success');
  log(`📁 Categorías creadas: ${Object.keys(ORGANIZATION).length}`, 'info');
  
  console.log('\n📋 ESTRUCTURA FINAL:');
  console.log('project-organization/');
  Object.keys(ORGANIZATION).forEach(folder => {
    const categoryName = folder.split('/')[1];
    console.log(`├── ${categoryName}/`);
  });
  
  console.log('\n🏭 ARCHIVOS EN PRODUCCIÓN (raíz):');
  KEEP_IN_ROOT.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    }
  });
  
  log('\n🎉 ¡ORGANIZACIÓN COMPLETADA!', 'success');
  log('📂 Archivos organizados por categorías', 'info');
  log('🏭 Archivos de producción mantenidos en raíz', 'info');
}

// Crear archivo de índice principal
function createProjectIndex() {
  const indexContent = `# 📁 ÍNDICE DEL PROYECTO ORGANIZADO

**Cliente:** ADISSEO  
**Sistema:** IoT2050 Label Transfer System  
**Desarrollador:** Automática Integral  

## 🗂️ ESTRUCTURA ORGANIZADA

### 📂 **project-organization/**
Contiene todos los archivos de desarrollo, testing y documentación:

- **📂 simulators/** - Simuladores de impresoras y sistemas
- **📂 testing/** - Scripts y herramientas de testing
- **📂 scripts/** - Scripts de configuración y automatización
- **📂 documentation/** - Documentación completa del proyecto
- **📂 config/** - Archivos de configuración de desarrollo
- **📂 backup/** - Scripts y archivos de backup

### 🏭 **Raíz del proyecto**
Contiene solo los archivos que están en producción en el IoT:

- \`index.js\` - Punto de entrada principal
- \`start-server.js\` - Script de inicio
- \`package.json\` - Dependencias del proyecto
- \`src/\` - Código fuente principal
- \`public/\` - Archivos web estáticos
- \`data/\` - Datos del sistema

## 🎯 **ARCHIVOS PRINCIPALES**

### 📋 **Documentación Principal**
- \`project-organization/documentation/DOCUMENTACION-COMPLETA-SESIONES.md\`
- \`project-organization/documentation/PROCESO-COMPLETO-ADISSEO.md\`

### 🧪 **Testing Principal** 
- \`project-organization/testing/test-cmd11-local.js\`
- \`project-organization/simulators/enhanced-vpn-simulator.js\`

### ⚙️ **Configuración Principal**
- \`project-organization/scripts/setup-iot-vpn-testing.js\`

## 🚀 **COMANDOS RÁPIDOS**

\`\`\`bash
# Ver documentación completa
cat project-organization/documentation/DOCUMENTACION-COMPLETA-SESIONES.md

# Iniciar simulador VPN mejorado
node project-organization/simulators/enhanced-vpn-simulator.js

# Enviar CMD 11 de prueba
node project-organization/testing/test-cmd11-local.js 192.168.214.50 9200

# Configurar sistema VPN
node project-organization/scripts/setup-iot-vpn-testing.js
\`\`\`

---

**✅ Proyecto organizado exitosamente**  
**📂 Separación clara entre desarrollo y producción**  
**🏭 IoT funcional con archivos mínimos necesarios**`;

  fs.writeFileSync('PROJECT-INDEX.md', indexContent);
  log('📋 Creado índice principal del proyecto', 'success');
}

// Ejecutar organización
function main() {
  try {
    organizeProject();
    createProjectIndex();
    
    console.log('\n' + '🎉'.repeat(20));
    log('PROYECTO ORGANIZADO EXITOSAMENTE', 'success');
    console.log('🎉'.repeat(20));
    
  } catch (error) {
    log(`❌ Error durante la organización: ${error.message}`, 'error');
    process.exit(1);
  }
}

main(); 