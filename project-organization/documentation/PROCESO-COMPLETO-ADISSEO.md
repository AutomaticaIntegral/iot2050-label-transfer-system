# ⚡ PROCESO COMPLETO - ADISSEO IOT2050

**Cliente:** ADISSEO  
**Desarrollador:** Automática Integral  
**Problema detectado:** Sincronización RFID alternada  
**Fecha:** $(date)

---

## 🔍 **ANÁLISIS REALIZADO**

### **❌ PROBLEMA DETECTADO:**
Basándome en `@GUIA-DESCUBRIMIENTO-IOT-ONLINE.md` y `@cleanup-production-safe.sh`:

**🗂️ Archivos conflictivos encontrados:**
```
./plc-server.js                           # ❌ Raíz (función incorrecta)
./src/servers/plc-server.js               # ✅ Correcto
./src/servers/plc-server.jsX8103306s.Iot  # ❌ MUY problemático
```

**🔧 Funciones RFID detectadas:**
- ✅ `updateCounterAndRfidMemory` (correcta) - Solo en algunos archivos
- ❌ `updateCounterInZpl` (incorrecta) - Causando problemas

**⚡ Síntoma:** Etiquetas RFID alternadas (una bien, una mal)

---

## 🚀 **PROCESO CORRECTO (3 FASES)**

### **📋 FASE 1: BACKUP OBLIGATORIO**

#### **1.1 Configurar conexión:**
```bash
# Opción A: SSH sin password (RECOMENDADO)
./setup-ssh-config.sh

# Opción B: Usar password cada vez
# (usar scripts con *-with-password)
```

#### **1.2 Probar conexión:**
```bash
./test-iot-connection.sh
# O: ./test-iot-connection-with-password.sh
```

#### **1.3 Backup completo:**
```bash
./create-backup-from-iot.sh
# O: ./create-backup-with-password.sh
```

**✅ Verificar:** Archivo en `./backups/backup-iot2050-*.tar.gz`

---

### **📋 FASE 2: LIMPIEZA CRÍTICA**

#### **2.1 Ejecutar limpieza automática:**
```bash
./execute-cleanup-on-iot.sh
```

**🔧 Lo que hace:**
- ⏸️ Para servicio IoT
- 📤 Transfiere script de limpieza
- 🗑️ Elimina archivos problemáticos:
  - `plc-server.js` (raíz)
  - `plc-server.jsX8103306s.Iot`
  - `zpl-utils.js` (raíz)
- ✅ Conserva solo archivos correctos
- 🚀 Reinicia servicio

#### **2.2 Verificar limpieza:**
```bash
./test-iot-connection.sh
open http://192.168.214.50:3001
```

**⚠️ NO continuar sin verificar éxito**

---

### **📋 FASE 3: APLICAR MEJORAS**

#### **3.1 Seguir CAMBIOS-APLICAR-IOT.md:**

**Transferir archivos nuevos:**
```bash
scp public/dashboard.html root@192.168.214.50:/opt/tcp-label-transfer/public/
scp public/monitor-simple.html root@192.168.214.50:/opt/tcp-label-transfer/public/
scp public/printer-monitor.html root@192.168.214.50:/opt/tcp-label-transfer/public/
```

**Reemplazar archivos modificados:**
```bash
scp src/servers/web-server.js root@192.168.214.50:/opt/tcp-label-transfer/src/servers/
scp src/utils/file-handler.js root@192.168.214.50:/opt/tcp-label-transfer/src/utils/
scp public/main.js root@192.168.214.50:/opt/tcp-label-transfer/public/
```

**Reiniciar servicio:**
```bash
ssh root@192.168.214.50 "sudo systemctl restart tcp-label-transfer"
```

---

## 🎯 **URLs FINALES**

- **🏭 Dashboard:** `http://192.168.214.50:3001/dashboard.html`
- **🏷️ Monitor:** `http://192.168.214.50:3001/monitor-simple.html`
- **🖨️ Impresoras:** `http://192.168.214.50:3001/printer-monitor.html`

**🔐 Credenciales:** admin/admin123

---

## ⚠️ **ORDEN OBLIGATORIO**

**🚨 CRITICAL:** El orden DEBE respetarse:

1. **📦 BACKUP** (obligatorio)
2. **🧹 LIMPIEZA** (crítica - resuelve RFID)
3. **🚀 MEJORAS** (solo tras limpieza exitosa)

**❌ Aplicar mejoras SIN limpieza = problemas persisten**

---

## 🚀 **EJECUCIÓN RÁPIDA**

```bash
# 1. Backup
./create-backup-from-iot.sh

# 2. Limpieza CRÍTICA
./execute-cleanup-on-iot.sh

# 3. Verificar
./test-iot-connection.sh

# 4. Aplicar mejoras (CAMBIOS-APLICAR-IOT.md)
# Solo si la limpieza fue exitosa
```

**✅ Proceso completo: 30 minutos**  
**🎯 Resultado: Sistema IoT funcional sin problemas RFID** 