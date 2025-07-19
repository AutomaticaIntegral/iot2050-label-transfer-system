# Servidor Híbrido de Simulación Adisseo

## TCP Label Transfer - Sistema de Transferencia de Etiquetas

Este proyecto implementa un servidor híbrido para la simulación del sistema de transferencia de etiquetas de Adisseo. Proporciona una plataforma para probar la comunicación entre:

- Sistema ADI (envío de etiquetas)
- PLC (consulta y manejo de etiquetas)
- Impresoras (impresión de etiquetas)

### Estructura del Proyecto

El código ha sido refactorizado para seguir una arquitectura modular que mejora la mantenibilidad y facilita las pruebas:

```
iot2050/
│
├── index.js           # Punto de entrada principal
├── src/
│   ├── main.js        # Orquestador principal del sistema
│   │
│   ├── config/        # Configuración centralizada
│   │   └── index.js
│   │
│   ├── utils/         # Utilidades y funciones auxiliares
│   │   ├── logger.js
│   │   ├── file-handler.js
│   │   ├── zpl-utils.js
│   │   └── system-config.js
│   │
│   ├── servers/       # Servidores de comunicación
│   │   ├── web-server.js
│   │   ├── plc-server.js
│   │   └── adi-server.js
│   │
│   ├── services/      # Lógica de negocio
│   │   ├── label-service.js
│   │   └── printer-service.js
│   │
│   └── models/        # Modelos de datos (si es necesario)
│
├── public/            # Archivos de la interfaz web
│   ├── index.html
│   ├── main.js
│   └── ...
│
└── data/              # Datos persistentes
    ├── labels.json
    ├── counter.txt    # Contador para etiquetas normales
    ├── rfid_counter.txt # Contador para etiquetas RFID
    └── zpl/           # Archivos ZPL guardados
```

### Funcionalidades Principales

El sistema proporciona las siguientes funcionalidades:

1. **Recepción de Etiquetas**: Recibe etiquetas ZPL del sistema ADI (puerto 9110)
2. **Comunicación con PLC**: Atiende comandos del PLC (puerto 9200)
3. **Impresión de Etiquetas**: Envía comandos ZPL a impresoras de producto y RFID
4. **Flujo Dual de Etiquetas**: Maneja por separado etiquetas normales (bidones) y RFID (IBC)
5. **Monitor Web**: Interfaz web para visualizar logs, etiquetas y configuración (puerto 3001)
6. **Configuración Dinámica**: Permite configurar el comportamiento del sistema en tiempo real

### Comportamiento de Respuesta a ADI

El sistema permite configurar el comportamiento de respuesta a ADI al recibir una etiqueta:

- **Respuesta inmediata**: Responde inmediatamente al recibir la etiqueta
- **Esperar CMD 80**: Espera a que el PLC envíe el comando 80 antes de responder (comportamiento tradicional)
- **Esperar otro comando**: Puede configurarse para esperar cualquier otro comando del PLC

Esta configuración se puede modificar desde la interfaz web del monitor.

### Inicio del Sistema

Para iniciar el sistema completo, ejecute:

```powershell
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation
.\start-hybrid-testing.ps1
```

Para iniciar solo el servidor híbrido:

```bash
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation\iot2050
node index.js
```

### Pruebas

Para probar el sistema:

1. **Envío de comandos PLC**:
   ```bash
   # Para etiquetas normales (CMD 10)
   node tests/test-cmd10-standard.js
   
   # Para etiquetas RFID (CMD 1)
   node tests/test-cmd1-rfid.js
   ```

2. **Simulación de envío de etiquetas desde ADI**:
   ```bash
   # Enviar ambos tipos de etiquetas (normal y RFID)
   node tests/test-send-labels.js
   ```

### Mantenimiento

Para agregar nuevas funcionalidades:

1. Identifique el módulo apropiado para su implementación
2. Mantenga la separación de responsabilidades
3. Actualice la documentación según sea necesario

### Notas Adicionales

- La interfaz web está disponible en http://localhost:3001
- Los logs del sistema se muestran tanto en la consola como en la interfaz web
- El sistema mantiene un archivo de etiquetas y dos contadores persistentes (normal y RFID)
- Las impresoras en producción tienen las siguientes IPs:
  - Impresora de producto: 10.108.220.10 (Puerto: 9100)
  - Impresora RFID: 10.108.220.15 (Puerto: 9100)

### Flujo Dual de Etiquetas

El sistema ahora soporta dos flujos separados para etiquetas:

1. **Etiquetas Normales (Bidones)**:
   - Identificadas por contener `^PQ4` en el ZPL
   - Gestionadas con el comando CMD 10
   - Enviadas a la impresora de producto
   - Utilizan su propio contador independiente

2. **Etiquetas RFID (IBC)**:
   - Identificadas por contener `^PQ1` y `^RFW` en el ZPL
   - Gestionadas con el nuevo comando CMD 1
   - Enviadas a la impresora RFID
   - Utilizan su propio contador independiente

Para más detalles sobre esta funcionalidad, consulte la [documentación completa](docs/dual-label-flow.md).
