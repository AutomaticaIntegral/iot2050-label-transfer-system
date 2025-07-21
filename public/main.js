/**
 * JavaScript para el monitor web con logs detallados
 * TCP Label Transfer - Cliente: Adisseo
 * Automática Integral - 2025
 */

// Cargar etiquetas de la API (función global)
function loadLabels() {
    fetch('/api/labels')
        .then(response => response.json())
        .then(labels => {
            const tableBody = document.querySelector('#labelsTableBody');
            if (!tableBody) return;
            
            tableBody.innerHTML = '';
            
            if (labels.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="5" class="text-center">No hay etiquetas guardadas</td>';
                tableBody.appendChild(row);
                return;
            }
            
            labels.forEach(label => {
                const row = document.createElement('tr');
                
                // Determinar tipo de etiqueta basado en copies o zpl
                let labelType = 'Desconocido';
                if (label.copies && label.copies > 1) {
                    labelType = 'Bidón';
                } else if (label.copies === 1) {
                    labelType = 'IBC';
                } else if (label.zpl && label.zpl.includes('^PQ4')) {
                    labelType = 'Bidón';
                } else if (label.zpl && label.zpl.includes('^PQ1')) {
                    labelType = 'IBC';
                }
                
                // Si tiene isRfid field, añadir RFID al tipo
                if (label.isRfid) {
                    labelType += ' (RFID)';
                }
                
                // Formatear fecha correctamente
                let formattedDate = '-';
                try {
                    if (label.timestamp) {
                        const date = new Date(label.timestamp);
                        if (date && !isNaN(date.getTime())) {
                            formattedDate = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        } else {
                            // Intentar parsear timestamp como número
                            const numericTimestamp = parseInt(label.timestamp);
                            if (!isNaN(numericTimestamp)) {
                                const dateFromNumber = new Date(numericTimestamp);
                                if (!isNaN(dateFromNumber.getTime())) {
                                    formattedDate = dateFromNumber.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                }
                            }
                        }
                    }
                } catch (e) {
                    formattedDate = '-';
                }
                
                row.innerHTML = `
                    <td><code>${label.id || '-'}</code></td>
                    <td>${formattedDate}</td>
                    <td><span class="badge bg-primary">ADI</span></td>
                    <td>${((label.size || 0) / 1024).toFixed(1)} KB</td>
                    <td><span class="badge bg-success">Procesada</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-label" data-id="${label.id}">
                            <i class="bi bi-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="printLabel('${label.id}')">
                            <i class="bi bi-printer"></i> Imprimir
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Agregar event listeners a los botones de ver
            document.querySelectorAll('.view-label').forEach(button => {
                button.addEventListener('click', (e) => {
                    const labelId = e.target.getAttribute('data-id');
                    viewLabelDetails(labelId);
                });
            });
            
            // Actualizar el selector de etiquetas si existe la función
            if (typeof updateLabelSelect === 'function') {
                updateLabelSelect(labels);
            }
        })
        .catch(error => {
            console.error('Error al cargar etiquetas:', error);
            console.log('SYSTEM: Error al cargar etiquetas:', error.message);
        });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicación de monitoreo...');
    
    // Variables globales
    let currentFilter = 'all';
    let currentLevelFilter = null;
    let autoScroll = true;
    let labels = [];

    // Estadísticas
    let statsData = {
        labels: 0,
        normalLabels: 0,
        rfidLabels: 0,
        normalPrints: 0,
        rfidPrints: 0,
        connections: 0,
        errors: 0,
        commands: 0,
        plcConnections: 0,
        plcCommands: 0,
        plcErrors: 0,
        lastNormalCounter: '0000',
        lastRfidCounter: '0000',
        lastCmd10Time: null,
        lastCmd11Time: null
    };

    // Elementos DOM principales
    const logs = document.getElementById('logs');
    const statusIndicator = document.getElementById('statusIndicator');
    const autoscrollCheck = document.getElementById('autoscrollCheck');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const labelsTable = document.getElementById('labelsTable');
    const labelContentPanel = document.getElementById('labelContentPanel');
    const activityLog = document.getElementById('activityLog');
    const labelSelect = document.getElementById('labelSelect');
    const configForm = document.getElementById('configForm');
    const currentWaitForCommand = document.getElementById('currentWaitForCommand');

    // Estadísticas DOM
    const tcpLabelsReceived = document.getElementById('tcpLabelsReceived');
    const tcpConnections = document.getElementById('tcpConnections');
    const tcpErrors = document.getElementById('tcpErrors');
    const tcpLastLabel = document.getElementById('tcpLastLabel');
    const plcConnections = document.getElementById('plcConnections');
    const plcCommandsReceived = document.getElementById('plcCommandsReceived');
    const plcErrors = document.getElementById('plcErrors');
    const plcLastCommand = document.getElementById('plcLastCommand');

    // Iniciar Socket.io para comunicación en tiempo real
    const socket = io();

    // Conexión establecida con el servidor
    socket.on('connect', () => {
        console.log('Conectado al servidor Socket.io');
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-success';
            statusIndicator.innerText = 'Conectado';
        }
        addSystemMessage('Conexión establecida con el servidor', 'success');

        // Solicitar configuración actual
        fetch('/api/config')
            .then(response => response.json())
            .then(config => {
                updateConfigDisplay(config);
            })
            .catch(error => console.error('Error al obtener configuración:', error));

        // Cargar etiquetas
        loadLabels();
    });

    // Desconexión del servidor
    socket.on('disconnect', () => {
        console.log('Desconectado del servidor Socket.io');
        if (statusIndicator) {
            statusIndicator.className = 'badge bg-danger';
            statusIndicator.innerText = 'Desconectado';
        }
        addSystemMessage('Conexión perdida con el servidor', 'error');
    });

    // Recibir un log del servidor
    socket.on('log', (logData) => {
        addLogEntry(logData);
        
        // Actualizar estadísticas según el tipo de log
        updateStatsFromLog(logData);
        
        // Auto-scroll si está activado
        if (autoScroll && logs) {
            logs.scrollTop = logs.scrollHeight;
        }
    });

    // Recibir información de etiqueta
    socket.on('labelReceived', function(labelData) {
        console.log('Nueva etiqueta recibida:', labelData);
        
        // Actualizar estadísticas
        statsData.labels++;
        updateStatsDisplay();
        
        // Actualizar última etiqueta
        if (tcpLastLabel) {
            tcpLastLabel.textContent = labelData.id;
        }
        
        // Añadir a actividad reciente
        addActivity(`Nueva etiqueta recibida: ${labelData.gs1}`);
        
        // Actualizar tabla de etiquetas
        loadLabels();
    });

    // Actualizar estadísticas basado en logs recibidos
    function updateStatsFromLog(logData) {
        const { category, message, level } = logData;
        
        // Actualizar contadores según el mensaje
        if (category === 'PLC') {
            if (message.includes('Nueva conexión')) {
                statsData.plcConnections++;
            } else if (message.includes('comando')) {
                statsData.plcCommands++;
                
                // Detectar comandos específicos y contadores
                if (message.includes('CMD 10 recibido con contador:')) {
                    const counterMatch = message.match(/contador: "(\d+)"/);
                    if (counterMatch) {
                        statsData.lastNormalCounter = counterMatch[1].padStart(4, '0');
                        statsData.normalPrints++;
                        statsData.lastCmd10Time = new Date();
                        console.log(`[MONITOR] Contador NORMAL actualizado: ${statsData.lastNormalCounter}`);
                    }
                } else if (message.includes('CMD 11 recibido con contador:')) {
                    const counterMatch = message.match(/contador: "(\d+)"/);
                    if (counterMatch) {
                        statsData.lastRfidCounter = counterMatch[1].padStart(4, '0');
                        statsData.rfidPrints++;
                        statsData.lastCmd11Time = new Date();
                        console.log(`[MONITOR] Contador RFID actualizado: ${statsData.lastRfidCounter}`);
                    }
                }
                
                // Detectar cualquier comando PLC para estadísticas generales
                if (message.includes('📋 CMD 10') || message.includes('📋 CMD 11')) {
                    // Ya se cuenta arriba
                } else if (message.includes('comando')) {
                    // Otros comandos PLC
                }
            } else if (level === 'error') {
                statsData.plcErrors++;
            }
        } else if (category === 'ADI') {
            if (message.includes('Nueva conexión')) {
                statsData.connections++;
            } else if (message.includes('etiqueta NORMAL')) {
                statsData.normalLabels++;
                statsData.labels++;
            } else if (message.includes('etiqueta RFID')) {
                statsData.rfidLabels++;
                statsData.labels++;
            } else if (level === 'error') {
                statsData.errors++;
            }
        }
        
        // Actualizar display
        updateStatsDisplay();
        updateCounterDisplay();
    }

    // Actualizar display de estadísticas
    function updateStatsDisplay() {
        // Métricas principales
        const normalCounterEl = document.getElementById('normalCounter');
        const rfidCounterEl = document.getElementById('rfidCounter');
        const totalLabelsEl = document.getElementById('totalLabels');
        const plcCommandsEl = document.getElementById('plcCommands');
        const normalCounterStatusEl = document.getElementById('normalCounterStatus');
        const rfidCounterStatusEl = document.getElementById('rfidCounterStatus');
        const labelsBreakdownEl = document.getElementById('labelsBreakdown');
        const lastPlcCommandEl = document.getElementById('lastPlcCommand');
        
        if (normalCounterEl) normalCounterEl.textContent = statsData.lastNormalCounter;
        if (rfidCounterEl) rfidCounterEl.textContent = statsData.lastRfidCounter;
        if (totalLabelsEl) totalLabelsEl.textContent = statsData.labels;
        if (plcCommandsEl) plcCommandsEl.textContent = statsData.plcCommands;
        
        if (normalCounterStatusEl) {
            normalCounterStatusEl.textContent = statsData.lastCmd10Time ? 
                `Último: ${statsData.lastCmd10Time.toLocaleTimeString()}` : 'Último: -';
        }
        if (rfidCounterStatusEl) {
            rfidCounterStatusEl.textContent = statsData.lastCmd11Time ? 
                `Último: ${statsData.lastCmd11Time.toLocaleTimeString()}` : 'Último: -';
        }
        if (labelsBreakdownEl) {
            labelsBreakdownEl.textContent = `N: ${statsData.normalLabels} | R: ${statsData.rfidLabels}`;
        }
        if (lastPlcCommandEl) {
            if (statsData.lastCmd11Time && statsData.lastCmd10Time) {
                const lastCmd = statsData.lastCmd11Time > statsData.lastCmd10Time ? 'CMD 11' : 'CMD 10';
                lastPlcCommandEl.textContent = `CMD: ${lastCmd}`;
            } else if (statsData.lastCmd10Time) {
                lastPlcCommandEl.textContent = 'CMD: CMD 10';
            } else if (statsData.lastCmd11Time) {
                lastPlcCommandEl.textContent = 'CMD: CMD 11';
            } else {
                lastPlcCommandEl.textContent = 'CMD: -';
            }
        }
        
        // Backwards compatibility
        if (tcpLabelsReceived) tcpLabelsReceived.textContent = statsData.labels;
        if (tcpConnections) tcpConnections.textContent = statsData.connections;
        if (tcpErrors) tcpErrors.textContent = statsData.errors;
        if (plcConnections) plcConnections.textContent = statsData.plcConnections;
        if (plcCommandsReceived) plcCommandsReceived.textContent = statsData.plcCommands;
        if (plcErrors) plcErrors.textContent = statsData.plcErrors;
    }
    
    // Actualizar display detallado de contadores
    function updateCounterDisplay() {
        // Contadores detallados
        const normalCounterDisplayEl = document.getElementById('normalCounterDisplay');
        const rfidCounterDisplayEl = document.getElementById('rfidCounterDisplay');
        const normalLabelsCountEl = document.getElementById('normalLabelsCount');
        const rfidLabelsCountEl = document.getElementById('rfidLabelsCount');
        const normalPrintsCountEl = document.getElementById('normalPrintsCount');
        const rfidPrintsCountEl = document.getElementById('rfidPrintsCount');
        const lastNormalLabelEl = document.getElementById('lastNormalLabel');
        const lastRfidLabelEl = document.getElementById('lastRfidLabel');
        const lastCmd10TimeEl = document.getElementById('lastCmd10Time');
        const lastCmd11TimeEl = document.getElementById('lastCmd11Time');
        
        if (normalCounterDisplayEl) normalCounterDisplayEl.textContent = statsData.lastNormalCounter;
        if (rfidCounterDisplayEl) rfidCounterDisplayEl.textContent = statsData.lastRfidCounter;
        if (normalLabelsCountEl) normalLabelsCountEl.textContent = statsData.normalLabels;
        if (rfidLabelsCountEl) rfidLabelsCountEl.textContent = statsData.rfidLabels;
        if (normalPrintsCountEl) normalPrintsCountEl.textContent = statsData.normalPrints;
        if (rfidPrintsCountEl) rfidPrintsCountEl.textContent = statsData.rfidPrints;
        
        if (lastNormalLabelEl) {
            lastNormalLabelEl.textContent = statsData.normalLabels > 0 ? 
                `(21)${statsData.lastNormalCounter}` : '-';
        }
        if (lastRfidLabelEl) {
            lastRfidLabelEl.textContent = statsData.rfidLabels > 0 ? 
                `(21)${statsData.lastRfidCounter}` : '-';
        }
        if (lastCmd10TimeEl) {
            lastCmd10TimeEl.textContent = statsData.lastCmd10Time ? 
                statsData.lastCmd10Time.toLocaleTimeString() : '-';
        }
        if (lastCmd11TimeEl) {
            lastCmd11TimeEl.textContent = statsData.lastCmd11Time ? 
                statsData.lastCmd11Time.toLocaleTimeString() : '-';
        }
    }

    // Añadir un mensaje de sistema (no del servidor)
    function addSystemMessage(message, level = 'info') {
        const timestamp = new Date().toISOString();
        addLogEntry({
            timestamp,
            category: 'SYSTEM',
            level,
            message
        });
    }

    // Añadir entrada de log
    function addLogEntry(logData) {
        if (!logs) return;
        
        const { timestamp, category, message, level } = logData;
        
        // Filtrar si es necesario
        if (currentFilter !== 'all' && category !== currentFilter) return;
        if (currentLevelFilter && level !== currentLevelFilter) return;
        
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
        logs.appendChild(logEntry);
        
        // Auto-scroll
        if (autoScroll) {
            logs.scrollTop = logs.scrollHeight;
        }
        
        // Limitar número de logs (mantener solo los últimos 500)
        while (logs.children.length > 500) {
            logs.removeChild(logs.firstChild);
        }
    }

    // Añadir actividad a la lista de actividades recientes
    function addActivity(message) {
        if (!activityLog) return;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-time">${timeString}</div>
            <div class="activity-message">${message}</div>
        `;
        
        // Insertar al principio
        if (activityLog.firstChild) {
            activityLog.insertBefore(activityItem, activityLog.firstChild);
        } else {
            activityLog.appendChild(activityItem);
        }
        
        // Eliminar mensaje "sin actividad" si existe
        const noActivityMsg = activityLog.querySelector('.text-muted');
        if (noActivityMsg) {
            activityLog.removeChild(noActivityMsg);
        }
        
        // Limitar a 10 actividades
        while (activityLog.children.length > 10) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }

    // Actualizar selector de etiquetas
    function updateLabelSelect(labelsData) {
        if (!labelSelect) return;
        
        // Limpiar opciones existentes excepto la primera
        while (labelSelect.options.length > 1) {
            labelSelect.remove(1);
        }
        
        // Añadir nuevas opciones
        if (labelsData && labelsData.length > 0) {
            labelsData.forEach(label => {
                const option = document.createElement('option');
                option.value = label.id;
                option.textContent = `${label.id} - ${new Date(label.timestamp).toLocaleTimeString()}`;
                labelSelect.appendChild(option);
            });
        }
    }

    // Actualizar display de configuración
    function updateConfigDisplay(config) {
        if (!currentWaitForCommand) return;
        
        let displayText = 'Esperando comando PLC: ';
        switch (config.waitForCommand) {
            case 'none':
                displayText += 'No esperar (respuesta inmediata)';
                break;
            case 'any':
                displayText += 'Cualquier comando';
                break;
            default:
                displayText += config.waitForCommand;
        }
        
        currentWaitForCommand.textContent = displayText;
        
        // Actualizar selector si existe
        const waitForCommandSelect = document.getElementById('waitForCommand');
        if (waitForCommandSelect) {
            waitForCommandSelect.value = config.waitForCommand;
        }
    }

    // Eventos DOM
    if (autoscrollCheck) {
        autoscrollCheck.addEventListener('change', function() {
            autoScroll = this.checked;
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', function() {
            if (logs) {
                logs.innerHTML = '';
                addSystemMessage('Logs limpiados', 'info');
            }
        });
    }

    // Filtros de log
    document.querySelectorAll('.dropdown-item[data-filter]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentFilter = this.getAttribute('data-filter');
            
            // Actualizar UI para mostrar filtro activo
            document.querySelectorAll('.dropdown-item[data-filter]').forEach(i => {
                i.classList.remove('active');
            });
            this.classList.add('active');
            
            addSystemMessage(`Filtro aplicado: ${currentFilter}`, 'info');
        });
    });

    // Filtros por nivel
    document.querySelectorAll('.dropdown-item[data-level]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentLevelFilter = this.getAttribute('data-level');
            
            // Actualizar UI para mostrar filtro activo
            document.querySelectorAll('.dropdown-item[data-level]').forEach(i => {
                i.classList.remove('active');
            });
            this.classList.add('active');
            
            addSystemMessage(`Filtro por nivel aplicado: ${currentLevelFilter}`, 'info');
        });
    });

    // Formulario de configuración
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
                addSystemMessage(`Configuración actualizada: Esperar comando ${result.config.waitForCommand}`, 'success');
                updateConfigDisplay(result.config);
            })
            .catch(error => {
                console.error('Error al actualizar configuración:', error);
                addSystemMessage(`Error al actualizar configuración: ${error.message}`, 'error');
            });
        });
    }

    // Botón de actualizar etiquetas
    const refreshLabelsBtn = document.getElementById('refreshLabelsBtn');
    if (refreshLabelsBtn) {
        refreshLabelsBtn.addEventListener('click', function() {
            loadLabels();
            addActivity('Lista de etiquetas actualizada manualmente');
        });
    }
    
    // Actualizar etiquetas periódicamente cada 5 segundos
    setInterval(function() {
        if (socket.connected) {
            loadLabels();
        }
    }, 5000);

    // Ping periódico para mantener la conexión activa
    setInterval(function() {
        if (socket.connected) {
            console.log('Ping al servidor...');
        }
    }, 30000);

    // Función para cargar datos de contadores desde el servidor
    function loadCountersData() {
        fetch('/api/counters')
            .then(response => response.json())
            .then(data => {
                if (data.normal) {
                    statsData.lastNormalCounter = data.normal.lastCounter || '0000';
                    statsData.normalLabels = data.normal.labelsCount || 0;
                    statsData.normalPrints = data.normal.printsCount || 0;
                }
                if (data.rfid) {
                    statsData.lastRfidCounter = data.rfid.lastCounter || '0000';
                    statsData.rfidLabels = data.rfid.labelsCount || 0;
                    statsData.rfidPrints = data.rfid.printsCount || 0;
                }
                statsData.labels = statsData.normalLabels + statsData.rfidLabels;
                
                updateStatsDisplay();
                updateCounterDisplay();
            })
            .catch(error => {
                console.log('Info: API de contadores no disponible, usando datos de logs');
            });
    }
    
    // Actualizar contadores periódicamente cada 3 segundos
    setInterval(function() {
        if (socket.connected) {
            loadCountersData();
        }
    }, 3000);

    // Inicializar la carga de etiquetas y contadores
    loadLabels();
    loadCountersData();
});

// Función para ver detalles de una etiqueta
function viewLabelDetails(labelId) {
    fetch(`/api/labels/${labelId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Etiqueta no encontrada');
            }
            return response.json();
        })
        .then(label => {
            // Mostrar detalles de la etiqueta en el panel de contenido
            const contentPanel = document.getElementById('labelContentPanel');
            if (!contentPanel) return;
            
            // Extraer datos importantes
            const gs1 = label.barcode || 'N/A';
            const counter = gs1.match(/\(21\)(\d+)/) ? gs1.match(/\(21\)(\d+)/)[1] : 'N/A';
            const timestamp = new Date(label.timestamp).toLocaleString();
            const copies = label.copies || 1;
            const type = copies > 1 ? 'Bidón' : 'IBC';
            
            // Formatear ZPL para mejor visualización
            const zpl = label.zpl ? formatZpl(label.zpl) : 'No disponible';
            
            contentPanel.innerHTML = `
                <div class="card mb-3">
                    <div class="card-header bg-dark text-white">
                        <h5 class="mb-0">Detalles de Etiqueta</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6 class="border-bottom pb-2">Información General</h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>ID:</strong> ${label.id}</p>
                                    <p><strong>Fecha:</strong> ${timestamp}</p>
                                    <p><strong>Tipo:</strong> <span class="badge ${type === 'Bidón' ? 'bg-primary' : 'bg-success'}">${type}</span></p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Contador:</strong> ${counter}</p>
                                    <p><strong>Copias:</strong> ${copies}</p>
                                    <p><strong>Tamaño:</strong> ${label.size || 0} bytes</p>
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <h6 class="border-bottom pb-2">Código GS1</h6>
                            <div class="p-2 bg-light rounded">
                                <code>${gs1}</code>
                            </div>
                        </div>
                        <div class="mb-3">
                            <h6 class="border-bottom pb-2">Comandos ZPL</h6>
                            <div class="p-2 bg-dark text-light rounded" style="max-height: 300px; overflow-y: auto;">
                                <pre><code>${zpl}</code></pre>
                            </div>
                        </div>
                        <div class="d-flex justify-content-end">
                            <button class="btn btn-primary me-2 print-label" data-id="${label.id}" data-printer="product">Enviar a Impresora Producto</button>
                            <button class="btn btn-info print-label" data-id="${label.id}" data-printer="rfid">Enviar a Impresora RFID</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Agregar event listeners a los botones de impresión
            document.querySelectorAll('.print-label').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    const printer = e.target.getAttribute('data-printer');
                    printLabel(id, printer);
                });
            });
        })
        .catch(error => {
            console.error('Error al cargar detalles de etiqueta:', error);
            addSystemMessage(`Error al cargar detalles de etiqueta: ${error.message}`, 'error');
        });
}

// Función para escapar HTML
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para formatear el ZPL para mejor visualización
function formatZpl(zpl) {
    if (!zpl) return 'No disponible';
    
    // Escapar HTML
    let formatted = escapeHTML(zpl);
    
    // Formateo para mejor visualización
    formatted = formatted
        .replace(/(\^[A-Z0-9]+)/g, '<span style="color: #ffcc00;">$1</span>') // Comandos
        .replace(/~([A-Z0-9]+)/g, '<span style="color: #ff9900;">~$1</span>') // Tilde comandos
        .replace(/\(21\)(\d+)/g, '(21)<span style="color: #66ff66;">$1</span>') // Contador
        .replace(/\^FD([^\^]+)/g, '^FD<span style="color: #00ccff;">$1</span>'); // Datos
    
    return formatted;
}

// Función para enviar una etiqueta a una impresora
function printLabel(labelId, printer) {
    addSystemMessage(`Enviando etiqueta ${labelId} a impresora ${printer}...`, 'info');
    
    fetch(`/api/labels/${labelId}/print`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ printer })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Error al enviar etiqueta a impresora');
            });
        }
        return response.json();
    })
    .then(data => {
        addSystemMessage(`Éxito: ${data.message}`, 'success');
    })
    .catch(error => {
        console.error('Error al imprimir etiqueta:', error);
        addSystemMessage(`Error al imprimir etiqueta: ${error.message}`, 'error');
    });
}
