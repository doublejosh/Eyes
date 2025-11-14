// State management module
import { BehaviorType, defaultState } from './constants.js';

// Eye sets state management
export const eyeSets = [];
export let activeSetIndex = -1;

export function setActiveSetIndex(index) {
    activeSetIndex = index;
}

// Script instance class
export class ScriptInstance {
    constructor(scriptObject, setIndex, startTime) {
        this.scriptObject = scriptObject;
        this.setIndex = setIndex;
        this.startTime = startTime;
        this.scheduledActions = [];   // Array of timeout IDs
        this.interactionInstances = []; // Related script instances
        this.isRunning = false;
        this.isInteraction = false;    // Flag to prevent recursive interactions
        this.onComplete = null;        // Callback when script finishes
        this.originalState = null;     // Stores original position/scale/gap to restore
    }
}

// Script execution state
export const scriptExecutionState = {
    scriptInstances: new Map(),    // Map<setIndex, ScriptInstance>
    loadedScripts: new Map(),      // Map<scriptId, ScriptObject>
    defaultScripts: {},            // { setIndex: scriptId }
    scriptDirectory: 'scripts/'    // Base path for JSON files
};

// Action registry (populated by actions.js)
export const actionRegistry = {};

// Spider mode state management
export let isSpiderModeActive = false;
export const spiderEyes = [];

export function setSpiderModeActive(active) {
    isSpiderModeActive = active;
}

// Eye tracking state (spider mode)
export let isTrackingMode = false;
export let isAutoMode = false;
export let focalPoint = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
export let focalPointTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
export let focalPointAnimationId = null;
export let focalPointTimeoutId = null;
export let autoModeTimeoutId = null;
export let manualControlActive = false;
export let manualControlTimeoutId = null;

export function setTrackingMode(tracking) {
    isTrackingMode = tracking;
}

export function setAutoMode(auto) {
    isAutoMode = auto;
}

export function setFocalPointAnimationId(id) {
    focalPointAnimationId = id;
}

export function setFocalPointTimeoutId(id) {
    focalPointTimeoutId = id;
}

export function setAutoModeTimeoutId(id) {
    autoModeTimeoutId = id;
}

export function setManualControlActive(active) {
    manualControlActive = active;
}

export function setManualControlTimeoutId(id) {
    manualControlTimeoutId = id;
}

export function setFocalPoint(x, y) {
    focalPoint = { x, y };
}

export function setFocalPointTarget(x, y) {
    focalPointTarget = { x, y };
}

// Arrow key hold state for quadratic acceleration
export const heldArrowKeys = {}; // Tracks held arrow keys: { ArrowUp: timestamp, ... }
export let arrowKeyAnimationId = null; // requestAnimationFrame ID for continuous movement

export function setArrowKeyAnimationId(id) {
    arrowKeyAnimationId = id;
}

// Drip toggle state
export let dripsEnabled = true;

export function setDripsEnabled(enabled) {
    dripsEnabled = enabled;
}

// Gamepad state
export let gamepadAnimationId = null;
export let connectedGamepad = null;

export function setGamepadAnimationId(id) {
    gamepadAnimationId = id;
}

export function setConnectedGamepad(gamepad) {
    connectedGamepad = gamepad;
}

// Per-eye-set tracking state (shared across all tracking eye sets)
export const eyeSetTrackingState = {
    focalPoint: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    focalPointTarget: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    animationId: null,
    moveTimeoutId: null
};

// Director state
export const directorState = {
    enabled: false,
    mode: 'active',
    lastScriptTime: 0,
    scriptCooldown: 5000,
    evaluationInterval: 8000,
    evaluationTimeoutId: null,
    triggerProbabilities: {
        autonomous: 0.5,
        tracking: 0.2,
        scripted: 0.3
    },
    interactionChance: 0.3
};

// Director configuration
export const directorConfig = {
    defaultMode: 'active',
    modes: {
        passive: {
            evaluationInterval: 12000,
            scriptCooldown: 10000,
            triggerProbabilities: { autonomous: 0.8, tracking: 0.1, scripted: 0.1 }
        },
        active: {
            evaluationInterval: 8000,
            scriptCooldown: 5000,
            triggerProbabilities: { autonomous: 0.5, tracking: 0.2, scripted: 0.3 }
        },
        chaotic: {
            evaluationInterval: 4000,
            scriptCooldown: 2000,
            triggerProbabilities: { autonomous: 0.2, tracking: 0.3, scripted: 0.5 }
        }
    },
    scriptWeights: {
        surprise: 1.0,
        cross_eyes: 0.8,
        roll_eyes: 0.9,
        sleepy: 0.6,
        angry: 0.7,
        curious: 0.9,
        scared: 0.7,
        confused: 0.8,
        shifty: 1.5,
        sync_blink: 1.2,
        wave: 1.0,
        conversation: 1.5,
        dance: 1.2
    },
    conditions: {
        multipleEyesVisible: {
            minEyes: 2,
            scriptPreferences: ['conversation', 'sync_blink', 'wave', 'dance']
        },
        singleEyeVisible: {
            scriptPreferences: ['surprise', 'roll_eyes', 'sleepy', 'angry', 'curious', 'scared', 'shifty']
        }
    }
};

// Helper function to create a new eye set object
export function createEyeSet(setIndex) {
    return {
        ...defaultState,
        element: null,
        scale: defaultState.scale,
        gap: defaultState.gap,
        posX: defaultState.posX,
        posY: defaultState.posY,
        visible: false,
        label: `Eyeset ${setIndex}`  // Default label
    };
}

