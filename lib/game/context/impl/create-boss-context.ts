
import type { Boss, Player, Enemy, Projectile } from "@/lib/game/types"
import type { BossContext } from "../boss-context"

import type { ProjectileSpawner } from "../projectile-spawner"
import type { EnemySpawner } from "../enemy-spawner"
import type { ParticleSpawner } from "../particle-spawner"
import type { FloatingTextSpawner } from "../floating-text-spawner"
import type { ScreenShake } from "../screen-shake"
import type { AudioSystem } from "../audio-system"
import type { UIController } from "../ui-controller"

type CreateBossContextOptions = {
  boss: Boss
  player: Player
  canvasWidth: number
  canvasHeight: number
  deltaTime: number
  bossTime: number

  enemiesRef: React.RefObject<Enemy[]>
  projectilesRef: React.RefObject<Projectile[]>

  getWave: () => number
  killBoss: () => void
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

export function createBossContext(options: CreateBossContextOptions): BossContext {
  const {
    boss: _boss,
    player,
    canvasWidth,
    canvasHeight,
    deltaTime,
    bossTime,
    enemiesRef,
    projectilesRef,
    getWave,
    killBoss,
    damagePlayer,
    healPlayer,
    projectiles,
    enemies,
    particles,
    floatingTexts,
    screenShake,
    audio,
    ui,
  } = options

  return {
    player,
    canvasWidth,
    canvasHeight,
    deltaTime,
    bossTime,

    getEnemies: () => enemiesRef.current,
    getProjectiles: () => projectilesRef.current,
    getWave,

    projectiles,
    enemies,
    particles,
    floatingTexts,
    screenShake,
    audio,
    ui,

    killBoss,
    damagePlayer,
    healPlayer,
  }
}