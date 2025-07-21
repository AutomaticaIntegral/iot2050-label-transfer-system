# 🏭 **IoT2050 Label Transfer System**

**Cliente:** ADISSEO  
**Desarrollador:** Automática Integral  
**Sistema:** Sistema de transferencia de etiquetas para IoT2050  

## 🎯 **DESCRIPCIÓN**

Sistema completo de transferencia y gestión de etiquetas RFID/Producto para dispositivos IoT2050 con capacidades de testing, simulación y monitoreo en tiempo real.

## 🚀 **FUNCIONALIDADES PRINCIPALES**

### ✅ **Sistema en Producción (IoT)**
- **📡 Servidor PLC** - Procesamiento comandos CMD 10/11
- **🖨️ Gestión de impresoras** - RFID y Producto
- **🌐 Interfaz web** - Monitor en tiempo real
- **💾 Persistencia de datos** - Contadores y etiquetas
- **🔄 Sincronización RFID** - Sistema automático

### ✅ **Sistema de Testing y Desarrollo**
- **🧪 Simulador CMD 11** - Envío desde PC al IoT
- **📱 Simuladores VPN** - Captura etiquetas desde IoT real
- **🔍 Análisis ZPL** - Contenido completo de etiquetas
- **🌐 Interfaz de testing** - Monitoreo avanzado
- **📊 Herramientas diagnóstico** - Conectividad VPN

## 📂 **ESTRUCTURA DEL PROYECTO**

### 🏭 **Archivos de Producción (Raíz)**
```
├── index.js              # Punto de entrada principal
├── start-server.js       # Script de inicio
├── package.json          # Dependencias
├── src/                  # Código fuente
│   ├── config/          # Configuraciones
│   ├── servers/         # Servidores PLC/Web
│   ├── services/        # Servicios de etiquetas
│   └── utils/           # Utilidades
├── public/              # Interfaz web
└── data/                # Datos del sistema
```

### 🧪 **Archivos de Desarrollo (`project-organization/`)**
```
project-organization/
├── 📂 simulators/       # Simuladores de impresoras
├── 📂 testing/          # Scripts de testing CMD 11
├── 📂 scripts/          # Scripts de configuración
├── 📂 documentation/    # Documentación completa
├── 📂 config/           # Configuraciones desarrollo
└── 📂 backup/           # Scripts de backup
```

## 🔥 **INICIO RÁPIDO**

### **🏭 Producción (IoT2050)**
```bash
# Instalar dependencias
npm install

# Iniciar sistema
npm start
# o
node start-server.js
```

### **🧪 Testing Local**
```bash
# Configurar testing local
node project-organization/scripts/setup-local-testing.js

# Ejecutar simuladores
npm run simulator
```

### **📡 Testing VPN con IoT Real**
```bash
# 1. Configurar sistema VPN
node project-organization/scripts/setup-iot-vpn-testing.js

# 2. Iniciar simulador VPN
node project-organization/simulators/enhanced-vpn-simulator.js

# 3. Enviar CMD 11 al IoT
node project-organization/testing/test-cmd11-local.js 192.168.214.50 9200

# 4. Ver etiquetas capturadas
open http://localhost:3002
```

## 📋 **DOCUMENTACIÓN PRINCIPAL**

| **Documento** | **Descripción** |
|---------------|-----------------|
| [📚 **Documentación Completa**](project-organization/documentation/DOCUMENTACION-COMPLETA-SESIONES.md) | **Documentación exhaustiva de implementación** |
| [🔧 **Proceso ADISSEO**](project-organization/documentation/PROCESO-COMPLETO-ADISSEO.md) | Proceso completo de producción |
| [📁 **Índice del Proyecto**](PROJECT-INDEX.md) | Estructura organizada del proyecto |
| [📖 **Scripts**](project-organization/documentation/README-SCRIPTS.md) | Documentación de scripts |

## ⚡ **COMANDOS NPM**

```json
{
  "start": "node start-server.js",
  "simulator": "node project-organization/simulators/printer-simulator.js",
  "simulator:vpn": "node project-organization/simulators/enhanced-vpn-simulator.js",
  "cmd11": "node project-organization/testing/test-cmd11-local.js",
  "cmd11:iot": "node project-organization/testing/test-cmd11-local.js 192.168.214.50 9200"
}
```

## 🌐 **CONFIGURACIÓN DE RED**

### **🏭 Producción IoT**
- **IoT IP:** `192.168.214.50`
- **Puerto PLC:** `9200`
- **Puerto Web:** `3001`
- **Impresora RFID:** `192.168.214.31:9100`
- **Impresora Producto:** `192.168.214.32:9100`

### **🧪 Testing VPN**
- **PC Local:** `100.97.189.85`
- **Simulador RFID:** `9105`
- **Simulador Producto:** `9106`
- **Monitor Web:** `3002`

## 📊 **CASOS DE USO**

### **🔥 CASO 1: Desarrollo Local**
Para desarrollar sin dependencias externas:
```bash
npm run simulator     # Simulador local
npm start            # Sistema IoT local
npm run cmd11        # Test CMD 11 local
```

### **🔥 CASO 2: Testing con IoT Real**
Para verificar el IoT en producción:
```bash
node project-organization/simulators/enhanced-vpn-simulator.js
node project-organization/testing/test-cmd11-local.js 192.168.214.50 9200
```

### **🔥 CASO 3: Análisis ZPL**
Para capturar y analizar etiquetas reales:
1. Configurar simulador VPN en PC
2. Cambiar IPs impresoras en IoT → PC
3. Enviar CMD 11 y capturar ZPL completo

## 🛠️ **HERRAMIENTAS ESPECIALIZADAS**

### **📡 Simulador VPN Mejorado**
- **Archivo:** `project-organization/simulators/enhanced-vpn-simulator.js`
- **Puerto:** `3002`
- **Función:** Captura ZPL completo desde IoT real
- **Características:** Análisis, descarga, historial

### **📤 Testing CMD 11**
- **Archivo:** `project-organization/testing/test-cmd11-local.js`
- **Función:** Simular comandos PLC
- **Uso:** `node test-cmd11-local.js [host] [port] [messageId] [counter]`

### **🔍 Verificación Conectividad**
- **Archivo:** `project-organization/testing/test-connectivity-vpn.js`
- **Función:** Diagnosticar VPN y puertos
- **Uso:** Automático con múltiples verificaciones

## 📈 **RESULTADOS CONFIRMADOS**

### ✅ **Sistema Funcional**
- **🔗 Conectividad VPN:** PC ↔ IoT confirmada
- **📤 CMD 11:** Comandos procesados correctamente
- **📡 Captura ZPL:** Etiquetas RFID completas (263 bytes)
- **🏷️ Datos extraídos:** GS1, contadores, RFID data
- **💾 Descarga:** Archivos .zpl completos

### 📋 **Ejemplo de Captura**
```
🏷️ GS1 CODE: (01)03531520010264(17)300721(10)782520200(21)0005
🔢 CONTADOR: 0005
📄 RFID DATA: AD002818496B17767323030005000000
📏 TAMAÑO: 263 bytes ZPL
🔗 ORIGEN: IoT 100.125.112.37 vía VPN
```

## 🎯 **TECNOLOGÍAS**

- **Node.js** - Runtime principal
- **Express.js** - Servidor web
- **Socket.io** - Comunicación tiempo real  
- **TCP/IP** - Comunicación PLC/Impresoras
- **ZPL** - Lenguaje etiquetas Zebra
- **VPN** - Conectividad remota

## 👥 **EQUIPO**

**Desarrollado por:** [Automática Integral](https://github.com/AutomaticaIntegral)  
**Cliente:** ADISSEO  
**Sistema:** IoT2050 Label Transfer System  

## 📞 **SOPORTE**

Para soporte técnico:
1. Ver [documentación completa](project-organization/documentation/DOCUMENTACION-COMPLETA-SESIONES.md)
2. Revisar [scripts disponibles](project-organization/documentation/README-SCRIPTS.md)
3. Consultar [proceso ADISSEO](project-organization/documentation/PROCESO-COMPLETO-ADISSEO.md)

---

**✅ Sistema completo implementado y funcionando**  
**🏭 En producción en IoT2050**  
**🧪 Con herramientas completas de testing**  
**📚 Documentación exhaustiva incluida**
