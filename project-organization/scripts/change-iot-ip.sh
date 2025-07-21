#!/bin/bash

# Script para cambiar IP del IoT2050 fácilmente
# Cliente: ADISSEO - Automática Integral

echo "🔧 CAMBIAR IP DEL IOT2050"
echo "=" $(printf '=%.0s' {1..50})

# Verificar que existe el archivo de configuración
if [ ! -f "./iot-config.sh" ]; then
    echo "❌ Error: No se encuentra iot-config.sh"
    exit 1
fi

# Mostrar IP actual
source ./iot-config.sh >/dev/null 2>&1
echo "📡 IP actual: $IOT_IP"
echo ""

# Mostrar opciones predefinidas
echo "📋 IPs PREDEFINIDAS:"
echo "   1) 192.168.214.50  (Red actual)"
echo "   2) 192.168.1.50    (Red WiFi local)"
echo "   3) 10.108.220.50   (Red corporativa)"
echo "   4) 172.16.1.50     (Red VPN)"
echo "   5) 192.168.0.50    (Red doméstica)"
echo "   6) Introducir IP personalizada"
echo ""

# Pedir selección
read -p "🎯 Selecciona una opción (1-6): " OPCION

case $OPCION in
    1)
        NEW_IP="192.168.214.50"
        echo "✅ Seleccionada IP: $NEW_IP (Red actual)"
        ;;
    2)
        NEW_IP="192.168.1.50"
        echo "✅ Seleccionada IP: $NEW_IP (Red WiFi local)"
        ;;
    3)
        NEW_IP="10.108.220.50"
        echo "✅ Seleccionada IP: $NEW_IP (Red corporativa)"
        ;;
    4)
        NEW_IP="172.16.1.50"
        echo "✅ Seleccionada IP: $NEW_IP (Red VPN)"
        ;;
    5)
        NEW_IP="192.168.0.50"
        echo "✅ Seleccionada IP: $NEW_IP (Red doméstica)"
        ;;
    6)
        read -p "🔧 Introduce la IP personalizada: " NEW_IP
        # Validar formato IP
        if [[ ! $NEW_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "❌ Error: Formato de IP inválido"
            exit 1
        fi
        echo "✅ IP personalizada: $NEW_IP"
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

# Confirmar cambio
echo ""
echo "⚠️ CONFIRMAR CAMBIO:"
echo "   📡 IP anterior: $IOT_IP"
echo "   📡 IP nueva: $NEW_IP"
echo ""
read -p "🤔 ¿Continuar con el cambio? (s/N): " CONFIRMAR

if [[ ! $CONFIRMAR =~ ^[sS]$ ]]; then
    echo "❌ Cambio cancelado"
    exit 0
fi

# Crear backup del archivo de configuración
cp iot-config.sh iot-config.sh.backup
echo "📦 Backup creado: iot-config.sh.backup"

# Realizar el cambio
sed -i '' "s/IOT_IP=\".*\"/IOT_IP=\"$NEW_IP\"/" iot-config.sh

# Verificar el cambio
source ./iot-config.sh >/dev/null 2>&1

if [ "$IOT_IP" = "$NEW_IP" ]; then
    echo "✅ IP cambiada correctamente a: $NEW_IP"
    echo ""
    echo "🌐 Nuevas URLs:"
    echo "   🏭 Dashboard: $IOT_URL_DASHBOARD"
    echo "   🏷️ Monitor: $IOT_URL_MONITOR"
    echo "   🖨️ Impresoras: $IOT_URL_PRINTER"
    echo ""
    echo "🔍 Probando nueva conexión..."
    
    # Probar la nueva conexión
    if ping -c 1 -W 3 $NEW_IP >/dev/null 2>&1; then
        echo "✅ Nueva IP responde correctamente"
    else
        echo "⚠️ Nueva IP no responde - verifica la red"
    fi
    
    echo ""
    echo "📋 SIGUIENTE PASO:"
    echo "   🔍 Ejecuta: ./test-iot-connection.sh"
    echo "   📦 O haz backup: ./create-backup-from-iot.sh"
    
else
    echo "❌ Error al cambiar la IP"
    # Restaurar backup
    mv iot-config.sh.backup iot-config.sh
    echo "🔄 Configuración restaurada"
fi 