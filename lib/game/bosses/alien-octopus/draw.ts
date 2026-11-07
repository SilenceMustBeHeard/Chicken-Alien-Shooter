import type { Boss, Player } from "@/lib/game/types"

const GRAB_RANGE = 300

const WINDUP_DURATION = 550
const STRIKE_DURATION = 300
const RETRACT_DURATION = 550

type Point = {
  x: number
  y: number
}

function drawTentacle(
  ctx: CanvasRenderingContext2D,
  base: Point,
  control: Point,
  end: Point,
  r: number,
  alpha = 1,
) {
  const pointAt = (t: number): Point => {
    const mt = 1 - t

    return {
      x:
        mt * mt * base.x +
        2 * mt * t * control.x +
        t * t * end.x,
      y:
        mt * mt * base.y +
        2 * mt * t * control.y +
        t * t * end.y,
    }
  }

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = "round"

  // Outer armored outline
  ctx.beginPath()
  ctx.moveTo(base.x, base.y)
  ctx.quadraticCurveTo(control.x, control.y, end.x, end.y)

  ctx.strokeStyle = "#300b40"
  ctx.lineWidth = r * 0.22
  ctx.stroke()

  // Main tentacle
  ctx.beginPath()
  ctx.moveTo(base.x, base.y)
  ctx.quadraticCurveTo(control.x, control.y, end.x, end.y)

  ctx.strokeStyle = "#a01860"
  ctx.lineWidth = r * 0.16
  ctx.stroke()

  // Bioluminescent ridge
  ctx.beginPath()
  ctx.moveTo(base.x - r * 0.025, base.y)
  ctx.quadraticCurveTo(
    control.x - r * 0.025,
    control.y,
    end.x - r * 0.025,
    end.y,
  )

  ctx.strokeStyle = "#f9a8d4"
  ctx.lineWidth = r * 0.025
  ctx.stroke()

  // Suction cups
  for (let i = 1; i <= 5; i++) {
    const t = i / 6
    const p = pointAt(t)
    const cupR = r * (0.055 - t * 0.018)

    ctx.fillStyle = "#4a103d"
    ctx.beginPath()
    ctx.arc(p.x, p.y, cupR * 1.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#f9a8d4"
    ctx.beginPath()
    ctx.arc(p.x, p.y, cupR, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#8b1c63"
    ctx.beginPath()
    ctx.arc(p.x, p.y, cupR * 0.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#fff1f7"
    ctx.beginPath()
    ctx.arc(
      p.x - cupR * 0.2,
      p.y - cupR * 0.2,
      cupR * 0.17,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  // Tip
  ctx.fillStyle = "#f472b6"
  ctx.beginPath()
  ctx.arc(end.x, end.y, r * 0.035, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawIdleTentacles(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  time: number,
) {
  const r = boss.radius

  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1
    const index = i < 4 ? i : i - 4

    const base: Point = {
      x: boss.x + side * r * (0.12 + index * 0.13),
      y: boss.y + r * 0.48,
    }

    const length = r * (1.05 + (3 - index) * 0.13)
    const phase = time * 1.4 + i * 1.15

    const wave = Math.sin(phase) * r * 0.24
    const wave2 = Math.sin(phase * 0.7 + 1) * r * 0.12

    const end: Point = {
      x: base.x + side * r * (0.25 + index * 0.1) + wave,
      y: base.y + length,
    }

    const control: Point = {
      x: base.x + side * r * 0.12 + wave2,
      y: base.y + length * 0.55,
    }

    drawTentacle(ctx, base, control, end, r)
  }
}

function drawAttackTentacles(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  extension: number,
  time: number,
) {
  const r = boss.radius

  for (let i = 0; i < 8; i++) {
    // Eight directions around the boss
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 8

    const baseRadius = r * 0.48
    const base: Point = {
      x: boss.x + Math.cos(angle) * baseRadius,
      y: boss.y + Math.sin(angle) * baseRadius,
    }

    const endRadius =
      r * 1.15 + (GRAB_RANGE - r * 1.15) * extension

    const wave = Math.sin(time * 2 + i) * r * 0.12

    const end: Point = {
      x: boss.x + Math.cos(angle) * endRadius,
      y: boss.y + Math.sin(angle) * endRadius,
    }

    const control: Point = {
      x:
        boss.x +
        Math.cos(angle) * (baseRadius + endRadius) * 0.5 -
        Math.sin(angle) * wave,
      y:
        boss.y +
        Math.sin(angle) * (baseRadius + endRadius) * 0.5 +
        Math.cos(angle) * wave,
    }

    drawTentacle(ctx, base, control, end, r, 1)
  }
}

function drawGrabRange(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  pulse: number,
  alpha: number,
) {
  ctx.save()

  ctx.globalAlpha = alpha

  // Outer range glow
  ctx.shadowColor = "#e879f9"
  ctx.shadowBlur = 24

  ctx.beginPath()
  ctx.arc(boss.x, boss.y, GRAB_RANGE * pulse, 0, Math.PI * 2)

  ctx.strokeStyle = "rgba(232, 121, 249, 0.75)"
  ctx.lineWidth = 3
  ctx.setLineDash([12, 10])
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.setLineDash([])

  // Inner subtle ring
  ctx.beginPath()
  ctx.arc(boss.x, boss.y, GRAB_RANGE * pulse, 0, Math.PI * 2)

  ctx.strokeStyle = "rgba(249, 168, 212, 0.3)"
  ctx.lineWidth = 9
  ctx.stroke()

  ctx.restore()
}

export function drawAlienOctopus(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
) {
  const r = boss.radius
  const time = bossTime / 300
  const pulse = 1 + Math.sin(time * 0.8) * 0.025

  const state = boss.octopusGrabState ?? "idle"
  const timer = boss.octopusGrabTimer ?? 0

  ctx.save()

  // AURA

  const aura = ctx.createRadialGradient(
    boss.x,
    boss.y,
    r * 0.3,
    boss.x,
    boss.y + r * 0.3,
    r * 1.8,
  )

  aura.addColorStop(0, "rgba(89, 28, 135, 0.54)")
  aura.addColorStop(0.6, "rgba(157, 23, 77, 0.47)")
  aura.addColorStop(1, "rgba(30, 5, 40, 0)")

  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(boss.x, boss.y, r * 1.8, 0, Math.PI * 2)
  ctx.fill()

  // TENTACLES + GRAB RANGE

  if (state === "idle") {
    drawIdleTentacles(ctx, boss, time)
  } else {
    let extension = 0

    if (state === "windup") {
      const t = Math.min(timer / WINDUP_DURATION, 1)
      extension = 0.15 + t * 0.5
    }

    if (state === "strike") {
      const t = Math.min(timer / STRIKE_DURATION, 1)
      extension = 0.65 + (1 - Math.pow(1 - t, 2)) * 0.35
    }

    if (state === "retract") {
      const t = Math.min(timer / RETRACT_DURATION, 1)
      extension = 1 - t * 0.85
    }

    const ringPulse =
      1 + Math.sin(time * 2.5) * 0.018

    const ringAlpha =
      state === "windup"
        ? 0.55 + Math.min(timer / WINDUP_DURATION, 1) * 0.4
        : state === "strike"
          ? 1
          : Math.max(0, 1 - timer / RETRACT_DURATION)

    drawGrabRange(
      ctx,
      boss,
      ringPulse,
      ringAlpha,
    )

    drawAttackTentacles(
      ctx,
      boss,
      extension,
      time,
    )
  }

  // HEAD SHADOW

  ctx.fillStyle = "rgba(12, 3, 25, 0.5)"
  ctx.beginPath()
  ctx.ellipse(
    boss.x,
    boss.y + r * 0.2,
    r * 0.92,
    r * 1.03,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  // MANTLE

  ctx.save()
  ctx.translate(boss.x, boss.y - r * 0.13)
  ctx.scale(0.88 * pulse, 1.04 * pulse)

  const headGrad = ctx.createRadialGradient(
    -r * 0.25,
    -r * 0.48,
    r * 0.08,
    0,
    0,
    r * 1.2,
  )

  headGrad.addColorStop(0, "#fbcfe8")
  headGrad.addColorStop(0.22, "#f472b6")
  headGrad.addColorStop(0.52, "#c02678")
  headGrad.addColorStop(0.78, "#831843")
  headGrad.addColorStop(1, "#310b40")

  ctx.fillStyle = "#310b40"
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.08)
  ctx.bezierCurveTo(
    r * 0.55, -r * 1.03,
    r * 0.94, -r * 0.55,
    r * 0.91, -r * 0.06,
  )
  ctx.bezierCurveTo(
    r * 0.91, r * 0.4,
    r * 0.54, r * 0.72,
    r * 0.26, r * 0.77,
  )
  ctx.lineTo(-r * 0.26, r * 0.77)
  ctx.bezierCurveTo(
    -r * 0.54, r * 0.72,
    -r * 0.91, r * 0.4,
    -r * 0.91, -r * 0.06,
  )
  ctx.bezierCurveTo(
    -r * 0.94, -r * 0.55,
    -r * 0.55, -r * 1.03,
    0, -r * 1.08,
  )
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = headGrad
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.02)
  ctx.bezierCurveTo(
    r * 0.5, -r * 0.99,
    r * 0.84, -r * 0.53,
    r * 0.82, -r * 0.1,
  )
  ctx.bezierCurveTo(
    r * 0.82, r * 0.35,
    r * 0.48, r * 0.66,
    r * 0.23, r * 0.69,
  )
  ctx.lineTo(-r * 0.23, r * 0.69)
  ctx.bezierCurveTo(
    -r * 0.48, r * 0.66,
    -r * 0.82, r * 0.35,
    -r * 0.82, -r * 0.1,
  )
  ctx.bezierCurveTo(
    -r * 0.84, -r * 0.53,
    -r * 0.5, -r * 0.99,
    0, -r * 1.02,
  )
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "#5b123e"
  ctx.lineWidth = r * 0.035
  ctx.stroke()

  // Crown ridge
  ctx.strokeStyle = "rgba(255, 210, 240, 0.55)"
  ctx.lineWidth = r * 0.025
  ctx.beginPath()
  ctx.moveTo(-r * 0.32, -r * 0.66)
  ctx.quadraticCurveTo(0, -r * 0.91, r * 0.32, -r * 0.66)
  ctx.stroke()

  // Skin markings
  for (let i = 0; i < 6; i++) {
    const a = i * 2.399
    const dist = r * (0.22 + (i % 4) * 0.105)
    const x = Math.cos(a) * dist * 0.76
    const y = Math.sin(a) * dist * 0.76 - r * 0.12

    ctx.fillStyle =
      i % 3 === 0
        ? "rgba(255, 190, 230, 0.65)"
        : "rgba(75, 8, 54, 0.35)"

    ctx.beginPath()
    ctx.ellipse(
      x,
      y,
      r * 0.035,
      r * 0.052,
      a,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  ctx.restore()

  // EYES

  for (const side of [-1, 1]) {
    const ex = boss.x + side * r * 0.4
    const ey = boss.y - r * 0.2

    const socketGrad = ctx.createRadialGradient(
      ex - side * r * 0.04,
      ey - r * 0.06,
      r * 0.02,
      ex,
      ey,
      r * 0.31,
    )

    socketGrad.addColorStop(0, "#fbcfe8")
    socketGrad.addColorStop(0.7, "#be185d")
    socketGrad.addColorStop(1, "#500b40")

    ctx.fillStyle = socketGrad
    ctx.beginPath()
    ctx.ellipse(
      ex,
      ey,
      r * 0.3,
      r * 0.34,
      side * 0.12,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.strokeStyle = "#4a103d"
    ctx.lineWidth = r * 0.045
    ctx.stroke()

    ctx.fillStyle = "#17051f"
    ctx.beginPath()
    ctx.ellipse(
      ex,
      ey,
      r * 0.225,
      r * 0.245,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.save()
    ctx.shadowColor = "#facc15"
    ctx.shadowBlur = r * (0.18 + Math.sin(time * 2) * 0.025)

    const iris = ctx.createRadialGradient(
      ex - r * 0.035,
      ey - r * 0.045,
      r * 0.01,
      ex,
      ey,
      r * 0.19,
    )

    iris.addColorStop(0, "#fff7ae")
    iris.addColorStop(0.35, "#facc15")
    iris.addColorStop(0.75, "#ca8a04")
    iris.addColorStop(1, "#713f12")

    ctx.fillStyle = iris
    ctx.beginPath()
    ctx.arc(ex, ey, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = "#16051b"
    ctx.beginPath()
    ctx.ellipse(
      ex,
      ey,
      r * 0.038,
      r * 0.135,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(
      ex - side * r * 0.065,
      ey - r * 0.075,
      r * 0.035,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  // BROWS

  for (const side of [-1, 1]) {
    ctx.lineCap = "round"

    ctx.strokeStyle = "#500b40"
    ctx.lineWidth = r * 0.12
    ctx.beginPath()
    ctx.moveTo(
      boss.x + side * r * 0.12,
      boss.y - r * 0.51,
    )
    ctx.quadraticCurveTo(
      boss.x + side * r * 0.38,
      boss.y - r * 0.63,
      boss.x + side * r * 0.65,
      boss.y - r * 0.43,
    )
    ctx.stroke()

    ctx.strokeStyle = "#f9a8d4"
    ctx.lineWidth = r * 0.023
    ctx.beginPath()
    ctx.moveTo(
      boss.x + side * r * 0.2,
      boss.y - r * 0.51,
    )
    ctx.quadraticCurveTo(
      boss.x + side * r * 0.42,
      boss.y - r * 0.57,
      boss.x + side * r * 0.58,
      boss.y - r * 0.44,
    )
    ctx.stroke()
  }

  ctx.lineCap = "butt"

  // BEAK

  const beakY = boss.y + r * 0.29

  const beakGrad = ctx.createLinearGradient(
    boss.x - r * 0.12,
    beakY,
    boss.x + r * 0.12,
    beakY + r * 0.35,
  )

  beakGrad.addColorStop(0, "#a78bfa")
  beakGrad.addColorStop(0.35, "#3b0764")
  beakGrad.addColorStop(1, "#10051b")

  ctx.fillStyle = "#26082e"
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.21, beakY)
  ctx.quadraticCurveTo(
    boss.x,
    beakY - r * 0.07,
    boss.x + r * 0.21,
    beakY,
  )
  ctx.lineTo(boss.x + r * 0.06, beakY + r * 0.25)
  ctx.lineTo(boss.x, beakY + r * 0.34)
  ctx.lineTo(boss.x - r * 0.06, beakY + r * 0.25)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = beakGrad
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.15, beakY + r * 0.015)
  ctx.lineTo(boss.x, beakY + r * 0.09)
  ctx.lineTo(boss.x + r * 0.15, beakY + r * 0.015)
  ctx.lineTo(boss.x + r * 0.045, beakY + r * 0.24)
  ctx.lineTo(boss.x, beakY + r * 0.29)
  ctx.lineTo(boss.x - r * 0.045, beakY + r * 0.24)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "#d8b4fe"
  ctx.lineWidth = r * 0.018
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.1, beakY + r * 0.04)
  ctx.lineTo(boss.x, beakY + r * 0.12)
  ctx.stroke()

  // GLOWING CROWN NODES

  for (let i = -2; i <= 2; i++) {
    const x = boss.x + i * r * 0.22
    const y = boss.y - r * (0.91 - Math.abs(i) * 0.06)
    const nodeR = r * (i === 0 ? 0.065 : 0.043)

    ctx.save()
    ctx.shadowColor = "#f0abfc"
    ctx.shadowBlur = r * 0.12
    ctx.fillStyle = i === 0 ? "#ffffff" : "#f0abfc"

    ctx.beginPath()
    ctx.arc(x, y, nodeR, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  ctx.restore()
}