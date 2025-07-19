/**
 * Cliente Socket.io para comunicación en tiempo real
 * TCP Label Transfer - Cliente: Adisseo
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando cliente Socket.io...');
    
    // Elementos DOM
    const logsContainer = document.getElementById('logs');
    const statusIndicator = document.getElementById('statusIndicator');
    const lastLabelInfo = document.getElementById('lastLabelInfo');
    
    // Inicializar Socket.io
    const socket = io();
    
    // Evento de conexión
    socket.on('connect', function() {
        console.log('Conectado al servidor Socket.io');
        if (statusIndicator) {
            statusIndicator.className = 'connected';
            statusIndicator.innerText = 'Conectado';
        }
        addLogEntry({
            timestamp: new Date().toISOString(),
            category: 'SYSTEM',
            message: 'Conexión establecida con el servidor',
            level: 'success'
        });
    });
    
    // Evento de desconexión
    socket.on('disconnect', function() {
        console.log('Desconectado del servidor Socket.io');
        if (statusIndicator) {
            statusIndicator.className = 'disconnected';
            statusIndicator.innerText = 'Desconectado';
        }
        addLogEntry({
            timestamp: new Date().toISOString(),
            category: 'SYSTEM',
            message: 'Conexión perdida con el servidor',
            level: 'error'
        });
    });
    
    // Recibir logs
    socket.on('log', function(logData) {
        console.log('Log recibido:', logData);
        addLogEntry(logData);
    });
    
    // Recibir información de etiqueta
    socket.on('labelReceived', function(labelData) {
        console.log('Etiqueta recibida:', labelData);
        if (lastLabelInfo) {
            lastLabelInfo.innerHTML = `
                <div class="alert alert-success">
                    <strong>Última etiqueta recibida:</strong><br>
                    ID: ${labelData.id}<br>
                    Contador: ${labelData.counter}<br>
                    GS1: ${labelData.gs1}<br>
                    Copias: ${labelData.copies}<br>
                    Tipo: ${labelData.type}
                </div>
            `;
        }
        
        addLogEntry({
            timestamp: new Date().toISOString(),
            category: 'LABELS',
            message: `Nueva etiqueta procesada: ID=${labelData.id}, Contador=${labelData.counter}`,
            level: 'success'
        });
    });
    
    // Función para añadir entrada de log
    function addLogEntry(logData) {
        if (!logsContainer) return;
        
        const { timestamp, category, message, level } = logData;
        
        // Crear elemento para el log
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level || 'info'}`;
        
        // Formatear timestamp
        const date = new Date(timestamp);
        const timeString = date.toLocaleTimeString();
        
        // Añadir contenido
        logEntry.innerHTML = `
            <span class="log-time">[${timeString}]</span>
            <span class="log-category">[${category}]</span>
            <span class="log-message">${message}</span>
        `;
        
        // Añadir al contenedor
        logsContainer.appendChild(logEntry);
        
        // Auto-scroll
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Limitar número de logs (mantener solo los últimos 500)
        while (logsContainer.children.length > 500) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }
    
    // Botón para limpiar logs
    const clearButton = document.getElementById('clearLogs');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            if (logsContainer) {
                logsContainer.innerHTML = '';
                addLogEntry({
                    timestamp: new Date().toISOString(),
                    category: 'SYSTEM',
                    message: 'Logs limpiados',
                    level: 'info'
                });
            }
        });
    }
    
    // Botón para solicitar configuración
    const configButton = document.getElementById('getConfig');
    if (configButton) {
        configButton.addEventListener('click', function() {
            fetch('/api/config')
                .then(response => response.json())
                .then(config => {
                    const configDisplay = document.getElementById('configInfo');
                    if (configDisplay) {
                        configDisplay.innerHTML = `
                            <div class="alert alert-info">
                                <strong>Configuración actual:</strong><br>
                                Esperar comando PLC: ${config.waitForCommand === 'none' ? 'No esperar' : config.waitForCommand}
                            </div>
                        `;
                    }
                })
                .catch(error => console.error('Error al obtener configuración:', error));
        });
    }
    
    // Formulario para actualizar configuración
    const configForm = document.getElementById('configForm');
    if (configForm) {
        configForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const waitForCommand = document.getElementById('waitForCommand').value;
            
            fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ waitForCommand })
            })
            .then(response => response.json())
            .then(result => {
                addLogEntry({
                    timestamp: new Date().toISOString(),
                    category: 'CONFIG',
                    message: `Configuración actualizada: Esperar comando ${result.config.waitForCommand}`,
                    level: 'success'
                });
                
                // Actualizar display de configuración
                const configDisplay = document.getElementById('configInfo');
                if (configDisplay) {
                    configDisplay.innerHTML = `
                        <div class="alert alert-success">
                            <strong>Configuración actualizada:</strong><br>
                            Esperar comando PLC: ${result.config.waitForCommand === 'none' ? 'No esperar' : result.config.waitForCommand}
                        </div>
                    `;
                }
            })
            .catch(error => console.error('Error al actualizar configuración:', error));
        });
    }
    
    // Ping periódico para mantener la conexión activa
    setInterval(function() {
        if (socket.connected) {
            console.log('Ping al servidor...');
        }
    }, 30000);
});
