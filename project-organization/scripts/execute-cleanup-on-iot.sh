#!/bin/bash

# Script para ejecutar limpieza en IoT2050 desde Mac
# Cliente: ADISSEO - Automática Integral

echo "🧹 EJECUTAR LIMPIEZA EN IOT2050"
echo "📅 $(date)"
echo "=" $(printf '=%.0s' {1..60})

# Cargar configuración
if [ -f "./iot-config.sh" ]; then
    source ./iot-config.sh
    echo "✅ Configuración cargada: $IOT_IP"
else
    echo "❌ Error: No se encuentra iot-config.sh"
    exit 1
fi

# Verificar que existe el script de limpieza
if [ ! -f "./cleanup-production-safe.sh" ]; then
    echo "❌ Error: No se encuentra cleanup-production-safe.sh"
    echo "🔧 Verifica que el archivo esté en el directorio actual"
    exit 1
fi

echo ""
echo "🎯 ANÁLISIS PREVIO:"
echo "   🔍 Problema detectado: Sincronización RFID alternada"
echo "   🗂️ Causa: Archivos plc-server.js duplicados/incorrectos"
echo "   🎯 Solución: Limpieza específica de archivos problemáticos"
echo ""

# Confirmar ejecución
echo "⚠️ IMPORTANTE:"
echo "   📦 Este script eliminará archivos problemáticos del IoT2050"
echo "   🛡️ Se crea backup automático antes de eliminar"
echo "   🔧 Resuelve problema de sincronización RFID"
echo ""
read -p "🤔 ¿Continuar con la limpieza? (s/N): " CONFIRMAR

if [[ ! $CONFIRMAR =~ ^[sS]$ ]]; then
    echo "❌ Limpieza cancelada"
    exit 0
fi

echo ""
echo "🚀 INICIANDO LIMPIEZA EN IOT2050..."

# 1. Verificar conexión
echo "🔍 Verificando conexión..."
if ! ssh -o ConnectTimeout=10 $IOT_USER@$IOT_IP "echo 'Conexión OK'" >/dev/null 2>&1; then
    echo "❌ Error: No se puede conectar al IoT2050"
    echo "🔧 Ejecuta primero: ./test-iot-connection-with-password.sh"
    exit 1
fi
echo "✅ Conexión OK"

# 2. Transferir script de limpieza
echo "📤 Transfiriendo script de limpieza al IoT2050..."
if scp cleanup-production-safe.sh $IOT_USER@$IOT_IP:$IOT_APP_PATH/; then
    echo "✅ Script transferido correctamente"
else
    echo "❌ Error transfiriendo script"
    exit 1
fi

# 3. Ejecutar limpieza en el IoT2050
echo ""
echo "🧹 Ejecutando limpieza en IoT2050..."
echo "⚠️ Te pedirá el password del IoT2050:"

ssh $IOT_USER@$IOT_IP << 'EOF'
echo "📍 Conectado al IoT2050 para limpieza"
cd /opt/tcp-label-transfer

echo "⏸️ Parando servicio antes de limpieza..."
sudo systemctl stop tcp-label-transfer

echo "🔧 Dando permisos al script..."
chmod +x cleanup-production-safe.sh

echo "🧹 Ejecutando limpieza..."
./cleanup-production-safe.sh

echo ""
echo "🔍 Verificando resultado de limpieza..."
echo "Archivos plc-server restantes:"
find . -name "*plc-server*" -type f 2>/dev/null

echo ""
echo "Verificando función RFID correcta:"
if grep -q "updateCounterAndRfidMemory" src/servers/plc-server.js; then
    echo "✅ Función RFID correcta presente"
else
    echo "❌ ERROR: Función RFID correcta no encontrada"
fi

echo ""
echo "🚀 Reiniciando servicio..."
sudo systemctl start tcp-label-transfer
sudo systemctl status tcp-label-transfer --no-pager

echo ""
echo "✅ Limpieza completada en IoT2050"
EOF

# 4. Verificar resultado
echo ""
echo "🔍 Verificando estado post-limpieza..."
if ssh $IOT_USER@$IOT_IP "systemctl is-active $IOT_SERVICE" | grep -q "active"; then
    echo "✅ Servicio activo tras limpieza"
else
    echo "⚠️ Servicio no activo - verificar manualmente"
fi

echo ""
echo "🎯 LIMPIEZA COMPLETADA"
echo "📋 Archivos problemáticos eliminados:"
echo "   ❌ plc-server.js (raíz)"
echo "   ❌ src/servers/plc-server.jsX8103306s.Iot"  
echo "   ❌ zpl-utils.js (raíz)"
echo "   ❌ Archivos debug/testing"
echo ""
echo "✅ SIGUIENTE PASO:"
echo "   📦 Aplicar cambios: Seguir CAMBIOS-APLICAR-IOT.md"
echo "   🌐 URLs disponibles:"
echo "      🏭 Dashboard: $IOT_URL_DASHBOARD"
echo "      🏷️ Monitor: $IOT_URL_MONITOR"
echo "      🖨️ Impresoras: $IOT_URL_PRINTER" 