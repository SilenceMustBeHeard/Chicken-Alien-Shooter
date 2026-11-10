
import type { Boss, Player } from "@/lib/game/types"

export function drawQueenXenoHen(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
): void {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y
  const enraged = boss.queenEnraged ?? false

  const pulse = 1 + Math.sin(t / (enraged ? 110 : 180)) * 0.025
  const wingFlap = Math.sin(t / 75) * 0.18
  const crestPulse = enraged
    ? 0.85 + Math.sin(t / 75) * 0.15
    : 0.7 + Math.sin(t / 120) * 0.3
  const auraPulse = enraged
    ? 0.8 + Math.sin(t / 130) * 0.2
    : 0.5 + Math.sin(t / 250) * 0.3
  const hover = Math.sin(t / 160) * r * 0.025
  const cy = by + hover

  const orbitRadius = r * 1.35
  const orbitSpeed = t / 1200
  const eggCount = 5

  ctx.save()

  // BIOLOGICAL BUFF FIELD
  if (boss.buffRadius) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const aura = ctx.createRadialGradient(
      bx, cy, r * 0.55,
      bx, cy, boss.buffRadius,
    )

    aura.addColorStop(
      0,
      enraged
        ? `rgba(255, 45, 180, ${auraPulse * 0.3})`
        : `rgba(170, 45, 255, ${auraPulse * 0.2})`,
    )
    aura.addColorStop(
      0.65,
      enraged
        ? `rgba(255, 90, 210, ${auraPulse * 0.18})`
        : `rgba(65, 210, 255, ${auraPulse * 0.1})`,
    )
    aura.addColorStop(
      1,
      enraged
        ? "rgba(255, 70, 190, 0.72)"
        : "rgba(65, 211, 255, 0.62)",
    )

    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(bx, cy, boss.buffRadius, 0, Math.PI * 10)
    ctx.fill()

    ctx.strokeStyle = enraged
      ? `rgba(255, 100, 220, ${auraPulse * 0.75})`
      : `rgba(110, 230, 255, ${auraPulse * 0.5})`
    ctx.lineWidth = enraged ? 3 : 2
    ctx.setLineDash([12, 9])
    ctx.beginPath()
    ctx.arc(
      bx,
      cy,
      boss.buffRadius,
      -t / (enraged ? 550 : 900),
      Math.PI * 2 - t / (enraged ? 550 : 900),
    )
    ctx.stroke()
    ctx.setLineDash([])

    ctx.restore()
  }

  // ENRAGE HALO
  if (enraged) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    ctx.strokeStyle = `rgba(255, 65, 190, ${0.25 + auraPulse * 0.25})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(bx, cy, r * 1.12 + Math.sin(t / 90) * 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // ALIEN TAIL: SEGMENTED SPINES
  ctx.save()
  ctx.translate(bx, cy + r * 0.35)
  ctx.rotate(Math.sin(t / 220) * 0.08)

  for (let i = -2; i <= 2; i++) {
    const spread = i * r * 0.19
    const length = r * (0.62 + (2 - Math.abs(i)) * 0.12)

    ctx.fillStyle = i % 2 === 0 ? "#5c2a8a" : "#2a2244"
    ctx.strokeStyle = "#a56bff"
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.moveTo(spread * 0.25, 0)
    ctx.quadraticCurveTo(
      spread * 0.6, length * 0.45,
      spread * 1.4, length,
    )
    ctx.lineTo(spread * 1.4 + r * 0.055, length * 0.66)
    ctx.quadraticCurveTo(
      spread * 0.8, length * 0.25,
      spread * 0.25, 0,
    )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = `rgba(90, 240, 255, ${0.35 + crestPulse * 0.25})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(spread * 0.3, r * 0.08)
    ctx.lineTo(spread * 1.3, length * 0.82)
    ctx.stroke()
  }

  ctx.restore()

  // FOUR ALIEN WINGS
  for (const side of [-1, 1]) {
    for (const rear of [true, false]) {
      ctx.save()
      ctx.translate(
        bx + side * r * (rear ? 0.35 : 0.48),
        cy - r * (rear ? 0.05 : 0.12),
      )

      ctx.rotate(
        side * (rear ? 0.48 : -0.28) +
        wingFlap * (rear ? -0.7 : 1),
      )

      const length = r * (rear ? 0.9 : 1.25)
      const height = r * (rear ? 0.31 : 0.4)

      ctx.fillStyle = rear
        ? "rgba(91, 45, 155, 0.48)"
        : "rgba(88, 200, 255, 0.25)"
      ctx.strokeStyle = rear ? "#8954c9" : "#65dfff"
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(
        side * length * 0.35, -height * 1.2,
        side * length, -height * 0.15,
      )
      ctx.quadraticCurveTo(
        side * length * 0.75, height * 0.9,
        side * length * 0.2, height * 0.55,
      )
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.strokeStyle = "rgba(180, 245, 255, 0.65)"
      ctx.lineWidth = 1.2

      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(r * 0.04, r * 0.04 * i)
        ctx.quadraticCurveTo(
          side * length * 0.45,
          (i - 1) * height * 0.15,
          side * length * (0.65 + i * 0.1),
          (i - 1) * height * 0.17,
        )
        ctx.stroke()
      }

      ctx.restore()
    }
  }

  // SIX JOINTED PREDATOR LIMBS
  ctx.save()
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const anchorX = bx + side * r * (0.28 + i * 0.2)
      const anchorY = cy + r * (0.12 + i * 0.23)
      const swing = Math.sin(t / 95 + i * 1.7 + side) * r * 0.07

      const kneeX = anchorX + side * r * (0.22 + i * 0.035)
      const kneeY = anchorY + r * 0.24
      const footX = kneeX + side * r * 0.12 + swing
      const footY = cy + r * (0.9 + i * 0.035)

      ctx.strokeStyle = "#811af86b"
      ctx.lineWidth = r * 0.075
      ctx.beginPath()
      ctx.moveTo(anchorX, anchorY)
      ctx.lineTo(kneeX, kneeY)
      ctx.lineTo(footX, footY)
      ctx.stroke()

      ctx.strokeStyle = "#8954c9"
      ctx.lineWidth = r * 0.022
      ctx.beginPath()
      ctx.moveTo(anchorX, anchorY)
      ctx.lineTo(kneeX, kneeY)
      ctx.stroke()

      ctx.fillStyle = "#5b3188"
      ctx.beginPath()
      ctx.arc(kneeX, kneeY, r * 0.055, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = "#b9f7ff"
      ctx.lineWidth = r * 0.025

      for (let claw = -1; claw <= 1; claw++) {
        ctx.beginPath()
        ctx.moveTo(footX, footY)
        ctx.lineTo(
          footX + side * r * (0.09 + claw * 0.025),
          footY + r * (0.07 + Math.abs(claw) * 0.025),
        )
        ctx.stroke()
      }
    }
  }

  ctx.restore()

  // BODY 
  ctx.save()
  ctx.translate(bx, cy)
  ctx.scale(pulse, pulse)

  const bodyGrad = ctx.createRadialGradient(
    -r * 0.25, -r * 0.25, r * 0.05,
    0, r * 0.12, r * 1.05,
  )

  bodyGrad.addColorStop(0, "#a35cd6")
  bodyGrad.addColorStop(0.3, "#7c3aed")
  bodyGrad.addColorStop(0.65, "#4c1d95")
  bodyGrad.addColorStop(1, "#1a0a2a")

  ctx.fillStyle = bodyGrad
  ctx.strokeStyle = "#c084fc"
  ctx.lineWidth = r * 0.045

  ctx.beginPath()
  ctx.ellipse(0, r * 0.1, r * 0.68, r * 0.83, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // CHITIN ARMOR PLATES
  for (let i = 0; i < 3; i++) {
    const plateY = -r * 0.25 + i * r * 0.29
    const plateW = r * (0.48 - i * 0.045)

    ctx.fillStyle = i % 2 === 0 ? "#4c1d95" : "#3b1478"
    ctx.strokeStyle = "#a78bfa"
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.moveTo(-plateW, plateY)
    ctx.quadraticCurveTo(0, plateY - r * 0.12, plateW, plateY)
    ctx.lineTo(plateW * 0.72, plateY + r * 0.14)
    ctx.quadraticCurveTo(
      0, plateY + r * 0.23,
      -plateW * 0.72, plateY + r * 0.14,
    )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // EMPTY EGG CHAMBER
  ctx.fillStyle = "rgba(40, 20, 60, 0.7)"
  ctx.beginPath()
  ctx.ellipse(0, r * 0.4, r * 0.45, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "rgba(167, 139, 250, 0.6)"
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // ARMOR GLINT
  ctx.strokeStyle = "rgba(205, 175, 255, 0.45)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(-r * 0.23, -r * 0.1, r * 0.2, r * 0.35, -0.3, -1.2, 1.2)
  ctx.stroke()

  ctx.restore()

  // ALIEN NECK — LAYERED ARMORED COLLAR
  ctx.fillStyle = "#1b1429"
  ctx.strokeStyle = "#8050b6"
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(bx - r * 0.43, cy - r * 0.55)
  ctx.lineTo(bx - r * 0.3, cy - r * 0.83)
  ctx.lineTo(bx, cy - r * 0.7)
  ctx.lineTo(bx + r * 0.3, cy - r * 0.83)
  ctx.lineTo(bx + r * 0.43, cy - r * 0.55)
  ctx.lineTo(bx + r * 0.28, cy - r * 0.4)
  ctx.lineTo(bx - r * 0.28, cy - r * 0.4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // XENO HEAD
  const headY = cy - r * 0.86

  const headGrad = ctx.createRadialGradient(
    bx - r * 0.15, headY - r * 0.12, r * 0.03,
    bx, headY, r * 0.57,
  )

  headGrad.addColorStop(0, "#69448d")
  headGrad.addColorStop(0.45, "#3a2856")
  headGrad.addColorStop(1, "#0b0b17")

  ctx.fillStyle = headGrad
  ctx.strokeStyle = "#9e69d6"
  ctx.lineWidth = r * 0.04

  ctx.beginPath()
  ctx.moveTo(bx, headY - r * 0.58)
  ctx.lineTo(bx + r * 0.39, headY - r * 0.2)
  ctx.lineTo(bx + r * 0.34, headY + r * 0.2)
  ctx.lineTo(bx + r * 0.13, headY + r * 0.42)
  ctx.lineTo(bx, headY + r * 0.32)
  ctx.lineTo(bx - r * 0.13, headY + r * 0.42)
  ctx.lineTo(bx - r * 0.34, headY + r * 0.2)
  ctx.lineTo(bx - r * 0.39, headY - r * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // FOREHEAD ARMOR RIDGE
  ctx.fillStyle = "#7c4fb0"
  ctx.beginPath()
  ctx.moveTo(bx, headY - r * 0.48)
  ctx.lineTo(bx + r * 0.13, headY - r * 0.12)
  ctx.lineTo(bx, headY + r * 0.04)
  ctx.lineTo(bx - r * 0.13, headY - r * 0.12)
  ctx.closePath()
  ctx.fill()

  // THREE-HORNED BIO-CROWN
  ctx.save()
  ctx.globalAlpha = crestPulse

  for (let i = -1; i <= 1; i++) {
    const hx = bx + i * r * 0.23
    const hy = headY - r * 0.38 + Math.abs(i) * r * 0.09
    const tipY = hy - r * (i === 0 ? 0.53 : 0.36)

    ctx.fillStyle = i === 0 ? "#6d28d9" : "#3b1478"
    ctx.strokeStyle = enraged ? "#ffb5f0" : "#c4b5fd"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(hx - r * 0.1, hy)
    ctx.quadraticCurveTo(
      hx - r * 0.08, tipY + r * 0.1,
      hx + r * 0.02, tipY,
    )
    ctx.quadraticCurveTo(
      hx + r * 0.1, tipY + r * 0.16,
      hx + r * 0.1, hy,
    )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()

  // CYAN PREDATOR EYES
  for (const side of [-1, 1]) {
    const eyeX = bx + side * r * 0.205
    const eyeY = headY - r * 0.035

    ctx.fillStyle = "#070b17"
    ctx.beginPath()
    ctx.ellipse(
      eyeX, eyeY,
      r * 0.145, r * 0.105,
      side * -0.22,
      0, Math.PI * 2,
    )
    ctx.fill()

    const eyeGrad = ctx.createRadialGradient(
      eyeX - r * 0.025, eyeY - r * 0.02, r * 0.01,
      eyeX, eyeY, r * 0.15,
    )

    eyeGrad.addColorStop(0, "#f3ffff")
    eyeGrad.addColorStop(0.25, "#7cfaff")
    eyeGrad.addColorStop(0.7, "#19bce9")
    eyeGrad.addColorStop(1, "#174a87")

    ctx.fillStyle = eyeGrad
    ctx.beginPath()
    ctx.ellipse(
      eyeX, eyeY,
      r * 0.12, r * 0.078,
      side * -0.22,
      0, Math.PI * 2,
    )
    ctx.fill()

    ctx.fillStyle = "#0478f388"
    ctx.beginPath()
    ctx.ellipse(
      eyeX, eyeY,
      r * 0.022, r * 0.064,
      0, 0, Math.PI * 2,
    )
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(
      eyeX - side * r * 0.035,
      eyeY - r * 0.025,
      r * 0.018,
      0, Math.PI * 2,
    )
    ctx.fill()
  }

  // SPLIT MANDIBLES
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#171122"
    ctx.strokeStyle = "#9e69d6"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(bx + side * r * 0.1, headY + r * 0.22)
    ctx.quadraticCurveTo(
      bx + side * r * 0.3, headY + r * 0.24,
      bx + side * r * 0.22, headY + r * 0.43,
    )
    ctx.lineTo(bx + side * r * 0.08, headY + r * 0.31)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#c9fbff"
    ctx.beginPath()
    ctx.moveTo(bx + side * r * 0.12, headY + r * 0.29)
    ctx.lineTo(bx + side * r * 0.16, headY + r * 0.4)
    ctx.lineTo(bx + side * r * 0.19, headY + r * 0.3)
    ctx.closePath()
    ctx.fill()
  }

  // BIO-LUMINESCENT SENSORS
  for (const side of [-1, 1]) {
    const sway = Math.sin(t / 90 + side) * r * 0.045
    const rootX = bx + side * r * 0.2
    const rootY = headY - r * 0.3
    const tipX = rootX + side * r * 0.18 + sway
    const tipY = rootY - r * 0.32

    ctx.strokeStyle = "#8b67b5"
    ctx.lineWidth = r * 0.035
    ctx.beginPath()
    ctx.moveTo(rootX, rootY)
    ctx.quadraticCurveTo(
      rootX + side * r * 0.12,
      rootY - r * 0.2,
      tipX, tipY,
    )
    ctx.stroke()

    ctx.fillStyle = "#70f7ff"
    ctx.beginPath()
    ctx.arc(tipX, tipY, r * 0.055, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "rgba(90, 240, 255, 0.22)"
    ctx.beginPath()
    ctx.arc(tipX, tipY, r * 0.105, 0, Math.PI * 2)
    ctx.fill()
  }

  // ENERGY SPINES ALONG THE BACK
  for (let i = 0; i < 5; i++) {
    const sx = bx + (i - 2) * r * 0.19
    const sy = cy - r * (0.48 - Math.abs(i - 2) * 0.04)

    ctx.fillStyle = "#5b3188"
    ctx.strokeStyle = "#6beaff"
    ctx.lineWidth = 1.2

    ctx.beginPath()
    ctx.moveTo(sx - r * 0.055, sy)
    ctx.lineTo(sx, sy - r * (0.14 + (i === 2 ? 0.06 : 0)))
    ctx.lineTo(sx + r * 0.055, sy)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // FIVE ORBITING BIO-EGGS — VISUAL ONLY
  for (let i = 0; i < eggCount; i++) {
    const eggAngle = orbitSpeed + (i / eggCount) * Math.PI * 2

    const eggX = bx + Math.cos(eggAngle) * orbitRadius
    const eggY = cy + Math.sin(eggAngle) * orbitRadius * 0.5

    const depth = Math.sin(eggAngle)
    const eggScale = 0.75 + depth * 0.25
    const eggR = r * 0.13 * eggScale

    // OUTER GLOW
    ctx.shadowColor = enraged ? "#ff4dff" : "#28f0ff"
    ctx.shadowBlur = enraged ? 24 : 18
    ctx.fillStyle = enraged
      ? "rgba(255, 70, 220, 0.24)"
      : "rgba(40, 240, 255, 0.2)"

    ctx.beginPath()
    ctx.ellipse(
      eggX, eggY,
      eggR * 1.5, eggR * 1.8,
      eggAngle,
      0, Math.PI * 2,
    )
    ctx.fill()
    ctx.shadowBlur = 0

    // EGG BODY
    const eggGrad = ctx.createRadialGradient(
      eggX - eggR * 0.3,
      eggY - eggR * 0.4,
      eggR * 0.05,
      eggX,
      eggY,
      eggR * 1.2,
    )

    eggGrad.addColorStop(0, "#f2ffff")
    eggGrad.addColorStop(0.3, "#8bf8ff")
    eggGrad.addColorStop(0.75, "#28a9dc")
    eggGrad.addColorStop(1, "#3154a8")

    ctx.fillStyle = eggGrad
    ctx.strokeStyle = enraged ? "#ffb5f0" : "#9af8ff"
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.ellipse(
      eggX, eggY,
      eggR, eggR * 1.35,
      eggAngle,
      0, Math.PI * 2,
    )
    ctx.fill()
    ctx.stroke()

    // CRACK DETAIL
    ctx.strokeStyle = "rgba(20, 80, 120, 0.6)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(eggX - eggR * 0.4, eggY - eggR * 0.3)
    ctx.lineTo(eggX - eggR * 0.1, eggY)
    ctx.lineTo(eggX - eggR * 0.3, eggY + eggR * 0.4)
    ctx.stroke()
  }

  ctx.restore()
}
