// @ts-nocheck
import Phaser from 'phaser';
import { SCENE_KEYS } from '../game/types';

const CHAR_FRAME_SIZE = 256;
const PIRATE_ANIMS  = ['idle', 'walk', 'attack', 'hurt', 'jump', 'death'];
const SKELETON_ANIMS = ['idle', 'walk', 'attack', 'hurt', 'death'];

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  preload() {
    this.load.image('pirate-background', '/assets/games/pirate-survival/backgrounds/fondo numero 1.png');
    
    // Story Assets
    this.load.image('story-bg', '/assets/games/pirate-survival/story/fondo.png');
    this.load.image('story-pirate', '/assets/games/pirate-survival/story/pirate.png');
    this.load.image('story-skeleton', '/assets/games/pirate-survival/story/skeleton.png');

    // Audio Assets
    this.load.audio('bgm-right', '/assets/games/pirate-survival/sounds/right.ogg');
    this.load.audio('sfx-gaviotas', '/assets/games/pirate-survival/sounds/gaviotas.ogg');
    this.load.audio('sfx-sword', '/assets/games/pirate-survival/sounds/sword.mp3');
    this.load.audio('sfx-heartbeat', '/assets/games/pirate-survival/sounds/heartbeat.mp3');
    this.load.audio('sfx-death', '/assets/games/pirate-survival/sounds/player_death.wav');
    this.load.audio('sfx-skeleton', '/assets/games/pirate-survival/sounds/sonidoesqueleto.mp3');
    this.load.audio('sfx-meow', '/assets/games/pirate-survival/sounds/meow1.mp3');

    // Item Assets
    this.load.image('item-ATTACK', '/assets/games/pirate-survival/items/ATTACK.jpg');
    this.load.image('item-VELOCIDAD', '/assets/games/pirate-survival/items/VELOCIDAD.jpg');
    this.load.image('item-VIDA', '/assets/games/pirate-survival/items/VIDA.jpg');

    for (const anim of PIRATE_ANIMS) {
      this.load.spritesheet(
        `lobit-pirate-${anim}`,
        `/assets/games/pirate-survival/lobit/pirate/animations/w/${anim}/spritesheet.png`,
        { frameWidth: CHAR_FRAME_SIZE, frameHeight: CHAR_FRAME_SIZE }
      );
    }

    for (const anim of SKELETON_ANIMS) {
      this.load.spritesheet(
        `lobit-skeleton-${anim}`,
        `/assets/games/pirate-survival/lobit/skeleton/animations/w/${anim}/spritesheet.png`,
        { frameWidth: CHAR_FRAME_SIZE, frameHeight: CHAR_FRAME_SIZE }
      );
    }
  }

  create() {
    this.scene.start('StoryScene');
  }
}
