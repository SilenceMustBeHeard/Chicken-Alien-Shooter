
import type { Projectile } from "@/lib/game/types"

export type ProjectileConfig = Omit<Projectile, "x" | "y" | "vx" | "vy">

export interface ProjectileSpawner {
  
   // Spawn a single projectile

  spawn(x: number, y: number, vx: number, vy: number, config: ProjectileConfig): void

  
    // Spawn a spread of projectiles in a cone

  spawnSpread(
    x: number,
    y: number,
    count: number,
    baseAngle: number,
    spreadAngle: number,
    speed: number,
    config: ProjectileConfig,
  ): void

  
   // Spawn projectiles in a full circle
   
  spawnRadial(
    x: number,
    y: number,
    count: number,
    speed: number,
    config: ProjectileConfig,
  ): void

  
   // Spawn a projectile aimed at a target

  spawnAimed(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number,
    config: ProjectileConfig,
  ): void
}