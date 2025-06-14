# Tartis

Tartis is a lightweight Tetris clone that runs entirely in the browser.

## Playing

Open [index.html](index.html) or visit the project's GitHub Pages site to play.
Press the **Start** button or hit the **spacebar** to begin a new game.
Use **WASD** controls: `A` and `D` move pieces left and right, `S` drops them down, and `W` rotates. Press `C` to hold the current piece for later.
On touch devices you can tap the board to rotate, swipe left or right to move, and swipe down to drop pieces.
You can optionally enter a name in the sidebar to record your scores on the
leaderboard; leaving it blank will save scores as **Anonymous**. Only the five
highest scores are stored locally.

The game awards more points as you progress. Every ten lines cleared increases
the current level, multiplying the score earned for subsequent line clears.
Each level speeds up the falling pieces more sharply so the game gets harder
sooner, and a new timer steadily ramps up the speed every 30&nbsp;seconds even
if no points are scored. Pieces can now fall faster at the highest difficulty.

## Development

All logic is contained in [tetris.js](tetris.js) and the markup lives in
[index.html](index.html). No build tools or external dependencies are required.

## Deploying to GitHub Pages

1. In your repository settings, open **Pages** and select the `main` branch
   with the `/` root as the source. This only needs to be done once.
2. The site will now automatically deploy on every push to `main` via the
   included [deploy.yml](.github/workflows/deploy.yml) workflow.
   After each successful run the game will be accessible at
   `https://<username>.github.io/<repository>/`.

## License

This project is licensed under the [MIT License](LICENSE).
