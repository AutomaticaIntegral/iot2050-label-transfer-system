#!/bin/bash

# Script para crear backup completo del IoT2050 desde Mac
# Cliente: ADISSEO - Automática Integral
# Fecha: $(date)

echo "🔄 INICIANDO BACKUP DEL IOT2050 → MAC"
echo "📅 $(date)"
echo "=" $(printf '=%.0s' {1..50})

# Cargar configuración de IP
if [ -f "./iot-config.sh" ]; then
    source ./iot-config.sh
    echo "✅ Configuración cargada desde iot-config.sh"
else
    echo "❌ Error: No se encuentra iot-config.sh"
    echo "🔧 Ejecuta primero: chmod +x iot-config.sh && ./iot-config.sh"
    exit 1
fi

BACKUP_NAME="backup-iot2050-$(date +%Y%m%d-%H%M%S)"

echo "🎯 IP del IoT: $IOT_IP"
echo "📦 Nombre backup: $BACKUP_NAME"
echo ""

# Verificar conexión SSH
echo "🔍 Verificando conexión SSH..."
if ! ssh -o ConnectTimeout=5 $IOT_USER@$IOT_IP "echo 'Conexión OK'"; then
    echo "❌ Error: No se puede conectar al IoT2050 en $IOT_IP"
    echo "🔧 Verifica la IP y que tengas acceso SSH"
    exit 1
fi
echo "✅ Conexión SSH confirmada"
echo ""

# Crear directorio de backups local
mkdir -p backups
echo "📁 Directorio backups/ creado"

# Ejecutar backup en el IoT2050
echo "🚀 Ejecutando backup en IoT2050..."
ssh $IOT_USER@$IOT_IP << EOF
echo "📍 Conectado al IoT2050"
cd $IOT_APP_PATH

echo "⏸️ Parando servicio..."
sudo systemctl stop $IOT_SERVICE

echo "📦 Creando backup comprimido..."
cd /opt
sudo tar -czf "${BACKUP_NAME}.tar.gz" \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='process.log' \
  tcp-label-transfer/

echo "📋 Creando archivos adicionales..."
sudo cp /etc/systemd/system/${IOT_SERVICE}.service /opt/"${BACKUP_NAME}-systemd.service" 2>/dev/null || echo "No hay servicio systemd"
sudo journalctl -u $IOT_SERVICE --no-pager > /opt/"${BACKUP_NAME}-logs.txt" 2>/dev/null || echo "No hay logs systemd"

echo "=== INFORMACIÓN DEL SISTEMA ===" > /opt/"${BACKUP_NAME}-system-info.txt"
uname -a >> /opt/"${BACKUP_NAME}-system-info.txt"
date >> /opt/"${BACKUP_NAME}-system-info.txt"
ps aux | grep node >> /opt/"${BACKUP_NAME}-system-info.txt"
netstat -tulpn | grep -E ':(9200|9110|3001)' >> /opt/"${BACKUP_NAME}-system-info.txt"

echo "🚀 Reiniciando servicio..."
sudo systemctl start $IOT_SERVICE

echo "✅ Backup completado en IoT2050"
ls -la /opt/${BACKUP_NAME}*
EOF

# Transferir archivos a Mac
echo ""
echo "📥 Descargando backup a Mac..."
scp $IOT_USER@$IOT_IP:/opt/${BACKUP_NAME}.tar.gz ./backups/
scp $IOT_USER@$IOT_IP:/opt/${BACKUP_NAME}-systemd.service ./backups/ 2>/dev/null || echo "No hay servicio systemd"
scp $IOT_USER@$IOT_IP:/opt/${BACKUP_NAME}-logs.txt ./backups/ 2>/dev/null || echo "No hay logs"
scp $IOT_USER@$IOT_IP:/opt/${BACKUP_NAME}-system-info.txt ./backups/ 2>/dev/null || echo "No hay system-info"

# Verificar descarga
echo ""
echo "✅ BACKUP COMPLETADO"
echo "📁 Archivos descargados:"
ls -la backups/${BACKUP_NAME}*

# Verificar contenido
echo ""
echo "📋 Verificando contenido del backup..."
tar -tzf backups/${BACKUP_NAME}.tar.gz | head -10

echo ""
echo "🎯 RESUMEN:"
echo "📦 Backup principal: backups/${BACKUP_NAME}.tar.gz"
echo "📋 Info sistema: backups/${BACKUP_NAME}-system-info.txt"
echo "📄 Logs: backups/${BACKUP_NAME}-logs.txt"
echo "⚙️ Servicio: backups/${BACKUP_NAME}-systemd.service"

echo ""
echo "✅ ¡Backup completo! Ahora puedes aplicar cambios con seguridad."
echo "🔄 Para restaurar: tar -xzf backups/${BACKUP_NAME}.tar.gz" 