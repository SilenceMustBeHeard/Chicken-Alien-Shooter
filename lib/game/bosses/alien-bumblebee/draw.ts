
import type { Boss, Player } from "@/lib/game/types"

export function drawAlienBumblebee(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
) {
  const t = bossTime
  const r = boss.radius

  // ATTACK STATE 
  const beeState = String(boss.attackState ?? "patrol")
  const attackTimer = boss.attackTimer ?? 0
  const isWindingUp = beeState === "windup"
  const isDashing = beeState === "dash"

  // HP-BASED COLOR 
  const hpPercent = boss.health / boss.maxHealth
  const isLowHP = hpPercent < 0.5
  const isCriticalHP = hpPercent < 0.25

  // ANIMATIONS 
  const wingFlapSpeed = isWindingUp ? 8 : 24
  const wingFlap = Math.sin(t / wingFlapSpeed)
  const bodyBob = Math.sin(t / 220) * r * 0.025
  const legTwitch = Math.sin(t / 75) * r * 0.025
  const cx = boss.x
  const cy = boss.y + bodyBob

  // Blink animation
  const blinkCycle = t % 3500
  const isBlinking = blinkCycle > 3350

  // DASH TRAIL 
  if (isDashing) {
    ctx.save()
    for (let i = 0; i < 5; i++) {
      const trailOffset = i * r * 0.4
      const tx = cx - (boss.dashDirX || 0) * trailOffset
      const ty = cy - (boss.dashDirY || 0) * trailOffset

      ctx.fillStyle = `rgba(250, 204, 21, ${0.5 - i * 0.1})`
      ctx.beginPath()
      ctx.arc(tx, ty, r * (0.35 - i * 0.06), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Sparks
    ctx.save()
    for (let i = 0; i < 8; i++) {
      const sparkAngle = (i / 8) * Math.PI * 2 + t / 100
      const sparkDist = r * (0.5 + Math.sin(t / 50 + i) * 0.5)
      const sx = cx + Math.cos(sparkAngle) * sparkDist
      const sy = cy + Math.sin(sparkAngle) * sparkDist

      ctx.fillStyle = "#facc15"
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(sx, sy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // WINDUP WARNING 
  if (isWindingUp) {
    const progress = Math.min(attackTimer / 400, 1)

    ctx.save()
    ctx.globalAlpha = 0.4 + progress * 0.5
    ctx.strokeStyle = "#facc15"
    ctx.lineWidth = 4
    ctx.setLineDash([12, 8])
    ctx.lineDashOffset = -t / 20
    ctx.beginPath()
    ctx.arc(cx, cy, r * (1.2 + progress * 0.6), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Direction arrow
    const arrowLength = r * (1.5 + progress * 0.8)
    ctx.globalAlpha = 0.7 + progress * 0.3
    ctx.strokeStyle = "#fef08a"
    ctx.lineWidth = 6
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(
      cx + (boss.dashDirX || 0) * arrowLength,
      cy + (boss.dashDirY || 0) * arrowLength,
    )
    ctx.stroke()
    ctx.lineCap = "butt"
    ctx.restore()
  }

  ctx.save()

  // WINGS 
  const drawWing = (side: number, outer: boolean) => {
    ctx.save()

    const wingX = cx + side * r * (outer ? 0.43 : 0.29)
    const wingY = cy - r * 0.36
    const wingLength = r * (outer ? 0.82 : 0.59)
    const wingHeight = r * (outer ? 0.34 : 0.25)
    const flap = wingFlap * (outer ? 0.25 : 0.19)

    ctx.translate(wingX, wingY)
    ctx.rotate(side * (outer ? 0.62 : 0.48) - side * flap)

    const wingAlpha = isWindingUp ? 0.7 : isDashing ? 0.6 : 1

    ctx.fillStyle = outer
      ? `rgba(186, 230, 253, ${0.48 * wingAlpha})`
      : `rgba(224, 242, 254, ${0.3 * wingAlpha})`

    ctx.beginPath()
    ctx.ellipse(
      side * wingLength * 0.35,
      -r * 0.04,
      wingLength,
      wingHeight,
      side * 0.12,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.strokeStyle = "rgba(147, 197, 253, 0.72)"
    ctx.lineWidth = Math.max(1, r * 0.012)
    ctx.stroke()

    ctx.strokeStyle = "rgba(96, 165, 250, 0.58)"
    ctx.lineWidth = Math.max(0.8, r * 0.009)

    for (let i = 0; i < 3; i++) {
      const startX = side * wingLength * 0.08
      const endX = side * wingLength * (0.38 + i * 0.22)

      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.quadraticCurveTo(
        endX * 0.45,
        -wingHeight * 0.9,
        endX,
        wingHeight * (i - 1) * 0.48,
      )
      ctx.stroke()
    }

    ctx.restore()
  }

  drawWing(-1, false)
  drawWing(1, false)
  drawWing(-1, true)
  drawWing(1, true)

  //  SEGMENTED LEGS 
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  for (let i = 0; i < 3; i++) {
    const legY = cy + r * (0.2 + i * 0.19)
    const spread = r * (0.66 + i * 0.12)
    const twitch = legTwitch * (i + 1) * 0.45

    for (const side of [-1, 1]) {
      ctx.strokeStyle = "#38200b"
      ctx.lineWidth = Math.max(2, r * 0.055)

      ctx.beginPath()
      ctx.moveTo(cx + side * r * 0.43, legY)
      ctx.quadraticCurveTo(
        cx + side * r * 0.65,
        legY + r * 0.08,
        cx + side * spread + twitch,
        legY + r * 0.25,
      )
      ctx.lineTo(
        cx + side * (spread + r * 0.09) + twitch,
        legY + r * 0.39,
      )
      ctx.stroke()

      ctx.fillStyle = "#d6a329"
      ctx.beginPath()
      ctx.arc(
        cx + side * spread + twitch,
        legY + r * 0.25,
        r * 0.035,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  ctx.lineCap = "butt"

  // STINGER 
  const stingerY = cy + r * 0.69

  ctx.fillStyle = "#38200b"
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.105, stingerY)
  ctx.quadraticCurveTo(cx, stingerY + r * 0.04, cx + r * 0.105, stingerY)
  ctx.lineTo(cx, stingerY + r * 0.55)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = "#a16207"
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.035, stingerY + r * 0.1)
  ctx.lineTo(cx, stingerY + r * 0.48)
  ctx.lineTo(cx + r * 0.035, stingerY + r * 0.1)
  ctx.closePath()
  ctx.fill()

  const dropOffset = (t / 100) % 14
  ctx.fillStyle = "#84cc16"
  ctx.beginPath()
  ctx.arc(cx, stingerY + r * 0.55 + dropOffset, r * 0.035, 0, Math.PI * 2)
  ctx.fill()

  // ABDOMEN 
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)"
  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.89, r * 0.73, r * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  const bodyGrad = ctx.createRadialGradient(
    cx - r * 0.32,
    cy - r * 0.35,
    r * 0.08,
    cx,
    cy,
    r * 1.12,
  )

  bodyGrad.addColorStop(0, isCriticalHP ? "#ff9999" : isLowHP ? "#ffcc66" : "#fff9cf")
  bodyGrad.addColorStop(0.35, isCriticalHP ? "#ff3333" : isLowHP ? "#ff9900" : "#facc15")
  bodyGrad.addColorStop(0.75, isCriticalHP ? "#990000" : isLowHP ? "#cc6600" : "#eab308")
  bodyGrad.addColorStop(1, isCriticalHP ? "#450000" : isLowHP ? "#663300" : "#92400e")

  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.91, r * 0.73, 0, 0, Math.PI * 2)
  ctx.fill()

  // Black bands
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.91, r * 0.73, 0, 0, Math.PI * 2)
  ctx.clip()

  ctx.fillStyle = "#1a120a"
  for (let i = -1; i <= 1; i++) {
    const stripeY = cy + i * r * 0.32
    ctx.beginPath()
    ctx.ellipse(cx, stripeY, r * 1.0, r * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.strokeStyle = "#8a5b16"
  ctx.lineWidth = Math.max(1.5, r * 0.025)
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.91, r * 0.73, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = "rgba(255, 255, 210, 0.32)"
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.31, cy - r * 0.3, r * 0.29, r * 0.17, -0.4, 0, Math.PI * 2)
  ctx.fill()

  // HEAD 
  const headY = cy - r * 0.7
  const headR = r * 0.48

  const headGrad = ctx.createRadialGradient(
    cx - headR * 0.32,
    headY - headR * 0.38,
    headR * 0.04,
    cx,
    headY,
    headR * 1.2,
  )

  headGrad.addColorStop(0, "#4b4538")
  headGrad.addColorStop(0.55, "#24211d")
  headGrad.addColorStop(1, "#090909")

  ctx.fillStyle = headGrad
  ctx.beginPath()
  ctx.arc(cx, headY, headR, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "#100d0a"
  ctx.lineWidth = Math.max(1.5, r * 0.025)
  ctx.stroke()

  // Fuzz
  ctx.strokeStyle = "rgba(220, 190, 125, 0.48)"
  ctx.lineWidth = Math.max(0.8, r * 0.009)

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const x = cx + Math.cos(a) * headR * 0.93
    const y = headY + Math.sin(a) * headR * 0.93

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * r * 0.045, y + Math.sin(a) * r * 0.045)
    ctx.stroke()
  }

  // COMPOUND EYES 
  for (const side of [-1, 1]) {
    const eyeX = cx + side * r * 0.255
    const eyeY = headY - r * 0.015
    const eyeRX = r * 0.17
    const eyeRY = r * 0.205

    if (isBlinking) {
      ctx.strokeStyle = "#0a0000"
      ctx.lineWidth = r * 0.05
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(eyeX - r * 0.15, eyeY)
      ctx.lineTo(eyeX + r * 0.15, eyeY)
      ctx.stroke()
      ctx.lineCap = "butt"
      continue
    }

    const eyeGrad = ctx.createRadialGradient(
      eyeX - eyeRX * 0.35,
      eyeY - eyeRY * 0.38,
      r * 0.01,
      eyeX,
      eyeY,
      eyeRY * 1.3,
    )

    eyeGrad.addColorStop(0, "#ff9999")
    eyeGrad.addColorStop(0.32, "#ef4444")
    eyeGrad.addColorStop(0.72, "#b91c1c")
    eyeGrad.addColorStop(1, "#450a0a")

    ctx.save()
    ctx.shadowColor = "#ff2222"
    ctx.shadowBlur = isWindingUp ? r * 0.25 : isDashing ? r * 0.2 : r * 0.12

    ctx.fillStyle = eyeGrad
    ctx.beginPath()
    ctx.ellipse(eyeX, eyeY, eyeRX, eyeRY, side * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = "#450a0a"
    ctx.lineWidth = Math.max(1, r * 0.018)
    ctx.stroke()

    // Facets
    ctx.strokeStyle = "rgba(255, 220, 220, 0.55)"
    ctx.lineWidth = Math.max(0.7, r * 0.008)

    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.arc(eyeX + i * eyeRX * 0.45, eyeY, r * 0.025, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Reflection
    ctx.fillStyle = "#fff1f2"
    ctx.beginPath()
    ctx.arc(eyeX - side * r * 0.045, eyeY - r * 0.075, r * 0.028, 0, Math.PI * 2)
    ctx.fill()
  }

  // MANDIBLES 
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#342016"
    ctx.strokeStyle = "#0c0805"
    ctx.lineWidth = Math.max(0.8, r * 0.012)

    ctx.beginPath()
    ctx.moveTo(cx + side * r * 0.08, headY + r * 0.35)
    ctx.lineTo(cx + side * r * 0.14, headY + r * 0.42)
    ctx.lineTo(cx + side * r * 0.1, headY + r * 0.44)
    ctx.lineTo(cx + side * r * 0.06, headY + r * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // ANTENNAE 
  const antTwitch = Math.sin(t / 150) * r * 0.035

  ctx.strokeStyle = "#21170f"
  ctx.lineWidth = Math.max(2, r * 0.045)
  ctx.lineCap = "round"

  for (const side of [-1, 1]) {
    const startX = cx + side * r * 0.19
    const startY = headY - headR * 0.72
    const tipX = cx + side * r * 0.48 + antTwitch * side
    const tipY = headY - r * 0.95

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(
      cx + side * r * 0.35,
      headY - r * 0.78,
      tipX,
      tipY,
    )
    ctx.stroke()

    ctx.fillStyle = "#facc15"
    ctx.beginPath()
    ctx.arc(tipX, tipY, r * 0.075, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#a16207"
    ctx.lineWidth = Math.max(1, r * 0.018)
    ctx.stroke()

    ctx.strokeStyle = "#21170f"
    ctx.lineWidth = Math.max(2, r * 0.045)
  }

  ctx.lineCap = "butt"
  ctx.restore()
}