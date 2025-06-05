# Tartis

Tartis is a lightweight Tetris clone that runs entirely in the browser.

## Playing

Open [index.html](index.html) or visit the project's GitHub Pages site to play.
Use **WASD** controls: `A` and `D` move pieces left and right, `S` drops them down, and `W` rotates.
You can optionally enter a name in the sidebar to record your scores on the
leaderboard; leaving it blank will save scores as **Anonymous**.

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
