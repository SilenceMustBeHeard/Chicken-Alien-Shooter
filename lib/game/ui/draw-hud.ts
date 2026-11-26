
import type { Player } from "@/lib/game/types"

export type HudContext = {
  player: Player
  canvas: HTMLCanvasElement
  score: number
  killCount: number
  wave: number
}

export function drawHud(ctx: CanvasRenderingContext2D, hudCtx: HudContext): void {
  const { player, canvas, score, killCount, wave } = hudCtx

  ctx.shadowBlur = 0

  // TOP-LEFT: HEALTH BAR 
  const healthBarGradient = ctx.createLinearGradient(10, 10, 210, 30)
  if (player.health > 30) {
    healthBarGradient.addColorStop(0, "#246605")
    healthBarGradient.addColorStop(1, "#246605")
  } else {
    healthBarGradient.addColorStop(0, "#ff0000")
    healthBarGradient.addColorStop(1, "#aa0000")
  }

  ctx.fillStyle = "#1a1a2e"
  ctx.fillRect(10, 10, 200, 24)
  ctx.fillStyle = healthBarGradient
  ctx.fillRect(12, 12, (player.health / player.maxHealth) * 196, 20)

  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 2
  ctx.strokeRect(10, 10, 200, 24)

  ctx.fillStyle = "#fff"
  ctx.font = "bold 14px Arial"
  ctx.textAlign = "center"
  ctx.fillText(`${Math.ceil(player.health)}/${player.maxHealth}`, 110, 22)

  // TOP-LEFT: WEAPON TIMER 
  ctx.textAlign = "left"
  ctx.font = "bold 15px Arial"
  let yOffset = 46

  if (player.weaponType !== "basic") {
    const weaponNames: Record<string, string> = {
      doubleYolk: "Double Yolk",
      scrambled: "Scrambled",
      hardBoiled: "Piercing",
      explosive: "Explosive",
      golden: "GOLDEN!",
    }
    const weaponColors: Record<string, string> = {
      doubleYolk: "#ffff00",
      scrambled: "#ffaa00",
      hardBoiled: "#8b4513",
      explosive: "#ff3300",
      golden: "#ffd700",
    }

    const color = weaponColors[player.weaponType] || "#fff"
    const timeLeft = Math.ceil(player.weaponTime / 1000)
    const timePercent = player.weaponType === "golden" ? player.weaponTime / 8000 : player.weaponTime / 15000

    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(25, yOffset + 5, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.shadowBlur = 3
    ctx.shadowColor = color
    ctx.fillText(`${weaponNames[player.weaponType]} (${timeLeft}s)`, 45, yOffset + 10)
    ctx.shadowBlur = 0
    yOffset += 26
  }

  // TOP-LEFT: SHIELD TIMER 
  if (player.shield) {
    const timeLeft = Math.ceil(player.shieldTime / 1000)
    const timePercent = player.shieldTime / 10000

    ctx.strokeStyle = "#00ffff"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(25, yOffset + 5, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent)
    ctx.stroke()

    ctx.fillStyle = "#00ffff"
    ctx.shadowBlur = 3
    ctx.shadowColor = "#00ffff"
    ctx.fillText(`Shield (${timeLeft}s)`, 45, yOffset + 10)
    ctx.shadowBlur = 0
  }

  // TOP-RIGHT: TIME / KILLS / WAVE 
  ctx.shadowBlur = 3
  ctx.shadowColor = "#000"
  ctx.fillStyle = "#fff"
  ctx.font = "bold 20px Arial"
  ctx.textAlign = "right"

  const totalSeconds = Math.floor(score / 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

  ctx.fillText(`Time: ${timeString}`, canvas.width - 10, 25)
  ctx.fillText(`Kills: ${killCount}`, canvas.width - 10, 50)
  ctx.fillText(`Wave: ${wave}`, canvas.width - 10, 75)
  ctx.shadowBlur = 0

  // TOP-RIGHT: CACA-DOO COOLDOWN 
  const cooldownWidth = 130
  const cooldownHeight = 22
  const cooldownX = canvas.width - cooldownWidth - 10

  if (player.stunCooldown > 0) {
    const stunCooldownPercent = player.stunCooldown / 10000
    ctx.fillStyle = "rgba(255, 255, 0, 0.8)"
    ctx.fillRect(cooldownX, 92, cooldownWidth, cooldownHeight)
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(cooldownX + cooldownWidth * (1 - stunCooldownPercent), 92, cooldownWidth * stunCooldownPercent, cooldownHeight)
    ctx.fillStyle = "white"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`CACA-DOO: ${Math.ceil(player.stunCooldown / 1000)}s`, cooldownX + cooldownWidth / 2, 107)
  } else {
    ctx.fillStyle = "rgba(129, 2, 2, 0.8)"
    ctx.fillRect(cooldownX, 92, cooldownWidth, cooldownHeight)
    ctx.fillStyle = "white"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("CACA-DOO: READY", cooldownX + cooldownWidth / 2, 107)
  }

  // TOP-RIGHT: CHARGE STATUS 
  if (player.isCharging) {
    ctx.fillStyle = "rgba(255, 68, 0, 0.9)"
    ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
    ctx.fillStyle = "white"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("CHARGING!", cooldownX + cooldownWidth / 2, 133)
  } else if (player.chargeReady) {
    ctx.fillStyle = "rgba(255, 68, 0, 0.9)"
    ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
    ctx.fillStyle = "white"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("PICK DIRECTION!", cooldownX + cooldownWidth / 2, 133)
  } else if (player.chargeCooldown > 0) {
    const chargeCooldownPercent = player.chargeCooldown / 15000
    ctx.fillStyle = "rgba(100, 100, 100, 0.8)"
    ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(cooldownX + cooldownWidth * (1 - chargeCooldownPercent), 118, cooldownWidth * chargeCooldownPercent, cooldownHeight)
    ctx.fillStyle = "white"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`CHARGE: ${Math.ceil(player.chargeCooldown / 1000)}s`, cooldownX + cooldownWidth / 2, 133)
  } else {
    ctx.fillStyle = "rgba(0, 255, 0, 0.8)"
    ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
    ctx.fillStyle = "white"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("CHARGE: READY", cooldownX + cooldownWidth / 2, 133)
  }
}