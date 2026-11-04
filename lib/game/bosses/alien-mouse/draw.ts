// lib/game/bosses/alien-mouse/draw.ts

import type { Boss, Player } from "@/lib/game/types"

export function drawAlienMouse(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  player: Player,
) {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y

  const healthPercent = boss.health / boss.maxHealth
  const isLowHP = healthPercent < 0.5
  const isCriticalHP = healthPercent < 0.25

  const breathPulse = 1 + Math.sin(t / 180) * 0.05
  const tailWave = Math.sin(t / 145)
  const earWave = Math.sin(t / 260) * 0.1

  const angleToPlayer = Math.atan2(player.y - by, player.x - bx)
  const lookDir = angleToPlayer > -Math.PI / 2 && angleToPlayer < Math.PI / 2 ? 1 : -1
  const headShift = lookDir * r * 0.08
  const headTilt = lookDir * 0.08
  const pupilShiftX = lookDir * r * 0.06

  // AURA
  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const auraColor = isCriticalHP
    ? { r: 255, g: 30, b: 30 }
    : isLowHP
      ? { r: 200, g: 50, b: 180 }
      : { r: 149, g: 18, b: 205 }

  const aura = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 1.7)
  aura.addColorStop(0, `rgba(${auraColor.r}, ${auraColor.g}, ${auraColor.b}, 0.65)`)
  aura.addColorStop(0.55, `rgba(${auraColor.r + 20}, ${auraColor.g + 60}, ${auraColor.b + 20}, 0.55)`)
  aura.addColorStop(1, `rgba(${auraColor.r + 30}, ${auraColor.g + 70}, ${auraColor.b + 20}, 0.6)`)

  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(bx, by, r * 1.7, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 6; i++) {
    const a = t / 700 + (i * Math.PI) / 3
    const orbit = r * (1.2 + Math.sin(t / 250 + i) * 0.08)
    const px = bx + Math.cos(a) * orbit
    const py = by + Math.sin(a) * orbit * 0.7

    ctx.fillStyle = i % 2 === 0 ? "#e879f9" : "#818cf8"
    ctx.globalAlpha = 0.55 + Math.sin(t / 100 + i) * 0.3
    ctx.beginPath()
    ctx.arc(px, py, r * 0.035, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()

  // TAIL 
  const tailStartX = bx - r * 0.75
  const tailStartY = by + r * 0.35

  const tailPoints: { x: number; y: number }[] = []
  for (let i = 0; i <= 12; i++) {
    const p = i / 12
    const x = tailStartX - p * r * 1.5
    const y = tailStartY + Math.sin(p * Math.PI * 2 + tailWave) * r * 0.35 + p * r * 0.15
    tailPoints.push({ x, y })
  }

  ctx.beginPath()
  tailPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.strokeStyle = "#124d90"
  ctx.lineWidth = r * 0.24
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()

  const tailGrad = ctx.createLinearGradient(tailStartX, 0, tailStartX - r * 1.5, 0)
  tailGrad.addColorStop(0, "#a78bfa")
  tailGrad.addColorStop(0.5, "#7c3aed")
  tailGrad.addColorStop(1, "#4c1d95")
  ctx.beginPath()
  tailPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.strokeStyle = tailGrad
  ctx.lineWidth = r * 0.14
  ctx.stroke()

  const tailTip = tailPoints[tailPoints.length - 1]
  ctx.shadowColor = "#e879f9"
  ctx.shadowBlur = 18
  ctx.fillStyle = "#f0abfc"
  ctx.beginPath()
  ctx.arc(tailTip.x, tailTip.y, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // BODY 
  ctx.save()

  ctx.fillStyle = "#1e0838"
  ctx.beginPath()
  ctx.ellipse(bx, by + r * 0.6, r * 0.95, r * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()

  const bodyGrad = ctx.createRadialGradient(
    bx - r * 0.3, by, r * 0.1,
    bx, by + r * 0.15, r * 1.2,
  )
  bodyGrad.addColorStop(0, "#ddd6fe")
  bodyGrad.addColorStop(0.4, "#a78bfa")
  bodyGrad.addColorStop(0.75, "#7c3aed")
  bodyGrad.addColorStop(1, "#4c1d95")

  ctx.fillStyle = bodyGrad
  ctx.strokeStyle = "#2e1065"
  ctx.lineWidth = r * 0.065

  ctx.beginPath()
  ctx.ellipse(bx, by + r * 0.15, r * 0.95, r * 0.62, -0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#6d28d9"
  ctx.strokeStyle = "#a78bfa"
  ctx.lineWidth = r * 0.02

  for (let i = 0; i < 3; i++) {
    const px = bx - r * 0.4 + i * r * 0.35
    const py = by - r * 0.35 + i * r * 0.04

    ctx.beginPath()
    ctx.moveTo(px - r * 0.12, py)
    ctx.lineTo(px, py - r * 0.12)
    ctx.lineTo(px + r * 0.12, py)
    ctx.lineTo(px, py + r * 0.08)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()

  // LEGS (hover) 
  ctx.lineCap = "round"

  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1
    const idx = i % 2
    const baseX = bx + side * (r * 0.3 + idx * r * 0.35)
    const baseY = by + r * 0.5

    const hover = Math.sin(t / 200 + i * 0.8) * r * 0.08
    const length = r * 0.35

    ctx.strokeStyle = "#7c3aed"
    ctx.lineWidth = r * 0.09
    ctx.beginPath()
    ctx.moveTo(baseX, baseY)
    ctx.lineTo(baseX + side * r * 0.1, baseY + length + hover)
    ctx.stroke()

    ctx.strokeStyle = "rgba(232, 121, 249, 0.6)"
    ctx.lineWidth = r * 0.03
    const ringY = baseY + length + hover + r * 0.15
    const ringScale = 1 + Math.sin(t / 150 + i) * 0.2
    ctx.beginPath()
    ctx.ellipse(baseX + side * r * 0.1, ringY, r * 0.12 * ringScale, r * 0.04 * ringScale, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineCap = "butt"

  // HEAD 
  const headBaseY = by - r * 0.55

  ctx.save()
  ctx.translate(bx, headBaseY)
  ctx.rotate(headTilt)
  ctx.translate(-bx, -headBaseY)

  // Ears
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(bx + side * r * 0.45, headBaseY - r * 0.35)
    ctx.rotate(side * earWave)

    ctx.fillStyle = "#3b0764"
    ctx.strokeStyle = "#6d28d9"
    ctx.lineWidth = r * 0.04
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#ec4899"
    ctx.beginPath()
    ctx.arc(side * r * 0.05, 0, r * 0.28, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // Head
  const headCenterX = bx + headShift
  const headCenterY = headBaseY

  ctx.save()
  ctx.translate(headCenterX, headCenterY)
  ctx.scale(breathPulse, breathPulse)
  ctx.translate(-headCenterX, -headCenterY)

  const headGrad = ctx.createRadialGradient(
    headCenterX - r * 0.2, headCenterY - r * 0.2, r * 0.05,
    headCenterX, headCenterY, r * 0.7,
  )
  headGrad.addColorStop(0, "#ddd6fe")
  headGrad.addColorStop(0.4, "#a78bfa")
  headGrad.addColorStop(0.75, "#7c3aed")
  headGrad.addColorStop(1, "#4c1d95")

  ctx.fillStyle = headGrad
  ctx.strokeStyle = "#2e1065"
  ctx.lineWidth = r * 0.05

  ctx.beginPath()
  ctx.ellipse(headCenterX, headCenterY, r * 0.62, r * 0.58, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Snout
  ctx.fillStyle = "#c4b5fd"
  ctx.beginPath()
  ctx.ellipse(headCenterX, headCenterY + r * 0.42, r * 0.32, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Nose
  ctx.fillStyle = "#f472b6"
  ctx.beginPath()
  ctx.ellipse(headCenterX, headCenterY + r * 0.62, r * 0.08, r * 0.06, 0, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  for (const side of [-1, 1]) {
    const ex = headCenterX + side * r * 0.2
    const ey = headCenterY - r * 0.1

    ctx.fillStyle = "#170524"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.14, r * 0.17, side * 0.1, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = "#ff00cc"
    ctx.shadowBlur = 14
    ctx.fillStyle = "#ff006e"
    ctx.beginPath()
    ctx.arc(ex + pupilShiftX, ey + r * 0.05, r * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(ex + pupilShiftX + r * 0.02, ey + r * 0.02, r * 0.03, 0, Math.PI * 2)
    ctx.fill()
  }

  // Mouth
  ctx.fillStyle = "#10051b"
  ctx.beginPath()
  ctx.ellipse(headCenterX, headCenterY + r * 0.74, r * 0.12, r * 0.06, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
  ctx.restore()
}