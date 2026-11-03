
import type { Enemy } from "@/lib/game/types"
import type { EnemySpawner, EnemySpawnConfig } from "../enemy-spawner"

export function createEnemySpawner(
  ref: React.RefObject<Enemy[]>,
  canvasWidth: number,
  canvasHeight: number,
  getAlienColor: (type: Enemy["type"]) => string,
): EnemySpawner {
  const baseConfig = (config: EnemySpawnConfig): Enemy => ({
    x: config.x,
    y: config.y,
    radius: config.radius ?? 12,
    speed: config.speed ?? 1.0,
    health: config.health ?? 2,
    maxHealth: config.health ?? 2,
    groupId: Date.now() + Math.random(),
    type: config.type,
    alienType: config.alienType ?? config.type,
    color: config.color ?? getAlienColor(config.type),
  })

  return {
    spawn(config) {
      const enemy = baseConfig(config)
      ref.current.push(enemy)
      return enemy
    },

    spawnAround(centerX, centerY, count, distance, config) {
      const spawned: Enemy[] = []
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const enemy = baseConfig({
          ...config,
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
        })
        ref.current.push(enemy)
        spawned.push(enemy)
      }
      return spawned
    },

    spawnFromEdge(count, config) {
      const spawned: Enemy[] = []
      for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4)
        let x: number, y: number
        switch (side) {
          case 0:
            x = Math.random() * canvasWidth
            y = -20
            break
          case 1:
            x = canvasWidth + 20
            y = Math.random() * canvasHeight
            break
          case 2:
            x = Math.random() * canvasWidth
            y = canvasHeight + 20
            break
          default:
            x = -20
            y = Math.random() * canvasHeight
        }
        const enemy = baseConfig({ ...config, x, y })
        ref.current.push(enemy)
        spawned.push(enemy)
      }
      return spawned
    },
  }
}