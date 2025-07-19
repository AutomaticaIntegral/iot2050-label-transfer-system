#!/usr/bin/env node

const net = require('net');

console.log('🖨️  === TEST IMPRESORA PRODUCTO ADISSEO ===');
console.log('🖨️  Impresora: 10.108.220.10:9100');
console.log('═'.repeat(50));

// Generar datos únicos
const timestamp = Date.now();
const gtin = '17312345678906';
const serial = `TST${timestamp.toString().slice(-6)}`;

// Etiqueta ZPL para impresora de producto
const zplLabel = `^XA
^CF0,30
^FO50,50^FD*** ETIQUETA PRODUCTO ADISSEO ***^FS
^FO50,100^FDGTIN: (01)${gtin}^FS
^FO50,140^FDSerial: (21)${serial}^FS
^FO50,180^FDProducto: METIONINA ADISSEO^FS
^FO50,220^FDPeso: 25.00 KG^FS
^FO50,260^FDFecha: ${new Date().toLocaleString('es-ES')}^FS
^FO50,320^BCN,80,Y,N,N
^FD(01)${gtin}(21)${serial}^FS
^FO50,420^FDTest desde IOT2050^FS
^FO50,460^FDAutomatica Integral^FS
^XZ`;

const client = new net.Socket();
client.setTimeout(5000);

client.connect(9100, '10.108.220.10', () => {
    console.log('✅ Conectado a impresora de producto');
    console.log(`📤 Enviando etiqueta...`);
    console.log(`🔢 GTIN: ${gtin}, Serial: ${serial}`);
    
    client.write(zplLabel);
    
    setTimeout(() => {
        console.log('✅ Etiqueta enviada a impresora de producto');
        console.log('📋 ¡Verifica que se haya impreso la etiqueta!');
        client.end();
    }, 1000);
});

client.on('error', (err) => {
    console.error('❌ Error:', err.message);
});

client.on('close', () => {
    console.log('🔌 Test completado');
});

client.on('timeout', () => {
    console.error('❌ Timeout de conexión');
    client.destroy();
});
