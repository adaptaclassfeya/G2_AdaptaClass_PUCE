// @ts-nocheck
import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite
{
    constructor (scene, track)
    {
        super(scene, 900, track.y, 'sprites', 'idle000');

        this.setOrigin(0.5, 1);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.isAlive = true;
        this.isThrowing = false;

        this.sound = scene.sound;
        this.currentTrack = track;

        this.spacebar = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.up = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.down = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyZ = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

        this._prevGamepadA = false;
        this._prevGamepadUp = false;
        this._prevGamepadDown = false;

        this.play('idle');


    }

    start ()
    {
        this.isAlive = true;
        this.isThrowing = false;

        this.currentTrack = this.scene.tracks[0];
        this.y = this.currentTrack.y;
    
        this.on('animationcomplete-throwStart', this.releaseSnowball, this);
        this.on('animationcomplete-throwEnd', this.throwComplete, this);

        this.play('idle', true);
    }

    moveUp ()
    {
        if (this.currentTrack.id === 0)
        {
            this.currentTrack = this.scene.tracks[3];
        }
        else
        {
            this.currentTrack = this.scene.tracks[this.currentTrack.id - 1];
        }

        this.y = this.currentTrack.y;

        this.sound.play('move');
    }

    moveDown ()
    {
        if (this.currentTrack.id === 3)
        {
            this.currentTrack = this.scene.tracks[0];
        }
        else
        {
            this.currentTrack = this.scene.tracks[this.currentTrack.id + 1];
        }

        this.y = this.currentTrack.y;

        this.sound.play('move');
    }

    throw ()
    {
        this.isThrowing = true;

        this.play('throwStart');

        this.sound.play('throw');
    }

    releaseSnowball ()
    {
        this.play('throwEnd');

        this.currentTrack.throwPlayerSnowball(this.x);

        if (this.scene.doubleThrowActive)
        {
            this.scene.time.delayedCall(100, () => {
                this.currentTrack.throwPlayerSnowball(this.x);
            });
        }
    }

    throwComplete ()
    {
        this.isThrowing = false;

        this.play('idle');
    }

    stop ()
    {
        this.isAlive = false;

        this.body.stop();

        this.play('die');


    }

    preUpdate (time, delta)
    {
        super.preUpdate(time, delta);

        if (!this.isAlive || this.scene.isQuestionMode)
        {
            return;
        }

        // Virtual gamepad rising-edge reads. Synthetic KeyboardEvents that
        // the wrapper dispatches don't reliably reach Phaser's keyboard
        // system on mobile, so for the D-pad we read the boolean flags
        // directly — same pattern that already works for the A button.
        const gamepad = (window as any).virtualGamepad;
        const gA = !!(gamepad && gamepad.A);
        const gUp = !!(gamepad && gamepad.up);
        const gDown = !!(gamepad && gamepad.down);

        // Drain the keyboard JustDown flags every frame so the desktop
        // keyboard path can't double-fire with the gamepad rising edge
        // when synthetic events DO happen to reach Phaser.
        const kUp = Phaser.Input.Keyboard.JustDown(this.up);
        const kDown = Phaser.Input.Keyboard.JustDown(this.down);
        const kSpace = Phaser.Input.Keyboard.JustDown(this.spacebar);
        const kZ = Phaser.Input.Keyboard.JustDown(this.keyZ);

        const wantUp = (gUp && !this._prevGamepadUp) || (!gUp && kUp);
        const wantDown = (gDown && !this._prevGamepadDown) || (!gDown && kDown);
        const wantThrow = (gA && !this._prevGamepadA) || (!gA && (kSpace || kZ));

        if (wantUp)
        {
            this.moveUp();
        }
        else if (wantDown)
        {
            this.moveDown();
        }
        else if (wantThrow && !this.isThrowing)
        {
            this.throw();
        }

        this._prevGamepadA = gA;
        this._prevGamepadUp = gUp;
        this._prevGamepadDown = gDown;
    }
}
