import { Midi } from '@tonejs/midi';

const audio = new URL("@audio/rectangles-no-9.ogg", import.meta.url).href;
const midi = new URL("@audio/rectangles-no-9.mid", import.meta.url).href;
const vertShaderPath = new URL("@shaders/mondrian.vert", import.meta.url).href;
const fragShaderPath = new URL("@shaders/mondrian.frag", import.meta.url).href;

const RectanglesNo8 = (p) => {
    p.song = null;

    p.audioLoaded = false; 

    p.songHasFinished = false;

    p.mondrianShader  = null;
    

    p.preload = () => {
        p.song = p.loadSound(audio, p.loadMidi);
        p.song.onended(() => p.songHasFinished = true);

        p.mondrianShader  = p.loadShader(vertShaderPath, fragShaderPath);
    };

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
        p.colorMode(p.HSB);
        p.background(0);
        p.pixelDensity(1);

        p.randomSeed = Math.random() * 1000;
    };

    p.draw = () => {
        p.shader(p.mondrianShader );
            
        // Pass uniforms to shader
        p.mondrianShader .setUniform('u_resolution', [p.width, p.height]);
        p.mondrianShader .setUniform('u_time', p.millis() / 1000.0);
        p.mondrianShader.setUniform('u_randomSeed', p.randomSeed);
        
        // Draw fullscreen quad
        p.rect(0, 0, p.width, p.height);
        
        if(p.audioLoaded && p.song.isPlaying() || p.songHasFinished){
            p.background(0);


        }
    }

    p.loadMidi = () => {
        Midi.fromUrl(midi).then((result) => {
            const noteSet1 = result.tracks[5].notes; // Synth 1
            const noteSet2 = result.tracks[1].notes; // Sampler 2
            p.scheduleCueSet(noteSet1, 'executeCueSet1', true);
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

    p.executeCueSet1 = (note) => {
   
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

export default RectanglesNo8;
