// @ts-nocheck
import Phaser from 'phaser';

class TomatoItem extends Phaser.Physics.Arcade.StaticGroup
{
    constructor (config)
    {
        super(config.physicsWorld, config.scene);
        this.addTomatoItem();
    }

    addTomatoItem ()
    {
        this.create(
            Phaser.Math.Between(50, this.scene.scale.width - 50),
            Phaser.Math.Between(150, this.scene.scale.height - 70),
            'tomato_item'
        );
    }

    destroyItem ()
    {
        const first = this.getChildren()[0];
        if (first) first.destroy();
        this.addTomatoItem();
    }

}

export default TomatoItem;
