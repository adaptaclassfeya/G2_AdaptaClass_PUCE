// @ts-nocheck
import Phaser from 'phaser';

export default class Pickups extends Phaser.Physics.Arcade.Group
{
    constructor (world, scene)
    {
        super(world, scene);

        this.outer = new Phaser.Geom.Rectangle(64, 64, 896, 640);
        this.target = new Phaser.Math.Vector2();
    }

    start ()
    {
        this.create(512, 128, 'assets', 'ring');
        this.create(128, 486, 'assets', 'ring');
        this.create(896, 486, 'assets', 'ring');
        this.create(384, 640, 'assets', 'ring');
        this.create(640, 640, 'assets', 'ring');
    }

    collect (pickup)
    {
        //  Move the pick-up to a new location

        this.outer.getRandomPoint(this.target);

        pickup.body.reset(this.target.x, this.target.y);
    }
}
