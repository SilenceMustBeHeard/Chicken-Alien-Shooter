
import type { Boss, Player } from "@/lib/game/types"

export function drawTheHive(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
) {
  const t = bossTime
  const phase = boss.hivePhase ?? 1

  // PHASE 1: AMALGAM

  if (phase === 1) {
    drawAmalgam(ctx, boss, t)
  }

  // PHASE 2: HIVE LORDS

  if (phase === 2 && boss.hiveLordA && boss.hiveLordB) {
    drawHiveLords(ctx, boss.hiveLordA, boss.hiveLordB, t)
  }

  // PHASE 3: HIVE SPAWNS

  if (phase === 3 && boss.hiveSpawns) {
    for (const spawn of boss.hiveSpawns) {
      drawHiveSpawn(ctx, spawn.x, spawn.y, spawn.health, spawn.maxHealth, t)
    }
  }

  
}

// PHASE 1: Amalgam (hydra)

function drawAmalgam(ctx: CanvasRenderingContext2D, boss: Boss, t: number) {
  const r = boss.radius
  const bx = boss.x
  const by = boss.y

  const hpPercent = boss.health / boss.maxHealth
  const isLowHP = hpPercent < 0.75

  const breath = 1 + Math.sin(t / 250) * 0.05
  const wobble = Math.sin(t / 180) * r * 0.03

  // Hive aura
  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const auraPulse = 0.5 + Math.sin(t / 150) * 0.5
  const auraColor = isLowHP ? "255, 100, 0" : "251, 191, 36"

  const auraGrad = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 2.2)
  auraGrad.addColorStop(0, `rgba(${auraColor}, ${0.2 + auraPulse * 0.1})`)
  auraGrad.addColorStop(0.5, `rgba(${auraColor}, ${0.1 + auraPulse * 0.05})`)
  auraGrad.addColorStop(1, `rgba(${auraColor}, 0)`)

  ctx.fillStyle = auraGrad
  ctx.beginPath()
  ctx.arc(bx, by, r * 2.2, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < 10; i++) {
    const pa = t / 500 + (i / 10) * Math.PI * 2
    const pd = r * (1.2 + Math.sin(t / 200 + i) * 0.3)
    const px = bx + Math.cos(pa) * pd
    const py = by + Math.sin(pa) * pd * 0.6

    ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + Math.sin(t / 100 + i) * 0.3})`
    ctx.beginPath()
    ctx.arc(px, py, r * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // Shock aura
  const shockAuraRadius = r * 3
  const shockPulse = 0.5 + Math.sin(t / 80) * 0.5

  ctx.save()
  ctx.globalCompositeOperation = "lighter"

  const shockGrad = ctx.createRadialGradient(bx, by, r, bx, by, shockAuraRadius)
  shockGrad.addColorStop(0, `rgba(251, 191, 36, ${0.15 + shockPulse * 0.1})`)
  shockGrad.addColorStop(0.7, `rgba(251, 146, 60, ${0.08 + shockPulse * 0.05})`)
  shockGrad.addColorStop(1, "rgba(251, 191, 36, 0)")
  ctx.fillStyle = shockGrad
  ctx.beginPath()
  ctx.arc(bx, by, shockAuraRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + shockPulse * 0.3})`
  ctx.lineWidth = 3
  ctx.setLineDash([15, 10])
  ctx.lineDashOffset = -t / 30
  ctx.beginPath()
  ctx.arc(bx, by, shockAuraRadius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  for (let i = 0; i < 4; i++) {
    const trailAngle = (i / 4) * Math.PI * 2 + t / 150
    const trailRadius = shockAuraRadius * (0.85 + Math.sin(t / 100 + i) * 0.1)
    const tx = bx + Math.cos(trailAngle) * trailRadius
    const ty = by + Math.sin(trailAngle) * trailRadius

    ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + shockPulse * 0.3})`
    ctx.beginPath()
    ctx.arc(tx, ty, r * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // Body (same as before — hydra with heads, arms, wings, tail)
  ctx.save()
  ctx.translate(bx + wobble, by)
  ctx.scale(breath, breath)

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
  ctx.beginPath()
  ctx.ellipse(0, r * 1.05, r * 1.0, r * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body base (irregular blob)
  const bodyGrad = ctx.createRadialGradient(
    -r * 0.3, -r * 0.3, r * 0.1,
    0, 0, r * 1.15,
  )
  bodyGrad.addColorStop(0, "#7c2d12")
  bodyGrad.addColorStop(0.4, "#451a03")
  bodyGrad.addColorStop(0.8, "#291002")
  bodyGrad.addColorStop(1, "#0a0501")

  ctx.fillStyle = bodyGrad
  ctx.strokeStyle = "#1c0a01"
  ctx.lineWidth = r * 0.06

  ctx.beginPath()
  const bodyPoints = 20
  for (let i = 0; i <= bodyPoints; i++) {
    const a = (i / bodyPoints) * Math.PI * 2
    const bulge =
      Math.sin(a * 4 + t / 400) * r * 0.06 +
      Math.cos(a * 6 - t / 300) * r * 0.04
    const rad = r * 1.0 + bulge
    const px = Math.cos(a) * rad
    const py = Math.sin(a) * rad * 0.9
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Honeycomb pattern
  ctx.strokeStyle = "rgba(251, 191, 36, 0.5)"
  ctx.lineWidth = r * 0.02
  for (let i = 0; i < 8; i++) {
    const ha = (i / 8) * Math.PI * 2 + t / 3000
    const hr = r * (0.3 + (i % 3) * 0.15)
    const hx = Math.cos(ha) * hr
    const hy = Math.sin(ha) * hr * 0.8

    const hexSize = r * 0.1
    ctx.beginPath()
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2
      const px = hx + Math.cos(angle) * hexSize
      const py = hy + Math.sin(angle) * hexSize
      if (j === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // Yellow spots
  ctx.fillStyle = "rgba(251, 191, 36, 0.6)"
  for (let i = 0; i < 5; i++) {
    const sa = (i / 5) * Math.PI * 2 + t / 2500
    const sr = r * (0.4 + (i % 2) * 0.2)
    const sx = Math.cos(sa) * sr
    const sy = Math.sin(sa) * sr * 0.7
    ctx.beginPath()
    ctx.ellipse(sx, sy, r * 0.12, r * 0.08, sa, 0, Math.PI * 2)
    ctx.fill()
  }

  // 3 heads
  const headPositions = [
    { x: -r * 0.6, y: -r * 0.5 },
    { x: 0, y: -r * 0.75 },
    { x: r * 0.6, y: -r * 0.5 },
  ]

  for (let i = 0; i < headPositions.length; i++) {
    const head = headPositions[i]
    const isCenter = i === 1
    const headR = r * (isCenter ? 0.35 : 0.28)
    const headSway = Math.sin(t / 300 + i * 1.5) * r * 0.05

    // Head shadow
    ctx.fillStyle = "#1c0a01"
    ctx.beginPath()
    ctx.arc(head.x, head.y + headSway, headR * 1.05, 0, Math.PI * 2)
    ctx.fill()

    // Head
    const headGrad = ctx.createRadialGradient(
      head.x - headR * 0.3, head.y - headR * 0.3 + headSway, headR * 0.05,
      head.x, head.y + headSway, headR * 1.1,
    )
    headGrad.addColorStop(0, "#a16207")
    headGrad.addColorStop(0.5, "#713f12")
    headGrad.addColorStop(1, "#291002")

    ctx.fillStyle = headGrad
    ctx.strokeStyle = "#1c0a01"
    ctx.lineWidth = r * 0.025

    ctx.beginPath()
    ctx.arc(head.x, head.y + headSway, headR, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Eyes
    if (i === 0) {
      ctx.fillStyle = "#0a0000"
      ctx.beginPath()
      ctx.arc(head.x - headR * 0.2, head.y + headSway, headR * 0.3, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowColor = "#fbbf24"
      ctx.shadowBlur = 10
      ctx.fillStyle = "#fbbf24"
      ctx.beginPath()
      ctx.arc(head.x - headR * 0.2, head.y + headSway, headR * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    } else if (i === 1) {
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#0a0000"
        ctx.beginPath()
        ctx.arc(head.x + side * headR * 0.3, head.y + headSway, headR * 0.25, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowColor = "#fbbf24"
        ctx.shadowBlur = 15
        ctx.fillStyle = "#fbbf24"
        ctx.beginPath()
        ctx.arc(head.x + side * headR * 0.3, head.y + headSway, headR * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    } else {
      for (let e = -1; e <= 1; e++) {
        const ex = head.x + e * headR * 0.25
        const ey = head.y + headSway + Math.abs(e) * headR * 0.15

        ctx.fillStyle = "#0a0000"
        ctx.beginPath()
        ctx.arc(ex, ey, headR * 0.2, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowColor = "#ef4444"
        ctx.shadowBlur = 10
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(ex, ey, headR * 0.1, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // Mouth + teeth
    ctx.fillStyle = "#0a0000"
    ctx.beginPath()
    ctx.ellipse(head.x, head.y + headSway + headR * 0.4, headR * 0.4, headR * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#e5d5b8"
    for (let tooth = -1; tooth <= 1; tooth++) {
      const tx = head.x + tooth * headR * 0.15
      const ty = head.y + headSway + headR * 0.35

      ctx.beginPath()
      ctx.moveTo(tx - headR * 0.05, ty)
      ctx.lineTo(tx + headR * 0.05, ty)
      ctx.lineTo(tx, ty + headR * 0.12)
      ctx.closePath()
      ctx.fill()
    }
  }

  // 4 arms
  const armPositions = [
    { x: -r * 0.9, y: -r * 0.1, angle: -0.5, len: 2 },
    { x: r * 0.9, y: -r * 0.1, angle: 0.5, len: 2.4 },
    { x: -r * 0.5, y: r * 0.4, angle: 0.8, len: 1.5 },
    { x: r * 0.5, y: r * 0.4, angle: -0.8, len: 1.3 },
  ]

  for (let i = 0; i < armPositions.length; i++) {
    const arm = armPositions[i]
    const armSway = Math.sin(t / 400 + i * 2) * r * 0.15

    ctx.strokeStyle = "#451a03"
    ctx.lineWidth = r * 0.15
    ctx.lineCap = "round"

    const endX = arm.x + Math.cos(arm.angle + armSway) * r * arm.len
    const endY = arm.y + Math.sin(arm.angle + armSway) * r * arm.len

    ctx.beginPath()
    ctx.moveTo(arm.x, arm.y)
    ctx.quadraticCurveTo(
      (arm.x + endX) / 2,
      (arm.y + endY) / 2 - r * 0.2,
      endX,
      endY,
    )
    ctx.stroke()

    ctx.fillStyle = "#1c0a01"
    ctx.beginPath()
    ctx.arc(endX, endY, r * 0.1, 0, Math.PI * 2)
    ctx.fill()

    for (let c = -1; c <= 1; c++) {
      ctx.strokeStyle = "#e5d5b8"
      ctx.lineWidth = r * 0.03
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(
        endX + Math.cos(arm.angle + armSway + c * 0.3) * r * 0.15,
        endY + Math.sin(arm.angle + armSway + c * 0.3) * r * 0.15,
      )
      ctx.stroke()
    }

    ctx.lineCap = "butt"
  }

  // 2 wings (more visible now)
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * r * 1.0, -r * 0.4)
    ctx.rotate(side * (0.3 + Math.sin(t / 200) * 0.1))

    ctx.fillStyle = "rgba(251, 191, 36, 0.55)"
    ctx.strokeStyle = "#a16207"
    ctx.lineWidth = r * 0.02

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(side * r * 0.8, -r * 0.5, side * r * 1.2, -r * 0.2)
    ctx.quadraticCurveTo(side * r * 0.9, r * 0.2, side * r * 0.6, r * 0.1)
    for (let i = 0; i < 4; i++) {
      const tx = side * r * (0.6 - i * 0.15)
      const ty = r * (0.1 - i * 0.05)
      ctx.lineTo(tx, ty + r * 0.15)
      ctx.lineTo(tx - side * r * 0.05, ty + r * 0.05)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  // 3 tails
  const tailBaseX = 0
  const tailBaseY = r * 0.7
  const tailWave = Math.sin(t / 200) * r * 0.1

  for (let i = -1; i <= 1; i++) {
    ctx.strokeStyle = "#451a03"
    ctx.lineWidth = r * 0.12
    ctx.lineCap = "round"

    const endX = i * r * 0.4 + tailWave
    const endY = r * 1.6

    ctx.beginPath()
    ctx.moveTo(tailBaseX, tailBaseY)
    ctx.quadraticCurveTo(i * r * 0.3, r * 1.1, endX, endY)
    ctx.stroke()

    ctx.fillStyle = "#fbbf24"
    ctx.shadowColor = "#fbbf24"
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(endX, endY, r * 0.06, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  ctx.lineCap = "butt"

  ctx.restore()
}

// PHASE 2: Hive Lords

function drawHiveLords(
  ctx: CanvasRenderingContext2D,
  lordA: { x: number; y: number; health: number; maxHealth: number },
  lordB: { x: number; y: number; health: number; maxHealth: number; isHealing: boolean },
  t: number,
) {
  const lordRadius = 30

  // Lord A (Shield, blue)
  ctx.save()
  ctx.translate(lordA.x, lordA.y)

  const shieldPulse = 0.5 + Math.sin(t / 200) * 0.5
  const shieldGrad = ctx.createRadialGradient(0, 0, lordRadius, 0, 0, lordRadius * 2)
  shieldGrad.addColorStop(0, `rgba(100, 150, 255, ${0.1 + shieldPulse * 0.1})`)
  shieldGrad.addColorStop(0.7, `rgba(59, 130, 246, ${0.15 + shieldPulse * 0.1})`)
  shieldGrad.addColorStop(1, "rgba(100, 150, 255, 0)")
  ctx.fillStyle = shieldGrad
  ctx.beginPath()
  ctx.arc(0, 0, lordRadius * 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(147, 197, 253, ${0.5 + shieldPulse * 0.3})`
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.lineDashOffset = -t / 40
  ctx.beginPath()
  ctx.arc(0, 0, lordRadius * 1.9, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  const bodyGradA = ctx.createRadialGradient(
    -lordRadius * 0.3, -lordRadius * 0.3, lordRadius * 0.1,
    0, 0, lordRadius,
  )
  bodyGradA.addColorStop(0, "#3b82f6")
  bodyGradA.addColorStop(0.5, "#1e3a8a")
  bodyGradA.addColorStop(1, "#0c1e4a")

  ctx.fillStyle = bodyGradA
  ctx.strokeStyle = "#0c1e4a"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, lordRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#0a0015"
  ctx.beginPath()
  ctx.arc(0, -lordRadius * 0.1, lordRadius * 0.3, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowColor = "#00ffff"
  ctx.shadowBlur = 15
  ctx.fillStyle = "#00ffff"
  ctx.beginPath()
  ctx.arc(0, -lordRadius * 0.1, lordRadius * 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  const hpPercentA = lordA.health / lordA.maxHealth
  ctx.fillStyle = "#1e293b"
  ctx.fillRect(-lordRadius, -lordRadius - 20, lordRadius * 2, 5)
  ctx.fillStyle = "#3b82f6"
  ctx.fillRect(-lordRadius, -lordRadius - 20, lordRadius * 2 * hpPercentA, 5)

  ctx.restore()

  // Lord B (Healer, green)
  ctx.save()
  ctx.translate(lordB.x, lordB.y)

  if (lordB.isHealing) {
    const healPulse = 0.5 + Math.sin(t / 150) * 0.5
    const healGrad = ctx.createRadialGradient(0, 0, lordRadius, 0, 0, lordRadius * 2.5)
    healGrad.addColorStop(0, `rgba(34, 197, 94, ${0.15 + healPulse * 0.1})`)
    healGrad.addColorStop(0.7, `rgba(22, 163, 74, ${0.1 + healPulse * 0.05})`)
    healGrad.addColorStop(1, "rgba(34, 197, 94, 0)")
    ctx.fillStyle = healGrad
    ctx.beginPath()
    ctx.arc(0, 0, lordRadius * 2.5, 0, Math.PI * 2)
    ctx.fill()

    for (let i = 0; i < 6; i++) {
      const pa = t / 300 + (i / 6) * Math.PI * 2
      const pd = lordRadius * (1.5 + Math.sin(t / 200 + i) * 0.3)
      const px = Math.cos(pa) * pd
      const py = Math.sin(pa) * pd

      ctx.fillStyle = `rgba(34, 197, 94, ${0.5 + Math.sin(t / 100 + i) * 0.3})`
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const bodyGradB = ctx.createRadialGradient(
    -lordRadius * 0.3, -lordRadius * 0.3, lordRadius * 0.1,
    0, 0, lordRadius,
  )
  bodyGradB.addColorStop(0, "#22c55e")
  bodyGradB.addColorStop(0.5, "#166534")
  bodyGradB.addColorStop(1, "#0a2e1a")

  ctx.fillStyle = bodyGradB
  ctx.strokeStyle = "#0a2e1a"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, lordRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  for (const side of [-1, 1]) {
    const ex = side * lordRadius * 0.3
    const ey = -lordRadius * 0.1

    ctx.fillStyle = "#0a0015"
    ctx.beginPath()
    ctx.arc(ex, ey, lordRadius * 0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = "#22ff22"
    ctx.shadowBlur = 12
    ctx.fillStyle = "#22ff22"
    ctx.beginPath()
    ctx.arc(ex, ey, lordRadius * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  const hpPercentB = lordB.health / lordB.maxHealth
  ctx.fillStyle = "#1e293b"
  ctx.fillRect(-lordRadius, -lordRadius - 20, lordRadius * 2, 5)
  ctx.fillStyle = "#22c55e"
  ctx.fillRect(-lordRadius, -lordRadius - 20, lordRadius * 2 * hpPercentB, 5)

  ctx.restore()
}

// PHASE 3: Hive Spawns (small, red, figure-eight)

function drawHiveSpawn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  health: number,
  maxHealth: number,
  t: number,
) {
  const r = 25

  // Red aura
  const auraPulse = 0.5 + Math.sin(t / 150) * 0.5
  const auraGrad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2)
  auraGrad.addColorStop(0, `rgba(220, 38, 38, ${0.2 + auraPulse * 0.1})`)
  auraGrad.addColorStop(0.7, `rgba(185, 28, 28, ${0.1 + auraPulse * 0.05})`)
  auraGrad.addColorStop(1, "rgba(220, 38, 38, 0)")
  ctx.fillStyle = auraGrad
  ctx.beginPath()
  ctx.arc(x, y, r * 2, 0, Math.PI * 2)
  ctx.fill()

  // Wings
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(x + side * r * 0.8, y - r * 0.2)
    ctx.rotate(side * (0.4 + Math.sin(t / 100) * 0.3))

    ctx.fillStyle = "rgba(220, 38, 38, 0.4)"
    ctx.strokeStyle = "#7f1d1d"
    ctx.lineWidth = 1.5

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(side * r * 0.6, -r * 0.4, side * r * 0.9, -r * 0.1)
    ctx.quadraticCurveTo(side * r * 0.7, r * 0.2, side * r * 0.4, r * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  // Body
  const bodyGrad = ctx.createRadialGradient(
    x - r * 0.2, y - r * 0.2, r * 0.1,
    x, y, r,
  )
  bodyGrad.addColorStop(0, "#ef4444")
  bodyGrad.addColorStop(0.5, "#b91c1c")
  bodyGrad.addColorStop(1, "#7f1d1d")

  ctx.fillStyle = bodyGrad
  ctx.strokeStyle = "#450a0a"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Eye (1, yellow)
  ctx.fillStyle = "#0a0000"
  ctx.beginPath()
  ctx.arc(x, y - r * 0.1, r * 0.3, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowColor = "#fbbf24"
  ctx.shadowBlur = 10
  ctx.fillStyle = "#fbbf24"
  ctx.beginPath()
  ctx.arc(x, y - r * 0.1, r * 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Tail
  ctx.strokeStyle = "#7f1d1d"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, y + r * 0.8)
  ctx.lineTo(x + Math.sin(t / 100) * r * 0.2, y + r * 1.3)
  ctx.stroke()

  // HP bar (small)
  const hpPercent = health / maxHealth
  const barWidth = r * 1.6
  ctx.fillStyle = "#1e293b"
  ctx.fillRect(x - barWidth / 2, y - r - 12, barWidth, 3)
  ctx.fillStyle = "#dc2626"
  ctx.fillRect(x - barWidth / 2, y - r - 12, barWidth * hpPercent, 3)
}