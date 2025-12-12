// Test mode for script execution
// Uses global state from window until full modularization is complete

export class TestMode {
    constructor() {
        this.overlay = null;
        this.panel = null;
        this.selectedScript = null;
        this.selectedEyesets = new Set();
        this.executeScriptFn = null;
        this.isActive = false;
        this.originalState = {
            directorEnabled: false,
            eyeSetStates: []  // Store original behavior/script state for each eyeset
        };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.initialize();
    }

    setExecuteScriptFn(fn) {
        this.executeScriptFn = fn;
    }

    initialize() {
        // Create test mode overlay if it doesn't exist
        let overlay = document.getElementById('test-mode-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'test-mode-overlay';
            overlay.className = 'test-mode-overlay';
            document.body.appendChild(overlay);
        }
        this.overlay = overlay;
        this.render();
    }

    render() {
        const html = `
            <div class="test-mode-panel">
                <div class="test-mode-header">
                    <h2>Script Test Mode</h2>
                    <button class="test-mode-close" id="test-mode-close">×</button>
                </div>
                <div class="test-mode-section">
                    <label for="test-mode-script">Select Script:</label>
                    <select id="test-mode-script">
                        <option value="">-- Select a script --</option>
                    </select>
                    <div class="test-mode-script-info" id="test-mode-script-info"></div>
                </div>
                <div class="test-mode-section">
                    <label>Select Eye Sets:</label>
                    <div class="test-mode-eyeset-list" id="test-mode-eyeset-list">
                        <!-- Eyeset checkboxes will be populated here -->
                    </div>
                </div>
                <div class="test-mode-actions">
                    <button class="test-mode-button" id="test-mode-execute">Execute Script</button>
                    <button class="test-mode-button secondary" id="test-mode-close-btn">Close</button>
                </div>
            </div>
        `;
        this.overlay.innerHTML = html;

        // Get panel reference
        this.panel = this.overlay.querySelector('.test-mode-panel');

        // Populate script list
        this.updateScriptList();
        
        // Populate eyeset list
        this.updateEyesetList();

        // Add event listeners
        const closeBtn = this.overlay.querySelector('#test-mode-close');
        const closeBtn2 = this.overlay.querySelector('#test-mode-close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });
        closeBtn2.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
        });

        const scriptSelect = this.overlay.querySelector('#test-mode-script');
        scriptSelect.addEventListener('change', (e) => {
            this.selectedScript = e.target.value;
            this.updateScriptInfo();
        });

        const executeBtn = this.overlay.querySelector('#test-mode-execute');
        executeBtn.addEventListener('click', () => this.execute());

        // Add drag functionality to header
        const header = this.overlay.querySelector('.test-mode-header');
        if (header && this.panel) {
            this.setupDragging(header);
        }
    }

    setupDragging(header) {
        header.addEventListener('mousedown', (e) => {
            // Only start dragging on left mouse button
            if (e.button !== 0) return;
            
            // Don't drag if clicking on close button
            if (e.target.closest('.test-mode-close')) return;
            
            this.isDragging = true;
            
            const rect = this.overlay.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            // Calculate new position
            let newX = e.clientX - this.dragOffset.x;
            let newY = e.clientY - this.dragOffset.y;
            
            // Keep within viewport bounds
            const maxX = window.innerWidth - this.overlay.offsetWidth;
            const maxY = window.innerHeight - this.overlay.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            // Update position
            this.overlay.style.left = newX + 'px';
            this.overlay.style.top = newY + 'px';
            this.overlay.style.right = 'auto';
            
            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    updateScriptList() {
        const scriptSelect = this.overlay.querySelector('#test-mode-script');
        if (!scriptSelect) return;

        scriptSelect.innerHTML = '<option value="">-- Select a script --</option>';
        
        const scriptExecutionState = window.scriptExecutionState || { loadedScripts: new Map() };
        const scripts = Array.from(scriptExecutionState.loadedScripts.values());
        scripts.sort((a, b) => a.name.localeCompare(b.name));
        
        scripts.forEach(script => {
            const option = document.createElement('option');
            option.value = script.scriptId;
            option.textContent = script.name || script.scriptId;
            scriptSelect.appendChild(option);
        });
    }

    updateEyesetList() {
        const eyesetList = this.overlay.querySelector('#test-mode-eyeset-list');
        if (!eyesetList) return;

        eyesetList.innerHTML = '';

        const eyeSets = window.eyeSets || [];
        for (let i = 0; i < eyeSets.length; i++) {
            const eyeSet = eyeSets[i];
            if (!eyeSet) continue;

            const item = document.createElement('div');
            item.className = 'test-mode-eyeset-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `test-mode-eyeset-${i}`;
            checkbox.value = i;
            checkbox.checked = this.selectedEyesets.has(i);
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedEyesets.add(i);
                    item.classList.add('selected');
                } else {
                    this.selectedEyesets.delete(i);
                    item.classList.remove('selected');
                }
            });

            const label = document.createElement('label');
            label.htmlFor = `test-mode-eyeset-${i}`;
            label.textContent = eyeSet.label || `Set ${i}`;
            if (!eyeSet.visible) {
                label.textContent += ' (hidden)';
                checkbox.disabled = true;
                item.style.opacity = '0.5';
            }

            item.appendChild(checkbox);
            item.appendChild(label);
            
            if (this.selectedEyesets.has(i)) {
                item.classList.add('selected');
            }

            eyesetList.appendChild(item);
        }
    }

    updateScriptInfo() {
        const infoEl = this.overlay.querySelector('#test-mode-script-info');
        if (!infoEl || !this.selectedScript) {
            infoEl.innerHTML = '';
            return;
        }

        const scriptExecutionState = window.scriptExecutionState || { loadedScripts: new Map() };
        const script = scriptExecutionState.loadedScripts.get(this.selectedScript);
        if (!script) {
            infoEl.innerHTML = '';
            return;
        }

        const duration = script.duration ? `${script.duration}s` : 'Unknown';
        const actionCount = script.timeline ? script.timeline.length : 0;
        const description = script.description || 'No description available';

        infoEl.innerHTML = `
            <strong>${script.name}</strong><br>
            Duration: ${duration}<br>
            Actions: ${actionCount}<br>
            ${description}
        `;
    }

    async execute() {
        if (!this.selectedScript || this.selectedEyesets.size === 0) {
            if (window.toast) {
                window.toast.warning('Please select a script and at least one eyeset');
            }
            return;
        }

        if (!this.executeScriptFn) {
            console.error('Execute script function not set');
            return;
        }

        // Ensure we're in test mode (stop all behaviors)
        if (!this.isActive) {
            this.enterTestMode();
        }

        // Execute script on all selected eyesets
        // These scripts are allowed to run in test mode
        const promises = Array.from(this.selectedEyesets).map(setIndex => {
            return this.executeScriptFn(setIndex, this.selectedScript);
        });

        try {
            await Promise.all(promises);
            
            const scriptExecutionState = window.scriptExecutionState || { loadedScripts: new Map() };
            const script = scriptExecutionState.loadedScripts.get(this.selectedScript);
            
            if (window.toast && script) {
                window.toast.success(`Executing "${script.name}" on ${this.selectedEyesets.size} eyeset(s)`);
            }

            // Don't close test mode - let user see the script execute
            // Scripts will return to idle state when complete
        } catch (error) {
            console.error('Error executing script:', error);
            if (window.toast) {
                window.toast.error('Error executing script');
            }
        }
    }

    show() {
        if (!this.overlay) return;
        if (this.isActive) return; // Already active
        
        this.enterTestMode();
        this.updateScriptList();
        this.updateEyesetList();
        
        // Reset to default position if not previously positioned
        if (!this.overlay.style.left && !this.overlay.style.top) {
            this.overlay.style.right = '20px';
            this.overlay.style.top = '80px';
            this.overlay.style.left = 'auto';
        }
        
        this.overlay.classList.add('visible');
    }

    hide() {
        if (!this.overlay) return;
        if (!this.isActive) return; // Already inactive
        
        this.exitTestMode();
        this.overlay.classList.remove('visible');
        // Reset selection
        this.selectedScript = null;
        this.selectedEyesets.clear();
    }

    enterTestMode() {
        if (this.isActive) return;
        this.isActive = true;
        
        const directorState = window.directorState;
        const eyeSets = window.eyeSets || [];
        const stopScript = window.stopScript;
        const stopEyeSetAnimations = window.stopEyeSetAnimations;
        const stopEyeSetTracking = window.stopEyeSetTracking;
        const setEyeBehavior = window.setEyeBehavior;
        const BehaviorType = window.BehaviorType || { AUTONOMOUS: 'autonomous', TRACKING: 'tracking', SCRIPTED: 'scripted' };
        const stopDirector = window.stopDirector;

        // Store original director state
        this.originalState.directorEnabled = directorState && directorState.enabled;
        
        // Disable director
        if (directorState && directorState.enabled && stopDirector) {
            stopDirector();
            if (window.toast) {
                window.toast.info('Director paused for Test Mode');
            }
        }

        // Store and clean up all eyesets
        this.originalState.eyeSetStates = [];
        
        for (let i = 0; i < eyeSets.length; i++) {
            const eyeSet = eyeSets[i];
            if (!eyeSet) continue;

            // Store original state
            const originalState = {
                behavior: eyeSet.behavior || BehaviorType.AUTONOMOUS,
                hasScript: eyeSet.currentScript !== null,
                scriptName: eyeSet.currentScript ? eyeSet.currentScript.scriptObject.name : null
            };
            this.originalState.eyeSetStates[i] = originalState;

            // Stop any running scripts
            if (eyeSet.currentScript && stopScript) {
                stopScript(i);
            }

            // Stop all behaviors
            if (stopEyeSetAnimations) {
                stopEyeSetAnimations(i);
            }
            
            if (eyeSet.behavior === BehaviorType.TRACKING && stopEyeSetTracking) {
                stopEyeSetTracking(i);
            }

            // Set to autonomous but don't start animations (eyes will sit still)
            if (setEyeBehavior) {
                // Temporarily override to prevent animations from starting
                eyeSet.behavior = BehaviorType.AUTONOMOUS;
                // Don't call setEyeBehavior as it would start animations
            }
        }

        // Mark test mode as active globally
        window.testModeActive = true;

        if (window.toast) {
            window.toast.info('Test Mode: All eyesets paused');
        }
    }

    exitTestMode() {
        if (!this.isActive) return;
        this.isActive = false;

        const directorState = window.directorState;
        const eyeSets = window.eyeSets || [];
        const startDirector = window.startDirector;
        const setEyeBehavior = window.setEyeBehavior;
        const startEyeSetAnimations = window.startEyeSetAnimations;
        const startEyeSetTracking = window.startEyeSetTracking;
        const BehaviorType = window.BehaviorType || { AUTONOMOUS: 'autonomous', TRACKING: 'tracking', SCRIPTED: 'scripted' };

        // Restore original director state
        if (this.originalState.directorEnabled && directorState && startDirector) {
            startDirector(directorState.mode);
            if (window.toast) {
                window.toast.info('Director resumed');
            }
        }

        // Restore original eyeset behaviors
        for (let i = 0; i < this.originalState.eyeSetStates.length; i++) {
            const originalState = this.originalState.eyeSetStates[i];
            if (!originalState) continue;

            const eyeSet = eyeSets[i];
            if (!eyeSet) continue;

            // Restore behavior (this will start animations/tracking as appropriate)
            if (setEyeBehavior && originalState.behavior !== BehaviorType.SCRIPTED) {
                setEyeBehavior(i, originalState.behavior);
            }
            // Note: Scripts were stopped, so we don't restore them
        }

        // Clear test mode flag
        window.testModeActive = false;

        // Clear stored state
        this.originalState = {
            directorEnabled: false,
            eyeSetStates: []
        };

        if (window.toast) {
            window.toast.info('Test Mode: Behaviors restored');
        }
    }

    toggle() {
        if (this.overlay && this.overlay.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Create singleton instance
export const testMode = new TestMode();

