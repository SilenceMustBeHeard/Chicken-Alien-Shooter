
import type { PowerUp, PowerUpType } from "@/lib/game/types"

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  doubleYolk: "#ffff00",
  scrambled: "#ffaa00",
  hardBoiled: "#8b4513",
  explosive: "#ff3300",
  golden: "#ffd700",
  shield: "#00ffff",
  health: "#00ff00",
  speedBoost: "#ff00ff",
  charge: "#f32206",
}

const POWER_UP_ICONS: Record<PowerUpType, string> = {
  doubleYolk: "2",
  scrambled: "S",
  hardBoiled: "P",
  explosive: "E",
  golden: "G",
  shield: "S",
  health: "+",
  speedBoost: "F",
  charge: "Q",
}

const POWER_UP_SHADOW_COLORS: Record<PowerUpType, string> = {
  doubleYolk: "#ffaa00",
  scrambled: "#ff6600",
  hardBoiled: "#888888",
  explosive: "#ff0000",
  golden: "#ffff00",
  shield: "#00ffff",
  health: "#00ff00",
  speedBoost: "#ff00ff",
  charge: "#ff4400",
}

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp,
  time: number = Date.now(),
): void {
  const pulse = 1 + Math.sin(time / 200) * 0.15

  // Glow
  ctx.shadowBlur = 15
  ctx.shadowColor = POWER_UP_COLORS[powerUp.type] || "#ffffff"

  // Base circle
  ctx.fillStyle = POWER_UP_COLORS[powerUp.type] || "#ffffff"
  ctx.beginPath()
  ctx.arc(powerUp.x, powerUp.y, powerUp.radius * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0

  // Golden egg special glow
  if (powerUp.type === "golden") {
    ctx.strokeStyle = "#ffff00"
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5 + Math.sin(time / 200) * 0.5
    ctx.beginPath()
    ctx.arc(powerUp.x, powerUp.y, powerUp.radius * pulse + 5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Icon
  ctx.fillStyle = "#000"
  ctx.font = "bold 10px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  const icon = POWER_UP_ICONS[powerUp.type]
  if (icon) {
    ctx.fillText(icon, powerUp.x, powerUp.y)
  }
}

/**
 * Draws the more detailed power-up shape (used in the second draw pass)
 */
export function drawPowerUpDetailed(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp,
  time: number = Date.now(),
): void {
  ctx.save()
  ctx.translate(powerUp.x, powerUp.y)

  const pulseScale = 1 + Math.sin(time / 200) * 0.15
  ctx.shadowBlur = 20
  ctx.shadowColor = POWER_UP_SHADOW_COLORS[powerUp.type] || "#ffffff"
  ctx.scale(pulseScale, pulseScale)

  if (powerUp.type === "shield") {
    ctx.fillStyle = "#00ffff"
    ctx.beginPath()
    ctx.moveTo(0, -powerUp.radius)
    ctx.quadraticCurveTo(powerUp.radius, -powerUp.radius, powerUp.radius, 0)
    ctx.quadraticCurveTo(powerUp.radius, powerUp.radius, 0, powerUp.radius)
    ctx.quadraticCurveTo(-powerUp.radius, powerUp.radius, -powerUp.radius, 0)
    ctx.quadraticCurveTo(-powerUp.radius, -powerUp.radius, 0, -powerUp.radius)
    ctx.fill()
  } else if (powerUp.type === "health") {
    ctx.fillStyle = "#00ff00"
    ctx.fillRect(-powerUp.radius / 3, -powerUp.radius, powerUp.radius / 1.5, powerUp.radius * 2)
    ctx.fillRect(-powerUp.radius, -powerUp.radius / 3, powerUp.radius * 2, powerUp.radius / 1.5)
  } else if (powerUp.type === "speedBoost") {
    ctx.fillStyle = "#ff00ff"
    ctx.beginPath()
    ctx.moveTo(-powerUp.radius / 2, -powerUp.radius)
    ctx.lineTo(powerUp.radius / 2, 0)
    ctx.lineTo(0, 0)
    ctx.lineTo(powerUp.radius / 2, powerUp.radius)
    ctx.lineTo(-powerUp.radius / 2, 0)
    ctx.lineTo(0, 0)
    ctx.closePath()
    ctx.fill()
  } else if (powerUp.type === "charge") {
    ctx.fillStyle = "#ff4400"
    ctx.strokeStyle = "#ffaa00"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-powerUp.radius, 0)
    ctx.lineTo(powerUp.radius, 0)
    ctx.lineTo(powerUp.radius - 6, -6)
    ctx.moveTo(powerUp.radius, 0)
    ctx.lineTo(powerUp.radius - 6, 6)
    ctx.stroke()

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4)
      ctx.lineTo(Math.cos(angle) * powerUp.radius, Math.sin(angle) * powerUp.radius)
      ctx.stroke()
    }
  } else {
    // Egg for weapons
    ctx.fillStyle = POWER_UP_SHADOW_COLORS[powerUp.type] || "#ffffff"
    ctx.beginPath()
    ctx.ellipse(0, 0, powerUp.radius * 0.7, powerUp.radius, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.restore()
}