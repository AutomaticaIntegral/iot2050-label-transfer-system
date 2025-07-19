/**
 * Script para simular el envío de etiquetas desde ADI
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 * 
 * Este script envía dos tipos de etiquetas al servidor de recepción:
 * 1. Etiqueta normal (producto) - con ^PQ4 para bidones
 * 2. Etiqueta RFID - con ^PQ1 y ^RFW para IBC
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

// Configuración
const LABEL_SERVER_HOST = 'localhost';
const LABEL_SERVER_PORT = 9110; // Puerto para recibir etiquetas (cambia a 9100 en producción)

// Ejemplos de etiquetas
const PRODUCT_LABEL = `~JA^XA~TA000~JSN^LT0^MNW^MTT^PON^PMN^LH0,0^JMA^PR6,6~SD23^JUS^LRN^CI27^PA0,1,1,0^MMT^PW799^BY2,3,120^FO625,225^BCR,N,N,N,A^FD(01)03531520010127(17)300526(10)782514600(21)0001^FS^A0R,40,50^FO575,260^FD(01)03531520010127(17)300526(10)782514600(21)0001^FS^A0R,70,80^FO425,80^FDProd:^FS^A0R,70,80^FO425,400^FD01012^FS^A0R,50,60^FO425,850^FDBatch Number:^FS^A0R,50,60^FO425,1250^FD782514600^FS^A0R,50,60^FO325,80^FDNet Weight:^FS^A0R,50,60^FO325,400^FD1000,00 Kg^FS^A0R,50,60^FO225,400^FD2204,60 Lbs^FS^A0R,50,60^FO325,850^FDFAB:^FS^A0R,50,60^FO325,1250^FD26/05/2025^FS^A0R,50,60^FO225,850^FDEXP/VAL:^FS^A0R,50,60^FO225,1250^FD26/05/2030^FS^A0R,65,80^FO100,100^FDUFI^FS^A0R,65,70^FO100,400^FDHJA0-20UU-Q002-J25T^FS^PQ4^XZ`;

const RFID_LABEL = `~JA^XA^LT0^PON^LH0,0^LRN^CI27^BY1,2,50^FO90,100^BCR,N,N,N,A^FD(01)03531520010127(17)300526(10)782514600(21)0001^FS^FO30,50^A0R,30,30^FD(01)03531520010127(17)300526(10)782514600(21)0001^FS^RFW,H^FDAD0003F4495EE7766FA0000001000000^FS^PQ1^XZ`;

// Función para enviar una etiqueta al servidor
function sendLabel(labelData) {
  return new Promise((resolve, reject) => {
    console.log('Conectando al servidor de recepción de etiquetas...');
    
    const client = new net.Socket();
    client.connect(LABEL_SERVER_PORT, LABEL_SERVER_HOST, () => {
      console.log(`Conexión establecida con ${LABEL_SERVER_HOST}:${LABEL_SERVER_PORT}`);
      
      // Enviar etiqueta
      console.log(`Enviando etiqueta (${labelData.length} bytes)...`);
      client.write(labelData);
    });
    
    // Variables para manejar la respuesta
    let responseData = '';
    
    client.on('data', (data) => {
      // Recibir respuesta
      responseData += data.toString();
      console.log(`Respuesta recibida: ${responseData}`);
      
      // En este caso, consideramos cualquier respuesta como éxito
      client.end();
      resolve(responseData);
    });
    
    client.on('error', (err) => {
      console.error(`Error de conexión: ${err.message}`);
      reject(err);
    });
    
    client.on('close', () => {
      console.log('Conexión cerrada');
    });
  });
}

// Función principal para ejecutar las pruebas
async function runTests() {
  try {
    console.log('=== PRUEBA 1: ENVÍO DE ETIQUETA NORMAL (PRODUCTO) ===');
    console.log('Etiqueta con ^PQ4 para bidones');
    const productResult = await sendLabel(PRODUCT_LABEL);
    console.log(`Resultado: ${productResult}`);
    
    // Esperar 2 segundos entre pruebas
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n=== PRUEBA 2: ENVÍO DE ETIQUETA RFID ===');
    console.log('Etiqueta con ^PQ1 y ^RFW para IBC');
    const rfidResult = await sendLabel(RFID_LABEL);
    console.log(`Resultado: ${rfidResult}`);
    
    console.log('\n✅ Todas las pruebas completadas con éxito');
    return true;
  } catch (error) {
    console.error(`❌ Error en las pruebas: ${error.message}`);
    return false;
  }
}

// Ejecutar las pruebas
console.log('Iniciando pruebas de envío de etiquetas...');
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`Error fatal: ${error.message}`);
    process.exit(1);
  });
