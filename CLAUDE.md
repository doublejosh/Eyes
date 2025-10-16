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
- Space: Toggle help

Spider Mode
- Press Z to enter/exit Spider Mode - an alternate display mode featuring ~200 individual circular eyes
- Eyes arranged in a ~14x14 grid with alternating row offsets creating a honeycomb pattern
- Corner eyes hidden to create an overall circular cluster shape
- Each eye has independent blinking (4-20s intervals) and iris movement (1-5s intervals)
- Simplified rendering (no gradients or blur filters) for performance with high eye count
- All eyes share synchronized color cycling animations
- Spider mode hides normal eye pairs when active