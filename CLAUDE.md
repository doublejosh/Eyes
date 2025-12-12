# Disembodied Eyes Visual Canvas App

An interactive single-page app featuring a pair of realistic SVG eyes.
- Built entirely in vanilla HTML/CSS/JavaScript with no dependencies.

The eyes simlulate movement autonomously
- random iris movements every 1-5 seconds.
- Automatic blinking occurs randomly every 4-20 seconds

The iris color slowly cycles through 6 colors
- (green, brown, blue, orange, red, pink) over 60 seconds.
- Each iris has multiple layered radial gradients with blur filters for depth and realism.
- The pupils include lens flare effects for added detail.

Technical implementation
- Uses CSS keyframe animations on gradient stops for synchronized color transitions across both eyes.
- Iris movement uses CSS transforms with easing for smooth, natural eye tracking behavior.
- SVG filters (feGaussianBlur with varying stdDeviation) create depth through layered texture effects.

Code architecture
- Single HTML file structure with embedded CSS in `<style>` block and JavaScript in `<script>` block.
- Two SVG elements (left and right eye) share identical structure but with unique gradient IDs (suffixed with "Right").
- Iris layers are grouped in `<g class="iris">` containers for coordinated transform animations.
- JavaScript uses `setTimeout` recursion for scheduling random intervals (not `setInterval`).
- Color animations cycle through 6 keyframe stops at 16.67% intervals (60s / 6 colors).
- Movement constraints: horizontal ±50px, vertical ±10px to keep iris within eye bounds.
- Smooth scale animation.

User controls
- 1-0: Toggle eye sets (up to 10)
- Q/W: Scale up/down
- E/R: Gap wider/closer
- Arrow keys: Move position (up/down/left/right)
- Z: Toggle Spider Mode
- T: Toggle tears (drips)
- D: Toggle director (auto behavior orchestration)
- M: Cycle director mode (passive/active/chaotic)
- B: Cycle behavior mode (autonomous/tracking/scripted)
- S: Cycle through available scripts
- P: Play default script
- Esc: Stop current script
- Space: Toggle help

Spider Mode
- Press Z to enter/exit Spider Mode - an alternate display mode featuring ~200 individual circular eyes
- Eyes arranged in a ~14x14 grid with alternating row offsets creating a honeycomb pattern
- Corner eyes hidden to create an overall circular cluster shape
- Each eye has independent blinking (4-20s intervals) and iris movement (1-5s intervals)
- Simplified rendering (no gradients or blur filters) for performance with high eye count
- All eyes share synchronized color cycling animations
- Spider mode hides normal eye pairs when active
- Two tracking modes available:
  - X: Eye tracking mode - all eyes collectively follow a focal point that moves randomly
  - C: Auto creepy mode - automatically toggles between tracking and random movement every 4-12 seconds
- Manual focal point control via arrow keys or gamepad left stick (100px/frame sensitivity, 0.15 deadzone)
- Arrow keys and joystick activate manual control, resuming automatic movement after 5 seconds of no input
- Hidden corner eyes (~35) excluded from JavaScript processing for better performance

Scripted Behavior System
- Each eye set can have three behavior modes:
  - Autonomous: Random iris movement and blinking (default)
  - Tracking: Eyes follow a moving focal point
  - Scripted: Execute pre-defined animation scripts
- Scripts are JSON files in the scripts/ directory defining timed sequences of actions
- 13 built-in scripts:
  - Expressions: surprise, cross_eyes, roll_eyes, sleepy, angry, curious, scared, confused, shifty
  - Interactions: sync_blink, wave, conversation, dance
- Action library includes: blink, moveIris, setScale, setGap, setPosition, crossEyes, rollEyes, widen, squint, lookAt, dart, shake, startDripping, and more
- Scripts can trigger multi-eye interactions for coordinated animations
- Scripts play once then return to autonomous behavior
- Keyboard controls: B (cycle behavior), S (cycle scripts), P (play default), Esc (stop)

Director System
- Intelligent orchestration layer that automatically manages eye set behaviors
- Three director modes:
  - Passive: Subtle (80% autonomous, 10% tracking, 10% scripted)
  - Active: Balanced (50% autonomous, 20% tracking, 30% scripted)
  - Chaotic: Frequent (20% autonomous, 30% tracking, 50% scripted)
- Probability-based behavior switching with configurable evaluation intervals
- Weighted random script selection favors interaction scripts when multiple eyes are visible
- Cooldown periods prevent excessive script triggering
- Keyboard controls: D (toggle on/off), M (cycle modes)

State Persistence
- All eye set properties (position, scale, gap, visibility, behavior mode) saved to localStorage
- Default script assignments persist across sessions
- State automatically restored on page reload