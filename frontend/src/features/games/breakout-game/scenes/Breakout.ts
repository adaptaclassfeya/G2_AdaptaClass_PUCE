// @ts-nocheck
import Phaser from 'phaser';

export default class Breakout extends Phaser.Scene {
    private score: number = 0;
    private highscore: number = 0;
    private consecutiveHits: number = 1;
    private lives: number = 4;
    private isQuestionMode: boolean = false;
    private ballSpeedMultiplier: number = 1.0;
    private levelBreakout: number = 1;
    
    private bricks: Phaser.Physics.Arcade.StaticGroup | null = null;
    private paddle: Phaser.Physics.Arcade.Image | null = null;
    private ball: Phaser.Physics.Arcade.Image | null = null;
    
    private scoreText: Phaser.GameObjects.Text | null = null;
    private livesText: Phaser.GameObjects.Text | null = null;
    private multiplierText: Phaser.GameObjects.Text | null = null;
    private levelText: Phaser.GameObjects.Text | null = null;
    private wordQuestionText: Phaser.GameObjects.Text | null = null;
    
    private questions: any[] = [];
    private questionOverlayObjects: any[] = [];
    private modalLocked: boolean = false;
    private wordLabels: Phaser.GameObjects.Text[] = [];
    private currentWordQuestion: any = null;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
    
    // Default list of word bricks vocabulary questions
    private wordQuestionsList = [
        { q: "Encuentra el sustantivo:", options: ["perro", "correr", "rápido"], answer: 0 },
        { q: "Encuentra el verbo:", options: ["jauría", "perro", "correr"], answer: 2 },
        { q: "Encuentra el adjetivo:", options: ["limpio", "limpiar", "limpieza"], answer: 0 },
        { q: "Sinónimo de alegre:", options: ["triste", "feliz", "enojado"], answer: 1 },
        { q: "Antónimo de grande:", options: ["pequeño", "enorme", "gigante"], answer: 0 },
        { q: "Encuentra el pronombre:", options: ["yo", "casa", "bonito"], answer: 0 },
        { q: "Encuentra la palabra esdrújula:", options: ["árbol", "música", "canción"], answer: 1 }
    ];

    constructor() {
        super({ key: 'Breakout' });
    }

    preload() {
        this.load.atlas('assets', '/assets/games/breakout/breakout.png', '/assets/games/breakout/breakout.json');
    }

    create() {
        this.score = 0;
        this.consecutiveHits = 1;
        this.lives = 4;
        this.isQuestionMode = false;
        this.ballSpeedMultiplier = 1.0;
        this.levelBreakout = 1;
        this.questionOverlayObjects = [];
        this.modalLocked = false;
        this.wordLabels = [];

        this.events.once('shutdown', () => {
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.questionOverlayObjects = [];
        });
        
        this.questions = this.registry.get('preguntasDelNivel') || [];
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        }

        this.physics.world.setBoundsCollision(true, true, true, false);

        // Background / decorative layout
        this.add.rectangle(400, 300, 800, 600, 0x0f172a);
        
        this.bricks = this.physics.add.staticGroup({
            key: 'assets',
            frame: ['blue1', 'red1', 'green1', 'yellow1', 'silver1', 'purple1'],
            frameQuantity: 10,
            gridAlign: { width: 10, height: 6, cellWidth: 76, cellHeight: 38, x: 62, y: 150 },
        });

        // Scale each brick and refresh static physics body
        this.bricks.getChildren().forEach((brick: Phaser.Physics.Arcade.Image) => {
            brick.setScale(1.2);
            brick.body.setSize(brick.width * 1.2, brick.height * 1.2);
            brick.body.updateFromGameObject();
        });

        this.ball = this.physics.add.image(400, 500, 'assets', 'ball1').setCollideWorldBounds(true).setBounce(1).setScale(1.25);
        this.ball.setData('onPaddle', true);
        this.ball.body.setSize(this.ball.width * 1.25, this.ball.height * 1.25);
        this.ball.body.updateFromGameObject();

        this.paddle = this.physics.add.image(400, 550, 'assets', 'paddle1').setImmovable().setScale(1.25);
        this.paddle.body.setSize(this.paddle.width * 1.25, this.paddle.height * 1.25);
        this.paddle.body.updateFromGameObject();

        this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);
        this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);

        // HUD Text elements
        this.scoreText = this.add.text(16, 16, 'Puntos: 0', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' });
        this.livesText = this.add.text(620, 16, 'Pelotas: 4', { fontFamily: 'monospace', fontSize: '24px', color: '#ef4444', fontStyle: 'bold' });
        this.multiplierText = this.add.text(16, 50, 'Mult: x1', { fontFamily: 'monospace', fontSize: '18px', color: '#60a5fa' });
        this.levelText = this.add.text(320, 16, 'Nivel: 1', { fontFamily: 'monospace', fontSize: '24px', color: '#ffd700', fontStyle: 'bold' });
        
        this.wordQuestionText = this.add.text(400, 95, '', { 
            fontFamily: 'monospace', 
            fontSize: '20px', 
            color: '#facc15', 
            fontStyle: 'bold', 
            align: 'center' 
        }).setOrigin(0.5);

        this.input.on('pointermove', (pointer) => {
            if (this.isQuestionMode) return;
            this.paddle.x = Phaser.Math.Clamp(pointer.x, 65, 735);
            if (this.ball.getData('onPaddle')) {
                this.ball.x = this.paddle.x;
            }
        }, this);

        this.input.on('pointerup', () => {
            if (this.isQuestionMode) return;
            if (this.ball.getData('onPaddle')) {
                this.ball.setVelocity(-75 * this.ballSpeedMultiplier, -350 * this.ballSpeedMultiplier);
                this.ball.setData('onPaddle', false);
            }
        }, this);

        this.setupWordBricks();
    }

    setupWordBricks() {
        // Clear old labels
        this.wordLabels.forEach(l => l.destroy());
        this.wordLabels = [];

        if (this.bricks.countActive() === 0) return;

        // Select a vocabulary question
        this.currentWordQuestion = Phaser.Utils.Array.GetRandom(this.wordQuestionsList);
        this.wordQuestionText.setText(this.currentWordQuestion.q);

        // Pick 3 random active bricks to display words
        const activeBricks = this.bricks.getChildren().filter(b => b.active);
        if (activeBricks.length < 3) return;

        const selectedBricks = Phaser.Utils.Array.Shuffle(activeBricks).slice(0, 3);
        
        selectedBricks.forEach((brick, index) => {
            brick.setData('isWordBrick', true);
            brick.setData('optionIndex', index);
            brick.setData('wordText', this.currentWordQuestion.options[index]);
            brick.setData('isCorrect', index === this.currentWordQuestion.answer);

            // Render text label over brick (scaled slightly for 1.2x brick size)
            const label = this.add.text(brick.x, brick.y, this.currentWordQuestion.options[index], {
                fontFamily: 'Arial',
                fontSize: '17px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(10);
            
            this.wordLabels.push(label);
            brick.setData('labelObject', label);
        });
    }

    hitBrick(ball, brick) {
        brick.disableBody(true, true);
        
        // Remove label if it was a word brick
        if (brick.getData('isWordBrick')) {
            const lbl = brick.getData('labelObject');
            if (lbl) lbl.destroy();
        }

        // Calculate points with consecutive multiplier
        const pointsGained = 50 * this.consecutiveHits;
        this.score += pointsGained;
        this.showFloatingText(`+${pointsGained}`, brick.x, brick.y);
        
        this.consecutiveHits++;
        this.multiplierText.setText(`Mult: x${this.consecutiveHits}`);
        this.scoreText.setText(`Puntos: ${this.score}`);

        // Check if color row is cleared
        const colorFrame = brick.frame.name; // e.g. "blue1"
        const remainingInColor = this.bricks.getChildren().filter(
            b => b.active && b.frame.name === colorFrame
        ).length;

        if (remainingInColor === 0) {
            this.score += 100;
            this.scoreText.setText(`Puntos: ${this.score}`);
            this.showFloatingText(`+100 Bono Fila!`, brick.x, 300);
        }

        // If it was the correct word brick
        if (brick.getData('isWordBrick') && brick.getData('isCorrect')) {
            this.score += 200;
            this.scoreText.setText(`Puntos: ${this.score}`);
            this.showFloatingText(`+200 ¡Ladrillo Correcto!`, brick.x, brick.y);
            
            // Pause and trigger question modal
            if (!this.modalLocked) {
                this.modalLocked = true;
                this.physics.pause();
                this.time.delayedCall(300, () => {
                    this.triggerQuestionModal('WORD_HIT');
                });
            }
        }

        if (this.bricks.countActive() === 0) {
            this.resetLevel();
        }
    }

    hitPaddle(ball, paddle) {
        // Reset consecutive multiplier when touching the paddle
        this.consecutiveHits = 1;
        this.multiplierText.setText('Mult: x1');

        let diff = 0;
        if (ball.x < paddle.x) {
            diff = paddle.x - ball.x;
            ball.setVelocityX(-10 * diff * this.ballSpeedMultiplier);
        } else if (ball.x > paddle.x) {
            diff = ball.x - paddle.x;
            ball.setVelocityX(10 * diff * this.ballSpeedMultiplier);
        } else {
            ball.setVelocityX((2 + Math.random() * 8) * this.ballSpeedMultiplier);
        }
    }

    resetBall() {
        this.ball.setVelocity(0);
        this.ball.setPosition(this.paddle.x, 500);
        this.ball.setData('onPaddle', true);
        this.consecutiveHits = 1;
        this.multiplierText.setText('Mult: x1');
    }

    resetLevel() {
        this.levelBreakout++;
        if (this.levelText) {
            this.levelText.setText(`Nivel: ${this.levelBreakout}`);
        }
        this.ballSpeedMultiplier += 0.3; // Increase velocity by 30% each time all blocks are broken
        this.resetBall();
        this.bricks.getChildren().forEach((brick) => {
            brick.enableBody(true, brick.x, brick.y, true, true);
            brick.setData('isWordBrick', false);
            // Re-apply scale
            brick.setScale(1.2);
            brick.body.setSize(brick.width * 1.2, brick.height * 1.2);
            brick.body.updateFromGameObject();
        });
        this.setupWordBricks();
    }

    update() {
        if (this.isQuestionMode) return;
 
        // Keyboard movement and ball launching
        if (this.cursors && this.paddle) {
            let speed = 10;
            const joystick = (window as any).virtualJoystick;
            if (joystick && joystick.active) {
                speed = 10 * Math.abs(joystick.dx);
                if (joystick.dx < 0) {
                    this.paddle.x = Phaser.Math.Clamp(this.paddle.x - speed, 65, 735);
                } else if (joystick.dx > 0) {
                    this.paddle.x = Phaser.Math.Clamp(this.paddle.x + speed, 65, 735);
                }
                if (this.ball && this.ball.getData('onPaddle')) {
                    this.ball.x = this.paddle.x;
                }
            } else {
                if (this.cursors.left.isDown) {
                    this.paddle.x = Phaser.Math.Clamp(this.paddle.x - speed, 65, 735);
                    if (this.ball && this.ball.getData('onPaddle')) {
                        this.ball.x = this.paddle.x;
                    }
                } else if (this.cursors.right.isDown) {
                    this.paddle.x = Phaser.Math.Clamp(this.paddle.x + speed, 65, 735);
                    if (this.ball && this.ball.getData('onPaddle')) {
                        this.ball.x = this.paddle.x;
                    }
                }
            }
 
            const isLaunchKey = this.cursors.space.isDown || this.cursors.up.isDown || (this.keyZ && this.keyZ.isDown);
            if (isLaunchKey && this.ball && this.ball.getData('onPaddle')) {
                this.ball.setVelocity(-75 * this.ballSpeedMultiplier, -350 * this.ballSpeedMultiplier);
                this.ball.setData('onPaddle', false);
            }
        }

        if (this.ball && this.ball.y > 600) {
            // Ball fell down!
            this.score = Math.max(0, this.score - 50);
            this.scoreText.setText(`Puntos: ${this.score}`);
            this.showFloatingText(`-50 pts`, 400, 520, '#ef4444');
            
            this.ball.setVelocity(0);
            
            // Trigger salvation question
            this.triggerQuestionModal('BALL_DROP');
        }
    }

    showFloatingText(text: string, x: number, y: number, color: string = '#22c55e') {
        const txt = this.add.text(x, y, text, {
            fontFamily: 'Arial', fontSize: '18px', color: color, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: txt,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => txt.destroy()
        });
    }

    triggerQuestionModal(reason: 'WORD_HIT' | 'BALL_DROP') {
        const isPendingWordHit = reason === 'WORD_HIT' && this.modalLocked && !this.isQuestionMode;
        if (this.isQuestionMode || (this.modalLocked && !isPendingWordHit)) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;
        this.physics.pause();
        
        // Pick a question from registry
        const defaultFallbackQuestions = [
            { q: "¿Cuál de estas palabras lleva tilde?", options: ["arbol", "cantar", "papel", "reloj"], answer: 0 },
            { q: "El plural de 'pez' es:", options: ["peces", "pezs", "peceses", "pecesitos"], answer: 0 },
            { q: "En la oración 'Juan corre rápido', ¿cuál es el sujeto?", options: ["Juan", "corre", "rápido", "no hay"], answer: 0 },
            { q: "Identifique el antónimo de 'feliz':", options: ["triste", "alegre", "divertido", "contento"], answer: 0 }
        ];
        
        const sourceQuestions = this.questions.length > 0 ? this.questions : defaultFallbackQuestions;
        const qData = Phaser.Utils.Array.GetRandom(sourceQuestions);
        
        const cam = this.cameras.main;
        const cx = 400;
        const cy = 300;

        const overlay = this.add.rectangle(cx, cy, 800, 600, 0x000000, 0.85).setDepth(100).setInteractive();
        this.questionOverlayObjects.push(overlay);

        let title = "¡PREGUNTA DE DESAFÍO!";
        if (reason === 'BALL_DROP') title = "¡PREGUNTA DE SALVACIÓN!";
        
        const titleText = this.add.text(cx, cy - 190, title, {
            fontFamily: 'monospace', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 120, qData.q, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 720 }, align: 'center'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(questionText);

        const options = [...qData.options];
        const correctAnswerString = options[qData.answer];
        Phaser.Utils.Array.Shuffle(options);
        const correctIndex = options.indexOf(correctAnswerString);

        const btnW = 350, btnH = 96, gapX = 24, gapY = 20;
        const gridX = cx - btnW - gapX / 2, gridY = cy - 40;

        options.forEach((option, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const bx = gridX + col * (btnW + gapX), by = gridY + row * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(101);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', wordWrap: { width: btnW - 24 }, align: 'center'
            }).setOrigin(0.5).setDepth(102);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
                .setDepth(103).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => {
                // Disable hits
                this.questionOverlayObjects.forEach(obj => { 
                    if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive(); 
                });

                const isCorrect = i === correctIndex;
                if (qData && qData.id) {
                    window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: qData.id, correct: isCorrect } }));
                }
                btnGfx.clear();
                btnGfx.fillStyle(isCorrect ? 0x166534 : 0x7f1d1d, 0.95);
                btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
                btnGfx.lineStyle(2, isCorrect ? 0x22c55e : 0xef4444, 1);
                btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

                const feedback = isCorrect ? '¡CORRECTO!' : 'FALLASTE';
                const fbackText = this.add.text(cx, cy + 185, feedback, {
                    fontFamily: 'monospace', fontSize: '28px', color: isCorrect ? '#22c55e' : '#ef4444', fontStyle: 'bold'
                }).setOrigin(0.5).setDepth(102);
                this.questionOverlayObjects.push(fbackText);

                if (reason === 'BALL_DROP') {
                    if (isCorrect) {
                        // Salvation: do not lose life
                        this.showFloatingText('¡SALVADO!', 400, 480, '#22c55e');
                    } else {
                        // Lost spare ball
                        this.lives--;
                        this.livesText.setText(`Pelotas: ${this.lives}`);
                        this.showFloatingText('-1 Pelota', 400, 480, '#ef4444');
                        
                        if (this.lives <= 0) {
                            this.time.delayedCall(1500, () => {
                                this.questionOverlayObjects.forEach(o => o.destroy());
                                this.questionOverlayObjects = [];
                                this.isQuestionMode = false;
                                this.modalLocked = false;
                                this.triggerGameOver();
                            });
                            return;
                        }
                    }
                }

                // Close modal and continue
                this.time.delayedCall(1600, () => {
                    this.questionOverlayObjects.forEach(o => o.destroy());
                    this.questionOverlayObjects = [];
                    this.isQuestionMode = false;
                    this.modalLocked = false;
                    this.physics.resume();
                    
                    this.resetBall();
                    if (reason === 'WORD_HIT') {
                        // Setup next word bricks
                        this.setupWordBricks();
                    }
                });
            });
        });
    }

    triggerGameOver() {
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9).setDepth(150);
        this.add.text(400, 220, 'GAME OVER', {
            fontFamily: 'monospace', fontSize: '64px', color: '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(151);

        this.add.text(400, 320, `Puntuación final: ${this.score} puntos`, {
            fontFamily: 'monospace', fontSize: '26px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(151);

        const btn = this.add.text(400, 440, '[ REINTENTAR ]', {
            fontFamily: 'monospace', fontSize: '32px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(151).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setColor('#22c55e'));
        btn.on('pointerout', () => btn.setColor('#ffffff'));
        btn.on('pointerdown', () => {
            this.scene.restart();
        });
    }
}
