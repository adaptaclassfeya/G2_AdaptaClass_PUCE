// @ts-nocheck
import Phaser from 'phaser';
import { SCENE_KEYS } from '../game/types';
import { Skeleton } from '../game/Skeleton';

const FRAME_SIZE    = 256;
const PIRATE_ORIGIN = { x: 0.5, y: 0.996 };

const CHAR_SCALE    = 0.75;
const DISPLAY_FRAME = FRAME_SIZE * CHAR_SCALE;

const PLAYER_SPEED    = 240 * CHAR_SCALE;
const KNOCKBACK_SPEED = 480 * CHAR_SCALE;
const KNOCKBACK_DECAY = 5;

const PLAYER_SPEED_SCALE_PER_ROUND = 0.02;
const MAX_PLAYER_SPEED_MULT        = 2.2;

const P_HITBOX_W = 60  * CHAR_SCALE;
const P_HITBOX_H = 155 * CHAR_SCALE;

const P_ATK_W        = 130 * CHAR_SCALE;
const P_ATK_H        = 58  * CHAR_SCALE;
const P_ATK_INNER    = 40  * CHAR_SCALE;
const P_ATK_VERT_CEN = 135 * CHAR_SCALE;

const PLAYER_MAX_HEALTH      = 5;
const PLAYER_IFRAME_DURATION = 1.0;
const PLAYER_IFRAME_BLINK    = 0.08;

const HITSTOP_ENEMY_HURT  = 0.06;
const HITSTOP_ENEMY_DEATH = 0.14;
const HITSTOP_PLAYER_HURT = 0.07;

const SHAKE_ENEMY_HURT  = { duration: 70,  intensity: 0.003 };
const SHAKE_ENEMY_DEATH = { duration: 180, intensity: 0.006 };
const SHAKE_PLAYER_HURT = { duration: 110, intensity: 0.004 };

const FLASH_DURATION = 0.16;
const FLASH_ALPHA    = 0.55;

const HUD_Y         = 24;
const HUD_X         = 24;
const HUD_BAR_X     = 64;
const HUD_BAR_W     = 200;
const HUD_BAR_H     = 22;
const HUD_COUNTER_X = HUD_BAR_X + HUD_BAR_W + 8;
const HUD_ROUND_X   = HUD_COUNTER_X + 68;

const WAVE_CONFIG = {
  FIRST_ROUND_ENEMIES:         1,
  MAX_ENEMIES_PER_ROUND:       30,
  BASE_SPAWN_STAGGER:          0.75,
  MIN_SPAWN_STAGGER:           0.30,
  STAGGER_REDUCE_PER_ROUND:    0.04,
  ROUND_INTRO_DURATION:        2.4,
  ROUND_COMPLETE_DURATION:     2.0,
  SPEED_SCALE_PER_ROUND:       0.03,
  MAX_SPEED_MULTIPLIER:        2.2,
  HEALTH_BONUS_EVERY_N_ROUNDS: 4,
  MAX_ENEMY_HEALTH:            9,
};

const ANIM_CONFIG = [
  { action: 'idle',   frames: 10, fps:  6, loop: true  },
  { action: 'walk',   frames:  9, fps: 10, loop: true  },
  { action: 'attack', frames:  8, fps: 10, loop: false },
  { action: 'hurt',   frames:  6, fps:  8, loop: false },
  { action: 'jump',   frames:  6, fps:  8, loop: false },
  { action: 'death',  frames: 10, fps:  8, loop: false },
];

function getEnemyCount(round) {
  return Math.floor((round - 1) / 2) + 1;
}

function getRoundDifficulty(round) {
  const speedMultiplier = Math.min(1.0 + (round - 1) * WAVE_CONFIG.SPEED_SCALE_PER_ROUND, WAVE_CONFIG.MAX_SPEED_MULTIPLIER);
  const maxHealth       = Math.min(3 + Math.floor((round - 1) / WAVE_CONFIG.HEALTH_BONUS_EVERY_N_ROUNDS), WAVE_CONFIG.MAX_ENEMY_HEALTH);
  return { speedMultiplier, maxHealth };
}

function getPlayerSpeed(round) {
  return PLAYER_SPEED * Math.min(1.0 + (round - 1) * PLAYER_SPEED_SCALE_PER_ROUND, MAX_PLAYER_SPEED_MULT);
}

function getSpawnStagger(round) {
  return Math.max(WAVE_CONFIG.MIN_SPAWN_STAGGER, WAVE_CONFIG.BASE_SPAWN_STAGGER - (round - 1) * WAVE_CONFIG.STAGGER_REDUCE_PER_ROUND);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Game);
  }

  create() {
    // Reset state
    this.playerState          = 'idle';
    this.facingLeft           = true;
    this.knockbackVx          = 0;
    this.knockbackVy          = 0;
    this.pirateHasDealtDamage = false;
    this.playerHealth         = PLAYER_MAX_HEALTH;
    this.iFrameTimer          = 0;
    this.iFrameBlinkAccum     = 0;
    this.skeletons            = [];
    this.roundNumber          = 1;
    this.roundPhase           = 'intro';
    this.roundPhaseTimer      = 0;
    this.enemiesToSpawn       = 0;
    this.spawnTimer           = 0;
    this.totalKills           = 0;
    this.elapsedPlayTime      = 0;
    this.gameOverActive       = false;
    this.overlayObjects       = [];
    this.hitStopTimer         = 0;
    this.screenFlashTimer     = 0;
    this.hitParticles         = [];

    // Question state
    this.preguntas            = this.registry.get('preguntasDelNivel') || [];
    this.isQuestionMode       = false;
    this.modalLocked          = false;
    this.currentQuestion      = null;
    this.correctAnswerIndex   = -1;
    this.questionOverlayObjects = [];
    this.pendingItemBuff      = null;

    this.events.once('shutdown', () => {
      this.modalLocked = false;
      this.isQuestionMode = false;
      this.questionOverlayObjects = [];
      this.pendingItemBuff = null;
    });

    // Items & Buffs
    this.itemGroup            = this.add.group();
    this.itemsSpawnedThisRound= 0;
    this.itemSpawnTimer       = 6;
    this.attackBuffTimer      = 0;
    this.speedBuffTimer       = 0;
    this.hasAttackBuff        = false;
    this.hasSpeedBuff         = false;

    const cam = this.cameras.main;

    this.add.image(600, 350, 'pirate-background').setDisplaySize(1200, 700);

    // Register pirate animations
    for (const { action, frames, fps, loop } of ANIM_CONFIG) {
      const key = `lobit-pirate-${action}`;
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
          frameRate: fps,
          repeat: loop ? -1 : 0,
        });
      }
    }

    this.player = this.add.sprite(cam.centerX, cam.centerY + 80, 'lobit-pirate-idle');
    this.player.setOrigin(PIRATE_ORIGIN.x, PIRATE_ORIGIN.y);
    this.player.setScale(CHAR_SCALE);
    this.player.play('lobit-pirate-idle');

    // Enable camera follow and world boundaries
    this.cameras.main.setBounds(0, 0, 1200, 700);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // HUD
    this.hudGraphics = this.add.graphics().setDepth(199).setScrollFactor(0);

    this.add.text(HUD_X, HUD_Y, 'HP', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setDepth(200).setScrollFactor(0);

    this.hudCounter = this.add.text(HUD_COUNTER_X, HUD_Y, `${this.playerHealth}/10`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setDepth(200).setScrollFactor(0);

    this.hudRound = this.add.text(HUD_ROUND_X, HUD_Y, '• RND 1', {
      fontFamily: 'monospace', fontSize: '18px', color: '#facc15',
    }).setDepth(200).setScrollFactor(0);

    this.hudKills = this.add.text(cam.width - 200, HUD_Y, '⚔ 0', {
      fontFamily: 'monospace', fontSize: '18px', color: '#d1d5db',
    }).setDepth(200).setScrollFactor(0);

    this.hudTimer = this.add.text(cam.width - 24, HUD_Y, '00:00', {
      fontFamily: 'monospace', fontSize: '18px', color: '#d1d5db',
    }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);

    this.screenFlashGraphics = this.add.graphics().setDepth(250).setScrollFactor(0);
    this.screenFlashGraphics.fillStyle(0xffffff, 1);
    this.screenFlashGraphics.fillRect(0, 0, cam.width, cam.height);
    this.screenFlashGraphics.setAlpha(0);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.scene.start(SCENE_KEYS.MainMenu));

    this.heartbeatSound = this.sound.add('sfx-heartbeat', { loop: true, volume: 0.8 });
    this.sound.play('sfx-gaviotas', { volume: 0.5 });

    this._startRound(1);
  }

  update(time, delta) {
    const dt = delta / 1000;

    const inputSnapshot = {
      up:    !!(this.cursors.up?.isDown    || this.wasd.up.isDown),
      down:  !!(this.cursors.down?.isDown  || this.wasd.down.isDown),
      left:  !!(this.cursors.left?.isDown  || this.wasd.left.isDown),
      right: !!(this.cursors.right?.isDown || this.wasd.right.isDown),
    };

    this._updateScreenFlash(dt);
    this._updateHitParticles(dt);

    if (!this.gameOverActive && !this.isQuestionMode) {
      const inHitStop = this.hitStopTimer > 0;
      if (this.hitStopTimer > 0) this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);

      if (!inHitStop && this.roundPhaseTimer > 0) {
        this.roundPhaseTimer -= dt;
        if (this.roundPhaseTimer <= 0) this._onPhaseTimerExpired();
      }

      if (!inHitStop && this.roundPhase === 'playing') {
        this.elapsedPlayTime += dt;
        this._updatePlayer(dt, inputSnapshot);
        this._tickSpawner(dt);
        for (const sk of this.skeletons) {
          if (!sk.isRemoved) sk.update(dt, this.player.x, this.player.y);
        }
        this._resolveCharacterCollision();
        this._checkRoundComplete();
      } else if (!inHitStop) {
        for (const sk of this.skeletons) {
          if (!sk.isRemoved) sk.update(dt, this.player.x, this.player.y);
        }
      }

      this._updateIFrameBlink(dt);
    }

    this._updateBuffs(dt);
    this._tickItems(dt);
    this._checkItemCollisions();

    this._drawHUD(time);

    // Heartbeat logic
    if (this.playerHealth === 1 && this.playerState !== 'dead') {
      if (!this.heartbeatSound.isPlaying) this.heartbeatSound.play();
    } else {
      if (this.heartbeatSound.isPlaying) this.heartbeatSound.stop();
    }
  }

  // ── Round system ──────────────────────────────────────────────────────────

  _startRound(n) {
    this.roundNumber     = n;
    this.enemiesToSpawn  = getEnemyCount(n);
    this.spawnTimer      = 0;
    this.roundPhase      = 'intro';
    this.roundPhaseTimer = WAVE_CONFIG.ROUND_INTRO_DURATION;
    this.itemsSpawnedThisRound = 0;
    this.itemSpawnTimer = 6;
    this._showRoundIntro(n);
  }

  _onPhaseTimerExpired() {
    if (this.roundPhase === 'intro') {
      this._clearOverlay();
      this.roundPhase = 'playing';
    } else if (this.roundPhase === 'complete') {
      this._clearOverlay();
      for (const sk of this.skeletons) { if (!sk.isRemoved) sk.forceRemove(); }
      this.skeletons = [];
      // Show question if available, otherwise start next round immediately
      if (this.preguntas.length > 0) {
        this._showQuestion();
      } else {
        this._startRound(this.roundNumber + 1);
      }
    }
  }

  _tickSpawner(dt) {
    if (this.enemiesToSpawn <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawnEnemy();
      this.spawnTimer = getSpawnStagger(this.roundNumber);
    }
  }

  _spawnEnemy() {
    const cam        = this.cameras.main;
    const topBound   = DISPLAY_FRAME * PIRATE_ORIGIN.y;
    const side       = Math.random() < 0.5 ? 'left' : 'right';
    const spawnX     = side === 'left' ? 80 : 1200 - 80;
    const spawnY     = Phaser.Math.Clamp(
      this.player.y + Phaser.Math.Between(-80, 80),
      topBound + 20, 700 - 20
    );
    const difficulty = getRoundDifficulty(this.roundNumber);

    let sk;
    sk = new Skeleton(
      this, spawnX, spawnY,
      (atkX, atkY, atkW, atkH) => this._checkSkeletonAttackHit(atkX, atkY, atkW, atkH, sk),
      { ...difficulty, onDeath: () => { this.totalKills++; } },
    );
    this.skeletons.push(sk);
    this.enemiesToSpawn--;
  }

  _checkRoundComplete() {
    if (this.enemiesToSpawn > 0) return;
    if (this.skeletons.length === 0) return;
    if (!this.skeletons.every(sk => sk.isDead)) return;

    this.roundPhase      = 'complete';
    this.roundPhaseTimer = WAVE_CONFIG.ROUND_COMPLETE_DURATION;
    this._showRoundComplete();
  }

  // ── Question system ───────────────────────────────────────────────────────

  _showQuestion() {
    if (this.isQuestionMode || this.modalLocked) {
      return;
    }
    this.modalLocked = true;
    this.isQuestionMode = true;
    const cam = this.cameras.main;
    const cx  = cam.width * 0.5;
    const cy  = cam.height * 0.5;

    // Pick a random question
    const idx = Phaser.Math.Between(0, this.preguntas.length - 1);
    this.currentQuestion = this.preguntas[idx];

    const options = [...this.currentQuestion.options];
    const correctOption = options[this.currentQuestion.answer];
    Phaser.Utils.Array.Shuffle(options);
    this.correctAnswerIndex = options.indexOf(correctOption);

    // Dark overlay
    const bg = this.add.graphics().setDepth(300).setScrollFactor(0);
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, cam.width, cam.height);
    this.questionOverlayObjects.push(bg);

    // Question text
    const questionText = this.add.text(cx, cy - 130, this.currentQuestion.q, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: cam.width - 120 },
      align: 'center',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.questionOverlayObjects.push(questionText);

    const instrText = this.add.text(cx, cy - 60, '¡SELECCIONA LA RESPUESTA CORRECTA!', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#facc15',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true },
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.questionOverlayObjects.push(instrText);

    // 4 answer buttons in a 2×2 grid
    const btnW  = 460;
    const btnH  = 113;
    const gapX  = 24;
    const gapY  = 16;
    const gridX = cx - btnW - gapX / 2;
    const gridY = cy - 20;

    options.forEach((option, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx  = gridX + col * (btnW + gapX);
      const by  = gridY + row * (btnH + gapY);

      const btnGfx = this.add.graphics().setDepth(301).setScrollFactor(0);
      btnGfx.fillStyle(0x1e293b, 0.95);
      btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
      btnGfx.lineStyle(2, 0x64748b, 1);
      btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
      this.questionOverlayObjects.push(btnGfx);

      const label = String.fromCharCode(65 + i); // A, B, C, D
      const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        wordWrap: { width: btnW - 30 },
        align: 'center',
      }).setOrigin(0.5).setDepth(302).setScrollFactor(0);
      this.questionOverlayObjects.push(btnText);

      // Hit zone
      const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
        .setDepth(303).setScrollFactor(0).setInteractive({ useHandCursor: true });
      this.questionOverlayObjects.push(hitZone);

      hitZone.on('pointerover', () => {
        btnGfx.clear();
        btnGfx.fillStyle(0x334155, 0.95);
        btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
        btnGfx.lineStyle(2, 0xfacc15, 1);
        btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      hitZone.on('pointerout', () => {
        btnGfx.clear();
        btnGfx.fillStyle(0x1e293b, 0.95);
        btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
        btnGfx.lineStyle(2, 0x64748b, 1);
        btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      hitZone.on('pointerdown', () => this._answerQuestion(i, bx, by, btnW, btnH, btnGfx));
    });
  }

  _answerQuestion(selectedIndex, bx, by, btnW, btnH, btnGfx) {
    // Disable all hit zones
    this.questionOverlayObjects.forEach(obj => {
      if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive();
    });

    const correct = selectedIndex === this.correctAnswerIndex;
    if (this.currentQuestion && this.currentQuestion.id) {
      window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: this.currentQuestion.id, correct } }));
    }

    // Highlight result
    btnGfx.clear();
    btnGfx.fillStyle(correct ? 0x166534 : 0x7f1d1d, 0.95);
    btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
    btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
    btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

    const cam = this.cameras.main;
    const resultText = this.add.text(cam.width * 0.5, cam.height * 0.5 + 235,
      correct ? '¡CORRECTO! +1 HP' : 'INCORRECTO! -1 HP', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: correct ? '#22c55e' : '#ef4444',
        fontStyle: 'bold',
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
      }).setOrigin(0.5).setDepth(302).setScrollFactor(0);
    this.questionOverlayObjects.push(resultText);

    if (correct) {
      this.playerHealth = Math.min(10, this.playerHealth + 1);
      try {
        this.sound.play('bgm-right', { volume: 0.6 });
      } catch (err) {
        console.warn("Could not play correct sfx", err);
      }
    } else {
      this.playerHealth = Math.max(0, this.playerHealth - 1);
    }

    if (this.playerHealth <= 0) {
      this.sound.play('sfx-death', { volume: 1.0 });
      this.playerState = 'dead';
      this.player.setAlpha(1);
      this.player.play('lobit-pirate-death');
      this.time.delayedCall(1600, () => {
        this._clearQuestionOverlay();
        this.isQuestionMode = false;
        this.modalLocked = false;
        this._showGameOver();
      });
      return;
    }

    this.time.delayedCall(1600, () => {
      this._clearQuestionOverlay();
      this.isQuestionMode = false;
      this.modalLocked = false;
      this._startRound(this.roundNumber + 1);
    });
  }

  _clearQuestionOverlay() {
    for (const obj of this.questionOverlayObjects) obj.destroy();
    this.questionOverlayObjects = [];
  }

  // ── Overlay helpers ───────────────────────────────────────────────────────

  _clearOverlay() {
    for (const obj of this.overlayObjects) obj.destroy();
    this.overlayObjects = [];
  }

  _showRoundIntro(round) {
    const cam = this.cameras.main;
    const cx  = cam.width * 0.5;
    const cy  = cam.height * 0.5;

    const bg = this.add.graphics().setDepth(300).setScrollFactor(0);
    bg.fillStyle(0x000000, 0.60);
    bg.fillRect(0, 0, cam.width, cam.height);
    this.overlayObjects.push(bg);

    const title = this.add.text(cx, cy - 30, `RONDA ${round}`, {
      fontFamily: 'monospace', fontSize: '60px', color: '#facc15', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(title);

    const count   = getEnemyCount(round);
    const subtext = round === 1 ? '¡Defiéndete!' : `${count} ${count === 1 ? 'enemigo' : 'enemigos'} se acercan!`;
    const sub = this.add.text(cx, cy + 46, subtext, {
      fontFamily: 'monospace', fontSize: '22px', color: '#d1d5db',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(sub);
  }

  _showRoundComplete() {
    const cam = this.cameras.main;
    const cx  = cam.width * 0.5;
    const cy  = cam.height * 0.5;

    const bg = this.add.graphics().setDepth(300).setScrollFactor(0);
    bg.fillStyle(0x000000, 0.50);
    bg.fillRect(0, 0, cam.width, cam.height);
    this.overlayObjects.push(bg);

    const title = this.add.text(cx, cy - 30, '¡RONDA COMPLETADA!', {
      fontFamily: 'monospace', fontSize: '44px', color: '#22c55e', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(title);

    const hint = this.preguntas.length > 0 ? 'Prepárate para una pregunta...' : `Siguiente: Ronda ${this.roundNumber + 1}`;
    const sub = this.add.text(cx, cy + 42, hint, {
      fontFamily: 'monospace', fontSize: '20px', color: '#9ca3af',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.overlayObjects.push(sub);
  }

  _showGameOver() {
    this.gameOverActive = true;
    const cam = this.cameras.main;
    const cx  = cam.width  * 0.5;
    const cy  = cam.height * 0.5;

    const overlay = this.add.graphics().setDepth(300).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.70);
    overlay.fillRect(0, 0, cam.width, cam.height);

    this.add.text(cx, cy - 90, 'GAME OVER', {
      fontFamily: 'monospace', fontSize: '54px', color: '#ef4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);

    const stats = `Ronda ${this.roundNumber}  •  ${this.totalKills} derrotados  •  ${formatTime(this.elapsedPlayTime)}`;
    this.add.text(cx, cy - 28, stats, {
      fontFamily: 'monospace', fontSize: '20px', color: '#9ca3af',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);

    const restartBtn = this.add.text(cx, cy + 34, '[ REINICIAR ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover',  () => restartBtn.setColor('#22c55e'));
    restartBtn.on('pointerout',   () => restartBtn.setColor('#ffffff'));
    restartBtn.on('pointerdown',  () => {
      this.sound.stopAll();
      this.scene.start('StoryScene');
    });

    const menuBtn = this.add.text(cx, cy + 88, '[ MENÚ PRINCIPAL ]', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover',  () => menuBtn.setColor('#f59e0b'));
    menuBtn.on('pointerout',   () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerdown',  () => this.scene.start(SCENE_KEYS.MainMenu));
  }

  // ── Player update ─────────────────────────────────────────────────────────

  _updatePlayer(dt, input) {
    if (this.playerState === 'dead') {
      this._applyKnockbackMovement(dt);
      this._decayKnockback(dt);
      return;
    }
    if (this.playerState === 'hurt') {
      this._applyKnockbackMovement(dt);
      this._decayKnockback(dt);
      if (!this.player.anims.isPlaying) {
        this.playerState = 'idle';
        this.player.play('lobit-pirate-idle');
      }
      return;
    }

    const attackJustPressed = Phaser.Input.Keyboard.JustDown(this.attackKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey);
    const isAttacking = this.playerState === 'attack' && this.player.anims.isPlaying;

    if (!isAttacking) {
      let dx = 0;
      let dy = 0;
      let speed = getPlayerSpeed(this.roundNumber);
      if (this.hasSpeedBuff) speed *= 2;

      const joystick = (window as any).virtualJoystick;
      if (joystick && joystick.active) {
        if (attackJustPressed) {
          this._setPlayerState('attack');
          this.sound.play('sfx-sword', { volume: 0.8 });
        } else if (joystick.intensity > 0.15) {
          this._setPlayerState('walk');
        } else {
          this._setPlayerState('idle');
        }

        dx = joystick.dx * speed * dt;
        dy = joystick.dy * speed * dt;

        if (joystick.dx > 0.15) this.facingLeft = false;
        if (joystick.dx < -0.15) this.facingLeft = true;
      } else {
        if (attackJustPressed) {
          this._setPlayerState('attack');
          this.sound.play('sfx-sword', { volume: 0.8 });
        } else if (input.left || input.right || input.up || input.down) {
          this._setPlayerState('walk');
        } else {
          this._setPlayerState('idle');
        }

        const rawDx = (input.left ? -1 : 0) + (input.right ? 1 : 0);
        const rawDy = (input.up   ? -1 : 0) + (input.down  ? 1 : 0);
        const len   = Math.hypot(rawDx, rawDy);
        dx    = len > 0 ? (rawDx / len) * speed * dt : 0;
        dy    = len > 0 ? (rawDy / len) * speed * dt : 0;

        if (input.right) this.facingLeft = false;
        if (input.left)  this.facingLeft = true;
      }

      const cam      = this.cameras.main;
      const halfW    = DISPLAY_FRAME * PIRATE_ORIGIN.x;
      const topBound = DISPLAY_FRAME * PIRATE_ORIGIN.y;

      this.player.x = Phaser.Math.Clamp(this.player.x + dx, halfW, 1200 - halfW);
      this.player.y = Phaser.Math.Clamp(this.player.y + dy, topBound, 700);
    }

    if (this.playerState === 'attack' && !this.pirateHasDealtDamage) {
      const currentFrame = this.player.anims.currentFrame;
      if (currentFrame?.index === 4) {
        this.pirateHasDealtDamage = true;
        this._checkPirateAttackHit();
      }
    }

    this.player.setFlipX(!this.facingLeft);
  }

  _updateIFrameBlink(dt) {
    if (this.iFrameTimer <= 0) return;
    if (this.playerState === 'hurt' || this.playerState === 'dead') return;
    this.iFrameTimer      -= dt;
    this.iFrameBlinkAccum += dt;
    if (this.iFrameBlinkAccum >= PLAYER_IFRAME_BLINK) {
      this.iFrameBlinkAccum -= PLAYER_IFRAME_BLINK;
      this.player.setAlpha(this.player.alpha > 0.5 ? 0.25 : 1.0);
    }
    if (this.iFrameTimer <= 0) { this.iFrameTimer = 0; this.player.setAlpha(1.0); }
  }

  _applyKnockbackMovement(dt) {
    const cam      = this.cameras.main;
    const halfW    = DISPLAY_FRAME * PIRATE_ORIGIN.x;
    const topBound = DISPLAY_FRAME * PIRATE_ORIGIN.y;
    this.player.x = Phaser.Math.Clamp(this.player.x + this.knockbackVx * dt, halfW, 1200 - halfW);
    this.player.y = Phaser.Math.Clamp(this.player.y + this.knockbackVy * dt, topBound, 700);
  }

  _decayKnockback(dt) {
    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    this.knockbackVx *= decay;
    this.knockbackVy *= decay;
  }

  _setPlayerState(next) {
    if (this.playerState === next) return;
    this.playerState = next;
    if (next === 'attack') this.pirateHasDealtDamage = false;
    this.player.play(`lobit-pirate-${next}`);
  }

  _receiveHit(dx, dy) {
    if (this.playerState === 'hurt' || this.playerState === 'dead') return;
    if (this.iFrameTimer > 0) return;

    this.playerHealth = Math.max(0, this.playerHealth - 1);
    this.iFrameTimer      = PLAYER_IFRAME_DURATION;
    this.iFrameBlinkAccum = 0;
    this.knockbackVx  = dx * KNOCKBACK_SPEED;
    this.knockbackVy  = dy * KNOCKBACK_SPEED;

    this._triggerScreenFlash();
    this._triggerHitStop(HITSTOP_PLAYER_HURT);
    this._triggerScreenShake(SHAKE_PLAYER_HURT.duration, SHAKE_PLAYER_HURT.intensity);

    if (this.playerHealth <= 0) {
      this.sound.play('sfx-death', { volume: 1.0 });
      this.playerState = 'dead';
      this.player.setAlpha(1);
      this.player.play('lobit-pirate-death');
      for (const sk of this.skeletons) sk.freeze();
      this.time.delayedCall(900, () => this._showGameOver());
    } else {
      this.playerState = 'hurt';
      this.player.play('lobit-pirate-hurt');
    }
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  _checkSkeletonAttackHit(atkX, atkY, atkW, atkH, attacker) {
    if (this.playerState === 'dead') return;
    if (this.iFrameTimer > 0) return;

    const bx = this.player.x - P_HITBOX_W * 0.5;
    const by = this.player.y - P_HITBOX_H;
    const overlaps =
      atkX < bx + P_HITBOX_W && atkX + atkW > bx &&
      atkY < by + P_HITBOX_H && atkY + atkH > by;
    if (!overlaps) return;

    const hitX = (this.player.x + attacker.sprite.x) * 0.5;
    const hitY = this.player.y - P_HITBOX_H * 0.55;
    this._spawnHitParticles(hitX, hitY, false);

    const dx  = this.player.x - attacker.sprite.x;
    const dy  = this.player.y - attacker.sprite.y;
    const len = Math.max(Math.hypot(dx, dy), 1);
    this._receiveHit(dx / len, dy / len);
  }

  _checkPirateAttackHit() {
    const x    = this.player.x;
    const y    = this.player.y;
    const atkX = this.facingLeft ? x - P_ATK_INNER - P_ATK_W : x + P_ATK_INNER;
    const atkY = y - P_ATK_VERT_CEN - P_ATK_H * 0.5;

    let anyHit  = false;
    let anyDied = false;

    for (const sk of this.skeletons) {
      if (!sk.hitTest(atkX, atkY, P_ATK_W, P_ATK_H)) continue;

      const damage = this.hasAttackBuff ? 2 : 1;
      const dx   = sk.sprite.x - x;
      const dy   = sk.sprite.y - y;
      const len  = Math.max(Math.hypot(dx, dy), 1);
      const died = sk.receiveHit(dx / len, dy / len, damage);

      const hitX = sk.sprite.x;
      const hitY = sk.sprite.y - P_ATK_VERT_CEN * 0.7;
      this._spawnHitParticles(hitX, hitY, died);

      anyHit = true;
      if (died) anyDied = true;
    }

    if (anyDied) {
      this._triggerHitStop(HITSTOP_ENEMY_DEATH);
      this._triggerScreenShake(SHAKE_ENEMY_DEATH.duration, SHAKE_ENEMY_DEATH.intensity);
    } else if (anyHit) {
      this._triggerHitStop(HITSTOP_ENEMY_HURT);
      this._triggerScreenShake(SHAKE_ENEMY_HURT.duration, SHAKE_ENEMY_HURT.intensity);
    }
  }

  _resolveCharacterCollision() {
    const px = this.player.x - P_HITBOX_W * 0.5;
    const py = this.player.y - P_HITBOX_H;

    for (const sk of this.skeletons) {
      if (sk.isRemoved || sk.isDead) continue;
      const s        = sk.getBodyRect();
      const overlapX = Math.min(px + P_HITBOX_W, s.x + s.w) - Math.max(px, s.x);
      const overlapY = Math.min(py + P_HITBOX_H, s.y + s.h) - Math.max(py, s.y);
      if (overlapX <= 0 || overlapY <= 0) continue;

      if (overlapX < overlapY) {
        const half = overlapX * 0.5;
        if (this.player.x < sk.sprite.x) { this.player.x -= half; sk.sprite.x += half; }
        else { this.player.x += half; sk.sprite.x -= half; }
      } else {
        const half = overlapY * 0.5;
        if (this.player.y < sk.sprite.y) { this.player.y -= half; sk.sprite.y += half; }
        else { this.player.y += half; sk.sprite.y -= half; }
      }
    }
  }

  // ── Juice ─────────────────────────────────────────────────────────────────

  _triggerHitStop(duration) { this.hitStopTimer = Math.max(this.hitStopTimer, duration); }
  _triggerScreenShake(durationMs, intensity) { this.cameras.main.shake(durationMs, intensity); }
  _triggerScreenFlash() { this.screenFlashTimer = FLASH_DURATION; this.screenFlashGraphics.setAlpha(FLASH_ALPHA); }

  _updateScreenFlash(dt) {
    if (this.screenFlashTimer <= 0) return;
    this.screenFlashTimer -= dt;
    if (this.screenFlashTimer <= 0) { this.screenFlashTimer = 0; this.screenFlashGraphics.setAlpha(0); }
    else { this.screenFlashGraphics.setAlpha((this.screenFlashTimer / FLASH_DURATION) * FLASH_ALPHA); }
  }

  _spawnHitParticles(x, y, isDeath) {
    const count = isDeath ? 12 : 6;
    const speed = isDeath ? 210 : 140;
    const life  = isDeath ? 0.55 : 0.32;
    const size  = isDeath ? 5    : 3;
    const color = isDeath ? 0xfbbf24 : 0xfde68a;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.9;
      const spd   = speed * (0.4 + Math.random() * 0.6);
      const gfx   = this.add.graphics();
      gfx.x = x; gfx.y = y; gfx.setDepth(120);
      this.hitParticles.push({ gfx, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life, maxLife: life, size, color });
    }
  }

  _updateHitParticles(dt) {
    for (let i = this.hitParticles.length - 1; i >= 0; i--) {
      const p = this.hitParticles[i];
      p.life -= dt;
      if (p.life <= 0) { p.gfx.destroy(); this.hitParticles.splice(i, 1); continue; }
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vy    += 280 * dt;
      const t     = 1 - p.life / p.maxLife;
      const alpha = 1 - t;
      const sz    = p.size * (1 - t * 0.4);
      p.gfx.clear();
      p.gfx.fillStyle(p.color, alpha);
      p.gfx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
    }
  }

  // ── Items & Buffs ─────────────────────────────────────────────────────────

  _tickItems(dt) {
    if (this.roundPhase !== 'playing' || this.isQuestionMode) return;
    
    let activeItemsCount = 0;
    for (const item of this.itemGroup.getChildren()) {
      if (item.active) activeItemsCount++;
    }
    
    if (activeItemsCount >= 2) return;
    
    this.itemSpawnTimer -= dt;
    if (this.itemSpawnTimer <= 0) {
      this.itemSpawnTimer = 6;
      const types = ['ATTACK', 'VELOCIDAD', 'VIDA'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const cam = this.cameras.main;
      const topBound = DISPLAY_FRAME * PIRATE_ORIGIN.y;
      const spawnX = Phaser.Math.Between(100, 1200 - 100);
      const spawnY = Phaser.Math.Between(topBound + 40, 700 - 40);
      
      const scale = type === 'VIDA' ? 0.068 : 0.08;
      const item = this.add.sprite(spawnX, spawnY, `item-${type}`).setScale(scale).setDepth(80);
      item.itemType = type;
      this.itemGroup.add(item);
      
      this.tweens.add({ targets: item, y: spawnY - 10, yoyo: true, repeat: -1, duration: 1500 });
    }
  }

  _checkItemCollisions() {
    if (this.isQuestionMode || this.playerState === 'dead') return;
    
    const px = this.player.x;
    const py = this.player.y;
    
    for (const item of this.itemGroup.getChildren()) {
      if (!item.active) continue;
      const dist = Phaser.Math.Distance.Between(px, py, item.x, item.y);
      if (dist < 75) {
        this.sound.play('sfx-meow', { volume: 0.8 });
        const iType = item.itemType;
        item.destroy();
        
        if (this.preguntas.length > 0) {
          this._showItemQuestion(iType);
        } else {
          this._applyBuff(iType);
        }
      }
    }
  }

  _updateBuffs(dt) {
    if (this.attackBuffTimer > 0) {
      this.attackBuffTimer -= dt;
      this.hasAttackBuff = this.attackBuffTimer > 0;
    }
    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer -= dt;
      this.hasSpeedBuff = this.speedBuffTimer > 0;
    }
  }

  _applyBuff(type) {
    if (type === 'ATTACK') {
      this.attackBuffTimer = 10;
      this.hasAttackBuff = true;
    } else if (type === 'VELOCIDAD') {
      this.speedBuffTimer = 7;
      this.hasSpeedBuff = true;
    } else if (type === 'VIDA') {
      this.playerHealth = Math.min(10, this.playerHealth + 1);
    }
  }

  _showItemQuestion(type) {
    if (this.isQuestionMode || this.modalLocked) {
      return;
    }
    this.pendingItemBuff = type;
    this.modalLocked = true;
    this.isQuestionMode = true;
    const cam = this.cameras.main;
    const cx  = cam.width * 0.5;
    const cy  = cam.height * 0.5;

    const idx = Phaser.Math.Between(0, this.preguntas.length - 1);
    this.currentQuestion = this.preguntas[idx];

    const options = [...this.currentQuestion.options];
    const correctOption = options[this.currentQuestion.answer];
    Phaser.Utils.Array.Shuffle(options);
    this.correctAnswerIndex = options.indexOf(correctOption);

    const bg = this.add.graphics().setDepth(300).setScrollFactor(0);
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, cam.width, cam.height);
    this.questionOverlayObjects.push(bg);

    const titleText = this.add.text(cx, cy - 210, `¡PREGUNTA POR PODER: ${type}!`, {
      fontFamily: 'monospace', fontSize: '32px', color: '#facc15', fontStyle: 'bold',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.questionOverlayObjects.push(titleText);

    const questionText = this.add.text(cx, cy - 120, this.currentQuestion.q, {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
      wordWrap: { width: cam.width - 120 }, align: 'center',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    this.questionOverlayObjects.push(questionText);

    const btnW = 460, btnH = 113, gapX = 24, gapY = 20;
    const gridX = cx - btnW - gapX / 2;
    const gridY = cy - 20;

    options.forEach((option, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const bx = gridX + col * (btnW + gapX), by = gridY + row * (btnH + gapY);

      const btnGfx = this.add.graphics().setDepth(301).setScrollFactor(0);
      btnGfx.fillStyle(0x1e293b, 0.95);
      btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
      btnGfx.lineStyle(2, 0x64748b, 1);
      btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
      this.questionOverlayObjects.push(btnGfx);

      const label = String.fromCharCode(65 + i);
      const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
        fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', wordWrap: { width: btnW - 30 }, align: 'center',
      }).setOrigin(0.5).setDepth(302).setScrollFactor(0);
      this.questionOverlayObjects.push(btnText);

      const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
        .setDepth(303).setScrollFactor(0).setInteractive({ useHandCursor: true });
      this.questionOverlayObjects.push(hitZone);

      hitZone.on('pointerover', () => {
        btnGfx.clear(); btnGfx.fillStyle(0x334155, 0.95); btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
        btnGfx.lineStyle(2, 0xfacc15, 1); btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      hitZone.on('pointerout', () => {
        btnGfx.clear(); btnGfx.fillStyle(0x1e293b, 0.95); btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
        btnGfx.lineStyle(2, 0x64748b, 1); btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
      });
      hitZone.on('pointerdown', () => this._answerItemQuestion(i, bx, by, btnW, btnH, btnGfx));
    });
  }

  _answerItemQuestion(selectedIndex, bx, by, btnW, btnH, btnGfx) {
    this.questionOverlayObjects.forEach(obj => {
      if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive();
    });

    const correct = selectedIndex === this.correctAnswerIndex;
    if (this.currentQuestion && this.currentQuestion.id) {
      window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: this.currentQuestion.id, correct } }));
    }
    btnGfx.clear();
    btnGfx.fillStyle(correct ? 0x166534 : 0x7f1d1d, 0.95);
    btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
    btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
    btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

    const cam = this.cameras.main;
    const resultText = this.add.text(cam.width * 0.5, cam.height * 0.5 + 235,
      correct ? '¡PODER OBTENIDO!' : 'FALLASTE (No hay poder)', {
        fontFamily: 'monospace', fontSize: '32px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold',
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
      }).setOrigin(0.5).setDepth(302).setScrollFactor(0);
    this.questionOverlayObjects.push(resultText);

    if (correct && this.pendingItemBuff) {
      this._applyBuff(this.pendingItemBuff);
    }
    this.pendingItemBuff = null;

    this.time.delayedCall(1600, () => {
      this._clearQuestionOverlay();
      this.isQuestionMode = false;
      this.modalLocked = false;
      this.pendingItemBuff = null;
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _drawHUD(time) {
    this.hudGraphics.clear();

    const ratio = this.playerHealth / 10;
    const color = ratio > 0.6 ? 0x22c55e : ratio > 0.3 ? 0xf59e0b : 0xef4444;
    const critical  = this.playerHealth > 0 && this.playerHealth <= 1;
    const fillAlpha = critical ? (Math.floor(time / 220) % 2 === 0 ? 1 : 0.25) : 1;

    this.hudGraphics.fillStyle(0x111827, 0.85);
    this.hudGraphics.fillRect(HUD_BAR_X, HUD_Y, HUD_BAR_W, HUD_BAR_H);

    const fillW = HUD_BAR_W * ratio;
    if (fillW > 0) {
      this.hudGraphics.fillStyle(color, fillAlpha);
      this.hudGraphics.fillRect(HUD_BAR_X, HUD_Y, fillW, HUD_BAR_H);
    }
    this.hudGraphics.lineStyle(2, 0xffffff, 0.85);
    this.hudGraphics.strokeRect(HUD_BAR_X, HUD_Y, HUD_BAR_W, HUD_BAR_H);

    this.hudCounter.setText(`${this.playerHealth}/10`);
    this.hudRound.setText(`• RND ${this.roundNumber}`);
    this.hudKills.setText(`⚔ ${this.totalKills}`);
    this.hudTimer.setText(formatTime(this.elapsedPlayTime));

    // Buff Indicators
    let buffText = '';
    if (this.hasAttackBuff) buffText += `[ATAQUE x2: ${Math.ceil(this.attackBuffTimer)}s] `;
    if (this.hasSpeedBuff) buffText += `[VELOCIDAD x2: ${Math.ceil(this.speedBuffTimer)}s]`;
    if (!this.buffHudText) {
      this.buffHudText = this.add.text(HUD_BAR_X, HUD_Y + 28, '', { fontFamily: 'monospace', fontSize: '14px', color: '#facc15' }).setDepth(200).setScrollFactor(0);
    }
    this.buffHudText.setText(buffText);
  }
}
