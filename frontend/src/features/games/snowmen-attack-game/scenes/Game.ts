// @ts-nocheck
import Phaser from 'phaser';

import Track from './Track';
import Player from './Player';

export default class MainGame extends Phaser.Scene
{
    constructor ()
    {
        super('MainGame');

        this.player;
        this.tracks;

        this.score = 0;
        this.highscore = 0;
        this.infoPanel;

        this.scoreTimer;
        this.scoreText;
        this.highscoreText;
    }

    create ()
    {
        this.score = 0;
        this.highscore = this.registry.get('highscore');

        this.add.image(512, 384, 'background');

        this.tracks = [
            new Track(this, 0, 196),
            new Track(this, 1, 376),
            new Track(this, 2, 536),
            new Track(this, 3, 700)
        ];

        this.player = new Player(this, this.tracks[0]);

        this.add.image(0, 0, 'overlay').setOrigin(0);

        this.add.image(16, 0, 'sprites', 'panel-score').setOrigin(0);
        this.add.image(1024-16, 0, 'sprites', 'panel-best').setOrigin(1, 0);

        this.infoPanel = this.add.image(512, 384, 'sprites', 'controls');
        this.scoreText = this.add.text(140, 2, this.score, { fontFamily: 'Arial', fontSize: 32, color: '#ffffff' });
        this.highscoreText = this.add.text(820, 2, this.highscore, { fontFamily: 'Arial', fontSize: 32, color: '#ffffff' });

        this.doubleThrowActive = false;
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.questionOverlayObjects = [];
        this.mobileButtons = [];
        this.hasStarted = false;
        this.postModalImmuneUntil = 0;
        this.gameOverInputReadyAt = 0;

        this.events.once('shutdown', () => {
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.questionOverlayObjects = [];
            this.postModalImmuneUntil = 0;
            this.gameOverInputReadyAt = 0;
        });



        this.input.keyboard.once('keydown-SPACE', this.start, this);
        this.input.keyboard.once('keydown-UP', this.start, this);
        this.input.keyboard.once('keydown-DOWN', this.start, this);
        this.input.keyboard.once('keydown-Z', this.start, this);

        // Allow click to start on mobile too
        this.input.once('pointerdown', this.start, this);


    }

    start ()
    {
        this.hasStarted = true;

        this.input.keyboard.removeAllListeners();
        this.input.off('pointerdown');

        this.tweens.add({
            targets: this.infoPanel,
            y: 700,
            alpha: 0,
            duration: 500,
            ease: 'Power2'
        });

        this.player.start();

        this.tracks[0].start(4000, 8000);
        this.tracks[1].start(500, 1000);
        this.tracks[2].start(5000, 9000);
        this.tracks[3].start(6000, 10000);

        this.scoreTimer = this.time.addEvent({ delay: 1000, callback: () => {
            this.score++;
            this.scoreText.setText(this.score);
        }, callbackScope: this, repeat: -1 });

        // 15s periodic question timer for double-throw buff
        this.periodicQuestionTimer = this.time.addEvent({
            delay: 15000,
            callback: () => {
                if (this.player && this.player.isAlive && !this.isQuestionMode) {
                    this.pendingBuff = 'DOUBLE_THROW';
                    this.startQuestionEvent();
                }
            },
            loop: true
        });

        // Initialize mobile controls if on mobile/touch
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouch) {
            this.createMobileControls();
        }
    }

    createMobileControls() {
        // Empty - mobile D-pad is now rendered inside the GameBoy console wrapper chassis
    }

    toggleMobileControls(visible) {
        this.mobileButtons.forEach(btn => {
            if (btn && btn.setVisible) {
                btn.setVisible(visible);
            }
        });
    }

    gameOver ()
    {
        if (this.time.now < this.postModalImmuneUntil) return;
        if (this.isQuestionMode) return;

        // Trigger salvation question instead of immediate game over
        this.pendingBuff = 'SALVATION';
        this.startQuestionEvent();
    }

    actualGameOver ()
    {
        this.toggleMobileControls(false);
        this.infoPanel.setTexture('gameover');
        this.gameOverInputReadyAt = this.time.now + 1000;

        this.tweens.add({
            targets: this.infoPanel,
            y: 384,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

        this.tracks.forEach((track) => {
            track.stop();
        });

        this.sound.stopAll();
        this.sound.play('gameover');

        this.player.stop();

        if (this.scoreTimer) {
            this.scoreTimer.destroy();
        }
        if (this.periodicQuestionTimer) {
            this.periodicQuestionTimer.destroy();
        }

        if (this.score > this.highscore)
        {
            this.highscoreText.setText('NEW!');

            this.registry.set('highscore', this.score);
        }

        const restart = () => {
            this.scene.start('MainMenu');
        };

        this.time.delayedCall(1000, () => {
            this.input.keyboard.once('keydown-SPACE', restart, this);
            this.input.keyboard.once('keydown-Z', restart, this);

            this.input.once('pointerdown', () => {
                this.scene.start('MainMenu');
            }, this);
        });
    }

    resetBoard ()
    {
        this.tracks.forEach(track => {
            // Stop enemy snowballs
            track.enemySnowballs.getChildren().forEach(b => b.stop());
            // Stop player snowballs
            track.playerSnowballs.getChildren().forEach(b => b.stop());
            // Push snowmen back and resume
            if (track.snowmanBig.isAlive) {
                track.snowmanBig.x = -100;
                track.snowmanBig.setVelocityX(track.snowmanBig.speed);
                track.snowmanBig.play('snowmanWalkBig');
            }
            if (track.snowmanSmall.isAlive) {
                track.snowmanSmall.x = 80;
                track.snowmanSmall.setVelocityX(track.snowmanSmall.speed);
                track.snowmanSmall.play('snowmanWalkSmall');
            }
        });
        this.player.isAlive = true;
        this.player.play('idle');
    }

    startQuestionEvent ()
    {
        if (this.isQuestionMode || this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;
        this.physics.pause();
        this.toggleMobileControls(false);
        
        if (this.scoreTimer) this.scoreTimer.paused = true;
        if (this.periodicQuestionTimer) this.periodicQuestionTimer.paused = true;

        this.questions = this.registry.get('preguntasDelNivel') || [];
        if (this.questions.length === 0) {
            this.questions = [
                { q: "María llevó un paraguas aunque el cielo estaba despejado. ¿Por qué?", options: ["Porque le gusta", "Porque previó lluvia", "Porque estaba roto"], answer: 1 }
            ];
        }

        const cx = 512;
        const cy = 384;
        const idx = Phaser.Math.Between(0, this.questions.length - 1);
        this.currentQuestion = this.questions[idx];

        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        Phaser.Utils.Array.Shuffle(options);
        this.correctAnswerIndex = options.indexOf(correctOption);

        this.questionOverlayObjects = [];

        // Black translucent overlay
        const bg = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.85).setDepth(100).setInteractive();
        this.questionOverlayObjects.push(bg);

        let title = "¡PREGUNTA DE SALVACIÓN!";
        if (this.pendingBuff === 'DOUBLE_THROW') {
            title = "¡PREGUNTA PARA DOBLE DISPARO!";
        }

        const titleText = this.add.text(cx, cy - 190, title, {
            fontFamily: 'Arial', fontSize: '38px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 120, this.currentQuestion.q, {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 800 }, align: 'center'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(questionText);

        const btnW = 750;
        const btnH = 120;
        const gapY = 16;
        const startY = cy - 20;

        options.forEach((option, i) => {
            const by = startY + i * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(101);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(cx - btnW / 2, by, btnW, btnH, 8);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(cx - btnW / 2, by, btnW, btnH, 8);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(cx, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', wordWrap: { width: btnW - 24 }, align: 'center'
            }).setOrigin(0.5).setDepth(102);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(cx, by + btnH / 2, btnW, btnH)
                .setDepth(103).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => this._answerQuestion(i, cx - btnW / 2, by, btnW, btnH, btnGfx));
        });
    }

    _answerQuestion (selectedIndex, bx, by, btnW, btnH, btnGfx)
    {
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

        const resultText = this.add.text(512, 630, correct ? '¡CORRECTO!' : 'FALLASTE', {
            fontFamily: 'Arial', fontSize: '32px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);
        this.questionOverlayObjects.push(resultText);

        if (correct) {
            this.sound.play('hit-snowman');
            if (this.pendingBuff === 'DOUBLE_THROW') {
                this.doubleThrowActive = true;
                this.time.delayedCall(8000, () => {
                    this.doubleThrowActive = false;
                });
            } else if (this.pendingBuff === 'SALVATION') {
                this.resetBoard();
            }
        }

        this.time.delayedCall(1600, () => {
            this.questionOverlayObjects.forEach(o => o.destroy());
            this.questionOverlayObjects = [];
            this.isQuestionMode = false;
            this.modalLocked = false;
            this.clearEnemySnowballs();
            this.postModalImmuneUntil = this.time.now + 500;
            this.physics.resume();
            
            if (this.scoreTimer) this.scoreTimer.paused = false;
            if (this.periodicQuestionTimer) this.periodicQuestionTimer.paused = false;

            if (correct || this.pendingBuff !== 'SALVATION') {
                this.toggleMobileControls(true);
            }

            if (!correct && this.pendingBuff === 'SALVATION') {
                this.actualGameOver();
            }
        });
    }

    clearEnemySnowballs ()
    {
        this.tracks.forEach(track => {
            track.enemySnowballs.getChildren().forEach(ball => {
                if (ball.active) {
                    ball.stop();
                }
            });
        });
    }

    update ()
    {
        const joystick = (window as any).virtualJoystick;
        const gamepad = (window as any).virtualGamepad;
        
        // Start game via virtual gamepad buttons or joystick
        const anyJoyActive = joystick && joystick.active && (Math.abs(joystick.dx) > 0.4 || Math.abs(joystick.dy) > 0.4);
        const anyBtnPressed = gamepad && (gamepad.A || gamepad.up || gamepad.down || gamepad.left || gamepad.right);

        if (anyJoyActive || anyBtnPressed)
        {
            if (!this.hasStarted)
            {
                this.start();
            }
            else if (this.player && !this.player.isAlive && !this.isQuestionMode && this.time.now >= this.gameOverInputReadyAt)
            {
                this.scene.start('MainMenu');
            }
        }
    }
}
