import { Midi } from '@tonejs/midi';

const audio = new URL("@audio/rectangles-no-9.ogg", import.meta.url).href;
const midi = new URL("@audio/rectangles-no-9.mid", import.meta.url).href;
const vertShaderPath = new URL("@shaders/mondrian.vert", import.meta.url).href;
const fragShaderPath = new URL("@shaders/mondrian.frag", import.meta.url).href;

const RectanglesNo9 = (p) => {
     /** 
     * Core audio properties
     */
    p.song = null;
    p.PPQ = 3840 * 4;
    p.bpm = 96;
    p.audioLoaded = false;
    p.songHasFinished = false;

    p.mondrianShader  = null;
    
    p.gridCols = 4.0;
    p.gridRows = 5.0;
    p.maxFadeDelay = 0;
    p.shaderRetriggerTime = 0.0;
    p.totalCells = p.gridCols * p.gridRows;
    
    p.currentCue = 1;
    p.barStartCue = 1;
    p.cuesInBar = 11;
    
    // Pure p5.js cell tracking
    p.cells = [];
    p.revealedCells = [];
    p.cellColors = [];
    
    // Mondrian colors
    p.colors = {
        white: [245, 245, 245],
        black: [0, 0, 0], 
        red: [237, 28, 36],
        blue: [0, 89, 150],
        yellow: [247, 217, 77]
    };

    p.preload = () => {
        p.song = p.loadSound(audio, p.loadMidi);
        p.song.onended(() => p.songHasFinished = true);

        p.mondrianShader  = p.loadShader(vertShaderPath, fragShaderPath);
    };

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.RGB);
        p.background(0);
        p.pixelDensity(1);

        p.randomSeed = Math.random() * 1000;
        
        // Initialize the grid on startup
        p.initializeGrid();
    };

    p.draw = () => {
        p.background(0);
        
        if (p.cells.length === 0) return;
        
        // Calculate cell dimensions
        const cellWidth = p.width / p.gridCols;
        const cellHeight = p.height / p.gridRows;
        
        // Draw grid cells
        for (let row = 0; row < p.gridRows; row++) {
            for (let col = 0; col < p.gridCols; col++) {
                const cellIndex = row * p.gridCols + col;
                
                // Only draw if cell is revealed
                if (p.revealedCells.includes(cellIndex)) {
                    const color = p.cellColors[cellIndex];
                    p.fill(color[0], color[1], color[2]);
                    p.noStroke();
                    p.rect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
                }
            }
        }
        
        // Draw grid lines
        p.stroke(0);
        p.strokeWeight(3);
        for (let i = 0; i <= p.gridCols; i++) {
            p.line(i * cellWidth, 0, i * cellWidth, p.height);
        }
        for (let i = 0; i <= p.gridRows; i++) {
            p.line(0, i * cellHeight, p.width, i * cellHeight);
        }
    }

    p.loadMidi = () => {
        Midi.fromUrl(midi).then((result) => {
            console.log(result);
            const noteSet1 = result.tracks[5].notes; // Rodent Lead
            const noteSet2 = result.tracks[1].notes; // Sampler 2
            p.scheduleCueSet(noteSet1, 'executeCueSet1');
            p.scheduleCueSet(noteSet2, 'executeCueSet2');
            document.getElementById("loader").classList.add("loading--complete");
            document.getElementById('play-icon').classList.add('fade-in');
            p.audioLoaded = true;
        });
    };

    p.scheduleCueSet = (noteSet, callbackName, polyMode = false)  => {
        let lastTicks = -1, 
            currentCue = 1;
        for (let i = 0; i < noteSet.length; i++) {
            const note = noteSet[i],
                { ticks, time } = note;
            if(ticks !== lastTicks || polyMode){
                note.currentCue = currentCue;
                p.song.addCue(time, p[callbackName], note);
                lastTicks = ticks;
                currentCue++;
            }
        }
    } 

    p.initializeGrid = () => {
        p.cells = [];
        p.revealedCells = [];
        p.cellColors = [];
        
        const colorOptions = [p.colors.red, p.colors.blue, p.colors.yellow, p.colors.white];
        
        // Create cells with random colors
        for (let i = 0; i < p.totalCells; i++) {
            p.cells.push(i);
            p.cellColors.push(p.random(colorOptions));
        }
        
        // Shuffle cells for random reveal order
        p.cells = p.shuffle(p.cells);
        console.log('Grid initialized:', p.gridCols, 'x', p.gridRows, '=', p.totalCells, 'cells');
    };

    p.executeCueSet1 = (note) => {
        console.log(note.currentCue);
        console.log(note.midi);
        
        p.currentCue = note.currentCue;
        
        const barStartCues = [1, 13, 24, 36];
        
        // Only change grid at the beginning of each bar
        if (barStartCues.includes(note.currentCue)) {
            p.gridCols = Math.floor(p.random(4, 9));
            p.gridRows = Math.floor(p.random(4, 9));
            p.totalCells = p.gridCols * p.gridRows;
            
            // Set bar information
            p.barStartCue = note.currentCue;
            if (note.currentCue === 1 || note.currentCue === 13 || note.currentCue === 36) {
                p.cuesInBar = 11;
            } else if (note.currentCue === 24) {
                p.cuesInBar = 12;
            }
            
            // Initialize new grid and reveal first cell
            p.initializeGrid();
            p.revealedCells = [p.cells[0]];
            console.log('New bar started - revealed first cell');
        } else {
            // Reveal logic for subsequent cues
            const cuesElapsed = p.currentCue - p.barStartCue;
            const isLastCue = (cuesElapsed >= (p.cuesInBar - 1));
            
            if (isLastCue) {
                // Reveal all remaining cells
                p.revealedCells = [...p.cells];
                console.log('Last cue - revealed all cells:', p.revealedCells.length);
            } else {
                // Reveal one more cell
                const cellsToReveal = cuesElapsed + 1;
                p.revealedCells = p.cells.slice(0, cellsToReveal);
                console.log('Revealed', cellsToReveal, 'cells');
            }
        }
        
        // Calculate note duration in seconds
        const { currentCue, durationTicks } = note;
        const duration = (durationTicks / p.PPQ) * (60 / p.bpm);
        
        p.shaderRetriggerTime = p.millis() / 1000.0;
    }

    p.executeCueSet2 = (note) => {

    }


    p.mousePressed = () => {
        if(p.audioLoaded){
            if (p.song.isPlaying()) {
                p.song.pause();
            } else {
                if (parseInt(p.song.currentTime()) >= parseInt(p.song.buffer.duration)) {
                    p.reset();
                    if (typeof window.dataLayer !== typeof undefined){
                        window.dataLayer.push(
                            { 
                                'event': 'play-animation',
                                'animation': {
                                    'title': document.title,
                                    'location': window.location.href,
                                    'action': 'replaying'
                                }
                            }
                        );
                    }
                }
                document.getElementById("play-icon").classList.remove("fade-in");
                p.song.play();
                if (typeof window.dataLayer !== typeof undefined && !p.hasStarted){
                    window.dataLayer.push(
                        { 
                            'event': 'play-animation',
                            'animation': {
                                'title': document.title,
                                'location': window.location.href,
                                'action': 'start playing'
                            }
                        }
                    );
                }
            }
        }
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        
        // Update shader uniform with new dimensions
        if (p.mondrianShader) {
          p.mondrianShader.setUniform('u_resolution', [p.width, p.height]);
        }
    };
};

export default RectanglesNo9;
