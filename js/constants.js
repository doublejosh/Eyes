// Behavior enumeration
export const BehaviorType = {
    AUTONOMOUS: 'autonomous',      // Current random movement (default)
    TRACKING: 'tracking',          // Follow focal point
    SCRIPTED: 'scripted'          // Execute loaded script
};

// Default values for new eye sets
export const defaultState = {
    scale: 1,
    gap: 20,
    posX: 0,
    posY: 0,
    blinkTimeoutId: null,
    moveTimeoutId: null,
    dripTimeoutId: null,
    browMoveTimeoutId: null,
    everShown: false,
    behavior: BehaviorType.AUTONOMOUS,
    currentScript: null,
    lastBehaviorChange: 0,
    browStyle: 'medium',
    browAngle: 0,
    browHeight: 0,
    browLeftAngle: null,
    browRightAngle: null,
    browLeftHeight: null,
    browRightHeight: null,
    label: null  // User-assigned label for eyeset
};

// Constants
export const minScale = 0.05;
export const maxScale = 10;
export const scaleStep = 0.05;
export const minGap = -50;
export const maxGap = 200;
export const gapStep = 3;
export const posStep = 40;

// Arrow key acceleration constants
export const arrowKeyBaseSpeed = 2; // Minimum speed for quick taps (pixels/frame)
export const arrowKeyAcceleration = 150; // Acceleration multiplier for quadratic curve
export const arrowKeyMaxSpeed = 100; // Maximum speed cap (pixels/frame)

// localStorage constants
export const saveStateDebounceDelay = 500; // Milliseconds to wait before saving state
export const localStorageKey = 'eyesAppState';

// Focal point tracking constants
export const focalPointManualMoveStep = 1000; // Pixels per arrow key press
export const focalPointMoveDelayMin = 3000; // Min milliseconds between random moves
export const focalPointMoveDelayMax = 7000; // Max milliseconds between random moves
export const focalPointSmoothingFactor = 0.65; // Lerp factor for smooth movement
export const manualControlTimeout = 5000; // Milliseconds before resuming auto movement

// Gamepad constants
export const gamepadDeadzone = 0.15; // Ignore small joystick movements below this threshold
export const gamepadSensitivity = 100; // Multiplier for joystick movement speed

// Auto mode constants
export const autoModeToggleDelayMin = 4000; // Min milliseconds between mode switches
export const autoModeToggleDelayMax = 12000; // Max milliseconds between mode switches

// Spider eye animation constants
export const spiderEyeBlinkDelayMin = 4000; // Min milliseconds between blinks
export const spiderEyeBlinkDelayMax = 20000; // Max milliseconds between blinks
export const spiderEyeMoveDelayMin = 1000; // Min milliseconds between iris movements
export const spiderEyeMoveDelayMax = 5000; // Max milliseconds between iris movements
export const spiderEyePulseDurationMin = 3; // Min seconds for pulse animation
export const spiderEyePulseDurationMax = 8; // Max seconds for pulse animation
export const spiderEyeIrisMaxMovement = 12; // Maximum pixels iris can move (random mode)
export const spiderEyeTrackingMaxDistance = 25; // Maximum distance iris moves when tracking
export const spiderEyeTrackingDistanceDivisor = 30; // Divisor for tracking distance calculation
export const spiderEyeCount = 200;

// Hidden eye indices (corner eyes that are hidden via CSS - don't process these)
export const hiddenEyeIndices = new Set([
    // Row 1
    0, 1, 2, 3, 11, 12, 13,
    // Row 2
    14, 15, 26, 27,
    // Row 3
    28, 29, 41,
    // Row 4
    42, 55,
    // Row 11
    140,
    // Row 12
    154, 166, 167,
    // Row 13
    168, 169, 180, 181,
    // Row 14
    182, 183, 184, 193, 194, 195,
    // Row 15
    196, 197, 198, 199
]);

// Drip animation constants
export const dripPoolSize = 30; // Number of reusable drip elements
export const maxSimultaneousDrips = 15; // Maximum drips active at once
export const dripDelayMinSpider = 5000; // Min milliseconds between drips (spider mode)
export const dripDelayMaxSpider = 12000; // Max milliseconds between drips (spider mode)
export const dripDelayMinNormal = 2000; // Min milliseconds between drips (normal mode)
export const dripDelayMaxNormal = 6000; // Max milliseconds between drips (normal mode)
export const dripDurationMin = 1500; // Min milliseconds for drip fall animation
export const dripDurationMax = 2500; // Max milliseconds for drip fall animation
export const dripColors = ['#7a9b3d', '#9b9b3d', '#8b7a3d', '#9b5a5a', '#7a8b3d']; // Sickly liquid colors

// Eye sets constants
export const maxSets = 10;

