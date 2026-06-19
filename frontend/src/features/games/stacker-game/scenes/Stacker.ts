// @ts-nocheck
import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() { super('boot'); }
    init() {
        const element = document.createElement('style');
        document.head.appendChild(element);
        element.sheet.insertRule('@font-face { font-family: "bebas"; src: url("/assets/fonts/ttf/bebas.ttf") format("truetype"); }', 0);
    }
    preload() {
        this.load.image('grid', '/assets/skies/grid.png');
        this.load.image('bg', '/assets/skies/gradient26.png');
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
        this.load.audio('place', ['/assets/audio/stacker/place.ogg', '/assets/audio/stacker/place.m4a']);
        this.load.audio('miss', ['/assets/audio/stacker/miss.ogg', '/assets/audio/stacker/miss.m4a']);
        this.load.audio('gamelost', ['/assets/audio/stacker/gamelost.ogg', '/assets/audio/stacker/gamelost.m4a']);
        this.load.audio('gamewon', ['/assets/audio/stacker/gamewon.ogg', '/assets/audio/stacker/gamewon.m4a']);
    }
    create() {
        const scene = this.scene;
        if (typeof window.WebFont !== 'undefined') {
            window.WebFont.load({
                custom: { families: ['bebas'] },
                active: () => scene.start('instructions'),
                inactive: () => scene.start('instructions'),
            });
        } else {
            scene.start('instructions');
        }
    }
}

export class Instructions extends Phaser.Scene {
    constructor() { super('instructions'); }
    create() {
        this.add.image(512, 384, 'bg').setDisplaySize(1024, 768);
        this.add.image(512, 540, 'grid').setDisplaySize(1024, 450);
        this.add.text(880, 50, 'S\n t\na\n c\nk\n e\nr', { fontFamily: 'bebas', fontSize: 74, color: '#ffffff', lineSpacing: -10 }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(100, 80, 'Instrucciones', { fontFamily: 'bebas', fontSize: 70, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true);
        const help = [
            'Construye una torre hasta la parte superior de la pantalla.',
            'Alinea las filas de bloques. ¡Cuidado: se vuelve mas rapido,',
            'pierdes bloques si no aciertas perfectamente,',
            'pero puedes salvarlos y mantener tu tamano respondiendo preguntas!',
        ];
        this.add.text(100, 240, help, { fontFamily: 'bebas', fontSize: 28, color: '#ffffff', lineSpacing: 8 }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(100, 580, 'Barra Espaciadora o Clic para colocar una fila', { fontFamily: 'bebas', fontSize: 32, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true);
        this.input.keyboard.once('keydown-SPACE', this.start, this);
        this.input.once('pointerdown', this.start, this);
    }
    start() { this.scene.start('game'); }
}

export class StackerGame extends Phaser.Scene {
    constructor() {
        super('game');
        this.grid = null;
        this.gridWidth = 7;
        this.gridHeight = 15;
        this.gridSize = 40;
        this.block1 = null;
        this.block2 = null;
        this.block3 = null;
        this.speed = 250;
        this.direction = 0;
        this.currentY = 0;
        this.timer = null;
        this.offset = { x: 372, y: 84 };
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.questions = [];
        this.questionOverlayObjects = [];
        this.placedBlocks = [];
        this.score = 0;
        this.scoreText = null;
        this.levelText = null;
        this.level = 1;
    }
    init() {
        this.grid = [];
        this.speed = 250;
        this.direction = 0;
        this.currentY = this.gridHeight;
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.questionOverlayObjects = [];
        this.placedBlocks = [];
        this.score = 0;
        this.level = 1;
    }
    create() {
        const ox = this.offset.x;
        const oy = this.offset.y;
        const gw = this.gridWidth;
        const gh = this.gridHeight;
        const size = this.gridSize;
        const rows = [15,14,13,12,11,10,9,8,7,6,5,4,3,2,1];
        const prizes = ['Major Prize!', '', '' ,'' ,'', 'Minor Prize', '', '' ,'' ,'', 'Bonus'];
        this.add.image(512, 384, 'bg').setDisplaySize(1024, 768);
        this.add.image(512, 540, 'grid').setDisplaySize(1024, 450);
        this.add.text(720, 0, 'S\n t\na\n c\nk\n e\nr', { fontFamily: 'bebas', fontSize: 74, color: '#ffffff', lineSpacing: -10 }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(ox - 32, oy, rows, { fontFamily: 'bebas', fontSize: 26, color: '#ffffff', align: 'right' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(ox + (gw * size) + size/2, oy, prizes, { fontFamily: 'bebas', fontSize: 26, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.grid(ox, oy, gw * size, gh * size, size, size, 0x999999, 1, 0x666666).setOrigin(0);
        
        this.scoreText = this.add.text(20, 20, 'PUNTOS: 0', { fontFamily: 'bebas', fontSize: 36, color: '#22c55e' }).setShadow(2, 2, '#333333', 2, false, true);
        this.levelText = this.add.text(20, 70, 'NIVEL: 1', { fontFamily: 'bebas', fontSize: 36, color: '#ffd700' }).setShadow(2, 2, '#333333', 2, false, true);
        
        this.questions = this.registry.get('preguntasDelNivel') || [];
        this.events.once('shutdown', () => {
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.questionOverlayObjects = [];
        });

        this.block1 = this.add.rectangle(ox + size * 2, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0);
        this.block2 = this.add.rectangle(ox + size * 3, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0);
        this.block3 = this.add.rectangle(ox + size * 4, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0);
        for (let y = 0; y < gh; y++) this.grid.push([0,0,0,0,0,0,0]);
        
        this.timer = this.time.addEvent({ delay: this.speed, callback: this.moveBlocks, callbackScope: this, loop: true });
        
        this.input.keyboard.on('keydown-SPACE', this.drop, this);
        this.input.on('pointerdown', this.drop, this);
    }
    getGridX(block) { return (block.x - this.offset.x) / this.gridSize; }
    hasBlockBelow(block) { return (block && this.grid[this.currentY][this.getGridX(block)]); }
    totalBlocks() {
        let total = 0;
        if (this.block1) total++;
        if (this.block2) total++;
        if (this.block3) total++;
        return total;
    }
    moveBlocks() {
        if (this.isQuestionMode) return;
        const size = this.gridSize;
        const gw = this.gridWidth;
        if (this.direction === 0) {
            if (this.block1) { this.block1.x += size; if (this.getGridX(this.block1) === gw - 1) this.direction = 1; }
            if (this.block2) { this.block2.x += size; if (this.getGridX(this.block2) === gw - 1) this.direction = 1; }
            if (this.block3) { this.block3.x += size; if (this.getGridX(this.block3) === gw - 1) this.direction = 1; }
        } else {
            if (this.block1) { this.block1.x -= size; if (this.getGridX(this.block1) === 0) this.direction = 0; }
            if (this.block2) { this.block2.x -= size; if (this.getGridX(this.block2) === 0) this.direction = 0; }
            if (this.block3) { this.block3.x -= size; if (this.getGridX(this.block3) === 0) this.direction = 0; }
        }
    }
    drop() {
        if (this.isQuestionMode || this.modalLocked) return;
        if (this.timer) this.timer.remove(false);
        
        const pos1 = this.block1 ? this.getGridX(this.block1) : -1;
        const pos2 = this.block2 ? this.getGridX(this.block2) : -1;
        const pos3 = this.block3 ? this.getGridX(this.block3) : -1;
        const mapY = this.currentY - 1;

        if (this.currentY === this.gridHeight) {
            this.grid[mapY][pos1] = 1; this.grid[mapY][pos2] = 1; this.grid[mapY][pos3] = 1;
            
            this.score += 10;
            this.scoreText.setText('PUNTOS: ' + this.score);
            this.showFloatingText('+10', 400, 300);

            if (this.block1) this.placedBlocks.push(this.block1);
            if (this.block2) this.placedBlocks.push(this.block2);
            if (this.block3) this.placedBlocks.push(this.block3);

            this.sound.play('place'); this.nextRow();
        } else {
            const b1Active = !!this.block1;
            const b2Active = !!this.block2;
            const b3Active = !!this.block3;
            
            const b1Fits = b1Active ? this.hasBlockBelow(this.block1) : false;
            const b2Fits = b2Active ? this.hasBlockBelow(this.block2) : false;
            const b3Fits = b3Active ? this.hasBlockBelow(this.block3) : false;

            const droppedOne = (b1Active && !b1Fits) || (b2Active && !b2Fits) || (b3Active && !b3Fits);
            const totalFits = (b1Fits ? 1 : 0) + (b2Fits ? 1 : 0) + (b3Fits ? 1 : 0);
            const wouldGameOver = (totalFits === 0);

            if (droppedOne || wouldGameOver) {
                this.score = Math.max(0, this.score - 5);
                this.scoreText.setText('PUNTOS: ' + this.score);
                this.showFloatingText('-5', 400, 300, '#ef4444');

                this.isQuestionMode = true;
                this.triggerSalvationQuiz(wouldGameOver, () => {
                    this.alignBlocksToGridBelow(mapY, b1Active, b2Active, b3Active);
                    
                    this.score += 10;
                    this.scoreText.setText('PUNTOS: ' + this.score);
                    this.showFloatingText('+10', 400, 300);

                    if (this.block1) this.placedBlocks.push(this.block1);
                    if (this.block2) this.placedBlocks.push(this.block2);
                    if (this.block3) this.placedBlocks.push(this.block3);

                    this.sound.play('place');
                    if (this.currentY === 1) {
                        this.handleWinTransition();
                    } else {
                        this.nextRow();
                    }
                }, () => {
                    if (wouldGameOver) {
                        this.gameOver();
                    } else {
                        if (this.block1) { if (b1Fits) { this.grid[mapY][pos1] = 1; this.placedBlocks.push(this.block1); } else { this.block1.visible = false; this.block1 = null; } }
                        if (this.block2) { if (b2Fits) { this.grid[mapY][pos2] = 1; this.placedBlocks.push(this.block2); } else { this.block2.visible = false; this.block2 = null; } }
                        if (this.block3) { if (b3Fits) { this.grid[mapY][pos3] = 1; this.placedBlocks.push(this.block3); } else { this.block3.visible = false; this.block3 = null; } }
                        
                        this.sound.play('miss');
                        if (this.currentY === 1) {
                            this.currentY--;
                            this.gameOver();
                        } else {
                            this.nextRow();
                        }
                    }
                });
            } else {
                this.score += 10;
                this.scoreText.setText('PUNTOS: ' + this.score);
                this.showFloatingText('+10', 400, 300);

                if (this.block1) { this.grid[mapY][pos1] = 1; this.placedBlocks.push(this.block1); }
                if (this.block2) { this.grid[mapY][pos2] = 1; this.placedBlocks.push(this.block2); }
                if (this.block3) { this.grid[mapY][pos3] = 1; this.placedBlocks.push(this.block3); }
                
                if (this.currentY === 1) {
                    this.handleWinTransition();
                } else {
                    this.sound.play('place');
                    this.nextRow();
                }
            }
        }
    }

    alignBlocksToGridBelow(mapY, b1, b2, b3) {
        const rowBelow = this.grid[this.currentY];
        const validXIndices = [];
        for (let x = 0; x < this.gridWidth; x++) {
            if (rowBelow[x] === 1) validXIndices.push(x);
        }

        // Place our active blocks on those valid indices
        let placedCount = 0;
        const size = this.gridSize;
        const ox = this.offset.x;

        if (b1 && placedCount < validXIndices.length) {
            const gx = validXIndices[placedCount++];
            this.block1.x = ox + gx * size;
            this.grid[mapY][gx] = 1;
        } else if (b1) {
            this.block1.visible = false;
            this.block1 = null;
        }

        if (b2 && placedCount < validXIndices.length) {
            const gx = validXIndices[placedCount++];
            this.block2.x = ox + gx * size;
            this.grid[mapY][gx] = 1;
        } else if (b2) {
            this.block2.visible = false;
            this.block2 = null;
        }

        if (b3 && placedCount < validXIndices.length) {
            const gx = validXIndices[placedCount++];
            this.block3.x = ox + gx * size;
            this.grid[mapY][gx] = 1;
        } else if (b3) {
            this.block3.visible = false;
            this.block3 = null;
        }
    }

    nextRow() {
        this.currentY--;
        
        // Milestone verification at Row 5 (currentY === 10) and Row 10 (currentY === 5)
        if (this.currentY === 10 || this.currentY === 5) {
            this.isQuestionMode = true;
            this.triggerMilestoneQuiz(this.currentY === 10 ? 5 : 10, () => {
                // Correct: maintain size, do NOT shrink blocks! We just increase speed.
                this.speed = Math.max(50, this.speed - ((this.currentY === 10) ? 100 : 50));
                this.spawnNextRowBlocks();
            }, () => {
                // Incorrect: normal shrinkage and lose 5 points!
                this.score = Math.max(0, this.score - 5);
                this.scoreText.setText('PUNTOS: ' + this.score);
                this.showFloatingText('-5', 400, 300, '#ef4444');
                this.speed = Math.max(50, this.speed - ((this.currentY === 10) ? 100 : 50));
                if (this.currentY === 10 && this.totalBlocks() === 3) this.block1 = null;
                else if (this.currentY === 5 && this.totalBlocks() === 2) {
                    if ((this.block1 && this.block2) || (this.block1 && this.block3)) this.block1 = null;
                    else this.block2 = null;
                }
                this.spawnNextRowBlocks();
            });
        } else {
            this.spawnNextRowBlocks();
        }
    }

    spawnNextRowBlocks() {
        let side = 0; const size = this.gridSize; let shift = size;
        const ox = this.offset.x; const oy = this.offset.y;
        if (Math.random() >= 0.5) { this.direction = 1; side = (this.gridWidth - 1) * size; shift = -size; }
        else this.direction = 0;
        
        if (this.block1) { this.block1 = this.add.rectangle(ox + side, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0); side += shift; }
        if (this.block2) { this.block2 = this.add.rectangle(ox + side, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0); side += shift; }
        if (this.block3) { this.block3 = this.add.rectangle(ox + side, oy + (this.currentY - 1) * size, size - 1, size - 1, 0x99ffff).setOrigin(0); }
        
        this.isQuestionMode = false;
        this.timer = this.time.addEvent({ delay: this.speed, callback: this.moveBlocks, callbackScope: this, loop: true });
    }

    triggerSalvationQuiz(wouldGameOver, onCorrect, onIncorrect) {
        const fallbacks = [
            { q: "¿Qué palabra está escrita correctamente?", options: ["haber", "aver", "aberr", "havia"], answer: 0 },
            { q: "Sinónimo de 'rápido':", options: ["lento", "veloz", "pesado", "quieto"], answer: 1 },
            { q: "El sujeto en 'El tren llegó tarde' es:", options: ["El tren", "llegó", "tarde", "no hay"], answer: 0 }
        ];
        const source = this.questions.length > 0 ? this.questions : fallbacks;
        const qData = Phaser.Utils.Array.GetRandom(source);

        this.showQuizOverlay("¡COMODÍN ORTOGRÁFICO!", "¡Responde bien para recuperar tu bloque!", qData, onCorrect, onIncorrect);
    }

    triggerMilestoneQuiz(rowNum, onCorrect, onIncorrect) {
        const fallbacks = [
            { q: "Completa la oración: 'Ella ___ una gran idea.'", options: ["tuvo", "tubo", "tumbo", "tubo'"], answer: 0 },
            { q: "Identifica el adjetivo en 'La manzana roja':", options: ["manzana", "roja", "La", "no hay"], answer: 1 },
            { q: "¿Cuál es el antónimo de 'limpio'?", options: ["sucio", "aseado", "brillante", "nuevo"], answer: 0 }
        ];
        const source = this.questions.length > 0 ? this.questions : fallbacks;
        const qData = Phaser.Utils.Array.GetRandom(source);

        this.showQuizOverlay(`¡RETO FILA ${rowNum}!`, "¡Responde bien para evitar que se achiquen tus bloques!", qData, onCorrect, onIncorrect);
    }

    showQuizOverlay(title, subtitle, qData, onCorrect, onIncorrect) {
        if (this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        const cx = 512;
        const cy = 384;

        const overlay = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.85).setDepth(200).setInteractive();
        this.questionOverlayObjects.push(overlay);

        const titleTxt = this.add.text(cx, cy - 220, title, {
            fontFamily: 'monospace', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(titleTxt);

        const subTxt = this.add.text(cx, cy - 170, subtitle, {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffd700'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(subTxt);

        const questionTxt = this.add.text(cx, cy - 80, qData.q, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 800 }, align: 'center'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(questionTxt);

        const options = [...qData.options];
        const correctString = options[qData.answer];
        Phaser.Utils.Array.Shuffle(options);
        const correctIdx = options.indexOf(correctString);

        const btnW = 420, btnH = 120, gapX = 40, gapY = 25;
        const gridX = cx - btnW - gapX / 2, gridY = cy + 20;

        options.forEach((option, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const bx = gridX + col * (btnW + gapX), by = gridY + row * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(201);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', wordWrap: { width: btnW - 30 }, align: 'center'
            }).setOrigin(0.5).setDepth(202);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
                .setDepth(203).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => {
                this.questionOverlayObjects.forEach(obj => { if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive(); });

                const correct = i === correctIdx;
                if (qData && qData.id) {
                    window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: qData.id, correct } }));
                }
                btnGfx.clear();
                btnGfx.fillStyle(correct ? 0x166534 : 0x7f1d1d, 0.95);
                btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
                btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
                btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

                const feedbackText = this.add.text(cx, cy + 300, correct ? '¡CORRECTO!' : 'INCORRECTO', {
                    fontFamily: 'monospace', fontSize: '32px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
                }).setOrigin(0.5).setDepth(202);
                this.questionOverlayObjects.push(feedbackText);

                this.time.delayedCall(1600, () => {
                    this.questionOverlayObjects.forEach(o => o.destroy());
                    this.questionOverlayObjects = [];
                    this.modalLocked = false;
                    
                    if (correct) {
                        onCorrect();
                    } else {
                        onIncorrect();
                    }
                });
            });
        });
    }

    showFloatingText(text, x, y, color = '#22c55e', fontSize = 24) {
        const txt = this.add.text(x, y, text, {
            fontFamily: 'bebas', fontSize: fontSize, color: color
        }).setOrigin(0.5).setDepth(20).setShadow(2, 2, '#333333', 2, false, true);

        this.tweens.add({
            targets: txt,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => txt.destroy()
        });
    }

    handleWinTransition() {
        this.sound.play('gamewon');
        this.score += 100; // Big bonus for completing the tower
        this.scoreText.setText('PUNTOS: ' + this.score);
        this.showFloatingText('+100 TOWER BONUS!', 400, 200, '#eab308', 32);

        this.level++;
        this.levelText.setText('NIVEL: ' + this.level);
        this.speed = Math.max(50, Math.floor(this.speed * 0.85));

        // Find the block objects that are at the top (mapY === 0, y ~ offset.y)
        const winBlocks = [];
        const otherBlocks = [];
        const topY = this.offset.y;
        
        if (this.block1) this.placedBlocks.push(this.block1);
        if (this.block2) this.placedBlocks.push(this.block2);
        if (this.block3) this.placedBlocks.push(this.block3);

        this.placedBlocks.forEach(block => {
            if (block && block.y !== undefined && Math.abs(block.y - topY) < 5) {
                winBlocks.push(block);
            } else if (block && block.destroy) {
                otherBlocks.push(block);
            }
        });

        // Destroy all other blocks to clear the tower visually
        otherBlocks.forEach(b => b.destroy());

        // Move winBlocks to the bottom row
        const bottomY = this.offset.y + (this.gridHeight - 1) * this.gridSize;
        winBlocks.forEach(block => {
            block.y = bottomY;
            block.setFillStyle(0xeab308); // Golden color for victory blocks
        });

        // Clear grid and populate bottom row
        this.grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid.push([0, 0, 0, 0, 0, 0, 0]);
        }
        
        winBlocks.forEach(block => {
            const gx = Math.round((block.x - this.offset.x) / this.gridSize);
            if (gx >= 0 && gx < this.gridWidth) {
                this.grid[this.gridHeight - 1][gx] = 1;
            }
        });

        this.placedBlocks = winBlocks;

        const b1Active = !!this.block1;
        const b2Active = !!this.block2;
        const b3Active = !!this.block3;

        this.currentY = 14;
        this.isQuestionMode = true; // Pause movement
        
        this.time.delayedCall(1500, () => {
            this.block1 = b1Active ? {} : null;
            this.block2 = b2Active ? {} : null;
            this.block3 = b3Active ? {} : null;
            this.spawnNextRowBlocks();
        });
    }

    gameOver() {
        this.timer.remove(false);
        this.input.keyboard.off('keydown-SPACE', this.drop);
        this.input.off('pointerdown', this.drop);
        this.registry.set('score', this.score); // Save custom score
        this.scene.pause();
        this.scene.run('gameOver');
    }
}

export class GameOver extends Phaser.Scene {
    constructor() { super('gameOver'); }
    create() {
        this.add.rectangle(512, 384, 800, 600, 0x000000, 0.7);
        const list = ['Tiny Bonus:', '', 'Minor Prize:', '', 'Major Prize:'];
        const prizes1 = ['Un pez de colores', 'Medio sandwich', 'Un chicle gigante', 'Stickers retro', 'Un trompo de madera'];
        const prizes2 = ['Stickers de Mario', 'SNES Joypad', 'Capa de Superman', 'Maquina burbujas', 'Skateboard'];
        const prizes3 = ['Playstation 5', 'Una Tardis', 'Un X-Wing', 'Maquina de Arcade', 'Huevo de Dragon'];
        const score = this.registry.get('score');
        const prizelist = [
            'Nada (Completa 5 filas)', '',
            'Nada (Completa 10 filas)', '',
            'Nada (Completa 15 filas)',
        ];
        let title = 'GAME OVER!';
        // Fallback prize checks (using estimation of completed rows based on score threshold if necessary, or just keep it)
        const estRows = Math.floor(score / 10);
        if (estRows >= 5 || score >= 50) prizelist[0] = Phaser.Utils.Array.GetRandom(prizes1);
        if (estRows >= 10 || score >= 100) prizelist[2] = Phaser.Utils.Array.GetRandom(prizes2);
        if (estRows >= 15 || score >= 150) { prizelist[4] = Phaser.Utils.Array.GetRandom(prizes3); title = '¡GANASTE!'; }
        if (score < 50) this.sound.play('gamelost'); else this.sound.play('gamewon');
        
        this.add.text(512, 160, title, { fontFamily: 'bebas', fontSize: 80, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        this.add.text(512, 230, `PUNTAJE FINAL: ${score} PUNTOS`, { fontFamily: 'bebas', fontSize: 32, color: '#22c55e' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        this.add.text(512, 300, 'Premio obtenido:', { fontFamily: 'bebas', fontSize: 26, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        this.add.text(200, 360, list, { fontFamily: 'bebas', fontSize: 26, color: '#ffffff', align: 'right' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(370, 360, prizelist, { fontFamily: 'bebas', fontSize: 26, color: '#ffff00' }).setShadow(2, 2, '#333333', 2, false, true);
        this.add.text(512, 600, 'Espacio o Clic para volver a intentar', { fontFamily: 'bebas', fontSize: 26, color: '#ffffff' }).setShadow(2, 2, '#333333', 2, false, true).setOrigin(0.5);
        
        this.input.keyboard.once('keydown-SPACE', this.restart, this);
        this.input.once('pointerdown', this.restart, this);
    }
    restart() { this.scene.stop(); this.scene.start('game'); }
}
