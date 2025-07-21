#!/bin/bash

# Script para configurar SSH al IoT2050
# Cliente: ADISSEO - Automática Integral

echo "🔐 CONFIGURACIÓN SSH PARA IOT2050"
echo "=" $(printf '=%.0s' {1..50})

# Cargar configuración de IP
if [ -f "./iot-config.sh" ]; then
    source ./iot-config.sh >/dev/null 2>&1
else
    echo "❌ Error: No se encuentra iot-config.sh"
    exit 1
fi

echo "📡 Configurando SSH para: $IOT_USER@$IOT_IP"
echo ""

# Verificar si ya existe la clave
if [ ! -f ~/.ssh/id_rsa_iot2050 ]; then
    echo "🔑 Generando clave SSH para IoT2050..."
    ssh-keygen -t rsa -b 2048 -f ~/.ssh/id_rsa_iot2050 -N ""
    echo "✅ Clave generada en: ~/.ssh/id_rsa_iot2050"
else
    echo "✅ Clave SSH ya existe: ~/.ssh/id_rsa_iot2050"
fi

# Crear/actualizar archivo SSH config
echo ""
echo "📝 Configurando ~/.ssh/config..."

# Crear backup del config si existe
if [ -f ~/.ssh/config ]; then
    cp ~/.ssh/config ~/.ssh/config.backup.$(date +%Y%m%d-%H%M%S)
    echo "📦 Backup creado: ~/.ssh/config.backup.*"
fi

# Verificar si ya existe la configuración
if grep -q "Host iot2050" ~/.ssh/config 2>/dev/null; then
    echo "⚠️ Ya existe configuración para 'iot2050' en ~/.ssh/config"
    echo "🔧 Editando configuración existente..."
    
    # Eliminar configuración anterior
    sed -i '' '/Host iot2050/,/^$/d' ~/.ssh/config 2>/dev/null
fi

# Agregar nueva configuración
cat >> ~/.ssh/config << EOF

# Configuración IoT2050 - ADISSEO
Host iot2050
    HostName $IOT_IP
    User $IOT_USER
    IdentityFile ~/.ssh/id_rsa_iot2050
    IdentitiesOnly yes
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    ConnectTimeout 10

EOF

echo "✅ Configuración SSH añadida a ~/.ssh/config"
echo ""

# Verificar permisos
chmod 600 ~/.ssh/config 2>/dev/null
chmod 600 ~/.ssh/id_rsa_iot2050 2>/dev/null
chmod 644 ~/.ssh/id_rsa_iot2050.pub 2>/dev/null

echo "🔐 Copiando clave pública al IoT2050..."
echo "⚠️ Te pedirá el password de root del IoT2050 UNA SOLA VEZ:"
echo ""

if ssh-copy-id -i ~/.ssh/id_rsa_iot2050.pub $IOT_USER@$IOT_IP; then
    echo ""
    echo "✅ Clave SSH copiada correctamente"
    echo ""
    echo "🧪 Probando conexión sin password..."
    
    if ssh iot2050 "echo 'SSH OK - Sin password'" 2>/dev/null; then
        echo "✅ ¡Conexión SSH configurada correctamente!"
        echo ""
        echo "🎯 AHORA PUEDES USAR:"
        echo "   🔍 Conexión directa: ssh iot2050"
        echo "   🧪 Test conexión: ./test-iot-connection.sh"
        echo "   📦 Backup: ./create-backup-from-iot.sh"
        echo ""
        echo "🌐 URLs del sistema:"
        echo "   🏭 Dashboard: $IOT_URL_DASHBOARD"
        echo "   🏷️ Monitor: $IOT_URL_MONITOR"
        echo "   🖨️ Impresoras: $IOT_URL_PRINTER"
    else
        echo "❌ Error: La conexión SSH aún requiere password"
        echo "🔧 Verifica que el IoT2050 permita autenticación por claves"
    fi
else
    echo ""
    echo "❌ Error copiando la clave SSH"
    echo "🔧 Verifica:"
    echo "   - IP correcta: $IOT_IP"
    echo "   - Usuario correcto: $IOT_USER"
    echo "   - Password de root del IoT2050"
    echo "   - Conectividad de red"
fi

echo ""
echo "📋 CONFIGURACIÓN CREADA:"
echo "   🔑 Clave privada: ~/.ssh/id_rsa_iot2050"
echo "   🔑 Clave pública: ~/.ssh/id_rsa_iot2050.pub"
echo "   ⚙️ Config SSH: ~/.ssh/config (Host iot2050)"
echo "   📦 Backup config: ~/.ssh/config.backup.*" 