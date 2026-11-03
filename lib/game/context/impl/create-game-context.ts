
import type { Boss, Player, Enemy, Projectile } from "@/lib/game/types"
import type { GameContext } from "../game-context"

import type { ProjectileSpawner } from "../projectile-spawner"
import type { EnemySpawner } from "../enemy-spawner"
import type { ParticleSpawner } from "../particle-spawner"
import type { FloatingTextSpawner } from "../floating-text-spawner"
import type { ScreenShake } from "../screen-shake"
import type { AudioSystem } from "../audio-system"
import type { UIController } from "../ui-controller"

type CreateGameContextOptions = {
  player: Player
  boss: Boss | null
  canvasWidth: number
  canvasHeight: number
  deltaTime: number
  gameTime: number

  enemiesRef: React.RefObject<Enemy[]>
  projectilesRef: React.RefObject<Projectile[]>

  getWave: () => number
  killBoss: () => void
  spawnBoss: (type: string) => void
  damagePlayer: (amount: number, source: string) => void
  healPlayer: (amount: number) => void

  projectiles: ProjectileSpawner
  enemies: EnemySpawner
  particles: ParticleSpawner
  floatingTexts: FloatingTextSpawner
  screenShake: ScreenShake
  audio: AudioSystem
  ui: UIController
}

export function createGameContext(options: CreateGameContextOptions): GameContext {
  return {
    player: options.player,
    boss: options.boss,
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
    deltaTime: options.deltaTime,
    gameTime: options.gameTime,

    projectiles: options.projectiles,
    enemies: options.enemies,
    particles: options.particles,
    floatingTexts: options.floatingTexts,
    screenShake: options.screenShake,
    audio: options.audio,
    ui: options.ui,

    getEnemies: () => options.enemiesRef.current,
    getProjectiles: () => options.projectilesRef.current,
    getWave: options.getWave,

    killBoss: options.killBoss,
    spawnBoss: options.spawnBoss,
    damagePlayer: options.damagePlayer,
    healPlayer: options.healPlayer,
  }
}