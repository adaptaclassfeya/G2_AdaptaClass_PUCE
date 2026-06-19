// @ts-nocheck
import Phaser from 'phaser';

export const SKELETON_ATTACK_RANGE = 150 * 0.75;

const FRAME_SIZE = 256;
const ORIGIN = { x: 0.5, y: 0.996 };

const CHAR_SCALE    = 0.75;
const DISPLAY_FRAME = FRAME_SIZE * CHAR_SCALE;

const HITBOX_W = 65  * CHAR_SCALE;
const HITBOX_H = 160 * CHAR_SCALE;

const BASE_SKELETON_SPEED = 120 * CHAR_SCALE;
const PAUSE_DURATION      = 1.5;

const ATK_W        = 100 * CHAR_SCALE;
const ATK_H        = 50  * CHAR_SCALE;
const ATK_INNER    = 35  * CHAR_SCALE;
const ATK_VERT_CEN = 120 * CHAR_SCALE;

const KNOCKBACK_SPEED = 320 * CHAR_SCALE;
const KNOCKBACK_DECAY = 6;

const ATTACK_HIT_FRAME = 4;

const DEATH_LINGER_DURATION = 1.0;
const DEATH_BLINK_DURATION  = 1.5;
const DEATH_BLINK_INTERVAL  = 0.12;

const DEFAULT_MAX_HEALTH  = 3;
const HB_W                = 56;
const HB_H                = 6;
const HB_OFFSET_Y         = 10;
const HB_COLOR_FG         = 0xef4444;
const HB_COLOR_BG         = 0x111827;
const HB_COLOR_BORDER     = 0x000000;

const ANIM_CONFIG = [
  { action: 'idle',   frames: 10, fps:  6, loop: true  },
  { action: 'walk',   frames:  7, fps: 10, loop: true  },
  { action: 'attack', frames:  8, fps: 10, loop: false },
  { action: 'hurt',   frames:  6, fps:  8, loop: false },
  { action: 'death',  frames: 10, fps:  8, loop: false },
];

export class Skeleton {
  constructor(scene, x, y, onAttackFrame, options = {}) {
    this.scene         = scene;
    this.onAttackFrame = onAttackFrame;
    this.maxHealthValue = options.maxHealth ?? DEFAULT_MAX_HEALTH;
    this.health         = this.maxHealthValue;
    this.speedMult      = options.speedMultiplier ?? 1.0;
    this.onDeath        = options.onDeath;

    this.state         = 'chase';
    this.facingLeft    = true;
    this.pauseTimer    = 0;
    this.hasDealtDamage = false;
    this.knockbackVx   = 0;
    this.knockbackVy   = 0;
    this.deadPhase     = 'anim';
    this.deadTimer     = 0;
    this.deadBlinkAccum    = 0;
    this.deadBlinkVisible  = true;
    this.frozen        = false;

    for (const { action, frames, fps, loop } of ANIM_CONFIG) {
      const key = `lobit-skeleton-${action}`;
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
          frameRate: fps,
          repeat: loop ? -1 : 0,
        });
      }
    }

    this.sprite = scene.add.sprite(x, y, 'lobit-skeleton-walk');
    this.sprite.setOrigin(ORIGIN.x, ORIGIN.y);
    this.sprite.setScale(CHAR_SCALE);
    this.sprite.play('lobit-skeleton-walk');

    this.healthBarGraphics = scene.add.graphics();
    this.healthBarGraphics.setDepth(101);

    scene.sound.play('sfx-skeleton');
  }

  get isDead() { return this.state === 'dead'; }
  get isRemoved() { return this.deadPhase === 'done'; }

  freeze() {
    if (this.frozen) return;
    this.frozen = true;
    this.sprite.stop();
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.healthBarGraphics.clear();
  }

  forceRemove() {
    if (this.deadPhase === 'done') return;
    this.deadPhase = 'done';
    this.sprite.destroy();
    this.healthBarGraphics.destroy();
  }

  getBodyRect() {
    return {
      x: this.sprite.x - HITBOX_W * 0.5,
      y: this.sprite.y - HITBOX_H,
      w: HITBOX_W,
      h: HITBOX_H,
    };
  }

  update(dt, playerX, playerY) {
    if (this.frozen) return;
    if (this.state === 'dead') { this._tickDead(dt); return; }

    this._applyKnockback(dt);

    if (this.state !== 'hurt') {
      const rawDx = playerX - this.sprite.x;
      const rawDy = playerY - this.sprite.y;
      const dist  = Math.hypot(rawDx, rawDy);
      switch (this.state) {
        case 'chase':  this._tickChase(dt, rawDx, rawDy, dist); break;
        case 'pause':  this._tickPause(dt); break;
        case 'attack': this._tickAttack(); break;
      }
    }
    this._drawHealthBar();
  }

  _tickDead(dt) {
    if (this.deadPhase === 'done') return;
    this.healthBarGraphics.clear();
    if (this.deadPhase === 'anim') return;
    if (this.deadPhase === 'linger') {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) {
        this.deadPhase = 'blink';
        this.deadTimer = DEATH_BLINK_DURATION;
        this.deadBlinkAccum = 0;
        this.deadBlinkVisible = true;
      }
      return;
    }
    if (this.deadPhase === 'blink') {
      this.deadTimer -= dt;
      this.deadBlinkAccum += dt;
      if (this.deadBlinkAccum >= DEATH_BLINK_INTERVAL) {
        this.deadBlinkAccum -= DEATH_BLINK_INTERVAL;
        this.deadBlinkVisible = !this.deadBlinkVisible;
        this.sprite.setAlpha(this.deadBlinkVisible ? 1 : 0);
      }
      if (this.deadTimer <= 0) {
        this.deadPhase = 'done';
        this.sprite.destroy();
        this.healthBarGraphics.destroy();
      }
    }
  }

  _applyKnockback(dt) {
    if (this.knockbackVx === 0 && this.knockbackVy === 0) return;
    const cam   = this.scene.cameras.main;
    const halfW = DISPLAY_FRAME * ORIGIN.x;
    const bounds = cam.getBounds();
    const mapW = (bounds && bounds.width) ? bounds.width : cam.width;
    const mapH = (bounds && bounds.height) ? bounds.height : cam.height;

    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + this.knockbackVx * dt, halfW, mapW - halfW);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y + this.knockbackVy * dt, DISPLAY_FRAME * ORIGIN.y, mapH);
    const decay = Math.exp(-KNOCKBACK_DECAY * dt);
    this.knockbackVx *= decay;
    this.knockbackVy *= decay;
    if (Math.hypot(this.knockbackVx, this.knockbackVy) < 5) {
      this.knockbackVx = 0;
      this.knockbackVy = 0;
    }
  }

  _tickChase(dt, rawDx, rawDy, dist) {
    if (dist <= SKELETON_ATTACK_RANGE) { this._transitionTo('attack'); return; }
    if (dist > 0) {
      const cam      = this.scene.cameras.main;
      const halfW    = DISPLAY_FRAME * ORIGIN.x;
      const topBound = DISPLAY_FRAME * ORIGIN.y;
      const bounds   = cam.getBounds();
      const mapW     = (bounds && bounds.width) ? bounds.width : cam.width;
      const mapH     = (bounds && bounds.height) ? bounds.height : cam.height;
      const speed    = BASE_SKELETON_SPEED * this.speedMult;
      this.sprite.x = Phaser.Math.Clamp(this.sprite.x + (rawDx / dist) * speed * dt, halfW, mapW - halfW);
      this.sprite.y = Phaser.Math.Clamp(this.sprite.y + (rawDy / dist) * speed * dt, topBound, mapH);
    }
    this.facingLeft = rawDx < 0;
    this.sprite.setFlipX(!this.facingLeft);
  }

  _tickPause(dt) {
    this.pauseTimer -= dt;
    if (this.pauseTimer <= 0) this._transitionTo('chase');
  }

  _tickAttack() {
    const frame = this.sprite.anims.currentFrame;
    if (frame?.index === ATTACK_HIT_FRAME && !this.hasDealtDamage) {
      this.hasDealtDamage = true;
      this.scene.sound.play('sfx-sword', { volume: 0.2 });
      const x    = this.sprite.x;
      const y    = this.sprite.y;
      const atkX = this.facingLeft ? x - ATK_INNER - ATK_W : x + ATK_INNER;
      const atkY = y - ATK_VERT_CEN - ATK_H * 0.5;
      this.onAttackFrame(atkX, atkY, ATK_W, ATK_H);
    }
  }

  hitTest(atkX, atkY, atkW, atkH) {
    if (this.state === 'dead') return false;
    const bx = this.sprite.x - HITBOX_W * 0.5;
    const by = this.sprite.y - HITBOX_H;
    return atkX < bx + HITBOX_W && atkX + atkW > bx && atkY < by + HITBOX_H && atkY + atkH > by;
  }

  receiveHit(dx, dy, damage = 1) {
    if (this.state === 'hurt' || this.state === 'dead') return false;
    this.health = Math.max(0, this.health - damage);
    if (this.state === 'attack') this.hasDealtDamage = true;
    this.knockbackVx = dx * KNOCKBACK_SPEED;
    this.knockbackVy = dy * KNOCKBACK_SPEED;
    if (this.health <= 0) { this._transitionTo('dead'); return true; }
    this._transitionTo('hurt');
    return false;
  }

  _transitionTo(next) {
    if (this.state === next) return;
    if (this.state === 'attack' || this.state === 'hurt') {
      this.sprite.removeAllListeners('animationcomplete');
    }
    this.state = next;
    switch (next) {
      case 'chase':
        this.sprite.play('lobit-skeleton-walk');
        break;
      case 'attack':
        this.hasDealtDamage = false;
        this.sprite.play('lobit-skeleton-attack');
        this.sprite.once('animationcomplete', () => this._transitionTo('pause'));
        break;
      case 'pause':
        this.pauseTimer = PAUSE_DURATION;
        this.sprite.play('lobit-skeleton-idle');
        break;
      case 'hurt':
        this.sprite.play('lobit-skeleton-hurt');
        this.sprite.once('animationcomplete', () => this._transitionTo('chase'));
        break;
      case 'dead':
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.deadPhase = 'anim';
        this.onDeath?.();
        this.sprite.play('lobit-skeleton-death');
        this.sprite.once('animationcomplete', () => {
          this.deadPhase = 'linger';
          this.deadTimer = DEATH_LINGER_DURATION;
        });
        break;
    }
  }

  _drawHealthBar() {
    this.healthBarGraphics.clear();
    if (this.state === 'dead') return;
    const x = this.sprite.x - HB_W * 0.5;
    const y = this.sprite.y - DISPLAY_FRAME * ORIGIN.y - HB_OFFSET_Y - HB_H;
    const fillW = HB_W * (this.health / this.maxHealthValue);
    this.healthBarGraphics.fillStyle(HB_COLOR_BG, 0.85);
    this.healthBarGraphics.fillRect(x, y, HB_W, HB_H);
    if (fillW > 0) {
      this.healthBarGraphics.fillStyle(HB_COLOR_FG, 1);
      this.healthBarGraphics.fillRect(x, y, fillW, HB_H);
    }
    this.healthBarGraphics.lineStyle(1, HB_COLOR_BORDER, 1);
    this.healthBarGraphics.strokeRect(x, y, HB_W, HB_H);
  }
}
