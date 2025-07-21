# 📁 ÍNDICE DEL PROYECTO ORGANIZADO

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

- `index.js` - Punto de entrada principal
- `start-server.js` - Script de inicio
- `package.json` - Dependencias del proyecto
- `src/` - Código fuente principal
- `public/` - Archivos web estáticos
- `data/` - Datos del sistema

## 🎯 **ARCHIVOS PRINCIPALES**

### 📋 **Documentación Principal**
- `project-organization/documentation/DOCUMENTACION-COMPLETA-SESIONES.md`
- `project-organization/documentation/PROCESO-COMPLETO-ADISSEO.md`

### 🧪 **Testing Principal** 
- `project-organization/testing/test-cmd11-local.js`
- `project-organization/simulators/enhanced-vpn-simulator.js`

### ⚙️ **Configuración Principal**
- `project-organization/scripts/setup-iot-vpn-testing.js`

## 🚀 **COMANDOS RÁPIDOS**

```bash
# Ver documentación completa
cat project-organization/documentation/DOCUMENTACION-COMPLETA-SESIONES.md

# Iniciar simulador VPN mejorado
node project-organization/simulators/enhanced-vpn-simulator.js

# Enviar CMD 11 de prueba
node project-organization/testing/test-cmd11-local.js 192.168.214.50 9200

# Configurar sistema VPN
node project-organization/scripts/setup-iot-vpn-testing.js
```

---

**✅ Proyecto organizado exitosamente**  
**📂 Separación clara entre desarrollo y producción**  
**🏭 IoT funcional con archivos mínimos necesarios**