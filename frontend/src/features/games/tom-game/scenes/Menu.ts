// @ts-nocheck
import Phaser from 'phaser';

// Per-user localStorage key for the best score. Using a flat
// "best_points" key meant teachers in preview and any other student on
// the same browser saw each other's high score — confusing and made
// students think their progress was tied to the teacher's preview.
function bestPointsKey() {
    try {
        const raw = localStorage.getItem('user');
        if (raw) {
            const user = JSON.parse(raw);
            if (user?.id) return `tom_best_points_${user.id}`;
        }
    } catch {
        // Fall through to anonymous key
    }
    return 'tom_best_points_anon';
}

class Menu extends Phaser.Scene
{
    constructor ()
    {
        super({
            key: 'Menu'
        });
    }

    init (data)
    {
        this.points = 0;

        if(Object.keys(data).length !== 0)
        {
            this.points = data.points;
        }

    }

    create ()
    {

        const pointsDB = localStorage.getItem(bestPointsKey());
        this.betsPoints = (pointsDB !== null) ? pointsDB : 0;

        this.add.image(0, 0, 'background').setOrigin(0);

        this.add.image(0, 0, 'wall')
            .setOrigin(0);
        this.add.image(this.scale.width, 0, 'wall')
            .setOrigin(1, 0)
            .setFlipX(true);

        this.add.image(0, this.scale.height, 'floor')
            .setOrigin(0, 1);

        this.logoMenu = this.add.image(
            this.scale.width/2,
            this.scale.height/2,
            'logo'
        ).setScale(2).setInteractive();

        this.pointsText = this.add.bitmapText(
            this.scale.width/2,
            this.scale.height - 100,
            'pixelFont',
            'POINTS ' + this.points
        ).setDepth(2).setOrigin(0.5);

        this.bestPointsText = this.add.bitmapText(
            this.scale.width/2,
            this.scale.height - 80,
            'pixelFont',
            'BEST ' + this.betsPoints
        ).setDepth(2).setOrigin(0.5);



        this.logoMenu.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.add.tween({
                targets: this.logoMenu,
                ease: 'Bounce.easeIn',
                y: -200,
                duration: 1000,
                onComplete: () => {
                    this.scene.start('Play');
                }
            });

            this.add.tween({
                targets: [ this.pointsText, this.bestPointsText ],
                ease: 'Bounce.easeIn',
                y: 400,
                duration: 1000
            });
        });

        if(this.points > this.betsPoints) {
            localStorage.setItem(bestPointsKey(), this.points);
        }
    }
}

export default Menu;
