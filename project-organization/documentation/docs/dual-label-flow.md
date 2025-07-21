# Documentación: Flujo Dual de Etiquetas (Normal y RFID)

## Introducción

Esta documentación explica la implementación del flujo dual de etiquetas en el sistema TCP Label Transfer para Adisseo. La nueva funcionalidad permite:

1. Identificar automáticamente el tipo de etiqueta (normal o RFID) basado en el contenido ZPL
2. Manejar contadores independientes para cada tipo de etiqueta
3. Enviar etiquetas a impresoras diferentes según su tipo (normal o RFID)
4. Ejecutar comandos específicos para cada tipo de etiqueta (CMD 10 para normales, CMD 1 para RFID)

## Clasificación de Etiquetas

El sistema ahora clasifica automáticamente las etiquetas recibidas basándose en dos características principales:

- **Etiquetas Normales (Bidones)**: Contienen `^PQ4` (4 copias)
- **Etiquetas RFID (IBC)**: Contienen `^PQ1` (1 copia) y `^RFW` (comando RFID)

Esta detección se realiza en el momento de recepción de la etiqueta y se almacena la información junto con los demás datos de la etiqueta.

## Contadores Independientes

Se han implementado dos contadores independientes:

1. **Contador Normal**: Para etiquetas de producto (bidones)
   - Archivo: `data/counter.txt`
   - Incrementado por el comando CMD 10

2. **Contador RFID**: Para etiquetas RFID (IBC)
   - Archivo: `data/rfid_counter.txt`
   - Incrementado por el comando CMD 1

Ambos contadores se inicializan desde sus respectivos archivos al arrancar el sistema y se persisten en disco cada vez que se incrementan.

## Comandos PLC

### CMD 10: Impresión Estándar

El comando existente CMD 10 se mantiene para la impresión de etiquetas normales (bidones):

```json
{
  "cmd": 10,
  "messageId": 125,
  "data": {}
}
```

Este comando:
- Utiliza el contador normal
- Envía la etiqueta a la impresora de producto (10.108.220.10 en producción)
- Responde con el contador incrementado

### CMD 1: Impresión RFID (Nuevo)

Se ha añadido un nuevo comando CMD 1 para la impresión de etiquetas RFID (IBC):

```json
{
  "cmd": 1,
  "messageId": 125,
  "data": {}
}
```

Este comando:
- Utiliza el contador RFID
- Envía la etiqueta a la impresora RFID (10.108.220.15 en producción)
- Responde con el contador RFID incrementado

## Configuración de Impresoras

Las impresoras están configuradas en `src/config/index.js`:

```javascript
// Impresoras
const PRODUCT_PRINTER_HOST = 'localhost';  // Host de impresora de producto  //Produccion '10.108.220.10'
const PRODUCT_PRINTER_PORT = 9100;         // Puerto de impresora de producto
const RFID_PRINTER_HOST = 'localhost';     // Host de impresora RFID  //Produccion '10.108.220.15'
const RFID_PRINTER_PORT = 9101;            // Puerto de impresora RFID //Produccion 9100
```

En el entorno de producción, ambas impresoras utilizan el puerto 9100, pero tienen direcciones IP diferentes.

## Pruebas

Se han incluido tres scripts de prueba en la carpeta `iot2050/tests/`:

### 1. `test-send-labels.js`

Este script simula el envío de etiquetas desde ADI, enviando una etiqueta normal y una RFID para verificar la detección automática.

```bash
node tests/test-send-labels.js
```

### 2. `test-cmd10-standard.js`

Este script envía un comando CMD 10 para probar la impresión de etiquetas normales y el incremento del contador correspondiente.

```bash
node tests/test-cmd10-standard.js
```

### 3. `test-cmd1-rfid.js`

Este script envía un comando CMD 1 para probar la impresión de etiquetas RFID y el incremento del contador RFID.

```bash
node tests/test-cmd1-rfid.js
```

## Flujo de Trabajo

1. ADI envía etiquetas al puerto 9100/9110 (producción/desarrollo)
2. El sistema identifica automáticamente si es normal (bidón) o RFID (IBC)
3. La etiqueta se almacena en la base de datos interna
4. El PLC envía CMD 10 para imprimir etiqueta normal o CMD 1 para RFID
5. El sistema envía la etiqueta a la impresora correspondiente e incrementa el contador adecuado
6. El PLC recibe la respuesta con el nuevo valor del contador

## Consideraciones para Producción

Al desplegar en producción, asegúrese de:

1. Verificar que los archivos de contadores (`counter.txt` y `rfid_counter.txt`) estén presentes en la carpeta `data/`
2. Configurar correctamente las IPs de las impresoras en `src/config/index.js`
3. Asegurarse de que ambas impresoras sean accesibles desde el IOT2050
4. Actualizar la configuración del PLC para que utilice el CMD 1 para etiquetas RFID

## Mantenimiento

Los contadores se pueden reiniciar manualmente editando los archivos `data/counter.txt` y `data/rfid_counter.txt` si es necesario.
