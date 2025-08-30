precision mediump float;

// Default mandatory variables
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_randomSeed;

// Grid and animation control uniforms
uniform float u_gridCols;
uniform float u_gridRows;
uniform float u_maxFadeDelay;
uniform float u_retriggerTime;
uniform float u_currentCue;
uniform float u_barStartCue;
uniform float u_cuesInBar;
uniform float u_totalCells;

// Mondrian colors
vec3 white = vec3(0.96, 0.96, 0.96);
vec3 black = vec3(0.0, 0.0, 0.0);
vec3 red = vec3(0.93, 0.11, 0.14);
vec3 blue = vec3(0.0, 0.35, 0.59);
vec3 yellow = vec3(0.97, 0.85, 0.3);


/**
* Generates a pseudo-random value between 0.0 and 1.0 based on input coordinates
*
* This function uses the input coordinates plus a global seed value to create
* random-appearing values that change with each page refresh.
*
* @param st - 2D vector input (typically grid cell coordinates)
* @return Float in range [0.0, 1.0] that appears random
*/
float random(vec2 st) {
  // Magic numbers chosen to create good distribution of pseudo-random values
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233)) + u_randomSeed) * 43758.5453123);
}

/**
* Creates a time-based fade-in effect for a grid cell
*
* This function determines when each cell should begin fading in based on a random
* delay, then calculates a fade progress value from 0.0 (invisible) to 1.0 (fully visible).
*
* @param cellCoord - Grid coordinates for the cell
* @param startTime - Base time when the first cells can start fading in
* @param duration - How long each individual cell's fade should take
* @return Float representing fade progress from 0.0 to 1.0
*/
float cellFadeIn(vec2 cellCoord, float duration) {
   // If no fade delay, show cell instantly
   if (u_maxFadeDelay <= 0.0) {
       return 1.0;
   }
   
   // Random delay for each cell 
   float delay = random(cellCoord) * u_maxFadeDelay;
   
   // Calculate fade progress (0 to 1) using retrigger time
   float fadeProgress = clamp((u_time - u_retriggerTime - delay) / duration, 0.0, 1.0);
   
   return fadeProgress;
}

void main() {
  // Normalize coordinates
  vec2 st = (gl_FragCoord.xy / u_resolution.xy);
  
   // Create grid using separate row/column counts
  vec2 grid = vec2(floor(st.x * u_gridCols), floor(st.y * u_gridRows));
  
  // Calculate cell index and reveal logic
  float cellIndex = grid.y * u_gridCols + grid.x;
  float cuesElapsed = u_currentCue - u_barStartCue;
  
  // On the last cue of the bar, reveal all cells
  bool isLastCue = (cuesElapsed >= (u_cuesInBar - 1.0));
  
  // Calculate how many cells should be visible
  float cellsVisible = isLastCue ? u_totalCells : (cuesElapsed + 1.0);
  
  // Simple approach: use cell index directly with random offset
  float randomOffset = random(grid);
  float adjustedIndex = mod(cellIndex + randomOffset * u_totalCells, u_totalCells);
  
  // Cell is visible if its adjusted index < number of cells that should be visible
  float isVisible = step(adjustedIndex, cellsVisible - 1.0);
  
  // Choose color based on grid position using random values
  vec3 color;
  float rand = random(grid);
  
  if (rand < 0.25) {
    color = red;
  } else if (rand < 0.5) {
    color = blue;
  } else if (rand < 0.75) {
    color = yellow;
  } else {
    color = white;
  }

  float fadeValue = cellFadeIn(grid, 1.0);
  color = mix(black, color, fadeValue * isVisible);

  float lineWidth = 0.02;
  if (st.x < lineWidth/3.0 || st.x > (1.0 - lineWidth/3.0) || 
      st.y < lineWidth/3.0 || st.y > (1.0 - lineWidth/3.0)) {
    color = black;
  }

   // Grid position within each cell (for drawing lines)
  vec2 gridPos = vec2(fract(st.x * u_gridCols), fract(st.y * u_gridRows));
  
  // Adjust lineWidth for aspect ratio
  float lineWidthX = lineWidth;
  float lineWidthY = lineWidth;

  // Then update the line calculation
  float line = smoothstep(0.0, lineWidthX, gridPos.x) *
              smoothstep(1.0, 1.0-lineWidthX, gridPos.x) *
              smoothstep(0.0, lineWidthY, gridPos.y) *
              smoothstep(1.0, 1.0-lineWidthY, gridPos.y);

  // Apply lines only to visible cells
  if (line < 0.5 && isVisible > 0.5) color = black;
  
  gl_FragColor = vec4(color, 1.0);
}