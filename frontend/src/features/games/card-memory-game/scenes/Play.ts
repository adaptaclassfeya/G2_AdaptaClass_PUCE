// @ts-nocheck
import Phaser from 'phaser';
import { createCard } from "./createCard";

export class Play extends Phaser.Scene
{
    // Cards Game Objects
    cards = [];

    // History of card opened
    cardOpened = undefined;

    // Can play the game
    canMove = false;

    // Game variables — the lives system was replaced with a streak-of-errors
    // counter that surfaces a question every `errorsPerQuestion` mismatches.
    // A pure lives system felt punishing on the bigger boards (5x4 etc.)
    // where pair-locations are genuinely hard to memorize.
    level = 1;
    score = 0;
    searchingText = null;
    scoreText = null;
    errorsText = null;
    errorsCount = 0;
    errorsPerQuestion = 4;
    isQuestionMode = false;
    modalLocked = false;
    questionOverlayObjects = [];

    // Word Concept pairs database
    pairsDatabase = {
        sinonimos: [
            { word: "rápido", match: "veloz" },
            { word: "alegre", match: "contento" },
            { word: "grande", match: "enorme" },
            { word: "triste", match: "penoso" },
            { word: "cálido", match: "caliente" },
            { word: "fácil", match: "sencillo" },
            { word: "bonito", match: "hermoso" },
            { word: "frío", match: "gélido" },
            { word: "sabio", match: "inteligente" },
            { word: "limpio", match: "aseado" }
        ],
        antonimos: [
            { word: "alto", match: "bajo" },
            { word: "día", match: "noche" },
            { word: "luz", match: "oscuridad" },
            { word: "fuerte", match: "débil" },
            { word: "reír", match: "llorar" },
            { word: "frío", match: "caliente" },
            { word: "joven", match: "viejo" },
            { word: "abierto", match: "cerrado" },
            { word: "dulce", match: "amargo" },
            { word: "limpio", match: "sucio" }
        ],
        definiciones: [
            { word: "Sustantivo", match: "Nombra personas, cosas..." },
            { word: "Verbo", match: "Expresa acciones" },
            { word: "Adjetivo", match: "Describe cualidades" },
            { word: "Fábula", match: "Relato con moraleja" },
            { word: "Sinónimo", match: "Significado similar" },
            { word: "Antónimo", match: "Significado opuesto" },
            { word: "Sílaba", match: "Sonidos juntos" },
            { word: "Pronombre", match: "Reemplaza sustantivo" },
            { word: "Metáfora", match: "Comparación implícita" },
            { word: "Paréntesis", match: "Aclara texto interno" }
        ]
    };

    constructor ()
    {
        super({ key: 'Play' });
    }

    init (data)
    {
        this.cameras.main.fadeIn(500);

        if (data && data.level) {
            this.level = data.level;
            this.score = data.score !== undefined ? data.score : 0;
        } else {
            this.level = 1;
            this.score = 0;
        }
        this.errorsCount = 0;
        this.isQuestionMode = false;
        this.modalLocked = false;
        this.questionOverlayObjects = [];

        this.events.once('shutdown', () => {
            this.isQuestionMode = false;
            this.modalLocked = false;
            this.questionOverlayObjects = [];
        });

        this.volumeButton();
    }

    create ()
    {
        // Background
        this.add.image(0, 0, "background").setOrigin(0).setDisplaySize(800, 900);

        const currentTheme = this.getCurrentTheme();
        const displayThemeName = currentTheme === 'sinonimos' ? 'SINÓNIMOS' 
                               : currentTheme === 'antonimos' ? 'ANTÓNIMOS' 
                               : 'DEFINICIONES';

        // Title/Start screen (only on level 1)
        if (this.level === 1) {
            const titleText = this.add.text(400, 300,
                "Memory Card de Lenguaje\n\nClick para Jugar",
                { align: "center", strokeThickness: 4, fontSize: '36px', fontStyle: "bold", color: "#8c7ae6", fontFamily: 'monospace' }
            )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();

            this.add.tween({
                targets: titleText,
                duration: 800,
                ease: (value) => (value > .8),
                alpha: 0,
                repeat: -1,
                yoyo: true,
            });

            titleText.on('pointerdown', () => {
                this.sound.play("whoosh", { volume: 1.3 });
                this.add.tween({
                    targets: titleText,
                    y: -1000,
                    duration: 500,
                    onComplete: () => {
                        titleText.destroy();
                        if (!this.sound.get("theme-song")) {
                            this.sound.play("theme-song", { loop: true, volume: .3 });
                        }
                        this.startGame();
                    }
                });
            });
        } else {
            this.startGame();
        }
    }

    getCurrentTheme() {
        if (this.level === 1) return 'sinonimos';
        if (this.level === 2) return 'antonimos';
        if (this.level === 3) return 'definiciones';
        // Alternar
        const themes = ['sinonimos', 'antonimos', 'definiciones'];
        return themes[(this.level - 1) % 3];
    }

    getCardCount() {
        if (this.level === 1) return 12; // 6 parejas
        if (this.level === 2) return 16; // 8 parejas
        return 20; // 10 parejas
    }

    startGame ()
    {
        const cardCount = this.getCardCount();
        const currentTheme = this.getCurrentTheme();
        
        const displayThemeName = currentTheme === 'sinonimos' ? 'SINÓNIMOS' 
                               : currentTheme === 'antonimos' ? 'ANTÓNIMOS' 
                               : 'DEFINICIONES';

        // Interface texts
        this.add.text(16, 16, `Nivel: ${this.level}`, {
            fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
        });

        // "Buscando: [Tema]"
        this.searchingText = this.add.text(140, 24, `Buscando: ${displayThemeName}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#facc15', fontStyle: 'bold'
        });

        // WinnerText (no more game-over screen since we removed the lives system)
        const winnerText = this.add.text(400, -1000, "¡NIVEL COMPLETADO!",
            { align: "center", strokeThickness: 4, fontSize: '42px', fontStyle: "bold", color: "#22c55e", fontFamily: 'monospace' }
        ).setOrigin(.5).setDepth(15).setInteractive();

        // Score display
        this.scoreText = this.add.text(620, 16, `Puntos: ${this.score}`, {
            fontFamily: 'monospace', fontSize: '22px', color: '#22c55e', fontStyle: 'bold'
        });

        // Error counter — every `errorsPerQuestion` mismatches surfaces a
        // question instead of removing a life.
        this.errorsText = this.add.text(620, 46, `Errores: 0/${this.errorsPerQuestion}`, {
            fontFamily: 'monospace', fontSize: '18px', color: '#fb923c', fontStyle: 'bold'
        });

        // Generate card pairs
        this.cards = this.generateConceptCards(cardCount, currentTheme);

        // Enable moves after animation completes
        this.time.addEvent({
            delay: 150 * this.cards.length,
            callback: () => {
                this.canMove = true;
            }
        });

        // Interaction logic
        this.input.on('pointerdown', (pointer) => {
            if (!this.canMove || this.cards.length === 0 || this.isQuestionMode) return;

            const card = this.cards.find(c => c.gameObject.getBounds().contains(pointer.x, pointer.y));
            if (card) {
                this.canMove = false;

                if (this.cardOpened !== undefined) {
                    // Prevent clicking same card
                    if (this.cardOpened.gameObject.x === card.gameObject.x && this.cardOpened.gameObject.y === card.gameObject.y) {
                        this.canMove = true;
                        return;
                    }

                    card.flip(() => {
                        if (this.cardOpened.pairId === card.pairId) {
                            // MATCH!
                            this.sound.play("card-match");
                            this.score += 100;
                            this.scoreText.setText(`Puntos: ${this.score}`);

                            const o1 = this.cardOpened;
                            const o2 = card;

                            this.cards = this.cards.filter(cLocal => cLocal.pairId !== card.pairId);
                            this.cardOpened = undefined;

                            this.time.delayedCall(400, () => {
                                o1.destroy();
                                o2.destroy();
                                this.canMove = true;

                                // Check win
                                if (this.cards.length === 0) {
                                    this.sound.play("victory");
                                    this.canMove = false;

                                    this.add.tween({
                                        targets: winnerText,
                                        ease: Phaser.Math.Easing.Bounce.Out,
                                        y: 450,
                                    });
                                }
                            });
                        } else {
                            // MISMATCH — bump the error counter. Every
                            // `errorsPerQuestion` mismatches we surface a
                            // question; the answer is informational (counter
                            // resets either way), no lives lost.
                            this.sound.play("card-mismatch");
                            this.cameras.main.shake(400, 0.005);

                            this.errorsCount += 1;
                            this.errorsText.setText(`Errores: ${this.errorsCount}/${this.errorsPerQuestion}`);

                            this.time.delayedCall(1000, () => {
                                card.flip();
                                this.cardOpened.flip(() => {
                                    this.cardOpened = undefined;
                                    if (this.errorsCount >= this.errorsPerQuestion) {
                                        this.errorsCount = 0;
                                        this.errorsText.setText(`Errores: 0/${this.errorsPerQuestion}`);
                                        this._showQuestion();
                                    } else {
                                        this.canMove = true;
                                    }
                                });
                            });
                        }
                    });
                } else {
                    card.flip(() => {
                        this.canMove = true;
                    });
                    this.cardOpened = card;
                }
            }
        });

        // Win click: goes to next level
        winnerText.on('pointerdown', () => {
            this.sound.play("whoosh", { volume: 1.3 });
            this.add.tween({
                targets: winnerText,
                y: -1000,
                duration: 500,
                onComplete: () => {
                    this.cards.forEach(c => c.gameObject.destroy());
                    this.cards = [];
                    this.scene.start('Play', {
                        level: this.level + 1,
                        score: this.score,
                    });
                }
            });
        });
    }

    generateConceptCards(cardCount, currentTheme) {
        const fullList = this.pairsDatabase[currentTheme];
        const numPairs = cardCount / 2;
        
        // Select random subset of pairs
        const selectedPairs = Phaser.Utils.Array.Shuffle([...fullList]).slice(0, numPairs);

        // Construct 2N card definitions
        const cardDefs = [];
        selectedPairs.forEach((pair, index) => {
            cardDefs.push({ text: pair.word, pairId: index });
            cardDefs.push({ text: pair.match, pairId: index });
        });

        // Shuffle card definitions
        const shuffledDefs = Phaser.Utils.Array.Shuffle(cardDefs);

        // Calculate layout columns and rows dynamically
        let cols = 4;
        if (cardCount > 16) {
            cols = 5;
        } else if (cardCount > 12) {
            cols = 4;
        }
        const rows = Math.ceil(cardCount / cols);

        const paddingX = 24;
        const paddingY = 20;
        const wAvail = 760; // 20px padding left and right
        const hAvail = 770; // leaves space at top for headers (lives, theme name, etc.)
 
        // Compute maximum scale that fits within both available width and height
        const scaleW = (wAvail - (cols - 1) * paddingX) / (cols * 98);
        const scaleH = (hAvail - (rows - 1) * paddingY) / (rows * 128);
        const scale = Math.min(1.5, scaleW, scaleH);
 
        const cardW = 98 * scale;
        const cardH = 128 * scale;
 
        const gridW = cols * (cardW + paddingX) - paddingX;
        const gridH = rows * (cardH + paddingY) - paddingY;
 
        // Center the grid dynamically in the canvas (800x900)
        const xStart = (800 - gridW) / 2 + cardW / 2;
        const yStart = 100 + (800 - gridH) / 2 + cardH / 2;

        return shuffledDefs.map((def, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            const tx = xStart + col * (cardW + paddingX);
            const ty = yStart + row * (cardH + paddingY);

            const card = createCard({
                scene: this,
                x: tx,
                y: -500, // Starts offscreen
                textString: def.text,
                cardName: `card_${index}`,
                pairId: def.pairId,
                scale: scale
            });

            // Slide card in
            this.add.tween({
                targets: card.gameObject,
                y: ty,
                duration: 800,
                delay: index * 100,
                ease: 'Back.easeOut',
                onStart: () => this.sound.play("card-slide", { volume: 0.6 })
            });

            return card;
        });
    }

    _showQuestion ()
    {
        if (this.isQuestionMode || this.modalLocked) return;
        this.modalLocked = true;
        this.isQuestionMode = true;

        const fallback = [
            { q: "¿Cuál de estas palabras es un sustantivo?", options: ["mesa", "correr", "rápido", "y"], answer: 0 },
            { q: "Sinónimo de 'alegre':", options: ["triste", "feliz", "lento", "duro"], answer: 1 },
            { q: "Antónimo de 'grande':", options: ["enorme", "gigante", "pequeño", "amplio"], answer: 2 },
        ];
        const bank = this.registry.get('preguntasDelNivel') || [];
        const pool = bank.length > 0 ? bank : fallback;
        const qData = Phaser.Utils.Array.GetRandom(pool);

        const options = [...qData.options];
        const correctString = options[qData.answer];
        Phaser.Utils.Array.Shuffle(options);
        const correctIndex = options.indexOf(correctString);

        const cx = 400;
        const cy = 450;

        const overlay = this.add.rectangle(cx, cy, 800, 900, 0x000000, 0.85)
            .setDepth(200).setInteractive();
        this.questionOverlayObjects.push(overlay);

        const titleText = this.add.text(cx, cy - 240, '¡PREGUNTA!', {
            fontFamily: 'monospace', fontSize: '32px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(titleText);

        const questionText = this.add.text(cx, cy - 160, qData.q, {
            fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
            wordWrap: { width: 700 }, align: 'center'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(questionText);

        const btnW = 320, btnH = 90, gapX = 24, gapY = 16;
        const gridX = cx - btnW - gapX / 2;
        const gridY = cy - 40;

        options.forEach((option, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const bx = gridX + col * (btnW + gapX);
            const by = gridY + row * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(201);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
                wordWrap: { width: btnW - 20 }, align: 'center'
            }).setOrigin(0.5).setDepth(202);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
                .setDepth(203).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => this._answerCardQuestion(i, correctIndex, bx, by, btnW, btnH, btnGfx, qData));
        });
    }

    _answerCardQuestion (selectedIndex, correctIndex, bx, by, btnW, btnH, btnGfx, qData)
    {
        this.questionOverlayObjects.forEach(obj => {
            if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive();
        });

        const correct = selectedIndex === correctIndex;
        if (qData && qData.id) {
            window.dispatchEvent(new CustomEvent('game:answer', { detail: { question_id: qData.id, correct } }));
        }
        btnGfx.clear();
        btnGfx.fillStyle(correct ? 0x166534 : 0x7f1d1d, 0.95);
        btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
        btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
        btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

        const feedback = this.add.text(400, 800, correct ? '¡CORRECTO!' : 'INCORRECTO', {
            fontFamily: 'monospace', fontSize: '28px',
            color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(202);
        this.questionOverlayObjects.push(feedback);

        if (correct) {
            this.score += 50;
            this.scoreText.setText(`Puntos: ${this.score}`);
            this.sound.play("card-match");
        } else {
            this.sound.play("card-mismatch");
        }

        this.time.delayedCall(1600, () => {
            this.questionOverlayObjects.forEach(o => o.destroy());
            this.questionOverlayObjects = [];
            this.isQuestionMode = false;
            this.modalLocked = false;
            this.canMove = true;
        });
    }

    volumeButton ()
    {
        const volumeIcon = this.add.image(25, 25, "volume-icon").setName("volume-icon");
        volumeIcon.setInteractive();
        volumeIcon.on('pointerover', () => this.input.setDefaultCursor("pointer"));
        volumeIcon.on('pointerout', () => this.input.setDefaultCursor("default"));

        volumeIcon.on('pointerdown', () => {
            if (this.sound.volume === 0) {
                this.sound.setVolume(1);
                volumeIcon.setTexture("volume-icon");
                volumeIcon.setAlpha(1);
            } else {
                this.sound.setVolume(0);
                volumeIcon.setTexture("volume-icon_off");
                volumeIcon.setAlpha(.5);
            }
        });
    }
}
