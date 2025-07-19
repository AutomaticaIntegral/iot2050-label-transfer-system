#!/usr/bin/env node

/**
 * Script rápido para probar impresora RFID desde IOT2050
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 * Uso: node quick-rfid-test.js
 */

// Cargar configuración del proyecto
require('dotenv').config({ path: './env.production' });

const net = require('net');

// Configuración (lee desde env.production)
const RFID_IP = process.env.PRINTER_RFID_IP || '10.108.220.15';
const RFID_PORT = parseInt(process.env.PRINTER_RFID_PORT) || 9100;

console.log('🏷️  QUICK RFID TEST - Adisseo');
console.log(`🖨️  Impresora: ${RFID_IP}:${RFID_PORT}`);
console.log(`📁 Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
console.log('═'.repeat(40));

// Generar datos únicos
const timestamp = Date.now();
const gtin = '17312345678906';
const serial = `TST${timestamp.toString().slice(-6)}`;

// Etiqueta ZPL simple para RFID Adisseo 
//Etiqeuta enviada por adisseo el 19/06/2025
const zplLabel = `~JA^XA^LT0^POI^LH0,0^LRN^CI27^BY2,2,80^FO70,30^BCN,N,N,N,,A^FD01035315200102641730061910782517000>82210001^FS^FO50,130^A0N,30,30^FD(01)03531520010264(17)300619(10)782517000(21)0001^FS^RFW,H,1,2,1^FD4000^FS^RFW,H,2,16,1^FDAD0004024964B7767120000001000000^FS^PQ1^XZ`;

// Crear conexión TCP
const client = new net.Socket();

client.setTimeout(5000);

client.connect(RFID_PORT, RFID_IP, () => {
    console.log('✅ Conectado a impresora RFID');
    console.log(`📤 Enviando etiqueta de prueba...`);
    console.log(`🔢 GTIN: ${gtin}, Serial: ${serial}`);
    
    client.write(zplLabel);
    
    setTimeout(() => {
        console.log('✅ Etiqueta RFID enviada');
        console.log('📋 Verificar que la impresora haya procesado la etiqueta');
        client.end();
    }, 1000);
});

client.on('error', (err) => {
    console.error('❌ Error:', err.message);
    console.log('\n🔧 Verificar:');
    console.log(`   ping ${RFID_IP}`);
    console.log(`   nc -zv ${RFID_IP} ${RFID_PORT}`);
    console.log(`   Revisar configuración en env.production`);
});

client.on('close', () => {
    console.log('🔌 Test completado');
});

client.on('timeout', () => {
    console.error('❌ Timeout de conexión');
    client.destroy();
}); 