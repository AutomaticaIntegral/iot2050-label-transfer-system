# 🚀 ARCHIVOS PARA ACTUALIZAR EN IOT ONLINE

## 📅 **Fecha de actualización**: 2025-01-22
## 🎯 **Objetivo**: Corregir inconsistencias RFID y agregar validaciones multi-capa

---

## 📁 **ARCHIVOS CRÍTICOS A ACTUALIZAR**

### 🔧 **1. Archivo Principal del Servidor PLC**
**📂 Ruta**: `src/servers/plc-server.js`
**🔄 Cambios**:
- ✅ Validación de entrada estricta (líneas ~335-355)
- ✅ Validación post-procesamiento (líneas ~370-390)  
- ✅ Validación contador hexadecimal (líneas ~403-421)
- ✅ Validación cruzada GS1 ↔ Memoria 2 (líneas ~423-453)
- ❌ **CRÍTICO**: Sin estos cambios, seguirán las inconsistencias RFID

### 🛠️ **2. Utilidades ZPL (Problema Raíz)**
**📂 Ruta**: `src/utils/zpl-utils.js`
**🔄 Cambios**:
- ✅ Regex mejorado SOLO para Memoria 2 (líneas ~260-320)
- 🔒 Memoria 1 FIJA: `^RFW,H,1,2,1^FD4000^FS` (NO se modifica)
- ✅ Actualiza Memoria 2: `^RFW,H,2,16,1^FDAD...^FS` (contador)
- ❌ **CRÍTICO**: Sin esto, Memoria 2 seguirá con contador incorrecto

---

## 📋 **ARCHIVOS DE RESPALDO RECOMENDADOS**

### 🔄 **3. Respaldo del Servidor PLC (Opcional)**
**📂 Ruta**: `src/servers/plc-server.js.emergency-backup`
**🔄 Acción**: Actualizar si se usa como referencia

---

## 🚨 **VERIFICACIONES ANTES DE APLICAR**

### ✅ **Comandos de Verificación en IoT**

```bash
# 1. Verificar archivo actual en IoT
cat src/servers/plc-server.js | grep -n "VALIDACIÓN DE ENTRADA ESTRICTA"

# 2. Verificar función ZPL actual
cat src/utils/zpl-utils.js | grep -n "Memoria 2 (16 bytes)"

# 3. Verificar proceso en ejecución
ps aux | grep node | grep tcp

# 4. Backup antes de actualizar
cp src/servers/plc-server.js src/servers/plc-server.js.backup-$(date +%Y%m%d-%H%M%S)
cp src/utils/zpl-utils.js src/utils/zpl-utils.js.backup-$(date +%Y%m%d-%H%M%S)
```

---

## 🔧 **PROCEDIMIENTO DE ACTUALIZACIÓN**

### **Paso 1: Preparación**
```bash
# Detener servicio actual
sudo systemctl stop tcp-label-transfer

# Crear backup completo
sudo tar -czf /tmp/backup-pre-rfid-fix-$(date +%Y%m%d-%H%M%S).tar.gz /opt/iot2050-label-transfer-system/
```

### **Paso 2: Actualizar Archivos**
```bash
# Copiar archivos modificados
scp src/servers/plc-server.js root@IOT_IP:/opt/iot2050-label-transfer-system/src/servers/
scp src/utils/zpl-utils.js root@IOT_IP:/opt/iot2050-label-transfer-system/src/utils/
```

### **Paso 3: Verificación y Reinicio**
```bash
# Verificar sintaxis
cd /opt/iot2050-label-transfer-system
node -c src/servers/plc-server.js
node -c src/utils/zpl-utils.js

# Reiniciar servicio
sudo systemctl start tcp-label-transfer
sudo systemctl status tcp-label-transfer
```

---

## 🧪 **TESTING POST-ACTUALIZACIÓN**

### **Test 1: Validación de Entrada**
```json
// Enviar CMD 11 sin etiquetas RFID disponibles
{"cmd": 11, "counter": "1", "messageId": 999}
// Esperado: Error "NO_RFID_DATA_AVAILABLE"
```

### **Test 2: Validación Hexadecimal**
```json
// Con etiqueta RFID válida
{"cmd": 11, "counter": "3", "messageId": 1000}
// Esperado: Success + logs "Contador 003 encontrado X vez(es)"
```

### **Test 3: Verificación Memoria Dual**
```bash
# Revisar logs para confirmar actualización de ambas memorias
tail -f /var/log/tcp-label-transfer.log | grep "Memoria [12]"
```

---

## 📊 **LOGS ESPERADOS POST-ACTUALIZACIÓN**

### ✅ **Logs Exitosos**
```
[PLC] 🏷️ CMD 11: Usando última etiqueta RFID - Validación inicial exitosa
[SERVER] 🔧 Memoria 1 (2 bytes): 4000 → 0003
[SERVER] 🔧 Memoria 2 (16 bytes): 005 → 003
[PLC] ✅ VALIDACIÓN HEXADECIMAL EXITOSA: Contador 003 encontrado 2 vez(es)
[PLC] ✅ TODAS LAS VALIDACIONES EXITOSAS: 2 comandos RFID procesados correctamente
```

### ❌ **Logs de Error (Esperados para casos inválidos)**
```
[PLC] ❌ CMD 11 RECHAZADO: No hay etiquetas RFID disponibles
[PLC] ❌ VALIDACIÓN HEXADECIMAL FALLÓ: Contador 003 (hex: 003) no encontrado
[PLC] ❌ INCONSISTENCIA DETECTADA: 2 comandos RFID originales vs 1 procesados
```

---

## 🔒 **ROLLBACK EN CASO DE EMERGENCIA**

```bash
# Restaurar archivos originales
sudo systemctl stop tcp-label-transfer
cp src/servers/plc-server.js.backup-YYYYMMDD-HHMMSS src/servers/plc-server.js
cp src/utils/zpl-utils.js.backup-YYYYMMDD-HHMMSS src/utils/zpl-utils.js
sudo systemctl start tcp-label-transfer
```

---

## 📞 **CONTACTO EN CASO DE PROBLEMAS**

- **Log crítico**: `/var/log/tcp-label-transfer.log`
- **Comando de estado**: `sudo systemctl status tcp-label-transfer`
- **Puerto PLC**: `5000` (verificar con `netstat -tlnp | grep 5000`)

---

**⚠️ IMPORTANTE**: Realizar actualización en horario de baja actividad productiva 