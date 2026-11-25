
import type { PowerUp, PowerUpType } from "@/lib/game/types"

export function spawnPowerUp(
  canvas: HTMLCanvasElement,
  pushPowerUp: (powerUp: PowerUp) => void,
): void {
  const types: PowerUpType[] = [
    "doubleYolk",
    "scrambled",
    "hardBoiled",
    "explosive",
    "shield",
    "health",
    "speedBoost",
    "charge",
    "charge", // twice to make it more common
  ]

  // Golden egg is rare
  if (Math.random() < 0.05) {
    types.push("golden")
  }

  const type = types[Math.floor(Math.random() * types.length)]

  pushPowerUp({
    x: Math.random() * (canvas.width - 100) + 50,
    y: Math.random() * (canvas.height - 100) + 50,
    radius: 10,
    type,
    lifetime: 10000,
  })
}

export function spawnWeaponPowerUp(
  x: number,
  y: number,
  pushPowerUp: (powerUp: PowerUp) => void,
): void {
  const weaponTypes: PowerUpType[] = [
    "doubleYolk",
    "scrambled",
    "hardBoiled",
    "explosive",
    "charge",
  ]

  if (Math.random() < 0.1) {
    weaponTypes.push("golden")
  }

  const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)]

  pushPowerUp({
    x,
    y,
    radius: 12,
    type,
    lifetime: 15000,
  })
}