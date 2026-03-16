# Plinko RNG

A physics-based Plinko game built with React, TypeScript, and Vite. Drop balls from the top of a peg board and watch them bounce their way down to multiplier slots at the bottom. Set your bet amount, go all in, and track your drop history — all simulated in real time on an HTML5 canvas.

## Features

- Real-time ball physics with gravity, restitution, and peg collision
- 11-row peg board with 12 multiplier slots (0x – 6x)
- Adjustable bet amount with an All In option
- Drop history showing the last 10 results
- Bankrupt screen when your balance hits zero

## Requirements

- Node.js 18 or later
- npm

## Getting Started

Clone the repo and install dependencies:

```bash
git clone https://github.com/jasonca2023/Plinko.rng.git
cd Plinko.rng
npm install
```

Start the development server:

```bash
npm run dev
```

Then open your browser to the local URL shown in the terminal (usually `http://localhost:5173`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Tech Stack

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- HTML5 Canvas for rendering
