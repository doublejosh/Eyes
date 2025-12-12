// Toast notification system
export class ToastManager {
    constructor() {
        this.container = null;
        this.queue = [];
        this.settings = {
            showBehaviorChanges: false,  // Don't show toasts for every behavior change by default
            showModeChanges: true,       // Show toasts for mode changes (spider mode, director, etc.)
            showScriptExecution: true    // Show toasts for script execution
        };
        this.initialize();
    }

    initialize() {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        this.container = container;

        // Load settings from localStorage
        this.loadSettings();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('toastSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load toast settings:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('toastSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save toast settings:', error);
        }
    }

    toggleBehaviorChanges() {
        this.settings.showBehaviorChanges = !this.settings.showBehaviorChanges;
        this.saveSettings();
        return this.settings.showBehaviorChanges;
    }

    setShowBehaviorChanges(show) {
        this.settings.showBehaviorChanges = show;
        this.saveSettings();
    }

    toggleScriptExecution() {
        this.settings.showScriptExecution = !this.settings.showScriptExecution;
        this.saveSettings();
        return this.settings.showScriptExecution;
    }

    setShowScriptExecution(show) {
        this.settings.showScriptExecution = show;
        this.saveSettings();
    }

    toggleModeChanges() {
        this.settings.showModeChanges = !this.settings.showModeChanges;
        this.saveSettings();
        return this.settings.showModeChanges;
    }

    setShowModeChanges(show) {
        this.settings.showModeChanges = show;
        this.saveSettings();
    }

    // Cycle through notification presets
    // 0: All off
    // 1: Mode changes only
    // 2: Mode + behavior changes
    // 3: All on (mode + behavior + script execution)
    cycleNotificationPreset() {
        const current = this.getNotificationPreset();
        let next;

        switch (current) {
            case 0: // All off -> Mode only
                this.settings.showModeChanges = true;
                this.settings.showBehaviorChanges = false;
                this.settings.showScriptExecution = false;
                next = 1;
                break;
            case 1: // Mode only -> Mode + behavior
                this.settings.showModeChanges = true;
                this.settings.showBehaviorChanges = true;
                this.settings.showScriptExecution = false;
                next = 2;
                break;
            case 2: // Mode + behavior -> All on
                this.settings.showModeChanges = true;
                this.settings.showBehaviorChanges = true;
                this.settings.showScriptExecution = true;
                next = 3;
                break;
            case 3: // All on -> All off
                this.settings.showModeChanges = false;
                this.settings.showBehaviorChanges = false;
                this.settings.showScriptExecution = false;
                next = 0;
                break;
            default:
                // Unknown state, reset to all off
                this.settings.showModeChanges = false;
                this.settings.showBehaviorChanges = false;
                this.settings.showScriptExecution = false;
                next = 0;
        }

        this.saveSettings();
        return next;
    }

    // Get current notification preset number
    getNotificationPreset() {
        const { showModeChanges, showBehaviorChanges, showScriptExecution } = this.settings;

        if (!showModeChanges && !showBehaviorChanges && !showScriptExecution) {
            return 0; // All off
        } else if (showModeChanges && !showBehaviorChanges && !showScriptExecution) {
            return 1; // Mode only
        } else if (showModeChanges && showBehaviorChanges && !showScriptExecution) {
            return 2; // Mode + behavior
        } else if (showModeChanges && showBehaviorChanges && showScriptExecution) {
            return 3; // All on
        } else {
            // Custom state, return closest match
            if (showModeChanges && showBehaviorChanges) return 2;
            if (showModeChanges) return 1;
            return 0;
        }
    }

    getNotificationPresetName() {
        const preset = this.getNotificationPreset();
        const names = {
            0: 'All Off',
            1: 'Mode Only',
            2: 'Mode + Behavior',
            3: 'All On'
        };
        return names[preset] || 'Custom';
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add icon based on type
        const icon = this.getIcon(type);
        if (icon) {
            toast.innerHTML = `${icon} <span>${message}</span>`;
        }

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        // Auto-dismiss
        const timeoutId = setTimeout(() => {
            this.dismiss(toast);
        }, duration);

        // Store timeout ID on toast for manual dismissal
        toast.dataset.timeoutId = timeoutId;

        return toast;
    }

    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        
        // Clear timeout if exists
        if (toast.dataset.timeoutId) {
            clearTimeout(parseInt(toast.dataset.timeoutId));
        }

        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');

        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            info: 'ℹ',
            warning: '⚠',
            error: '✕'
        };
        return icons[type] || '';
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    // Conditional methods for different notification types
    behaviorChange(message, duration) {
        if (!this.settings.showBehaviorChanges) return null;
        return this.info(message, duration);
    }

    modeChange(message, duration) {
        if (!this.settings.showModeChanges) return null;
        return this.info(message, duration);
    }

    scriptExecution(message, duration) {
        if (!this.settings.showScriptExecution) return null;
        return this.success(message, duration);
    }
}

// Create singleton instance
export const toast = new ToastManager();

