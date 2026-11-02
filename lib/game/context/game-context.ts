
import type { Player, Enemy, Boss, Projectile, GameState } from "@/lib/game/types"

import type { ProjectileSpawner } from "./projectile-spawner"
import type { EnemySpawner } from "./enemy-spawner"
import type { ParticleSpawner } from "./particle-spawner"
import type { FloatingTextSpawner } from "./floating-text-spawner"
import type { ScreenShake } from "./screen-shake"
import type { AudioSystem } from "./audio-system"
import type { UIController } from "./ui-controller"


// Everything the game loop needs to update itself
// The game loop should NEVER touch raw refs or canvas directly
//  It goes through these abstractions

export interface GameContext {

  // Read-only state 
  readonly player: Player
  readonly boss: Boss | null

  readonly canvasWidth: number
  readonly canvasHeight: number

  readonly deltaTime: number
  readonly gameTime: number

  //  Abstractions 
  readonly projectiles: ProjectileSpawner
  readonly enemies: EnemySpawner
  readonly particles: ParticleSpawner
  readonly floatingTexts: FloatingTextSpawner
  readonly screenShake: ScreenShake
  readonly audio: AudioSystem
  readonly ui: UIController

  // Game control 
  getEnemies(): readonly Enemy[]
  getProjectiles(): readonly Projectile[]
  getWave(): number

  killBoss(): void
  spawnBoss(type: string): void
  damagePlayer(amount: number, source: string): void
  healPlayer(amount: number): void
}