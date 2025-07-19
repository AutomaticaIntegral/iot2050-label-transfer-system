/**
 * Simulador IOT2050 - TCP Label Transfer
 * Cliente: Adisseo
 * Desarrollador: Automática Integral
 * Año: 2025
 */

// Conectar al servidor via Socket.IO
const socket = io();

// Variables globales
let labels = [];
let labelModal;

// Elementos DOM
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el modal de etiquetas
    labelModal = new bootstrap.Modal(document.getElementById('labelModal'));
    
    // Cargar lista de etiquetas
    fetchLabels();
    
    // Configurar eventos
    document.getElementById('refreshLabelsBtn').addEventListener('click', fetchLabels);
    document.getElementById('clearLabelsBtn').addEventListener('click', clearAllLabels);
    document.getElementById('printForm').addEventListener('submit', handlePrintSubmit);
    document.getElementById('modalPrintBtn').addEventListener('click', handleModalPrint);
    
    // Configurar Socket.IO
    setupSocketListeners();
});

// Cargar lista de etiquetas
function fetchLabels() {
    fetch('/api/labels')
        .then(response => response.json())
        .then(data => {
            labels = data;
            updateLabelsTable();
            updateLabelSelect();
        })
        .catch(error => {
            console.error('Error al cargar etiquetas:', error);
            addActivityItem(`Error al cargar etiquetas: ${error.message}`, 'error');
        });
}

// Borrar todas las etiquetas
function clearAllLabels() {
    if (!confirm('¿Estás seguro de que deseas borrar TODAS las etiquetas? Esta acción no se puede deshacer.')) {
        return; // Usuario canceló la operación
    }
    
    // Mostrar indicador de carga
    document.getElementById('clearLabelsBtn').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Borrando...';
    document.getElementById('clearLabelsBtn').disabled = true;
    
    fetch('/api/labels/clear', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addActivityItem(`Etiquetas borradas correctamente. Se eliminaron ${data.deletedCount} etiquetas.`, 'info');
            fetchLabels(); // Actualizar la lista de etiquetas
        } else {
            addActivityItem(`Error al borrar etiquetas: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error al borrar etiquetas:', error);
        addActivityItem(`Error al borrar etiquetas: ${error.message}`, 'error');
    })
    .finally(() => {
        // Restaurar el botón
        document.getElementById('clearLabelsBtn').innerHTML = '<i class="bi bi-trash"></i> Borrar Todo';
        document.getElementById('clearLabelsBtn').disabled = false;
    });
}

// Actualizar tabla de etiquetas
function updateLabelsTable() {
    const labelsTable = document.getElementById('labelsTable');
    
    if (labels.length === 0) {
        labelsTable.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-3 text-muted">
                    <i class="bi bi-inbox"></i> No hay etiquetas recibidas
                </td>
            </tr>
        `;
        return;
    }
    
    labelsTable.innerHTML = '';
    
    labels.forEach(label => {
        const row = document.createElement('tr');
        
        const created = new Date(label.created).toLocaleString();
        
        row.innerHTML = `
            <td>${label.id}</td>
            <td>${created}</td>
            <td>${formatBytes(label.size)}</td>
            <td>
                <button class="btn btn-sm btn-info me-1 view-label-btn" data-id="${label.id}">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-success print-label-btn" data-id="${label.id}">
                    <i class="bi bi-printer"></i>
                </button>
            </td>
        `;
        
        labelsTable.appendChild(row);
    });
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.view-label-btn').forEach(btn => {
        btn.addEventListener('click', () => viewLabel(btn.dataset.id));
    });
    
    document.querySelectorAll('.print-label-btn').forEach(btn => {
        btn.addEventListener('click', () => showPrintModal(btn.dataset.id));
    });
}

// Actualizar select de etiquetas
function updateLabelSelect() {
    const labelSelect = document.getElementById('labelSelect');
    
    // Guardar la opción seleccionada actual
    const currentSelection = labelSelect.value;
    
    // Limpiar opciones actuales (excepto la primera)
    while (labelSelect.options.length > 1) {
        labelSelect.remove(1);
    }
    
    // Agregar etiquetas al select
    labels.forEach(label => {
        const option = document.createElement('option');
        option.value = label.id;
        option.textContent = label.id;
        labelSelect.appendChild(option);
    });
    
    // Restaurar la selección si es posible
    if (currentSelection) {
        labelSelect.value = currentSelection;
    }
}

// Ver contenido de una etiqueta
function viewLabel(labelId) {
    const labelContent = document.getElementById('labelContent');
    labelContent.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando contenido de etiqueta...</p>
        </div>
    `;
    
    fetch(`/api/labels/${labelId}`)
        .then(response => response.json())
        .then(data => {
            labelContent.innerHTML = `
                <div class="p-2">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="fw-bold">${data.id}</span>
                        <span class="badge bg-secondary">${formatBytes(data.size)}</span>
                    </div>
                    <pre class="p-2 bg-dark text-light rounded">${escapeHtml(data.content)}</pre>
                </div>
            `;
            
            // Agregar a actividad
            addActivityItem(`Visualización de etiqueta: ${labelId}`, 'tcp');
        })
        .catch(error => {
            labelContent.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Error al cargar etiqueta: ${error.message}</p>
                </div>
            `;
            
            // Agregar a actividad
            addActivityItem(`Error al cargar etiqueta ${labelId}: ${error.message}`, 'error');
        });
}

// Mostrar modal de impresión
function showPrintModal(labelId) {
    document.getElementById('labelModalLabel').textContent = `Imprimir Etiqueta: ${labelId}`;
    
    const modalContent = document.getElementById('modalLabelContent');
    modalContent.textContent = 'Cargando...';
    
    fetch(`/api/labels/${labelId}`)
        .then(response => response.json())
        .then(data => {
            modalContent.textContent = data.content;
            
            // Guardar el ID de la etiqueta en el botón de impresión
            document.getElementById('modalPrintBtn').dataset.labelId = labelId;
            
            // Mostrar el modal
            labelModal.show();
        })
        .catch(error => {
            modalContent.textContent = `Error: ${error.message}`;
        });
}

// Manejar envío del formulario de impresión
function handlePrintSubmit(event) {
    event.preventDefault();
    
    const labelId = document.getElementById('labelSelect').value;
    const printerType = document.getElementById('printerSelect').value;
    
    if (!labelId || !printerType) {
        return;
    }
    
    printLabel(labelId, printerType);
}

// Manejar impresión desde el modal
function handleModalPrint() {
    const labelId = document.getElementById('modalPrintBtn').dataset.labelId;
    
    // Mostrar un pequeño diálogo para seleccionar la impresora
    const printerType = prompt('Seleccione tipo de impresora (product/rfid):', 'product');
    
    if (printerType && (printerType === 'product' || printerType === 'rfid')) {
        printLabel(labelId, printerType);
        labelModal.hide();
    } else if (printerType) {
        alert('Tipo de impresora inválido. Use "product" o "rfid".');
    }
}

// Enviar etiqueta a imprimir
function printLabel(labelId, printerType) {
    // Mostrar indicador de carga
    const submitBtn = document.querySelector('#printForm button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
    
    fetch('/api/print', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ labelId, printerType })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addActivityItem(`Etiqueta ${labelId} enviada a impresora ${printerType}`, 'print');
                alert(`Etiqueta enviada a impresora ${printerType} correctamente.`);
            } else {
                addActivityItem(`Error al imprimir etiqueta ${labelId}: ${data.error}`, 'error');
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => {
            addActivityItem(`Error al imprimir etiqueta ${labelId}: ${error.message}`, 'error');
            alert(`Error: ${error.message}`);
        })
        .finally(() => {
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
}

// Agregar elemento a la lista de actividad
function addActivityItem(message, type) {
    const activityLog = document.getElementById('activityLog');
    
    // Si es el primer elemento, limpiar el placeholder
    if (activityLog.querySelector('.text-center')) {
        activityLog.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    item.innerHTML = `
        <div class="d-flex justify-content-between">
            <span>${message}</span>
            <span class="activity-time">${time}</span>
        </div>
    `;
    
    // Insertar al principio
    activityLog.insertBefore(item, activityLog.firstChild);
    
    // Limitar a 100 entradas
    const items = activityLog.querySelectorAll('.activity-item');
    if (items.length > 100) {
        activityLog.removeChild(items[items.length - 1]);
    }
}

// Configurar listeners de Socket.IO
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Conectado al servidor del simulador IOT2050');
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado del servidor del simulador IOT2050');
    });
    
    socket.on('stats', (data) => {
        updateStats(data);
    });
    
    socket.on('label-received', (data) => {
        addActivityItem(`Etiqueta recibida desde ${data.from} (${formatBytes(data.size)})`, 'tcp');
        fetchLabels(); // Actualizar lista de etiquetas
    });
    
    socket.on('plc-command', (data) => {
        addActivityItem(`Comando PLC recibido desde ${data.from}`, 'plc');
    });
    
    socket.on('notification', (data) => {
        addActivityItem(data.message, data.type === 'error' ? 'error' : 'tcp');
    });
}

// Actualizar estadísticas en la interfaz
function updateStats(data) {
    if (data.type === 'tcpServer') {
        // Actualizar estado del servidor TCP
        const statusElement = document.getElementById('tcpServerStatus');
        statusElement.className = `status-indicator ${data.stats.started ? 'running' : 'stopped'}`;
        
        // Actualizar estadísticas
        document.getElementById('tcpConnections').textContent = data.stats.connections;
        document.getElementById('tcpLabelsReceived').textContent = data.stats.labelsReceived;
        document.getElementById('tcpErrors').textContent = data.stats.errors;
        
        // Actualizar última etiqueta
        if (data.stats.lastLabelTimestamp) {
            const date = new Date(data.stats.lastLabelTimestamp);
            document.getElementById('tcpLastLabel').textContent = date.toLocaleTimeString();
        }
    }
    else if (data.type === 'plcServer') {
        // Actualizar estado del servidor PLC
        const statusElement = document.getElementById('plcServerStatus');
        statusElement.className = `status-indicator ${data.stats.started ? 'running' : 'stopped'}`;
        
        // Actualizar estadísticas
        document.getElementById('plcConnections').textContent = data.stats.connections;
        document.getElementById('plcCommandsReceived').textContent = data.stats.commandsReceived;
        document.getElementById('plcErrors').textContent = data.stats.errors;
        
        // Actualizar último comando
        if (data.stats.lastCommandTimestamp) {
            const date = new Date(data.stats.lastCommandTimestamp);
            document.getElementById('plcLastCommand').textContent = date.toLocaleTimeString();
        }
    }
    else if (data.type === 'printers') {
        // Actualizar estado de las impresoras con estados detallados
        const productStatus = document.getElementById('printerProductStatus');
        const rfidStatus = document.getElementById('printerRfidStatus');
        
        // Funciones auxiliares para mostrar el estado detallado
        function getStatusText(printer) {
            if (!printer.connected) return 'Desconectada';
            
            // Si está conectada, mostrar el estado detallado
            const stateLabels = {
                'ready': 'Lista',
                'printing': 'Imprimiendo',
                'error': 'Error',
                'offline': 'Offline',
                'unknown': 'Estado desconocido'
            };
            
            return stateLabels[printer.status] || stateLabels.unknown;
        }
        
        function getStatusClass(printer) {
            if (!printer.connected) return 'disconnected';
            
            const stateClasses = {
                'ready': 'ready',
                'printing': 'printing',
                'error': 'error',
                'offline': 'offline',
                'unknown': 'warning'
            };
            
            return stateClasses[printer.status] || stateClasses.unknown;
        }
        
        // Actualizar textos y clases
        productStatus.textContent = getStatusText(data.stats.product);
        productStatus.className = `badge ${getStatusClass(data.stats.product)}`;
        
        rfidStatus.textContent = getStatusText(data.stats.rfid);
        rfidStatus.className = `badge ${getStatusClass(data.stats.rfid)}`;
        
        // Mostrar información adicional sobre estados manuales
        const productStatusDetail = document.getElementById('productStatusDetail');
        if (productStatusDetail) {
            if (data.stats.product.manualOffline || data.stats.product.manualError) {
                let detailText = '';
                if (data.stats.product.manualOffline) detailText = '(Modo offline manual)';
                if (data.stats.product.manualError) detailText = '(Modo error manual)';
                productStatusDetail.textContent = detailText;
                productStatusDetail.style.display = 'inline';
            } else {
                productStatusDetail.style.display = 'none';
            }
        }
        
        const rfidStatusDetail = document.getElementById('rfidStatusDetail');
        if (rfidStatusDetail) {
            if (data.stats.rfid.manualOffline || data.stats.rfid.manualError) {
                let detailText = '';
                if (data.stats.rfid.manualOffline) detailText = '(Modo offline manual)';
                if (data.stats.rfid.manualError) detailText = '(Modo error manual)';
                rfidStatusDetail.textContent = detailText;
                rfidStatusDetail.style.display = 'inline';
            } else {
                rfidStatusDetail.style.display = 'none';
            }
        }
        
        // Actualizar estadísticas
        document.getElementById('productLabelsSent').textContent = data.stats.product.labelsSent;
        document.getElementById('rfidLabelsSent').textContent = data.stats.rfid.labelsSent;
        document.getElementById('printerErrors').textContent = data.stats.product.errors + data.stats.rfid.errors;
    }
}

// Utilidades
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(html) {
    return html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
