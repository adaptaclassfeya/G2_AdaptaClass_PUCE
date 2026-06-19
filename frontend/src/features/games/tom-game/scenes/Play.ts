// @ts-nocheck
import Phaser from 'phaser';

import Tomato from './Tomato';
import Bombs from './TomBombs';
import TomatoItem from './TomatoItem';

/**
 * In this fast-paced game, you play as a character on a mission to collect ripe tomatoes while avoiding bombs with spikes. With just one screen to play on, you must use quick reflexes and strategic thinking to dodge the bombs and collect as many tomatoes as you can. Each tomato you collect earns you points, but watch out! If you collide with a bomb with spikes, you'll lose a life. The goal is to collect as many tomatoes as possible while avoiding bombs and preserving your lives. Can you make it to the end of the game with all your lives intact and become the ultimate tomato-collecting champion? Play now and find out!
 * Game created by Francisco Pereira (Gammafp)
 * - PixelArt created by @VeryEvilTomato
 */

class Play extends Phaser.Scene
{
    constructor ()
    {
        super({key: 'Play'});
    }

    init ()
    {
        this.scene.launch('UI');
    }

    create ()
    {
        this.add.image(0, 0, 'background')
            .setOrigin(0);

        this.wall_floor = this.physics.add.staticGroup();

        this.wall_floor.create(0, 0, 'wall')
            .setOrigin(0);
        this.wall_floor.create(this.scale.width, 0, 'wall')
            .setOrigin(1, 0)
            .setFlipX(true);

        this.wall_floor.create(0, this.scale.height, 'floor')
            .setOrigin(0, 1);

        this.wall_floor.refresh();

        this.wall_floor.getChildren()[2].setOffset(0, 15);

        // Bombs
        this.bombsGroup = new Bombs({
            physicsWorld: this.physics.world,
            scene: this
        });

        // Items
        this.itemsGroup = new TomatoItem({
            physicsWorld: this.physics.world,
            scene: this
        });

        // Personaje
        this.tomato = new Tomato({
            scene: this,
            x: 100,
            y: 100,
        });

        this.physics.add.collider([this.tomato, this.bombsGroup], this.wall_floor);
        
        // Bomb collision now triggers salvation question
        this.physics.add.overlap(this.tomato, this.bombsGroup, (tomato, bomb) => {
            if (!this.isQuestionMode && !this.tomato.hitDelay) {
                this.collidedBomb = bomb;
                this.pendingBuff = 'BOMB';
                this._showQuestion();
            }
        });

        this.physics.add.overlap(this.itemsGroup, this.tomato, () => {
            this.sound.play('pop');
            this.registry.events.emit('update_points');
            this.itemsGroup.destroyItem();
            this.bombsGroup.addBomb();
        });

        // Periodic question timer every 25s
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.questionOverlayObjects = [];
        this.periodicQuestionTimer = this.time.addEvent({
            delay: 12000,
            callback: () => {
                if (this.tomato && this.tomato.life > 0 && !this.isQuestionMode) {
                    this.pendingBuff = 'PERIODIC';
                    this._showQuestion();
                }
            },
            loop: true
        });

        // Clean up on scene shutdown
        this.events.on('shutdown', () => {
            if (this.periodicQuestionTimer) {
                this.periodicQuestionTimer.destroy();
            }
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.questionOverlayObjects = [];
        });
    }

    update ()
    {
        if (this.isQuestionMode) return;
        this.tomato.update();
        this.bombsGroup.update();
    }

    _showQuestion() {
        if (this.isQuestionMode || this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;
        this.physics.pause();
        
        this.questions = this.registry.get('preguntasDelNivel') || [];
        if (this.questions.length === 0) {
            this.questions = [
                { q: "María llevó un paraguas aunque el cielo estaba despejado. ¿Por qué?", options: ["Porque le gusta", "Porque previó lluvia", "Porque estaba roto"], answer: 1 }
            ];
        }
        
        const cx = 320;
        const cy = 180;
        const idx = Phaser.Math.Between(0, this.questions.length - 1);
        this.currentQuestion = this.questions[idx];

        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        Phaser.Utils.Array.Shuffle(options);
        this.correctAnswerIndex = options.indexOf(correctOption);

        this.questionOverlayObjects = [];

        // Black translucent overlay
        const bg = this.add.rectangle(cx, cy, 640, 360, 0x000000, 0.85).setDepth(100).setInteractive();
        this.questionOverlayObjects.push(bg);

        let title = "¡PREGUNTA DE SALVACIÓN!";
        if (this.pendingBuff === 'PERIODIC') {
            title = "¡DESAFÍO PERIODICO BOMB!";
        }

        const titleText = this.add.text(cx, cy - 150, title, {
            fontFamily: 'monospace', fontSize: '20px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 105, this.currentQuestion.q, {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 580 }, align: 'center'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(questionText);

        // 2x2 grid — Tom's stage is 640x360, so 4 options stacked vertically
        // overflow off the bottom; a grid keeps every option on-screen and
        // touchable.
        const btnW = 280;
        const btnH = 60;
        const gapX = 20;
        const gapY = 8;
        const cols = 2;
        const gridX = cx - btnW - gapX / 2;
        const gridY = cy - 40;

        options.forEach((option, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = gridX + col * (btnW + gapX);
            const by = gridY + row * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(101);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(bx, by, btnW, btnH, 6);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 6);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', wordWrap: { width: btnW - 16 }, align: 'center'
            }).setOrigin(0.5).setDepth(102);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
                .setDepth(103).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => this._answerQuestion(i, bx, by, btnW, btnH, btnGfx));
        });
    }

    _answerQuestion(selectedIndex, bx, by, btnW, btnH, btnGfx) {
        this.questionOverlayObjects.forEach(obj => { if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive(); });

        const correct = selectedIndex === this.correctAnswerIndex;
        if (this.currentQuestion && this.currentQuestion.id) {
            window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: this.currentQuestion.id, correct } }));
        }
        btnGfx.clear();
        btnGfx.fillStyle(correct ? 0x166534 : 0x7f1d1d, 0.95);
        btnGfx.fillRoundedRect(bx, by, btnW, btnH, 6);
        btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
        btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 6);

        const resultText = this.add.text(320, 315, correct ? '¡CORRECTO!' : 'FALLASTE', {
            fontFamily: 'monospace', fontSize: '16px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);
        this.questionOverlayObjects.push(resultText);

        if (correct) {
            this.sound.play('pop');
            if (this.pendingBuff === 'BOMB') {
                if (this.collidedBomb) {
                    this.collidedBomb.destroy();
                }
                // Give 3s of immunity to tomato
                this.tomato.hitDelay = true;
                this.tomato.setTint(0x1abc9c);
                this.tomato.setAlpha(0.6);
                this.time.delayedCall(3000, () => {
                    this.tomato.hitDelay = false;
                    this.tomato.clearTint();
                    this.tomato.setAlpha(1.0);
                });
            } else if (this.pendingBuff === 'PERIODIC') {
                // Destroy 50% of active bombs
                const activeBombs = this.bombsGroup.getChildren();
                const countToDestroy = Math.ceil(activeBombs.length * 0.5);
                const toDestroy = activeBombs.slice(0, countToDestroy);
                toDestroy.forEach(b => b.destroy());

                // Give 1.5s of immunity to tomato
                this.tomato.hitDelay = true;
                this.tomato.setTint(0x1abc9c);
                this.tomato.setAlpha(0.6);
                this.time.delayedCall(1500, () => {
                    this.tomato.hitDelay = false;
                    this.tomato.clearTint();
                    this.tomato.setAlpha(1.0);
                });
            }
        } else {
            this.sound.play('draw');
            if (this.pendingBuff === 'BOMB' || this.pendingBuff === 'PERIODIC') {
                if (this.pendingBuff === 'BOMB' && this.collidedBomb) {
                    this.collidedBomb.destroy();
                }
                this.tomato.life--;
                this.registry.events.emit('remove_life');
                if (this.tomato.life <= 0) {
                    this.time.delayedCall(1500, () => {
                        this.questionOverlayObjects.forEach(o => o.destroy());
                        this.questionOverlayObjects = [];
                        this.isQuestionMode = false;
                        this.modalLocked = false;
                        this.registry.events.emit('game_over');
                    });
                    return;
                } else {
                    // Give 3s of immunity to tomato since they lost a life
                    this.tomato.hitDelay = true;
                    this.tomato.setTint(0x1abc9c);
                    this.tomato.setAlpha(0.6);
                    this.time.delayedCall(3000, () => {
                        this.tomato.hitDelay = false;
                        this.tomato.clearTint();
                        this.tomato.setAlpha(1.0);
                    });
                }
            }
        }

        this.pendingBuff = null;

        this.time.delayedCall(1600, () => {
            this.questionOverlayObjects.forEach(o => o.destroy());
            this.questionOverlayObjects = [];
            this.isQuestionMode = false;
            this.modalLocked = false;
            this.physics.resume();
        });
    }
}

export default Play;
