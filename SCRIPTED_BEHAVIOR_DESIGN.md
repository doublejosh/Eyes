# Scripted Behavior System Design Document

## Table of Contents
1. [Overview](#overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [JSON Schema for Scripts](#json-schema-for-scripts)
4. [Architecture Design](#architecture-design)
5. [Director System](#director-system)
6. [Action Functions](#action-functions)
7. [State Management](#state-management)
8. [Keyboard Controls](#keyboard-controls)
9. [Implementation Plan](#implementation-plan)
10. [Configuration Examples](#configuration-examples)
11. [Script Examples](#script-examples)

---

## Overview

This document describes a comprehensive scripted behavior system for the Eyes app that adds:
- **JSON-based script system** for defining timed animation sequences
- **Three behavior modes**: Autonomous (random), Tracking (focal point following), Scripted (timeline execution)
- **Director orchestration layer** that automatically triggers behaviors based on configurable probabilities
- **Rich action library** with 15+ expressive eye movements and effects
- **Multi-eye interaction system** for coordinated animations across multiple eye sets
- **User controls** for manual script selection and director management

---

## Current Architecture Analysis

### Current State Management
- **Eye Sets**: Array of up to 10 eye pairs, each with properties:
  - `scale`, `gap`, `posX`, `posY` (visual properties)
  - `visible`, `everShown` (state flags)
  - `blinkTimeoutId`, `moveTimeoutId`, `dripTimeoutId` (animation timers)
  - `element` (DOM reference)

- **Spider Mode**: ~165 individual eyes with independent animations
  - Supports two tracking modes: eye tracking (X) and auto creepy (C)
  - Uses focal point system for synchronized tracking

- **Animation System**: Currently uses `setTimeout` recursion for scheduling
  - Blinking: 4-20s intervals
  - Iris movement: 1-5s intervals (random or tracking-based)
  - Dripping: Variable intervals

### Existing Functions
- `blinkEyeSet(setIndex)` - triggers blink animation
- `moveEyeSetIris(setIndex)` - random iris movement
- `updateEyeSetTransform(setIndex)` - applies scale/position/gap
- `dripEyeSet(setIndex)` - triggers tear drip
- `startEyeSetAnimations(setIndex)` - initializes all animations
- `stopEyeSetAnimations(setIndex)` - clears all timers

---

## JSON Schema for Scripts

### Script File Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["scriptId", "name", "timeline"],
  "properties": {
    "scriptId": {
      "type": "string",
      "description": "Unique identifier for this script"
    },
    "name": {
      "type": "string",
      "description": "Human-readable name for the script"
    },
    "description": {
      "type": "string",
      "description": "Optional description of the behavior"
    },
    "duration": {
      "type": "number",
      "description": "Total duration in seconds (optional, calculated from timeline if not provided)"
    },
    "interactions": {
      "type": "array",
      "description": "Defines which other eye sets participate and their timing",
      "items": {
        "type": "object",
        "required": ["targetSet", "startTime"],
        "properties": {
          "targetSet": {
            "type": "integer",
            "description": "Eye set index (0-9) to synchronize with"
          },
          "startTime": {
            "type": "number",
            "description": "When the target set joins (seconds from script start)"
          },
          "scriptId": {
            "type": "string",
            "description": "Script for target to run (defaults to same script)"
          }
        }
      }
    },
    "timeline": {
      "type": "array",
      "description": "Ordered list of actions to execute",
      "items": {
        "type": "object",
        "required": ["time", "action"],
        "properties": {
          "time": {
            "type": "number",
            "description": "Time in seconds from script start (floating point)"
          },
          "action": {
            "type": "string",
            "description": "JavaScript function name to call"
          },
          "params": {
            "type": "object",
            "description": "Parameters to pass to the action function"
          }
        }
      }
    }
  }
}
```

---

## Architecture Design

### New Data Structures

```javascript
// Behavior enumeration
const BehaviorType = {
  AUTONOMOUS: 'autonomous',      // Current random movement (default)
  TRACKING: 'tracking',          // Follow focal point (adapted from spider)
  SCRIPTED: 'scripted'          // Execute loaded script
};

// Script execution state
const scriptExecutionState = {
  scriptInstances: new Map(),    // Map<setIndex, ScriptInstance>
  loadedScripts: new Map(),      // Map<scriptId, ScriptObject>
  defaultScripts: {},            // { setIndex: scriptId }
  scriptDirectory: 'scripts/'    // Base path for JSON files
};

// Script instance structure
class ScriptInstance {
  constructor(scriptObject, setIndex, startTime) {
    this.scriptObject = scriptObject;
    this.setIndex = setIndex;
    this.startTime = startTime;
    this.scheduledActions = [];   // Array of timeout IDs
    this.interactionInstances = []; // Related script instances
    this.isRunning = false;
    this.onComplete = null;        // Callback when script finishes
  }
}

// Enhanced eye set structure
// Add to existing eyeSet object:
eyeSet.behavior = BehaviorType.AUTONOMOUS;
eyeSet.currentScript = null;       // ScriptInstance if behavior is SCRIPTED
eyeSet.lastBehaviorChange = 0;     // Timestamp of last behavior change
```

### Script Loading System

```javascript
// Load script from JSON file
async function loadScript(scriptId) {
  if (scriptExecutionState.loadedScripts.has(scriptId)) {
    return scriptExecutionState.loadedScripts.get(scriptId);
  }

  try {
    const response = await fetch(`${scriptExecutionState.scriptDirectory}${scriptId}.json`);
    if (!response.ok) throw new Error(`Script not found: ${scriptId}`);

    const scriptObject = await response.json();

    // Validate script structure
    if (!validateScript(scriptObject)) {
      throw new Error(`Invalid script format: ${scriptId}`);
    }

    // Sort timeline by time
    scriptObject.timeline.sort((a, b) => a.time - b.time);

    // Calculate duration if not provided
    if (!scriptObject.duration) {
      const lastAction = scriptObject.timeline[scriptObject.timeline.length - 1];
      scriptObject.duration = lastAction.time + (lastAction.params?.duration || 0);
    }

    scriptExecutionState.loadedScripts.set(scriptId, scriptObject);
    console.log(`Loaded script: ${scriptObject.name} (${scriptId})`);

    return scriptObject;
  } catch (error) {
    console.error(`Failed to load script ${scriptId}:`, error);
    return null;
  }
}

// Validate script structure
function validateScript(script) {
  if (!script.scriptId || !script.name || !Array.isArray(script.timeline)) {
    return false;
  }

  for (const action of script.timeline) {
    if (typeof action.time !== 'number' || !action.action) {
      return false;
    }
  }

  return true;
}

// Preload all scripts in directory
async function preloadAllScripts() {
  const scriptList = [
    'surprise', 'cross_eyes', 'roll_eyes', 'sleepy',
    'angry', 'curious', 'scared', 'confused',
    'sync_blink', 'wave', 'conversation', 'dance'
  ];

  const promises = scriptList.map(id => loadScript(id));
  await Promise.allSettled(promises);
}
```

### Script Execution Engine

```javascript
// Start executing a script on an eye set
async function executeScript(setIndex, scriptId) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet || !eyeSet.visible) return null;

  // Load script if not already loaded
  const scriptObject = await loadScript(scriptId);
  if (!scriptObject) return null;

  // Stop current animations
  stopEyeSetAnimations(setIndex);

  // Set behavior to scripted
  eyeSet.behavior = BehaviorType.SCRIPTED;
  eyeSet.lastBehaviorChange = Date.now();

  // Create script instance
  const instance = new ScriptInstance(scriptObject, setIndex, Date.now());
  instance.isRunning = true;
  eyeSet.currentScript = instance;
  scriptExecutionState.scriptInstances.set(setIndex, instance);

  // Schedule all timeline actions
  for (const actionDef of scriptObject.timeline) {
    const timeoutId = setTimeout(() => {
      executeAction(setIndex, actionDef.action, actionDef.params || {});
    }, actionDef.time * 1000);

    instance.scheduledActions.push(timeoutId);
  }

  // Handle interactions (other eye sets joining)
  if (scriptObject.interactions) {
    for (const interaction of scriptObject.interactions) {
      const interactionTimeoutId = setTimeout(() => {
        const targetScript = interaction.scriptId || scriptId;
        const interactionInstance = executeScript(interaction.targetSet, targetScript);
        if (interactionInstance) {
          instance.interactionInstances.push(interactionInstance);
        }
      }, interaction.startTime * 1000);

      instance.scheduledActions.push(interactionTimeoutId);
    }
  }

  // Schedule script completion
  const completionTimeoutId = setTimeout(() => {
    completeScript(setIndex);
  }, scriptObject.duration * 1000);

  instance.scheduledActions.push(completionTimeoutId);

  console.log(`Started script "${scriptObject.name}" on eye set ${setIndex}`);
  return instance;
}

// Complete script execution
function completeScript(setIndex) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet || !eyeSet.currentScript) return;

  const instance = eyeSet.currentScript;

  // Clear all scheduled actions
  for (const timeoutId of instance.scheduledActions) {
    clearTimeout(timeoutId);
  }

  instance.isRunning = false;
  instance.scheduledActions = [];

  // Execute completion callback if present
  if (instance.onComplete) {
    instance.onComplete();
  }

  // Clean up
  eyeSet.currentScript = null;
  scriptExecutionState.scriptInstances.delete(setIndex);

  console.log(`Completed script "${instance.scriptObject.name}" on eye set ${setIndex}`);

  // Return to autonomous behavior
  eyeSet.behavior = BehaviorType.AUTONOMOUS;
  eyeSet.lastBehaviorChange = Date.now();
  startEyeSetAnimations(setIndex);
}

// Stop script execution (manual interrupt)
function stopScript(setIndex) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet || !eyeSet.currentScript) return;

  completeScript(setIndex);
}

// Execute a single action
function executeAction(setIndex, actionName, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet || !eyeSet.visible) return;

  // Resolve action function
  const actionFunction = actionRegistry[actionName];
  if (!actionFunction) {
    console.warn(`Unknown action: ${actionName}`);
    return;
  }

  // Call action with eye set and parameters
  actionFunction(setIndex, params);
}
```

### Behavior Management

```javascript
// Set behavior mode for an eye set
function setEyeBehavior(setIndex, behavior) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  // Stop current behavior
  if (eyeSet.behavior === BehaviorType.SCRIPTED && eyeSet.currentScript) {
    stopScript(setIndex);
  } else if (eyeSet.behavior === BehaviorType.TRACKING) {
    stopEyeSetTracking(setIndex);
  } else {
    stopEyeSetAnimations(setIndex);
  }

  // Start new behavior
  eyeSet.behavior = behavior;
  eyeSet.lastBehaviorChange = Date.now();

  switch (behavior) {
    case BehaviorType.AUTONOMOUS:
      startEyeSetAnimations(setIndex);
      break;

    case BehaviorType.TRACKING:
      startEyeSetTracking(setIndex);
      break;

    case BehaviorType.SCRIPTED:
      // Scripts started via executeScript()
      break;
  }

  debouncedSaveState();
}

// Cycle through behaviors (for keyboard control)
function cycleBehavior(setIndex) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const behaviors = [
    BehaviorType.AUTONOMOUS,
    BehaviorType.TRACKING,
    BehaviorType.SCRIPTED
  ];

  const currentIndex = behaviors.indexOf(eyeSet.behavior);
  const nextIndex = (currentIndex + 1) % behaviors.length;
  const nextBehavior = behaviors[nextIndex];

  if (nextBehavior === BehaviorType.SCRIPTED) {
    // Load default script or prompt for selection
    const defaultScript = scriptExecutionState.defaultScripts[setIndex];
    if (defaultScript) {
      executeScript(setIndex, defaultScript);
    } else {
      // Cycle to next behavior instead
      setEyeBehavior(setIndex, BehaviorType.AUTONOMOUS);
    }
  } else {
    setEyeBehavior(setIndex, nextBehavior);
  }
}

// Cycle through available scripts
function cycleScript(setIndex) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const scriptIds = Array.from(scriptExecutionState.loadedScripts.keys());
  if (scriptIds.length === 0) return;

  // Find current script index
  let currentIndex = -1;
  if (eyeSet.currentScript) {
    currentIndex = scriptIds.indexOf(eyeSet.currentScript.scriptObject.scriptId);
  }

  // Get next script
  const nextIndex = (currentIndex + 1) % scriptIds.length;
  const nextScriptId = scriptIds[nextIndex];

  // Execute next script
  executeScript(setIndex, nextScriptId);
}
```

---

## Director System

The Director is an orchestration layer that automatically manages eye set behaviors using probability-based decisions.

### Director Architecture

```javascript
// Director state
const directorState = {
  enabled: false,
  mode: 'active',            // 'passive', 'active', 'chaotic'
  lastScriptTime: 0,
  scriptCooldown: 5000,      // Min ms between director-triggered scripts
  evaluationInterval: 8000,   // Check every 8 seconds
  evaluationTimeoutId: null,
  triggerProbabilities: {
    autonomous: 0.5,          // 50% stay in autonomous
    tracking: 0.2,            // 20% switch to tracking
    scripted: 0.3             // 30% trigger a script
  },
  interactionChance: 0.3      // 30% chance to trigger multi-eye scripts
};

// Director configuration
const directorConfig = {
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
      scriptPreferences: ['surprise', 'roll_eyes', 'sleepy', 'angry', 'curious', 'scared']
    }
  }
};
```

### Director Functions

```javascript
// Start the director
function startDirector(mode = 'active') {
  if (directorState.enabled) return;

  directorState.enabled = true;
  directorState.mode = mode;

  // Apply mode configuration
  const modeConfig = directorConfig.modes[mode];
  if (modeConfig) {
    directorState.evaluationInterval = modeConfig.evaluationInterval;
    directorState.scriptCooldown = modeConfig.scriptCooldown;
    directorState.triggerProbabilities = { ...modeConfig.triggerProbabilities };
  }

  console.log(`Director started in ${mode} mode`);
  scheduleDirectorEvaluation();
}

// Stop the director
function stopDirector() {
  if (!directorState.enabled) return;

  directorState.enabled = false;

  if (directorState.evaluationTimeoutId) {
    clearTimeout(directorState.evaluationTimeoutId);
    directorState.evaluationTimeoutId = null;
  }

  console.log('Director stopped');
}

// Main director evaluation loop
function evaluateDirector() {
  if (!directorState.enabled) return;

  const now = Date.now();

  // Get all visible eye sets
  const visibleSets = eyeSets
    .map((set, idx) => ({ set, idx }))
    .filter(({ set }) => set && set.visible);

  if (visibleSets.length === 0) {
    scheduleDirectorEvaluation();
    return;
  }

  // Check cooldown
  if (now - directorState.lastScriptTime < directorState.scriptCooldown) {
    scheduleDirectorEvaluation();
    return;
  }

  // Evaluate each visible eye set
  for (const { set, idx } of visibleSets) {
    // Skip if already running a script or recently changed behavior
    if (set.currentScript || (now - set.lastBehaviorChange < 3000)) {
      continue;
    }

    // Decide action based on probabilities
    const action = weightedRandomChoice(directorState.triggerProbabilities);

    switch (action) {
      case 'autonomous':
        if (set.behavior !== BehaviorType.AUTONOMOUS) {
          setEyeBehavior(idx, BehaviorType.AUTONOMOUS);
        }
        break;

      case 'tracking':
        if (set.behavior !== BehaviorType.TRACKING) {
          setEyeBehavior(idx, BehaviorType.TRACKING);
        }
        break;

      case 'scripted':
        triggerDirectorScript(idx, visibleSets);
        directorState.lastScriptTime = now;
        break;
    }
  }

  scheduleDirectorEvaluation();
}

// Schedule next director evaluation
function scheduleDirectorEvaluation() {
  if (!directorState.enabled) return;

  // Add some randomness to evaluation timing
  const jitter = Math.random() * 2000 - 1000; // ±1 second
  const delay = directorState.evaluationInterval + jitter;

  directorState.evaluationTimeoutId = setTimeout(evaluateDirector, delay);
}

// Trigger a script chosen by the director
function triggerDirectorScript(setIndex, visibleSets) {
  // Determine if this should be an interaction
  const shouldInteract = visibleSets.length > 1 &&
                         Math.random() < directorState.interactionChance;

  let scriptId;

  if (shouldInteract) {
    // Choose interaction script
    const interactionScripts = directorConfig.conditions.multipleEyesVisible.scriptPreferences;
    scriptId = weightedRandomScriptChoice(interactionScripts);
  } else {
    // Choose solo script
    const soloScripts = directorConfig.conditions.singleEyeVisible.scriptPreferences;
    scriptId = weightedRandomScriptChoice(soloScripts);
  }

  if (scriptId) {
    console.log(`Director triggering script "${scriptId}" on eye set ${setIndex}`);
    executeScript(setIndex, scriptId);
  }
}

// Weighted random choice from probability distribution
function weightedRandomChoice(weights) {
  const rand = Math.random();
  let cumulative = 0;

  for (const [choice, probability] of Object.entries(weights)) {
    cumulative += probability;
    if (rand < cumulative) {
      return choice;
    }
  }

  return Object.keys(weights)[0]; // Fallback
}

// Weighted random script selection
function weightedRandomScriptChoice(scriptIds) {
  // Filter to loaded scripts with weights
  const available = scriptIds.filter(id =>
    scriptExecutionState.loadedScripts.has(id) &&
    directorConfig.scriptWeights[id] !== undefined
  );

  if (available.length === 0) return null;

  // Calculate total weight
  const totalWeight = available.reduce((sum, id) =>
    sum + (directorConfig.scriptWeights[id] || 1.0), 0
  );

  // Weighted random selection
  let rand = Math.random() * totalWeight;

  for (const scriptId of available) {
    const weight = directorConfig.scriptWeights[scriptId] || 1.0;
    rand -= weight;
    if (rand <= 0) {
      return scriptId;
    }
  }

  return available[0]; // Fallback
}

// Change director mode
function setDirectorMode(mode) {
  if (!directorConfig.modes[mode]) {
    console.error(`Unknown director mode: ${mode}`);
    return;
  }

  const wasEnabled = directorState.enabled;

  if (wasEnabled) {
    stopDirector();
  }

  directorState.mode = mode;

  if (wasEnabled) {
    startDirector(mode);
  }

  console.log(`Director mode changed to: ${mode}`);
}
```

---

## Action Functions

### Action Registry

```javascript
// Registry of all available actions
const actionRegistry = {
  // Basic actions
  'blink': actionBlink,
  'moveIris': actionMoveIris,
  'setScale': actionSetScale,
  'setGap': actionSetGap,
  'setPosition': actionSetPosition,
  'playSound': actionPlaySound,

  // Advanced actions
  'crossEyes': actionCrossEyes,
  'uncrossEyes': actionUncrossEyes,
  'rollEyes': actionRollEyes,
  'widen': actionWiden,
  'squint': actionSquint,
  'lookAt': actionLookAt,
  'dart': actionDart,
  'shake': actionShake,
  'startDripping': actionStartDripping,
  'stopDripping': actionStopDripping,
  'setColor': actionSetColor,
  'fadeColor': actionFadeColor
};
```

### Core Action Implementations

```javascript
// Blink action
function actionBlink(setIndex, params) {
  blinkEyeSet(setIndex);
}

// Move iris to specific position
function actionMoveIris(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { x = 0, y = 0, duration = 1.5 } = params;
  const irises = eyeSet.element.querySelectorAll('.iris');

  // Update CSS transition duration
  irises.forEach(iris => {
    iris.style.transition = `transform ${duration}s ease-out`;
    iris.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// Set scale with animation
function actionSetScale(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { scale, duration = 0.3 } = params;

  // Temporarily override transition for smooth animation
  const originalTransition = eyeSet.element.style.transition;
  eyeSet.element.style.transition = `transform ${duration}s ease-out, gap ${duration}s ease-out`;

  eyeSet.scale = Math.max(minScale, Math.min(scale, maxScale));
  updateEyeSetTransform(setIndex);

  // Restore original transition after animation
  setTimeout(() => {
    eyeSet.element.style.transition = originalTransition;
  }, duration * 1000);
}

// Set gap with animation
function actionSetGap(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { gap, duration = 0.3 } = params;

  const originalTransition = eyeSet.element.style.transition;
  eyeSet.element.style.transition = `transform ${duration}s ease-out, gap ${duration}s ease-out`;

  eyeSet.gap = Math.max(minGap, Math.min(gap, maxGap));
  updateEyeSetTransform(setIndex);

  setTimeout(() => {
    eyeSet.element.style.transition = originalTransition;
  }, duration * 1000);
}

// Set position with animation
function actionSetPosition(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { x, y, duration = 0.5 } = params;

  const originalTransition = eyeSet.element.style.transition;
  eyeSet.element.style.transition = `transform ${duration}s ease-out, gap ${duration}s ease-out`;

  if (x !== undefined) eyeSet.posX = x;
  if (y !== undefined) eyeSet.posY = y;
  updateEyeSetTransform(setIndex);

  setTimeout(() => {
    eyeSet.element.style.transition = originalTransition;
  }, duration * 1000);
}

// Play sound file
function actionPlaySound(setIndex, params) {
  const { soundFile, volume = 1.0 } = params;

  try {
    const audio = new Audio(soundFile);
    audio.volume = Math.max(0, Math.min(volume, 1));
    audio.play().catch(err => console.warn('Audio play failed:', err));
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
}

// Cross eyes toward center
function actionCrossEyes(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { intensity = 0.5, duration = 0.8 } = params;
  const leftEyeIrises = eyeSet.element.querySelectorAll('svg:first-child .iris');
  const rightEyeIrises = eyeSet.element.querySelectorAll('svg:last-child .iris');

  const crossAmount = 40 * intensity; // Max 40px inward movement

  leftEyeIrises.forEach(iris => {
    iris.style.transition = `transform ${duration}s ease-out`;
    iris.style.transform = `translate(${crossAmount}px, 0px)`;
  });

  rightEyeIrises.forEach(iris => {
    iris.style.transition = `transform ${duration}s ease-out`;
    iris.style.transform = `translate(${-crossAmount}px, 0px)`;
  });
}

// Uncross eyes (return to center)
function actionUncrossEyes(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { duration = 0.5 } = params;
  const irises = eyeSet.element.querySelectorAll('.iris');

  irises.forEach(iris => {
    iris.style.transition = `transform ${duration}s ease-out`;
    iris.style.transform = 'translate(0px, 0px)';
  });
}

// Roll eyes in circular motion
function actionRollEyes(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { direction = 'up', duration = 1.5 } = params;
  const irises = eyeSet.element.querySelectorAll('.iris');

  // Define roll path (circular motion)
  const radius = 45;
  const steps = 8;
  const stepDuration = duration / steps;

  // Starting angle based on direction
  let startAngle = direction === 'up' ? -Math.PI/2 : Math.PI/2;
  if (direction === 'left') startAngle = Math.PI;
  if (direction === 'right') startAngle = 0;

  // Animate through circular path
  for (let i = 0; i <= steps; i++) {
    setTimeout(() => {
      const angle = startAngle + (i / steps) * 2 * Math.PI;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.3; // Elliptical for eye shape

      irises.forEach(iris => {
        iris.style.transition = `transform ${stepDuration}s linear`;
        iris.style.transform = `translate(${x}px, ${y}px)`;
      });
    }, i * stepDuration * 1000);
  }
}

// Widen eyes (surprise effect)
function actionWiden(setIndex, params) {
  const { intensity = 0.5, duration = 0.3 } = params;
  const scaleIncrease = 1 + (intensity * 0.5); // Up to 1.5x scale
  actionSetScale(setIndex, { scale: scaleIncrease, duration });
}

// Squint eyes
function actionSquint(setIndex, params) {
  const { intensity = 0.5, duration = 0.3 } = params;
  const scaleDecrease = 1 - (intensity * 0.3); // Down to 0.7x scale
  actionSetScale(setIndex, { scale: scaleDecrease, duration });
}

// Look at specific screen coordinates
function actionLookAt(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { screenX, screenY, duration = 0.8 } = params;

  // Get eye position on screen
  const rect = eyeSet.element.getBoundingClientRect();
  const eyeCenterX = rect.left + rect.width / 2;
  const eyeCenterY = rect.top + rect.height / 2;

  // Calculate iris offset
  const dx = screenX - eyeCenterX;
  const dy = screenY - eyeCenterY;
  const angle = Math.atan2(dy, dx);
  const distance = Math.min(50, Math.sqrt(dx * dx + dy * dy) / 20);

  const offsetX = Math.cos(angle) * distance;
  const offsetY = Math.sin(angle) * distance * 0.2; // Less vertical movement

  actionMoveIris(setIndex, { x: offsetX, y: offsetY, duration });
}

// Quick darting movement
function actionDart(setIndex, params) {
  const { direction = 'random', duration = 0.15 } = params;

  let x = 0, y = 0;
  if (direction === 'random') {
    x = (Math.random() - 0.5) * 100;
    y = (Math.random() - 0.5) * 20;
  } else if (direction === 'left') {
    x = -50;
  } else if (direction === 'right') {
    x = 50;
  } else if (direction === 'up') {
    y = -10;
  } else if (direction === 'down') {
    y = 10;
  }

  actionMoveIris(setIndex, { x, y, duration });
}

// Shake eyes rapidly
function actionShake(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { intensity = 0.5, duration = 0.5, frequency = 10 } = params;
  const shakeAmount = 20 * intensity;
  const interval = duration / frequency;

  for (let i = 0; i < frequency; i++) {
    setTimeout(() => {
      const x = (Math.random() - 0.5) * 2 * shakeAmount;
      const y = (Math.random() - 0.5) * 2 * shakeAmount * 0.3;
      actionMoveIris(setIndex, { x, y, duration: interval });
    }, i * interval * 1000);
  }
}

// Start dripping
function actionStartDripping(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet || !eyeSet.visible) return;

  if (!eyeSet.dripTimeoutId) {
    const initialDripDelay = Math.random() * 1000 + 500;
    eyeSet.dripTimeoutId = setTimeout(() => dripEyeSet(setIndex), initialDripDelay);
  }
}

// Stop dripping
function actionStopDripping(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  if (eyeSet.dripTimeoutId) {
    clearTimeout(eyeSet.dripTimeoutId);
    eyeSet.dripTimeoutId = null;
  }
}

// Set iris color
function actionSetColor(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { color } = params;

  // Pause color animations
  const irisMainElements = eyeSet.element.querySelectorAll('.iris-main');
  irisMainElements.forEach(elem => {
    elem.style.animation = 'none';
    elem.style.fill = color;
  });
}

// Fade color over time
function actionFadeColor(setIndex, params) {
  const eyeSet = eyeSets[setIndex];
  if (!eyeSet) return;

  const { fromColor, toColor, duration = 1.0 } = params;

  // Use CSS transition for color fade
  const irisMainElements = eyeSet.element.querySelectorAll('.iris-main');
  irisMainElements.forEach(elem => {
    elem.style.animation = 'none';
    elem.style.fill = fromColor;
    elem.style.transition = `fill ${duration}s ease-in-out`;

    // Trigger fade
    setTimeout(() => {
      elem.style.fill = toColor;
    }, 10);
  });
}
```

---

## State Management

### Enhanced State Persistence

```javascript
// Add to saveStateToLocalStorage()
state.scriptExecutionState = {
  defaultScripts: scriptExecutionState.defaultScripts
};

state.directorState = {
  enabled: directorState.enabled,
  mode: directorState.mode
};

for (let i = 0; i < maxSets; i++) {
  const eyeSet = eyeSets[i];
  if (eyeSet) {
    state.eyeSets[i] = {
      // ... existing properties ...
      behavior: eyeSet.behavior
    };
  }
}

// Add to loadStateFromLocalStorage()
if (savedState.scriptExecutionState) {
  scriptExecutionState.defaultScripts = savedState.scriptExecutionState.defaultScripts || {};
}

if (savedState.directorState) {
  // Restore director state (but don't auto-start)
  directorState.mode = savedState.directorState.mode || 'active';
  // User must manually enable director
}

eyeSet.behavior = savedSet.behavior || BehaviorType.AUTONOMOUS;
```

---

## Keyboard Controls

### Key Mappings

```javascript
// Add to keydown event listener

// D key - toggle director on/off
if (key === 'd') {
  event.preventDefault();
  if (directorState.enabled) {
    stopDirector();
  } else {
    startDirector(directorState.mode);
  }
  return;
}

// M key - cycle director mode (passive -> active -> chaotic)
if (key === 'm') {
  event.preventDefault();
  if (directorState.enabled) {
    const modes = ['passive', 'active', 'chaotic'];
    const currentIndex = modes.indexOf(directorState.mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setDirectorMode(nextMode);
  } else {
    console.log('Director is not enabled. Press D to start.');
  }
  return;
}

// B key - cycle behavior mode (autonomous -> tracking -> scripted)
if (key === 'b') {
  event.preventDefault();
  if (activeSetIndex !== -1) {
    cycleBehavior(activeSetIndex);
  }
  return;
}

// S key - cycle through available scripts (when in scripted mode)
if (key === 's') {
  event.preventDefault();
  if (activeSetIndex !== -1) {
    const eyeSet = eyeSets[activeSetIndex];
    if (eyeSet && eyeSet.behavior === BehaviorType.SCRIPTED) {
      cycleScript(activeSetIndex);
    } else {
      // If not in scripted mode, switch to it
      cycleBehavior(activeSetIndex);
    }
  }
  return;
}

// P key - play default script for active eye set
if (key === 'p') {
  event.preventDefault();
  if (activeSetIndex !== -1) {
    const defaultScript = scriptExecutionState.defaultScripts[activeSetIndex];
    if (defaultScript) {
      executeScript(activeSetIndex, defaultScript);
    } else {
      console.log('No default script assigned to this eye set');
    }
  }
  return;
}

// Escape key - stop current script and return to autonomous
if (key === 'escape') {
  event.preventDefault();
  if (activeSetIndex !== -1) {
    const eyeSet = eyeSets[activeSetIndex];
    if (eyeSet && eyeSet.currentScript) {
      stopScript(activeSetIndex);
    }
  }
  return;
}
```

### Updated Help Instructions

```html
<div class="instructions" id="instructions">
  <h3>Controls</h3>
  <p><kbd>C</kbd> Auto creepy (beast mode)</p>
  <p><kbd>X</kbd> Eye tracking (beast mode)</p>
  <p><kbd>Z</kbd> Custom eyes</p>
  <p><kbd>T</kbd> Toggle tears (drips)</p>
  <p><kbd>D</kbd> Toggle director</p>
  <p><kbd>M</kbd> Director mode (passive/active/chaotic)</p>
  <p><kbd>1-0</kbd> Toggle eye sets (10)</p>
  <p><kbd>B</kbd> Cycle behavior mode</p>
  <p><kbd>S</kbd> Cycle scripts</p>
  <p><kbd>P</kbd> Play default script</p>
  <p><kbd>Esc</kbd> Stop script</p>
  <p><kbd>Q/W</kbd> Scale up/down</p>
  <p><kbd>E/R</kbd> Gap wider/closer</p>
  <p><kbd>↑↓←→</kbd> Move position</p>
  <p><kbd>Space</kbd> Help</p>
</div>
```

---

## Implementation Plan

### Phase 1: Foundation (2-3 hours)
**Goal**: Basic script loading and execution framework

1. Add BehaviorType enum and data structures
2. Implement loadScript(), validateScript(), preloadAllScripts()
3. Implement executeScript(), completeScript(), stopScript()
4. Create action registry and executeAction()
5. Create scripts/ directory
6. Test with simple single-action script

**Deliverable**: Can load and execute simple scripts

---

### Phase 2: Core Actions (2-3 hours)
**Goal**: Implement all basic action functions

1. Refactor existing functions as actions (blink, moveIris)
2. Implement actionSetScale(), actionSetGap(), actionSetPosition()
3. Implement actionPlaySound()
4. Create test scripts for each action
5. Verify timing accuracy

**Deliverable**: All basic actions working

---

### Phase 3: Advanced Actions (3-4 hours)
**Goal**: Implement specialized eye behaviors

1. Implement crossEyes, uncrossEyes, rollEyes
2. Implement dart, shake, widen, squint
3. Implement lookAt
4. Implement dripping controls
5. Implement color actions
6. Test all advanced actions

**Deliverable**: Complete action library

---

### Phase 4: Interaction System (2-3 hours)
**Goal**: Multi-eye set synchronization

1. Implement interaction scheduling in executeScript()
2. Track interaction instances
3. Create synchronized test scripts
4. Test timing coordination
5. Handle cleanup

**Deliverable**: Multi-eye coordinated scripts working

---

### Phase 5: Behavior Management (2 hours)
**Goal**: Seamless switching between behavior modes

1. Implement setEyeBehavior(), cycleBehavior(), cycleScript()
2. Adapt tracking mode for individual eye sets
3. Implement startEyeSetTracking(), stopEyeSetTracking()
4. Test all transitions

**Deliverable**: Can switch between all three behavior modes

---

### Phase 6: UI & Controls (1-2 hours)
**Goal**: User-friendly script control

1. Add keyboard controls (B, S, P, Esc)
2. Update help panel
3. Test all keyboard shortcuts
4. Add visual feedback for behavior mode

**Deliverable**: Complete keyboard control system

---

### Phase 7: Persistence & Polish (1-2 hours)
**Goal**: Save state and error handling

1. Add behavior mode to localStorage
2. Save default script assignments
3. Implement robust error handling
4. Add console logging
5. Test state persistence

**Deliverable**: Reliable system with state persistence

---

### Phase 8: Content Creation (3-4 hours)
**Goal**: Create rich script library

1. Create 8 basic expression scripts
2. Create 4 interactive scripts
3. Source/create sound effects
4. Test all scripts
5. Tune timing and parameters

**Deliverable**: Library of 12+ expressive scripts

---

### Phase 9: Testing & Documentation (1-2 hours)
**Goal**: Ensure stability and usability

1. Test all scripts individually
2. Test interaction scripts
3. Test behavior switching
4. Update CLAUDE.md
5. Create script authoring guide
6. Profile performance

**Deliverable**: Stable, documented system

---

### Phase 10: Director System (3-4 hours)
**Goal**: Intelligent behavior orchestration

1. Implement director state and configuration
2. Implement evaluation loop
3. Implement weighted random selection
4. Create director_config.json
5. Add keyboard controls (D, M keys)
6. Test all director modes
7. Tune probabilities and weights
8. Add visual indicators

**Deliverable**: Fully functional director system

---

**Total Implementation Time**: 21-29 hours

---

## Configuration Examples

### scripts/config.json

```json
{
  "defaultScripts": {
    "0": "surprise",
    "1": "cross_eyes",
    "2": "roll_eyes",
    "3": "sleepy",
    "4": "angry",
    "5": "curious",
    "6": "scared",
    "7": "confused",
    "8": "conversation",
    "9": "dance"
  },
  "autoLoad": [
    "surprise",
    "cross_eyes",
    "roll_eyes",
    "sleepy",
    "angry",
    "curious",
    "scared",
    "confused",
    "sync_blink",
    "wave",
    "conversation",
    "dance"
  ],
  "scriptDirectory": "scripts/",
  "soundDirectory": "sounds/"
}
```

### scripts/director_config.json

```json
{
  "defaultMode": "active",
  "modes": {
    "passive": {
      "evaluationInterval": 12000,
      "scriptCooldown": 10000,
      "triggerProbabilities": {
        "autonomous": 0.8,
        "tracking": 0.1,
        "scripted": 0.1
      }
    },
    "active": {
      "evaluationInterval": 8000,
      "scriptCooldown": 5000,
      "triggerProbabilities": {
        "autonomous": 0.5,
        "tracking": 0.2,
        "scripted": 0.3
      }
    },
    "chaotic": {
      "evaluationInterval": 4000,
      "scriptCooldown": 2000,
      "triggerProbabilities": {
        "autonomous": 0.2,
        "tracking": 0.3,
        "scripted": 0.5
      }
    }
  },
  "scriptWeights": {
    "surprise": 1.0,
    "cross_eyes": 0.8,
    "roll_eyes": 0.9,
    "sleepy": 0.6,
    "angry": 0.7,
    "curious": 0.9,
    "scared": 0.7,
    "confused": 0.8,
    "sync_blink": 1.2,
    "wave": 1.0,
    "conversation": 1.5,
    "dance": 1.2
  },
  "interactionChance": 0.3,
  "conditions": {
    "multipleEyesVisible": {
      "minEyes": 2,
      "scriptPreferences": ["conversation", "sync_blink", "wave", "dance"]
    },
    "singleEyeVisible": {
      "scriptPreferences": ["surprise", "roll_eyes", "sleepy", "angry", "curious", "scared"]
    }
  }
}
```

---

## Script Examples

### scripts/surprise.json

```json
{
  "scriptId": "surprise",
  "name": "Surprise Reaction",
  "description": "Eyes widen in surprise with a gasp",
  "duration": 3.5,
  "timeline": [
    {
      "time": 0.0,
      "action": "playSound",
      "params": { "soundFile": "sounds/gasp.mp3" }
    },
    {
      "time": 0.1,
      "action": "setScale",
      "params": { "scale": 1.5, "duration": 0.3 }
    },
    {
      "time": 0.1,
      "action": "setGap",
      "params": { "gap": 25, "duration": 0.3 }
    },
    {
      "time": 0.2,
      "action": "moveIris",
      "params": { "x": 0, "y": -15, "duration": 0.2 }
    },
    {
      "time": 0.5,
      "action": "blink"
    },
    {
      "time": 2.5,
      "action": "setScale",
      "params": { "scale": 1.0, "duration": 0.5 }
    },
    {
      "time": 2.5,
      "action": "setGap",
      "params": { "gap": 20, "duration": 0.5 }
    }
  ]
}
```

### scripts/cross_eyes.json

```json
{
  "scriptId": "cross_eyes",
  "name": "Cross Eyes",
  "description": "Eyes cross toward center",
  "duration": 4.0,
  "timeline": [
    {
      "time": 0.0,
      "action": "crossEyes",
      "params": { "intensity": 0.8, "duration": 0.8 }
    },
    {
      "time": 2.0,
      "action": "blink"
    },
    {
      "time": 3.0,
      "action": "uncrossEyes",
      "params": { "duration": 0.5 }
    }
  ]
}
```

### scripts/roll_eyes.json

```json
{
  "scriptId": "roll_eyes",
  "name": "Roll Eyes",
  "description": "Classic eye roll gesture",
  "timeline": [
    {
      "time": 0.0,
      "action": "rollEyes",
      "params": { "direction": "up", "duration": 1.5 }
    },
    {
      "time": 1.8,
      "action": "moveIris",
      "params": { "x": 0, "y": 0, "duration": 0.3 }
    }
  ]
}
```

### scripts/sleepy.json

```json
{
  "scriptId": "sleepy",
  "name": "Sleepy Eyes",
  "description": "Slow blinks and droopy movement",
  "duration": 8.0,
  "timeline": [
    {
      "time": 0.0,
      "action": "moveIris",
      "params": { "x": 0, "y": 5, "duration": 1.0 }
    },
    {
      "time": 1.5,
      "action": "blink"
    },
    {
      "time": 3.0,
      "action": "squint",
      "params": { "intensity": 0.3, "duration": 0.8 }
    },
    {
      "time": 4.5,
      "action": "blink"
    },
    {
      "time": 6.0,
      "action": "blink"
    },
    {
      "time": 7.0,
      "action": "setScale",
      "params": { "scale": 1.0, "duration": 0.5 }
    }
  ]
}
```

### scripts/conversation.json

```json
{
  "scriptId": "conversation",
  "name": "Eyes Talking",
  "description": "Two eye sets look at each other",
  "interactions": [
    { "targetSet": 1, "startTime": 0.0 }
  ],
  "timeline": [
    {
      "time": 0.0,
      "action": "setPosition",
      "params": { "x": -200, "y": 0, "duration": 0.5 }
    },
    {
      "time": 0.5,
      "action": "moveIris",
      "params": { "x": 30, "y": 0, "duration": 0.3 }
    },
    {
      "time": 1.5,
      "action": "blink"
    },
    {
      "time": 3.0,
      "action": "dart",
      "params": { "direction": "up" }
    },
    {
      "time": 3.5,
      "action": "moveIris",
      "params": { "x": 30, "y": 0, "duration": 0.3 }
    },
    {
      "time": 5.0,
      "action": "blink"
    }
  ]
}
```

### scripts/sync_blink.json

```json
{
  "scriptId": "sync_blink",
  "name": "Synchronized Multi-Eye Blink",
  "description": "Multiple eye sets blink in sequence",
  "interactions": [
    { "targetSet": 1, "startTime": 0.3 },
    { "targetSet": 2, "startTime": 0.6 }
  ],
  "timeline": [
    {
      "time": 0.0,
      "action": "blink"
    },
    {
      "time": 0.3,
      "action": "blink"
    },
    {
      "time": 0.6,
      "action": "blink"
    }
  ]
}
```

---

## Summary

This design provides a comprehensive scripted behavior system with:

1. **Flexible Script System**: JSON-based scripts with relative timing and parameter support
2. **Rich Action Library**: 15+ action functions for expressive behaviors
3. **Multi-Eye Synchronization**: Interaction system for coordinated scripts
4. **Director Orchestration**: Intelligent probability-based behavior management
5. **Seamless Behavior Switching**: Three modes (autonomous, tracking, scripted) with smooth transitions
6. **User Control**: Intuitive keyboard controls for manual and automatic operation
7. **State Persistence**: Save behavior modes and script assignments
8. **Extensibility**: Easy to add new actions, scripts, and director modes
9. **Performance**: Efficient timeout-based scheduling with minimal overhead

The implementation is broken into 10 phases totaling approximately 21-29 hours of development work.
