
import type { Player, PowerUp } from "@/lib/game/types"

export type PowerUpCollisionContext = {
  powerUps: PowerUp[]
  player: Player
  deltaTime: number

  onCollect: (powerUp: PowerUp) => void
}

/**
 * Updates power-ups: checks collision with player, decreases lifetime
 * Returns filtered array (collected/expired removed)
 */
export function updatePowerUps(ctx: PowerUpCollisionContext): PowerUp[] {
  const { powerUps, player, deltaTime, onCollect } = ctx

  return powerUps.filter((powerUp) => {
    const dx = player.x - powerUp.x
    const dy = player.y - powerUp.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < player.radius + powerUp.radius) {
      onCollect(powerUp)
      return false
    }

    // Remove after lifetime
    powerUp.lifetime -= deltaTime
    return powerUp.lifetime > 0
  })
}