
import type { Boss, Player } from "@/lib/game/types"

export function drawTheButcher(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  player: Player,
): void {
  const r = boss.radius
  const t = bossTime
  const bx = boss.x
  const by = boss.y

  const angleToPlayer = Math.atan2(player.y - by, player.x - bx)

  // Berserk + cycle state
  const healthPercent = boss.health / boss.maxHealth
  const isBerserk = healthPercent < 0.20

  const cycleTime = isBerserk ? 2000 : 5100
  const chaseEnd = isBerserk ? 1000 : 2500
  const windupEnd = isBerserk ? 1300 : 3100
  const chargeEnd = isBerserk ? 1700 : 3600

  const cyclePhase = (boss.spawnTimer || 0) % cycleTime
  const isWindup = cyclePhase >= chaseEnd && cyclePhase < windupEnd
  const isCharging = cyclePhase >= windupEnd && cyclePhase < chargeEnd
  const isStunned = cyclePhase >= chargeEnd
  const isSlashing = isCharging

  const pulse = 1 + Math.sin(t / 300) * 0.03
  const angerGlow = isBerserk
    ? 1.5
    : isCharging ? 1 : isWindup ? 0.8 : isStunned ? 0.1 : 0.3

  const axeSpin = isWindup ? t / 50 : isCharging ? 0 : t / 200
  const axeLift = isWindup ? -r * 0.5 : isCharging ? r * 0.3 : 0

  // AURA (behind body)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  const aura = ctx.createRadialGradient(bx, by, r * 0.4, bx, by, r * 2)
  aura.addColorStop(0, `rgba(180, 20, 20, ${0.15 + angerGlow * 0.2})`)
  aura.addColorStop(0.6, `rgba(120, 10, 10, ${0.08 + angerGlow * 0.1})`)
  aura.addColorStop(1, "rgba(80, 5, 5, 0.63)")
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(bx, by, r * 2, 0, Math.PI * 4)
  ctx.fill()

  // Berserk pulsing rage aura
  if (isBerserk) {
    const ragePulse = 0.5 + Math.sin(t / 100) * 0.5
    const rageGrad = ctx.createRadialGradient(bx, by, r * 0.8, bx, by, r * 3.5)
    rageGrad.addColorStop(0, `rgba(255, 0, 0, ${0.3 + ragePulse * 0.3})`)
    rageGrad.addColorStop(0.5, `rgba(200, 0, 0, ${0.15 + ragePulse * 0.15})`)
    rageGrad.addColorStop(1, "rgba(100, 0, 0, 0)")
    ctx.fillStyle = rageGrad
    ctx.beginPath()
    ctx.arc(bx, by, r * 3.5, 0, Math.PI * 4)
    ctx.fill()
  }

  // Floating blood droplets
  for (let i = 0; i < 6; i++) {
    const pa = t / 600 + (i / 6) * Math.PI * 2
    const pd = r * (1.3 + Math.sin(t / 250 + i) * 0.2)
    const px = bx + Math.cos(pa) * pd
    const py = by + Math.sin(pa) * pd * 0.7
    ctx.fillStyle = `rgba(180, 20, 20, ${0.5 + Math.sin(t / 100 + i) * 0.3})`
    ctx.beginPath()
    ctx.arc(px, py, r * 0.045, 0, Math.PI * 4)
    ctx.fill()
  }
  ctx.restore()

  // CHARGE TRAIL (motion lines behind butcher)
  if (isCharging && boss.chargeDirection) {
    ctx.save()
    ctx.globalAlpha = 0.6
    for (let i = 0; i < 8; i++) {
      const trailOffset = i * 15 + 20
      const tx = bx - boss.chargeDirection.x * trailOffset
      const ty = by - boss.chargeDirection.y * trailOffset

      ctx.fillStyle = `rgba(220, 30, 30, ${0.7 - i * 0.08})`
      ctx.beginPath()
      ctx.arc(tx, ty, r * (0.4 - i * 0.04), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // THE BUTCHER — EXECUTIONER BODY
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(angleToPlayer)
  ctx.scale(pulse, pulse)

  // Palette
  const flesh = "#641414"
  const fleshLight = "#8f2525"
  const fleshDark = "#210707"
  const metal = "#8c969f"
  const bone = "#e4d4b6"

  //  SHADOW / MASS 
  ctx.fillStyle = "#100303"
  ctx.beginPath()
  ctx.ellipse(-r * 0.05, r * 0.12, r * 0.88, r * 0.94, 0, 0, Math.PI * 2)
  ctx.fill()

  // === TORSO ===
  const torso = ctx.createLinearGradient(-r, -r, r, r)
  torso.addColorStop(0, fleshLight)
  torso.addColorStop(0.32, flesh)
  torso.addColorStop(0.72, "#3a0909")
  torso.addColorStop(1, fleshDark)

  ctx.fillStyle = torso
  ctx.strokeStyle = "#180303"
  ctx.lineWidth = r * 0.055
  ctx.beginPath()
  ctx.moveTo(-r * 0.28, -r * 0.76)
  ctx.lineTo(-r * 0.7, -r * 0.67)
  ctx.lineTo(-r * 0.98, -r * 0.28)
  ctx.lineTo(-r * 0.8, r * 0.27)
  ctx.lineTo(-r * 0.55, r * 0.53)
  ctx.lineTo(-r * 0.43, r * 0.91)
  ctx.lineTo(r * 0.4, r * 0.91)
  ctx.lineTo(r * 0.56, r * 0.53)
  ctx.lineTo(r * 0.82, r * 0.23)
  ctx.lineTo(r * 0.96, -r * 0.29)
  ctx.lineTo(r * 0.65, -r * 0.7)
  ctx.lineTo(r * 0.25, -r * 0.78)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  //  MUSCLE / SCAR RIDGES 
  ctx.strokeStyle = "rgba(15, 0, 0, 0.65)"
  ctx.lineWidth = r * 0.045
  ctx.lineCap = "round"

  ctx.beginPath()
  ctx.moveTo(-r * 0.48, -r * 0.36)
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.12, -r * 0.24, r * 0.25)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(r * 0.48, -r * 0.34)
  ctx.quadraticCurveTo(r * 0.18, -r * 0.05, r * 0.3, r * 0.22)
  ctx.stroke()

  // HEAVY SHOULDER ARMOR
  for (const side of [-1, 1]) {
    const sx = side * r * 0.73
    const sy = -r * 0.48

    const armor = ctx.createLinearGradient(
      sx - r * 0.2, sy - r * 0.2,
      sx + r * 0.2, sy + r * 0.3
    )
    armor.addColorStop(0, "#5d6268")
    armor.addColorStop(0.35, "#24272b")
    armor.addColorStop(0.75, "#111214")
    armor.addColorStop(1, "#050505")

    ctx.fillStyle = armor
    ctx.strokeStyle = "#090909"
    ctx.lineWidth = r * 0.035

    ctx.beginPath()
    ctx.moveTo(sx - side * r * 0.22, sy - r * 0.12)
    ctx.lineTo(sx + side * r * 0.1, sy - r * 0.27)
    ctx.lineTo(sx + side * r * 0.3, sy - r * 0.02)
    ctx.lineTo(sx + side * r * 0.23, sy + r * 0.25)
    ctx.lineTo(sx - side * r * 0.12, sy + r * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Bone spikes
    ctx.fillStyle = bone
    ctx.strokeStyle = "#51402d"
    ctx.lineWidth = r * 0.018

    ctx.beginPath()
    ctx.moveTo(sx + side * r * 0.02, sy - r * 0.14)
    ctx.lineTo(sx + side * r * 0.3, sy - r * 0.53)
    ctx.lineTo(sx + side * r * 0.23, sy - r * 0.08)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Armor rivets
    ctx.fillStyle = "#b6b9bc"
    ctx.beginPath()
    ctx.arc(sx - side * r * 0.08, sy + r * 0.08, r * 0.025, 0, Math.PI * 2)
    ctx.fill()
  }

  // LEATHER APRON
  const apron = ctx.createLinearGradient(0, r * 0.08, 0, r * 0.93)
  apron.addColorStop(0, "#512020")
  apron.addColorStop(0.45, "#281010")
  apron.addColorStop(1, "#100606")

  ctx.fillStyle = apron
  ctx.strokeStyle = "#0b0202"
  ctx.lineWidth = r * 0.04

  ctx.beginPath()
  ctx.moveTo(-r * 0.43, r * 0.06)
  ctx.lineTo(r * 0.43, r * 0.06)
  ctx.lineTo(r * 0.53, r * 0.73)
  ctx.lineTo(r * 0.35, r * 0.91)
  ctx.lineTo(-r * 0.38, r * 0.91)
  ctx.lineTo(-r * 0.53, r * 0.72)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Apron seams
  ctx.strokeStyle = "#754040"
  ctx.lineWidth = r * 0.018
  ctx.beginPath()
  ctx.moveTo(-r * 0.34, r * 0.16)
  ctx.lineTo(-r * 0.4, r * 0.73)
  ctx.moveTo(r * 0.34, r * 0.16)
  ctx.lineTo(r * 0.4, r * 0.73)
  ctx.stroke()

  // Blood stains
  ctx.fillStyle = "rgba(145, 0, 0, 0.75)"
  ctx.beginPath()
  ctx.ellipse(-r * 0.19, r * 0.38, r * 0.13, r * 0.07, -0.5, 0, Math.PI * 2)
  ctx.ellipse(r * 0.17, r * 0.59, r * 0.09, r * 0.12, 0.35, 0, Math.PI * 2)
  ctx.fill()

  // Metal apron buckle
  ctx.fillStyle = "#17191c"
  ctx.fillRect(-r * 0.13, r * 0.1, r * 0.26, r * 0.13)
  ctx.strokeStyle = metal
  ctx.lineWidth = r * 0.025
  ctx.strokeRect(-r * 0.13, r * 0.1, r * 0.26, r * 0.13)

  // ARMS 
  ctx.lineCap = "round"

  // Left arm — hanging fist
  ctx.strokeStyle = "#250606"
  ctx.lineWidth = r * 0.21
  ctx.beginPath()
  ctx.moveTo(-r * 0.68, -r * 0.24)
  ctx.lineTo(-r * 0.9, r * 0.24)
  ctx.stroke()

  ctx.strokeStyle = flesh
  ctx.lineWidth = r * 0.15
  ctx.beginPath()
  ctx.moveTo(-r * 0.68, -r * 0.24)
  ctx.lineTo(-r * 0.9, r * 0.24)
  ctx.stroke()

  // Fist
  ctx.fillStyle = "#390909"
  ctx.beginPath()
  ctx.ellipse(-r * 0.92, r * 0.32, r * 0.16, r * 0.18, -0.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "#170303"
  ctx.lineWidth = r * 0.03
  ctx.stroke()

  // Knuckle lines
  ctx.strokeStyle = "#8a2929"
  ctx.lineWidth = r * 0.018
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(-r * (1.01 - i * 0.055), r * 0.26)
    ctx.lineTo(-r * (1.0 - i * 0.055), r * 0.36)
    ctx.stroke()
  }

  // Right arm — gripping the axe
  ctx.strokeStyle = "#220505"
  ctx.lineWidth = r * 0.22
  ctx.beginPath()
  ctx.moveTo(r * 0.65, -r * 0.3)
  ctx.lineTo(r * 0.89, -r * 0.58)
  ctx.stroke()

  ctx.strokeStyle = "#521010"
  ctx.lineWidth = r * 0.15
  ctx.beginPath()
  ctx.moveTo(r * 0.65, -r * 0.3)
  ctx.lineTo(r * 0.89, -r * 0.58)
  ctx.stroke()

  // AXE
  ctx.save()
  ctx.translate(r * 0.9, -r * 0.61 + axeLift)
  ctx.rotate(axeSpin)

  // Long, heavy handle
  ctx.strokeStyle = "#160d09"
  ctx.lineWidth = r * 0.085
  ctx.beginPath()
  ctx.moveTo(0, r * 0.1)
  ctx.lineTo(0, -r * 1.15)
  ctx.stroke()

  ctx.strokeStyle = "#76503a"
  ctx.lineWidth = r * 0.045
  ctx.beginPath()
  ctx.moveTo(-r * 0.015, r * 0.02)
  ctx.lineTo(-r * 0.015, -r * 1.1)
  ctx.stroke()

  // Handle bindings
  ctx.strokeStyle = "#17100d"
  ctx.lineWidth = r * 0.055
  for (let i = 0; i < 4; i++) {
    const hy = -r * (0.18 + i * 0.13)
    ctx.beginPath()
    ctx.moveTo(-r * 0.04, hy)
    ctx.lineTo(r * 0.04, hy - r * 0.035)
    ctx.stroke()
  }

  // Oversized cleaver head
  const blade = ctx.createLinearGradient(-r * 0.65, -r, r * 0.1, -r * 0.65)
  blade.addColorStop(0, "#3b4249")
  blade.addColorStop(0.28, "#c8d0d8")
  blade.addColorStop(0.55, "#f1f5f9")
  blade.addColorStop(0.8, "#727d88")
  blade.addColorStop(1, "#252b31")

  ctx.fillStyle = blade
  ctx.strokeStyle = "#111519"
  ctx.lineWidth = r * 0.045

  ctx.beginPath()
  ctx.moveTo(-r * 0.02, -r * 0.98)
  ctx.lineTo(-r * 0.37, -r * 1.08)
  ctx.lineTo(-r * 0.72, -r * 0.91)
  ctx.lineTo(-r * 0.68, -r * 0.48)
  ctx.lineTo(-r * 0.48, -r * 0.34)
  ctx.lineTo(-r * 0.04, -r * 0.47)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Blade edge
  ctx.strokeStyle = "#f0f3f6"
  ctx.lineWidth = r * 0.025
  ctx.beginPath()
  ctx.moveTo(-r * 0.68, -r * 0.48)
  ctx.lineTo(-r * 0.72, -r * 0.91)
  ctx.lineTo(-r * 0.37, -r * 1.08)
  ctx.stroke()

  // Blood on blade
  ctx.strokeStyle = "#8b0000"
  ctx.lineWidth = r * 0.055
  ctx.beginPath()
  ctx.moveTo(-r * 0.49, -r * 0.88)
  ctx.lineTo(-r * 0.34, -r * 0.73)
  ctx.lineTo(-r * 0.46, -r * 0.63)
  ctx.stroke()

  ctx.restore()

  // HEAD
  const head = ctx.createRadialGradient(
    -r * 0.12, -r * 0.7, r * 0.04,
    0, -r * 0.57, r * 0.47
  )
  head.addColorStop(0, "#6b1a1a")
  head.addColorStop(0.65, "#310808")
  head.addColorStop(1, "#100202")

  ctx.fillStyle = head
  ctx.strokeStyle = "#100202"
  ctx.lineWidth = r * 0.045

  ctx.beginPath()
  ctx.moveTo(-r * 0.35, -r * 0.82)
  ctx.lineTo(-r * 0.29, -r * 1.0)
  ctx.lineTo(-r * 0.1, -r * 1.04)
  ctx.lineTo(r * 0.12, -r * 0.98)
  ctx.lineTo(r * 0.34, -r * 0.8)
  ctx.lineTo(r * 0.31, -r * 0.48)
  ctx.lineTo(r * 0.16, -r * 0.31)
  ctx.lineTo(-r * 0.19, -r * 0.31)
  ctx.lineTo(-r * 0.34, -r * 0.51)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // === EYES ===
  for (const side of [-1, 1]) {
    const ex = side * r * 0.17
    const ey = -r * 0.7

    ctx.fillStyle = "#080101"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.13, r * 0.105, side * -0.18, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = isBerserk ? "#ff00ff" : "#ff1717"
    ctx.shadowBlur = isBerserk ? 25 : 7 + angerGlow * 9

    const eye = ctx.createRadialGradient(
      ex, ey, r * 0.01,
      ex, ey, r * 0.09
    )
    eye.addColorStop(0, "#fff1dc")
    eye.addColorStop(0.3, isBerserk ? "#ff5bff" : "#ff5b36")
    eye.addColorStop(0.7, isBerserk ? "#d000d0" : "#e00000")
    eye.addColorStop(1, isBerserk ? "#510051" : "#510000")

    ctx.fillStyle = eye
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.085, r * 0.06, side * -0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.strokeStyle = "#100202"
    ctx.lineWidth = r * 0.075
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(ex - r * 0.12, ey - r * 0.1)
    ctx.lineTo(ex + r * 0.1, ey - r * 0.045)
    ctx.stroke()
  }

  // JAW / MOUTH
  ctx.fillStyle = "#080101"
  ctx.beginPath()
  ctx.moveTo(-r * 0.23, -r * 0.47)
  ctx.lineTo(r * 0.23, -r * 0.47)
  ctx.lineTo(r * 0.18, -r * 0.28)
  ctx.lineTo(0, -r * 0.23)
  ctx.lineTo(-r * 0.18, -r * 0.28)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = bone
  ctx.strokeStyle = "#55422e"
  ctx.lineWidth = r * 0.012

  for (const dx of [-r * 0.13, 0, r * 0.13]) {
    ctx.beginPath()
    ctx.moveTo(dx - r * 0.035, -r * 0.46)
    ctx.lineTo(dx + r * 0.035, -r * 0.46)
    ctx.lineTo(dx, -r * 0.34)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  for (const dx of [-r * 0.08, r * 0.08]) {
    ctx.beginPath()
    ctx.moveTo(dx - r * 0.03, -r * 0.29)
    ctx.lineTo(dx + r * 0.03, -r * 0.29)
    ctx.lineTo(dx, -r * 0.39)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // LEGS
  ctx.lineCap = "round"
  ctx.strokeStyle = "#190303"
  ctx.lineWidth = r * 0.2

  ctx.beginPath()
  ctx.moveTo(-r * 0.34, r * 0.78)
  ctx.lineTo(-r * 0.45, r * 1.12)
  ctx.moveTo(r * 0.34, r * 0.78)
  ctx.lineTo(r * 0.45, r * 1.12)
  ctx.stroke()

  ctx.strokeStyle = "#4b0d0d"
  ctx.lineWidth = r * 0.12
  ctx.beginPath()
  ctx.moveTo(-r * 0.34, r * 0.79)
  ctx.lineTo(-r * 0.45, r * 1.1)
  ctx.moveTo(r * 0.34, r * 0.79)
  ctx.lineTo(r * 0.45, r * 1.1)
  ctx.stroke()

  // Heavy boots
  ctx.fillStyle = "#171719"
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * r * 0.45, r * 1.02)
    ctx.lineTo(side * r * 0.64, r * 1.13)
    ctx.lineTo(side * r * 0.36, r * 1.17)
    ctx.lineTo(side * r * 0.3, r * 1.08)
    ctx.closePath()
    ctx.fill()
  }

  ctx.lineCap = "butt"

  // MEAT HOOK
  ctx.strokeStyle = "#b3bdc7"
  ctx.lineWidth = r * 0.035
  ctx.beginPath()
  ctx.moveTo(-r * 0.83, -r * 0.08)
  ctx.lineTo(-r * 1.02, -r * 0.08)
  ctx.quadraticCurveTo(-r * 1.19, -r * 0.06, -r * 1.14, r * 0.09)
  ctx.quadraticCurveTo(-r * 1.1, r * 0.19, -r * 0.98, r * 0.15)
  ctx.stroke()

  ctx.strokeStyle = "#eef2f5"
  ctx.lineWidth = r * 0.012
  ctx.beginPath()
  ctx.moveTo(-r * 1.02, -r * 0.07)
  ctx.quadraticCurveTo(-r * 1.14, -r * 0.04, -r * 1.1, r * 0.04)
  ctx.stroke()

  ctx.restore() // end body transform

  // STUNNED: dizzy stars
  if (isStunned) {
    ctx.save()
    const starCount = 4
    for (let i = 0; i < starCount; i++) {
      const angle = (t / 300) + (i / starCount) * Math.PI * 2
      const orbitR = r * 0.5
      const sx = bx + Math.cos(angle) * orbitR
      const sy = by - r * 0.9 + Math.sin(angle) * r * 0.15

      ctx.fillStyle = "#fbbf24"
      ctx.shadowColor = "#fbbf24"
      ctx.shadowBlur = 10

      ctx.beginPath()
      ctx.moveTo(sx, sy - r * 0.08)
      ctx.lineTo(sx + r * 0.03, sy - r * 0.02)
      ctx.lineTo(sx + r * 0.08, sy)
      ctx.lineTo(sx + r * 0.03, sy + r * 0.02)
      ctx.lineTo(sx, sy + r * 0.08)
      ctx.lineTo(sx - r * 0.03, sy + r * 0.02)
      ctx.lineTo(sx - r * 0.08, sy)
      ctx.lineTo(sx - r * 0.03, sy - r * 0.02)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
    }
    ctx.restore()
  }

  // BERSERK: rage particles around body
  if (isBerserk) {
    ctx.save()
    for (let i = 0; i < 50; i++) {
      const pa = t / 200 + (i / 12) * Math.PI * 2
      const pd = r * (1.5 + Math.sin(t / 150 + i) * 0.5)
      const px = bx + Math.cos(pa) * pd
      const py = by + Math.sin(pa) * pd * 0.6

      ctx.fillStyle = `rgba(255, 0, 0, ${0.6 + Math.sin(t / 80 + i) * 0.4})`
      ctx.shadowColor = "#ff0000"
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(px, py, r * 0.05, 0, Math.PI * 6)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    ctx.restore()

    // Skull indicator
    ctx.save()
    ctx.font = "bold 28px Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = "#ff0000"
    ctx.shadowColor = "#ff0000"
    ctx.shadowBlur = 15
    ctx.fillText("💀", bx, by - r * 1.5 + Math.sin(t / 100) * 5)
    ctx.shadowBlur = 0
    ctx.restore()
  }

  // TELEGRAPH LINE (during windup)
  if (isWindup && boss.chargeDirection) {
    ctx.save()
    const telegraphLength = 2000
    ctx.globalAlpha = 0.4 + Math.sin(t / 40) * 0.3
    ctx.strokeStyle = "#ff000080"
    ctx.lineWidth = 10
    ctx.setLineDash([30, 20])
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(
      bx + boss.chargeDirection.x * telegraphLength,
      by + boss.chargeDirection.y * telegraphLength
    )
    ctx.stroke()

    // Arrow at the end
    const endX = bx + boss.chargeDirection.x * telegraphLength
    const endY = by + boss.chargeDirection.y * telegraphLength
    const arrowAngle = Math.atan2(boss.chargeDirection.y, boss.chargeDirection.x)
    const arrowSize = 30

    ctx.setLineDash([])
    ctx.fillStyle = "#ff00006e"
    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - Math.cos(arrowAngle - 0.4) * arrowSize,
      endY - Math.sin(arrowAngle - 0.4) * arrowSize
    )
    ctx.lineTo(
      endX - Math.cos(arrowAngle + 0.4) * arrowSize,
      endY - Math.sin(arrowAngle + 0.4) * arrowSize
    )
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }
}
