
import type { Enemy } from "@/lib/game/types"

export function drawHiveEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  t: number,
) {
  const isTank = enemy.type === "tank"
  const r = enemy.radius

  const pulse = 0.5 + Math.sin(t / 200 + enemy.groupId) * 0.5

  if (isTank) {
    //  HIVE TANK 
    // Aura (orange)
    const auraGrad = ctx.createRadialGradient(
      enemy.x, enemy.y, r * 0.5,
      enemy.x, enemy.y, r * 2,
    )
    auraGrad.addColorStop(0, `rgba(251, 146, 60, ${0.2 + pulse * 0.1})`)
    auraGrad.addColorStop(0.7, `rgba(234, 88, 12, ${0.1 + pulse * 0.05})`)
    auraGrad.addColorStop(1, "rgba(251, 146, 60, 0)")
    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, r * 2, 0, Math.PI * 2)
    ctx.fill()

    // Body (dark brown with orange cracks)
    const bodyGrad = ctx.createRadialGradient(
      enemy.x - r * 0.3, enemy.y - r * 0.3, r * 0.1,
      enemy.x, enemy.y, r * 1.1,
    )
    bodyGrad.addColorStop(0, "#a16207")
    bodyGrad.addColorStop(0.5, "#451a03")
    bodyGrad.addColorStop(1, "#1c0a01")

    ctx.fillStyle = bodyGrad
    ctx.strokeStyle = "#1c0a01"
    ctx.lineWidth = r * 0.15
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Orange cracks
    ctx.strokeStyle = `rgba(251, 146, 60, ${0.6 + pulse * 0.4})`
    ctx.lineWidth = r * 0.1
    ctx.beginPath()
    ctx.moveTo(enemy.x - r * 0.5, enemy.y - r * 0.3)
    ctx.lineTo(enemy.x - r * 0.1, enemy.y)
    ctx.lineTo(enemy.x + r * 0.4, enemy.y - r * 0.2)
    ctx.stroke()

    // 3 eyes
    for (let i = -1; i <= 1; i++) {
      const ex = enemy.x + i * r * 0.35
      const ey = enemy.y - r * 0.2

      ctx.fillStyle = "#0a0000"
      ctx.beginPath()
      ctx.arc(ex, ey, r * 0.18, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowColor = "#fbbf24"
      ctx.shadowBlur = 8
      ctx.fillStyle = "#fbbf24"
      ctx.beginPath()
      ctx.arc(ex, ey, r * 0.09, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Wings (2 pairs)
    for (const side of [-1, 1]) {
      for (let w = 0; w < 2; w++) {
        ctx.save()
        ctx.translate(enemy.x + side * r * 0.6, enemy.y + w * r * 0.2)
        ctx.rotate(side * (0.3 + w * 0.2 + Math.sin(t / 100 + w) * 0.2))

        ctx.fillStyle = "rgba(251, 146, 60, 0.4)"
        ctx.strokeStyle = "#7c2d12"
        ctx.lineWidth = 1

        ctx.beginPath()
        ctx.ellipse(side * r * 0.5, 0, r * 0.6, r * 0.25, side * 0.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        ctx.restore()
      }
    }

    // HP bar
    const hpPercent = enemy.health / enemy.maxHealth
    const barWidth = r * 2
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - r - 10, barWidth, 4)
    ctx.fillStyle = "#ea580c"
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - r - 10, barWidth * hpPercent, 4)

  } else {
    //  HIVE GRUNT 
    // Aura (red)
    const auraGrad = ctx.createRadialGradient(
      enemy.x, enemy.y, r * 0.3,
      enemy.x, enemy.y, r * 1.8,
    )
    auraGrad.addColorStop(0, `rgba(220, 38, 38, ${0.15 + pulse * 0.1})`)
    auraGrad.addColorStop(1, "rgba(220, 38, 38, 0)")
    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, r * 1.8, 0, Math.PI * 2)
    ctx.fill()

    // Body (dark red)
    const bodyGrad = ctx.createRadialGradient(
      enemy.x - r * 0.3, enemy.y - r * 0.3, r * 0.1,
      enemy.x, enemy.y, r,
    )
    bodyGrad.addColorStop(0, "#ef4444")
    bodyGrad.addColorStop(0.5, "#991b1b")
    bodyGrad.addColorStop(1, "#450a0a")

    ctx.fillStyle = bodyGrad
    ctx.strokeStyle = "#450a0a"
    ctx.lineWidth = r * 0.15
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 1 eye
    ctx.fillStyle = "#0a0000"
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y - r * 0.1, r * 0.35, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = "#fbbf24"
    ctx.shadowBlur = 8
    ctx.fillStyle = "#fbbf24"
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y - r * 0.1, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Wings (1 pair)
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(enemy.x + side * r * 0.6, enemy.y - r * 0.2)
      ctx.rotate(side * (0.3 + Math.sin(t / 100) * 0.3))

      ctx.fillStyle = "rgba(220, 38, 38, 0.4)"
      ctx.strokeStyle = "#7f1d1d"
      ctx.lineWidth = 1

      ctx.beginPath()
      ctx.ellipse(side * r * 0.5, 0, r * 0.6, r * 0.25, side * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.restore()
    }

    // HP bar
    const hpPercent = enemy.health / enemy.maxHealth
    const barWidth = r * 1.6
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - r - 8, barWidth, 3)
    ctx.fillStyle = "#dc2626"
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - r - 8, barWidth * hpPercent, 3)
  }
}