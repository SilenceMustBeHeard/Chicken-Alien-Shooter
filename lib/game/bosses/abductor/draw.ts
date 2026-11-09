import type { Boss, Player } from "@/lib/game/types"

const FIELD_RADIUS = 380

export function drawAbductor(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  player?: Player,
): void {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y

  const hover = Math.sin(t / 400) * 6
  const lightRotation = t / 500
  const beamPulse = 0.6 + Math.sin(t / 200) * 0.2
  const fieldPulse = 0.5 + Math.sin(t / 250) * 0.15

  ctx.save()
  ctx.translate(bx, by + hover)

  // FORCE FIELD - OUTER ENERGY DOME

  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const fieldGrad = ctx.createRadialGradient(
    0, 0, r * 0.5,
    0, 0, FIELD_RADIUS,
  )

  fieldGrad.addColorStop(0, "rgba(0, 255, 220, 0.01)")
  fieldGrad.addColorStop(0.45, `rgba(0, 255, 220, ${fieldPulse * 0.035})`)
  fieldGrad.addColorStop(0.8, `rgba(0, 255, 220, ${fieldPulse * 0.09})`)
  fieldGrad.addColorStop(1, "rgba(0, 255, 220, 0)")

  ctx.fillStyle = fieldGrad
  ctx.beginPath()
  ctx.arc(0, 0, FIELD_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // Energy boundary
  ctx.strokeStyle = `rgba(0, 255, 220, ${fieldPulse * 0.45})`
  ctx.lineWidth = 2
  ctx.setLineDash([12, 14])
  ctx.lineDashOffset = -t / 25
  ctx.beginPath()
  ctx.arc(0, 0, FIELD_RADIUS * 0.92, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Inner energy rings
  for (let i = 0; i < 3; i++) {
    const ringRadius =
      r * 1.5 + ((t / 8 + i * 100) % (FIELD_RADIUS * 0.8))

    const alpha = 0.22 * (1 - ringRadius / FIELD_RADIUS)

    if (alpha <= 0) continue

    ctx.strokeStyle = `rgba(80, 255, 230, ${alpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Pulling energy lines
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + t / 1200

    const outerX = Math.cos(angle) * FIELD_RADIUS * 0.88
    const outerY = Math.sin(angle) * FIELD_RADIUS * 0.88

    const innerX = Math.cos(angle) * r * 1.3
    const innerY = Math.sin(angle) * r * 1.3

    const progress = (t / 700 + i * 0.13) % 1

    const particleX =
      outerX + (innerX - outerX) * progress

    const particleY =
      outerY + (innerY - outerY) * progress

    ctx.strokeStyle = `rgba(0, 255, 220, ${0.12 + progress * 0.35})`
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.moveTo(outerX, outerY)
    ctx.lineTo(particleX, particleY)
    ctx.stroke()

    ctx.fillStyle = `rgba(180, 255, 245, ${0.3 + progress * 0.7})`
    ctx.beginPath()
    ctx.arc(particleX, particleY, 2 + progress * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Player being pulled - visual tether
  if (player) {
    const playerX = player.x - bx
    const playerY = player.y - (by + hover)
    const distance = Math.sqrt(playerX ** 2 + playerY ** 2)

    if (distance < FIELD_RADIUS && distance > 0) {
      const proximity = 1 - distance / FIELD_RADIUS

      ctx.strokeStyle = `rgba(0, 255, 220, ${0.12 + proximity * 0.35})`
      ctx.lineWidth = 1 + proximity * 2
      ctx.setLineDash([5, 9])
      ctx.lineDashOffset = -t / 20

      ctx.beginPath()
      ctx.moveTo(playerX, playerY)
      ctx.lineTo(0, 0)
      ctx.stroke()

      ctx.setLineDash([])

      // Energy glow around the player
      const playerGlow = ctx.createRadialGradient(
        playerX, playerY, 0,
        playerX, playerY, 35 + proximity * 20,
      )

      playerGlow.addColorStop(0, `rgba(0, 255, 220, ${0.12 + proximity * 0.18})`)
      playerGlow.addColorStop(1, "rgba(0, 255, 220, 0)")

      ctx.fillStyle = playerGlow
      ctx.beginPath()
      ctx.arc(playerX, playerY, 55, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()

  // TRACTOR BEAM - DOWNWARD

  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const beamGrad = ctx.createLinearGradient(0, 0, 0, r * 4)
  beamGrad.addColorStop(0, `rgba(0, 255, 200, ${beamPulse * 0.7})`)
  beamGrad.addColorStop(0.4, `rgba(0, 255, 200, ${beamPulse * 0.35})`)
  beamGrad.addColorStop(1, "rgba(0, 255, 200, 0.39)")

  ctx.fillStyle = beamGrad
  ctx.beginPath()
  ctx.moveTo(-r * 0.5, r * 0.3)
  ctx.lineTo(-r * 2, r * 4)
  ctx.lineTo(r * 2, r * 4)
  ctx.lineTo(r * 0.5, r * 0.3)
  ctx.closePath()
  ctx.fill()

  // Moving beam rings
  const ringOffset = (t / 30) % (r * 3.5)

  for (let i = 0; i < 3; i++) {
    const ringY = r * 0.5 + ringOffset + i * r * 1.2

    if (ringY > r * 3.5) continue

    const ringWidth = r * (0.4 + (ringY / (r * 4)) * 1.5)
    const ringAlpha = 0.6 - (ringY / (r * 4)) * 0.5

    ctx.strokeStyle = `rgba(120, 255, 220, ${ringAlpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, ringY, ringWidth, ringWidth * 0.15, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()

  // UFO SHADOW

  ctx.fillStyle = "rgba(16, 16, 16, 0.35)"
  ctx.beginPath()
  ctx.ellipse(0, r * 1.1, r * 1.1, r * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()

  // UFO BOTTOM HULL

  const hullGrad = ctx.createLinearGradient(0, -r * 0.2, 0, r * 0.6)
  hullGrad.addColorStop(0, "#94a3b8")
  hullGrad.addColorStop(0.4, "#64748b")
  hullGrad.addColorStop(0.8, "#334155")
  hullGrad.addColorStop(1, "#1e293b")

  ctx.fillStyle = hullGrad
  ctx.beginPath()
  ctx.ellipse(0, r * 0.25, r * 1.3, r * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "#0f172a"
  ctx.lineWidth = r * 0.04
  ctx.stroke()

  // Bottom rim
  ctx.fillStyle = "#0f172a"
  ctx.beginPath()
  ctx.ellipse(0, r * 0.35, r * 1.25, r * 0.45, 0, 0, Math.PI)
  ctx.fill()

  // Bottom panels
  ctx.strokeStyle = "#1e293b"
  ctx.lineWidth = r * 0.02

  for (let i = 1; i <= 2; i++) {
    ctx.beginPath()
    ctx.ellipse(
      0,
      r * (0.3 + i * 0.1),
      r * (1.15 - i * 0.08),
      r * (0.35 - i * 0.05),
      0,
      0,
      Math.PI,
    )
    ctx.stroke()
  }

  // UFO MIDDLE RIM

  ctx.fillStyle = "#475569"
  ctx.beginPath()
  ctx.ellipse(0, r * 0.05, r * 1.35, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "#0f172a"
  ctx.lineWidth = r * 0.03
  ctx.stroke()

  // Rotating lights
  for (let i = 0; i < 10; i++) {
    const angle = lightRotation + (i / 10) * Math.PI * 2

    const lightX = Math.cos(angle) * r * 1.2
    const lightY = Math.sin(angle) * r * 0.22 + r * 0.05

    const colorIndex = Math.floor((lightRotation * 2 + i) % 3)

    let lightColor = "#00ffff"

    if (colorIndex === 1) {
      lightColor = "#ff00ff"
    } else if (colorIndex === 2) {
      lightColor = "#ffff00"
    }

    const isVisible = Math.sin(angle) > -0.5

    if (isVisible) {
      ctx.shadowBlur = 12
      ctx.shadowColor = lightColor
      ctx.fillStyle = lightColor

      ctx.beginPath()
      ctx.arc(lightX, lightY, r * 0.08, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(
        lightX - r * 0.02,
        lightY - r * 0.02,
        r * 0.03,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  // UFO DOME

  const domeGrad = ctx.createLinearGradient(0, -r * 0.9, 0, r * 0.1)
  domeGrad.addColorStop(0, "rgba(186, 230, 253, 0.85)")
  domeGrad.addColorStop(0.5, "rgba(125, 211, 252, 0.6)")
  domeGrad.addColorStop(1, "rgba(56, 189, 248, 0.4)")

  ctx.fillStyle = domeGrad
  ctx.beginPath()
  ctx.ellipse(0, -r * 0.15, r * 0.85, r * 0.7, 0, Math.PI, 0)
  ctx.fill()

  ctx.strokeStyle = "rgba(14, 165, 233, 0.8)"
  ctx.lineWidth = r * 0.03
  ctx.stroke()

  // Dome shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
  ctx.beginPath()
  ctx.ellipse(-r * 0.35, -r * 0.55, r * 0.25, r * 0.15, -0.4, 0, Math.PI * 2)
  ctx.fill()

  // ALIEN PILOTS

  for (const pilotOffset of [-r * 0.3, r * 0.3]) {
    // Body
    ctx.fillStyle = "#22c55e"
    ctx.beginPath()
    ctx.ellipse(pilotOffset, -r * 0.2, r * 0.12, r * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.fillStyle = "#4ade80"
    ctx.beginPath()
    ctx.arc(pilotOffset, -r * 0.4, r * 0.13, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.fillStyle = "#000000"

    ctx.beginPath()
    ctx.ellipse(pilotOffset - r * 0.05, -r * 0.4, r * 0.04, r * 0.06, -0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(pilotOffset + r * 0.05, -r * 0.4, r * 0.04, r * 0.06, 0.3, 0, Math.PI * 2)
    ctx.fill()

    // Eye shine
    ctx.fillStyle = "#ffffff"

    ctx.beginPath()
    ctx.arc(pilotOffset - r * 0.06, -r * 0.42, r * 0.015, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(pilotOffset + r * 0.04, -r * 0.42, r * 0.015, 0, Math.PI * 2)
    ctx.fill()
  }

  // ANTENNA

  ctx.strokeStyle = "#94a3b8"
  ctx.lineWidth = r * 0.04
  ctx.lineCap = "round"

  ctx.beginPath()
  ctx.moveTo(0, -r * 0.85)
  ctx.lineTo(0, -r * 1.2)
  ctx.stroke()

  ctx.lineCap = "butt"

  // Blinking antenna light
  const antennaBlink = Math.sin(t / 200) > 0 ? 1 : 0.4

  ctx.fillStyle = `rgba(255, 50, 50, ${antennaBlink})`
  ctx.shadowBlur = 15
  ctx.shadowColor = "#ff0000"

  ctx.beginPath()
  ctx.arc(0, -r * 1.25, r * 0.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowBlur = 0

  
  // ENGINE GLOW

  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const engineGrad = ctx.createRadialGradient(
    0, r * 0.6, 0,
    0, r * 0.6, r * 0.7,
  )

  engineGrad.addColorStop(0, "rgba(100, 200, 255, 0.9)")
  engineGrad.addColorStop(0.5, "rgba(100, 200, 255, 0.4)")
  engineGrad.addColorStop(1, "rgba(100, 200, 255, 0)")

  ctx.fillStyle = engineGrad
  ctx.beginPath()
  ctx.ellipse(0, r * 0.65, r * 0.5, r * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
  ctx.restore()
}