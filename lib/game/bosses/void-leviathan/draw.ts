
import type { Boss, Player } from "@/lib/game/types"

type LeviathanPoint = { x: number; y: number }

export function drawVoidLeviathan(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
) {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y

  const phase = boss.leviathanPhase ?? "forceField"
  const heading = boss.leviathanHeading ?? 0

  const isForceField = phase === "forceField"
  const isZigzag = phase === "zigzag"
  const isUroboros = phase === "uroboros"

  const hpPercent = boss.health / boss.maxHealth
  const isLowHP = hpPercent < 0.5
  const pulse = 0.5 + Math.sin(t / 150) * 0.5

  // AURA 
  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const auraRadius = isUroboros ? 300 : r * 2.5
  const aura = ctx.createRadialGradient(
    bx, by, r * 0.2,
    bx, by, auraRadius,
  )

  if (isUroboros) {
    aura.addColorStop(0, "rgba(168, 85, 247, 0.45)")
    aura.addColorStop(0.5, "rgba(126, 34, 206, 0.30)")
    aura.addColorStop(0.85, "rgba(88, 28, 135, 0.15)")
    aura.addColorStop(1, "rgba(88, 28, 135, 0)")
  } else {
    aura.addColorStop(
      0,
      isLowHP ? "rgba(217,70,239,0.30)" : "rgba(126,34,206,0.24)",
    )
    aura.addColorStop(0.55, "rgba(126,34,206,0.13)")
    aura.addColorStop(1, "rgba(88,28,135,0)")
  }

  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(bx, by, auraRadius, 0, Math.PI * 2)
  ctx.fill()

  // Pulsing border for heal aura
  if (isUroboros) {
    ctx.strokeStyle = `rgba(232, 121, 249, ${0.7 + pulse * 0.3})`
    ctx.lineWidth = 6
    ctx.setLineDash([25, 20])
    ctx.lineDashOffset = -t / 25
    ctx.beginPath()
    ctx.arc(bx, by, auraRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = `rgba(255, 200, 255, ${0.4 + pulse * 0.3})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(bx, by, auraRadius * 0.9, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // FORCE FIELD 
  if (isForceField) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const shieldR = r * 2.0
    const shieldGrad = ctx.createRadialGradient(
      bx, by, r * 0.6,
      bx, by, shieldR,
    )

    shieldGrad.addColorStop(0, "rgba(96,165,250,0.03)")
    shieldGrad.addColorStop(0.65, `rgba(96,165,250,${0.12 + pulse * 0.08})`)
    shieldGrad.addColorStop(1, "rgba(59,130,246,0.01)")

    ctx.fillStyle = shieldGrad
    ctx.beginPath()
    ctx.arc(bx, by, shieldR, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(147,197,253,${0.45 + pulse * 0.4})`
    ctx.lineWidth = 2
    ctx.shadowColor = "#60a5fa"
    ctx.shadowBlur = 18

    // Rotating shield arcs
    for (let i = 0; i < 3; i++) {
      const arcR = shieldR * (0.76 + i * 0.1)
      const start = t / (700 + i * 250) + i * 2.1

      ctx.beginPath()
      ctx.arc(bx, by, arcR, start, start + Math.PI * 1.2)
      ctx.stroke()
    }

    // Hexagonal energy cells
    ctx.shadowBlur = 0
    ctx.lineWidth = 1

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t / 1800
      const hx = bx + Math.cos(a) * shieldR * 0.82
      const hy = by + Math.sin(a) * shieldR * 0.82
      const hexR = r * 0.22

      ctx.beginPath()
      for (let j = 0; j <= 6; j++) {
        const ha = (j / 6) * Math.PI * 2
        const x = hx + Math.cos(ha) * hexR
        const y = hy + Math.sin(ha) * hexR

        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    ctx.restore()
  }

  // BODY
  const segmentCount = 24
  const bodyPoints: LeviathanPoint[] = []

  if (isUroboros) {
    const ringR = r * 2.0
    const startAngle = -Math.PI / 2 + Math.sin(t / 700) * 0.08

    for (let i = 0; i < segmentCount; i++) {
      const a = startAngle + (i / (segmentCount - 1)) * Math.PI * 2

      bodyPoints.push({
        x: Math.cos(a) * ringR,
        y: Math.sin(a) * ringR,
      })
    }
  } else {
    const bodyLength = r * 9.2
    const travelPhase = t / 180

    for (let i = 0; i < segmentCount; i++) {
      const u = i / (segmentCount - 1)
      const x = -u * bodyLength

      const primaryWave =
        Math.sin(u * Math.PI * 3.2 - travelPhase) *
        r * (0.5 + u * 1.2)

      const secondaryWave =
        Math.sin(u * Math.PI * 6.4 + travelPhase * 1.5) *
        r * u * 0.6

      const tertiaryWave =
        Math.cos(u * Math.PI * 1.6 - travelPhase * 0.7) *
        r * u * 0.3

      const zigzagSwing = isZigzag
        ? Math.sin(u * Math.PI * 2 - t / 150) * r * u * 1.8
        : 0

      bodyPoints.push({
        x,
        y: primaryWave + secondaryWave + tertiaryWave + zigzagSwing,
      })
    }
  }

  // SEGMENTS FROM TAIL TO HEAD 
  ctx.save()
  ctx.translate(bx, by)

  if (!isUroboros) {
    ctx.rotate(heading)
  }

  for (let i = segmentCount - 1; i >= 0; i--) {
    const p = bodyPoints[i]
    const u = i / (segmentCount - 1)

    const segmentR = r * (0.11 + (1 - u) * 0.39)

    const prev = bodyPoints[Math.max(0, i - 1)]
    const next = bodyPoints[Math.min(segmentCount - 1, i + 1)]
    const angle = Math.atan2(next.y - prev.y, next.x - prev.x)

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(angle)

    const bodyGrad = ctx.createLinearGradient(
      0, -segmentR,
      0, segmentR,
    )
    bodyGrad.addColorStop(0, "#c4b5fd")
    bodyGrad.addColorStop(0.22, "#7c3aed")
    bodyGrad.addColorStop(0.58, "#3b176b")
    bodyGrad.addColorStop(0.84, "#170c30")
    bodyGrad.addColorStop(1, "#090516")

    ctx.shadowColor = isForceField ? "#60a5fa" : "#a855f7"
    ctx.shadowBlur = isZigzag ? 15 : 8
    ctx.fillStyle = bodyGrad
    ctx.strokeStyle = isForceField ? "#60a5fa" : "#6d28d9"
    ctx.lineWidth = Math.max(1, segmentR * 0.12)

    ctx.beginPath()
    ctx.ellipse(
      0, 0,
      segmentR * 1.35,
      segmentR,
      0, 0, Math.PI * 2,
    )
    ctx.fill()
    ctx.stroke()

    // Bright dorsal armor ridge
    ctx.shadowBlur = 5
    ctx.strokeStyle = "#d8b4fe"
    ctx.lineWidth = Math.max(1, segmentR * 0.1)

    ctx.beginPath()
    ctx.moveTo(-segmentR * 0.65, -segmentR * 0.15)
    ctx.lineTo(-segmentR * 0.1, -segmentR * 0.62)
    ctx.lineTo(segmentR * 0.55, -segmentR * 0.12)
    ctx.stroke()

    // Backward-pointing spine
    if (i % 2 === 0 && i > 1) {
      ctx.fillStyle = isForceField ? "#93c5fd" : "#c084fc"
      ctx.beginPath()
      ctx.moveTo(-segmentR * 0.5, -segmentR * 0.45)
      ctx.lineTo(-segmentR * 0.95, -segmentR * 1.05)
      ctx.lineTo(segmentR * 0.05, -segmentR * 0.52)
      ctx.closePath()
      ctx.fill()
    }

    // Glowing side plate
    ctx.strokeStyle = "rgba(232,121,249,0.65)"
    ctx.lineWidth = Math.max(1, segmentR * 0.07)
    ctx.beginPath()
    ctx.moveTo(-segmentR * 0.35, segmentR * 0.48)
    ctx.lineTo(segmentR * 0.35, segmentR * 0.48)
    ctx.stroke()

    ctx.restore()
  }

  // FORKED TAIL 
  const tail = bodyPoints[segmentCount - 1]
  const tailPrev = bodyPoints[segmentCount - 2]
  const tailAngle = Math.atan2(
    tail.y - tailPrev.y,
    tail.x - tailPrev.x,
  )

  ctx.save()
  ctx.translate(tail.x, tail.y)
  ctx.rotate(tailAngle)

  ctx.strokeStyle = "#7e22ce"
  ctx.lineWidth = Math.max(2, r * 0.09)
  ctx.lineCap = "round"
  ctx.shadowColor = "#c084fc"
  ctx.shadowBlur = 12

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-r * 0.65, -r * 0.28)
  ctx.moveTo(0, 0)
  ctx.lineTo(-r * 0.65, r * 0.28)
  ctx.stroke()

  ctx.restore()

  ctx.restore()

  // HEAD
  ctx.save()

  let headX = bx
  let headY = by
  let headAngle = heading

  if (isUroboros) {
    const head = bodyPoints[0]
    const next = bodyPoints[1]

    headX = bx + head.x
    headY = by + head.y
    headAngle = Math.atan2(
      next.y - head.y,
      next.x - head.x,
    )
  }

  ctx.translate(headX, headY)
  ctx.rotate(headAngle)

  ctx.shadowColor = "#a855f7"
  ctx.shadowBlur = isZigzag ? 24 : 15

  const headGrad = ctx.createLinearGradient(
    -r, -r, r * 1.4, r,
  )
  headGrad.addColorStop(0, "#1e1038")
  headGrad.addColorStop(0.42, "#6d28d9")
  headGrad.addColorStop(0.75, "#c084fc")
  headGrad.addColorStop(1, "#3b0764")

  // Long angular skull
  ctx.fillStyle = headGrad
  ctx.strokeStyle = "#d8b4fe"
  ctx.lineWidth = Math.max(1.5, r * 0.055)

  ctx.beginPath()
  ctx.moveTo(r * 1.55, 0)
  ctx.lineTo(r * 0.72, -r * 0.58)
  ctx.lineTo(r * 0.15, -r * 0.76)
  ctx.lineTo(-r * 0.68, -r * 0.48)
  ctx.lineTo(-r * 0.88, 0)
  ctx.lineTo(-r * 0.68, r * 0.48)
  ctx.lineTo(r * 0.15, r * 0.76)
  ctx.lineTo(r * 0.72, r * 0.58)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Brow horns
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#581c87"
    ctx.beginPath()
    ctx.moveTo(r * 0.05, side * r * 0.48)
    ctx.lineTo(-r * 0.48, side * r * 1.05)
    ctx.lineTo(r * 0.48, side * r * 0.66)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = "#c084fc"
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // Two luminous eyes
  for (const side of [-1, 1]) {
    const ex = r * 0.52
    const ey = side * r * 0.29

    ctx.fillStyle = "#090516"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.2, r * 0.17, 0, 0, Math.PI * 2)
    ctx.fill()

    const eyeGrad = ctx.createRadialGradient(
      ex - r * 0.04, ey - r * 0.04, 0,
      ex, ey, r * 0.2,
    )
    eyeGrad.addColorStop(0, "#ffffff")
    eyeGrad.addColorStop(0.35, "#fef08a")
    eyeGrad.addColorStop(0.75, "#f59e0b")
    eyeGrad.addColorStop(1, "#7c2d12")

    ctx.fillStyle = eyeGrad
    ctx.shadowColor = "#facc15"
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.16, r * 0.13, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#1c071e"
    ctx.beginPath()
    ctx.ellipse(ex + r * 0.04, ey, r * 0.045, r * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.shadowBlur = 0

  // Narrow jaw with visible fangs
  ctx.fillStyle = "#10051e"
  ctx.strokeStyle = "#c084fc"
  ctx.lineWidth = 1.5

  ctx.beginPath()
  ctx.moveTo(r * 0.48, -r * 0.12)
  ctx.lineTo(r * 1.45, 0)
  ctx.lineTo(r * 0.48, r * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  for (let i = 0; i < 4; i++) {
    const tx = r * (0.62 + i * 0.17)

    ctx.fillStyle = "#f5d0fe"
    ctx.beginPath()
    ctx.moveTo(tx, -r * 0.08)
    ctx.lineTo(tx + r * 0.07, 0)
    ctx.lineTo(tx, r * 0.025)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(tx, r * 0.08)
    ctx.lineTo(tx + r * 0.07, 0)
    ctx.lineTo(tx, -r * 0.025)
    ctx.closePath()
    ctx.fill()
  }

  // Side fins behind the skull
  for (const side of [-1, 1]) {
    ctx.fillStyle = "rgba(126,34,206,0.7)"
    ctx.strokeStyle = "#a855f7"
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.moveTo(-r * 0.35, side * r * 0.36)
    ctx.quadraticCurveTo(
      -r * 0.7, side * r * 0.9,
      -r * 1.15, side * r * 0.82,
    )
    ctx.quadraticCurveTo(
      -r * 0.85, side * r * 0.35,
      -r * 0.35, side * r * 0.36,
    )
    ctx.fill()
    ctx.stroke()
  }

  // Zigzag dash trails
  if (isZigzag) {
    ctx.globalCompositeOperation = "lighter"

    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(192,132,252,${0.45 - i * 0.08})`
      ctx.lineWidth = 4 - i * 0.6

      ctx.beginPath()
      ctx.moveTo(-r * 0.75, (i - 1.5) * r * 0.2)
      ctx.lineTo(-r * (1.5 + i * 0.35), (i - 1.5) * r * 0.4)
      ctx.stroke()
    }
  }

  ctx.restore()

  // OUROBOROS CORE + RING ACCENTS
  if (isUroboros) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const corePulse = 0.6 + Math.sin(t / 110) * 0.25
    const coreR = r * 0.55

    const coreGrad = ctx.createRadialGradient(
      bx, by, 0,
      bx, by, coreR * 2,
    )
    coreGrad.addColorStop(0, `rgba(255,220,255,${corePulse})`)
    coreGrad.addColorStop(0.35, "rgba(216,180,254,0.35)")
    coreGrad.addColorStop(1, "rgba(168,85,247,0)")

    ctx.fillStyle = coreGrad
    ctx.beginPath()
    ctx.arc(bx, by, coreR * 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(232,121,249,${0.5 + pulse * 0.4})`
    ctx.lineWidth = 3
    ctx.setLineDash([10, 12])
    ctx.lineDashOffset = -t / 24
    ctx.beginPath()
    ctx.arc(bx, by, r * 2.7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.restore()
  }

  // PHASE LABEL 
  ctx.save()
  ctx.textAlign = "center"
  ctx.font = "bold 14px Arial"

  if (isForceField) {
    ctx.fillStyle = "#93c5fd"
    ctx.shadowColor = "#3b82f6"
    ctx.shadowBlur = 12
    ctx.fillText("FORCE FIELD", bx, by - r * 2.35)
  } else if (isZigzag) {
    ctx.fillStyle = "#e9d5ff"
    ctx.shadowColor = "#a855f7"
    ctx.shadowBlur = 12
    ctx.fillText(
      `HUNT ${Math.min(4, boss.leviathanDashCount ?? 0)}/4`,
      bx, by - r * 1.65,
    )
  } else {
    ctx.fillStyle = "#e9d5ff"
    ctx.shadowColor = "#a855f7"
    ctx.shadowBlur = 12
    ctx.fillText("OUROBOROS", bx, by - r * 3.05)
  }

  ctx.restore()
}