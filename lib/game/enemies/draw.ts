
import type { Enemy } from "@/lib/game/types"
import { ALIEN_COLORS } from "@/lib/game/constants"

export function drawAlienCreature(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  time: number,
): void {
  const color =
    enemy.hitFlash && enemy.hitFlash > 0
      ? "#ffffff"
      : enemy.color || ALIEN_COLORS[enemy.type] || "#00ff00"
  const pulse = 1 + Math.sin(time / 260 + enemy.x * 0.01) * 0.06
  const bob = Math.sin(time / 180 + enemy.x * 0.02) * enemy.radius * 0.08
  const blink = Math.sin(time / 900 + enemy.y) > 0.94

  ctx.save()
  ctx.translate(enemy.x, enemy.y + bob)
  ctx.scale(pulse, pulse)
  ctx.shadowBlur = 14
  ctx.shadowColor = color

  // Each enemy gets its own silhouette and motion signature.
  if (enemy.type === "tank") {
    ctx.fillStyle = "#18233d"
    ctx.beginPath()
    ctx.roundRect(-enemy.radius, -enemy.radius * 0.78, enemy.radius * 2, enemy.radius * 1.56, 8)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = color
    ctx.fillRect(-enemy.radius * 0.72, -enemy.radius * 0.24, enemy.radius * 1.44, enemy.radius * 0.48)
  } else if (enemy.type === "leech") {
    const squish = 1 + Math.sin(time / 100) * 0.18
    ctx.scale(1 / squish, squish)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(0, 0, enemy.radius * 0.72, enemy.radius * 1.15, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#fda4af"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, enemy.radius * 0.45, enemy.radius * 0.36, 0, Math.PI)
    ctx.stroke()
  } else if (enemy.type === "splitter") {
    ctx.fillStyle = color
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const r = i % 2 ? enemy.radius * 0.72 : enemy.radius * 1.12
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "#fde68a"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -enemy.radius * 0.72)
    ctx.lineTo(0, enemy.radius * 0.72)
    ctx.stroke()
  } else if (enemy.type === "blinker") {
    ctx.globalAlpha = 0.65 + Math.sin(time / 90) * 0.3
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0, 0, enemy.radius * (0.86 + Math.sin(time / 130) * 0.12), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#e0f2fe"
    ctx.setLineDash([3, 4])
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.9, 0, 0, Math.PI * 2)
    ctx.fill()
    // Antennae sway independently so the swarm feels alive.
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * enemy.radius * 0.35, -enemy.radius * 0.65)
      ctx.quadraticCurveTo(
        side * enemy.radius * 0.7,
        -enemy.radius * 1.3,
        side * enemy.radius * (0.55 + Math.sin(time / 240) * 0.12),
        -enemy.radius * 1.5,
      )
      ctx.stroke()
      ctx.fillStyle = "#fef08a"
      ctx.beginPath()
      ctx.arc(
        side * enemy.radius * (0.55 + Math.sin(time / 240) * 0.12),
        -enemy.radius * 1.5,
        3,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = blink ? "#ffffff" : "#07111f"
  ctx.beginPath()
  ctx.ellipse(-enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.18, enemy.radius * 0.26, 0, 0, Math.PI * 2)
  ctx.ellipse(enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.18, enemy.radius * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#bffcff"
  ctx.beginPath()
  ctx.arc(-enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.07, 0, Math.PI * 2)
  ctx.arc(enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.07, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  if (enemy.hitFlash && enemy.hitFlash > 0) enemy.hitFlash--
}