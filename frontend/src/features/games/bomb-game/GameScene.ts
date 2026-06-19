/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private stars!: Phaser.Physics.Arcade.Group;
    private bombs!: Phaser.Physics.Arcade.Group;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyZ?: Phaser.Input.Keyboard.Key;

    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private gameOver: boolean = false;

    private questions: any[] = [];
    private questionModalGroup!: Phaser.GameObjects.Group;
    private isQuestionActive: boolean = false;

    // Controles táctiles virtuales
    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private jump: boolean = false;

    // Nuevas propiedades
    private hp: number = 2;
    private heartsGroup!: Phaser.GameObjects.Group;
    
    private baddiesGroup!: Phaser.Physics.Arcade.Group;
    private aidGroup!: Phaser.Physics.Arcade.Group;
    
    private badboomSnd!: Phaser.Sound.BaseSound;
    private aidboomSnd!: Phaser.Sound.BaseSound;

    private bombCount: number = 0;
    private platformData: { y: number, x: number, width: number, hasBaddie: boolean, isGround: boolean }[] = [];
    private groundBaddies: number = 0;

    private questionSource: 'bomb' | 'aid' | null = null;
    private activeAid: any = null;
    private activeBomb: any = null;

    private isPaused: boolean = false;
    private pauseMenuGroup!: Phaser.GameObjects.Group;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { preguntasDelNivel: any[] }) {
        this.questions = data.preguntasDelNivel || [];
        this.score = 0;
        this.gameOver = false;
        this.isQuestionActive = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.jump = false;

        this.hp = 2;
        this.bombCount = 0;
        this.platformData = [];
        this.groundBaddies = 0;
        this.questionSource = null;
        this.activeAid = null;
        this.activeBomb = null;
        this.isPaused = false;
    }

    preload() {
        this.load.image('sky', '/assets/games/bomb-game/sky.png');
        this.load.image('ground', '/assets/games/bomb-game/platform.png');
        this.load.image('star', '/assets/games/bomb-game/star.png');
        this.load.image('bomb', '/assets/games/bomb-game/bomb.png');
        this.load.spritesheet('dude', '/assets/games/bomb-game/dude2.png', { frameWidth: 32, frameHeight: 48 });

        // Nuevos recursos
        this.load.image('heart', '/assets/games/bomb-game/heart.png');
        this.load.image('aid', '/assets/games/bomb-game/firstaid.png');
        this.load.spritesheet('baddie', '/assets/games/bomb-game/baddie.png', { frameWidth: 32, frameHeight: 32 });
        this.load.audio('badboom', '/assets/games/bomb-game/badboom.mp3');
        this.load.audio('aidboom', '/assets/games/bomb-game/aidboom.mp3');
    }

    create() {
        this.add.image(400, 400, 'sky').setDisplaySize(800, 800);

        this.platforms = this.physics.add.staticGroup();
        
        this.platforms.create(400, 768, 'ground').setScale(2).refreshBody();
        this.platformData.push({ y: 768, x: 400, width: 800, hasBaddie: false, isGround: true });

        this.platforms.create(600, 600, 'ground');
        this.platformData.push({ y: 600, x: 600, width: 400, hasBaddie: false, isGround: false });

        this.platforms.create(50, 450, 'ground');
        this.platformData.push({ y: 450, x: 50, width: 400, hasBaddie: false, isGround: false });

        this.platforms.create(750, 420, 'ground');
        this.platformData.push({ y: 420, x: 750, width: 400, hasBaddie: false, isGround: false });

        // Ordenar plataformas de arriba hacia abajo (menor Y a mayor Y) para spawns
        this.platformData.sort((a, b) => a.y - b.y);

        this.player = this.physics.add.sprite(100, 650, 'dude');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);

        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        // Animaciones Enemigo
        this.anims.create({
            key: 'baddie_left',
            frames: this.anims.generateFrameNumbers('baddie', { start: 0, end: 1 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'baddie_right',
            frames: this.anims.generateFrameNumbers('baddie', { start: 2, end: 3 }),
            frameRate: 10,
            repeat: -1
        });

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        }

        this.stars = this.physics.add.group({
            key: 'star',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 70 }
        });

        this.stars.children.forEach((child: any) => {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        });

        this.bombs = this.physics.add.group();
        this.baddiesGroup = this.physics.add.group();
        this.aidGroup = this.physics.add.group();

        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', color: '#000' });
        
        // Crear corazones (UI)
        this.heartsGroup = this.add.group();
        for (let i = 0; i < 2; i++) {
            this.heartsGroup.create(650 + (i * 40), 30, 'heart').setScale(1.5).setScrollFactor(0);
        }

        this.badboomSnd = this.sound.add('badboom');
        this.aidboomSnd = this.sound.add('aidboom');

        this.questionModalGroup = this.add.group();
        this.pauseMenuGroup = this.add.group();

        // Removed the in-scene pause button. The wrapper already pins a
        // pause control in the chrome and duplicating it inside the canvas
        // confused testers (and the on-canvas button overlapped the score).

        // ESC key to toggle pause
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-ESC', () => {
                if (this.gameOver || this.isQuestionActive) return;
                if (this.isPaused) {
                    this.hidePauseMenu();
                } else {
                    this.showPauseMenu();
                }
            });
        }

        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.stars, this.platforms);
        this.physics.add.collider(this.bombs, this.platforms);
        this.physics.add.collider(this.baddiesGroup, this.platforms);
        this.physics.add.collider(this.aidGroup, this.platforms);

        this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);
        this.physics.add.collider(this.player, this.bombs, this.hitBomb, undefined, this);
        this.physics.add.overlap(this.player, this.baddiesGroup, this.hitBaddie, undefined, this);
        this.physics.add.overlap(this.player, this.aidGroup, this.hitAid, undefined, this);

        this.input.addPointer(2);
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isQuestionActive || this.gameOver) return;
            const third = this.scale.width / 3;
            if (pointer.x < third) this.moveLeft = true;
            else if (pointer.x > third * 2) this.moveRight = true;
            else if (this.player.body?.touching.down) this.jump = true;
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const third = this.scale.width / 3;
            if (pointer.x < third) this.moveLeft = false;
            else if (pointer.x > third * 2) this.moveRight = false;
            else this.jump = false;
        });
    }

    update() {
        if (this.gameOver || this.isQuestionActive || this.isPaused) {
            if (this.isQuestionActive && this.player) {
                this.player.setVelocityX(0);
                this.player.anims.play('turn');
            }
            return;
        }

        let speedMultiplier = 1.0;
        let isLeft = this.cursors && this.cursors.left.isDown;
        let isRight = this.cursors && this.cursors.right.isDown;
        const isUp = (this.cursors && (this.cursors.space.isDown || this.cursors.up.isDown)) || (this.keyZ && this.keyZ.isDown) || this.jump;

        const joystick = (window as any).virtualJoystick;
        if (joystick && joystick.active) {
            isLeft = joystick.dx < -0.15;
            isRight = joystick.dx > 0.15;
            speedMultiplier = Math.abs(joystick.dx);
        } else {
            isLeft = isLeft || this.moveLeft;
            isRight = isRight || this.moveRight;
        }

        if (isLeft) {
            this.player.setVelocityX(-160 * speedMultiplier);
            this.player.anims.play('left', true);
        } else if (isRight) {
            this.player.setVelocityX(160 * speedMultiplier);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (isUp && this.player.body?.touching.down) {
            this.player.setVelocityY(-330);
            this.jump = false;
        }

        // Baddies patrol logic
        this.baddiesGroup.getChildren().forEach((b: any) => {
            const minX = b.getData('minX');
            const maxX = b.getData('maxX');
            let dir = b.getData('dir') || 1; // 1 = right, -1 = left
            
            if (b.x <= minX) {
                dir = 1;
            } else if (b.x >= maxX) {
                dir = -1;
            }
            
            b.setData('dir', dir);
            b.setVelocityX(100 * dir);

            if (dir > 0) {
                b.anims.play('baddie_right', true);
            } else {
                b.anims.play('baddie_left', true);
            }
        });
    }

    private spawnBaddie() {
        let targetPlat = null;
        for (let p of this.platformData) {
            if (!p.isGround && !p.hasBaddie) {
                targetPlat = p;
                break;
            }
        }
        
        if (!targetPlat) {
            let groundPlat = this.platformData.find(p => p.isGround);
            if (groundPlat && this.groundBaddies < 2) {
                targetPlat = groundPlat;
                this.groundBaddies++;
            }
        }

        if (targetPlat) {
            if (!targetPlat.isGround) {
                targetPlat.hasBaddie = true;
            }
            const padding = 16;
            let minX = targetPlat.x - targetPlat.width / 2 + padding;
            let maxX = targetPlat.x + targetPlat.width / 2 - padding;

            // Asegurarnos de que minX y maxX no estén fuera de los límites del mundo
            if (minX < 16) minX = 16;
            if (maxX > 800 - 16) maxX = 800 - 16;

            let spawnX = Phaser.Math.Between(minX, maxX);
            let baddie = this.baddiesGroup.create(spawnX, targetPlat.y - 40, 'baddie');
            
            baddie.setCollideWorldBounds(true);
            baddie.setData('dir', 1);
            baddie.setVelocityX(100);
            baddie.setData('minX', minX);
            baddie.setData('maxX', maxX);
            baddie.setData('platform', targetPlat);
        }
    }

    private spawnAid() {
        let p = Phaser.Utils.Array.GetRandom(this.platformData);
        let padding = 16;
        let minX = p.x - p.width / 2 + padding;
        let maxX = p.x + p.width / 2 - padding;
        let spawnX = Phaser.Math.Between(minX, maxX);

        let aid = this.aidGroup.create(spawnX, p.y - 40, 'aid');
        aid.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
    }

    private collectStar(_player: any, star: any) {
        if (this.isQuestionActive || this.gameOver) return;
        star.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);

        if (this.stars.countActive(true) === 0) {
            this.stars.children.forEach((child: any) => {
                child.enableBody(true, child.x, 0, true, true);
            });

            let x = (this.player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
            let bomb = this.bombs.create(x, 16, 'bomb');
            bomb.setBounce(1);
            bomb.setCollideWorldBounds(true);
            bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);

            this.bombCount++;

            // Cada 2 bombas: spawn baddie
            if (this.bombCount % 2 === 0) {
                this.spawnBaddie();
            }

            // Cada 3 bombas: spawn aid
            if (this.bombCount % 3 === 0) {
                this.spawnAid();
            }
        }
    }

    private loseHeart() {
        if (this.hp > 0) {
            this.hp--;
            let heartsArray = this.heartsGroup.getChildren();
            if (heartsArray[this.hp]) {
                (heartsArray[this.hp] as Phaser.GameObjects.Sprite).setVisible(false);
            }
        }
        
        if (this.hp <= 0) {
            this.triggerGameOver('¡Te quedaste sin vidas!');
        }
    }

    private hitBaddie(_player: any, baddie: any) {
        if (this.isQuestionActive || this.gameOver) return;

        this.badboomSnd.play();
        
        let plat = baddie.getData('platform');
        if (plat) {
            if (plat.isGround) this.groundBaddies--;
            else plat.hasBaddie = false;
        }

        baddie.destroy();
        this.loseHeart();
    }

    private hitAid(_player: any, aid: any) {
        if (this.isQuestionActive || this.gameOver) return;
        
        this.physics.pause();
        this.player.setTint(0x00ff00);
        this.player.anims.play('turn');

        this.isQuestionActive = true;
        this.questionSource = 'aid';
        this.activeAid = aid;
        this.showQuestion();
    }

    private hitBomb(_player: any, bomb: any) {
        if (this.isQuestionActive || this.gameOver) return;

        this.physics.pause();
        this.player.setTint(0xff0000);
        this.player.anims.play('turn');

        this.isQuestionActive = true;
        this.questionSource = 'bomb';
        this.activeBomb = bomb;
        this.showQuestion();
    }

    private resumeGame() {
        this.isQuestionActive = false;
        this.questionSource = null;
        this.activeAid = null;
        this.activeBomb = null;
        this.player.clearTint();
        this.physics.resume();
    }

    private showPauseMenu() {
        if (this.isPaused) return;
        this.isPaused = true;
        this.physics.pause();

        const overlay = this.add.rectangle(400, 400, 800, 800, 0x000000, 0.75);
        this.pauseMenuGroup.add(overlay);

        const title = this.add.text(400, 250, 'PAUSA', {
            fontSize: '56px', color: '#00e5ff', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        this.pauseMenuGroup.add(title);

        // Continuar button
        const continueBtn = this.add.rectangle(400, 370, 280, 60, 0x6366f1).setInteractive();
        const continueTxt = this.add.text(400, 370, 'Continuar', {
            fontSize: '26px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.pauseMenuGroup.add(continueBtn);
        this.pauseMenuGroup.add(continueTxt);
        continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x4f46e5));
        continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x6366f1));
        continueBtn.on('pointerdown', () => this.hidePauseMenu());

        // Volver a la página principal button
        const homeBtn = this.add.rectangle(400, 460, 340, 60, 0x374151).setInteractive();
        const homeTxt = this.add.text(400, 460, 'Volver al inicio', {
            fontSize: '22px', color: '#d1d5db'
        }).setOrigin(0.5);
        this.pauseMenuGroup.add(homeBtn);
        this.pauseMenuGroup.add(homeTxt);
        homeBtn.on('pointerover', () => homeBtn.setFillStyle(0x4b5563));
        homeBtn.on('pointerout', () => homeBtn.setFillStyle(0x374151));
        homeBtn.on('pointerdown', () => {
            this.game.destroy(true);
            window.dispatchEvent(new Event('game:quit'));
        });
    }

    private hidePauseMenu() {
        this.pauseMenuGroup.clear(true, true);
        this.isPaused = false;
        this.physics.resume();
    }

    private showWrongFeedback(correctAnswer: string, onContinue: () => void) {
        let overlay = this.add.rectangle(400, 400, 800, 800, 0x000000, 0.9);
        this.questionModalGroup.add(overlay);

        let titleText = this.add.text(400, 250, '¡Respuesta Incorrecta!', {
            fontSize: '48px', color: '#ff0000', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.questionModalGroup.add(titleText);

        let ansText = this.add.text(400, 370, 'La respuesta correcta era:\n' + correctAnswer, {
            fontSize: '28px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);
        this.questionModalGroup.add(ansText);

        let continueBtn = this.add.rectangle(400, 500, 300, 60, 0x27ae60).setInteractive();
        let continueText = this.add.text(400, 500, 'CONTINUAR', {
            fontSize: '24px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.questionModalGroup.add(continueBtn);
        this.questionModalGroup.add(continueText);

        continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x2ecc71));
        continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x27ae60));
        continueBtn.on('pointerdown', () => {
            this.questionModalGroup.clear(true, true);
            onContinue();
        });
    }

    private triggerGameOver(reason: string) {
        this.gameOver = true;
        this.physics.pause();
        
        this.add.rectangle(400, 400, 800, 800, 0x000000, 0.9);
        this.add.text(400, 250, 'GAME OVER', {
            fontSize: '64px', color: '#ff0000', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(400, 370, reason, {
            fontSize: '28px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        let retryBtn = this.add.rectangle(400, 500, 300, 60, 0x27ae60).setInteractive();
        this.add.text(400, 500, 'REINTENTAR JUEGO', {
            fontSize: '24px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);

        retryBtn.on('pointerover', () => retryBtn.setFillStyle(0x2ecc71));
        retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x27ae60));

        retryBtn.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    private showQuestion() {
        // Re-entrancy guard: bomb + aid pickups can resolve on the same
        // physics tick (player runs into both at once) before isQuestionActive
        // propagates to the second callback. Bail if a modal is already up.
        if (this.questionModalGroup && this.questionModalGroup.getLength() > 0) {
            return;
        }
        const qData = Phaser.Utils.Array.GetRandom(this.questions);
        if (!qData) {
            this.resumeGame();
            return;
        }

        let overlay = this.add.rectangle(400, 400, 800, 800, 0x000000, 0.8);
        this.questionModalGroup.add(overlay);

        let qText = this.add.text(400, 200, qData.q, {
            fontSize: '34px', color: '#fff', align: 'center', fontStyle: 'bold', wordWrap: { width: 700 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
        this.questionModalGroup.add(qText);

        for (let i = 0; i < qData.options.length; i++) {
            let yPos = 350 + (i * 80);

            let btnBg = this.add.rectangle(400, yPos, 500, 64, 0x1e293b).setInteractive();
            let label = String.fromCharCode(65 + i);
            let btnText = this.add.text(400, yPos, `${label}) ${qData.options[i]}`, {
                fontSize: '26px', color: '#fff', fontStyle: 'bold', align: 'center', wordWrap: { width: 480 }
            }).setOrigin(0.5);

            this.questionModalGroup.add(btnBg);
            this.questionModalGroup.add(btnText);

            btnBg.on('pointerover', () => btnBg.setFillStyle(0x334155));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x1e293b));

            btnBg.on('pointerdown', () => {
                this.questionModalGroup.getChildren().forEach(obj => {
                    obj.disableInteractive();
                });

                this.time.delayedCall(50, () => {
                    this.questionModalGroup.clear(true, true);
                    
                    const isCorrect = i === qData.answer;
                    if (qData && qData.id) {
                        window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: qData.id, correct: isCorrect } }));
                    }

                    if (isCorrect) {
                        // Respuesta Correcta
                        if (this.questionSource === 'aid') {
                            this.aidboomSnd.play();
                            if (this.hp < 2) {
                                let heartsArray = this.heartsGroup.getChildren();
                                (heartsArray[this.hp] as Phaser.GameObjects.Sprite).setVisible(true);
                                this.hp++;
                            }
                            if (this.activeAid) this.activeAid.destroy();
                        } else if (this.questionSource === 'bomb') {
                            if (this.activeBomb) this.activeBomb.destroy();
                        }
                        this.resumeGame();
                    } else {
                        // Respuesta Incorrecta
                        const correctAnswer = qData.options[qData.answer];

                        if (this.questionSource === 'bomb') {
                            this.showWrongFeedback(correctAnswer, () => {
                                if (this.activeBomb) this.activeBomb.destroy();
                                this.loseHeart();
                                if (this.hp > 0) {
                                    this.resumeGame();
                                }
                            });
                        } else if (this.questionSource === 'aid') {
                            this.showWrongFeedback(correctAnswer, () => {
                                if (this.activeAid) this.activeAid.destroy();
                                this.resumeGame();
                            });
                        }
                    }
                });
            });
        }
    }
}
