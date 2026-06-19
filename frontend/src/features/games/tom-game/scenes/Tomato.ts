// @ts-nocheck
import Phaser from 'phaser';

class Tomato extends Phaser.GameObjects.Sprite {
    constructor(config) {
        super(config.scene, config.x, config.y, 'tomato');

        this.scene = config.scene;
        this.scene.add.existing(this);
        this.scene.physics.world.enable(this);

        this.setScale(2);
        this.body.setSize(14, 20);
        this.body.setOffset(2, 5);
        this.body.setBounce(0.2);

        this.jumping = false;

        this.anims.play('tomato_idle');
        this.prevMov = 'tomato_idle';

        this.hitDelay = false;

        this.cursor = this.scene.input.keyboard.createCursorKeys();
        this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyZ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        this.life = 3;

    }

    update() {
        let speedMultiplier = 1.0;
        let isLeft = this.cursor.left.isDown;
        let isRight = this.cursor.right.isDown;
        let isDown = this.cursor.down.isDown;

        const joystick = (window as any).virtualJoystick;
        if (joystick && joystick.active) {
            isLeft = joystick.dx < -0.15;
            isRight = joystick.dx > 0.15;
            isDown = joystick.dy > 0.4;
            speedMultiplier = Math.abs(joystick.dx);
        }

        if(isLeft) {
            this.body.setVelocityX(-200 * speedMultiplier);
            this.flipX = true;
            if(this.prevMov !== 'left' && !this.jumping) {
                this.prevMov = 'left';
                this.anims.play('tomato_walk');
            }
        } else if(isRight) {
            this.body.setVelocityX(200 * speedMultiplier);
            this.flipX = false;
            if(this.prevMov !== 'right' && !this.jumping) {
                this.prevMov = 'right';
                this.anims.play('tomato_walk');
            }

        } else if(isDown && !this.jumping) {
            this.body.setVelocityX(0);
            this.body.setSize(14, 15);
            this.body.setOffset(2, 10);

            if(this.prevMov !== 'down' && !this.jumping) {
                this.prevMov = 'down';
                this.anims.play('tomato_down');
            }

        }
        else {
            this.body.setVelocityX(0);
            this.body.setSize(14, 20);
            this.body.setOffset(2, 5);
            if(this.prevMov !== 'tomato_idle' && !this.jumping) {
                this.prevMov = 'tomato_idle';
                this.anims.play('tomato_idle');
            }
        }

        const isJumpJustPressed = Phaser.Input.Keyboard.JustDown(this.cursor.up) || 
                                  Phaser.Input.Keyboard.JustDown(this.keySpace) || 
                                  Phaser.Input.Keyboard.JustDown(this.keyZ);
        if(isJumpJustPressed && !this.jumping) {
            this.jumping = true;
            this.body.setVelocityY(-800);
            if(this.prevMov !== 'jump') {
                this.prevMov = 'jump';
                this.anims.play('tomato_jump');
            }
        } else if(this.body.blocked.down) {
            this.jumping = false;
        }
    }

    bombCollision() {
        if(!this.hitDelay) {
            this.hitDelay = true;

            this.scene.sound.play('draw');
            this.life--;
            this.scene.registry.events.emit('remove_life');

            if(this.life === 0) {
                this.scene.registry.events.emit('game_over');
            }

            this.setTint(0x1abc9c);
            this.scene.time.addEvent({
                delay: 600,
                callback: () => {
                    this.hitDelay = false;
                    this.clearTint();
                }
            });
        }
    }
}

export default Tomato;