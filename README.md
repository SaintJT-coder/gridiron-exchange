# Gridiron Exchange

A responsive NFL player-market **simulation** inspired by the approved dark navy / cyan / teal mockup. Built with Vite + React and organized so it can be opened in GitHub, VS Code, Codex, or Claude Code.

## Included

- Dashboard, Portfolio, and Account tabs
- NFL player market table, search, team filter, watchlist, top movers, and upcoming games
- Player headshots beside names with initials fallback if an image is unavailable
- Simulated portfolio balance and buy/sell interactions using fictional currency
- Responsive layout for desktop, tablet, and mobile
- No backend, brokerage connection, deposits, withdrawals, or real-money trading

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

Create a production build:

```bash
npm run build
npm run preview
```

## Push to GitHub

1. Create an empty repository on GitHub.
2. Unzip this project and open the folder in your terminal.
3. Run:

```bash
git init
git add .
git commit -m "Initial Gridiron Exchange prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Never commit `.env` files or private API keys.

## Continue with Claude / Codex

Open the repository folder in Claude Code, Codex, or VS Code. Start with this prompt:

> Read README.md and inspect the existing app before changing anything. Preserve the visual direction and component boundaries. This is a fictional-money NFL player market simulation only. Make changes in small steps, run `npm run build`, and summarize files changed and any known issues.

## Player photos

The prototype's sample roster uses ESPN CDN headshot URLs with known ESPN player IDs for convenience in local prototyping. These are **remote image URLs**, not assets bundled in this repository, and their availability/terms may change. Verify permissions and applicable terms before public/commercial launch. Do not scrape or copy photos from players' personal Instagram pages without permission. Prefer a licensed sports-data/image provider or a source whose terms explicitly allow your intended use.

All headshots use `object-fit: cover` and a initials fallback when an image fails. The player catalog is centralized in `src/data/players.js`, so IDs/image URLs can be replaced with an authorized provider later.

## Project structure

```text
src/
  components/
    AppShell.jsx
    PlayerAvatar.jsx
    MiniSparkline.jsx
    StatCard.jsx
  data/
    players.js
    mockData.js
  pages/
    Dashboard.jsx
    Portfolio.jsx
    Account.jsx
  App.jsx
  main.jsx
  styles.css
```

## Important prototype notes

- All prices, balances, returns, trades, and game schedule rows are demo data.
- No market feed or current odds/prices are connected.
- Client-side state resets on refresh. Add a real backend only after defining authentication, data validation, and security requirements.
- This is a game interface, not financial advice.
