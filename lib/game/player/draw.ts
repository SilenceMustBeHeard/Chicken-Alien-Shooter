
import type { Player } from "@/lib/game/types"

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number = Date.now(),
) {
  ctx.save()
  ctx.translate(player.x, player.y)

  const wingFlap = Math.sin(time / 180) * 0.3
  const bodyBob = Math.sin(time / 300) * 2

  // Charge trails
  if (player.isCharging) {
    ctx.strokeStyle = "rgba(255, 200, 100, 0.8)"
    ctx.lineWidth = 4
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(-player.radius * 1.4 - i * 10, -12 + i * 6)
      ctx.lineTo(-player.radius * 1.4 - 24 - i * 10, -12 + i * 6)
      ctx.stroke()
    }
  }

  ctx.translate(0, bodyBob)

  // WINGS 
  ctx.save()
  ctx.translate(-player.radius * 0.7, 0)
  ctx.rotate(wingFlap)
  ctx.fillStyle = "#e8e8e8"
  ctx.beginPath()
  ctx.ellipse(-player.radius * 0.5, 0, player.radius * 0.9, player.radius * 0.5, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#888888"
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(player.radius * 0.7, 0)
  ctx.rotate(-wingFlap)
  ctx.fillStyle = "#e8e8e8"
  ctx.beginPath()
  ctx.ellipse(player.radius * 0.5, 0, player.radius * 0.9, player.radius * 0.5, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#888888"
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // FEET 
  ctx.fillStyle = "#ff9900"
  ctx.strokeStyle = "#aa5500"
  ctx.lineWidth = 1.5
  // Left
  ctx.beginPath()
  ctx.moveTo(-player.radius * 0.35, player.radius * 0.85)
  ctx.lineTo(-player.radius * 0.55, player.radius * 1.15)
  ctx.lineTo(-player.radius * 0.15, player.radius * 1.15)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Right
  ctx.beginPath()
  ctx.moveTo(player.radius * 0.35, player.radius * 0.85)
  ctx.lineTo(player.radius * 0.55, player.radius * 1.15)
  ctx.lineTo(player.radius * 0.15, player.radius * 1.15)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // BODY 
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#666666"
  ctx.lineWidth = 2
  ctx.stroke()

  // Belly shadow
  ctx.strokeStyle = "#d0d0d0"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, player.radius * 0.7, 0.3, Math.PI - 0.3)
  ctx.stroke()

  // COMB 
  ctx.fillStyle = "#ee1111"
  ctx.beginPath()
  ctx.ellipse(0, -player.radius * 0.95, player.radius * 0.35, player.radius * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#880000"
  ctx.lineWidth = 2
  ctx.stroke()

  // BEAK 
  ctx.fillStyle = "#ffaa00"
  ctx.beginPath()
  ctx.moveTo(-player.radius * 0.2, -player.radius * 0.05)
  ctx.lineTo(0, player.radius * 0.3)
  ctx.lineTo(player.radius * 0.2, -player.radius * 0.05)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = "#aa6600"
  ctx.lineWidth = 1.5
  ctx.stroke()

  // EYES
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.arc(-player.radius * 0.25, -player.radius * 0.2, player.radius * 0.12, 0, Math.PI * 2)
  ctx.arc(player.radius * 0.25, -player.radius * 0.2, player.radius * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // Eye highlights
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(-player.radius * 0.27, -player.radius * 0.23, player.radius * 0.04, 0, Math.PI * 2)
  ctx.arc(player.radius * 0.23, -player.radius * 0.23, player.radius * 0.04, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()

  // Shield (drawn outside translate)
  if (player.shield) {
    const shieldPulse = 1 + Math.sin(time / 150) * 0.1
    ctx.strokeStyle = "#00ffff"
    ctx.shadowBlur = 15
    ctx.shadowColor = "#00ffff"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(player.x, player.y, (player.radius + 5) * shieldPulse, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
}