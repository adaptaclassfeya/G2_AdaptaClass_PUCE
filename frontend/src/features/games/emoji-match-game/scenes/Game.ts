// @ts-nocheck
import Phaser from 'phaser';

export default class MainGame extends Phaser.Scene
{
    constructor ()
    {
        super('MainGame');

        this.emojis;

        this.circle1;
        this.circle2;

        this.child1;
        this.child2;

        this.selectedEmoji = null;
        this.matched = false;
        this.modalLocked = false;
        this.hasUsedSalvation = false;

        this.score = 0;
        this.highscore = 0;
        this.scoreText;

        this.timer;
        this.timerText;
    }

    create ()
    {
        this.add.image(400, 400, 'background').setDisplaySize(800, 800);

        this.circle1 = this.add.circle(0, 0, 58).setStrokeStyle(4, 0xf8960e);
        this.circle2 = this.add.circle(0, 0, 58).setStrokeStyle(4, 0x00ff00);

        this.circle1.setVisible(false);
        this.circle2.setVisible(false);

        //  Create a 4x4 grid aligned group to hold our sprites

        this.emojis = this.add.group({
            key: 'emojis',
            frameQuantity: 1,
            repeat: 15,
            gridAlign: {
                width: 4,
                height: 4,
                cellWidth: 120,
                cellHeight: 120,
                x: 220,
                y: 220
            }
        });

        const fontStyle = {
            fontFamily: 'Arial',
            fontSize: 48,
            color: '#ffffff',
            fontStyle: 'bold',
            padding: 16,
            shadow: {
                color: '#000000',
                fill: true,
                offsetX: 2,
                offsetY: 2,
                blur: 4
            }
        };

        this.timerText = this.add.text(20, 20, '30:00', fontStyle);
        this.scoreText = this.add.text(530, 20, 'Found: 0', fontStyle);

        let children = this.emojis.getChildren();

        children.forEach((child) => {

            child.setScale(1.35);
            child.setInteractive();

        });

        this.input.on('gameobjectdown', this.selectEmoji, this);
        this.input.once('pointerdown', this.start, this);

        this.highscore = this.registry.get('highscore');

        this.events.once('shutdown', () => {
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.questionOverlayObjects = [];
            this.matched = false;
            this.hasUsedSalvation = false;
        });

        this.arrangeGrid();
    }

    start ()
    {
        this.score = 0;
        this.matched = false;

        this.timer = this.time.addEvent({ delay: 30000, callback: this.gameOver, callbackScope: this });

        this.sound.play('countdown', { delay: 27 });
    }

    selectEmoji (pointer, emoji)
    {
        if (this.matched || this.isQuestionMode)
        {
            return;
        }

        //  Is this the first or second selection?
        if (!this.selectedEmoji)
        {
            //  Our first emoji
            this.circle1.setPosition(emoji.x, emoji.y);
            this.circle1.setVisible(true);

            this.selectedEmoji = emoji;
        }
        else if (emoji !== this.selectedEmoji)
        {
            //  Our second emoji

            //  Is it a match?
            if (emoji.frame.name === this.selectedEmoji.frame.name)
            {
                this.matched = true;
                this.circle1.setStrokeStyle(4, 0x00ff00);
                this.circle2.setPosition(emoji.x, emoji.y);
                this.circle2.setVisible(true);

                this.tweens.add({
                    targets: [ this.child1, this.child2 ],
                    scale: 1.8,
                    angle: '-=30',
                    yoyo: true,
                    ease: 'sine.inout',
                    duration: 200,
                    completeDelay: 200,
                    onComplete: () => this.startQuestionSequence()
                });
        
                this.sound.play('match');
            }
            else
            {
                this.circle1.setPosition(emoji.x, emoji.y);
                this.circle1.setVisible(true);

                this.selectedEmoji = emoji;
            }
        }
    }

    newRound ()
    {

        this.score++;

        this.scoreText.setText('Found: ' + this.score);

        this.circle1.setStrokeStyle(4, 0xf8960e);

        this.circle1.setVisible(false);
        this.circle2.setVisible(false);

        //  Stagger tween them all out
        this.tweens.add({
            targets: this.emojis.getChildren(),
            scale: 0,
            ease: 'power2',
            duration: 600,
            delay: this.tweens.stagger(100, { grid: [ 4, 4 ], from: 'center' }),
            onComplete: () => this.arrangeGrid()
        });
    }

    arrangeGrid ()
    {
        //  We need to make sure there is only one pair in the grid
        //  Let's create an array with all possible frames in it:

        let frames = Phaser.Utils.Array.NumberArray(1, 40);
        let selected = Phaser.Utils.Array.NumberArray(0, 15);
        let children = this.emojis.getChildren();

        //  Now we pick 16 random values, removing each one from the array so we can't pick it again
        //  and set those into the sprites

        for (let i = 0; i < 16; i++)
        {
            let frame = Phaser.Utils.Array.RemoveRandomElement(frames);

            children[i].setFrame('smile' + frame);
        }

        //  Finally, pick two random children and make them a pair:
        let index1 = Phaser.Utils.Array.RemoveRandomElement(selected);
        let index2 = Phaser.Utils.Array.RemoveRandomElement(selected);

        this.child1 = children[index1];
        this.child2 = children[index2];

        //  Set the frame to match
        this.child2.setFrame(this.child1.frame.name);

        console.log('Pair: ', index1, index2);

        //  Clear the currently selected emojis (if any)
        this.selectedEmoji = null;

        //  Stagger tween them all in
        this.tweens.add({
            targets: children,
            scale: { start: 0, from: 0, to: 1.35 },
            ease: 'bounce.out',
            duration: 600,
            delay: this.tweens.stagger(100, { grid: [ 4, 4 ], from: 'center' }),
            onComplete: () => {
                this.matched = false;
            }
        });
    }

    update ()
    {
        if (this.isQuestionMode) return;
        if (this.timer)
        {
            if (this.timer.getProgress() === 1)
            {
                this.timerText.setText('00:00');
            }
            else
            {
                // Use the timer's own delay rather than the literal 30 so the
                // salvation bonus (which replaces the timer with a 10s one)
                // displays the correct remaining time instead of phantom 20s.
                const totalSec = this.timer.delay / 1000;
                const remaining = (totalSec - this.timer.getElapsedSeconds()).toPrecision(4);
                const pos = remaining.indexOf('.');

                let seconds = remaining.substring(0, pos);
                let ms = remaining.substr(pos + 1, 2);

                seconds = Phaser.Utils.String.Pad(seconds, 2, '0', 1);

                this.timerText.setText(seconds + ':' + ms);
            }
        }
    }

    gameOver ()
    {
        //  Show them where the match actually was
        this.circle1.setStrokeStyle(4, 0xfc29a6).setPosition(this.child1.x, this.child1.y).setVisible(true);
        this.circle2.setStrokeStyle(4, 0xfc29a6).setPosition(this.child2.x, this.child2.y).setVisible(true);

        this.input.off('gameobjectdown', this.selectEmoji, this);

        console.log(this.score, this.highscore);

        if (this.score > this.highscore)
        {
            console.log('high set');

            this.registry.set('highscore', this.score);
        }

        this.tweens.add({
            targets: [ this.circle1, this.circle2 ],
            alpha: 0,
            yoyo: true,
            repeat: 2,
            duration: 250,
            ease: 'sine.inout',
            onComplete: () => {
                if (!this.hasUsedSalvation) {
                    this.hasUsedSalvation = true;
                    this.startSalvationQuestion();
                } else {
                    this._triggerRealGameOver();
                }
            }
        });
    }

    startQuestionSequence() {
        if (this.isQuestionMode || this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;
        if (this.timer) {
            this.timer.paused = true;
        }
        this.sequenceIndex = 0;
        this.questionOverlayObjects = [];
        this._showSequenceQuestion();
    }

    _showSequenceQuestion() {
        this.questions = this.registry.get('preguntasDelNivel') || [];
        if (this.questions.length === 0) {
            this.questions = [
                { q: "María llevó un paraguas aunque el cielo estaba despejado. ¿Por qué?", options: ["Porque le gusta", "Porque previó lluvia", "Porque estaba roto"], answer: 1 }
            ];
        }

        const cx = 400;
        const cy = 400;
        const idx = Phaser.Math.Between(0, this.questions.length - 1);
        this.currentQuestion = this.questions[idx];

        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        Phaser.Utils.Array.Shuffle(options);
        this.correctAnswerIndex = options.indexOf(correctOption);

        if (this.questionOverlayObjects) {
            this.questionOverlayObjects.forEach(o => o.destroy());
        }
        this.questionOverlayObjects = [];

        // Dark background overlay
        const bg = this.add.rectangle(cx, cy, 800, 800, 0x000000, 0.85).setDepth(100).setInteractive();
        this.questionOverlayObjects.push(bg);

        const titleText = this.add.text(cx, cy - 220, `DESAFÍO FIN DE NIVEL (${this.sequenceIndex + 1}/3)`, {
            fontFamily: 'monospace', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 130, this.currentQuestion.q, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 740 }, align: 'center'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(questionText);

        const btnW = 740;
        const btnH = 96;
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
                fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', wordWrap: { width: btnW - 30 }, align: 'center'
            }).setOrigin(0.5).setDepth(102);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(cx, by + btnH / 2, btnW, btnH)
                .setDepth(103).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => this._answerSequenceQuestion(i, cx - btnW / 2, by, btnW, btnH, btnGfx));
        });
    }

    _answerSequenceQuestion(selectedIndex, bx, by, btnW, btnH, btnGfx) {
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

        const resultText = this.add.text(400, 330, correct ? '¡CORRECTO! (+4s)' : 'FALLASTE (-2s)', {
            fontFamily: 'monospace', fontSize: '28px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);
        this.questionOverlayObjects.push(resultText);

        if (correct) {
            this.adjustTimer(4000);
            this.sound.play('match');
        } else {
            this.adjustTimer(-2000);
        }

        this.sequenceIndex++;

        this.time.delayedCall(1600, () => {
            if (this.sequenceIndex < 3) {
                this._showSequenceQuestion();
            } else {
                this.questionOverlayObjects.forEach(o => o.destroy());
                this.questionOverlayObjects = [];
                this.isQuestionMode = false;
                this.modalLocked = false;
                if (this.timer) {
                    this.timer.paused = false;
                }
                this.newRound();
            }
        });
    }

    startSalvationQuestion() {
        if (this.isQuestionMode || this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;
        
        this.questions = this.registry.get('preguntasDelNivel') || [];
        if (this.questions.length === 0) {
            this.questions = [
                { q: "María llevó un paraguas aunque el cielo estaba despejado. ¿Por qué?", options: ["Porque le gusta", "Porque previó lluvia", "Porque estaba roto"], answer: 1 }
            ];
        }

        const cx = 400;
        const cy = 400;
        const idx = Phaser.Math.Between(0, this.questions.length - 1);
        this.currentQuestion = this.questions[idx];

        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        Phaser.Utils.Array.Shuffle(options);
        this.correctAnswerIndex = options.indexOf(correctOption);

        this.questionOverlayObjects = [];

        // Dark background overlay
        const bg = this.add.rectangle(cx, cy, 800, 800, 0x000000, 0.85).setDepth(100).setInteractive();
        this.questionOverlayObjects.push(bg);

        const titleText = this.add.text(cx, cy - 220, "¡PREGUNTA DE SALVACIÓN!", {
            fontFamily: 'monospace', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 130, this.currentQuestion.q, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 740 }, align: 'center'
        }).setOrigin(0.5).setDepth(101);
        this.questionOverlayObjects.push(questionText);

        const btnW = 740;
        const btnH = 96;
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
                fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', wordWrap: { width: btnW - 30 }, align: 'center'
            }).setOrigin(0.5).setDepth(102);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(cx, by + btnH / 2, btnW, btnH)
                .setDepth(103).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => this._answerSalvationQuestion(i, cx - btnW / 2, by, btnW, btnH, btnGfx));
        });
    }

    _answerSalvationQuestion(selectedIndex, bx, by, btnW, btnH, btnGfx) {
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

        const resultText = this.add.text(400, 330, correct ? '¡SALVADO! (+10s)' : 'FALLASTE', {
            fontFamily: 'monospace', fontSize: '28px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);
        this.questionOverlayObjects.push(resultText);

        if (correct) {
            this.sound.play('match');
            // Give 10 seconds of extra time
            if (this.timer) {
                this.timer.destroy();
            }
            this.timer = this.time.addEvent({ delay: 10000, callback: this.gameOver, callbackScope: this });
            this.input.on('gameobjectdown', this.selectEmoji, this);
        } else {
            this.sound.play('draw');
        }

        this.time.delayedCall(1600, () => {
            this.questionOverlayObjects.forEach(o => o.destroy());
            this.questionOverlayObjects = [];
            this.isQuestionMode = false;
            this.modalLocked = false;
            
            if (correct) {
                this.arrangeGrid();
            } else {
                this._triggerRealGameOver();
            }
        });
    }

    _triggerRealGameOver() {
        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        }, this);
    }

    adjustTimer(timeDeltaMs) {
        if (!this.timer) return;
        const remaining = 30000 - this.timer.elapsed;
        let newRemaining = remaining + timeDeltaMs;
        if (newRemaining <= 0) {
            this.timer.elapsed = 30000;
        } else {
            this.timer.elapsed = 30000 - newRemaining;
        }
    }
}
