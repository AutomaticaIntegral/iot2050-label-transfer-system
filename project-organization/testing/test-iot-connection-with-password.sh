#!/bin/bash

# Script para probar conexión al IoT2050 CON PASSWORD
# Cliente: ADISSEO - Automática Integral

echo "🔍 PRUEBA DE CONEXIÓN AL IOT2050 (CON PASSWORD)"
echo "=" $(printf '=%.0s' {1..60})

# Cargar configuración
if [ -f "./iot-config.sh" ]; then
    source ./iot-config.sh >/dev/null 2>&1
else
    echo "❌ Error: No se encuentra iot-config.sh"
    exit 1
fi

echo "📡 Probando conexión a: $IOT_IP"
echo "👤 Usuario: $IOT_USER"
echo ""

# Test 1: Ping
echo "🏓 Test 1: Ping..."
if ping -c 3 -W 2 $IOT_IP >/dev/null 2>&1; then
    echo "✅ Ping OK - IoT2050 responde"
else
    echo "❌ Ping FALLÓ - IoT2050 no responde"
    echo "🔧 Verifica:"
    echo "   - IP correcta en iot-config.sh: $IOT_IP"
    echo "   - IoT2050 encendido"
    echo "   - Red conectada"
    exit 1
fi

# Test 2: SSH (SIN BatchMode para permitir password)
echo "🔐 Test 2: Conexión SSH..."
echo "⚠️ Te pedirá el password de root del IoT2050:"

if ssh -o ConnectTimeout=10 $IOT_USER@$IOT_IP "echo 'SSH OK - Conectado correctamente'"; then
    echo "✅ SSH OK - Autenticación correcta"
else
    echo "❌ SSH FALLÓ - Problema de autenticación"
    echo "🔧 Verifica:"
    echo "   - Credenciales correctas"
    echo "   - Usuario: $IOT_USER"
    echo "   - Password de root"
    echo ""
    echo "💡 Para evitar escribir password cada vez:"
    echo "   ./setup-ssh-config.sh"
    exit 1
fi

# Test 3: Aplicación
echo "📁 Test 3: Aplicación IoT..."
if ssh -o ConnectTimeout=10 $IOT_USER@$IOT_IP "[ -d $IOT_APP_PATH ]"; then
    echo "✅ Aplicación encontrada en: $IOT_APP_PATH"
else
    echo "❌ Aplicación NO ENCONTRADA en: $IOT_APP_PATH"
    echo "🔧 Verifica la ruta de instalación"
fi

# Test 4: Servicio
echo "⚙️ Test 4: Servicio systemd..."
SERVICE_STATUS=$(ssh -o ConnectTimeout=10 $IOT_USER@$IOT_IP "systemctl is-active $IOT_SERVICE" 2>/dev/null)
if [ "$SERVICE_STATUS" = "active" ]; then
    echo "✅ Servicio ACTIVO: $IOT_SERVICE"
else
    echo "⚠️ Servicio NO ACTIVO: $IOT_SERVICE (Estado: $SERVICE_STATUS)"
fi

# Test 5: Puertos
echo "🌐 Test 5: Puertos de red..."
for port in $IOT_PORT_WEB $IOT_PORT_PLC $IOT_PORT_SERVER; do
    if nc -z -w 3 $IOT_IP $port >/dev/null 2>&1; then
        echo "✅ Puerto $port: OK"
    else
        echo "⚠️ Puerto $port: No responde"
    fi
done

# Test 6: URLs
echo "🔗 Test 6: URLs del sistema..."
if curl -s --connect-timeout 5 $IOT_URL_MAIN >/dev/null 2>&1; then
    echo "✅ Interfaz web accesible"
else
    echo "⚠️ Interfaz web no accesible"
fi

echo ""
echo "🎯 RESUMEN DE CONEXIÓN:"
echo "   🌐 URLs disponibles:"
echo "      🏭 Dashboard: $IOT_URL_DASHBOARD"
echo "      🏷️ Monitor: $IOT_URL_MONITOR"
echo "      🖨️ Impresoras: $IOT_URL_PRINTER"
echo ""
echo "✅ Prueba de conexión completada"
echo ""
echo "💡 SIGUIENTE PASO:"
echo "   🔐 Configurar SSH sin password: ./setup-ssh-config.sh"
echo "   📦 O hacer backup: ./create-backup-from-iot.sh" 