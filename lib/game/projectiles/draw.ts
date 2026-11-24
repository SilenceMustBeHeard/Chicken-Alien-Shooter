
import type { Projectile } from "@/lib/game/types"

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile): void {
  //  LEVIATHAN WAVE 
  if (proj.isLeviathanWave) {
    const waveAge = proj.waveAge || 0
    const waveMaxAge = proj.waveMaxAge || 1100
    const waveAngle = proj.waveAngle || 0

    const progress = Math.min(waveAge / waveMaxAge, 1)
    const alpha = 1 - progress * 0.7
    const waveRadius = proj.radius * (1 + progress * 3.5)

    ctx.save()
    ctx.translate(proj.x, proj.y)
    ctx.rotate(waveAngle)

    ctx.globalAlpha = alpha * 0.8
    ctx.strokeStyle = proj.color || "#a855f7"
    ctx.lineWidth = 6 * alpha + 2
    ctx.shadowColor = proj.color || "#a855f7"
    ctx.shadowBlur = 20

    ctx.beginPath()
    ctx.arc(0, 0, waveRadius, -Math.PI * 0.85, Math.PI * 0.85, false)
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.6
    ctx.strokeStyle = "#e9d5ff"
    ctx.lineWidth = 3 * alpha + 1
    ctx.shadowBlur = 12

    ctx.beginPath()
    ctx.arc(0, 0, waveRadius * 0.85, -Math.PI * 0.75, Math.PI * 0.75, false)
    ctx.stroke()

    ctx.globalAlpha = alpha * 0.5
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.8 + (i / 10) * Math.PI * 1.6
      const px = Math.cos(a) * waveRadius
      const py = Math.sin(a) * waveRadius

      ctx.fillStyle = "#c084fc"
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.shadowBlur = 0
    ctx.restore()
    return
  }

  // VOID SLASH 
  if (proj.isVoidSlash) {
    const angle = Math.atan2(proj.vy, proj.vx)

    ctx.save()
    ctx.translate(proj.x, proj.y)
    ctx.rotate(angle)

    ctx.shadowColor = proj.color || "#c084fc"
    ctx.shadowBlur = 15

    ctx.strokeStyle = proj.color || "#c084fc"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, 0, proj.radius, -Math.PI * 0.5, Math.PI * 0.5)
    ctx.stroke()

    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, proj.radius * 0.6, -Math.PI * 0.4, Math.PI * 0.4)
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.restore()
    return
  }

  // VOID ORB 
  if (proj.isVoidOrb) {
    ctx.save()
    ctx.shadowColor = proj.color || "#7c3aed"
    ctx.shadowBlur = 20

    const orbGrad = ctx.createRadialGradient(
      proj.x - proj.radius * 0.3,
      proj.y - proj.radius * 0.3,
      proj.radius * 0.1,
      proj.x,
      proj.y,
      proj.radius * 1.2,
    )
    orbGrad.addColorStop(0, "#ffffff")
    orbGrad.addColorStop(0.3, proj.color || "#c084fc")
    orbGrad.addColorStop(0.7, "#7c3aed")
    orbGrad.addColorStop(1, "#1a0a2a")

    ctx.fillStyle = orbGrad
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = "#0a0a15"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
    return
  }

  // PLAGUE BALL 
  if (proj.isEnemyProjectile && proj.color === "#84cc16" && proj.explosive) {
    ctx.save()
    ctx.shadowColor = "#84cc16"
    ctx.shadowBlur = 25

    const plagueGrad = ctx.createRadialGradient(
      proj.x - proj.radius * 0.3,
      proj.y - proj.radius * 0.3,
      proj.radius * 0.1,
      proj.x,
      proj.y,
      proj.radius * 1.3,
    )
    plagueGrad.addColorStop(0, "#fef9c3")
    plagueGrad.addColorStop(0.3, "#d4ff00")
    plagueGrad.addColorStop(0.7, "#84cc16")
    plagueGrad.addColorStop(1, "#3f6212")

    ctx.fillStyle = plagueGrad
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = "#1a2e05"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius * 0.3, 0, Math.PI * 2)
    ctx.fill()

    const time = Date.now()
    ctx.strokeStyle = `rgba(212, 255, 0, ${0.6 + Math.sin(time / 100) * 0.4})`
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.restore()
    return
  }

  // BIO-EGG (enemy projectile) 
  if (proj.isEnemyProjectile) {
    ctx.save()
    ctx.shadowColor = proj.color || "#28f0ff"
    ctx.shadowBlur = 20

    const eggGrad = ctx.createRadialGradient(
      proj.x - proj.radius * 0.35,
      proj.y - proj.radius * 0.4,
      proj.radius * 0.1,
      proj.x,
      proj.y,
      proj.radius * 1.3,
    )
    eggGrad.addColorStop(0, "#fff2f2")
    eggGrad.addColorStop(0.3, "#ff8b8b")
    eggGrad.addColorStop(0.7, "#ed0a0a")
    eggGrad.addColorStop(1, "#df0f0f")

    ctx.fillStyle = eggGrad
    ctx.beginPath()
    ctx.ellipse(proj.x, proj.y, proj.radius, proj.radius * 1.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = "#fdf908"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(proj.x, proj.y, proj.radius, proj.radius * 1.3, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = "rgba(255, 246, 246, 0.7)"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(proj.x - proj.radius * 0.35, proj.y - proj.radius * 0.4)
    ctx.lineTo(proj.x - proj.radius * 0.05, proj.y)
    ctx.lineTo(proj.x - proj.radius * 0.25, proj.y + proj.radius * 0.5)
    ctx.stroke()

    ctx.fillStyle = "rgba(221, 27, 27, 0.87)"
    ctx.beginPath()
    ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.radius * 0.9, 0, Math.PI * 2)
    ctx.fill()

    return
  }

  // PLAYER PROJECTILES 
  if (proj.explosive) {
    ctx.fillStyle = "#ff6600"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#ff0000"
    ctx.lineWidth = 1
    ctx.stroke()
  } else if (proj.piercing) {
    ctx.fillStyle = "#8b4513"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()
  } else if (proj.damage >= 10) {
    ctx.fillStyle = "#ffd700"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#ffff00"
    ctx.lineWidth = 2
    ctx.stroke()
  } else {
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#d4a574"
    ctx.beginPath()
    ctx.arc(proj.x - 1, proj.y - 1, 1.5, 0, Math.PI * 2)
    ctx.arc(proj.x + 1, proj.y + 1, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}