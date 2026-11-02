
import type { Enemy, EnemyType } from "@/lib/game/types"

export type EnemySpawnConfig = {
  type: EnemyType
  x: number
  y: number
  speed?: number
  health?: number
  radius?: number
  alienType?: string
  color?: string
}

export interface EnemySpawner {
 // Spawn a single enemy
  spawn(config: EnemySpawnConfig): Enemy

  
   // Spawn N enemies in a circle around a point.
   
  spawnAround(
    centerX: number,
    centerY: number,
    count: number,
    distance: number,
    config: Omit<EnemySpawnConfig, "x" | "y">,
  ): Enemy[]

  
   // Spawn N enemies from a random edge of the canvas
   
  spawnFromEdge(count: number, config: Omit<EnemySpawnConfig, "x" | "y">): Enemy[]
}