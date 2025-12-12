// Debug panel for showing eyeset information
// Uses global state from window until full modularization is complete

export class DebugPanel {
    constructor() {
        this.panel = null;
        this.updateInterval = null;
        this.visible = false;
        this.initialize();
    }

    initialize() {
        // Create debug panel if it doesn't exist
        let panel = document.getElementById('debug-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'debug-panel';
            panel.className = 'debug-panel';
            document.body.appendChild(panel);
        }
        this.panel = panel;
        this.render();
    }

    render() {
        const html = `
            <div class="debug-panel-header">
                <h3>Debug View</h3>
                <button class="debug-panel-close" id="debug-panel-close">×</button>
            </div>
            <div class="debug-section">
                <div class="debug-section-header" data-section="system">
                    <span class="debug-section-title">System State</span>
                    <span class="debug-section-toggle">▼</span>
                </div>
                <div class="debug-section-content" id="debug-system-content">
                    <div class="debug-eyeset-info">
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Spider Mode:</span>
                            <span class="debug-eyeset-info-value" id="debug-spider-mode">-</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Director:</span>
                            <span class="debug-eyeset-info-value" id="debug-director">-</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Active Set:</span>
                            <span class="debug-eyeset-info-value" id="debug-active-set">-</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="debug-section">
                <div class="debug-section-header" data-section="eyesets">
                    <span class="debug-section-title">Eye Sets</span>
                    <span class="debug-section-toggle">▼</span>
                </div>
                <div class="debug-section-content" id="debug-eyesets-content">
                    <!-- Eyeset items will be populated here -->
                </div>
            </div>
        `;
        this.panel.innerHTML = html;

        // Add event listeners
        const closeBtn = this.panel.querySelector('#debug-panel-close');
        closeBtn.addEventListener('click', () => this.hide());

        // Add collapse/expand functionality
        const sectionHeaders = this.panel.querySelectorAll('.debug-section-header');
        sectionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section.classList.toggle('collapsed');
                const toggle = header.querySelector('.debug-section-toggle');
                toggle.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
            });
        });
    }

    update() {
        if (!this.visible || !this.panel) return;

        // Get state from window globals
        const eyeSets = window.eyeSets || [];
        const activeSetIndex = window.activeSetIndex !== undefined ? window.activeSetIndex : -1;
        const scriptExecutionState = window.scriptExecutionState || { loadedScripts: new Map() };
        const directorState = window.directorState || { enabled: false, mode: 'active' };
        const isSpiderModeActive = window.isSpiderModeActive || false;
        const BehaviorType = window.BehaviorType || { AUTONOMOUS: 'autonomous', TRACKING: 'tracking', SCRIPTED: 'scripted' };

        // Update system state
        const spiderModeEl = this.panel.querySelector('#debug-spider-mode');
        if (spiderModeEl) {
            spiderModeEl.textContent = isSpiderModeActive ? 'Active' : 'Inactive';
        }

        const directorEl = this.panel.querySelector('#debug-director');
        if (directorEl) {
            const status = directorState.enabled ? `${directorState.mode}` : 'Disabled';
            directorEl.textContent = status;
        }

        const activeSetEl = this.panel.querySelector('#debug-active-set');
        if (activeSetEl) {
            activeSetEl.textContent = activeSetIndex >= 0 ? `Set ${activeSetIndex}` : 'None';
        }

        // Update eyesets
        const eyesetsContent = this.panel.querySelector('#debug-eyesets-content');
        if (eyesetsContent) {
            eyesetsContent.innerHTML = '';
            
            for (let i = 0; i < eyeSets.length; i++) {
                const eyeSet = eyeSets[i];
                if (!eyeSet) continue;

                const eyesetEl = document.createElement('div');
                eyesetEl.className = 'debug-eyeset';

                const isVisible = eyeSet.visible;
                const behavior = eyeSet.behavior || BehaviorType.AUTONOMOUS;
                const script = eyeSet.currentScript;
                const scriptName = script ? script.scriptObject.name : 'None';
                const label = eyeSet.label || `Eyeset ${i}`;
                const progress = script && script.isRunning 
                    ? ((Date.now() - script.startTime) / (script.scriptObject.duration * 1000) * 100).toFixed(0)
                    : null;

                let statusClass = isVisible ? 'visible' : 'hidden';
                if (isVisible) {
                    statusClass = behavior === BehaviorType.SCRIPTED ? 'scripted' :
                                 behavior === BehaviorType.TRACKING ? 'tracking' :
                                 'autonomous';
                }

                const scriptProgress = progress !== null ? ` (${progress}%)` : '';

                eyesetEl.innerHTML = `
                    <div class="debug-eyeset-header">
                        <span class="debug-eyeset-label" contenteditable="true" data-set-index="${i}">${label}</span>
                        <span class="debug-eyeset-status ${statusClass}">${isVisible ? behavior : 'hidden'}</span>
                    </div>
                    <div class="debug-eyeset-info">
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Index:</span>
                            <span class="debug-eyeset-info-value">${i}</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Visible:</span>
                            <span class="debug-eyeset-info-value">${isVisible ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Behavior:</span>
                            <span class="debug-eyeset-info-value">${behavior}</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Script:</span>
                            <span class="debug-eyeset-info-value">${scriptName}${scriptProgress}</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Position:</span>
                            <span class="debug-eyeset-info-value">(${eyeSet.posX.toFixed(0)}, ${eyeSet.posY.toFixed(0)})</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Scale:</span>
                            <span class="debug-eyeset-info-value">${eyeSet.scale.toFixed(2)}</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Gap:</span>
                            <span class="debug-eyeset-info-value">${eyeSet.gap.toFixed(0)}</span>
                        </div>
                        <div class="debug-eyeset-info-item">
                            <span class="debug-eyeset-info-label">Last Change:</span>
                            <span class="debug-eyeset-info-value">${new Date(eyeSet.lastBehaviorChange || 0).toLocaleTimeString()}</span>
                        </div>
                    </div>
                `;

                // Add label editing
                const labelEl = eyesetEl.querySelector('.debug-eyeset-label');
                labelEl.addEventListener('blur', (e) => {
                    const setIndex = parseInt(e.target.dataset.setIndex);
                    const eyeSets = window.eyeSets || [];
                    if (eyeSets[setIndex]) {
                        eyeSets[setIndex].label = e.target.textContent.trim() || `Eyeset ${setIndex}`;
                        // Trigger save
                        if (window.debouncedSaveState) {
                            window.debouncedSaveState();
                        }
                    }
                });

                eyesetsContent.appendChild(eyesetEl);
            }
        }
    }

    show() {
        if (!this.panel) return;
        this.visible = true;
        this.panel.classList.add('visible');
        this.update();
        // Update every 500ms
        this.updateInterval = setInterval(() => this.update(), 500);
    }

    hide() {
        if (!this.panel) return;
        this.visible = false;
        this.panel.classList.remove('visible');
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Create singleton instance
export const debugPanel = new DebugPanel();

