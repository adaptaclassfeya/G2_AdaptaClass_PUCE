// @ts-nocheck
import Phaser from 'phaser';

import Germs from './Germs';
import Player from './Player';
import Pickups from './Pickups';

export default class MainGame extends Phaser.Scene
{
    constructor ()
    {
        super('MainGame');

        this.player;
        this.germs;
        this.pickups;

        this.introText;
        this.scoreText;
        this.score = 0;
        this.highscore = 0;
        this.newHighscore = false;
    }

    create ()
    {
        this.score = 0;
        this.highscore = this.registry.get('highscore');
        this.newHighscore = false;
        
        this.lives = 3;
        this.maxLives = 8;
        this.immunityTimer = 0;
        this.speedTimer = 0;
        this.questionTimer = 10;
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.pendingBuff = null;
        this.pendingBuffQueue = [];
        this.ringsSinceLastQuestion = 0;

        this.questions = this.registry.get('preguntasDelNivel') || [];
        this.hasQuestions = this.questions.length > 0;
        this.itemGroup = this.add.group();
        this.itemSpawnTimer = 5;
        this.questionOverlayObjects = [];
        this.events.once('shutdown', () => {
            this.pendingBuff = null;
            this.pendingBuffQueue = [];
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.questionOverlayObjects = [];
        });

        this.add.image(512, 384, 'background').setScale(2);

        this.germs = new Germs(this.physics.world, this);

        this.pickups = new Pickups(this.physics.world, this);

        this.player = new Player(this, 512, 512);

        this.scoreText = this.add.bitmapText(16, 32, 'slime', 'Score   0', 40).setDepth(1);
        this.livesText = this.add.bitmapText(16, 80, 'slime', `Vidas   ${this.lives}`, 40).setDepth(1);

        this.introText = this.add.bitmapText(512, 384, 'slime', 'Avoid the Germs\nCollect the Rings', 60).setOrigin(0.5).setCenterAlign().setDepth(1);

        this.pickups.start();
        this.showInstructionsCard();
        
        this.physics.add.overlap(this.player, this.pickups, (player, pickup) => this.playerHitPickup(player, pickup));
        this.physics.add.overlap(this.player, this.germs, (player, germ) => this.playerHitGerm(player, germ));
    }

    playerHitGerm (player, germ)
    {
        if (player.isAlive && germ.alpha === 1)
        {
            if (this.immunityTimer > 0) return;
            
            if (this.hasQuestions) {
                this._queueQuestion('GERM');
            } else {
                this.lives--;
                this.livesText.setText(`Vidas   ${this.lives}`);
                if (this.lives <= 0) {
                    this.gameOver();
                } else {
                    this.immunityTimer = 1.5;
                    this.sound.play('fail');
                }
            }
        }
    }

    playerHitPickup (player, pickup)
    {
        this.score++;

        this.scoreText.setText('Score   ' + this.score);

        if (!this.newHighscore && this.score > this.highscore)
        {
            if (this.highscore > 0)
            {
                //  Only play the victory sound if they actually set a new highscore
                this.sound.play('victory');
            }
            else
            {
                this.sound.play('pickup');
            }

            this.newHighscore = true;
        }
        else
        {
            this.sound.play('pickup');
        }

        this.pickups.collect(pickup);

        if (this.hasQuestions) {
            this.ringsSinceLastQuestion++;
            if (this.ringsSinceLastQuestion >= 30) {
                this.ringsSinceLastQuestion = 0;
                this.pendingBuffQueue.push('PERIODIC');
                this.time.delayedCall(300, () => {
                    this._showQuestion();
                });
            }
        }
    }

    gameOver ()
    {
        this.player.kill();
        this.germs.stop();

        this.sound.stopAll();
        this.sound.play('fail');

        this.introText.setText('Game Over!');

        this.tweens.add({
            targets: this.introText,
            alpha: 1,
            duration: 300
        });

        if (this.newHighscore)
        {
            this.registry.set('highscore', this.score);
        }

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }

    getPlayer (target)
    {
        target.x = this.player.x;
        target.y = this.player.y;

        return target;
    }

    update (time, delta)
    {
        if (!this.player.isAlive || this.isQuestionMode) return;
        const dt = delta / 1000;
        
        this._tickItems(dt);
        this._checkItemCollisions();

        if (this.immunityTimer > 0) {
            this.immunityTimer -= dt;
            this.player.alpha = (Math.floor(time / 150) % 2 === 0) ? 0.5 : 1;
            if (this.immunityTimer <= 0) this.player.alpha = 1;
        }

        if (this.speedTimer > 0) {
            this.speedTimer -= dt;
            if (this.speedTimer <= 0) this.player.setSpeedMultiplier(1);
        }

        // Periodic question timer removed, now triggers every 30 rings.
    }

    _tickItems(dt) {
        let activeItems = 0;
        for (const item of this.itemGroup.getChildren()) { if (item.active) activeItems++; }
        if (activeItems >= 2) return;

        this.itemSpawnTimer -= dt;
        if (this.itemSpawnTimer <= 0) {
            this.itemSpawnTimer = 7;
            const types = ['VIDA', 'VELOCIDAD', 'INMUNITY'];
            const type = types[Math.floor(Math.random() * types.length)];
            const spawnX = Phaser.Math.Between(50, 974);
            const spawnY = Phaser.Math.Between(50, 718);
            
            const scale = type === 'VIDA' ? 0.2 : 0.25; // Player size
            const item = this.add.sprite(spawnX, spawnY, `item-${type}`).setScale(scale).setDepth(2);
            item.itemType = type;
            this.itemGroup.add(item);
            
            this.tweens.add({ targets: item, y: spawnY - 5, yoyo: true, repeat: -1, duration: 1000 });
        }
    }

    _checkItemCollisions () {
        const px = this.player.x, py = this.player.y;
        for (const item of this.itemGroup.getChildren()) {
            if (!item.active) continue;
            const dist = Phaser.Math.Distance.Between(px, py, item.x, item.y);
            if (dist < 40) { // Generous hitbox for easy interaction
                this.sound.play('pickup');
                const type = item.itemType;
                item.destroy();

                if (this.hasQuestions) {
                    this._queueQuestion(type);
                } else {
                    this._applyBuff(type);
                }
            }
        }
    }

    _applyBuff (type) {
        if (type === 'VIDA') {
            this.lives = Math.min(this.maxLives, this.lives + 1);
            this.livesText.setText(`Vidas   ${this.lives}`);
        } else if (type === 'VELOCIDAD') {
            this.speedTimer = 7;
            this.player.setSpeedMultiplier(1.5);
        } else if (type === 'INMUNITY') {
            this.immunityTimer = 7;
        }
    }

    _queueQuestion (type) {
        this.pendingBuffQueue.push(type);
        this._showQuestion();
    }

    _destroyRandomGerms(count = 3) {
        const activeGerms = this.germs.getChildren().filter(child => child.active && child.alpha === 1);
        Phaser.Utils.Array.Shuffle(activeGerms);
        const toDestroy = activeGerms.slice(0, count);
        toDestroy.forEach(germ => {
            germ.isChasing = false;
            germ.body.stop();
            this.tweens.add({
                targets: germ,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Linear',
                onComplete: () => {
                    germ.setActive(false);
                    germ.setVisible(false);
                }
            });
        });
    }

    _showQuestion() {
        if (this.isQuestionMode || this.modalLocked) {
            return;
        }
        this.pendingBuff = this.pendingBuffQueue.shift();
        if (!this.pendingBuff) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;
        this.physics.pause();
        this.player.body.stop();

        const cam = this.cameras.main;
        const cx  = 512, cy  = 384;
        const idx = Phaser.Math.Between(0, this.questions.length - 1);
        this.currentQuestion = this.questions[idx];

        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        Phaser.Utils.Array.Shuffle(options);
        this.correctAnswerIndex = options.indexOf(correctOption);

        const bg = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.8).setDepth(100).setInteractive();
        this.questionOverlayObjects.push(bg);

        let title = "¡PREGUNTA POR PODER!";
        if (this.pendingBuff === 'PERIODIC') title = "¡RESPONDE PARA SEGUIR JUGANDO!";
        if (this.pendingBuff === 'GERM') title = "¡RESPONDE PARA SALVAR TU VIDA!";
        
        const titleText = this.add.text(cx, cy - 220, title, {
            fontFamily: 'monospace', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 130, this.currentQuestion.q, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 900 }, align: 'center'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(questionText);

        const btnW = 420, btnH = 120, gapX = 30, gapY = 20;
        const gridX = cx - btnW - gapX / 2, gridY = cy - 20;

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
                fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', wordWrap: { width: btnW - 30 }, align: 'center'
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
        btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
        btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
        btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

        const resultText = this.add.text(512, 384 + 260, correct ? '¡CORRECTO!' : 'FALLASTE', {
                fontFamily: 'monospace', fontSize: '32px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(102);
        this.questionOverlayObjects.push(resultText);

        const resolvedBuff = this.pendingBuff;

        if (correct) {
            this._destroyRandomGerms(3);
            if (resolvedBuff !== 'PERIODIC' && resolvedBuff !== 'GERM') {
                this._applyBuff(resolvedBuff);
            }
        } else {
            if (resolvedBuff === 'PERIODIC' || resolvedBuff === 'GERM') {
                this.lives--;
                this.livesText.setText(`Vidas   ${this.lives}`);
                if (this.lives <= 0) {
                    this.time.delayedCall(1500, () => {
                        this.questionOverlayObjects.forEach(o => o.destroy());
                        this.questionOverlayObjects = [];
                        this.pendingBuff = null;
                        this.pendingBuffQueue = [];
                        this.modalLocked = false;
                        this.gameOver();
                    });
                    return;
                }
            }
        }

        this.immunityTimer = 1.5;

        this.time.delayedCall(1600, () => {
            this.questionOverlayObjects.forEach(o => o.destroy());
            this.questionOverlayObjects = [];
            this.isQuestionMode = false;
            this.modalLocked = false;
            this.pendingBuff = null;
            this.physics.resume();
            if (this.pendingBuffQueue.length > 0) {
                this._showQuestion();
            }
        });
    }

    showInstructionsCard()
    {
        this.physics.pause();
        
        const cx = 512;
        const cy = 384;
        
        const overlay = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.85).setDepth(200);
        
        const cardBg = this.add.graphics().setDepth(201);
        cardBg.fillStyle(0x1e293b, 0.95);
        cardBg.fillRoundedRect(cx - 350, cy - 260, 700, 520, 12);
        cardBg.lineStyle(4, 0x475569, 1);
        cardBg.strokeRoundedRect(cx - 350, cy - 260, 700, 520, 12);
        
        const titleText = this.add.text(cx, cy - 210, '¿CÓMO JUGAR?', {
            fontFamily: 'monospace', fontSize: '32px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(202);
        
        const rules = 
            "Evita los gérmenes. Muévete usando tu dedo o el mouse.\n\n" +
            "Tú serás el germen amarillo y deberás evitar tocar a los demás. Si uno de ellos te toca, tendrás que responder una pregunta para seguir jugando o perderás una vida.\n\n" +
            "Tienes 3 vidas, pero puedes ganar más respondiendo preguntas.\n\n" +
            "¡Hay más bonificaciones, descúbrelas por ti mismo!";
            
        const text = this.add.text(cx, cy - 20, rules, {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
            align: 'left', wordWrap: { width: 620 }, lineSpacing: 6
        }).setOrigin(0.5).setDepth(202);
        
        const btnBg = this.add.graphics().setDepth(202);
        btnBg.fillStyle(0x22c55e, 1);
        btnBg.fillRoundedRect(cx - 120, cy + 170, 240, 60, 8);
        
        const btnText = this.add.text(cx, cy + 200, 'JUGAR', {
            fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(203);
        
        const hitZone = this.add.rectangle(cx, cy + 200, 240, 60)
            .setDepth(204).setInteractive({ useHandCursor: true });
            
        hitZone.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x16a34a, 1);
            btnBg.fillRoundedRect(cx - 120, cy + 170, 240, 60, 8);
        });
        
        hitZone.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x22c55e, 1);
            btnBg.fillRoundedRect(cx - 120, cy + 170, 240, 60, 8);
        });
        
        hitZone.on('pointerdown', () => {
            overlay.destroy();
            cardBg.destroy();
            titleText.destroy();
            text.destroy();
            btnBg.destroy();
            btnText.destroy();
            hitZone.destroy();
            
            this.introText.alpha = 0;
            this.physics.resume();
            this.player.start();
            this.germs.start();
            this.sound.play('start');
        });
    }
}
