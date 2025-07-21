# 🔍 GUÍA DE DESCUBRIMIENTO IOT ONLINE - ADISSEO

**Cliente:** Adisseo  
**Problema:** Sincronización RFID alternada (una bien, una mal)  
**Objetivo:** Identificar procesos activos y archivos ejecutándose  
**Fecha:** $(date)  

---

## 📋 INFORMACIÓN PREVIA

- **Ruta aplicación:** `/opt/tcp-label-transfer`
- **Puertos esperados:** 9200 (PLC), 9110 (Server), 3001 (Web)
- **Problema:** Etiquetas RFID con mismo GS1 pero memoria RFID diferente

---

## 🚀 SECUENCIA DE COMANDOS SSH

### **PASO 1: INFORMACIÓN GENERAL DEL SISTEMA**

```bash
# 1.1 Información básica del sistema
echo "=== INFORMACIÓN DEL SISTEMA ==="
uname -a
date
uptime
echo ""
```

**📝 Resultado PASO 1:**
```
[PEGAR AQUÍ EL RESULTADO]
```
=== INFORMACIÓN DEL SISTEMA ===
Linux iot2050-debian 5.10.104-cip3 #1 SMP PREEMPT Thu Oct 20 08:51:46 UTC 2022 aarch64 GNU/Linux
Fri 18 Jul 2025 01:16:58 PM CEST
 13:16:58 up  4:33,  2 users,  load average: 0.07, 0.03, 0.00


---

### **PASO 2: PROCESOS NODE.JS ACTIVOS**

```bash
# 2.1 Todos los procesos Node.js
echo "=== PROCESOS NODE.JS ACTIVOS ==="
ps auxww | grep node | grep -v grep
echo ""

# 2.2 Contar procesos Node.js
echo "=== CANTIDAD DE PROCESOS NODE ==="
echo "Total procesos Node.js: $(ps aux | grep node | grep -v grep | wc -l)"
echo ""

# 2.3 Procesos específicos tcp-label
echo "=== PROCESOS TCP-LABEL ESPECÍFICOS ==="
ps auxww | grep tcp-label | grep -v grep
echo ""
```

**📝 Resultado PASO 2:**
```
[=== PROCESOS NODE.JS ACTIVOS ===
root         495  0.1 12.0 1226220 114436 ?      Ssl  08:43   0:25 node-red
root         505  0.2  6.2 764224 59724 ?        Ssl  08:43   0:35 /usr/bin/node /opt/tcp-label-transfer/index.js

=== CANTIDAD DE PROCESOS NODE ===
Total procesos Node.js: 2

=== PROCESOS TCP-LABEL ESPECÍFICOS ===
root         505  0.2  6.2 764224 59724 ?        Ssl  08:43   0:35 /usr/bin/node /opt/tcp-label-transfer/index.js]
```




---

### **PASO 3: PUERTOS Y CONEXIONES DE RED**

```bash
# 3.1 Puertos en uso por la aplicación
echo "=== PUERTOS EN USO ==="
ss -tulpn | egrep ':(9200|9110|3001)'
echo ""

# 3.2 Verificar puertos específicos
echo "=== VERIFICACIÓN PUERTOS ESPECÍFICOS ==="
echo "Puerto 9200 (PLC):"
lsof -i :9200 2>/dev/null || echo "Puerto 9200 libre"
echo "Puerto 9110 (Server):"
lsof -i :9110 2>/dev/null || echo "Puerto 9110 libre"
echo "Puerto 3001 (Web):"
lsof -i :3001 2>/dev/null || echo "Puerto 3001 libre"
echo ""

# 3.3 Todas las conexiones Node.js
echo "=== CONEXIONES NODE.JS ==="
netstat -tulpn | grep node
echo ""
```

**📝 Resultado PASO 3:**
```
=== VERIFICACIÓN PUERTOS ESPECÍFICOS ===
Puerto 9200 (PLC):
Puerto 9200 libre
Puerto 9110 (Server):
Puerto 9110 libre
Puerto 3001 (Web):
Puerto 3001 libre

=== CONEXIONES NODE.JS ===
tcp        0      0 0.0.0.0:9200            0.0.0.0:*               LISTEN      505/node
tcp        0      0 0.0.0.0:1880            0.0.0.0:*               LISTEN      495/node-red
tcp        0      0 0.0.0.0:3001            0.0.0.0:*               LISTEN      505/node
tcp        0      0 0.0.0.0:9100            0.0.0.0:*               LISTEN      505/node
```

---




---

### **PASO 4: EXPLORACIÓN DEL DIRECTORIO DE APLICACIÓN**

```bash
# 4.1 Ir al directorio de la aplicación
cd /opt/tcp-label-transfer

# 4.2 Estructura de archivos principales
echo "=== ESTRUCTURA DE ARCHIVOS PRINCIPALES ==="
ls -la
echo ""

# 4.3 Buscar todos los archivos plc-server
echo "=== ARCHIVOS PLC-SERVER ENCONTRADOS ==="
find . -name "*plc-server*" -type f
echo ""

# 4.4 Verificar archivos con permisos de ejecución
echo "=== ARCHIVOS JAVASCRIPT EJECUTABLES ==="
find . -name "*.js" -executable | head -20
echo ""
```

**📝 Resultado PASO 4:**
```
[=== ESTRUCTURA DE ARCHIVOS PRINCIPALES ===
total 2572
drwxr-xr-x 12 root root    4096 Jul  4 00:38 .
drwxr-xr-x  7 root root    4096 Jul  4 15:46 ..
drwxr-xr-x  2 root root    4096 May 26 19:47 backup
-rwxr-xr-x  1 root root    3840 Jun  6 10:56 check-system.js
drwxr-xr-x  2 root root    4096 May 26 19:47 config
-rwxr-xr-x  1 root root      80 Jun  6 10:56 counter.json
drwxrwxrwx  4 root root    4096 Jul 18 12:16 data
-rw-r--r--  1 root root    1920 Jun 25 23:15 debug-cmd81.js
-rw-r--r--  1 root root    2995 Jun 25 23:16 debug-cmd-types.js
-rwxr-xr-x  1 root root    2010 May 26 10:19 debug-servers.js
-rw-r--r--  1 root root    2923 Jun 25 23:15 debug-updatecounter.js
drwxr-xr-x  2 root root    4096 May 26 19:47 docs
-rwxr-xr-x  1 root root    1634 Jun 19 15:58 .env
-rwxr-xr-x  1 root root    1592 Jun 11 15:56 env.local
-rwxr-xr-x  1 root root    1634 Jun 19 00:36 env.production
-rwxr-xr-x  1 root root    4044 May 26 10:19 GUIA-RAPIDA.md
-rwxr-xr-x  1 root root     474 Jun  6 10:56 index.js
-rwxr-xr-x  1 root root    7183 Jun  6 10:56 labels.json
drwxrwxrwx  2 root root    4096 May 26 01:13 logs
drwxr-xr-x 83 root root    4096 Jun 19 16:00 node_modules
-rwxr-xr-x  1 root root     527 Jun 19 16:00 package.json
-rwxr-xr-x  1 root root   91061 Jun 19 16:00 package-lock.json
-rw-r--r--  1 root root   23338 Jul  4 00:38 plc-server.js
-rw-r--r--  1 root root 2342122 Jun 25 23:21 process.log
drwxr-xr-x  2 root root    4096 Jun 19 17:37 public
-rwxr-xr-x  1 root root    2244 Jun 19 19:57 quick-rfid-test.js
-rwxr-xr-x  1 root root    5099 May 26 14:50 README.md
drwxrwxrwx  2 root root    4096 Jun 19 15:17 received_files
-rwxr-xr-x  1 root root    2050 May 26 10:19 simple-hybrid-server.js
-rw-r--r--  1 root root    2711 Jun 23 11:45 simulate-adi-normal.js
drwxr-xr-x  6 root root    4096 Jun 19 15:18 src
-rwxr-xr-x  1 root root     666 Jun  6 10:56 start-server.js
-rw-r--r--  1 root root    4562 Jun 25 23:08 test-plc-commands.js
-rwxr-xr-x  1 root root    1565 Jun 19 17:08 test-product-printer.js
-rwxr-xr-x  1 root root    2739 Jun 25 17:11 test-rfid-custom.js
-rw-r--r--  1 root root    2847 Jul  4 00:38 test-rfid-sync.js
drwxr-xr-x  2 root root    4096 May 26 19:47 tests
-rwxr-xr-x  1 root root    1433 May 26 10:19 test-system.js
-rw-r--r--  1 root root   11481 Jul  4 00:38 zpl-utils.js

=== ARCHIVOS PLC-SERVER ENCONTRADOS ===
./plc-server.js
./src/servers/plc-server.js.backup
./src/servers/plc-server.js
./src/servers/plc-server.js.emergency-backup
./src/servers/plc-server.jsX8103306s.Iot

=== ARCHIVOS JAVASCRIPT EJECUTABLES ===
./tests/test-cmd10-standard.js
./tests/test-cmd1-rfid.js
./tests/test-send-labels.js
./quick-rfid-test.js
./debug-servers.js
./node_modules/ipaddr.js
./node_modules/ipaddr.js/lib/ipaddr.js
./node_modules/ipaddr.js/ipaddr.min.js
./node_modules/dotenv/config.js
./node_modules/dotenv/lib/main.js
./node_modules/dotenv/lib/cli-options.js
./node_modules/dotenv/lib/env-options.js
./node_modules/es-errors/test/index.js
./node_modules/es-errors/eval.js
./node_modules/es-errors/ref.js
./node_modules/es-errors/type.js
./node_modules/es-errors/range.js
./node_modules/es-errors/index.js
./node_modules/es-errors/syntax.js
./node_modules/es-errors/uri.js]
```


---

### **PASO 5: SERVICIOS SYSTEMD**

```bash
# 5.1 Servicios relacionados con tcp
echo "=== SERVICIOS SYSTEMD TCP ==="
systemctl list-units | grep tcp
echo ""

# 5.2 Servicios habilitados
echo "=== SERVICIOS HABILITADOS ==="
systemctl list-unit-files --state=enabled | grep -i tcp
echo ""

# 5.3 Estado de servicios activos
echo "=== ESTADO SERVICIOS ACTIVOS ==="
systemctl status | grep -i tcp || echo "No hay servicios tcp activos"
echo ""
```

**📝 Resultado PASO 5:**
```
=== SERVICIOS SYSTEMD TCP ===
  tcp-label-transfer.service                                                                                                                                                   loaded active running   TCP Label Transfer IOT Service

=== SERVICIOS HABILITADOS ===
tcp-label-transfer.service         enabled enabled

=== ESTADO SERVICIOS ACTIVOS ===
           │     └─14422 grep -i tcp
             ├─tcp-label-transfer.service
             │ └─505 /usr/bin/node /opt/tcp-label-transfer/index.js

```

---

### **PASO 6: ARCHIVOS DE CONFIGURACIÓN**

```bash
# 6.1 Archivo package.json
echo "=== PACKAGE.JSON - SCRIPTS ==="
cat package.json | jq .scripts 2>/dev/null || grep -A10 '"scripts"' package.json
echo ""

# 6.2 Archivos de inicio
echo "=== ARCHIVOS DE INICIO ==="
ls -la start* index* main* 2>/dev/null || echo "No hay archivos de inicio estándar"
echo ""

# 6.3 Variables de entorno
echo "=== ARCHIVOS DE ENTORNO ==="
ls -la env* .env* 2>/dev/null || echo "No hay archivos de entorno"
echo ""
```

**📝 Resultado PASO 6:**
```
=== PACKAGE.JSON - SCRIPTS ===
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "check": "node check-system.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.18.2",
    "socket.io": "^4.5.4"
  },

=== ARCHIVOS DE INICIO ===
-rwxr-xr-x 1 root root 474 Jun  6 10:56  index.js
-rwxr-xr-x 1 root root 666 Jun  6 10:56  start-server.js
No hay archivos de inicio estándar

=== ARCHIVOS DE ENTORNO ===
-rwxr-xr-x 1 root root 1634 Jun 19 15:58 .env
-rwxr-xr-x 1 root root 1592 Jun 11 15:56 env.local
-rwxr-xr-x 1 root root 1634 Jun 19 00:36 env.production

```

---

### **PASO 7: LOGS DEL SISTEMA**

```bash
# 7.1 Logs systemd recientes
echo "=== LOGS SYSTEMD RECIENTES ==="
journalctl -u tcp* --no-pager -n 20 2>/dev/null || echo "No hay logs systemd tcp"
echo ""

# 7.2 Logs de Node.js
echo "=== LOGS NODE.JS RECIENTES ==="
journalctl | grep node | tail -10
echo ""

# 7.3 Logs de la aplicación
echo "=== LOGS DE LA APLICACIÓN ==="
ls -la logs/ 2>/dev/null && tail -20 logs/*.log 2>/dev/null || echo "No hay directorio logs"
echo ""
```

**📝 Resultado PASO 7:**
```
=== LOGS SYSTEMD RECIENTES ===
-- Journal begins at Wed 2025-07-16 14:32:24 CEST, ends at Fri 2025-07-18 13:29:31 CEST. --
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.564Z] [SERVER] Contador normalizado: "55" → "0055"
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.564Z] [PLC] [PLC] 🔄 Contador normalizado: "55" → "0055"
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.565Z] [PLC] [PLC] 🏷️ CMD 11: Usando última etiqueta RFID
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.566Z] [PLC] [PLC] 🖨️ Enviando a impresora RFID con contador del PLC: 0055
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.566Z] [SERVER] 🔄 Actualizando ZPL completo con contador: 0055
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.567Z] [SERVER] Contador actualizado en ZPL: (21)0055
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.567Z] [SERVER] 🔄 Contador convertido: 0055 (dec) → 037 (hex)
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.568Z] [SERVER] 🔧 Actualizando memoria RFID: 001 → 037
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.569Z] [SERVER] ✅ Memoria RFID actualizada en 1 comando(s)
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.569Z] [SERVER] ✅ ZPL actualizado completamente (GS1 + RFID)
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.570Z] [PRINTER] Enviando comando ZPL a impresora rfid (10.108.220.15:9100)...
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.571Z] [SERVER] Comando ZPL guardado en /opt/tcp-label-transfer/data/zpl/zpl-1752838171570.txt
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.576Z] [PRINTER] Conexión establecida con impresora rfid
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.578Z] [PRINTER] Comando ZPL enviado a impresora rfid
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.580Z] [PLC] [PLC] ✅ Etiqueta RFID con MessageID 2245 impresa correctamente con contador PLC: 0055
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.582Z] [PRINTER] Conexión cerrada con impresora rfid
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.632Z] [PLC] Error en conexión: read ECONNRESET
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.634Z] [PLC] Conexión cerrada
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.634Z] [PLC] Conexión 2251 eliminada del registro
Jul 18 13:29:31 iot2050-debian tcp-label-transfer[505]: [2025-07-18T11:29:31.661Z] [PLC] Emitiendo evento específico para comando 11

=== LOGS NODE.JS RECIENTES ===
Jul 18 08:44:58 iot2050-debian tailscaled[247]: control: RegisterReq: onode= node=[eV6t3] fup=false nks=false
Jul 18 08:44:58 iot2050-debian tailscaled[247]: control: RegisterReq: got response; nodeKeyExpired=false, machineAuthorized=true; authURL=false
Jul 18 11:26:43 iot2050-debian tailscaled[247]: magicsock: disco: node [oLDNX] d:0d0625c7016ebc13 now using 2.136.99.135:41641 mtu=1360 tx=57968ff75545

=== LOGS DE LA APLICACIÓN ===
total 8
drwxrwxrwx  2 root root 4096 May 26 01:13 .
drwxr-xr-x 12 root root 4096 Jul  4 00:38 ..
No hay directorio logs

```

---

### **PASO 8: VERIFICACIÓN DE ARCHIVOS CRÍTICOS**

```bash
# 8.1 Verificar archivos plc-server específicos
echo "=== CONTENIDO DE ARCHIVOS PLC-SERVER ==="
echo "--- plc-server.js (líneas 1-10) ---"
head -10 plc-server.js 2>/dev/null || echo "No existe plc-server.js"
echo ""

echo "--- src/servers/plc-server.js (líneas 1-10) ---"
head -10 src/servers/plc-server.js 2>/dev/null || echo "No existe src/servers/plc-server.js"
echo ""

echo "--- src/servers/plc-server.jsX8103306s.Iot (líneas 1-10) ---"
head -10 src/servers/plc-server.jsX8103306s.Iot 2>/dev/null || echo "No existe plc-server.jsX8103306s.Iot"
echo ""

# 8.2 Verificar imports en archivos críticos
echo "=== IMPORTS EN ARCHIVOS CRÍTICOS ==="
echo "--- Imports plc-server.js ---"
grep -n "require.*zpl-utils" plc-server.js 2>/dev/null || echo "No encontrado"
echo "--- Imports src/servers/plc-server.js ---"
grep -n "require.*zpl-utils" src/servers/plc-server.js 2>/dev/null || echo "No encontrado"
echo ""
```

**📝 Resultado PASO 8:**
```
=== CONTENIDO DE ARCHIVOS PLC-SERVER ===
--- plc-server.js (líneas 1-10) ---
/**
 * Servidor TCP para comunicación con PLC
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const { log } = require('../utils/logger');
const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
const { printToProductPrinter, printToRfidPrinter } = require('../services/printer-service');

--- src/servers/plc-server.js (líneas 1-10) ---
/**
 * Servidor TCP para comunicación con PLC
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const { log } = require('../utils/logger');
const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
const { printToProductPrinter, printToRfidPrinter } = require('../services/printer-service');

--- src/servers/plc-server.jsX8103306s.Iot (líneas 1-10) ---
/**
 * Servidor TCP para comunicación con PLC
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const { log } = require('../utils/logger');
const { updateCounterInZpl, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
const { printToProductPrinter, printToRfidPrinter } = require('../services/printer-service');

=== IMPORTS EN ARCHIVOS CRÍTICOS ===
--- Imports plc-server.js ---
9:const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
--- Imports src/servers/plc-server.js ---
9:const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');

```

---

### **PASO 9: DIAGNÓSTICO DE FUNCIÓN RFID**

```bash
# 9.1 Verificar función updateCounterAndRfidMemory
echo "=== VERIFICACIÓN FUNCIÓN updateCounterAndRfidMemory ==="
echo "--- En plc-server.js ---"
grep -n "updateCounterAndRfidMemory" plc-server.js 2>/dev/null || echo "No encontrada"
echo "--- En src/servers/plc-server.js ---"
grep -n "updateCounterAndRfidMemory" src/servers/plc-server.js 2>/dev/null || echo "No encontrada"
echo "--- En src/servers/plc-server.jsX8103306s.Iot ---"
grep -n "updateCounterAndRfidMemory" src/servers/plc-server.jsX8103306s.Iot 2>/dev/null || echo "No encontrada"
echo ""

# 9.2 Verificar función updateCounterInZpl (incorrecta)
echo "=== VERIFICACIÓN FUNCIÓN updateCounterInZpl (INCORRECTA) ==="
echo "--- En plc-server.js ---"
grep -n "updateCounterInZpl.*normalizedCounter" plc-server.js 2>/dev/null || echo "No encontrada"
echo "--- En src/servers/plc-server.jsX8103306s.Iot ---"
grep -n "updateCounterInZpl.*normalizedCounter" src/servers/plc-server.jsX8103306s.Iot 2>/dev/null || echo "No encontrada"
echo ""
```

**📝 Resultado PASO 9:**
```
=== VERIFICACIÓN FUNCIÓN updateCounterAndRfidMemory ===
--- En plc-server.js ---
9:const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
351:      const updatedZpl = updateCounterAndRfidMemory(originalZplCommand, normalizedCounter);
--- En src/servers/plc-server.js ---
9:const { updateCounterInZpl, updateCounterAndRfidMemory, validatePlcCounter, normalizeCounter } = require('../utils/zpl-utils');
351:      const updatedZpl = updateCounterAndRfidMemory(originalZplCommand, normalizedCounter);
--- En src/servers/plc-server.jsX8103306s.Iot ---
No encontrada

=== VERIFICACIÓN FUNCIÓN updateCounterInZpl (INCORRECTA) ===
--- En plc-server.js ---
229:      const updatedZpl = updateCounterInZpl(originalZplCommand, normalizedCounter);
--- En src/servers/plc-server.jsX8103306s.Iot ---
227:      const updatedZpl = updateCounterInZpl(originalZplCommand, normalizedCounter);
349:      const updatedZpl = updateCounterInZpl(originalZplCommand, normalizedCounter);

```

---

### **PASO 10: PROCESOS EN TIEMPO REAL**

```bash
# 10.1 Monitor de procesos en tiempo real (5 segundos)
echo "=== MONITOR PROCESOS TIEMPO REAL ==="
echo "Monitoreando procesos Node.js durante 5 segundos..."
for i in {1..5}; do
    echo "--- Segundo $i ---"
    ps aux | grep node | grep -v grep | wc -l
    sleep 1
done
echo ""

# 10.2 Verificar si hay balanceador de carga
echo "=== VERIFICACIÓN BALANCEADOR DE CARGA ==="
ps aux | grep -i nginx | grep -v grep || echo "No hay nginx"
ps aux | grep -i apache | grep -v grep || echo "No hay apache"
ps aux | grep -i haproxy | grep -v grep || echo "No hay haproxy"
ps aux | grep -i pm2 | grep -v grep || echo "No hay pm2"
echo ""
```

**📝 Resultado PASO 10:**
```
=== MONITOR PROCESOS TIEMPO REAL ===
Monitoreando procesos Node.js durante 5 segundos...
--- Segundo 1 ---
2
--- Segundo 2 ---
2
--- Segundo 3 ---
2
--- Segundo 4 ---
2
--- Segundo 5 ---
2

=== VERIFICACIÓN BALANCEADOR DE CARGA ===
No hay nginx
No hay apache
No hay haproxy
No hay pm2

```

---

## 🎯 COMANDO DE DIAGNÓSTICO COMPLETO

Para ejecutar todo de una vez, copia y pega este bloque:

```bash
#!/bin/bash
echo "🔍 DIAGNÓSTICO COMPLETO IOT ADISSEO - $(date)"
echo "=" $(printf '=%.0s' {1..70})

# Función para separar secciones
function seccion() { echo ""; echo "### $1 ###"; echo ""; }

cd /opt/tcp-label-transfer 2>/dev/null || cd /

seccion "1. INFORMACIÓN SISTEMA"
uname -a && uptime

seccion "2. PROCESOS NODE.JS"
ps auxww | grep node | grep -v grep
echo "Total: $(ps aux | grep node | grep -v grep | wc -l) procesos"

seccion "3. PUERTOS EN USO"
ss -tulpn | egrep ':(9200|9110|3001)'

seccion "4. ARCHIVOS PLC-SERVER"
find /opt/tcp-label-transfer -name "*plc-server*" -type f 2>/dev/null

seccion "5. SERVICIOS SYSTEMD"
systemctl list-units | grep tcp

seccion "6. FUNCIÓN RFID - CORRECTA"
grep -rn "updateCounterAndRfidMemory.*normalizedCounter" /opt/tcp-label-transfer/ 2>/dev/null | head -5

seccion "7. FUNCIÓN RFID - INCORRECTA"
grep -rn "updateCounterInZpl.*normalizedCounter" /opt/tcp-label-transfer/ 2>/dev/null | head -5

seccion "8. LOGS RECIENTES"
journalctl | grep tcp-label | tail -5 || echo "No hay logs tcp-label"

echo ""; echo "🔍 DIAGNÓSTICO COMPLETADO - $(date)"
```

---

## 📊 ANÁLISIS DE RESULTADOS

Después de ejecutar los comandos, analizar:

### ✅ **SITUACIÓN NORMAL:**
- **1 solo proceso** Node.js ejecutándose
- **Archivo correcto** (`plc-server.js` o `src/servers/plc-server.js`)
- **Función correcta** `updateCounterAndRfidMemory` en uso
- **Puertos únicos** sin duplicados

### 🚨 **SITUACIÓN PROBLEMÁTICA:**
- **Múltiples procesos** Node.js ejecutándose
- **Archivo incorrecto** (`plc-server.jsX8103306s.Iot`) ejecutándose
- **Función incorrecta** `updateCounterInZpl` en uso
- **Puertos duplicados** o conflictos

---

## 🛠️ ACCIONES SEGÚN RESULTADOS

### **Si hay múltiples procesos:**
```bash
# Parar todos los procesos Node.js
sudo pkill node
# Verificar que no quede ninguno
ps aux | grep node
```

### **Si archivo incorrecto está ejecutándose:**
```bash
# Renombrar archivo problemático
sudo mv src/servers/plc-server.jsX8103306s.Iot src/servers/plc-server.jsX8103306s.Iot.DISABLED
```

### **Si hay servicios systemd duplicados:**
```bash
# Parar servicios
sudo systemctl stop [nombre-servicio]
sudo systemctl disable [nombre-servicio]
```

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

- [ ] Número de procesos Node.js identificado
- [ ] Archivos ejecutándose identificados  
- [ ] Función RFID utilizada verificada
- [ ] Puertos de red confirmados
- [ ] Servicios systemd revisados
- [ ] Logs analizados
- [ ] Causa del problema alternado identificada

**📧 Enviar resultados a soporte técnico para análisis completo.** 