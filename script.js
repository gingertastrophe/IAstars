let stars = [];
const NUM_STARS = 1200;
const MAX_CONNECTIONS = 3;
const MAX_CONNECTION_DISTANCE = 200;
const ROTATION_SPEED = 0.0001;
const STAR_SPEED_FACTOR = 0.00015;
const NEON_COLORS = [
    [255, 0, 128],    // Hot Pink
    [0, 255, 255],    // Cyan
    [255, 0, 255],    // Magenta
    [128, 255, 0],    // Lime
    [0, 191, 255]     // Deep Sky Blue
];
const CURSOR_POINTS = 12;
const CURSOR_RADIUS = 15;
const CURSOR_ROTATION_SPEED = 0.02;
let cursorAngle = 0;

function drawCursor(x, y) {
    push();
    translate(x, y);
    rotate(cursorAngle);
    noFill();
    strokeWeight(1);
    
    // Draw multiple rotating circles at different angles
    for (let i = 0; i < 3; i++) {
        stroke(255, 100);
        rotate(PI / 4);
        beginShape();
        for (let j = 0; j < CURSOR_POINTS; j++) {
            let angle = map(j, 0, CURSOR_POINTS, 0, TWO_PI);
            let r = CURSOR_RADIUS * (0.8 + 0.2 * sin(angle * 2 + frameCount * 0.1));
            let px = cos(angle) * r;
            let py = sin(angle) * r * 0.5; // Squash for 3D effect
            vertex(px, py);
        }
        endShape(CLOSE);
    }
    pop();
    
    cursorAngle += CURSOR_ROTATION_SPEED;
}

class Star {
    constructor(x, y, z) {
        this.pos = createVector(x, y, z);
        this.radius = random(1, 3);
        this.brightness = random(100, 255);
        this.twinkleSpeed = random(0.02, 0.05);
        this.twinklePhase = random(TWO_PI);
        this.speed = random(2, 4) * STAR_SPEED_FACTOR * width;
        this.activeConnections = [];
        this.connectionComplete = false;
        this.spikes = random(4, 6);
        this.spikeLength = random(0.5, 1.5);
    }

    update() {
        this.pos.x -= this.speed;
        
        if (this.pos.x < 0) {
            this.pos.x = width;
        }
        
        this.twinklePhase += this.twinkleSpeed;
        this.currentBrightness = this.brightness * (0.7 + 0.3 * sin(this.twinklePhase));
        
        this.activeConnections = this.activeConnections.filter(conn => {
            conn.progress += 0.02;
            if (conn.progress >= 1) {
                if (!conn.target.connectionComplete) {
                    conn.target.initiateConnections();
                }
            }
            return conn.progress < 1.2;
        });
    }

    show() {
        push();
        translate(this.pos.x, this.pos.y);
        noStroke();
        fill(255, this.currentBrightness);
        
        beginShape();
        for (let i = 0; i < this.spikes * 2; i++) {
            let angle = map(i, 0, this.spikes * 2, 0, TWO_PI);
            let r = i % 2 === 0 ? this.radius : this.radius * this.spikeLength;
            let x = cos(angle) * r;
            let y = sin(angle) * r;
            vertex(x, y);
        }
        endShape(CLOSE);
        pop();

        this.activeConnections.forEach(conn => {
            let [r, g, b] = conn.color || [255, 255, 255];
            stroke(r, g, b, map(conn.progress, 0, 1.2, 255, 0));
            strokeWeight(0.5);
            
            let dx = conn.target.pos.x - this.pos.x;
            let wrappedDx = dx;
            if (abs(dx) > width/2) {
                wrappedDx = dx > 0 ? dx - width : dx + width;
            }
            
            let endX = this.pos.x + wrappedDx * conn.progress;
            let endY = lerp(this.pos.y, conn.target.pos.y, conn.progress);
            
            if (endX < 0) endX += width;
            if (endX > width) endX -= width;
            
            line(this.pos.x, this.pos.y, endX, endY);
        });
    }

    initiateConnections() {
        this.connectionComplete = true;
        let nearbyStars = this.findNearestStars(3);
        nearbyStars.forEach(star => {
            this.activeConnections.push({
                target: star,
                progress: 0,
                color: random() < 0.25 ? random(NEON_COLORS) : [255, 255, 255]
            });
        });
    }

    findNearestStars(count) {
        let distances = stars
            .filter(s => s !== this && !s.connectionComplete)
            .map(s => ({
                star: s,
                dist: dist(this.pos.x, this.pos.y, s.pos.x, s.pos.y)
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, count);
        return distances.map(d => d.star);
    }
}

function setup() {
    pixelDensity(1);
    let canvas = createCanvas(max(windowWidth, 7000), windowHeight);
    canvas.style('display', 'block');
    noCursor();
    
    // Create stars distributed across the entire viewport
    for (let i = 0; i < NUM_STARS; i++) {
        let x = random(width);
        let y = random(height * 0.05, height * 0.95);
        let z = random(-100, 100);
        stars.push(new Star(x, y, z));
    }
}

function windowResized() {
    resizeCanvas(max(windowWidth, 7000), windowHeight);
    // Redistribute stars if needed
    if (stars.length > 0) {
        stars.forEach(star => {
            if (star.pos.y > height) {
                star.pos.y = random(height * 0.05, height * 0.95);
            }
        });
    }
}

function draw() {
    background(0);
    
    // Update and show all stars
    stars.forEach(star => {
        star.update();
        star.show();
    });

    drawCursor(mouseX, mouseY);
}

function mousePressed() {
    let closestStar = null;
    let closestDist = Infinity;
    
    stars.forEach(star => {
        let d = dist(mouseX, mouseY, star.pos.x, star.pos.y);
        if (d < 50 && d < closestDist) {
            closestDist = d;
            closestStar = star;
        }
    });

    if (closestStar) {
        // Reset all stars' connection status
        stars.forEach(star => {
            star.connectionComplete = false;
            star.activeConnections = [];
        });
        closestStar.initiateConnections();
    }
}

function calculateStarDensity() {
    const totalArea = windowWidth * windowHeight;
    const baseStars = 300; // Original number for 1920x1080
    const baseArea = 1920 * 1080;
    return Math.floor((totalArea / baseArea) * baseStars);
}
