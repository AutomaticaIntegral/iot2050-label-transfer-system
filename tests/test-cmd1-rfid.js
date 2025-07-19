/**
 * Script para probar el comando CMD 1 (impresión RFID)
 * Cliente: Adisseo
 * Proyecto: TCP Label Transfer
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

// Configuración del servidor PLC
const PLC_HOST = 'localhost';
const PLC_PORT = 9200; // Puerto del servidor PLC

// Función para enviar comando CMD 1 (impresión RFID)
function sendCmd1(messageId = 100) {
  return new Promise((resolve, reject) => {
    console.log('Conectando al servidor PLC...');
    
    const client = new net.Socket();
    client.connect(PLC_PORT, PLC_HOST, () => {
      console.log(`Conexión establecida con ${PLC_HOST}:${PLC_PORT}`);
      
      // Crear comando para impresión RFID
      const command = {
        cmd: 1, // CMD 1 para impresión RFID
        messageId: messageId,
        data: {} // No se requieren datos adicionales para este comando
      };
      
      // Enviar comando como JSON
      const commandStr = JSON.stringify(command);
      console.log(`Enviando comando: ${commandStr}`);
      client.write(commandStr);
    });
    
    let responseData = '';
    
    client.on('data', (data) => {
      // Recibir respuesta
      const response = data.toString();
      responseData += response;
      
      // Comprobar si la respuesta está completa (termina con #)
      if (response.endsWith('#')) {
        console.log('Respuesta completa recibida');
        
        // Eliminar el # final
        const cleanResponse = responseData.replace(/#$/, '');
        
        try {
          // Parsear respuesta
          const parsedResponse = JSON.parse(cleanResponse);
          console.log('Respuesta parseada:');
          console.log(JSON.stringify(parsedResponse, null, 2));
          
          // Cerrar conexión
          client.destroy();
          resolve(parsedResponse);
        } catch (error) {
          console.error(`Error al parsear respuesta: ${error.message}`);
          client.destroy();
          reject(error);
        }
      }
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

// Ejecutar script
console.log('Iniciando prueba de CMD 1 (impresión RFID)...');

// Ejecutar envío de comando (se puede cambiar el messageId)
sendCmd1(101)
  .then(result => {
    console.log('Prueba completada con éxito');
    process.exit(0);
  })
  .catch(error => {
    console.error(`Prueba fallida: ${error.message}`);
    process.exit(1);
  });
