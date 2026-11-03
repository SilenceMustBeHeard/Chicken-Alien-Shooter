
import type { Projectile } from "@/lib/game/types"
import type { ProjectileSpawner, ProjectileConfig } from "../projectile-spawner"

// Creates a projectile spawner that adds projectiles to the given ref array

export function createProjectileSpawner(
  ref: React.RefObject<Projectile[]>,
): ProjectileSpawner {
  return {
    spawn(x, y, vx, vy, config) {
      ref.current.push({
        ...config,
        x,
        y,
        vx,
        vy,
      })
    },

    spawnSpread(x, y, count, baseAngle, spreadAngle, speed, config) {
      const half = Math.floor(count / 2)
      for (let i = -half; i <= half; i++) {
        const angle = baseAngle + i * spreadAngle
        ref.current.push({
          ...config,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        })
      }
    },

    spawnRadial(x, y, count, speed, config) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        ref.current.push({
          ...config,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        })
      }
    },

    spawnAimed(x, y, targetX, targetY, speed, config) {
      const angle = Math.atan2(targetY - y, targetX - x)
      ref.current.push({
        ...config,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      })
    },
  }
}