
import type { Boss } from "@/lib/game/types"

export function drawVoidReaper(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
): void {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y

  const healthPercent = boss.health / boss.maxHealth
  const isBerserk = healthPercent < 0.10
  const isHealing = boss.isHealing || false

  // Wobble animation
  const wobble = Math.sin(t / 400) * r * 0.04
  const hover = Math.sin(t / 250) * r * 0.05

  // Translucent during heal
  ctx.save()
  if (isHealing) {
    ctx.globalAlpha = 0.35
  }

  // Aura
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  const auraColor = isBerserk
    ? "255, 0, 0"
    : isHealing
      ? "255, 100, 100"
      : "168, 85, 247"

  const auraGrad = ctx.createRadialGradient(
    bx, by, r * 0.3,
    bx, by, r * 2.5
  )
  auraGrad.addColorStop(0, `rgba(${auraColor}, 0.25)`)
  auraGrad.addColorStop(0.6, `rgba(${auraColor}, 0.1)`)
  auraGrad.addColorStop(1, `rgba(${auraColor}, 0)`)

  ctx.fillStyle = auraGrad
  ctx.beginPath()
  ctx.arc(bx, by, r * 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Floating particles
  for (let i = 0; i < 8; i++) {
    const pa = t / 600 + (i / 8) * Math.PI * 2
    const pd = r * (1.3 + Math.sin(t / 300 + i) * 0.3)
    const px = bx + Math.cos(pa) * pd
    const py = by + Math.sin(pa) * pd * 0.6

    ctx.fillStyle = `rgba(${auraColor}, ${0.4 + Math.sin(t / 100 + i) * 0.3})`
    ctx.beginPath()
    ctx.arc(px, py, r * 0.04, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Body (shadowy)
  ctx.save()
  ctx.translate(bx + wobble, by + hover)

  // Shadowy body
  const bodyGrad = ctx.createRadialGradient(
    -r * 0.2, -r * 0.3, r * 0.1,
    0, 0, r * 1.1
  )
  bodyGrad.addColorStop(
    0,
    isBerserk ? "#8b0000" : isHealing ? "#8b5cf6" : "#4c1d95"
  )
  bodyGrad.addColorStop(
    0.6,
    isBerserk ? "#4a0000" : isHealing ? "#5b21b6" : "#2e1065"
  )
  bodyGrad.addColorStop(1, "#0a0015")

  ctx.fillStyle = bodyGrad
  ctx.beginPath()

  // Amorphous shadow shape
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const bulge =
      Math.sin(a * 3 + t / 500) * r * 0.05 +
      Math.cos(a * 5 - t / 400) * r * 0.03
    const rad = r * 0.95 + bulge
    const px = Math.cos(a) * rad
    const py = Math.sin(a) * rad * 1.1

    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }

  ctx.closePath()
  ctx.fill()

  // Wispy tendrils at bottom
  ctx.strokeStyle = isBerserk ? "#5a0000" : "#2e1065"
  ctx.lineWidth = r * 0.06
  ctx.lineCap = "round"

  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.6 + (i / 6) * Math.PI * 0.8
    const startX = Math.cos(a) * r * 0.7
    const startY = Math.sin(a) * r * 0.9
    const endX = startX + Math.sin(t / 200 + i) * r * 0.15
    const endY = startY + r * (0.3 + Math.sin(t / 150 + i) * 0.1)

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(
      startX + (endX - startX) * 0.5,
      startY + r * 0.15,
      endX,
      endY
    )
    ctx.stroke()
  }

  ctx.lineCap = "butt"

  // Hood (darker top)
  ctx.fillStyle = isBerserk ? "#2a0000" : "#0a0015"
  ctx.beginPath()
  ctx.moveTo(-r * 0.65, -r * 0.2)
  ctx.quadraticCurveTo(-r * 0.7, -r * 0.85, 0, -r * 1.0)
  ctx.quadraticCurveTo(r * 0.7, -r * 0.85, r * 0.65, -r * 0.2)
  ctx.closePath()
  ctx.fill()

  // Void inside hood (black hole)
  const voidGrad = ctx.createRadialGradient(
    0, -r * 0.5, 0,
    0, -r * 0.5, r * 0.6
  )
  voidGrad.addColorStop(0, "#000000")
  voidGrad.addColorStop(0.7, "#050010")
  voidGrad.addColorStop(1, "rgba(10, 0, 21, 0.8)")

  ctx.fillStyle = voidGrad
  ctx.beginPath()
  ctx.ellipse(0, -r * 0.5, r * 0.55, r * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()

  // Stars inside the void
  for (let i = 0; i < 6; i++) {
    const sa = (i / 6) * Math.PI * 2 + t / 3000
    const sr = r * (0.15 + (i % 3) * 0.12)
    const sx = Math.cos(sa) * sr
    const sy = -r * 0.5 + Math.sin(sa) * sr * 0.7

    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(t / 200 + i) * 0.4})`
    ctx.beginPath()
    ctx.arc(sx, sy, r * 0.02, 0, Math.PI * 2)
    ctx.fill()
  }

  // Eyes (glowing red)
  for (const side of [-1, 1]) {
    const ex = side * r * 0.18
    const ey = -r * 0.55

    ctx.shadowColor = isBerserk ? "#ff0000" : "#ff2222"
    ctx.shadowBlur = isBerserk ? 30 : 18

    ctx.fillStyle = isBerserk ? "#ff0000" : "#ff2222"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.07, r * 0.05, side * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Pupil
    ctx.fillStyle = "#000000"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.025, r * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()

    // Reflection
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(ex - side * r * 0.015, ey - r * 0.015, r * 0.015, 0, Math.PI * 2)
    ctx.fill()
  }

  // Scythe
  const scytheSwing = isBerserk
    ? Math.sin(t / 100) * 0.15
    : Math.sin(t / 600) * 0.1

  ctx.save()
  ctx.translate(r * 0.7, -r * 0.2)
  ctx.rotate(0.4 + scytheSwing)

  // Handle
  ctx.strokeStyle = "#1a0a2a"
  ctx.lineWidth = r * 0.07
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(0, r * 0.8)
  ctx.lineTo(0, -r * 1.2)
  ctx.stroke()

  // Blade (crescent)
  const bladeGrad = ctx.createLinearGradient(
    -r * 0.6, -r,
    r * 0.2, -r * 0.6
  )
  bladeGrad.addColorStop(0, isBerserk ? "#ff3333" : "#c084fc")
  bladeGrad.addColorStop(0.5, isBerserk ? "#ff0000" : "#a855f7")
  bladeGrad.addColorStop(1, isBerserk ? "#8b0000" : "#7c3aed")

  ctx.fillStyle = bladeGrad
  ctx.shadowColor = isBerserk ? "#ff0000" : "#a855f7"
  ctx.shadowBlur = 15
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.2)
  ctx.quadraticCurveTo(-r * 0.8, -r * 1.0, -r * 0.5, -r * 0.3)
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.6, 0, -r * 0.7)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0

  // Blade edge glow
  ctx.strokeStyle = isBerserk ? "#ff6666" : "#e9d5ff"
  ctx.lineWidth = r * 0.02
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.2)
  ctx.quadraticCurveTo(-r * 0.8, -r * 1.0, -r * 0.5, -r * 0.3)
  ctx.stroke()

  ctx.restore()
  ctx.restore() // end body translate

  // BERSERK: extra rage particles
  if (isBerserk) {
    for (let i = 0; i < 8; i++) {
      const pa = t / 150 + (i / 8) * Math.PI * 2
      const pd = r * (1.5 + Math.sin(t / 100 + i) * 0.4)
      const px = bx + Math.cos(pa) * pd
      const py = by + Math.sin(pa) * pd * 0.6

      ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(t / 80 + i) * 0.3})`
      ctx.shadowColor = "#ff0000"
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(px, py, r * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  // HEAL: red particles rising
  if (isHealing) {
    for (let i = 0; i < 6; i++) {
      const pa = t / 400 + (i / 6) * Math.PI * 2
      const rise = (t / 10 + i * 30) % 200
      const px = bx + Math.cos(pa) * r * 1.2
      const py = by + r * 0.5 - rise

      ctx.fillStyle = `rgba(255, 100, 100, ${0.6 - rise / 300})`
      ctx.beginPath()
      ctx.arc(px, py, r * 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore() // end heal alpha
}
