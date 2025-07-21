#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE CONEXIÓN AL IOT2050 - ADISSEO
# ═══════════════════════════════════════════════════════════════
# Cliente: ADISSEO - Automática Integral
# Proyecto: IoT Label Transfer System

echo "⚙️ CONFIGURACIÓN DE CONEXIÓN AL IOT2050"

# ═══════════════════════════════════════════════════════════════
# 🌐 CONFIGURACIÓN DE IPs - MODIFICAR SEGÚN INTERFAZ
# ═══════════════════════════════════════════════════════════════

# IP ACTUAL (cambiar según la interfaz que uses)
IOT_IP="192.168.214.50"

# 📋 OTRAS IPs POSIBLES (descomenta la que uses):
# IOT_IP="192.168.1.50"      # Red local WiFi
# IOT_IP="10.108.220.50"     # Red corporativa
# IOT_IP="172.16.1.50"       # Red VPN
# IOT_IP="192.168.0.50"      # Red doméstica

# ═══════════════════════════════════════════════════════════════
# 🔧 CONFIGURACIÓN DEL SISTEMA IOT2050
# ═══════════════════════════════════════════════════════════════

# Usuario SSH (normalmente 'root' en IoT2050)
IOT_USER="root"

# Ruta de la aplicación en el IoT2050
IOT_APP_PATH="/opt/tcp-label-transfer"

# Puertos del sistema
IOT_PORT_PLC="9200"      # Puerto PLC
IOT_PORT_SERVER="9100"   # Puerto servidor interno
IOT_PORT_WEB="3001"      # Puerto interfaz web

# Servicio systemd
IOT_SERVICE="tcp-label-transfer"

# ═══════════════════════════════════════════════════════════════
# 🌐 URLs DE ACCESO (se generan automáticamente)
# ═══════════════════════════════════════════════════════════════

IOT_URL_MAIN="http://${IOT_IP}:${IOT_PORT_WEB}"
IOT_URL_DASHBOARD="http://${IOT_IP}:${IOT_PORT_WEB}/dashboard.html"
IOT_URL_MONITOR="http://${IOT_IP}:${IOT_PORT_WEB}/monitor-simple.html"
IOT_URL_PRINTER="http://${IOT_IP}:${IOT_PORT_WEB}/printer-monitor.html"

# ═══════════════════════════════════════════════════════════════
# 📋 INFORMACIÓN DE CONEXIÓN
# ═══════════════════════════════════════════════════════════════

echo ""
echo "📡 CONFIGURACIÓN ACTUAL:"
echo "   🎯 IP IoT2050: $IOT_IP"
echo "   👤 Usuario SSH: $IOT_USER"
echo "   📁 Ruta aplicación: $IOT_APP_PATH"
echo "   🔧 Servicio: $IOT_SERVICE"
echo ""
echo "🌐 URLs DE ACCESO:"
echo "   🏭 Dashboard: $IOT_URL_DASHBOARD"
echo "   🏷️ Monitor Etiquetas: $IOT_URL_MONITOR"
echo "   🖨️ Monitor Impresoras: $IOT_URL_PRINTER"
echo ""
echo "⚙️ Para cambiar la IP, edita este archivo: nano iot-config.sh"
echo "✅ Configuración cargada correctamente"

# ═══════════════════════════════════════════════════════════════
# 🔍 FUNCIÓN DE VERIFICACIÓN DE CONEXIÓN
# ═══════════════════════════════════════════════════════════════

function test_iot_connection() {
    echo "🔍 Probando conexión a IoT2050..."
    echo "📡 IP: $IOT_IP"
    
    # Test ping
    if ping -c 1 -W 3 $IOT_IP >/dev/null 2>&1; then
        echo "✅ Ping OK"
    else
        echo "❌ Ping FALLÓ - verificar IP/red"
        return 1
    fi
    
    # Test SSH
    if ssh -o ConnectTimeout=5 -o BatchMode=yes $IOT_USER@$IOT_IP "echo 'SSH OK'" >/dev/null 2>&1; then
        echo "✅ SSH OK"
    else
        echo "❌ SSH FALLÓ - verificar credenciales"
        return 1
    fi
    
    # Test puerto web
    if nc -z -w 3 $IOT_IP $IOT_PORT_WEB >/dev/null 2>&1; then
        echo "✅ Puerto web ($IOT_PORT_WEB) OK"
    else
        echo "⚠️ Puerto web ($IOT_PORT_WEB) no responde"
    fi
    
    echo "🎯 Conexión verificada correctamente"
    return 0
}

# ═══════════════════════════════════════════════════════════════
# 🚀 EXPORTAR VARIABLES PARA OTROS SCRIPTS
# ═══════════════════════════════════════════════════════════════

export IOT_IP
export IOT_USER
export IOT_APP_PATH
export IOT_SERVICE
export IOT_URL_DASHBOARD
export IOT_URL_MONITOR
export IOT_URL_PRINTER 