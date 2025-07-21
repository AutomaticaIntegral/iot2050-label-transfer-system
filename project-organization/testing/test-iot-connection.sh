#!/bin/bash

# Script para probar conexión al IoT2050
# Cliente: ADISSEO - Automática Integral

echo "🔍 PRUEBA DE CONEXIÓN AL IOT2050"
echo "=" $(printf '=%.0s' {1..50})

# Cargar configuración
if [ -f "./iot-config.sh" ]; then
    source ./iot-config.sh >/dev/null 2>&1
else
    echo "❌ Error: No se encuentra iot-config.sh"
    exit 1
fi

echo "📡 Probando conexión a: $IOT_IP"
echo ""

# Test 1: Ping
echo "🏓 Test 1: Ping..."
if ping -c 3 -W 2 $IOT_IP >/dev/null 2>&1; then
    echo "✅ Ping OK - IoT2050 responde"
else
    echo "❌ Ping FALLÓ - IoT2050 no responde"
    echo "🔧 Verifica:"
    echo "   - IP correcta en iot-config.sh"
    echo "   - IoT2050 encendido"
    echo "   - Red conectada"
    exit 1
fi

# Test 2: SSH
echo "🔐 Test 2: Conexión SSH..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes $IOT_USER@$IOT_IP "echo 'SSH OK'" >/dev/null 2>&1; then
    echo "✅ SSH OK - Autenticación correcta"
else
    echo "❌ SSH FALLÓ - Problema de autenticación"
    echo "🔧 Verifica:"
    echo "   - Credenciales SSH correctas"
    echo "   - Usuario: $IOT_USER"
    echo "   - Claves SSH configuradas"
    echo ""
    echo "📋 Para configurar SSH sin password:"
    echo "   ssh-copy-id $IOT_USER@$IOT_IP"
    exit 1
fi

# Test 3: Aplicación
echo "📁 Test 3: Aplicación IoT..."
if ssh $IOT_USER@$IOT_IP "[ -d $IOT_APP_PATH ]"; then
    echo "✅ Aplicación encontrada en: $IOT_APP_PATH"
else
    echo "❌ Aplicación NO ENCONTRADA en: $IOT_APP_PATH"
    echo "🔧 Verifica la ruta de instalación"
fi

# Test 4: Servicio
echo "⚙️ Test 4: Servicio systemd..."
SERVICE_STATUS=$(ssh $IOT_USER@$IOT_IP "systemctl is-active $IOT_SERVICE" 2>/dev/null)
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
echo "📋 Si hay errores, revisa la configuración en: iot-config.sh" 