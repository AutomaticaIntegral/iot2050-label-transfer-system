#!/bin/bash

echo "🎯 TEST RÁPIDO DE CONECTIVIDAD VPN"
echo "Cliente: ADISSEO - Automática Integral"
echo "======================================"

# Configuración
YOUR_VPN_IP="100.97.189.85"
RFID_PORT="9105"
PRODUCT_PORT="9106"

echo ""
echo "🌐 Tu PC VPN: $YOUR_VPN_IP"
echo "📡 Puertos a probar: $RFID_PORT, $PRODUCT_PORT"
echo ""

echo "1️⃣ Test puerto RFID ($RFID_PORT):"
if nc -zv $YOUR_VPN_IP $RFID_PORT 2>&1; then
    echo "✅ Puerto RFID: ACCESIBLE"
else
    echo "❌ Puerto RFID: NO ACCESIBLE"
fi

echo ""
echo "2️⃣ Test puerto Producto ($PRODUCT_PORT):"
if nc -zv $YOUR_VPN_IP $PRODUCT_PORT 2>&1; then
    echo "✅ Puerto Producto: ACCESIBLE"
else
    echo "❌ Puerto Producto: NO ACCESIBLE"
fi

echo ""
echo "3️⃣ Test con telnet (manual):"
echo "Ejecuta manualmente:"
echo "telnet $YOUR_VPN_IP $RFID_PORT"
echo "telnet $YOUR_VPN_IP $PRODUCT_PORT"

echo ""
echo "4️⃣ Test con curl:"
echo "curl -v --connect-timeout 5 $YOUR_VPN_IP:$RFID_PORT"

echo ""
echo "======================================"
echo "🎯 Si todos los tests pasan:"
echo "   ✅ Cambiar IPs en monitor IoT"
echo "   📤 Enviar CMD 11"
echo "   👁️ Ver etiquetas en simulador" 