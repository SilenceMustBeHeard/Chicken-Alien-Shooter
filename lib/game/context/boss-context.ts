
import type {
  Boss,
  Player,
  Enemy,
  Projectile,
  GameState,
} from "@/lib/game/types"

import type { ProjectileSpawner } from "./projectile-spawner"
import type { EnemySpawner } from "./enemy-spawner"
import type { ParticleSpawner } from "./particle-spawner"
import type { FloatingTextSpawner } from "./floating-text-spawner"
import type { ScreenShake } from "./screen-shake"
import type { AudioSystem } from "./audio-system"
import type { UIController } from "./ui-controller"


 // Everything a boss needs to update itself.
 
 // Bosses should NEVER touch raw refs or canvas directly.
 //  They go through these abstractions.

export interface BossContext {
  //  Read-only data 
 // Player target (for boss to attack, chase, etc.)
  readonly player: Player

 // canvas size
  readonly canvasWidth: number
  readonly canvasHeight: number

 // Time since last frame (ms)
  readonly deltaTime: number

  // Time boss has existed
  readonly bossTime: number

  //  Read-only queries 
 // Get all current enemies 
  getEnemies(): readonly Enemy[]

 // Get all current projectiles
  getProjectiles(): readonly Projectile[]

// Get current wave 
  getWave(): number

// Absstractions
  readonly projectiles: ProjectileSpawner
  readonly enemies: EnemySpawner
  readonly particles: ParticleSpawner
  readonly floatingTexts: FloatingTextSpawner
  readonly screenShake: ScreenShake
  readonly audio: AudioSystem
  readonly ui: UIController

// Boss actions
// Kill the boss (trigger death sequence)
  killBoss(): void

  // Damage the player (trigger damage sequence)
  damagePlayer(amount: number, source: string): void

  // Heal the player
  healPlayer(amount: number): void
}