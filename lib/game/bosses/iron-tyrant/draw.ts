
import type { Boss, Player } from "@/lib/game/types"

export function drawIronTyrant(
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
  const isBerserk = healthPercent < 0.30
  const isArmored = boss.isArmored !== false
  const armorPercent = (boss.armor || 0) / (boss.maxArmor || 400)

  const shootTimer = boss.reaperShootTimer || 0
  const combatTimer = boss.combatTimer || 0

  // Melee active in ALL phases
  const meleeEnabled = true
  const meleeRange = isBerserk ? 200 : (isArmored ? 150 : 250)
  const meleeCooldown = isBerserk ? 800 : 1500
  const meleeTimer = isBerserk ? shootTimer : combatTimer

  const windupStart = isBerserk ? 480 : (isArmored ? 1100 : 1050)
  const windupDuration = isBerserk ? 320 : (isArmored ? 400 : 450)

  const windup =
    meleeEnabled &&
    meleeTimer >= windupStart &&
    meleeTimer < meleeCooldown
      ? Math.min(1, (meleeTimer - windupStart) / windupDuration)
      : 0

  const isWindingUp = windup > 0
  const facing = Math.atan2(player.y - by, player.x - bx)

  const breath = 1 + Math.sin(t / 350) * (isBerserk ? 0.045 : 0.018)
  const hover = Math.sin(t / 250) * r * 0.018
  const pulse = 0.5 + Math.sin(t / (isBerserk ? 65 : 160)) * 0.5

  // PERMANENT MELEE RANGE SCANNER 
  if (meleeEnabled) {
    ctx.save()
    ctx.translate(bx, by)

    const ringRadius = meleeRange
    const rotation = t / (isBerserk ? 240 : 420)
    const dangerColor = isBerserk ? "#ff2020" : (isArmored ? "#fbbf24" : "#ef4444")
    const dangerRGB = isBerserk ? "255, 32, 32" : (isArmored ? "251, 191, 36" : "239, 68, 68")

    const zone = ctx.createRadialGradient(
      0, 0, r * 0.65,
      0, 0, ringRadius,
    )

    zone.addColorStop(
      0,
      `rgba(${dangerRGB}, ${isBerserk ? 0.10 : isArmored ? 0.04 : 0.035})`,
    )
    zone.addColorStop(
      0.72,
      `rgba(${dangerRGB}, ${isBerserk ? 0.07 : isArmored ? 0.03 : 0.025})`,
    )
    zone.addColorStop(1, "rgba(255, 0, 0, 0.01)")

    ctx.fillStyle = zone
    ctx.beginPath()
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
    ctx.fill()

    // Outer boundary
    ctx.setLineDash([r * 0.16, r * 0.09])
    ctx.lineDashOffset = -rotation * ringRadius * 0.08
    ctx.strokeStyle = dangerColor
    ctx.globalAlpha = 0.55 + pulse * 0.2
    ctx.lineWidth = isBerserk ? 3.5 : 2.5
    ctx.beginPath()
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Rotating scanner arc
    ctx.globalAlpha = 0.55 + pulse * 0.25
    ctx.lineWidth = 2
    ctx.strokeStyle = isBerserk ? "#ff7777" : isArmored ? "#fde68a" : "#f87171"
    ctx.beginPath()
    ctx.arc(
      0, 0,
      ringRadius * 0.91,
      rotation,
      rotation + Math.PI * 1.25,
    )
    ctx.stroke()

    // Counter-rotating inner arc
    ctx.strokeStyle = "#fecaca"
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(
      0, 0,
      ringRadius * 0.96,
      -rotation * 0.72,
      -rotation * 0.72 + Math.PI * 0.45,
    )
    ctx.stroke()

    // Range ticks
    const tickCount = 32

    for (let i = 0; i < tickCount; i++) {
      const a = (i / tickCount) * Math.PI * 2
      const major = i % 4 === 0
      const inner = ringRadius - (major ? r * 0.14 : r * 0.07)

      ctx.globalAlpha = major ? 0.8 : 0.38
      ctx.strokeStyle = dangerColor
      ctx.lineWidth = major ? 2.5 : 1.25

      ctx.beginPath()
      ctx.moveTo(
        Math.cos(a) * inner,
        Math.sin(a) * inner,
      )
      ctx.lineTo(
        Math.cos(a) * ringRadius,
        Math.sin(a) * ringRadius,
      )
      ctx.stroke()
    }

    // Rotating sweep sector
    const sweepAngle = rotation * 0.85

    ctx.globalAlpha = isBerserk ? 0.24 : 0.15
    ctx.fillStyle = dangerColor
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(
      0, 0,
      ringRadius,
      sweepAngle,
      sweepAngle + 0.22,
    )
    ctx.closePath()
    ctx.fill()

    // Direction marker
    ctx.globalAlpha = 0.65 + pulse * 0.25
    ctx.strokeStyle = isBerserk ? "#ffffff" : (isArmored ? "#fef3c7" : "#fca5a5")
    ctx.lineWidth = isBerserk ? 3 : 2
    ctx.beginPath()
    ctx.arc(
      0, 0,
      ringRadius,
      facing - 0.12,
      facing + 0.12,
    )
    ctx.stroke()

    ctx.fillStyle = isBerserk ? "#ffffff" : (isArmored ? "#fef3c7" : "#fecaca")
    ctx.beginPath()
    ctx.arc(
      Math.cos(facing) * ringRadius,
      Math.sin(facing) * ringRadius,
      isBerserk ? 5 : 4,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.restore()
  }

  // BERSERK AURA 
  if (isBerserk) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const auraRadius = r * (2.1 + pulse * 0.18)
    const aura = ctx.createRadialGradient(
      bx, by, r * 0.2,
      bx, by, auraRadius,
    )

    aura.addColorStop(0, `rgba(255, 20, 20, ${0.23 + pulse * 0.08})`)
    aura.addColorStop(0.45, `rgba(220, 15, 15, ${0.12 + pulse * 0.06})`)
    aura.addColorStop(1, "rgba(150, 0, 0, 0)")

    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(bx, by, auraRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(255, 55, 55, ${0.45 + pulse * 0.4})`
    ctx.lineWidth = Math.max(2, r * 0.025)
    ctx.setLineDash([r * 0.16, r * 0.12])
    ctx.lineDashOffset = -t / 18
    ctx.beginPath()
    ctx.arc(bx, by, auraRadius * 0.83, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    for (let i = 0; i < 12; i++) {
      const a = t / 180 + (i / 12) * Math.PI * 2
      const orbit = r * (1.35 + 0.25 * Math.sin(t / 120 + i * 1.7))
      const px = bx + Math.cos(a) * orbit
      const py = by + Math.sin(a) * orbit * 0.7

      ctx.fillStyle = `rgba(255, ${25 + (i % 3) * 20}, 20, ${0.45 + pulse * 0.45})`
      ctx.beginPath()
      ctx.arc(px, py, r * (0.025 + (i % 3) * 0.008), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // MELEE WINDUP WARNING 
  if (isWindingUp) {
    ctx.save()
    ctx.translate(bx, by)
    ctx.globalAlpha = 0.25 + windup * 0.5

    ctx.strokeStyle = isBerserk ? "#ff2020" : (isArmored ? "#fbbf24" : "#ef4444")
    ctx.lineWidth = r * (0.025 + windup * 0.025)
    ctx.setLineDash([r * 0.12, r * 0.09])
    ctx.beginPath()
    ctx.arc(
      0, 0,
      meleeRange * (0.68 + windup * 0.16),
      facing - 0.65,
      facing + 0.65,
    )
    ctx.stroke()
    ctx.setLineDash([])

    ctx.restore()
  }

  //  BODY TRANSFORM + SHADOW 
  ctx.save()
  ctx.translate(bx, by + hover)
  ctx.scale(breath, breath)

  ctx.fillStyle = "rgba(0, 0, 0, 0.42)"
  ctx.beginPath()
  ctx.ellipse(0, r * 1.23, r * 0.82, r * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()

  // Limb helper 
  const drawLimb = (
    x1: number, y1: number,
    x2: number, y2: number,
    width: number,
    fill: string,
    outline: string,
  ) => {
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.strokeStyle = outline
    ctx.lineWidth = width + r * 0.045
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    ctx.strokeStyle = fill
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  //  LEGS 
  for (const side of [-1, 1]) {
    const hipX = side * r * 0.28
    const kneeX = side * r * 0.34
    const ankleX = side * r * 0.37

    if (isArmored) {
      drawLimb(hipX, r * 0.48, kneeX, r * 0.87, r * 0.25, "#475569", "#111827")

      ctx.fillStyle = "#94a3b8"
      ctx.strokeStyle = "#1e293b"
      ctx.lineWidth = r * 0.035
      ctx.beginPath()
      ctx.roundRect(kneeX - r * 0.14, r * 0.75, r * 0.28, r * 0.22, r * 0.055)
      ctx.fill()
      ctx.stroke()

      drawLimb(kneeX, r * 0.88, ankleX, r * 1.12, r * 0.2, "#334155", "#0f172a")

      ctx.fillStyle = "#1e293b"
      ctx.strokeStyle = "#020617"
      ctx.lineWidth = r * 0.035
      ctx.beginPath()
      ctx.roundRect(ankleX - r * 0.19, r * 1.06, r * 0.38, r * 0.19, r * 0.045)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = "#64748b"
      ctx.fillRect(ankleX - r * 0.13, r * 1.09, r * 0.26, r * 0.035)
    } else {
      drawLimb(hipX, r * 0.5, kneeX, r * 0.85, r * 0.22, "#991b1b", "#450a0a")

      ctx.fillStyle = "#dc2626"
      ctx.beginPath()
      ctx.ellipse(kneeX, r * 0.85, r * 0.13, r * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()

      drawLimb(kneeX, r * 0.87, ankleX, r * 1.12, r * 0.17, "#7f1d1d", "#450a0a")

      ctx.fillStyle = "#450a0a"
      ctx.beginPath()
      ctx.ellipse(ankleX, r * 1.17, r * 0.2, r * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = "#fb4b4b"
      ctx.lineWidth = r * 0.025
      ctx.beginPath()
      ctx.moveTo(hipX, r * 0.62)
      ctx.lineTo(kneeX - side * r * 0.04, r * 0.76)
      ctx.stroke()
    }
  }

  //  ARMS 
  for (const side of [-1, 1]) {
    const shoulderX = side * r * 0.52
    const shoulderY = -r * 0.34

    const pullBack = isWindingUp ? windup * r * 0.16 : 0
    const swing = isWindingUp ? Math.sin(windup * Math.PI) : 0

    const elbowX = side * (r * 0.72 - pullBack * 0.25)
    const elbowY = r * (0.02 + swing * 0.12)

    const handX = side * (r * 0.78 + pullBack * 0.7)
    const handY = r * (0.39 - swing * 0.22)

    if (isArmored) {
      ctx.fillStyle = "#64748b"
      ctx.strokeStyle = "#0f172a"
      ctx.lineWidth = r * 0.045
      ctx.beginPath()
      ctx.moveTo(shoulderX - side * r * 0.18, shoulderY - r * 0.12)
      ctx.lineTo(shoulderX + side * r * 0.15, shoulderY - r * 0.19)
      ctx.lineTo(shoulderX + side * r * 0.28, shoulderY + r * 0.03)
      ctx.lineTo(shoulderX + side * r * 0.12, shoulderY + r * 0.22)
      ctx.lineTo(shoulderX - side * r * 0.16, shoulderY + r * 0.12)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.save()
      ctx.translate(shoulderX + side * r * 0.06, shoulderY - r * 0.07)
      ctx.rotate(-side * 0.12)

      ctx.fillStyle = "#1e293b"
      ctx.strokeStyle = "#020617"
      ctx.lineWidth = r * 0.035
      ctx.beginPath()
      ctx.roundRect(-r * 0.09, -r * 0.22, r * 0.18, r * 0.39, r * 0.045)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = "#94a3b8"
      ctx.fillRect(-r * 0.055, -r * 0.18, r * 0.11, r * 0.09)

      ctx.fillStyle = "#0f172a"
      ctx.beginPath()
      ctx.arc(0, r * 0.14, r * 0.065, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      drawLimb(shoulderX, shoulderY, elbowX, elbowY, r * 0.22, "#475569", "#0f172a")

      ctx.fillStyle = "#94a3b8"
      ctx.strokeStyle = "#1e293b"
      ctx.lineWidth = r * 0.035
      ctx.beginPath()
      ctx.arc(elbowX, elbowY, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      drawLimb(elbowX, elbowY, handX, handY, r * 0.19, "#334155", "#0f172a")

      ctx.fillStyle = "#64748b"
      ctx.strokeStyle = "#0f172a"
      ctx.lineWidth = r * 0.04
      ctx.beginPath()
      ctx.roundRect(handX - r * 0.14, handY - r * 0.12, r * 0.28, r * 0.25, r * 0.055)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = "#cbd5e1"
      ctx.fillRect(handX - r * 0.095, handY - r * 0.075, r * 0.19, r * 0.045)

      ctx.fillStyle = "#1e293b"
      for (let knuckle = 0; knuckle < 3; knuckle++) {
        ctx.fillRect(
          handX - r * 0.09 + knuckle * r * 0.065,
          handY + r * 0.025,
          r * 0.04,
          r * 0.07,
        )
      }
    } else {
      ctx.fillStyle = "#b91c1c"
      ctx.strokeStyle = "#450a0a"
      ctx.lineWidth = r * 0.035
      ctx.beginPath()
      ctx.ellipse(shoulderX, shoulderY, r * 0.2, r * 0.22, side * -0.25, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      drawLimb(shoulderX, shoulderY, elbowX, elbowY, r * 0.2, "#b91c1c", "#450a0a")

      ctx.fillStyle = "#ef4444"
      ctx.beginPath()
      ctx.ellipse(elbowX, elbowY, r * 0.12, r * 0.13, 0, 0, Math.PI * 2)
      ctx.fill()

      drawLimb(elbowX, elbowY, handX, handY, r * 0.17, "#991b1b", "#450a0a")

      ctx.fillStyle = "#dc2626"
      ctx.strokeStyle = "#450a0a"
      ctx.lineWidth = r * 0.03
      ctx.beginPath()
      ctx.ellipse(handX, handY, r * 0.16, r * 0.15, side * -0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      for (let finger = 0; finger < 3; finger++) {
        ctx.strokeStyle = "#7f1d1d"
        ctx.lineWidth = r * 0.025
        ctx.beginPath()
        ctx.moveTo(handX - r * 0.09 + finger * r * 0.07, handY - r * 0.015)
        ctx.lineTo(handX - r * 0.08 + finger * r * 0.07, handY + r * 0.075)
        ctx.stroke()
      }

      ctx.strokeStyle = `rgba(255, 90, 50, ${0.5 + pulse * 0.4})`
      ctx.lineWidth = r * 0.025
      ctx.beginPath()
      ctx.moveTo(shoulderX, shoulderY)
      ctx.lineTo(elbowX, elbowY)
      ctx.lineTo(handX - side * r * 0.05, handY)
      ctx.stroke()
    }
  }

  // TORSO
  if (isArmored) {
    const metal = ctx.createLinearGradient(-r * 0.6, 0, r * 0.6, 0)
    metal.addColorStop(0, "#1e293b")
    metal.addColorStop(0.25, "#64748b")
    metal.addColorStop(0.5, "#cbd5e1")
    metal.addColorStop(0.75, "#64748b")
    metal.addColorStop(1, "#1e293b")

    ctx.fillStyle = metal
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = r * 0.05
    ctx.beginPath()
    ctx.moveTo(-r * 0.48, -r * 0.46)
    ctx.lineTo(-r * 0.3, -r * 0.65)
    ctx.lineTo(r * 0.3, -r * 0.65)
    ctx.lineTo(r * 0.48, -r * 0.46)
    ctx.lineTo(r * 0.4, r * 0.28)
    ctx.lineTo(r * 0.24, r * 0.53)
    ctx.lineTo(-r * 0.24, r * 0.53)
    ctx.lineTo(-r * 0.4, r * 0.28)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    for (const side of [-1, 1]) {
      ctx.fillStyle = "#94a3b8"
      ctx.beginPath()
      ctx.moveTo(side * r * 0.05, -r * 0.48)
      ctx.lineTo(side * r * 0.34, -r * 0.43)
      ctx.lineTo(side * r * 0.3, -r * 0.12)
      ctx.lineTo(side * r * 0.05, -r * 0.2)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = "#334155"
      ctx.lineWidth = r * 0.025
      ctx.stroke()
    }

    ctx.save()
    ctx.shadowColor = isBerserk ? "#ff1f1f" : "#f97316"
    ctx.shadowBlur = isBerserk ? 24 : 12

    ctx.fillStyle = "#111827"
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.4)
    ctx.lineTo(r * 0.16, -r * 0.22)
    ctx.lineTo(r * 0.12, r * 0.04)
    ctx.lineTo(0, r * 0.13)
    ctx.lineTo(-r * 0.12, r * 0.04)
    ctx.lineTo(-r * 0.16, -r * 0.22)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = isBerserk ? "#ff2020" : "#fb923c"
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.32)
    ctx.lineTo(r * 0.075, -r * 0.19)
    ctx.lineTo(0, -r * 0.04)
    ctx.lineTo(-r * 0.075, -r * 0.19)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = "#334155"
    ctx.beginPath()
    ctx.moveTo(-r * 0.29, r * 0.28)
    ctx.lineTo(r * 0.29, r * 0.28)
    ctx.lineTo(r * 0.24, r * 0.53)
    ctx.lineTo(-r * 0.24, r * 0.53)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = r * 0.035
    ctx.stroke()

    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = r * 0.018
    ctx.beginPath()
    ctx.moveTo(-r * 0.3, -r * 0.32)
    ctx.lineTo(-r * 0.2, -r * 0.12)
    ctx.moveTo(r * 0.3, -r * 0.32)
    ctx.lineTo(r * 0.2, -r * 0.12)
    ctx.moveTo(-r * 0.2, r * 0.35)
    ctx.lineTo(r * 0.2, r * 0.35)
    ctx.stroke()

    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = r * 0.025
    ctx.beginPath()
    ctx.moveTo(-r * 0.31, -r * 0.24)
    ctx.lineTo(-r * 0.23, -r * 0.16)
    ctx.lineTo(-r * 0.27, -r * 0.07)
    ctx.moveTo(r * 0.28, r * 0.13)
    ctx.lineTo(r * 0.19, r * 0.2)
    ctx.stroke()
  } else {
    const flesh = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0)
    flesh.addColorStop(0, "#7f1d1d")
    flesh.addColorStop(0.35, "#b91c1c")
    flesh.addColorStop(0.5, "#ef4444")
    flesh.addColorStop(0.7, "#b91c1c")
    flesh.addColorStop(1, "#450a0a")

    ctx.fillStyle = flesh
    ctx.strokeStyle = "#450a0a"
    ctx.lineWidth = r * 0.045
    ctx.beginPath()
    ctx.moveTo(-r * 0.47, -r * 0.49)
    ctx.lineTo(-r * 0.3, -r * 0.61)
    ctx.lineTo(r * 0.3, -r * 0.61)
    ctx.lineTo(r * 0.47, -r * 0.49)
    ctx.lineTo(r * 0.39, r * 0.19)
    ctx.lineTo(r * 0.23, r * 0.54)
    ctx.lineTo(-r * 0.23, r * 0.54)
    ctx.lineTo(-r * 0.39, r * 0.19)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    for (const side of [-1, 1]) {
      ctx.fillStyle = "#dc2626"
      ctx.strokeStyle = "#7f1d1d"
      ctx.lineWidth = r * 0.025
      ctx.beginPath()
      ctx.ellipse(side * r * 0.22, -r * 0.32, r * 0.23, r * 0.17, side * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      ctx.strokeStyle = "#7f1d1d"
      ctx.lineWidth = r * 0.035
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.46)
      ctx.lineTo(side * r * 0.34, -r * 0.38)
      ctx.stroke()
    }

    for (let row = 0; row < 3; row++) {
      const yy = -r * 0.04 + row * r * 0.16

      for (const side of [-1, 1]) {
        ctx.fillStyle = row % 2 === 0 ? "#b91c1c" : "#991b1b"
        ctx.beginPath()
        ctx.roundRect(
          side * r * 0.105 - r * 0.09,
          yy,
          r * 0.18,
          r * 0.12,
          r * 0.035,
        )
        ctx.fill()
      }
    }

    ctx.strokeStyle = "#7f1d1d"
    ctx.lineWidth = r * 0.03
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.17)
    ctx.lineTo(0, r * 0.45)
    ctx.stroke()

    ctx.save()
    ctx.shadowColor = isBerserk ? "#ff1a1a" : "#fb923c"
    ctx.shadowBlur = isBerserk ? 18 : 8
    ctx.strokeStyle = isBerserk
      ? `rgba(255, 35, 35, ${0.7 + pulse * 0.3})`
      : `rgba(255, 115, 50, ${0.55 + pulse * 0.35})`
    ctx.lineWidth = r * 0.025

    ctx.beginPath()
    ctx.moveTo(-r * 0.31, -r * 0.42)
    ctx.lineTo(-r * 0.2, -r * 0.23)
    ctx.lineTo(-r * 0.27, -r * 0.07)
    ctx.lineTo(-r * 0.12, r * 0.12)
    ctx.lineTo(-r * 0.17, r * 0.36)

    ctx.moveTo(r * 0.29, -r * 0.35)
    ctx.lineTo(r * 0.18, -r * 0.15)
    ctx.lineTo(r * 0.27, r * 0.04)
    ctx.lineTo(r * 0.14, r * 0.26)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = "#450a0a"
    for (let i = 0; i < 3; i++) {
      const wx = (i - 1) * r * 0.23
      const wy = r * (0.2 + (i % 2) * 0.13)
      ctx.beginPath()
      ctx.ellipse(wx, wy, r * 0.065, r * 0.035, -0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // HEAD 
  if (isArmored) {
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(-r * 0.16, -r * 0.72, r * 0.32, r * 0.16)

    const helmet = ctx.createLinearGradient(-r * 0.35, 0, r * 0.35, 0)
    helmet.addColorStop(0, "#334155")
    helmet.addColorStop(0.5, "#cbd5e1")
    helmet.addColorStop(1, "#334155")

    ctx.fillStyle = helmet
    ctx.strokeStyle = "#020617"
    ctx.lineWidth = r * 0.045
    ctx.beginPath()
    ctx.moveTo(-r * 0.29, -r * 0.91)
    ctx.lineTo(-r * 0.2, -r * 1.12)
    ctx.lineTo(r * 0.2, -r * 1.12)
    ctx.lineTo(r * 0.29, -r * 0.91)
    ctx.lineTo(r * 0.23, -r * 0.68)
    ctx.lineTo(0, -r * 0.61)
    ctx.lineTo(-r * 0.23, -r * 0.68)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#64748b"
    ctx.beginPath()
    ctx.moveTo(-r * 0.18, -r * 1.04)
    ctx.lineTo(r * 0.18, -r * 1.04)
    ctx.lineTo(r * 0.12, -r * 0.93)
    ctx.lineTo(-r * 0.12, -r * 0.93)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = "#0f172a"
    ctx.beginPath()
    ctx.moveTo(-r * 0.22, -r * 0.88)
    ctx.lineTo(r * 0.22, -r * 0.88)
    ctx.lineTo(r * 0.17, -r * 0.75)
    ctx.lineTo(0, -r * 0.69)
    ctx.lineTo(-r * 0.17, -r * 0.75)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.shadowColor = "#f97316"
    ctx.shadowBlur = 12
    ctx.fillStyle = "#fb923c"
    ctx.beginPath()
    ctx.moveTo(-r * 0.17, -r * 0.83)
    ctx.lineTo(r * 0.17, -r * 0.83)
    ctx.lineTo(r * 0.12, -r * 0.78)
    ctx.lineTo(-r * 0.12, -r * 0.78)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    for (const side of [-1, 1]) {
      ctx.fillStyle = "#cbd5e1"
      ctx.beginPath()
      ctx.arc(side * r * 0.245, -r * 0.83, r * 0.035, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = "#7f1d1d"
    ctx.beginPath()
    ctx.roundRect(-r * 0.17, -r * 0.74, r * 0.34, r * 0.19, r * 0.06)
    ctx.fill()

    const head = ctx.createRadialGradient(
      -r * 0.1, -r * 0.96, r * 0.02,
      0, -r * 0.89, r * 0.39,
    )
    head.addColorStop(0, "#f87171")
    head.addColorStop(0.45, "#dc2626")
    head.addColorStop(1, "#450a0a")

    ctx.fillStyle = head
    ctx.strokeStyle = "#450a0a"
    ctx.lineWidth = r * 0.04
    ctx.beginPath()
    ctx.moveTo(-r * 0.28, -r * 0.91)
    ctx.lineTo(-r * 0.2, -r * 1.09)
    ctx.lineTo(0, -r * 1.15)
    ctx.lineTo(r * 0.2, -r * 1.09)
    ctx.lineTo(r * 0.28, -r * 0.91)
    ctx.lineTo(r * 0.2, -r * 0.73)
    ctx.lineTo(0, -r * 0.66)
    ctx.lineTo(-r * 0.2, -r * 0.73)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#7f1d1d"
    ctx.beginPath()
    ctx.moveTo(-r * 0.24, -r * 0.96)
    ctx.lineTo(-r * 0.02, -r * 0.91)
    ctx.lineTo(0, -r * 0.86)
    ctx.lineTo(r * 0.02, -r * 0.91)
    ctx.lineTo(r * 0.24, -r * 0.96)
    ctx.lineTo(r * 0.17, -r * 0.86)
    ctx.lineTo(-r * 0.17, -r * 0.86)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.shadowColor = "#ff0000"
    ctx.shadowBlur = isBerserk ? 30 : 18

    for (const side of [-1, 1]) {
      ctx.fillStyle = "#240000"
      ctx.beginPath()
      ctx.ellipse(side * r * 0.115, -r * 0.88, r * 0.105, r * 0.065, side * -0.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = isBerserk ? "#ffffff" : "#ff6666"
      ctx.beginPath()
      ctx.ellipse(side * r * 0.115, -r * 0.88, r * 0.075, r * 0.035, side * -0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    ctx.fillStyle = "#450a0a"
    ctx.beginPath()
    ctx.moveTo(-r * 0.15, -r * 0.79)
    ctx.lineTo(r * 0.15, -r * 0.79)
    ctx.lineTo(r * 0.1, -r * 0.71)
    ctx.lineTo(0, -r * 0.68)
    ctx.lineTo(-r * 0.1, -r * 0.71)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = "#fb7185"
    ctx.lineWidth = r * 0.018
    ctx.beginPath()
    ctx.moveTo(-r * 0.07, -r * 0.75)
    ctx.lineTo(-r * 0.025, -r * 0.72)
    ctx.lineTo(r * 0.02, -r * 0.75)
    ctx.lineTo(r * 0.07, -r * 0.72)
    ctx.stroke()
  }

  //  ARMOR DAMAGE 
  if (isArmored && armorPercent < 0.65) {
    ctx.strokeStyle = `rgba(248, 113, 113, ${0.35 + pulse * 0.3})`
    ctx.lineWidth = r * 0.025
    ctx.beginPath()
    ctx.moveTo(-r * 0.32, -r * 0.2)
    ctx.lineTo(-r * 0.22, -r * 0.08)
    ctx.lineTo(-r * 0.28, r * 0.04)
    ctx.stroke()

    if (armorPercent < 0.3) {
      ctx.fillStyle = `rgba(255, 100, 50, ${0.25 + pulse * 0.3})`
      ctx.beginPath()
      ctx.arc(r * 0.15, -r * 0.2, r * 0.055, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()

  // MELEE SWIPE TELEGRAPH 
  if (isWindingUp) {
    ctx.save()

    const progress = windup
    const swipeRadius = meleeRange * (0.72 + progress * 0.18)
    const swipeAlpha = 0.15 + progress * 0.75

    ctx.globalAlpha = swipeAlpha
    ctx.lineCap = "round"

    ctx.strokeStyle = isBerserk ? "#ff2020" : (isArmored ? "#fbbf24" : "#ef4444")
    ctx.lineWidth = r * (0.035 + progress * 0.045)
    ctx.beginPath()
    ctx.arc(
      bx, by,
      swipeRadius,
      facing - (0.28 + progress * 0.3),
      facing + (0.28 + progress * 0.3),
    )
    ctx.stroke()

    ctx.strokeStyle = "#fff1f2"
    ctx.lineWidth = Math.max(2, r * 0.012)
    ctx.beginPath()
    ctx.arc(
      bx, by,
      swipeRadius * 0.96,
      facing - (0.2 + progress * 0.24),
      facing + (0.2 + progress * 0.24),
    )
    ctx.stroke()

    for (let i = 0; i < 7; i++) {
      const spread = (i / 6 - 0.5) * (0.5 + progress * 0.6)
      const a = facing + spread
      const d = swipeRadius * (0.85 + (i % 3) * 0.045)
      const px = bx + Math.cos(a) * d
      const py = by + Math.sin(a) * d

      ctx.fillStyle = isBerserk ? "#ffb4b4" : (isArmored ? "#fef3c7" : "#fecaca")
      ctx.beginPath()
      ctx.arc(px, py, r * (0.018 + progress * 0.018), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.lineCap = "butt"
    ctx.restore()
  }
}