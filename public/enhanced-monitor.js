/**
 * Monitor Avanzado - TCP Label Transfer
 * Cliente: Adisseo
 * Desarrollado por: Automática Integral - 2025
 */

class EnhancedMonitor {
    constructor() {
        this.socket = null;
        this.logs = [];
        this.filteredLogs = [];
        this.currentFilter = 'all';
        this.currentLevelFilter = 'all';
        this.currentSearchTerm = '';
        this.logsPaused = false;
        this.autoScroll = true;
        this.lastEventTime = Date.now();
        
        // ⭐ Métricas del sistema con contadores PLC
        this.metrics = {
            totalLabels: 0,
            totalConnections: 0,
            totalErrors: 0,
            avgResponseTime: 0,
            responseTimes: [],
            errorLog: []
        };

        // ⭐ NUEVO: Estadísticas con contadores PLC
        this.statsData = {
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
            lastNormalCounter: '0000',     // ⚙️ Contador PLC (impresión real)
            lastRfidCounter: '0000',       // ⚙️ Contador PLC (impresión real)
            lastNormalCounterAdi: '0000',  // 🏷️ Contador ADI (etiqueta original)
            lastRfidCounterAdi: '0000',    // 🏷️ Contador ADI (etiqueta original)
            lastCmd10Time: null,
            lastCmd11Time: null
        };

        // Estado de componentes
        this.componentStatus = {
            adi: 'offline',
            iot: 'offline', 
            plc: 'offline',
            system: 'initializing'
        };

        // Timeline de eventos
        this.eventsTimeline = [];
        
        // ⭐ NUEVO: Almacenamiento de etiquetas completas para vistas
        this.currentNormalLabel = null;
        this.currentRfidLabel = null;
        
        this.init();
    }

    init() {
        this.initializeSocketConnection();
        this.setupEventListeners();
        this.startDiagnosticChecks();
        this.updateConnectionStatus('connecting');
        
        // Cargar configuración inicial
        this.loadSystemConfiguration();
        
        // ✅ NUEVA: Cargar estado de marcas de lectura PLC
        this.loadReadStatus();
        
        // Inicializar con datos de ejemplo para demostración
        this.initializeDemoData();
        
        console.log('Monitor Avanzado inicializado');
    }

    initializeSocketConnection() {
        this.socket = io();
        
        // ⭐ Hacer el socket disponible globalmente inmediatamente
        window.socket = this.socket;
        
        this.socket.on('connect', () => {
            console.log('Socket.io conectado');
            this.updateConnectionStatus('connected');
            this.addSystemEvent('Conexión establecida con el servidor', 'success');
            this.loadSystemConfiguration();
            this.refreshLabels();
            this.loadCountersData(); // ⭐ NUEVO: Cargar datos de contadores
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.io desconectado');
            this.updateConnectionStatus('disconnected');
            this.addSystemEvent('Conexión perdida con el servidor', 'error');
        });

        this.socket.on('log', (logData) => {
            this.processIncomingLog(logData);
        });

        this.socket.on('labelReceived', (labelData) => {
            this.processLabelReceived(labelData);
        });

        this.socket.on('error', (error) => {
            console.error('Socket.io error:', error);
            this.addSystemEvent(`Error de conexión: ${error}`, 'error');
        });
    }

    setupEventListeners() {
        // Formulario de configuración
        const configForm = document.getElementById('systemConfigForm');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfiguration();
            });
        }

        // Auto-scroll toggle
        const autoScrollToggle = document.getElementById('autoScrollLogs');
        if (autoScrollToggle) {
            autoScrollToggle.addEventListener('change', (e) => {
                this.autoScroll = e.target.checked;
            });
        }

        // Búsqueda en logs
        const searchInput = document.getElementById('logSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearchTerm = e.target.value;
                this.filterLogs();
            });
        }

        // ⭐ OPTIMIZADO: Actualizar contadores cada 30 segundos (solo si es necesario)
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                // Solo cargar si no hemos tenido comandos PLC recientes (evitar saturación)
                const hasRecentPlcActivity = this.statsData.lastCmd10Time || this.statsData.lastCmd11Time;
                if (!hasRecentPlcActivity) {
                    this.loadCountersData();
                }
                
                // ✅ NUEVA: También actualizar estado de marcas de lectura
                this.loadReadStatus();
            }
        }, 30000);

        // ⭐ NUEVO: Ping periódico para mantener la conexión activa
        setInterval(() => {
            if (this.socket && this.socket.connected) {
                console.log('Ping al servidor...');
            }
        }, 30000);
    }

    processIncomingLog(logData) {
        if (this.logsPaused) return;

        // Agregar timestamp si no existe
        logData.timestamp = logData.timestamp || new Date().toISOString();
        
        // Agregar al array de logs
        this.logs.push(logData);
        
        // Analizar el log para métricas
        this.analyzeLogForMetrics(logData);
        
        // Actualizar componentes basado en el log
        this.updateComponentStatusFromLog(logData);
        
        // Filtrar y mostrar
        this.filterLogs();
        
        // Agregar al timeline si es relevante
        if (this.isRelevantForTimeline(logData)) {
            this.addToTimeline(logData);
        }

        // Mantener solo los últimos 1000 logs para rendimiento
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
    }

    analyzeLogForMetrics(logData) {
        const { category, level, message } = logData;

        // Contar errores
        if (level === 'error') {
            this.metrics.totalErrors++;
            this.statsData.errors++;
            this.metrics.errorLog.push({
                timestamp: logData.timestamp,
                category,
                message
            });
            this.updateElement('totalErrors', this.metrics.totalErrors);
            this.updateElement('lastErrorTime', this.formatTimeAgo(logData.timestamp));
        }

        // Detectar nuevas conexiones
        if (message.includes('Nueva conexión') || message.includes('conectado')) {
            this.metrics.totalConnections++;
            this.statsData.connections++;
            this.updateElement('totalConnections', this.metrics.totalConnections);
        }

        // ⭐ NUEVO: Detectar contadores PLC
        if (category === 'PLC') {
            // ⭐ DEBUG: Log todos los mensajes PLC para diagnóstico
            console.log(`[DEBUG PLC] Mensaje recibido: "${message}"`);
            
            if (message.includes('Nueva conexión')) {
                this.statsData.plcConnections++;
            }
            
            // ⭐ Detectar comandos específicos y contadores (CORREGIDO - Directamente, sin condición padre)
            if (message.includes('CMD 10 recibido con contador:')) {
                this.statsData.plcCommands++;
                console.log(`[DEBUG] ✅ CMD 10 detectado en mensaje: "${message}"`);
                const counterMatch = message.match(/contador:\s*"(\d+)"/);
                if (counterMatch) {
                    this.statsData.lastNormalCounter = counterMatch[1].padStart(4, '0');
                    this.statsData.normalPrints++;
                    this.statsData.lastCmd10Time = new Date();
                    console.log(`[MONITOR] ✅ Contador NORMAL actualizado: ${this.statsData.lastNormalCounter}`);
                    this.updateStatsDisplay();
                    this.updateCounterDisplay();
                    
                    // ⭐ Actualizar window.statsData inmediatamente
                    window.statsData = this.statsData;
                } else {
                    console.log(`[DEBUG] ❌ No se pudo extraer contador de: "${message}"`);
                }
            } else if (message.includes('CMD 11 recibido con contador:')) {
                this.statsData.plcCommands++;
                console.log(`[DEBUG] ✅ CMD 11 detectado en mensaje: "${message}"`);
                const counterMatch = message.match(/contador:\s*"(\d+)"/);
                if (counterMatch) {
                    this.statsData.lastRfidCounter = counterMatch[1].padStart(4, '0');
                    this.statsData.rfidPrints++;
                    this.statsData.lastCmd11Time = new Date();
                    console.log(`[MONITOR] ✅ Contador RFID actualizado: ${this.statsData.lastRfidCounter}`);
                    this.updateStatsDisplay();
                    this.updateCounterDisplay();
                    
                    // ⭐ Actualizar window.statsData inmediatamente
                    window.statsData = this.statsData;
                } else {
                    console.log(`[DEBUG] ❌ No se pudo extraer contador de: "${message}"`);
                }
            } else if (level === 'error') {
                this.statsData.plcErrors++;
            }
        } else if (category === 'ADI') {
            if (message.includes('Nueva conexión')) {
                this.statsData.connections++;
            } else if (message.includes('etiqueta NORMAL')) {
                this.statsData.normalLabels++;
                this.statsData.labels++;
            } else if (message.includes('etiqueta RFID')) {
                this.statsData.rfidLabels++;
                this.statsData.labels++;
            } else if (level === 'error') {
                this.statsData.errors++;
            }
        }

        // Detectar tiempo de respuesta (ejemplo: buscar patrones en los mensajes)
        const responseTimeMatch = message.match(/(\d+)ms/);
        if (responseTimeMatch) {
            const responseTime = parseInt(responseTimeMatch[1]);
            this.metrics.responseTimes.push(responseTime);
            
            // Calcular promedio de los últimos 10 tiempos
            if (this.metrics.responseTimes.length > 10) {
                this.metrics.responseTimes = this.metrics.responseTimes.slice(-10);
            }
            
            this.metrics.avgResponseTime = Math.round(
                this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
            );
            
            this.updateElement('avgResponseTime', `${this.metrics.avgResponseTime}ms`);
        }

        // ⭐ Solo actualizar displays generales (contadores se actualizan en detección específica)
        // this.updateStatsDisplay(); // Movido a detección específica de contadores
        // this.updateCounterDisplay(); // Movido a detección específica de contadores
    }

    updateComponentStatusFromLog(logData) {
        const { category, message, level } = logData;

        switch (category) {
            case 'ADI':
                if (message.includes('Nueva conexión')) {
                    this.updateComponentStatus('adi', 'online');
                    this.updateFlowActivity('adi', 'Etiqueta recibida');
                } else if (level === 'error') {
                    this.updateComponentStatus('adi', 'error');
                }
                break;

            case 'PLC':
                if (message.includes('Nueva conexión')) {
                    this.updateComponentStatus('plc', 'online');
                    this.updateFlowActivity('plc', 'Comando procesado');
                } else if (level === 'error') {
                    this.updateComponentStatus('plc', 'error');
                }
                break;

            case 'SERVER':
                this.updateComponentStatus('iot', 'online');
                this.updateFlowActivity('iot', 'Sistema activo');
                break;
        }
    }

    updateComponentStatus(component, status) {
        this.componentStatus[component] = status;
        
        const statusElement = document.getElementById(`${component}Status`);
        if (statusElement) {
            statusElement.className = `status-indicator status-${status === 'error' ? 'offline' : status}`;
        }
        
        // Actualizar diagnóstico
        this.updateDiagnosticStatus();
    }

    updateFlowActivity(component, activity) {
        const activityElement = document.getElementById(`${component}LastActivity`);
        if (activityElement) {
            activityElement.textContent = activity;
            activityElement.className = 'small text-success mt-1';
        }
    }

    // ⭐ NUEVA: Actualizar métricas principales (de main.js)
    updateStatsDisplay() {
        const normalCounterEl = document.getElementById('normalCounter');
        const rfidCounterEl = document.getElementById('rfidCounter');
        const totalLabelsEl = document.getElementById('totalLabels');
        const plcCommandsEl = document.getElementById('plcCommands');
        const normalCounterStatusEl = document.getElementById('normalCounterStatus');
        const rfidCounterStatusEl = document.getElementById('rfidCounterStatus');
        const labelsBreakdownEl = document.getElementById('labelsBreakdown');
        const lastPlcCommandEl = document.getElementById('lastPlcCommand');
        
        if (normalCounterEl) normalCounterEl.textContent = this.statsData.lastNormalCounter;
        if (rfidCounterEl) rfidCounterEl.textContent = this.statsData.lastRfidCounter;
        if (totalLabelsEl) totalLabelsEl.textContent = this.statsData.labels;
        if (plcCommandsEl) plcCommandsEl.textContent = this.statsData.plcCommands;
        
        if (normalCounterStatusEl) {
            normalCounterStatusEl.textContent = this.statsData.lastCmd10Time ? 
                `Último: ${this.statsData.lastCmd10Time.toLocaleTimeString()}` : 'Último: -';
        }
        if (rfidCounterStatusEl) {
            rfidCounterStatusEl.textContent = this.statsData.lastCmd11Time ? 
                `Último: ${this.statsData.lastCmd11Time.toLocaleTimeString()}` : 'Último: -';
        }
        if (labelsBreakdownEl) {
            labelsBreakdownEl.textContent = `N: ${this.statsData.normalLabels} | R: ${this.statsData.rfidLabels}`;
        }
        if (lastPlcCommandEl) {
            if (this.statsData.lastCmd11Time && this.statsData.lastCmd10Time) {
                const lastCmd = this.statsData.lastCmd11Time > this.statsData.lastCmd10Time ? 'CMD 11' : 'CMD 10';
                lastPlcCommandEl.textContent = `CMD: ${lastCmd}`;
            } else if (this.statsData.lastCmd10Time) {
                lastPlcCommandEl.textContent = 'CMD: CMD 10';
            } else if (this.statsData.lastCmd11Time) {
                lastPlcCommandEl.textContent = 'CMD: CMD 11';
            } else {
                lastPlcCommandEl.textContent = 'CMD: -';
            }
        }

        // ⭐ Compatibilidad con elementos adicionales del HTML
        this.updateElement('tcpLabelsReceived', this.statsData.labels);
        this.updateElement('tcpConnections', this.statsData.connections);
        this.updateElement('tcpErrors', this.statsData.errors);
        this.updateElement('plcConnections', this.statsData.plcConnections);
        this.updateElement('plcCommandsReceived', this.statsData.plcCommands);
        this.updateElement('plcErrors', this.statsData.plcErrors);
        
        // ⭐ DEBUG: Log del estado actual de contadores (solo en cambios significativos)
        // console.log('[DEBUG STATS] Contadores actualizados:', {
        //     normalCounter: this.statsData.lastNormalCounter,
        //     rfidCounter: this.statsData.lastRfidCounter,
        //     normalPrints: this.statsData.normalPrints,
        //     rfidPrints: this.statsData.rfidPrints,
        //     lastCmd10: this.statsData.lastCmd10Time?.toLocaleTimeString(),
        //     lastCmd11: this.statsData.lastCmd11Time?.toLocaleTimeString()
        // });
    }
    
    // ⭐ NUEVA: Actualizar display detallado de contadores (de main.js)
    updateCounterDisplay() {
        const normalCounterDisplayEl = document.getElementById('normalCounterDisplay');
        const rfidCounterDisplayEl = document.getElementById('rfidCounterDisplay');
        const normalLabelsCountEl = document.getElementById('normalLabelsCount');
        const rfidLabelsCountEl = document.getElementById('rfidLabelsCount');
        const normalPrintsCountEl = document.getElementById('normalPrintsCount');
        const rfidPrintsCountEl = document.getElementById('rfidPrintsCount');
        const lastNormalLabelEl = document.getElementById('lastNormalLabel');
        const lastRfidLabelEl = document.getElementById('lastRfidLabel');
        // ⭐ NUEVO: Elementos para contadores ADI originales
        const lastNormalLabelAdiEl = document.getElementById('lastNormalLabelAdi');
        const lastRfidLabelAdiEl = document.getElementById('lastRfidLabelAdi');
        const lastCmd10TimeEl = document.getElementById('lastCmd10Time');
        const lastCmd11TimeEl = document.getElementById('lastCmd11Time');
        
        if (normalCounterDisplayEl) normalCounterDisplayEl.textContent = this.statsData.lastNormalCounter;
        if (rfidCounterDisplayEl) rfidCounterDisplayEl.textContent = this.statsData.lastRfidCounter;
        if (normalLabelsCountEl) normalLabelsCountEl.textContent = this.statsData.normalLabels;
        if (rfidLabelsCountEl) rfidLabelsCountEl.textContent = this.statsData.rfidLabels;
        if (normalPrintsCountEl) normalPrintsCountEl.textContent = this.statsData.normalPrints;
        if (rfidPrintsCountEl) rfidPrintsCountEl.textContent = this.statsData.rfidPrints;
        
        // ⭐ NUEVO: Actualizar contadores ADI originales
        if (lastNormalLabelAdiEl) {
            lastNormalLabelAdiEl.textContent = this.statsData.lastNormalCounterAdi ? 
                `(21)${this.statsData.lastNormalCounterAdi}` : '-';
        }
        if (lastRfidLabelAdiEl) {
            lastRfidLabelAdiEl.textContent = this.statsData.lastRfidCounterAdi ? 
                `(21)${this.statsData.lastRfidCounterAdi}` : '-';
        }
        
        // ⭐ Contadores PLC (de impresión)
        if (lastNormalLabelEl) {
            lastNormalLabelEl.textContent = this.statsData.lastCmd10Time ? 
                `(21)${this.statsData.lastNormalCounter}` : '-';
        }
        if (lastRfidLabelEl) {
            lastRfidLabelEl.textContent = this.statsData.lastCmd11Time ? 
                `(21)${this.statsData.lastRfidCounter}` : '-';
        }
        if (lastCmd10TimeEl) {
            lastCmd10TimeEl.textContent = this.statsData.lastCmd10Time ? 
                this.statsData.lastCmd10Time.toLocaleTimeString() : '-';
        }
        if (lastCmd11TimeEl) {
            lastCmd11TimeEl.textContent = this.statsData.lastCmd11Time ? 
                this.statsData.lastCmd11Time.toLocaleTimeString() : '-';
        }
    }

    processLabelReceived(labelData) {
        this.metrics.totalLabels++;
        this.updateElement('totalLabels', this.metrics.totalLabels);
        
        // Actualizar rate (simplificado)
        this.updateElement('labelsRate', `+${this.metrics.totalLabels} total`);
        
        // Agregar al timeline
        this.addToTimeline({
            timestamp: new Date().toISOString(),
            category: 'LABEL',
            message: `Nueva etiqueta: ${labelData.gs1 || labelData.id}`,
            level: 'success'
        });

        // Actualizar actividad del flujo
        this.updateFlowActivity('adi', `Etiqueta ${labelData.id} recibida`);
        
        // Refrescar tabla de etiquetas
        this.refreshLabels();
    }

    addToTimeline(logData) {
        this.eventsTimeline.unshift({
            ...logData,
            id: Date.now() + Math.random()
        });

        // Mantener solo los últimos 50 eventos
        if (this.eventsTimeline.length > 50) {
            this.eventsTimeline = this.eventsTimeline.slice(0, 50);
        }

        this.renderTimeline();
    }

    renderTimeline() {
        const timelineContainer = document.getElementById('eventsTimeline');
        if (!timelineContainer) return;

        if (this.eventsTimeline.length === 0) {
            timelineContainer.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-clock-history"></i> Esperando eventos...
                </div>
            `;
            return;
        }

        timelineContainer.innerHTML = this.eventsTimeline
            .slice(0, 10) // Mostrar solo los últimos 10
            .map(event => `
                <div class="timeline-entry ${event.level || 'info'}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <strong>[${event.category}]</strong> ${event.message}
                        </div>
                        <small class="text-muted">${this.formatTimeAgo(event.timestamp)}</small>
                    </div>
                </div>
            `).join('');
    }

    filterLogs() {
        this.filteredLogs = this.logs.filter(log => {
            // Filtro por categoría
            const categoryMatch = this.currentFilter === 'all' || log.category === this.currentFilter;
            
            // Filtro por nivel
            const levelMatch = this.currentLevelFilter === 'all' || log.level === this.currentLevelFilter;
            
            // Filtro por búsqueda
            const searchMatch = !this.currentSearchTerm || 
                log.message.toLowerCase().includes(this.currentSearchTerm.toLowerCase()) ||
                log.category.toLowerCase().includes(this.currentSearchTerm.toLowerCase());
            
            return categoryMatch && levelMatch && searchMatch;
        });

        this.renderLogs();
        this.updateLogStats();
    }

    renderLogs() {
        const logsContainer = document.getElementById('logsContainer') || document.getElementById('logs');
        if (!logsContainer) {
            console.log('[DEBUG] No se encontró elemento logsContainer o logs');
            return;
        }
        console.log(`[DEBUG] Renderizando ${this.filteredLogs.length} logs filtrados`);

        if (this.filteredLogs.length === 0) {
            logsContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-search"></i> No se encontraron logs con los filtros actuales
                </div>
            `;
            return;
        }

        // Mostrar solo los últimos 100 logs para rendimiento
        const logsToShow = this.filteredLogs.slice(-100);
        
        logsContainer.innerHTML = logsToShow.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            return `
                <div class="log-entry ${log.level || 'info'}">
                    <span class="log-timestamp">[${timestamp}]</span>
                    <span class="log-category">[${log.category}]</span>
                    <span class="log-message">${this.escapeHtml(log.message)}</span>
                </div>
            `;
        }).join('');

        // Auto-scroll si está habilitado
        if (this.autoScroll) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }
    }

    updateLogStats() {
        const totalLogs = this.logs.length;
        const errorLogs = this.logs.filter(log => log.level === 'error').length;
        const warnLogs = this.logs.filter(log => log.level === 'warn').length;
        const successLogs = this.logs.filter(log => log.level === 'success').length;

        this.updateElement('totalLogsCount', totalLogs);
        this.updateElement('errorLogsCount', errorLogs);
        this.updateElement('warnLogsCount', warnLogs);
        this.updateElement('successLogsCount', successLogs);
    }

    startDiagnosticChecks() {
        // Verificar puertos cada 30 segundos
        setInterval(() => {
            this.runDiagnosticChecks();
        }, 30000);

        // Ejecutar verificación inicial
        setTimeout(() => {
            this.runDiagnosticChecks();
        }, 2000);
    }

    runDiagnosticChecks() {
        // Verificar puerto ADI (9110)
        this.checkPort(9110, 'port9110Status');
        
        // Verificar puerto PLC (9200)
        this.checkPort(9200, 'port9200Status');
        
        // Verificar configuración
        this.checkConfiguration();
        
        // Verificar estado del sistema
        this.checkSystemHealth();
    }

    checkPort(port, statusElementId) {
        // Simulación de verificación de puerto
        // En un entorno real, esto haría una verificación real del puerto
        const isOnline = this.socket && this.socket.connected;
        const statusElement = document.getElementById(statusElementId);
        
        if (statusElement) {
            if (isOnline) {
                statusElement.className = 'badge bg-success';
                statusElement.textContent = 'Activo';
            } else {
                statusElement.className = 'badge bg-danger';
                statusElement.textContent = 'Desconectado';
            }
        }
    }

    checkConfiguration() {
        const statusElement = document.getElementById('configStatus');
        if (statusElement) {
            statusElement.className = 'badge bg-success';
            statusElement.textContent = 'Válida';
        }
    }

    checkSystemHealth() {
        const statusElement = document.getElementById('systemStatus');
        if (statusElement) {
            if (this.socket && this.socket.connected) {
                statusElement.className = 'badge bg-success';
                statusElement.textContent = 'Operativo';
            } else {
                statusElement.className = 'badge bg-warning';
                statusElement.textContent = 'Desconectado';
            }
        }
    }

    updateDiagnosticStatus() {
        // Actualizar estado general basado en componentes
        const allOnline = Object.values(this.componentStatus).every(status => 
            status === 'online' || status === 'initializing'
        );
        
        if (allOnline) {
            this.updateElement('systemStatus', 'Operativo');
            const statusElement = document.getElementById('systemStatus');
            if (statusElement) {
                statusElement.className = 'badge bg-success';
            }
        }
    }

    async loadSystemConfiguration() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            
            // Actualizar selector de configuración
            const waitForCommandSelect = document.getElementById('waitForCommand');
            if (waitForCommandSelect) {
                waitForCommandSelect.value = config.waitForCommand;
            }
            
            // Actualizar display de configuración actual
            this.updateConfigurationDisplay(config);
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.showAlert('Error al cargar configuración', 'danger');
        }
    }

    // ⭐ NUEVA: Cargar datos de contadores desde API (de main.js)
    async loadCountersData() {
        try {
            const response = await fetch('/api/counters');
            const data = await response.json();
            
            // ⭐ CONCEPTO CORREGIDO: Dos tipos de contadores diferentes
            // 1. Contadores ADI: Los iniciales de las etiquetas (21)0001
            // 2. Contadores PLC: Los de impresión real CMD 10/11 (21)0010
            
            // ⭐ REGLA: Solo usar contadores ADI si NUNCA hubo comandos PLC
            // Una vez que hay comandos PLC, esos contadores son PERMANENTES
            
            const hasEverHadCmd10 = this.statsData.lastCmd10Time !== null;
            const hasEverHadCmd11 = this.statsData.lastCmd11Time !== null;
            
            if (data.normal) {
                // Siempre preservar contador ADI original
                this.statsData.lastNormalCounterAdi = data.normal.lastCounter || '0000';
                
                if (!hasEverHadCmd10) {
                    // Solo usar contador ADI como contador de impresión si NUNCA hubo un CMD 10
                    this.statsData.lastNormalCounter = data.normal.lastCounter || '0000';
                    // console.log('[LOAD COUNTERS] 📥 Usando contador ADI NORMAL (sin CMD 10 previo):', this.statsData.lastNormalCounter);
                }
            }
            
            if (data.rfid) {
                // Siempre preservar contador ADI original
                this.statsData.lastRfidCounterAdi = data.rfid.lastCounter || '0000';
                
                if (!hasEverHadCmd11) {
                    // Solo usar contador ADI como contador de impresión si NUNCA hubo un CMD 11
                    this.statsData.lastRfidCounter = data.rfid.lastCounter || '0000';
                    // console.log('[LOAD COUNTERS] 📥 Usando contador ADI RFID (sin CMD 11 previo):', this.statsData.lastRfidCounter);
                }
            }
            
            // Siempre actualizar totales de etiquetas (no interfiere con contadores)
            if (data.normal) {
                this.statsData.normalLabels = data.normal.labelsCount || 0;
            }
            if (data.rfid) {
                this.statsData.rfidLabels = data.rfid.labelsCount || 0;
            }
            this.statsData.labels = this.statsData.normalLabels + this.statsData.rfidLabels;
            
            this.updateStatsDisplay();
            this.updateCounterDisplay();
        } catch (error) {
            console.log('Info: API de contadores no disponible, usando datos de logs');
        }
    }

    updateConfigurationDisplay(config) {
        const configDisplay = document.getElementById('currentConfigDisplay');
        if (configDisplay) {
            let text = '';
            let className = 'badge ';
            
            switch (config.waitForCommand) {
                case 'none':
                    text = 'Inmediato';
                    className += 'bg-warning';
                    break;
                case '80':
                    text = 'Espera PLC 80';
                    className += 'bg-info';
                    break;
                default:
                    text = `Espera ${config.waitForCommand}`;
                    className += 'bg-secondary';
            }
            
            configDisplay.textContent = text;
            configDisplay.className = className;
        }
    }

    async saveConfiguration() {
        const waitForCommand = document.getElementById('waitForCommand').value;
        
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ waitForCommand })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Configuración guardada correctamente', 'success');
                this.updateConfigurationDisplay(result.config);
                this.addSystemEvent('Configuración actualizada', 'success');
            } else {
                this.showAlert('Error al guardar configuración', 'danger');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showAlert('Error de comunicación al guardar', 'danger');
        }
    }

    async refreshLabels() {
        try {
            const response = await fetch('/api/labels');
            const labels = await response.json();
            this.renderLabelsTable(labels);
            this.updateLastFileDisplaySeparated(labels); // ⭐ NUEVO: Función separada por tipos
        } catch (error) {
            console.error('Error loading labels:', error);
        }
    }

    // ⭐ NUEVO: Función para separar y mostrar etiquetas por tipo
    updateLastFileDisplaySeparated(labels) {
        if (!labels || labels.length === 0) {
            this.showNoLabelsMessage('normal');
            this.showNoLabelsMessage('rfid');
            return;
        }

        // Separar etiquetas por tipo
        const normalLabels = labels.filter(label => 
            label.type === 'NORMAL' || 
            label.type === 'PRODUCTO' || 
            (!label.isRfid && !label.type?.includes('RFID'))
        );
        
        const rfidLabels = labels.filter(label => 
            label.type === 'RFID' || 
            label.isRfid === true ||
            label.type?.includes('RFID')
        );

        // Actualizar última etiqueta NORMAL
        if (normalLabels.length > 0) {
            const lastNormal = normalLabels[0];
            this.updateFileDisplay('normal', lastNormal);
        } else {
            this.showNoLabelsMessage('normal');
        }

        // Actualizar última etiqueta RFID
        if (rfidLabels.length > 0) {
            const lastRfid = rfidLabels[0];
            this.updateFileDisplay('rfid', lastRfid);
        } else {
            this.showNoLabelsMessage('rfid');
        }
    }

    // ⭐ NUEVO: Actualizar display de un tipo específico de etiqueta
    updateFileDisplay(type, labelData) {
        console.log(`[DEBUG updateFileDisplay] *** ALMACENANDO DATOS PARA ${type.toUpperCase()} ***`);
        console.log(`[DEBUG updateFileDisplay] Datos recibidos:`, {
            id: labelData?.id,
            hasZpl: !!labelData?.zpl,
            hasOriginalZpl: !!labelData?.originalZpl,
            gs1: labelData?.gs1
        });
        
        const prefix = type === 'normal' ? 'lastNormalFile' : 'lastRfidFile';
        
        // ⭐ Almacenar datos completos para vistas
        if (type === 'normal') {
            this.currentNormalLabel = labelData;
            console.log(`[DEBUG updateFileDisplay] ✅ ALMACENADO en currentNormalLabel`);
        } else {
            this.currentRfidLabel = labelData;
            console.log(`[DEBUG updateFileDisplay] ✅ ALMACENADO en currentRfidLabel`);
        }
        
        // Actualizar información del archivo
        this.updateElement(`${prefix}Id`, labelData.id || '-');
        this.updateElement(`${prefix}Timestamp`, labelData.timestamp ? new Date(labelData.timestamp).toLocaleString() : '-');
        this.updateElement(`${prefix}Size`, labelData.size ? this.formatFileSize(labelData.size) : '-');
        this.updateElement(`${prefix}GS1`, labelData.gs1 || '-');

        // Mostrar contenido según la vista seleccionada
        console.log(`[DEBUG updateFileDisplay] Llamando a updateFileContent para ${type}`);
        this.updateFileContent(type, labelData);
    }

    // ⭐ NUEVO: Mostrar mensaje cuando no hay etiquetas de un tipo
    showNoLabelsMessage(type) {
        const contentId = type === 'normal' ? 'lastNormalFileContent' : 'lastRfidFileContent';
        const icon = type === 'normal' ? 'bi-tag' : 'bi-broadcast';
        const typeName = type === 'normal' ? 'PRODUCTO' : 'RFID';
        
        const contentElement = document.getElementById(contentId);
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="${icon}" style="font-size: 2rem;"></i>
                    <p class="mt-2">No hay etiquetas ${typeName}</p>
                    <small>Las etiquetas aparecerán aquí cuando se reciban de ADI</small>
                </div>
            `;
        }
        
        // Limpiar información del archivo
        const prefix = type === 'normal' ? 'lastNormalFile' : 'lastRfidFile';
        this.updateElement(`${prefix}Id`, '-');
        this.updateElement(`${prefix}Timestamp`, '-');
        this.updateElement(`${prefix}Size`, '-');
        this.updateElement(`${prefix}GS1`, '-');
    }

    // ⭐ NUEVO: Actualizar contenido del archivo según la vista seleccionada
    updateFileContent(type, labelData = null) {
        console.log(`[DEBUG updateFileContent] *** INICIANDO PARA ${type.toUpperCase()} ***`);
        
        const contentId = type === 'normal' ? 'lastNormalFileContent' : 'lastRfidFileContent';
        const contentElement = document.getElementById(contentId);
        
        if (!contentElement) {
            console.error(`[updateFileContent] No se encontró elemento: ${contentId}`);
            return;
        }

        // Usar datos almacenados si no se proporcionan
        if (!labelData) {
            labelData = type === 'normal' ? this.currentNormalLabel : this.currentRfidLabel;
            console.log(`[DEBUG updateFileContent] Datos almacenados para ${type}:`, labelData ? 'SÍ DISPONIBLE' : 'NO DISPONIBLE');
            if (labelData) {
                console.log(`[DEBUG updateFileContent] ZPL disponible:`, labelData.zpl ? 'SÍ' : 'NO');
                console.log(`[DEBUG updateFileContent] OriginalZPL disponible:`, labelData.originalZpl ? 'SÍ' : 'NO');
            }
        }
        
        if (!labelData) {
            console.log(`[DEBUG updateFileContent] No hay datos para ${type}, mostrando mensaje vacío`);
            this.showNoLabelsMessage(type);
            return;
        }

        // Obtener vista seleccionada para este tipo
        const viewType = this.getSelectedFileView(type);
        console.log(`[DEBUG updateFileContent] Vista seleccionada: ${viewType}`);
        let content = '';

        switch (viewType) {
            case 'formatted':
                content = this.formatZplContent(labelData.zpl || labelData.originalZpl || '');
                console.log(`[DEBUG updateFileContent] Contenido FORMATTED generado, longitud: ${content.length}`);
                break;
            case 'raw':
                content = this.escapeHtml(labelData.zpl || labelData.originalZpl || '');
                console.log(`[DEBUG updateFileContent] Contenido RAW generado, longitud: ${content.length}`);
                break;
            case 'original':
                content = this.escapeHtml(labelData.originalZpl || labelData.zpl || '');
                console.log(`[DEBUG updateFileContent] Contenido ORIGINAL generado, longitud: ${content.length}`);
                break;
            default:
                content = this.formatZplContent(labelData.zpl || labelData.originalZpl || '');
                console.log(`[DEBUG updateFileContent] Contenido DEFAULT generado, longitud: ${content.length}`);
        }
        
        if (!content) {
            console.log(`[DEBUG updateFileContent] No hay contenido, mostrando mensaje de error`);
            const icon = type === 'normal' ? 'bi-tag' : 'bi-broadcast';
            const typeName = type === 'normal' ? 'PRODUCTO' : 'RFID';
            contentElement.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="${icon}"></i>
                    <p>No hay contenido disponible para la etiqueta ${typeName}</p>
                </div>
            `;
            return;
        }

        console.log(`[DEBUG updateFileContent] ✅ ACTUALIZANDO CONTENIDO VISUAL para ${type}`);
        contentElement.innerHTML = `<pre class="mb-0" style="white-space: pre-wrap; word-wrap: break-word;">${content}</pre>`;
        
        console.log(`[VIEW] ✅ ${type.toUpperCase()} cambiado a: ${viewType}`);
    }

    // ⭐ NUEVO: Obtener vista seleccionada para un tipo específico
    getSelectedFileView(type) {
        console.log(`[DEBUG getSelectedFileView] *** DETECTANDO VISTA PARA ${type.toUpperCase()} ***`);
        const prefix = type === 'normal' ? 'normal' : 'rfid';
        
        // ⭐ Intentar múltiples patrones de IDs para mayor compatibilidad
        const possibleIds = {
            raw: [`${prefix}ViewRaw`, `${prefix}Raw`, `${prefix}ViewTypeRaw`],
            original: [`${prefix}ViewOriginal`, `${prefix}Original`, `${prefix}ViewTypeOriginal`],
            formatted: [`${prefix}ViewFormatted`, `${prefix}Formatted`, `${prefix}ViewTypeFormatted`]
        };
        
        // Buscar qué radio button está seleccionado
        for (const [viewType, ids] of Object.entries(possibleIds)) {
            for (const id of ids) {
                const radio = document.getElementById(id);
                if (radio) {
                    console.log(`[DEBUG getSelectedFileView] Radio ${id}: exists=${!!radio}, checked=${radio.checked}`);
                    if (radio.checked) {
                        console.log(`[DEBUG getSelectedFileView] ✅ DETECTADO: ${viewType} (ID: ${id})`);
                        return viewType;
                    }
                } else {
                    console.log(`[DEBUG getSelectedFileView] Radio ${id}: NO EXISTE`);
                }
            }
        }
        
        // ⭐ Fallback: buscar por name attribute
        console.log(`[DEBUG getSelectedFileView] Probando fallback con name attribute...`);
        const nameAttribute = type === 'normal' ? 'normalFileView' : 'rfidFileView';
        const checkedRadio = document.querySelector(`input[name="${nameAttribute}"]:checked`);
        if (checkedRadio) {
            console.log(`[DEBUG getSelectedFileView] Fallback encontró: ${checkedRadio.id}`);
            const id = checkedRadio.id;
            if (id.includes('Raw')) {
                console.log(`[DEBUG getSelectedFileView] ✅ FALLBACK DETECTADO: raw`);
                return 'raw';
            }
            if (id.includes('Original')) {
                console.log(`[DEBUG getSelectedFileView] ✅ FALLBACK DETECTADO: original`);
                return 'original';
            }
            if (id.includes('Formatted')) {
                console.log(`[DEBUG getSelectedFileView] ✅ FALLBACK DETECTADO: formatted`);
                return 'formatted';
            }
        } else {
            console.log(`[DEBUG getSelectedFileView] Fallback: No se encontró radio con name="${nameAttribute}"`);
        }
        
        console.log(`[DEBUG getSelectedFileView] ⚠️ USANDO DEFAULT: formatted`);
        return 'formatted'; // Por defecto
    }

    // ⭐ MANTENER: Función original para compatibilidad
    updateLastFileDisplay(labels) {
        // Redirigir a la nueva función separada
        this.updateLastFileDisplaySeparated(labels);
    }

    updateFileContentView() {
        if (!this.currentLastFile) return;

        const contentElement = document.getElementById('lastFileContent');
        if (!contentElement) return;

        const viewType = this.getSelectedFileView();
        let content = '';

        switch (viewType) {
            case 'formatted':
                content = this.formatZplContent(this.currentLastFile.zpl || this.currentLastFile.originalZpl || '');
                break;
            case 'raw':
                content = this.escapeHtml(this.currentLastFile.zpl || this.currentLastFile.originalZpl || '');
                break;
            case 'original':
                content = this.escapeHtml(this.currentLastFile.originalZpl || this.currentLastFile.zpl || '');
                break;
            default:
                content = this.formatZplContent(this.currentLastFile.zpl || this.currentLastFile.originalZpl || '');
        }

        if (!content) {
            contentElement.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>No hay contenido disponible para mostrar</p>
                </div>
            `;
            return;
        }

        contentElement.innerHTML = `<pre class="mb-0" style="white-space: pre-wrap; word-wrap: break-word;">${content}</pre>`;
    }

    getSelectedFileView() {
        const formattedRadio = document.getElementById('viewFormatted');
        const rawRadio = document.getElementById('viewRaw');
        const originalRadio = document.getElementById('viewOriginal');

        if (rawRadio && rawRadio.checked) return 'raw';
        if (originalRadio && originalRadio.checked) return 'original';
        return 'formatted'; // Por defecto
    }

    formatZplContent(zplContent) {
        if (!zplContent) return '';

        // Dividir el contenido ZPL en comandos para mejor legibilidad
        let formatted = zplContent
            // Agregar saltos de línea después de comandos principales
            .replace(/(\^XA)/g, '$1\n')
            .replace(/(\^XZ)/g, '\n$1')
            .replace(/(\^FO)/g, '\n$1')
            .replace(/(\^FD)/g, '\n  $1')
            .replace(/(\^FS)/g, '$1\n')
            .replace(/(\^BY)/g, '\n$1')
            .replace(/(\^BC)/g, '\n$1')
            .replace(/(\^A0)/g, '\n$1')
            .replace(/(\^PQ)/g, '\n$1')
            // Limpiar múltiples saltos de línea consecutivos
            .replace(/\n\n+/g, '\n\n')
            .trim();

        // Agregar colores con HTML (escapar primero)
        formatted = this.escapeHtml(formatted);
        
        // Colorear comandos ZPL
        formatted = formatted
            .replace(/(\^[A-Z]{1,2}\d*)/g, '<span style="color: #569cd6;">$1</span>')
            .replace(/(~[A-Z]{1,2})/g, '<span style="color: #ce9178;">$1</span>')
            .replace(/(\^FD[^^\n]*)/g, '<span style="color: #6a9955;">$1</span>')
            .replace(/(\([^)]+\))/g, '<span style="color: #dcdcaa;">$1</span>');

        return formatted;
    }

    renderLabelsTable(labels) {
        const tableBody = document.getElementById('labelsTableBody');
        if (!tableBody) return;

        if (labels.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-inbox"></i> No hay etiquetas disponibles
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = labels.slice(-20).reverse().map(label => `
            <tr>
                <td><code>${label.id}</code></td>
                <td>${new Date(label.received_at).toLocaleString()}</td>
                <td><span class="badge bg-info">${label.source_ip}</span></td>
                <td>${this.formatFileSize(label.size)}</td>
                <td>
                    <span class="badge bg-success">
                        <i class="bi bi-check-circle"></i> Procesada
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewLabelDetails('${label.id}')">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateConnectionStatus(status) {
        const statusIndicator = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionStatusText');
        
        if (statusIndicator && statusText) {
            switch (status) {
                case 'connected':
                    statusIndicator.className = 'status-indicator status-online';
                    statusText.textContent = 'Sistema Operativo';
                    break;
                case 'connecting':
                    statusIndicator.className = 'status-indicator status-warning';
                    statusText.textContent = 'Inicializando...';
                    // Cambiar a conectado después de un momento para la demo
                    setTimeout(() => {
                        if (statusIndicator && statusText) {
                            statusIndicator.className = 'status-indicator status-online';
                            statusText.textContent = 'Sistema Operativo';
                        }
                    }, 2000);
                    break;
                case 'disconnected':
                    statusIndicator.className = 'status-indicator status-offline';
                    statusText.textContent = 'Sistema Desconectado';
                    break;
            }
        }
    }

    addSystemEvent(message, level = 'info') {
        this.addToTimeline({
            timestamp: new Date().toISOString(),
            category: 'SYSTEM',
            message,
            level
        });
    }

    showAlert(message, type = 'info') {
        const alertPanel = document.getElementById('alertPanel');
        if (!alertPanel) return;

        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show animate__animated animate__slideInRight" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertPanel.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.classList.add('animate__slideOutRight');
                setTimeout(() => alertElement.remove(), 500);
            }
        }, 5000);
    }

    // Utility functions
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000);

        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    isRelevantForTimeline(logData) {
        const relevantCategories = ['ADI', 'PLC', 'PRINTER'];
        const relevantKeywords = ['conexión', 'etiqueta', 'comando', 'error', 'éxito'];
        
        return relevantCategories.includes(logData.category) ||
               relevantKeywords.some(keyword => 
                   logData.message.toLowerCase().includes(keyword)
               );
    }

    initializeDemoData() {
        // Datos de ejemplo para mostrar el funcionamiento del sistema
        setTimeout(() => {
            // Agregar logs de ejemplo
            this.addDemoLogs();
            
            // Simular métricas iniciales
            this.updateMetricsWithDemoData();
            
            // Actualizar estado de componentes
            this.updateComponentsWithDemoStatus();
            
            // Agregar eventos al timeline
            this.addDemoTimelineEvents();
            
            // Agregar datos del último archivo
            this.addDemoLastFileData();
            
        }, 1000);
    }

    addDemoLogs() {
        const demoLogs = [
            {
                timestamp: new Date().toISOString(),
                category: 'SERVER',
                level: 'success',
                message: 'Sistema TCP Label Transfer iniciado correctamente'
            },
            {
                timestamp: new Date(Date.now() - 30000).toISOString(),
                category: 'ADI',
                level: 'info',
                message: 'Puerto 9110 configurado para recibir etiquetas'
            },
            {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                category: 'PLC',
                level: 'info', 
                message: 'Puerto 9200 configurado para comunicación PLC'
            },
            {
                timestamp: new Date(Date.now() - 90000).toISOString(),
                category: 'PRINTER',
                level: 'info',
                message: 'Impresoras configuradas - Producto: 9100, RFID: 9101'
            },
            {
                timestamp: new Date(Date.now() - 120000).toISOString(),
                category: 'SERVER',
                level: 'success',
                message: 'Monitor web iniciado en puerto 3001'
            }
        ];

        demoLogs.forEach(log => {
            this.processIncomingLog(log);
        });
    }

    updateMetricsWithDemoData() {
        // Simular métricas del sistema
        this.updateElement('totalLabels', '12');
        this.updateElement('labelsRate', '+12 total');
        this.updateElement('totalConnections', '3');
        this.updateElement('connectionsDetail', 'ADI + PLC + Web');
        this.updateElement('totalErrors', '0');
        this.updateElement('lastErrorTime', 'Sin errores');
        this.updateElement('avgResponseTime', '45ms');
        this.updateElement('responseTimeStatus', 'Excelente');
    }

    updateComponentsWithDemoStatus() {
        // Actualizar estado de componentes
        this.updateComponentStatus('adi', 'online');
        this.updateComponentStatus('iot', 'online');
        this.updateComponentStatus('plc', 'online');
        
        // Actualizar actividades
        this.updateFlowActivity('adi', 'Listo para recibir');
        this.updateFlowActivity('iot', 'Sistema operativo');
        this.updateFlowActivity('plc', 'Esperando comandos');
    }

    addDemoTimelineEvents() {
        const demoEvents = [
            {
                timestamp: new Date().toISOString(),
                category: 'SYSTEM',
                level: 'success',
                message: 'Monitor iniciado correctamente'
            },
            {
                timestamp: new Date(Date.now() - 45000).toISOString(),
                category: 'CONFIG',
                level: 'info',
                message: 'Configuración cargada: Modo espera PLC 80'
            },
            {
                timestamp: new Date(Date.now() - 90000).toISOString(),
                category: 'NETWORK',
                level: 'success',
                message: 'Todos los puertos configurados correctamente'
            }
        ];

        demoEvents.forEach(event => {
            this.addToTimeline(event);
        });
    }

    addDemoLastFileData() {
        // ⭐ SIN DATOS DEMO - Solo para compatibilidad
        console.log('[INIT] ⭐ Inicialización sin datos demo - esperando etiquetas reales del sistema');
    }

    // ✅ NUEVA: Cargar estado de marcas de lectura PLC
    async loadReadStatus() {
        try {
            const response = await fetch('/api/read-status');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateReadStatusDisplay(data.readStatus);
                }
            }
        } catch (error) {
            console.warn('No se pudo cargar estado de marcas de lectura:', error);
        }
    }

    // ✅ NUEVA: Actualizar display de estado de marcas de lectura
    updateReadStatusDisplay(readStatus) {
        const normalStatusEl = document.getElementById('normalReadStatus');
        const rfidStatusEl = document.getElementById('rfidReadStatus');
        
        if (normalStatusEl) {
            if (!readStatus.normalLabel.exists) {
                normalStatusEl.textContent = 'Sin etiqueta';
                normalStatusEl.className = 'badge bg-secondary';
            } else if (readStatus.normalLabel.readByPlc) {
                normalStatusEl.textContent = '✅ Leída';
                normalStatusEl.className = 'badge bg-success';
            } else {
                normalStatusEl.textContent = '⏳ Disponible';
                normalStatusEl.className = 'badge bg-warning';
            }
        }
        
        if (rfidStatusEl) {
            if (!readStatus.rfidLabel.exists) {
                rfidStatusEl.textContent = 'Sin etiqueta';
                rfidStatusEl.className = 'badge bg-secondary';
            } else if (readStatus.rfidLabel.readByPlc) {
                rfidStatusEl.textContent = '✅ Leída';
                rfidStatusEl.className = 'badge bg-success';
            } else {
                rfidStatusEl.textContent = '⏳ Disponible';
                rfidStatusEl.className = 'badge bg-warning';
            }
        }
    }
}

// Funciones globales para eventos de UI
function setFilter(filter) {
    monitor.currentFilter = filter;
    monitor.filterLogs();
    
    // Actualizar badges activos
    document.querySelectorAll('[data-filter]').forEach(badge => {
        badge.classList.remove('bg-primary');
        badge.classList.add('bg-secondary');
    });
    const filterBadge = document.querySelector(`[data-filter="${filter}"]`);
    if (filterBadge) {
        filterBadge.classList.remove('bg-secondary');
        filterBadge.classList.add('bg-primary');
    }
}

function setLevelFilter(level) {
    monitor.currentLevelFilter = level;
    monitor.filterLogs();
    
    // Actualizar badges activos
    document.querySelectorAll('[data-level]').forEach(badge => {
        badge.classList.remove('bg-primary');
    });
    const levelBadge = document.querySelector(`[data-level="${level}"]`);
    if (levelBadge) {
        levelBadge.classList.add('bg-primary');
    }
}

function clearLogs() {
    monitor.logs = [];
    monitor.filteredLogs = [];
    monitor.renderLogs();
    monitor.updateLogStats();
    monitor.showAlert('Logs limpiados', 'info');
}

function pauseLogs() {
    monitor.logsPaused = !monitor.logsPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        if (monitor.logsPaused) {
            pauseBtn.innerHTML = '<i class="bi bi-play"></i>';
            pauseBtn.classList.add('btn-warning');
            pauseBtn.classList.remove('btn-outline-light');
        } else {
            pauseBtn.innerHTML = '<i class="bi bi-pause"></i>';
            pauseBtn.classList.remove('btn-warning');
            pauseBtn.classList.add('btn-outline-light');
        }
    }
}

function exportLogs() {
    const data = JSON.stringify(monitor.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `adisseo-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    monitor.showAlert('Logs exportados correctamente', 'success');
}

function refreshSystem() {
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon) {
        refreshIcon.classList.add('spinning');
        setTimeout(() => refreshIcon.classList.remove('spinning'), 1000);
    }
    
    monitor.loadSystemConfiguration();
    monitor.refreshLabels();
    monitor.runDiagnosticChecks();
    monitor.showAlert('Sistema actualizado', 'info');
}

function applyQuickConfig() {
    const quickConfig = document.querySelector('input[name="quickConfig"]:checked');
    if (quickConfig) {
        const waitForCommandSelect = document.getElementById('waitForCommand');
        if (waitForCommandSelect) {
            waitForCommandSelect.value = quickConfig.value;
            monitor.saveConfiguration();
        }
    }
}

function refreshLabels() {
    monitor.refreshLabels();
}

function resetConfig() {
    const waitForCommandSelect = document.getElementById('waitForCommand');
    if (waitForCommandSelect) {
        waitForCommandSelect.value = '80'; // Valor por defecto
    }
    monitor.showAlert('Configuración restablecida', 'info');
}

function viewLabelDetails(labelId) {
    // Esta función se podría expandir para mostrar detalles de etiqueta
    monitor.showAlert(`Viendo detalles de etiqueta ${labelId}`, 'info');
}

// ⭐ ACTUALIZADO: Función con soporte para tipos específicos
function refreshLastFile(type = null) {
    if (monitor) {
        monitor.refreshLabels();
        if (type) {
            const typeName = type === 'normal' ? 'PRODUCTO' : 'RFID';
            monitor.showAlert(`Etiquetas ${typeName} actualizadas`, 'info');
        } else {
            monitor.showAlert('Último archivo actualizado', 'info');
        }
    }
}

// ⭐ ACTUALIZADO: Función para cambiar vista con soporte para secciones separadas
function toggleRawView(type = null) {
    if (!monitor) return;
    
    if (type) {
        // Cambiar vista específica de un tipo
        const prefix = type === 'normal' ? 'normal' : 'rfid';
        const rawRadio = document.getElementById(`${prefix}ViewRaw`);
        const formattedRadio = document.getElementById(`${prefix}ViewFormatted`);
        
        if (rawRadio && formattedRadio) {
            if (rawRadio.checked) {
                formattedRadio.checked = true;
            } else {
                rawRadio.checked = true;
            }
            monitor.updateFileContent(type);
            
            const typeName = type === 'normal' ? 'PRODUCTO' : 'RFID';
            const viewName = rawRadio.checked ? 'Raw' : 'Formateado';
            monitor.showAlert(`Vista ${viewName} activada para ${typeName}`, 'info');
        }
    } else {
        // Cambiar vista de ambas secciones
        ['normal', 'rfid'].forEach(sectionType => {
            const prefix = sectionType === 'normal' ? 'normal' : 'rfid';
            const rawRadio = document.getElementById(`${prefix}ViewRaw`);
            const formattedRadio = document.getElementById(`${prefix}ViewFormatted`);
            
            if (rawRadio && formattedRadio) {
                if (rawRadio.checked) {
                    formattedRadio.checked = true;
                } else {
                    rawRadio.checked = true;
                }
                monitor.updateFileContent(sectionType);
            }
        });
        
        monitor.showAlert('Vista alternada en ambas secciones', 'info');
    }
}

// ⭐ ACTUALIZADO: Función con soporte para tipos específicos
// ✅ NUEVA: Función global para resetear marcas de lectura PLC
async function resetReadMarks() {
    if (!monitor) return;
    
    const resetBtn = document.getElementById('resetReadMarksBtn');
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning"></i> Reseteando...';
    }
    
    try {
        const response = await fetch('/api/reset-read-marks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                monitor.showAlert('Marcas de lectura PLC reseteadas correctamente', 'success');
                
                // Recargar estado inmediatamente
                setTimeout(() => {
                    monitor.loadReadStatus();
                }, 500);
            } else {
                monitor.showAlert(`Error: ${data.message || 'No se pudieron resetear las marcas'}`, 'danger');
            }
        } else {
            monitor.showAlert('Error de servidor al resetear marcas de lectura', 'danger');
        }
    } catch (error) {
        console.error('Error al resetear marcas de lectura:', error);
        monitor.showAlert('Error de conexión al resetear marcas de lectura', 'danger');
    } finally {
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Resetear Marcas de Lectura';
        }
    }
}

function copyToClipboard(type = null) {
    if (!monitor) return;
    
    if (type) {
        // Buscar contenido específico del tipo
        const contentId = type === 'normal' ? 'lastNormalFileContent' : 'lastRfidFileContent';
        const contentElement = document.getElementById(contentId);
        
        if (contentElement) {
            const textContent = contentElement.textContent || contentElement.innerText;
            if (textContent && textContent.trim() !== '' && !textContent.includes('No hay etiquetas')) {
                navigator.clipboard.writeText(textContent).then(() => {
                    const typeName = type === 'normal' ? 'PRODUCTO' : 'RFID';
                    monitor.showAlert(`Contenido de etiqueta ${typeName} copiado al portapapeles`, 'success');
                }).catch(() => {
                    monitor.showAlert('Error al copiar al portapapeles', 'danger');
                });
            } else {
                const typeName = type === 'normal' ? 'PRODUCTO' : 'RFID';
                monitor.showAlert(`No hay contenido que copiar para etiquetas ${typeName}`, 'warning');
            }
        }
    } else {
        // Función original para compatibilidad
        if (!monitor.currentLastFile) {
            monitor.showAlert('No hay archivo para copiar', 'warning');
            return;
        }

        const viewType = monitor.getSelectedFileView();
        let content = '';

        switch (viewType) {
            case 'raw':
                content = monitor.currentLastFile.zpl || monitor.currentLastFile.originalZpl || '';
                break;
            case 'original':
                content = monitor.currentLastFile.originalZpl || monitor.currentLastFile.zpl || '';
                break;
            default:
                content = monitor.currentLastFile.zpl || monitor.currentLastFile.originalZpl || '';
        }

        if (!content) {
            monitor.showAlert('No hay contenido para copiar', 'warning');
            return;
        }

        // Copiar al portapapeles
        if (navigator.clipboard) {
            navigator.clipboard.writeText(content).then(() => {
                monitor.showAlert('Contenido copiado al portapapeles', 'success');
            }).catch(err => {
                console.error('Error copying to clipboard:', err);
                monitor.showAlert('Error al copiar al portapapeles', 'danger');
            });
        } else {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                monitor.showAlert('Contenido copiado al portapapeles', 'success');
            } catch (err) {
                monitor.showAlert('Error al copiar al portapapeles', 'danger');
            }
            document.body.removeChild(textArea);
        }
    }
}

// Inicializar el monitor cuando el DOM esté listo
let monitor;
document.addEventListener('DOMContentLoaded', () => {
    monitor = new EnhancedMonitor();
    
    // ⭐ Hacer la instancia global para compatibilidad y debugging
    window.monitor = monitor;
    window.socket = monitor.socket;
    window.statsData = monitor.statsData;
    
    // ⭐ ACTUALIZADO: Event listeners para los radio buttons de vista separados
    const normalFileViewRadios = document.querySelectorAll('input[name="normalFileView"]');
    console.log(`[DEBUG] Encontrados ${normalFileViewRadios.length} radio buttons para normalFileView`);
    normalFileViewRadios.forEach((radio, index) => {
        console.log(`[DEBUG] Registrando listener para radio ${index}: ${radio.id}`);
        radio.addEventListener('change', () => {
            console.log(`[DEBUG] Radio button cambiado: ${radio.id}, checked: ${radio.checked}`);
            if (monitor && monitor.updateFileContent) {
                console.log('[DEBUG] Llamando a updateFileContent("normal")');
                monitor.updateFileContent('normal');
            } else {
                console.error('[DEBUG] Monitor o updateFileContent no disponible');
            }
        });
    });
    
    const rfidFileViewRadios = document.querySelectorAll('input[name="rfidFileView"]');
    console.log(`[DEBUG] Encontrados ${rfidFileViewRadios.length} radio buttons para rfidFileView`);
    rfidFileViewRadios.forEach((radio, index) => {
        console.log(`[DEBUG] Registrando listener para radio ${index}: ${radio.id}`);
        radio.addEventListener('change', () => {
            console.log(`[DEBUG] Radio button cambiado: ${radio.id}, checked: ${radio.checked}`);
            if (monitor && monitor.updateFileContent) {
                console.log('[DEBUG] Llamando a updateFileContent("rfid")');
                monitor.updateFileContent('rfid');
            } else {
                console.error('[DEBUG] Monitor o updateFileContent no disponible');
            }
        });
    });
    
    // ⭐ MANTENER: Event listeners originales para compatibilidad (si existen)
    const fileViewRadios = document.querySelectorAll('input[name="fileView"]');
    fileViewRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (monitor && monitor.updateFileContentView) {
                monitor.updateFileContentView();
            }
        });
    });
    
    console.log('Monitor Avanzado con Contadores inicializado');
    console.log('statsData disponible:', monitor.statsData);
    
    // ⭐ FUNCIÓN DE DIAGNÓSTICO: Agregar función global para probar
    window.testViewChange = function(type, view) {
        console.log(`[TEST] Probando cambio de vista: ${type} -> ${view}`);
        if (!monitor) {
            console.error('[TEST] Monitor no disponible');
            return;
        }
        
        const prefix = type === 'normal' ? 'normal' : 'rfid';
        const viewIds = {
            'formatted': `${prefix}ViewFormatted`,
            'raw': `${prefix}ViewRaw`, 
            'original': `${prefix}ViewOriginal`
        };
        
        // Cambiar a la vista especificada
        Object.keys(viewIds).forEach(viewType => {
            const radio = document.getElementById(viewIds[viewType]);
            if (radio) {
                radio.checked = (viewType === view);
                console.log(`[TEST] ${viewIds[viewType]}: ${radio.checked ? 'CHECKED' : 'unchecked'}`);
            } else {
                console.error(`[TEST] No se encontró radio: ${viewIds[viewType]}`);
            }
        });
        
        // Llamar manualmente a updateFileContent
        monitor.updateFileContent(type);
    };
    
    console.log('Función de prueba disponible: testViewChange("normal", "raw") o testViewChange("rfid", "formatted")');
    
    // ⭐ FUNCIÓN DE DEBUG: Verificar estado de radio buttons
    window.debugRadioButtons = function(type) {
        console.log(`[DEBUG RADIO] Verificando radio buttons para: ${type}`);
        const prefix = type === 'normal' ? 'normal' : 'rfid';
        
        ['Formatted', 'Raw', 'Original'].forEach(view => {
            const id = `${prefix}View${view}`;
            const radio = document.getElementById(id);
            console.log(`[DEBUG RADIO] ${id}:`, radio ? {
                exists: true,
                checked: radio.checked,
                value: radio.value,
                name: radio.name
            } : 'NO ENCONTRADO');
        });
        
        // También verificar si getSelectedFileView funciona
        console.log(`[DEBUG RADIO] getSelectedFileView("${type}"):`, monitor.getSelectedFileView(type));
    };
    
    console.log('Función de debug disponible: debugRadioButtons("normal") o debugRadioButtons("rfid")');
}); 