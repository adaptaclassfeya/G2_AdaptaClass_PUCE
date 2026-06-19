// @ts-nocheck
import Phaser from 'phaser';
import { SCENE_KEYS } from '../game/types';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MainMenu);
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x1a0a00);

    this.add.text(cam.centerX, cam.centerY - 80, 'PIRATE SURVIVAL', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#f59e0b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cam.centerX, cam.centerY - 20, 'Beat-Em-Up', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    const playButton = this.add
      .text(cam.centerX, cam.centerY + 60, '[ JUGAR ]', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playButton.on('pointerover', () => playButton.setColor('#facc15'));
    playButton.on('pointerout',  () => playButton.setColor('#ffffff'));
    playButton.on('pointerdown', () => this.scene.start(SCENE_KEYS.Game));

    this.add.text(cam.centerX, cam.centerY + 130, 'WASD / Flechas para mover  •  Z para atacar', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.add.text(cam.centerX, cam.centerY + 154, 'ESC para volver al menú', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start(SCENE_KEYS.Game));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start(SCENE_KEYS.Game));
  }
}
