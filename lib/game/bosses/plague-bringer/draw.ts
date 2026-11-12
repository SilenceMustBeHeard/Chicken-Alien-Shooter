
import type { Boss, Player } from "@/lib/game/types"

export function drawPlagueBringer(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
) {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y

  const healthPercent = boss.health / boss.maxHealth
  const isBerserk = healthPercent < 0.15

  const currentAuraRadius = isBerserk
    ? boss.auraRadius
      ? boss.auraRadius + 100
      : 350
    : boss.auraRadius || 250
  const auraPulse = 0.5 + Math.sin(t / 400) * 0.5
  const breath = 1 + Math.sin(t / 350) * 0.035
  const wobble = Math.sin(t / 250) * r * 0.025

  const toxic = isBerserk ? "#ff7a18" : "#a3e635"
  const toxicBright = isBerserk ? "#ffe16b" : "#e4ff9a"
  const toxicDark = isBerserk ? "#b52b08" : "#365314"

  // ─── AURA ───
  ctx.save()

  const auraColor = isBerserk ? "255, 30, 30" : "0, 255, 100"
  const auraColorBright = isBerserk ? "255, 120, 120" : "150, 255, 180"

  // OUTER TRANSLUCENT FILL
  ctx.fillStyle = `rgba(${auraColor}, ${0.08 + auraPulse * 0.05})`
  ctx.beginPath()
  ctx.arc(bx, by, currentAuraRadius, 0, Math.PI * 2)
  ctx.fill()

  // INNER SOFT GRADIENT
  const innerGlow = ctx.createRadialGradient(
    bx, by, r * 0.3,
    bx, by, currentAuraRadius * 0.75,
  )
  innerGlow.addColorStop(0, `rgba(${auraColor}, ${0.18 + auraPulse * 0.1})`)
  innerGlow.addColorStop(0.5, `rgba(${auraColor}, ${0.08 + auraPulse * 0.04})`)
  innerGlow.addColorStop(1, `rgba(${auraColor}, 0)`)

  ctx.fillStyle = innerGlow
  ctx.beginPath()
  ctx.arc(bx, by, currentAuraRadius * 0.75, 0, Math.PI * 2)
  ctx.fill()

  // PULSING CLOUD LAYERS
  for (let layer = 0; layer < 3; layer++) {
    const layerPhase = ((t / 2000) + layer / 3) % 1
    const layerRadius = currentAuraRadius * (0.3 + layerPhase * 0.65)
    const layerAlpha = (1 - layerPhase) * 0.15

    ctx.beginPath()
    const points = 20
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2
      const wobbleCloud =
        Math.sin(a * 3 + t / 400 + layer) * currentAuraRadius * 0.04 +
        Math.cos(a * 5 - t / 300 + layer) * currentAuraRadius * 0.03
      const ri = layerRadius + wobbleCloud
      const px = bx + Math.cos(a) * ri
      const py = by + Math.sin(a) * ri
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()

    ctx.fillStyle = `rgba(${auraColor}, ${layerAlpha})`
    ctx.fill()
  }

  // EDGE PARTICLES
  for (let i = 0; i < 24; i++) {
    const pa = (i / 24) * Math.PI * 2 + t / 1800
    const escape = (t / 2500 + i * 0.15) % 1
    const pr = currentAuraRadius * (0.85 + escape * 0.25)
    const px = bx + Math.cos(pa) * pr
    const py = by + Math.sin(pa) * pr
    const alpha = (1 - escape) * 0.6
    const size = r * (0.03 + escape * 0.03)

    ctx.fillStyle = `rgba(${auraColorBright}, ${alpha})`
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()
  }

  // INNER PARTICLES
  for (let i = 0; i < 20; i++) {
    const seed = i * 2.399
    const cycle = (t * (0.00015 + (i % 4) * 0.00003) + i * 0.173) % 1
    const orbit = currentAuraRadius * (0.15 + ((i * 7) % 11) / 16)
    const angle = seed + t * (i % 2 === 0 ? 0.0004 : -0.0003)

    const px = bx + Math.cos(angle) * orbit * (0.7 + cycle * 0.3)
    const py = by + Math.sin(angle) * orbit * 0.55 - cycle * currentAuraRadius * 0.5

    const alpha = Math.max(0, Math.sin(cycle * Math.PI)) * 0.8
    const size = r * (0.015 + (i % 4) * 0.01)

    ctx.fillStyle = `rgba(${auraColorBright}, ${alpha})`
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()

    if (i % 3 === 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`
      ctx.beginPath()
      ctx.arc(px - size * 0.2, py - size * 0.2, size * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()

  // RISING SPORES 
  for (let i = 0; i < 20; i++) {
    const seed = i * 2.399
    const cycle = (t * (0.00012 + (i % 4) * 0.000025) + i * 0.173) % 1
    const orbit = currentAuraRadius * (0.18 + ((i * 7) % 11) / 14)
    const angle = seed + t * (i % 2 === 0 ? 0.00035 : -0.00025)

    const px = bx + Math.cos(angle) * orbit * (0.7 + cycle * 0.3)
    const py = by + Math.sin(angle) * orbit * 0.52 - cycle * currentAuraRadius * 0.45

    const alpha = Math.max(0, Math.sin(cycle * Math.PI)) * 0.7
    const size = r * (0.012 + (i % 4) * 0.008)

    ctx.fillStyle = isBerserk
      ? `rgba(255, ${100 + (i % 5) * 20}, 15, ${alpha})`
      : `rgba(${150 + (i % 4) * 20}, 230, ${55 + (i % 3) * 20}, ${alpha})`

    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()

    if (i % 4 === 0) {
      ctx.fillStyle = `rgba(240, 255, 200, ${alpha * 0.6})`
      ctx.beginPath()
      ctx.arc(px - size * 0.25, py - size * 0.25, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ORBITING PLAGUE TOTEMS 
  for (let i = 0; i < 4; i++) {
    const angle = t / 2500 + (i / 4) * Math.PI * 2
    const orbitRadius = r * (1.65 + Math.sin(t / 600 + i) * 0.08)
    const sx = bx + Math.cos(angle) * orbitRadius
    const sy = by + Math.sin(angle) * orbitRadius * 0.56
      + Math.sin(t / 450 + i) * r * 0.08

    const skullScale = 0.72 + Math.sin(t / 300 + i) * 0.08

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(Math.sin(t / 700 + i) * 0.12)
    ctx.scale(skullScale, skullScale)

    ctx.fillStyle = isBerserk
      ? "rgba(255, 80, 0, 0.12)"
      : "rgba(163, 230, 53, 0.12)"
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.27, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#192014"
    ctx.strokeStyle = toxicDark
    ctx.lineWidth = Math.max(1, r * 0.018)

    ctx.beginPath()
    ctx.moveTo(-r * 0.19, -r * 0.15)
    ctx.lineTo(-r * 0.13, -r * 0.24)
    ctx.lineTo(-r * 0.02, -r * 0.26)
    ctx.lineTo(r * 0.13, -r * 0.21)
    ctx.lineTo(r * 0.2, -r * 0.1)
    ctx.lineTo(r * 0.17, r * 0.06)
    ctx.lineTo(r * 0.1, r * 0.12)
    ctx.lineTo(r * 0.09, r * 0.2)
    ctx.lineTo(-r * 0.1, r * 0.2)
    ctx.lineTo(-r * 0.12, r * 0.12)
    ctx.lineTo(-r * 0.19, r * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#050805"
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(side * r * 0.075, -r * 0.055, r * 0.052, r * 0.065, side * -0.2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = toxicBright
    ctx.beginPath()
    ctx.arc(-r * 0.075, -r * 0.055, r * 0.022, 0, Math.PI * 2)
    ctx.arc(r * 0.075, -r * 0.055, r * 0.022, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#8a9874"
    for (let tooth = 0; tooth < 3; tooth++) {
      const tx = -r * 0.075 + tooth * r * 0.075
      ctx.beginPath()
      ctx.moveTo(tx - r * 0.02, r * 0.11)
      ctx.lineTo(tx + r * 0.02, r * 0.11)
      ctx.lineTo(tx, r * 0.16)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }

  // BODY 
  ctx.save()
  ctx.translate(bx + wobble, by)
  ctx.scale(breath, breath)

  // Ground shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.48)"
  ctx.beginPath()
  ctx.ellipse(0, r * 0.92, r * 0.82, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()

  // Tattered lower robe
  const robeGrad = ctx.createLinearGradient(-r * 0.55, -r * 0.2, r * 0.45, r)
  robeGrad.addColorStop(0, "#46552a")
  robeGrad.addColorStop(0.28, "#28351b")
  robeGrad.addColorStop(0.72, "#11190b")
  robeGrad.addColorStop(1, "#070b05")

  ctx.fillStyle = robeGrad
  ctx.strokeStyle = "#090d06"
  ctx.lineWidth = r * 0.05

  ctx.beginPath()
  ctx.moveTo(-r * 0.28, -r * 0.45)
  ctx.lineTo(-r * 0.58, -r * 0.29)
  ctx.lineTo(-r * 0.75, r * 0.16)
  ctx.lineTo(-r * 0.66, r * 0.47)
  ctx.lineTo(-r * 0.76, r * 0.75)
  ctx.lineTo(-r * 0.44, r * 0.7)
  ctx.lineTo(-r * 0.18, r * 0.87)
  ctx.lineTo(r * 0.05, r * 0.72)
  ctx.lineTo(r * 0.34, r * 0.85)
  ctx.lineTo(r * 0.5, r * 0.64)
  ctx.lineTo(r * 0.72, r * 0.7)
  ctx.lineTo(r * 0.66, r * 0.3)
  ctx.lineTo(r * 0.76, -r * 0.13)
  ctx.lineTo(r * 0.45, -r * 0.43)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Torn fabric cuts
  ctx.fillStyle = "#070b05"
  for (let i = 0; i < 4; i++) {
    const tx = r * (-0.53 + i * 0.34)
    const ty = r * (0.67 + (i % 2) * 0.06)

    ctx.beginPath()
    ctx.moveTo(tx - r * 0.06, ty)
    ctx.lineTo(tx + r * 0.07, ty - r * 0.015)
    ctx.lineTo(tx + r * 0.015, ty + r * 0.13)
    ctx.closePath()
    ctx.fill()
  }

  // Asymmetrical arms
  ctx.lineCap = "round"

  // Long left arm
  ctx.strokeStyle = "#11190b"
  ctx.lineWidth = r * 0.19
  ctx.beginPath()
  ctx.moveTo(-r * 0.53, -r * 0.29)
  ctx.lineTo(-r * 0.76, r * 0.08)
  ctx.lineTo(-r * 0.85, r * 0.49)
  ctx.stroke()

  ctx.strokeStyle = "#3b4b24"
  ctx.lineWidth = r * 0.105
  ctx.beginPath()
  ctx.moveTo(-r * 0.53, -r * 0.29)
  ctx.lineTo(-r * 0.76, r * 0.08)
  ctx.lineTo(-r * 0.85, r * 0.47)
  ctx.stroke()

  // Left claws
  ctx.strokeStyle = "#0a1007"
  ctx.lineWidth = r * 0.04
  for (let i = 0; i < 3; i++) {
    const fx = -r * 0.85 + (i - 1) * r * 0.075
    ctx.beginPath()
    ctx.moveTo(-r * 0.85, r * 0.47)
    ctx.lineTo(fx, r * (0.61 + (i % 2) * 0.035))
    ctx.stroke()
  }

  // Right arm
  ctx.strokeStyle = "#11190b"
  ctx.lineWidth = r * 0.22
  ctx.beginPath()
  ctx.moveTo(r * 0.49, -r * 0.29)
  ctx.lineTo(r * 0.75, -r * 0.02)
  ctx.lineTo(r * 0.84, r * 0.23)
  ctx.stroke()

  ctx.strokeStyle = "#50662b"
  ctx.lineWidth = r * 0.12
  ctx.beginPath()
  ctx.moveTo(r * 0.5, -r * 0.29)
  ctx.lineTo(r * 0.75, -r * 0.02)
  ctx.lineTo(r * 0.84, r * 0.22)
  ctx.stroke()

  // Infected growth on right arm
  ctx.fillStyle = toxicDark
  ctx.beginPath()
  ctx.ellipse(r * 0.79, r * 0.12, r * 0.09, r * 0.13, -0.35, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = toxicBright
  ctx.beginPath()
  ctx.ellipse(r * 0.77, r * 0.09, r * 0.025, r * 0.055, -0.35, 0, Math.PI * 2)
  ctx.fill()

  // Shoulder carapace
  for (const side of [-1, 1]) {
    const sx = side * r * 0.53
    const sy = -r * 0.36

    const armor = ctx.createLinearGradient(
      sx - r * 0.15, sy - r * 0.2,
      sx + r * 0.2, sy + r * 0.18,
    )
    armor.addColorStop(0, "#536044")
    armor.addColorStop(0.45, "#202b17")
    armor.addColorStop(1, "#0a1008")

    ctx.fillStyle = armor
    ctx.strokeStyle = "#080d06"
    ctx.lineWidth = r * 0.035

    ctx.beginPath()
    ctx.moveTo(sx - side * r * 0.16, sy - r * 0.12)
    ctx.lineTo(sx + side * r * 0.2, sy - r * 0.2)
    ctx.lineTo(sx + side * r * 0.29, sy + r * 0.04)
    ctx.lineTo(sx + side * r * 0.09, sy + r * 0.18)
    ctx.lineTo(sx - side * r * 0.13, sy + r * 0.08)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#87966b"
    ctx.beginPath()
    ctx.moveTo(sx + side * r * 0.04, sy - r * 0.11)
    ctx.lineTo(sx + side * r * 0.25, sy - r * 0.35)
    ctx.lineTo(sx + side * r * 0.2, sy - r * 0.04)
    ctx.closePath()
    ctx.fill()
  }

  // Chest carapace
  ctx.fillStyle = "#151e0d"
  ctx.strokeStyle = "#080d05"
  ctx.lineWidth = r * 0.035

  ctx.beginPath()
  ctx.moveTo(-r * 0.34, -r * 0.37)
  ctx.lineTo(-r * 0.12, -r * 0.47)
  ctx.lineTo(r * 0.27, -r * 0.35)
  ctx.lineTo(r * 0.36, r * 0.06)
  ctx.lineTo(r * 0.13, r * 0.27)
  ctx.lineTo(-r * 0.29, r * 0.15)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Toxic veins in chest
  ctx.strokeStyle = toxic
  ctx.lineWidth = r * 0.025
  ctx.beginPath()
  ctx.moveTo(-r * 0.22, -r * 0.28)
  ctx.lineTo(-r * 0.06, -r * 0.12)
  ctx.lineTo(-r * 0.16, r * 0.03)
  ctx.moveTo(-r * 0.06, -r * 0.12)
  ctx.lineTo(r * 0.13, -r * 0.2)
  ctx.lineTo(r * 0.22, -r * 0.04)
  ctx.stroke()

  // Hood
  const hood = ctx.createRadialGradient(
    -r * 0.13, -r * 0.76, r * 0.03,
    0, -r * 0.63, r * 0.48,
  )
  hood.addColorStop(0, "#46532b")
  hood.addColorStop(0.5, "#202b16")
  hood.addColorStop(1, "#080d06")

  ctx.fillStyle = hood
  ctx.strokeStyle = "#080c05"
  ctx.lineWidth = r * 0.05

  ctx.beginPath()
  ctx.moveTo(-r * 0.39, -r * 0.57)
  ctx.lineTo(-r * 0.42, -r * 0.82)
  ctx.lineTo(-r * 0.25, -r * 1.04)
  ctx.lineTo(r * 0.05, -r * 1.1)
  ctx.lineTo(r * 0.35, -r * 0.92)
  ctx.lineTo(r * 0.42, -r * 0.65)
  ctx.lineTo(r * 0.24, -r * 0.39)
  ctx.lineTo(-r * 0.19, -r * 0.36)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Hood rim
  ctx.strokeStyle = "#647546"
  ctx.lineWidth = r * 0.035
  ctx.beginPath()
  ctx.moveTo(-r * 0.36, -r * 0.69)
  ctx.quadraticCurveTo(0, -r * 0.85, r * 0.37, -r * 0.68)
  ctx.stroke()

  // Plague mask
  const maskGrad = ctx.createLinearGradient(
    -r * 0.25, -r * 0.68,
    r * 0.25, -r * 0.37,
  )
  maskGrad.addColorStop(0, "#78846b")
  maskGrad.addColorStop(0.45, "#394532")
  maskGrad.addColorStop(1, "#151d13")

  ctx.fillStyle = maskGrad
  ctx.strokeStyle = "#090e08"
  ctx.lineWidth = r * 0.04

  ctx.beginPath()
  ctx.moveTo(-r * 0.29, -r * 0.67)
  ctx.lineTo(r * 0.28, -r * 0.67)
  ctx.lineTo(r * 0.23, -r * 0.43)
  ctx.lineTo(r * 0.04, -r * 0.29)
  ctx.lineTo(-r * 0.16, -r * 0.39)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Beak respirator
  ctx.fillStyle = "#10170d"
  ctx.beginPath()
  ctx.moveTo(-r * 0.15, -r * 0.52)
  ctx.lineTo(r * 0.15, -r * 0.52)
  ctx.lineTo(r * 0.09, -r * 0.34)
  ctx.lineTo(0, -r * 0.22)
  ctx.lineTo(-r * 0.1, -r * 0.35)
  ctx.closePath()
  ctx.fill()

  // Filter vents
  ctx.strokeStyle = "#85966d"
  ctx.lineWidth = r * 0.018
  for (let i = 0; i < 3; i++) {
    const vy = -r * (0.47 - i * 0.045)
    ctx.beginPath()
    ctx.moveTo(-r * 0.085, vy)
    ctx.lineTo(r * 0.085, vy)
    ctx.stroke()
  }

  // Eyes in the hood
  for (const side of [-1, 1]) {
    const ex = side * r * 0.2
    const ey = -r * 0.72

    ctx.fillStyle = "#050804"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.13, r * 0.085, side * -0.18, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = toxic
    ctx.shadowBlur = isBerserk ? 10 : 6

    ctx.fillStyle = toxicBright
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.075, r * 0.035, side * -0.18, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0

    ctx.fillStyle = "#0a1007"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.018, r * 0.032, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Infected wounds
  for (let i = 0; i < 3; i++) {
    const wx = r * (-0.25 + i * 0.16)
    const wy = r * (0.27 + (i % 2) * 0.13)
    const woundPulse = 0.75 + Math.sin(t / 180 + i) * 0.25

    ctx.fillStyle = `rgba(8, 15, 4, ${0.65 * woundPulse})`
    ctx.beginPath()
    ctx.ellipse(wx, wy, r * 0.065, r * 0.09, -0.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = toxic
    ctx.lineWidth = r * 0.018
    ctx.beginPath()
    ctx.moveTo(wx - r * 0.04, wy - r * 0.04)
    ctx.lineTo(wx + r * 0.035, wy + r * 0.025)
    ctx.lineTo(wx - r * 0.005, wy + r * 0.065)
    ctx.stroke()
  }

  // Uneven legs
  ctx.lineCap = "round"
  ctx.strokeStyle = "#11180b"
  ctx.lineWidth = r * 0.19

  ctx.beginPath()
  ctx.moveTo(-r * 0.32, r * 0.68)
  ctx.lineTo(-r * 0.43, r * 0.97)
  ctx.moveTo(r * 0.32, r * 0.68)
  ctx.lineTo(r * 0.48, r * 0.94)
  ctx.stroke()

  ctx.strokeStyle = "#3a4a23"
  ctx.lineWidth = r * 0.1

  ctx.beginPath()
  ctx.moveTo(-r * 0.32, r * 0.68)
  ctx.lineTo(-r * 0.43, r * 0.95)
  ctx.moveTo(r * 0.32, r * 0.68)
  ctx.lineTo(r * 0.48, r * 0.92)
  ctx.stroke()

  // Clawed feet
  ctx.strokeStyle = "#0b1007"
  ctx.lineWidth = r * 0.04

  for (const side of [-1, 1]) {
    const fx = side * r * 0.45
    const fy = r * 0.96

    ctx.beginPath()
    ctx.moveTo(fx, fy)
    ctx.lineTo(fx + side * r * 0.13, fy + r * 0.05)
    ctx.lineTo(fx + side * r * 0.17, fy + r * 0.01)
    ctx.stroke()
  }

  ctx.lineCap = "butt"
  ctx.restore()
}