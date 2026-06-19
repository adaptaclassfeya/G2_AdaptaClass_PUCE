// @ts-nocheck
import Phaser from 'phaser';

export default class MainMenu extends Phaser.Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.add.image(512, 384, 'background');

        const box = this.add.image(512, 384, 'box').setAlpha(0);
        const logo = this.add.image(512, -384, 'logo');

        // Fade in the box
        this.tweens.add({
            targets: box,
            alpha: 1,
            duration: 1500,
            ease: 'Power2'
        });

        // Slide and bounce the logo down
        this.tweens.add({
            targets: logo,
            y: 384,
            delay: 1000,
            duration: 1800,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                // Add a blinking helper text to click/tap to play
                const playText = this.add.text(512, 650, 'Haz click para jugar', {
                    fontFamily: 'Arial',
                    fontSize: '28px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 5
                }).setOrigin(0.5);

                this.tweens.add({
                    targets: playText,
                    alpha: 0.3,
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });

                this.input.once('pointerdown', () => {
                    playText.destroy();
                    
                    // Fade out logo and box, then start Game scene
                    this.tweens.add({
                        targets: [logo, box],
                        alpha: 0,
                        duration: 800,
                        ease: 'Power2',
                        onComplete: () => {
                            this.scene.start('Game');
                        }
                    });
                });
            }
        });
    }
}
