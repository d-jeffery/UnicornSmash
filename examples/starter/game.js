/*
    Unicorn Smash
    - Whac-a-mole style arcade game built with LittleJS
*/

'use strict';

const STATE_TITLE = 0;
const STATE_GAME = 1;
let gameState = STATE_TITLE;

// 3x3 grid of holes, spaced out in world space
const holeSpacing = 2.2;
const holeRadius = .9;
const unicornRadius = .8;
const gridPositions = [];
for (let row = -1; row <= 1; ++row)
for (let col = -1; col <= 1; ++col)
    gridPositions.push(vec2(col*holeSpacing, row*holeSpacing));

let activeHole = 0;    // index of the hole the unicorn currently occupies
let switchTimer;       // time left before the unicorn moves to a new hole
let hitCount = 0;
let missCount = 0;
let sndHit, sndMiss;

// camera shake on hit
const shakeTime = .3;
const shakeMagnitude = .5;
let shakeTimer = new Timer;

// colors
const colorSky   = new Color(.85, .75, 1);
const colorHole  = new Color(.3, .18, .12);
const colorBody  = new Color(1, 1, 1);
const colorMane  = new Color(1, .55, .85);
const colorHorn  = new Color(1, .85, .2);

function pickNewHole()
{
    let i;
    do { i = randInt(gridPositions.length); } while (i === activeHole);
    activeHole = i;
    switchTimer.set(rand(1.3, .7));
}

// camera shake and a burst of rainbow particles at the given world position
function hitEffect(pos)
{
    shakeTimer.set(shakeTime);

    // note: velocity here is applied directly to position each frame (not
    // scaled by delta time), so speed/angleSpeed are tiny "per frame" values
    const emitter = new ParticleEmitter(
        pos, 0,               // pos, angle
        .4, .12, 250, PI,     // emitSize, emitTime, emitRate, emitConeAngle
        undefined,            // tileInfo (untextured, colored particles)
        new Color, new Color, new Color(1,1,1,0), new Color(1,1,1,0), // colors, overridden below
        .6, .3, .05, .2, .15, // particleTime, sizeStart, sizeEnd, speed, angleSpeed
        .9, 1, .6, PI, .3,    // damping, angleDamping, gravityScale, particleConeAngle, fadeRate
        .5, false, false, false // randomness, collideTiles, additive, randomColorLinear
    );
    // give each particle its own random hue for a rainbow burst, fading to transparent
    emitter.particleCreateCallback = p =>
    {
        p.colorStart = hsl(rand(1), 1, .6);
        p.colorEndDelta = new Color(0, 0, 0, -1);
    };
}

function startGame()
{
    hitCount = missCount = 0;
    switchTimer = new Timer;
    pickNewHole();
    gameState = STATE_GAME;
}

function gameInit()
{
    sndHit  = new Sound([1,,880,,.03,.08,1,2,,,300,.05]);
    sndMiss = new Sound([1,,150,,.02,.15,4,,,,,,,.5]);
    switchTimer = new Timer;
    setGravity(vec2(0, -.01)); // gentle fall for the hit particles
}

function gameUpdate()
{
    // fit the 3x3 grid to the screen, keeping it centered
    cameraPos = vec2();
    cameraScale = Math.min(mainCanvasSize.x, mainCanvasSize.y) / 7;

    // shake decays over shakeTime, strongest right after a hit
    if (shakeTimer.active())
    {
        const s = shakeMagnitude * (1 - shakeTimer.getPercent());
        cameraPos = cameraPos.add(vec2(rand(-s,s), rand(-s,s)));
    }

    if (gameState === STATE_TITLE)
    {
        if (mouseWasPressed(0))
            startGame();
        return;
    }

    if (switchTimer.elapsed())
        pickNewHole();

    if (mouseWasPressed(0))
    {
        const d = mousePos.subtract(gridPositions[activeHole]).length();
        if (d < unicornRadius)
        {
            ++hitCount;
            sndHit.play();
            hitEffect(gridPositions[activeHole]);
            pickNewHole();
        }
        else
        {
            ++missCount;
            sndMiss.play();
        }
    }
}

function gameUpdatePost()
{
}

function gameRender()
{
    // background covers the full screen each frame
    // useWebGL is forced false so this lands on the same canvas layer as the
    // holes and unicorn below it, drawn with drawCircle/drawPoly (canvas 2D
    // only) - the WebGL layer sits above that canvas and would paint over them
    drawRect(mainCanvasSize.scale(.5), mainCanvasSize, colorSky, 0, false, true);

    if (gameState === STATE_GAME)
    {
        for (const pos of gridPositions)
            drawCircle(pos, holeRadius, colorHole);

        // unicorn: body, mane and horn
        const p = gridPositions[activeHole];
        drawCircle(p, unicornRadius*.85, colorBody);
        drawCircle(p.add(vec2(.3, .2)), .35, colorMane);
        drawPoly([p.add(vec2(-.15,.5)), p.add(vec2(.15,.5)), p.add(vec2(0,1.1))], colorHorn);
    }
}

function gameRenderPost()
{
    overlayContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    if (gameState === STATE_TITLE)
    {
        drawTextScreen('Unicorn Smash', mainCanvasSize.scale(.5).add(vec2(0,-30)), 80, new Color(.6,.2,.6));
        drawTextScreen('Click to Play', mainCanvasSize.scale(.5).add(vec2(0,50)), 30, new Color(.2,.1,.2));
        return;
    }

    drawTextScreen(`Hits: ${hitCount}   Misses: ${missCount}`, vec2(mainCanvasSize.x/2, 36), 32, new Color(.2,.1,.2));
}

///////////////////////////////////////////////////////////////////////////////
// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
