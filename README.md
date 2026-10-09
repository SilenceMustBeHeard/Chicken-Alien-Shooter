\# 🐔 Chicken vs Aliens 👽


A fast-paced canvas shooter where you play as a battle chicken defending Earth from an alien invasion. Built with Next.js 16, React 19, and TypeScript.


!\[Next.js\](https://img.shields.io/badge/Next.js-16-black?logo=next.js)

!\[React\](https://img.shields.io/badge/React-19-61DAFB?logo=react)

!\[TypeScript\](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

!\[Tailwind CSS\](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)

!\[pnpm\](https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm)


\#\# 🎮 Gameplay


Survive endless waves of alien invaders. Collect power-ups, defeat epic bosses, and see how long you can last.


\#\#\# Controls


| Action | Desktop | Mobile |

|---|---|---|

| Move | \`WASD\` / Arrow keys | Virtual joystick |

| Aim & Shoot | Mouse | Tap shoot button |

| Stun (Caca-Doo) | \`Space\` | — |

| Charge attack | Collect \`charge\` power-up | — |


\#\#\# Enemies


- \*\*Grunt\*\* — basic alien, low HP

- \*\*Tank\*\* — slow, high HP, big damage

- \*\*Leech\*\* — heals nearby aliens

- \*\*Splitter\*\* — splits into two grunts when killed

- \*\*Blinker\*\* — teleports toward the player


\#\#\# Bosses (every 5 waves)


Each boss has a unique movement pattern: Alien Mouse, Alien Bumblebee, Alien Octopus, Alien Mantis, Abductor, Queen XenoHen, and The Devourer.


\#\#\# Power-ups


| Icon | Effect |

|---|---|

| 🥚 Double Yolk | Fires two eggs side by side |

| 🍳 Scrambled | 5-shot spread cone |

| 🥚 Hard Boiled | Piercing projectile |

| 💥 Explosive | AoE damage on impact |

| ✨ Golden | Massive damage + explosion |

| 🛡️ Shield | Temporary invincibility |

| ❤️ Health | +30 HP |

| ⚡ Speed Boost | 5s speed increase |

| 🚀 Charge | Dash forward, killing enemies in your path |


\#\# 🛠️ Tech Stack


- \*\*Framework:\*\* Next.js 16 (App Router)

- \*\*UI:\*\* React 19 + Tailwind CSS v4

- \*\*Language:\*\* TypeScript 5

- \*\*Components:\*\* Radix UI primitives (via shadcn/ui)

- \*\*Icons:\*\* Lucide React

- \*\*Package manager:\*\* pnpm 12

- \*\*CI:\*\* GitHub Actions (lint, typecheck, build)

- \*\*Linting:\*\* ESLint 9 flat config + \`eslint-config-next\`


\#\# 🚀 Getting Started


\#\#\# Prerequisites


- Node.js 20+

- pnpm 12 (\`corepack enable && corepack prepare pnpm@12.3.4 --activate\`)


\#\#\# Install


\`\`\`bash

git clone https://github.com/SilenceMustBeHeard/Chicken-Alien-Shooter.git

cd Chicken-Alien-Shooter

pnpm install

\`\`\`


\#\#\# Development


\`\`\`bash

pnpm dev

\`\`\`


Open \[http://localhost:3000\](http://localhost:3000).


\#\#\# Production build


\`\`\`bash

pnpm build

pnpm start

\`\`\`


\#\# 🧪 Scripts


| Command | Description |

|---|---|

| \`pnpm dev\` | Start dev server with hot reload |

| \`pnpm build\` | Production build |

| \`pnpm start\` | Run production build |

| \`pnpm lint\` | Run ESLint |


\#\# 📁 Project Structure


\`\`\`

.

├── app/                    \# Next.js App Router (layout, pages, globals.css)

├── components/

│   ├── chicken-alien-game.tsx   \# Main game component (canvas + logic)

│   └── ui/                 \# shadcn/ui primitives

├── hooks/                  \# Custom React hooks

├── lib/                    \# Utility functions

├── public/                 \# Static assets (icons, images)

└── .github/workflows/      \# CI pipeline

\`\`\`


\#\# 🎯 Architecture Notes


The game runs entirely on a single HTML5 canvas. All game state lives in refs (not React state) to avoid re-renders during the 60 FPS loop. React state is reserved for UI state (menus, score display, etc.).


Key patterns:


- \*\*Game loop:\*\* \`requestAnimationFrame\` with delta-time compensation for consistent speed across framerates

- \*\*Physics:\*\* Simple circle-based collision detection

- \*\*Audio:\*\* Web Audio API for procedural sound effects (no asset files)

- \*\*Mobile:\*\* Detects touch support and renders a virtual joystick + shoot button


\#\# 🤝 Contributing


This is a personal project, but PRs and issues are welcome. Please ensure \`pnpm lint\` and \`pnpm tsc --noEmit\` pass before opening a PR.


\#\# 📄 License


MIT
