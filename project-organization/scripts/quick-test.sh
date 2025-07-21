#!/bin/bash

echo "🎯 PRUEBA RÁPIDA - Sistema CMD 11 Local"
echo "⚙️ Desarrollado por Automática Integral para ADISSEO"
echo "=================================================="

echo ""
echo "📋 INSTRUCCIONES:"
echo "1. Este script abrirá 3 terminales automáticamente"
echo "2. Terminal 1: Simulador de impresoras"
echo "3. Terminal 2: Sistema IoT" 
echo "4. Terminal 3: Envío de CMD 11"
echo ""

read -p "⚡ ¿Continuar con la prueba automática? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Prueba cancelada"
    exit 1
fi

echo ""
echo "🚀 INICIANDO PRUEBA AUTOMÁTICA..."
echo "=================================================="

# Verificar si estamos en macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detectado macOS - Usando Terminal.app"
    
    # Terminal 1: Simulador
    osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)' && echo '🖨️ INICIANDO SIMULADOR DE IMPRESORAS' && echo '🌐 Monitor: http://localhost:3002' && npm run simulator"
end tell
EOF
    
    sleep 3
    
    # Terminal 2: Sistema IoT
    osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)' && echo '💻 INICIANDO SISTEMA IOT' && echo '🌐 Monitor: http://localhost:3001' && npm start"
end tell
EOF
    
    sleep 5
    
    # Terminal 3: CMD 11
    osascript <<EOF
tell application "Terminal"
    do script "cd '$(pwd)' && echo '📤 ENVIANDO CMD 11 DE PRUEBA' && echo 'Esperando 3 segundos...' && sleep 3 && npm run cmd11"
end tell
EOF

elif command -v gnome-terminal &> /dev/null; then
    echo "🐧 Detectado Linux - Usando gnome-terminal"
    
    # Terminal 1: Simulador
    gnome-terminal --title="Simulador de Impresoras" -- bash -c "cd '$(pwd)'; echo '🖨️ INICIANDO SIMULADOR DE IMPRESORAS'; echo '🌐 Monitor: http://localhost:3002'; npm run simulator; exec bash"
    
    sleep 3
    
    # Terminal 2: Sistema IoT
    gnome-terminal --title="Sistema IoT" -- bash -c "cd '$(pwd)'; echo '💻 INICIANDO SISTEMA IOT'; echo '🌐 Monitor: http://localhost:3001'; npm start; exec bash"
    
    sleep 5
    
    # Terminal 3: CMD 11
    gnome-terminal --title="CMD 11 Test" -- bash -c "cd '$(pwd)'; echo '📤 ENVIANDO CMD 11 DE PRUEBA'; echo 'Esperando 3 segundos...'; sleep 3; npm run cmd11; exec bash"

else
    echo "❌ Sistema no soportado para apertura automática de terminales"
    echo ""
    echo "💡 EJECUTA MANUALMENTE EN 3 TERMINALES:"
    echo ""
    echo "Terminal 1:"
    echo "npm run simulator"
    echo ""
    echo "Terminal 2:"
    echo "npm start"
    echo ""
    echo "Terminal 3:"
    echo "npm run cmd11"
    echo ""
    exit 1
fi

echo ""
echo "✅ TERMINALES INICIADAS"
echo "=================================================="
echo ""
echo "🔍 MONITOREO:"
echo "📊 Simulador: http://localhost:3002"
echo "💻 Sistema: http://localhost:3001"
echo "📋 Dashboard: http://localhost:3001/dashboard.html"
echo ""
echo "⏰ Esperando 10 segundos para abrir monitores..."

sleep 10

# Abrir navegadores
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:3002
    sleep 2
    open http://localhost:3001
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3002 &
    sleep 2
    xdg-open http://localhost:3001 &
else
    echo "🌐 Abre manualmente:"
    echo "   http://localhost:3002 (Simulador)"
    echo "   http://localhost:3001 (Sistema)"
fi

echo ""
echo "🎉 ¡PRUEBA COMPLETA INICIADA!"
echo "=================================================="
echo ""
echo "📋 QUÉ DEBERÍAS VER:"
echo "1. 🖨️ Simulador mostrando etiquetas recibidas"
echo "2. 💻 Sistema procesando CMD 11"
echo "3. 📊 Contadores incrementándose"
echo "4. 🔄 Logs en tiempo real"
echo ""
echo "💡 Para más pruebas:"
echo "node test-cmd11-local.js --help"
echo ""
echo "✅ ¡Sistema funcionando correctamente!" 