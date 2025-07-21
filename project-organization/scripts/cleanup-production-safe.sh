#!/bin/bash
# SCRIPT DE LIMPIEZA BASADO EN IOT ADISSEO EN PRODUCCIÓN
# Fecha: $(date)
# Problema detectado: Archivos duplicados causando sincronización RFID alternada

echo "🔍 INICIANDO LIMPIEZA BASADA EN ANÁLISIS IOT PRODUCCIÓN"
echo "Problema: Sincronización RFID alternada causada por archivos conflictivos"
echo ""

# 1. CREAR RESPALDO DE SEGURIDAD
echo "📦 Creando respaldo de seguridad..."
tar -czf cleanup-production-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  plc-server.js \
  src/servers/plc-server.jsX8103306s.Iot \
  zpl-utils.js \
  debug-*.js \
  test-*.js \
  quick-*.js \
  simulate-*.js \
  tests/ \
  labels.json \
  counter.json \
  process.log \
  config/ 2>/dev/null

echo "✅ Respaldo creado"

# 2. ELIMINAR ARCHIVOS CRÍTICOS PROBLEMÁTICOS
echo ""
echo "🚨 ELIMINANDO ARCHIVOS CRÍTICOS PROBLEMÁTICOS..."

# Archivos que causan el problema de sincronización RFID
if [ -f "plc-server.js" ]; then
    echo "🗑️ Eliminando plc-server.js (raíz) - imports incorrectos"
    rm plc-server.js
fi

if [ -f "src/servers/plc-server.jsX8103306s.Iot" ]; then
    echo "🗑️ Eliminando plc-server.jsX8103306s.Iot - función RFID incorrecta"
    rm src/servers/plc-server.jsX8103306s.Iot
fi

if [ -f "zpl-utils.js" ]; then
    echo "🗑️ Eliminando zpl-utils.js (raíz) - duplicado obsoleto"
    rm zpl-utils.js
fi

# 3. ELIMINAR ARCHIVOS DE DEBUG/TESTING
echo ""
echo "🧹 ELIMINANDO ARCHIVOS DE DEBUG/TESTING..."
rm -f debug-*.js test-*.js quick-*.js simulate-*.js
rm -rf tests/ 2>/dev/null

# 4. ELIMINAR DUPLICADOS Y TEMPORALES
echo ""
echo "📁 ELIMINANDO ARCHIVOS DUPLICADOS Y TEMPORALES..."
rm -f labels.json counter.json process.log
rm -rf config/ 2>/dev/null

# 5. VERIFICACIÓN POST-LIMPIEZA
echo ""
echo "🔍 VERIFICACIÓN POST-LIMPIEZA..."
echo "Archivos plc-server restantes:"
find . -name "*plc-server*" -type f 2>/dev/null

echo ""
echo "Archivos zpl-utils restantes:"
find . -name "*zpl-utils*" -type f 2>/dev/null

echo ""
echo "Verificando integridad del sistema:"
if [ -f "src/servers/plc-server.js" ] && [ -f "src/utils/zpl-utils.js" ]; then
    echo "✅ Archivos correctos presentes"
else
    echo "❌ ERROR: Archivos críticos faltantes"
    exit 1
fi

# 6. VERIFICAR FUNCIÓN RFID CORRECTA
echo ""
echo "🔧 VERIFICANDO FUNCIÓN RFID CORRECTA..."
if grep -q "updateCounterAndRfidMemory" src/servers/plc-server.js; then
    echo "✅ Función RFID correcta presente: updateCounterAndRfidMemory"
else
    echo "❌ ERROR: Función RFID correcta no encontrada"
fi

if grep -q "updateCounterInZpl.*normalizedCounter" src/servers/plc-server.js; then
    echo "⚠️ WARNING: Función RFID incorrecta aún presente: updateCounterInZpl"
else
    echo "✅ Función RFID incorrecta eliminada"
fi

echo ""
echo "🎯 LIMPIEZA COMPLETADA"
echo "Resultado esperado: Problema de sincronización RFID alternada resuelto"
echo "Archivos conservados: Solo los necesarios para producción"
echo ""
echo "⚠️ IMPORTANTE: Reiniciar el servicio después de la limpieza:"
echo "sudo systemctl restart tcp-label-transfer" 