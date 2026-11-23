
import type { Enemy, Player } from "@/lib/game/types"

export type EnemyUpdateContext = {
  enemies: Enemy[]
  player: Player
  canvas: HTMLCanvasElement
  deltaTime: number
  frameScale: number
  createParticles: (x: number, y: number, color: string) => void
  onEnemyContact: (enemy: Enemy, damage: number) => void
}

/**
 * Updates all enemies: movement, AI, collision, healing.
 * Returns the filtered array (dead enemies removed).
 */
export function updateEnemies(ctx: EnemyUpdateContext): Enemy[] {
  const { enemies, player, canvas, deltaTime, frameScale, createParticles, onEnemyContact } = ctx

  enemies.forEach((enemy) => {
    // Stunned enemies don't move
    if (enemy.stunned && enemy.stunnedTime && enemy.stunnedTime > 0) {
      enemy.stunnedTime -= deltaTime
      if (enemy.stunnedTime <= 0) {
        enemy.stunned = false
        enemy.stunnedTime = undefined
      }
      return
    }

    const dx = player.x - enemy.x
    const dy = player.y - enemy.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 1) {
      // Guard against NaN from dist === 0
      switch (enemy.alienType) {
        case "grunt":
          enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
          enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
          break

        case "tank":
          enemy.x += (dx / dist) * Math.min(enemy.speed * 0.7, 1.6) * frameScale
          enemy.y += (dy / dist) * Math.min(enemy.speed * 0.7, 1.6) * frameScale
          break

        case "leech":
          // Stays at medium distance
          if (dist > 150) {
            enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
            enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
          }
          break

        case "blinker":
          if (!enemy.teleportCooldown) enemy.teleportCooldown = 0
          enemy.teleportCooldown -= deltaTime

          if (enemy.teleportCooldown <= 0 && dist > 100) {
            const angle = Math.atan2(dy, dx)
            enemy.x = player.x - Math.cos(angle) * 80
            enemy.y = player.y - Math.sin(angle) * 80
            enemy.teleportCooldown = 2000
            createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
          } else {
            enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
            enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
          }
          break

        case "splitter":
        default:
          enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
          enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
          break
      }
    }

    // Blinker teleport logic
    if (enemy.type === "blinker" && enemy.blinkerTimer !== undefined) {
      enemy.blinkerTimer -= deltaTime
      if (enemy.blinkerTimer <= 0) {
        const angle = Math.random() * Math.PI * 2
        const teleportDist = 100 + Math.random() * 50
        enemy.x = player.x + Math.cos(angle) * teleportDist
        enemy.y = player.y + Math.sin(angle) * teleportDist

        enemy.x = Math.max(30, Math.min(canvas.width - 30, enemy.x))
        enemy.y = Math.max(30, Math.min(canvas.height - 30, enemy.y))

        enemy.blinkerTimer = 3000 + Math.random() * 2000
        createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
      }
    }

    // Leech healing logic
    if (enemy.type === "leech" && enemy.healTimer !== undefined) {
      enemy.healTimer += deltaTime
      if (enemy.healTimer > 2000) {
        enemies.forEach((other) => {
          if (other !== enemy) {
            const dx2 = other.x - enemy.x
            const dy2 = other.y - enemy.y
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
            if (dist2 < 80 && other.health < other.maxHealth) {
              other.health = Math.min(other.maxHealth, other.health + 1)
            }
          }
        })
        enemy.healTimer = 0
      }
    }

    // Contact with player
    if (enemy.contactCooldown && enemy.contactCooldown > 0) enemy.contactCooldown -= deltaTime
    const dxPlayerEnemy = player.x - enemy.x
    const dyPlayerEnemy = player.y - enemy.y
    const distSquared = dxPlayerEnemy * dxPlayerEnemy + dyPlayerEnemy * dyPlayerEnemy
    const contactDistance = player.radius + enemy.radius

    if (distSquared < contactDistance * contactDistance) {
      const distPlayerEnemy = Math.sqrt(distSquared)
      const normalX = distPlayerEnemy > 0.001 ? dxPlayerEnemy / distPlayerEnemy : -1
      const normalY = distPlayerEnemy > 0.001 ? dyPlayerEnemy / distPlayerEnemy : 0
      const separation = contactDistance + 8

      enemy.x = player.x - normalX * separation
      enemy.y = player.y - normalY * separation
      enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x))
      enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y))

      if ((enemy.contactCooldown ?? 0) <= 0) {
        enemy.contactCooldown = 350
        const damage = enemy.type === "tank" ? 20 : 10
        onEnemyContact(enemy, damage)
        createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
      }
    }
  })

  return enemies.filter((enemy) => enemy.health > 0)
}