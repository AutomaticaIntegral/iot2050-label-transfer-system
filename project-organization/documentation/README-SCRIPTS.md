# 🚀 SCRIPTS PARA GESTIÓN DEL IOT2050 - ADISSEO

**Cliente:** ADISSEO  
**Desarrollador:** Automática Integral  
**Fecha:** $(date)

## 📋 ARCHIVOS CREADOS

### 🔧 **Scripts de Configuración:**
- `iot-config.sh` - Configuración centralizada de IP y variables
- `change-iot-ip.sh` - Cambiar IP fácilmente según interfaz de red
- `test-iot-connection.sh` - Probar conexión completa al IoT2050

### 📦 **Scripts de Backup:**
- `create-backup-from-iot.sh` - Backup completo del IoT2050 → Mac

---

## 🚀 USO RÁPIDO

### **1. Primera configuración:**
```bash
# Verificar configuración actual
./iot-config.sh

# Probar conexión al IoT2050
./test-iot-connection.sh
```

### **2. Si necesitas cambiar IP:**
```bash
# Cambio interactivo de IP
./change-iot-ip.sh

# Probar nueva conexión
./test-iot-connection.sh
```

### **3. Hacer backup del IoT2050:**
```bash
# Backup completo automático
./create-backup-from-iot.sh
```

---

## 📡 CONFIGURACIÓN DE IPs

### **IP ACTUAL CONFIGURADA:**
- **IP:** `192.168.214.50` (según tu información)
- **Usuario:** `root`
- **Aplicación:** `/opt/tcp-label-transfer`

### **IPs PREDEFINIDAS DISPONIBLES:**
1. **192.168.214.50** - Red actual (configurada)
2. **192.168.1.50** - Red WiFi local
3. **10.108.220.50** - Red corporativa
4. **172.16.1.50** - Red VPN
5. **192.168.0.50** - Red doméstica
6. **IP personalizada** - Introducir manualmente

### **Cambio de IP fácil:**
```bash
./change-iot-ip.sh
# Te muestra menú interactivo para seleccionar
```

---

## 🌐 URLs GENERADAS AUTOMÁTICAMENTE

Con la IP actual (`192.168.214.50`):

- **🏭 Dashboard Principal:** `http://192.168.214.50:3001/dashboard.html`
- **🏷️ Monitor Etiquetas:** `http://192.168.214.50:3001/monitor-simple.html`
- **🖨️ Monitor Impresoras:** `http://192.168.214.50:3001/printer-monitor.html`

*Las URLs se actualizan automáticamente al cambiar la IP.*

---

## 🔍 VERIFICACIÓN DE CONEXIÓN

### **Test completo automático:**
```bash
./test-iot-connection.sh
```

**Verifica:**
- ✅ Ping al IoT2050
- ✅ Conexión SSH
- ✅ Aplicación instalada
- ✅ Servicio activo
- ✅ Puertos (3001, 9200, 9100)
- ✅ Interfaz web accesible

### **Test manual rápido:**
```bash
# Ping básico
ping -c 3 192.168.214.50

# SSH directo
ssh root@192.168.214.50

# Web browser
open http://192.168.214.50:3001/dashboard.html
```

---

## 📦 BACKUP DEL IOT2050

### **Backup automático completo:**
```bash
./create-backup-from-iot.sh
```

**Lo que hace:**
1. ⏸️ Para el servicio temporalmente
2. 📦 Crea backup comprimido (sin node_modules)
3. 📋 Exporta logs y configuración
4. 🚀 Reinicia el servicio
5. 📥 Descarga todo al Mac en `./backups/`

### **Archivos de backup generados:**
- `backup-iot2050-YYYYMMDD-HHMMSS.tar.gz` - Aplicación completa
- `backup-iot2050-YYYYMMDD-HHMMSS-logs.txt` - Logs del sistema
- `backup-iot2050-YYYYMMDD-HHMMSS-system-info.txt` - Info del sistema
- `backup-iot2050-YYYYMMDD-HHMMSS-systemd.service` - Configuración servicio

### **Restaurar backup:**
```bash
# Extraer backup
tar -xzf backups/backup-iot2050-*.tar.gz

# Transferir de vuelta al IoT (si necesario)
scp -r tcp-label-transfer/ root@192.168.214.50:/opt/
```

---

## 🛠️ CONFIGURACIÓN SSH (RECOMENDADO)

Para evitar escribir password cada vez:

```bash
# Generar clave SSH (si no tienes)
ssh-keygen -t rsa -b 2048

# Copiar clave al IoT2050
ssh-copy-id root@192.168.214.50

# Probar conexión sin password
ssh root@192.168.214.50
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### **Error: "No se puede conectar"**
1. Verifica IP: `./change-iot-ip.sh`
2. Verifica red: `ping 192.168.214.50`
3. Verifica SSH: `ssh root@192.168.214.50`

### **Error: "Aplicación no encontrada"**
1. Conecta al IoT: `ssh root@192.168.214.50`
2. Verifica ruta: `ls -la /opt/tcp-label-transfer`
3. Edita config: `nano iot-config.sh`

### **Error: "Servicio no activo"**
1. Conecta al IoT: `ssh root@192.168.214.50`
2. Verificar estado: `systemctl status tcp-label-transfer`
3. Reiniciar: `systemctl restart tcp-label-transfer`

### **Cambiar IP manualmente:**
```bash
# Editar configuración directamente
nano iot-config.sh

# Cambiar esta línea:
IOT_IP="192.168.214.50"

# Por la nueva IP:
IOT_IP="TU_NUEVA_IP"
```

---

## 📋 FLUJO DE TRABAJO RECOMENDADO

### **🔄 Flujo habitual:**
1. `./test-iot-connection.sh` - Verificar conexión
2. `./create-backup-from-iot.sh` - Hacer backup
3. Aplicar cambios al IoT2050
4. Verificar funcionamiento

### **🌐 Cambio de red:**
1. `./change-iot-ip.sh` - Cambiar IP
2. `./test-iot-connection.sh` - Verificar nueva conexión
3. Continuar con el trabajo

### **📦 Antes de cambios importantes:**
```bash
# Backup completo antes de modificar
./create-backup-from-iot.sh

# Verificar que se descargó
ls -la backups/
```

---

## 🎯 PRÓXIMOS PASOS

Una vez que tengas el backup:

1. **✅ Configuración IP** - Completada
2. **✅ Scripts creados** - Listos para usar
3. **📦 Backup realizado** - Siguiente paso
4. **🚀 Aplicar cambios** - Seguir `CAMBIOS-APLICAR-IOT.md`

---

## 📞 SOPORTE

**Desarrollado por:** Automática Integral  
**Cliente:** ADISSEO  
**Proyecto:** IoT Label Transfer System

**📋 Si hay problemas:**
1. Ejecutar `./test-iot-connection.sh` y enviar resultado
2. Verificar logs: `ls -la backups/` 
3. Contactar soporte técnico con información completa

**✅ Sistema listo para gestión completa del IoT2050 desde Mac** 🚀 