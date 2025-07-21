# Guía Rápida del Servidor Híbrido Modular

## TCP Label Transfer - Sistema de Transferencia de Etiquetas Adisseo

### Estructura del Proyecto

El código ha sido refactorizado para seguir una arquitectura modular que mejora la mantenibilidad:

```
iot2050/
│
├── index.js           # Punto de entrada principal (compatible con scripts antiguos)
├── start-server.js    # Script simple para iniciar el servidor
│
├── src/               # Código fuente modular
│   ├── main.js        # Orquestador principal
│   ├── config/        # Configuración centralizada
│   ├── utils/         # Utilidades (logger, file-handler, etc.)
│   ├── servers/       # Servidores (web, plc, adi)
│   └── services/      # Servicios (etiquetas, impresión)
│
├── data/              # Datos persistentes
│   ├── system-config.json  # Configuración del sistema
│   ├── counter.txt    # Contador actual
│   ├── labels.json    # Historial de etiquetas
│   └── zpl/           # Archivos ZPL guardados
│
└── public/            # Interfaz web
```

### Iniciar el Sistema

#### Opción 1: Usando los scripts de PowerShell (recomendado)
```powershell
# Desde el directorio principal
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation
.\start-hybrid-environment.ps1
```

#### Opción 2: Iniciando solo el servidor híbrido
```powershell
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation\iot2050
node index.js
```

### Detener el Sistema
```powershell
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation
.\stop-hybrid-environment.ps1
```

### Probar el Sistema

#### 1. Enviar comandos desde el PLC (simulados)
```powershell
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env
node test-plc-cmd10.js      # Comando de impresión estándar
node test-plc-cmd80.js      # Consulta de última etiqueta
```

#### 2. Enviar etiquetas desde ADI (simuladas)
```powershell
cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation\adi
node adi-erp-simulator.js bidon1   # Envía etiqueta de tipo bidón
```

### Configuración del Sistema

La configuración del sistema se puede modificar editando el archivo `data/system-config.json`:

```json
{
  "waitForCommand": "80"  // Comando a esperar antes de responder a ADI
}
```

Opciones disponibles:
- `"80"`: Esperar comando 80 (consulta de última etiqueta)
- `"none"`: No esperar ningún comando (responder inmediatamente)
- `"10"`: Esperar comando 10 (impresión estándar)
- `"any"`: Esperar cualquier comando del PLC

### Acceso a la Interfaz Web

La interfaz web está disponible en http://localhost:3001 y permite:
- Ver los logs en tiempo real
- Consultar las etiquetas recibidas
- Configurar el comportamiento del sistema

### Solución de Problemas

1. **Puertos en uso**: Si algún puerto está en uso, detenga todos los procesos Node.js:
   ```powershell
   Get-Process -Name "node" | Stop-Process -Force
   ```

2. **Verificar el sistema**: Para comprobar que todo está configurado correctamente:
   ```powershell
   cd c:\Projects\80_WinSurf\10_TEST01\tcp-label-transfer-26\testing-env\hybrid-simulation\iot2050
   node check-system.js
   ```

3. **Archivos de datos**: Los archivos de datos se almacenan en la carpeta `data/`:
   - `counter.txt`: Contiene el contador actual de etiquetas
   - `labels.json`: Contiene el historial de etiquetas recibidas
   - `system-config.json`: Contiene la configuración del sistema

### Notas Importantes

- Esta versión modular mantiene exactamente la misma funcionalidad que la versión original, pero con una estructura más mantenible.
- Se ha mejorado la gestión de errores y la comunicación entre módulos.
- La configuración del comportamiento de respuesta a ADI ahora es más flexible.
