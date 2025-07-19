#!/usr/bin/env node

/**
 * Script personalizado para enviar código ZPL específico a impresora RFID
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 * Uso: node test-rfid-custom.js
 */

// Cargar configuración del proyecto
require('dotenv').config({ path: './env.production' });

const net = require('net');

// Configuración (lee desde env.production)
const RFID_IP = process.env.PRINTER_RFID_IP || '10.108.220.15';
const RFID_PORT = parseInt(process.env.PRINTER_RFID_PORT) || 9100;

console.log('🏷️  CUSTOM RFID TEST - Adisseo');
console.log(`🖨️  Impresora: ${RFID_IP}:${RFID_PORT}`);
console.log(`📁 Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
console.log(`📋 Copias: 2 (PQ2)`);
console.log('═'.repeat(50));

// Tu código ZPL específico con PQ2 (2 copias) en lugar de PQ1
const customZplLabel = `~JA^XA^LT0^POI^LH0,0^LRN^CI27^BY2,2,80^FO70,30^BCN,N,N,N,,A^FD01035315200102641730062510782517600>82210001^FS^FO50,130^A0N,30,30^FD(01)03531520010264(17)300625(10)782517600(21)0001^FS^RFW,H,1,2,1^FD4000^FS^RFW,H,2,16,1^FDAD0004024964517767180000001000000^FS^PQ2^XZ`;

console.log('📄 Código ZPL a enviar:');
console.log('─'.repeat(50));
console.log(customZplLabel);
console.log('─'.repeat(50));

// Crear conexión TCP
const client = new net.Socket();

client.setTimeout(5000);

client.connect(RFID_PORT, RFID_IP, () => {
    console.log('✅ Conectado a impresora RFID');
    console.log(`📤 Enviando etiqueta personalizada...`);
    console.log(`🔢 GTIN: 03531520010264`);
    console.log(`📅 Fecha: 300625 (25/06/2030)`);
    console.log(`📦 Lote: 782517600`);
    console.log(`🏷️  Serial: 0001`);
    console.log(`🖨️  Copias: 2 (PQ2)`);
    
    client.write(customZplLabel);
    
    setTimeout(() => {
        console.log('✅ Etiqueta RFID enviada (2 copias)');
        console.log('📋 Verificar que la impresora haya procesado las 2 etiquetas');
        console.log('🔍 Comandos RFID utilizados:');
        console.log('   - ^RFW,H,1,2,1^FD4000');
        console.log('   - ^RFW,H,2,16,1^FDAD0004024964517767180000001000000');
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
    console.log('💡 Para cambiar copias: editar PQ2 por PQ1, PQ3, etc.');
});

client.on('timeout', () => {
    console.error('❌ Timeout de conexión');
    client.destroy();
}); 