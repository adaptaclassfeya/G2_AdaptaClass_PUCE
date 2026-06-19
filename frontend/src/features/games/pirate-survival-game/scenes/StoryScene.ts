// @ts-nocheck
import Phaser from 'phaser';
import { SCENE_KEYS } from '../game/types';

const DIALOGUES = {
  0: { name: 'Narrador', text: 'En la oscuridad de la noche, una leyenda estaba a punto de escribirse...', char: null },
  1: { name: 'Pirata', text: '¡Por fin! ¡He encontrado la isla calavera donde dicen que yace el tesoro infinito!', char: 'pirate' },
  2: { name: 'Pirata', text: 'Nadie podrá detenerme ahora. El botín será mío.', char: 'pirate' },
  3: { name: 'Esqueleto', text: '¡Jajajaja! ¿Un simple mortal intentando robar mi oro?', char: 'skeleton' },
  4: { name: 'Esqueleto', text: 'Llevo siglos protegiendo este lugar. Muchos han venido, ninguno ha vuelto.', char: 'skeleton' },
  5: { name: 'Pirata', text: '¡Tus amenazas no me asustan, saco de huesos! Entrégame el tesoro.', char: 'pirate' },
  6: { name: 'Esqueleto', text: '¿Valor o estupidez? Pronto lo averiguaremos.', char: 'skeleton' },
  7: { name: 'Esqueleto', text: 'Te reto, mortal. A que no puedes responder mis preguntas. Si fallas, tu alma será mía.', char: 'skeleton' },
  8: { name: 'Esqueleto', text: 'Vaya... Eres muy inteligente. Entonces enfrentémonos en una batalla para ver quién sale victorioso.', char: 'skeleton' },
  9: { name: 'Pirata', text: '¡Acepto el desafío! ¡Perderás y me llevaré tu tesoro!', char: 'pirate' },
  10: { name: 'Narrador', text: 'Una pelea épica está por comenzar...', char: 'both' }
};

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  create() {
    const cam = this.cameras.main;
    this.cameras.main.setBackgroundColor(0x000000);

    // Background
    this.bg = this.add.image(cam.centerX, cam.centerY, 'story-bg').setOrigin(0.5).setAlpha(0);
    // scale to cover screen if needed (960x540 is game size)
    this.bg.setDisplaySize(960, 540);
    
    // Characters
    this.pirate = this.add.image(200, cam.centerY + 50, 'story-pirate').setOrigin(0.5).setAlpha(0).setScale(0.8);
    this.skeleton = this.add.image(760, cam.centerY + 50, 'story-skeleton').setOrigin(0.5).setAlpha(0).setScale(0.8);

    // Dialog Box UI
    this.dialogBox = this.add.rectangle(cam.centerX, 460, 800, 120, 0x000000, 0.7).setStrokeStyle(4, 0xffffff);
    this.nameText = this.add.text(cam.centerX - 380, 410, '', {
      fontFamily: 'monospace', fontSize: '24px', color: '#facc15', fontStyle: 'bold'
    });
    this.dialogText = this.add.text(cam.centerX - 380, 440, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', wordWrap: { width: 760 }
    });

    // Interaction elements
    this.dialogueStep = 0;
    this.questions = this.registry.get('preguntasDelNivel') || [];
    this.currentQuestionIndex = 0;
    this.questionsAsked = 0; // We will ask up to 2 questions
    this.isAskingQuestion = false;
    this.isGameOver = false;

    // BGM
    this.bgm = this.sound.add('bgm-right', { loop: true, volume: 0 });
    this.bgm.play();

    // Fade in bg
    this.tweens.add({ targets: this.bg, alpha: 1, duration: 2000 });

    this.input.on('pointerdown', this.handleNextDialog, this);
    
    this.updateDialogUI();

    // Option Buttons Container
    this.optionsContainer = this.add.container(cam.centerX, cam.centerY).setDepth(100).setVisible(false);
  }

  handleNextDialog() {
    if (this.isAskingQuestion || this.isGameOver) return; // Block clicks during questions or game over

    this.dialogueStep++;

    // Incremental BGM volume
    const maxVol = 0.4;
    const volPerStep = maxVol / 5;
    const targetVol = Math.min(maxVol, this.dialogueStep * volPerStep);
    this.tweens.add({ targets: this.bgm, volume: targetVol, duration: 500 });

    // Special logic for step 7 (Asking question)
    if (this.dialogueStep === 7) {
      this.updateDialogUI();
      this.isAskingQuestion = true; // Lock clicks immediately!
      if (this.questions.length > 0) {
        this.time.delayedCall(1500, () => this.askQuestion());
      } else {
        // No questions loaded, skip straight to step 8
        this.time.delayedCall(1500, () => {
          this.isAskingQuestion = false;
          this.dialogueStep = 8;
          this.updateDialogUI();
        });
      }
      return;
    }

    if (this.dialogueStep <= 10) {
      this.updateDialogUI();
    }
  }

  updateDialogUI() {
    const dialog = DIALOGUES[this.dialogueStep];
    if (!dialog) return;

    this.nameText.setText(dialog.name);
    this.dialogText.setText('');
    
    // Typewriter effect
    let i = 0;
    if (this.typingTimer) this.typingTimer.remove();
    this.typingTimer = this.time.addEvent({
      delay: 30,
      repeat: dialog.text.length - 1,
      callback: () => {
        this.dialogText.setText(dialog.text.substring(0, i + 1));
        i++;
      }
    });

    // Character Animations
    if (dialog.char === 'pirate' && this.pirate.alpha === 0) {
      this.tweens.add({ targets: this.pirate, alpha: 1, x: 250, duration: 1000, ease: 'Power2' });
    }
    if (dialog.char === 'skeleton' && this.skeleton.alpha === 0) {
      this.tweens.add({ targets: this.skeleton, alpha: 1, x: 710, duration: 1000, ease: 'Power2' });
    }

    // Bounce the speaker slightly
    if (dialog.char === 'pirate') {
      this.tweens.add({ targets: this.pirate, y: this.cameras.main.centerY + 40, yoyo: true, duration: 150, repeat: 1 });
      this.pirate.setTint(0xffffff);
      this.skeleton.setTint(0x777777);
    } else if (dialog.char === 'skeleton') {
      this.tweens.add({ targets: this.skeleton, y: this.cameras.main.centerY + 40, yoyo: true, duration: 150, repeat: 1 });
      this.skeleton.setTint(0xffffff);
      this.pirate.setTint(0x777777);
    } else if (dialog.char === 'both') {
      this.skeleton.setTint(0xffffff);
      this.pirate.setTint(0xffffff);
    }

    // Step 10: Show play button
    if (this.dialogueStep === 10) {
      const playBtn = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY - 100, 200, 60, 0xfacc15)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(4, 0xffffff);
      const playText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, '¡JUGAR!', {
        fontFamily: 'monospace', fontSize: '28px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5);

      this.tweens.add({ targets: [playBtn, playText], scale: 1.1, yoyo: true, repeat: -1, duration: 800 });

      playBtn.on('pointerdown', () => {
        this.scene.start(SCENE_KEYS.MainMenu);
      });
    }
  }

  askQuestion() {
    if (this.questionsAsked >= 2 || this.questions.length === 0) {
      // Done asking questions, resume dialogue at step 8
      this.isAskingQuestion = false;
      this.optionsContainer.removeAll(true);
      this.optionsContainer.setVisible(false);
      this.dialogueStep = 8;
      this.updateDialogUI();
      return;
    }

    this.isAskingQuestion = true;
    
    // Pick a random question
    const qIndex = Phaser.Math.RND.between(0, this.questions.length - 1);
    const q = this.questions[qIndex];

    this.optionsContainer.removeAll(true);
    this.optionsContainer.setVisible(true);

    const questionText = this.add.text(0, -150, q.q, {
      fontFamily: 'monospace', fontSize: '24px', color: '#facc15', fontStyle: 'bold', align: 'center', wordWrap: { width: 800 },
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true }
    }).setOrigin(0.5);
    this.optionsContainer.add(questionText);

    const startY = -60;
    q.options.forEach((optText, idx) => {
      const isCorrect = (idx === q.answer);
      
      const btnBg = this.add.rectangle(0, startY + (idx * 60), 600, 50, 0x000000, 0.8)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
        
      const text = this.add.text(0, startY + (idx * 60), optText, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', wordWrap: { width: 580 }
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x333333));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x000000));
      
      btnBg.on('pointerdown', () => {
        if (q && q.id) {
          window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: q.id, correct: isCorrect } }));
        }
        if (isCorrect) {
          // Correct!
          btnBg.setFillStyle(0x22c55e);
          this.questionsAsked++;
          
          this.optionsContainer.removeAll(true);
          const resp = this.questionsAsked === 1 ? '¡Increíble, cómo sabías eso?!' : '¡No está mal para un simple mortal!';
          this.nameText.setText('Esqueleto');
          this.dialogText.setText('');
          let k = 0;
          if (this.typingTimer) this.typingTimer.remove();
          this.typingTimer = this.time.addEvent({
            delay: 30, repeat: resp.length - 1, callback: () => {
              this.dialogText.setText(resp.substring(0, k + 1));
              k++;
            }
          });

          this.time.delayedCall(2000, () => this.askQuestion()); // Ask next
        } else {
          // Wrong!
          btnBg.setFillStyle(0xef4444);
          this.triggerGameOver();
        }
      });

      this.optionsContainer.add([btnBg, text]);
    });
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.isAskingQuestion = true; // block clicks
    this.optionsContainer.removeAll(true);
    this.optionsContainer.setVisible(false);

    this.nameText.setText('Esqueleto');
    this.dialogText.setText('¡Ja, ja, ja! No eres digno de enfrentarte a mí. ¡Tu alma me pertenece!');

    this.tweens.add({ targets: this.skeleton, scale: 1.2, duration: 500, yoyo: true, repeat: 3 });
    this.pirate.setTint(0xff0000);

    this.time.delayedCall(3000, () => {
      // Show Game Over Overlay
      const overlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, 960, 540, 0x000000, 0.9).setDepth(200);
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'GAME OVER', {
        fontFamily: 'monospace', fontSize: '64px', color: '#ef4444', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(200);

      const exitBtn = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY + 50, 200, 50, 0xffffff)
        .setInteractive({ useHandCursor: true }).setDepth(200);
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'SALIR', {
        fontFamily: 'monospace', fontSize: '24px', color: '#000000', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(200);

      exitBtn.on('pointerdown', () => {
        window.dispatchEvent(new Event('game:quit')); // Uses the listener inside the React component
      });
    });
  }
}
