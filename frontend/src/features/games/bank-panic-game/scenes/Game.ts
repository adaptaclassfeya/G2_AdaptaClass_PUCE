// @ts-nocheck
import Phaser from 'phaser';

import Door from './Door';

export default class MainGame extends Phaser.Scene
{
    constructor ()
    {
        super('MainGame');

        this.hats;
        this.goals;
        this.gold;
        this.doors;

        this.isPaused = false;
        this.goalsComplete = 0;
        this.sign;

        this.level = 1;
        this.levelImage;

        // killDelay was 0.7s — basically impossible for a kid to react to a
        // bandit on first sight. Bumped to 1.5s so the first encounters
        // feel fair.
        this.killDelay = 1.5;
        this.closeDurationLow = 2000;
        this.closeDurationHigh = 4000;

        this.isQuestionMode = false;
        this.questionTimer = 0;
        this.currentQuestion = null;
        this.questionText = null;
        this.instructionText = null;
        this.preguntas = [];
        this.correctDoorIndex = -1;
        this.pendingSalvation = false;
    }

    create ()
    {
        this.add.image(512, 384, 'background');

        //  Level text
        this.add.image(450, 650, 'assets', 'levelText');

        this.levelImage = this.add.image(600, 650, 'assets', '1');

        this.createGoals();
        this.createDoors();

        this.hats = this.add.group({
            defaultKey: 'assets',
            defaultFrame: 'hat',
            key: 'assets',
            frame: 'hat',
            active: false,
            visible: false,
            repeat: 32,
            maxSize: 32
        });

        this.gold = this.add.group({
            defaultKey: 'assets',
            defaultFrame: 'gold',
            key: 'assets',
            frame: 'gold',
            active: false,
            visible: false,
            repeat: 11,
            maxSize: 12
        });

        this.isPaused = false;

        this.level = 1;
        // Match the reaction-window bump from the constructor.
        this.killDelay = 1.5;
        this.closeDurationLow = 2000;
        this.closeDurationHigh = 4000;

        this.preguntas = this.registry.get('preguntasDelNivel') || [];
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.pendingSalvation = false;
        // First challenge question delayed long enough that the player has
        // already played a couple of rounds. Used to be +15s, which felt
        // like the game started ON a question.
        //
        // CRITICAL: must use `this.game.getTime()` (global loop time), NOT
        // `this.time.now`. `Scene.time.now` is the scene clock which sits at
        // 0 until the first frame's Clock.preUpdate ticks — meanwhile the
        // `time` argument passed to `Scene.update()` is the global game time
        // (already in the tens of thousands by the time the player navigates
        // through Preloader → MainMenu → here). With the scene clock, the
        // comparison `time >= this.questionTimer` was true on the very first
        // frame of the Game scene, so the door-challenge question fired
        // immediately — exactly the "los vaqueros" bug the user reported.
        this.questionTimer = this.game.getTime() + 35000;

        this.events.once('shutdown', () => {
            this.modalLocked = false;
            this.isQuestionMode = false;
            this.pendingSalvation = false;
            this.questionOverlayObjects = [];
        });

        this.questionPanel = this.add.graphics().setDepth(99).setVisible(false);

        this.questionText = this.add.text(512, 65, '', {
            fontFamily: 'Courier',
            fontSize: '26px',
            color: '#ffffff',
            padding: { x: 20, y: 12 },
            wordWrap: { width: 840, useAdvancedWrap: true },
            align: 'center',
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 6, fill: true }
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        this.instructionText = this.add.text(512, 168, '¡DISPARA A LA RESPUESTA CORRECTA!', {
            fontFamily: 'Courier',
            fontSize: '20px',
            color: '#ffd700',
            padding: { x: 12, y: 6 },
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5).setVisible(false).setDepth(100);

        // Push the first door open by 4 extra seconds. Without this the
        // first bandit can pop within 500ms — way too fast for someone
        // who just entered the scene and is still orienting themselves.
        // Bandits could shoot before the player even read the controls,
        // forcing a salvation question on the very first second.
        const startOffset = 4000;
        this.doors.forEach((door) => {
            door.start(this.game.getTime() + startOffset);
        });

        // "Prepárate" countdown so the warmup feels intentional rather
        // than the player thinking the game is broken.
        const ready = this.add.text(512, 384, '¡PREPÁRATE!', {
            fontFamily: 'Courier', fontSize: '64px', color: '#ffd700', fontStyle: 'bold',
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true }
        }).setOrigin(0.5).setDepth(150);
        this.tweens.add({
            targets: ready,
            alpha: 0,
            duration: 800,
            delay: 3000,
            onComplete: () => ready.destroy()
        });
    }

    createGoals ()
    {
        this.goals = [];
        this.goalsComplete = 0;

        for (let i = 1; i <= 12; i++)
        {
            this.goals.push(this.add.image(0, 0, 'assets', i));
        }

        Phaser.Actions.GridAlign(this.goals, {
            width: 12,
            height: 1,
            cellWidth: 80,
            cellHeight: 36,
            x: 80,
            y: 86
        });
    }

    createDoors ()
    {
        this.doors = [];

        let doorWidth = 200;
        let doorSpace = Math.floor((1024 - (doorWidth * 4)) / 5);

        let x = 100 + doorSpace;
        let y = 352;

        for (let i = 1; i <= 4; i++)
        {
            this.doors.push(new Door('Door' + i, this, x, y))

            x += doorWidth + doorSpace;
        }
    }

    addGold (x, y)
    {
        let target = this.goals[this.goalsComplete];

        let gold = this.gold.get(x + 50, y + 100);

        gold.setActive(true).setVisible(true);

        this.sound.play('money');

        this.tweens.add({
            targets: gold,
            x: target.x,
            y: target.y,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => {
                target.setVisible(false);
            }
        });

        this.goalsComplete++;

        if (this.goalsComplete === 12)
        {
            this.levelComplete();
        }
    }

    addHat (x, y, stackPosition)
    {
        y = 180 + (30 * (5 - stackPosition));

        let hat = this.hats.get(x, y);

        hat.setActive(true).setVisible(true);
        hat.setScale(1).setAlpha(1);

        const destX = Phaser.Math.RND.between(x - 400, x + 400);
        const destY = y - 400;

        this.tweens.add({
            targets: hat,
            x: destX,
            y: destY,
            angle: 960,
            duration: 1000,
            ease: 'Quad.easeOut',
            onComplete: () => {
                hat.setActive(false);
                hat.setVisible(false);
            }
        });
    }

    levelFail ()
    {
        this.isPaused = true;

        this.sign = this.add.image(512, -200, 'assets', 'gameOver');

        this.sound.play('gameOver');

        this.tweens.add({
            targets: this.sign,
            y: 384,
            ease: 'Bounce.easeOut',
            duration: 1500,
            onComplete: () => {
                this.input.once('pointerdown', () => this.scene.start('MainMenu'));
            }
        });
    }

    levelComplete ()
    {
        this.isPaused = true;

        this.sign = this.add.image(512, -200, 'assets', 'levelComplete');

        this.sound.play('levelComplete');

        this.tweens.add({
            targets: this.sign,
            y: 384,
            ease: 'Bounce.easeOut',
            duration: 1500,
            onComplete: () => {
                this.input.once('pointerdown', () => this.nextLevel());
            }
        });
    }

    nextLevel ()
    {
        this.goals.forEach((goal, index) => {
            goal.setFrame((index + 1).toString());
            goal.setVisible(true);
        });

        this.gold.getChildren().forEach((gold) => {
            gold.setVisible(false);
            gold.setActive(false);
        });

        //  Reset everything
        this.doors.forEach((door) => {
            door.reset(this.game.getTime());
        });

        this.goalsComplete = 0;

        //  Change difficulty

        if (this.level < 5)
        {
            this.killDelay -= 0.1;
        }

        if (this.level < 10)
        {
            this.closeDurationLow -= 100;
            this.closeDurationHigh -= 200;
        }

        //  Change level counter
        this.level++;

        this.levelImage.setFrame(this.level);

        this.sign.setVisible(false);

        this.isPaused = false;
    }

    killed (x, y, doorObj)
    {
        if (this.pendingSalvation) return;
        this.pendingSalvation = true;
        this.offendingDoor = doorObj;
        this.bulletHoles = [];

        let offsetX = 100;

        for (let i = 0; i < 3; i++)
        {
            let xPos = Phaser.Math.RND.between(offsetX, offsetX + 200);
            let yPos = Phaser.Math.RND.between(200, 600);

            let hole = this.add.image(xPos, yPos, 'bulletHole').setAlpha(0);
            this.bulletHoles.push(hole);

            this.tweens.add({
                targets: hole,
                alpha: 1,
                duration: 30,
                delay: 200 * i
            });

            offsetX += 340;
        }

        // Show salvation question modal instead of failing immediately
        this.time.delayedCall(1000, () => {
            this.startSalvationQuestion();
        });
    }

    startSalvationQuestion(retryCount = 0) {
        if (this.isQuestionMode || this.modalLocked) {
            // Cap retries at ~3 seconds (30 × 100ms). Without this, a stuck
            // modalLocked flag (e.g. orphaned by a scene shutdown mid-quiz)
            // would queue a delayedCall every 100ms forever, leaking Phaser
            // TimerEvents until the page is closed.
            if (retryCount >= 30) {
                this.pendingSalvation = false;
                this.levelFail();
                return;
            }
            this.time.delayedCall(100, () => {
                this.startSalvationQuestion(retryCount + 1);
            });
            return;
        }
        this.pendingSalvation = false;
        this.modalLocked = true;
        this.isQuestionMode = true;
        this.questionOverlayObjects = [];
        
        // Retrieve questions
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

        // Dark background overlay
        const bg = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.85).setDepth(200).setInteractive();
        this.questionOverlayObjects.push(bg);

        const titleText = this.add.text(cx, cy - 210, "¡PREGUNTA DE SALVACIÓN!", {
            fontFamily: 'Courier', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 120, this.currentQuestion.q, {
            fontFamily: 'Courier', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 900 }, align: 'center'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(questionText);

        // 2x2 grid — stacking 4 options vertically at btnH=120 overflowed
        // off-screen (last option at y=892, scene is 768 tall). The grid
        // also reads much better on a landscape phone where the canvas is
        // letterboxed.
        const btnW = 420;
        const btnH = 110;
        const gapX = 28;
        const gapY = 18;
        const gridX = cx - btnW - gapX / 2;
        const gridY = cy - 20;

        options.forEach((option, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const bx = gridX + col * (btnW + gapX);
            const by = gridY + row * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(201);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'Courier', fontSize: '22px', color: '#ffffff', wordWrap: { width: btnW - 30 }, align: 'center'
            }).setOrigin(0.5).setDepth(202);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
                .setDepth(203).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => this._answerSalvationQuestion(i, bx, by, btnW, btnH, btnGfx));
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

        const resultText = this.add.text(512, 630, correct ? '¡CORRECTO! CONSERVAS TU VIDA' : 'FALLASTE', {
            fontFamily: 'Courier', fontSize: '22px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(202);
        this.questionOverlayObjects.push(resultText);

        if (correct) {
            this.sound.play('levelComplete');
            this.time.delayedCall(1600, () => {
                this.questionOverlayObjects.forEach(o => o.destroy());
                this.questionOverlayObjects = [];
                
                // Clear bullet holes
                if (this.bulletHoles) {
                    this.bulletHoles.forEach(h => h.destroy());
                    this.bulletHoles = [];
                }

                // Reset the offending door
                if (this.offendingDoor) {
                    this.offendingDoor.reset(this.time.now);
                }

                this.isQuestionMode = false;
                this.modalLocked = false;
                this.isPaused = false;
            });
        } else {
            this.sound.play('gameOver');
            this.time.delayedCall(1600, () => {
                this.questionOverlayObjects.forEach(o => o.destroy());
                this.questionOverlayObjects = [];
                this.isQuestionMode = false;
                this.modalLocked = false;
                this.levelFail();
            });
        }
    }

    startQuestionEvent(time)
    {
        // Re-entrancy guard: the periodic question timer can race with a
        // door-triggered question event in the same tick.
        if (this.isQuestionMode || this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        this.isQuestionMode = true;

        // Pick random question
        const questionIndex = Phaser.Math.RND.between(0, this.preguntas.length - 1);
        this.currentQuestion = this.preguntas[questionIndex];
        
        // Force all doors to close if open
        this.doors.forEach((door) => {
            if (door.isOpen) door.closeDoor(time);
        });

        // Setup the question UI
        this.questionText.setText(this.currentQuestion.q);
        this.questionText.setVisible(true);

        // Snap instruction text directly below the question with a small gap
        const qb = this.questionText.getBounds();
        this.instructionText.setY(qb.bottom + this.instructionText.height / 2 + 6);
        this.instructionText.setVisible(true);

        // Draw single semi-transparent panel snugly wrapping both texts
        const ib = this.instructionText.getBounds();
        const px = Math.min(qb.x, ib.x) - 14;
        const py = qb.y - 14;
        const pw = Math.max(qb.right, ib.right) - px + 14;
        const ph = ib.bottom - py + 14;
        this.questionPanel.clear();
        this.questionPanel.fillStyle(0x000000, 0.65);
        this.questionPanel.fillRoundedRect(px, py, pw, ph, 10);
        this.questionPanel.lineStyle(1, 0xffffff, 0.2);
        this.questionPanel.strokeRoundedRect(px, py, pw, ph, 10);
        this.questionPanel.setVisible(true);

        // Assign answers to doors randomly
        const options = [...this.currentQuestion.options];
        const correctOption = options[this.currentQuestion.answer];
        // Shuffle options and assign to the 4 doors
        Phaser.Utils.Array.Shuffle(options);
        
        this.correctDoorIndex = options.indexOf(correctOption);

        // Open doors immediately
        this.doors.forEach((door, index) => {
            door.isOpen = true;
            door.isBandit = true;
            door.isHats = false;
            door.isDead = false;
            door.characterFrame = Phaser.Utils.Array.GetRandom(['bandit1', 'bandit2']);
            door.character.setFrame(door.characterFrame);
            door.character.setScale(1).setAlpha(1);
            door.door.play('doorOpen');
            
            door.showOption(options[index]);
            
            // Generous 30 seconds limit to shoot the door of the correct answer
            door.timeToKill = time + 30000; 
        });
    }

    answerQuestion(doorObj)
    {
        const index = this.doors.indexOf(doorObj);
        const correct = index === this.correctDoorIndex;
        if (this.currentQuestion && this.currentQuestion.id) {
            window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: this.currentQuestion.id, correct } }));
        }
        if (correct)
        {
            // Correct answer!
            this.sound.play('levelComplete');
            doorObj.shootCharacter(true); // Kill that bandit, close door
            
            // Close other doors
            this.doors.forEach((door, i) => {
                if (i !== index) {
                    door.closeDoor(this.time.now);
                }
            });

            this.questionText.setVisible(false);
            this.instructionText.setVisible(false);
            this.questionPanel.setVisible(false);

            this.isQuestionMode = false;
            this.modalLocked = false;
            // Schedule next question
            // Use the same global-time clock as the initial schedule.
            this.questionTimer = this.game.getTime() + 20000;
        }
        else
        {
            // Wrong answer!
            this.questionText.setVisible(false);
            this.instructionText.setVisible(false);
            this.questionPanel.setVisible(false);
            this.doors.forEach((door) => {
                if (door.isOpen) door.closeDoor(this.time.now);
            });
            this.isQuestionMode = false;
            this.modalLocked = false;
            doorObj.shootYou(); // This will trigger level fail
        }
    }

    update (time)
    {
        if (!this.isPaused)
        {
            if (!this.isQuestionMode && this.preguntas.length > 0 && time >= this.questionTimer)
            {
                this.startQuestionEvent(time);
            }

            if (!this.isQuestionMode) {
                this.doors.forEach((door) => {
                    door.update(time);
                });
            }
        }
    }
}
