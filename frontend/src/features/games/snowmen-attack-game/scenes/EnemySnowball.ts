// @ts-nocheck
import Phaser from 'phaser';

export default class EnemySnowball extends Phaser.Physics.Arcade.Sprite
{
    constructor (scene, x, y, key, frame)
    {
        super(scene, x, y, key, frame);

        this.setScale(0.5);
    }

    fire (x, y)
    {
        this.body.enable = true;
        this.body.reset(x + 10, y - 44);

        this.setActive(true);
        this.setVisible(true);

        const score = this.scene.score || 0;
        const timeMultiplier = 1 + Math.min(score * 0.005, 1.5);
        const baseSpeed = Phaser.Math.Between(150, 250);
        this.setVelocityX(baseSpeed * timeMultiplier);
    }

    stop ()
    {
        this.setActive(false);
        this.setVisible(false);

        this.setVelocityX(0);

        this.body.enable = false;
    }

    preUpdate (time, delta)
    {
        super.preUpdate(time, delta);

        if (this.x >= 970)
        {
            this.stop();

            this.scene.gameOver();
        }
    }
}
