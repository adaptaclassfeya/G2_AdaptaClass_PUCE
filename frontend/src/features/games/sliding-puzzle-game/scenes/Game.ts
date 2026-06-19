// @ts-nocheck
import Phaser from 'phaser';

// No custom filters needed

const SlidingPuzzle = {
    ALLOW_CLICK: 0,
    TWEENING: 1
};

/**
 * Sliding Puzzle Game Template
 * ----------------------------
 *
 * This is the classic Sliding Puzzle game. Unlike lots of implementations out there,
 * we don't use a 'random' starting layout, as otherwise the puzzle will be unsolvable
 * 50% of the time. Instead we use a puzzle walker function. This allows you to see
 * the puzzle before-hand, and then it gets all manged up, ready for you to solve.
 *
 * You can control the number of iterations, or steps, that the walker goes through.
 * You can of course provide any image you like to the puzzle, and it'll adapt and resize
 * without changing much.
 *
 * In this example template there are 3 pictures, and as you solve them, the walker
 * increases in complexity each time, making it harder to solve.
 *
 * This web site has some creative tips on solving Sliding Puzzles:
 * http://www.nordinho.net/vbull/blogs/lunanik/6131-slider-puzzles-solved-once-all.html
 */

export default class Game extends Phaser.Scene
{
    constructor ()
    {
        super('Game');

        //  These are all set in the startPuzzle function
        this.rows = 0;
        this.columns = 0;

        //  The width and height of each piece in the puzzle.
        //  Again, this is set automatically in startPuzzle.
        this.pieceWidth = 0;
        this.pieceHeight = 0;

        this.pieces = null;
        this.spacer = null;

        //  The speed at which the pieces slide, and the tween they use
        this.slideSpeed = 300;
        this.slideEase = 'power3';

        //  The number of iterations the puzzle walker will go through when
        //  scrambling up the puzzle. 10 is a nice and easy puzzle, but
        //  push it higher for much harder ones.
        this.iterations = 6;

        //  The speed at which the pieces are shuffled at the start. This allows
        //  the player to see the puzzle before trying to solve it. However if
        //  you don't want this, just set the speed to zero and it'll appear
        //  instantly 'scrambled'.
        this.shuffleSpeed = 200;
        this.shuffleEase = 'power1';

        this.lastMove = null;

        //  The image in the Cache to be used for the puzzle.
        //  Set in the startPuzzle function.
        this.photo = '';

        this.slices = [];

        this.action = SlidingPuzzle.ALLOW_CLICK;
        
        this.movesCount = 0;
        this.questions = [];
        this.questionOverlayObjects = [];
        this.modalLocked = false;
        this.movesText = null;
    }

    create ()
    {
        this.add.image(512, 384, 'background');
        this.add.image(512, 384, 'box-inside');

        // Reset ALL per-run state. Phaser scenes reuse the same class
        // instance across stop/start cycles, so properties set in the
        // constructor keep their last-run value. `iterations` was the
        // landmine here — it decremented to 0 during play, so a wrapper
        // Restart re-entered create() with iterations=0, and the next
        // `shufflePieces` did a single swap and went straight to
        // ALLOW_CLICK with a puzzle already 99% solved.
        this.iterations = 6;
        this.action = SlidingPuzzle.ALLOW_CLICK;
        this.lastMove = null;
        this.movesCount = 0;
        this.lives = 4;
        this.questions = this.registry.get('preguntasDelNivel') || [];
        this.questionOverlayObjects = [];
        this.modalLocked = false;
        this.events.once('shutdown', () => {
            this.modalLocked = false;
            this.questionOverlayObjects = [];
        });
        this.movesText = this.add.text(20, 20, 'MOVIMIENTOS: 0', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffd700', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        });
        this.livesText = this.add.text(620, 20, 'VIDAS: ❤️❤️❤️❤️', {
            fontFamily: 'Arial', fontSize: '32px', color: '#ff4d4d', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        });
 
        window.solve = () => {
            this.nextRound();
        };
 
        this.startPuzzle('pic1', 3, 3);
    }

    /**
     * This function is responsible for building the puzzle.
     * It takes an Image key and a width and height of the puzzle (in pieces, not pixels).
     * Read the comments within this function to find out what happens.
     */
    startPuzzle (key, rows, columns)
    {
        this.photo = key;
 
        //  The size if the puzzle, in pieces (not pixels)
        this.rows = rows;
        this.columns = columns;
 
        // Clean up any dynamic textures from the global texture manager to prevent restart crashes
        for (let s = 0; s < 50; s++)
        {
            if (this.textures.exists(`slice${s}`))
            {
                this.textures.remove(`slice${s}`);
            }
        }
 
        //  The size of the source image
        const texture = this.textures.getFrame(key);

        const photoWidth = texture.width;
        const photoHeight = texture.height;

        //  Create our sliding pieces

        //  Each piece will be this size:
        const pieceWidth = photoWidth / rows;
        const pieceHeight = photoHeight / columns;

        this.pieceWidth = pieceWidth;
        this.pieceHeight = pieceHeight;

        //  A Container to put the pieces in
        if (this.pieces)
        {
            this.pieces.removeAll(true);
        }
        else
        {
            //  The position sets the top-left of the container for the pieces to expand down from
            this.pieces = this.add.container(160, 42).setScale(1.1);
        }

        //  An array to put the texture slices in
        if (this.slices)
        {
            this.slices.forEach(slice => slice.destroy());

            this.slices = [];
        }

        let i = 0;

        //  Loop through the image and create a new Sprite for each piece of the puzzle.
        for (let y = 0; y < this.columns; y++)
        {
            for (let x = 0; x < this.rows; x++)
            {
                //  remove old textures

                const slice = this.textures.addDynamicTexture(`slice${i}`, pieceWidth, pieceHeight);

                const ox = 0 + (x / this.rows);
                const oy = 0 + (y / this.columns);

                slice.stamp(key, null, 0, 0, { originX: ox, originY: oy }).render();

                this.slices.push(slice);

                const piece = this.add.image(x * pieceWidth, y * pieceHeight, `slice${i}`);

                piece.setOrigin(0, 0);

                //  The current row and column of the piece
                //  Store the row and column the piece _should_ be in, when the puzzle is solved
                piece.setData({
                    row: x,
                    column: y,
                    correctRow: x,
                    correctColumn: y
                });

                piece.setInteractive();

                piece.on('pointerdown', () => this.checkPiece(piece));

                this.pieces.add(piece);

                i++;
            }
        }

        //  The last piece will be our 'spacer' to slide in to
        this.spacer = this.pieces.getAt(this.pieces.length - 1);
        this.spacer.alpha = 0;
 
        this.lastMove = null;
        
        this.movesCount = 0;
        if (this.movesText) {
            this.movesText.setText('MOVIMIENTOS: 0');
        }
 
        this.shufflePieces();
    }

    /**
     * This shuffles up our puzzle.
     *
     * We can't just 'randomize' the tiles, or 50% of the time we'll get an
     * unsolvable puzzle. So instead lets walk it, making non-repeating random moves.
     */
    shufflePieces ()
    {
        //  Push all available moves into this array
        const moves = [];

        const spacerCol = this.spacer.data.get('column');
        const spacerRow = this.spacer.data.get('row');

        if (spacerCol > 0 && this.lastMove !== Phaser.DOWN)
        {
            moves.push(Phaser.UP);
        }

        if (spacerCol < this.columns - 1 && this.lastMove !== Phaser.UP)
        {
            moves.push(Phaser.DOWN);
        }

        if (spacerRow > 0 && this.lastMove !== Phaser.RIGHT)
        {
            moves.push(Phaser.LEFT);
        }

        if (spacerRow < this.rows - 1 && this.lastMove !== Phaser.LEFT)
        {
            moves.push(Phaser.RIGHT);
        }

        //  Pick a move at random from the array
        this.lastMove = Phaser.Utils.Array.GetRandom(moves);

        //  Then move the spacer into the new position
        switch (this.lastMove)
        {
            case Phaser.UP:
                this.swapPiece(spacerRow, spacerCol - 1);
                break;

            case Phaser.DOWN:
                this.swapPiece(spacerRow, spacerCol + 1);
                break;

            case Phaser.LEFT:
                this.swapPiece(spacerRow - 1, spacerCol);
                break;

            case Phaser.RIGHT:
                this.swapPiece(spacerRow + 1, spacerCol);
                break;
        }
    }

    /**
     * Swaps the spacer with the piece in the given row and column.
     */
    swapPiece (row, column)
    {
        //  row and column is the new destination of the spacer

        const piece = this.getPiece(row, column);

        const spacer = this.spacer;
        const x = spacer.x;
        const y = spacer.y;

        // piece.data.set({
        //     row: spacer.data.get('row'),
        //     column: spacer.data.get('column')
        // });

        piece.data.values.row = spacer.data.values.row;
        piece.data.values.column = spacer.data.values.column;

        spacer.data.values.row = row;
        spacer.data.values.column = column;

        // spacer.data.set({
        //     row,
        //     column
        // });

        // this.spacer.data.row = row;
        // this.spacer.data.column = column;

        spacer.setPosition(piece.x, piece.y);

        //  If we don't want them to watch the puzzle get shuffled, then just
        //  set the piece to the new position immediately.
        if (this.shuffleSpeed === 0)
        {
            piece.setPosition(x, y);

            if (this.iterations > 0)
            {
                //  Any more iterations left? If so, shuffle, otherwise start play
                this.iterations--;

                this.shufflePieces();
            }
            else
            {
                this.startPlay();
            }
        }
        else
        {
            //  Otherwise, tween it into place
            const tween = this.tweens.add({
                targets: piece,
                x,
                y,
                duration: this.shuffleSpeed,
                ease: this.shuffleEase
            });

            if (this.iterations > 0)
            {
                //  Any more iterations left? If so, shuffle, otherwise start play
                this.iterations--;

                tween.on('complete', this.shufflePieces, this);
            }
            else
            {
                tween.on('complete', this.startPlay, this);
            }
        }
    }

    /**
     * Gets the piece at row and column.
     */
    getPiece (row, column)
    {
        for (let i = 0; i < this.pieces.length; i++)
        {
            const piece = this.pieces.getAt(i);

            if (piece.data.get('row') === row && piece.data.get('column') === column)
            {
                return piece;
            }
        }

        return null;
    }

    /**
     * Sets the game state to allow the user to click.
     */
    startPlay ()
    {
        this.action = SlidingPuzzle.ALLOW_CLICK;
    }

    /**
     * Called when the user clicks on any of the puzzle pieces.
     * It first checks to see if the piece is adjacent to the 'spacer', and if not, bails out.
     * If it is, the two pieces are swapped by calling `this.slidePiece`.
     */
    checkPiece (piece)
    {
        if (this.action !== SlidingPuzzle.ALLOW_CLICK)
        {
            return;
        }

        //  Only allowed if adjacent to the 'spacer'
        //
        //  Remember:
        //
        //  Columns = vertical (y) axis
        //  Rows = horizontal (x) axis

        const spacer = this.spacer;

        if (piece.data.values.row === spacer.data.values.row)
        {
            if (spacer.data.values.column === piece.data.values.column - 1)
            {
                //  Space above the piece?
                piece.data.values.column--;

                spacer.data.values.column++;
                spacer.y += this.pieceHeight;

                this.slidePiece(piece, piece.x, piece.y - this.pieceHeight);
            }
            else if (spacer.data.values.column === piece.data.values.column + 1)
            {
                //  Space below the piece?
                piece.data.values.column++;

                spacer.data.values.column--;
                spacer.y -= this.pieceHeight;

                this.slidePiece(piece, piece.x, piece.y + this.pieceHeight);
            }
        }
        else if (piece.data.values.column === spacer.data.values.column)
        {
            if (spacer.data.values.row === piece.data.values.row - 1)
            {
                //  Space to the left of the piece?
                piece.data.values.row--;

                spacer.data.values.row++;
                spacer.x += this.pieceWidth;

                this.slidePiece(piece, piece.x - this.pieceWidth, piece.y);
            }
            else if (spacer.data.values.row === piece.data.values.row + 1)
            {
                //  Space to the right of the piece?
                piece.data.values.row++;

                spacer.data.values.row--;
                spacer.x -= this.pieceWidth;

                this.slidePiece(piece, piece.x + this.pieceWidth, piece.y);
            }
        }
    }

    /**
     * Slides the piece into the position previously occupied by the spacer.
     * Uses a tween (see slideSpeed and slideEase for controls).
     * When complete, calls tweenOver.
     */
    slidePiece (piece, x, y)
    {
        this.action = SlidingPuzzle.TWEENING;
        this.movesCount++;
        if (this.movesText) {
            this.movesText.setText('MOVIMIENTOS: ' + this.movesCount);
        }
 
        this.sound.play('move');
 
        this.tweens.add({
            targets: piece,
            x,
            y,
            duration: this.slideSpeed,
            ease: this.slideEase,
            onComplete: () => this.tweenOver()
        });
    }

    /**
     * Called when a piece finishes sliding into place.
     * First checks if the puzzle is solved. If not, allows the player to carry on.
     */
    tweenOver ()
    {
        //  Are all the pieces in the right place?

        let outOfSequence = false;

        this.pieces.each(piece => {

            if (piece.data.values.correctRow !== piece.data.values.row || piece.data.values.correctColumn !== piece.data.values.column)
            {
                outOfSequence = true;
            }

        });

        if (outOfSequence)
        {
            //  Not correct, so let the player carry on.
            if (this.movesCount > 0 && this.movesCount % 10 === 0) {
                this.triggerMoveQuestion();
            } else {
                this.action = SlidingPuzzle.ALLOW_CLICK;
            }
        }
        else
        {
            //  If we get this far then the sequence is correct and the puzzle is solved.
            //  Fade the missing piece back in ...
            //  When the tween finishes we'll let them click to start the next round

            //  Solved — reveal the missing piece, run a celebration pulse,
            //  then surface the completion overlay. Critical: schedule the
            //  overlay via `delayedCall` instead of the pulse tween's
            //  `onComplete`. If the pulse tween fails to fire onComplete
            //  (empty targets, conflicting tween on the same property, etc.)
            //  the player gets stuck on a frozen scene with no way out.
            this.sound.play('win');

            this.tweens.add({
                targets: this.spacer,
                alpha: 1,
                duration: this.slideSpeed * 2,
                ease: 'linear',
            });

            // Pulse to celebrate (best-effort; not load-bearing).
            const piecesArr = this.pieces ? this.pieces.getChildren() : [];
            if (piecesArr.length > 0) {
                this.tweens.add({
                    targets: piecesArr,
                    scaleX: '*=1.05',
                    scaleY: '*=1.05',
                    duration: 200,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Quad.easeInOut',
                });
            }

            // Guaranteed overlay even if every tween above fails.
            this.time.delayedCall(900, () => this._showCompletionOverlay());
        }
    }

    _showCompletionOverlay ()
    {
        const cx = 512;
        const cy = 384;

        const objects = [];

        const overlay = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.85)
            .setDepth(200).setInteractive();
        objects.push(overlay);

        const winText = this.add.text(cx, cy - 180, "¡PUZZLE\nCOMPLETADO!", {
            fontFamily: 'Arial', fontSize: '56px', color: '#22c55e', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(201);
        objects.push(winText);

        const movesInfo = this.add.text(cx, cy - 40,
            `Movimientos: ${this.movesCount}`, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(201);
        objects.push(movesInfo);

        const makeButton = (y, label, color, onClick) => {
            const btnW = 360, btnH = 80;
            const bx = cx - btnW / 2;
            const by = y - btnH / 2;

            const gfx = this.add.graphics().setDepth(201);
            gfx.fillStyle(color, 0.95);
            gfx.fillRoundedRect(bx, by, btnW, btnH, 10);
            gfx.lineStyle(3, 0x000000, 1);
            gfx.strokeRoundedRect(bx, by, btnW, btnH, 10);
            objects.push(gfx);

            const text = this.add.text(cx, y, label, {
                fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(202);
            objects.push(text);

            const hit = this.add.rectangle(cx, y, btnW, btnH)
                .setDepth(203).setInteractive({ useHandCursor: true });
            objects.push(hit);

            hit.on('pointerdown', () => {
                objects.forEach(o => o.destroy());
                onClick();
            });
        };

        // Two clean choices. The original game had a `nextRound` cycle but
        // it doesn't work reliably across all the loaded puzzles, so we
        // only offer Reiniciar (re-shuffles the same image, guaranteed to
        // work) and Salir (dispatches 'game:quit' which useGameSession
        // catches to route back to the catalog).
        makeButton(cy + 60, 'Reiniciar', 0x16a34a, () => {
            this._resetForNewPuzzle();
            this.startPuzzle(this.photo, this.rows, this.columns);
        });

        makeButton(cy + 170, 'Salir', 0x0284c7, () => {
            window.dispatchEvent(new CustomEvent('game:quit'));
        });
    }

    _resetForNewPuzzle ()
    {
        // The restart button needs a clean slate. Without this:
        //  - `iterations` was 0 after a full game so the new shuffle barely
        //    moved any tiles → the "restarted" puzzle was already solved.
        //  - `action` stayed at TWEENING (from the last slide before the
        //    win) and blocked every future click.
        //  - Stale tweens kept tweening pieces that were about to be
        //    destroyed, occasionally throwing inside Phaser's update loop.
        this.iterations = 6;
        this.action = SlidingPuzzle.ALLOW_CLICK;
        this.lastMove = null;
        this.modalLocked = false;
        if (this.questionOverlayObjects && this.questionOverlayObjects.length > 0) {
            this.questionOverlayObjects.forEach(o => { try { o.destroy(); } catch { /* noop */ } });
            this.questionOverlayObjects = [];
        }
        this.tweens.killAll();
    }

    /**
     * Starts the next round of the game.
     *
     * In this template it cycles between the 3 pictures, increasing the iterations and complexity
     * as it progresses. But you can replace this with whatever you need - perhaps returning to
     * a main menu to select a new puzzle?
     */
    nextRound ()
    {
        let size;
        let iterations;
        let nextPhoto;

        if (this.photo === 'pic1')
        {
            nextPhoto = 'pic2';
            iterations = 20;
            size = 4;
        }
        else if (this.photo === 'pic2')
        {
            nextPhoto = 'pic3';
            iterations = 30;
            size = 5;
        }
        else
        {
            //  Back to the start again
            nextPhoto = 'pic1';
            iterations = 10;
            size = 3;
        }

        this.reveal = this.add.image(this.pieces.x, this.pieces.y, nextPhoto).setOrigin(0, 0).setAlpha(0).setScale(1.1);

        this.tweens.add({
            targets: this.reveal,
            alpha: 1,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                this.photo = nextPhoto;
                this.iterations = iterations;
                this.reveal.destroy();
                this.startPuzzle(nextPhoto, size, size);
            }
        });
    }

    triggerMoveQuestion() {
        if (this.modalLocked) {
            return;
        }
        this.modalLocked = true;
        const fallbacks = [
            { q: "¿Qué palabra es un sustantivo?", options: ["mesa", "cantar", "azul", "rápidamente"], answer: 0 },
            { q: "Sinónimo de 'estudiante':", options: ["alumno", "profesor", "aula", "libro"], answer: 0 },
            { q: "Antónimo de 'silencio':", options: ["ruido", "paz", "tranquilidad", "calma"], answer: 0 },
            { q: "¿Cuál es el plural de 'sofá'?", options: ["sofás", "sofases", "sofaes", "sofáses"], answer: 0 }
        ];
        const source = this.questions.length > 0 ? this.questions : fallbacks;
        const qData = Phaser.Utils.Array.GetRandom(source);

        const cx = 512;
        const cy = 384;

        const overlay = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.9).setDepth(200).setInteractive();
        this.questionOverlayObjects.push(overlay);

        const titleTxt = this.add.text(cx, cy - 180, "¡RETO DE ORTOGRAFÍA!", {
            fontFamily: 'Arial', fontSize: '36px', color: '#facc15', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(titleTxt);

        const subTxt = this.add.text(cx, cy - 140, "Cada 10 movimientos debes responder correctamente para continuar", {
            fontFamily: 'Arial', fontSize: '22px', color: '#ffd700'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(subTxt);

        const questionTxt = this.add.text(cx, cy - 60, qData.q, {
            fontFamily: 'Arial', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: 800 }, align: 'center'
        }).setOrigin(0.5).setDepth(201);
        this.questionOverlayObjects.push(questionTxt);

        const options = [...qData.options];
        const correctString = options[qData.answer];
        Phaser.Utils.Array.Shuffle(options);
        const correctIdx = options.indexOf(correctString);

        const btnW = 420, btnH = 120, gapX = 30, gapY = 20;
        const gridX = cx - btnW - gapX / 2, gridY = cy + 30;

        options.forEach((option, i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const bx = gridX + col * (btnW + gapX), by = gridY + row * (btnH + gapY);

            const btnGfx = this.add.graphics().setDepth(201);
            btnGfx.fillStyle(0x1e293b, 0.95);
            btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
            btnGfx.lineStyle(2, 0x64748b, 1);
            btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);
            this.questionOverlayObjects.push(btnGfx);

            const label = String.fromCharCode(65 + i);
            const btnText = this.add.text(bx + btnW / 2, by + btnH / 2, `${label}) ${option}`, {
                fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', wordWrap: { width: btnW - 20 }, align: 'center'
            }).setOrigin(0.5).setDepth(202);
            this.questionOverlayObjects.push(btnText);

            const hitZone = this.add.rectangle(bx + btnW / 2, by + btnH / 2, btnW, btnH)
                .setDepth(203).setInteractive({ useHandCursor: true });
            this.questionOverlayObjects.push(hitZone);

            hitZone.on('pointerdown', () => {
                this.questionOverlayObjects.forEach(obj => { if (obj instanceof Phaser.GameObjects.Rectangle) obj.disableInteractive(); });

                const correct = i === correctIdx;
                window.dispatchEvent(
                    new CustomEvent('game:answer', {
                        detail: {
                            question_id: qData.id,
                            correct
                        }
                    })
                );
                btnGfx.clear();
                btnGfx.fillStyle(correct ? 0x166534 : 0x7f1d1d, 0.95);
                btnGfx.fillRoundedRect(bx, by, btnW, btnH, 8);
                btnGfx.lineStyle(2, correct ? 0x22c55e : 0xef4444, 1);
                btnGfx.strokeRoundedRect(bx, by, btnW, btnH, 8);

                const feedbackText = this.add.text(cx, cy + 300, correct ? '¡CORRECTO!' : 'INCORRECTO', {
                    fontFamily: 'Arial', fontSize: '36px', color: correct ? '#22c55e' : '#ef4444', fontStyle: 'bold'
                }).setOrigin(0.5).setDepth(202);
                this.questionOverlayObjects.push(feedbackText);

                this.time.delayedCall(1600, () => {
                    this.questionOverlayObjects.forEach(o => o.destroy());
                    this.questionOverlayObjects = [];
                    this.modalLocked = false;
                    
                    if (correct) {
                        this.action = 0; // SlidingPuzzle.ALLOW_CLICK
                    } else {
                        this.lives--;
                        this.updateLivesText();
                        if (this.lives <= 0) {
                            this.triggerGameOver();
                        } else {
                            this.action = 0; // SlidingPuzzle.ALLOW_CLICK
                        }
                    }
                });
            });
        });
    }

    updateLivesText() {
        if (this.livesText) {
            this.livesText.setText('VIDAS: ' + '❤️'.repeat(this.lives));
        }
    }

    triggerGameOver() {
        const cx = 512;
        const cy = 384;

        const overlay = this.add.rectangle(cx, cy, 1024, 768, 0x000000, 0.95).setDepth(300).setInteractive();
        
        const lossText = this.add.text(cx, cy - 80, "¡HAS PERDIDO!", {
            fontFamily: 'Arial', fontSize: '64px', color: '#ef4444', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(301);

        const restartText = this.add.text(cx, cy + 40, "Haz click para REINICIAR", {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(301);

        overlay.on('pointerdown', () => {
            this.scene.restart();
        });
    }
}
