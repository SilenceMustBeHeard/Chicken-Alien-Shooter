
import type { Boss, Player } from "@/lib/game/types"

type MantisState =
  | "stalk"
  | "windup"
  | "lunge"
  | "recovery"

export function drawAlienMantis(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime = 0,
  player?: Player,
) {
  const x = boss.x
  const y = boss.y
  const radius = boss.radius

  const state = (boss.mantisState ?? "stalk") as MantisState
  const progress = boss.mantisAttackProgress ?? 0
  const angle = boss.mantisAttackAngle ?? 0

  const time = bossTime / 1000

  const isWindup = state === "windup"
  const isLunging = state === "lunge"
  const isRecovering = state === "recovery"

  const attackIntensity = isWindup
    ? progress
    : isLunging
      ? 1
      : isRecovering
        ? 1 - progress
        : 0

  const movementPulse = Math.sin(time * 9)
  const wingSpeed = isLunging ? 32 : isWindup ? 18 : 12

  const wingFlap = Math.sin(time * wingSpeed)
  const bodyBob = isLunging
    ? Math.sin(progress * Math.PI) * 5
    : Math.sin(time * 7) * 3

  const facingAngle =
    isWindup || isLunging
      ? angle
      : player
        ? Math.atan2(player.y - y, player.x - x)
        : 0

  ctx.save()
  ctx.translate(x, y + bodyBob)
  ctx.rotate(facingAngle)


  // AURA


  const auraRadius = radius * (
    isLunging ? 2.1 : isWindup ? 1.8 : 1.45
  )

  const aura = ctx.createRadialGradient(
    0, 0, radius * 0.2,
    0, 0, auraRadius,
  )

  aura.addColorStop(0, "rgba(132, 204, 22, 0.22)")
  aura.addColorStop(0.55, "rgba(101, 163, 13, 0.10)")
  aura.addColorStop(1, "rgba(101, 163, 13, 0)")

  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2)
  ctx.fill()


  // WINGS


  const wingSpread = isLunging ? 1.5 : 1
  const wingFold = isRecovering ? 0.55 : 1

  for (const side of [-1, 1]) {
    ctx.save()

    ctx.translate(-8, side * 13)
    ctx.rotate(
      side * (
        0.35 +
        wingFlap * 0.32 * wingSpread * wingFold
      ),
    )

    ctx.scale(1, side)

    ctx.fillStyle = "rgba(101, 163, 13, 0.22)"
    ctx.strokeStyle = "#84cc16"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-22, -38, -72 * wingSpread, -45)
    ctx.quadraticCurveTo(-55, -12, -35, 4)
    ctx.quadraticCurveTo(-18, 16, 0, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Wing veins.
    ctx.strokeStyle = "rgba(190, 242, 100, 0.7)"
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(-58 * wingSpread, -39)
    ctx.moveTo(-12, 3)
    ctx.lineTo(-48 * wingSpread, -12)
    ctx.moveTo(-22, 5)
    ctx.lineTo(-39 * wingSpread, -30)
    ctx.stroke()

    ctx.restore()
  }


  // ABDOMEN
 

  ctx.save()
  ctx.translate(-radius * 0.8, 0)
  ctx.rotate(-0.15 + movementPulse * 0.04)

  const abdomenGradient = ctx.createLinearGradient(
    -radius * 1.2,
    0,
    radius * 0.4,
    0,
  )

  abdomenGradient.addColorStop(0, "#365314")
  abdomenGradient.addColorStop(0.5, "#65a30d")
  abdomenGradient.addColorStop(1, "#a3e635")

  ctx.fillStyle = abdomenGradient
  ctx.strokeStyle = "#1a2e05"
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.ellipse(
    -radius * 0.25,
    0,
    radius * 0.85,
    radius * 0.48,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.stroke()

  // Abdomen segments
  ctx.strokeStyle = "rgba(26, 46, 5, 0.65)"
  ctx.lineWidth = 2

  for (let i = 0; i < 4; i++) {
    const segmentX = -radius * 0.8 + i * radius * 0.32

    ctx.beginPath()
    ctx.moveTo(segmentX, -radius * 0.36)
    ctx.quadraticCurveTo(
      segmentX - 4,
      0,
      segmentX,
      radius * 0.36,
    )
    ctx.stroke()
  }

  // Stinger.
  ctx.fillStyle = "#bef264"
  ctx.strokeStyle = "#365314"
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(-radius * 1.05, 0)
  ctx.lineTo(-radius * 1.65, -radius * 0.13)
  ctx.lineTo(-radius * 1.42, 0)
  ctx.lineTo(-radius * 1.65, radius * 0.13)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()


  // LEGS


  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const legOffset = i * 17

      const legSwing = Math.sin(
        time * 12 + i * 1.8 + side,
      ) * (isLunging ? 13 : 7)

      ctx.strokeStyle = "#4d7c0f"
      ctx.lineWidth = 5
      ctx.lineCap = "round"

      ctx.beginPath()
      ctx.moveTo(-10 - legOffset, side * 10)
      ctx.lineTo(-24 - legOffset, side * (25 + legSwing))
      ctx.lineTo(-42 - legOffset, side * (31 + legSwing))
      ctx.stroke()

      ctx.strokeStyle = "#bef264"
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(-42 - legOffset, side * (31 + legSwing))
      ctx.lineTo(-48 - legOffset, side * (36 + legSwing))
      ctx.stroke()
    }
  }


  // THORAX


  const thoraxGradient = ctx.createLinearGradient(
    -radius * 0.5,
    -radius,
    radius * 0.5,
    radius,
  )

  thoraxGradient.addColorStop(0, "#bef264")
  thoraxGradient.addColorStop(0.45, "#65a30d")
  thoraxGradient.addColorStop(1, "#365314")

  ctx.fillStyle = thoraxGradient
  ctx.strokeStyle = "#1a2e05"
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.ellipse(
    0,
    0,
    radius * 0.68,
    radius * 0.5,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.stroke()

  // Chest highlight
  ctx.strokeStyle = "rgba(217, 249, 157, 0.7)"
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.3, -1.1, 1.1)
  ctx.stroke()


  // SCYTHE ARMS


  const drawScythe = (
    side: number,
    isFront: boolean,
  ) => {
    ctx.save()

    const baseX = radius * 0.2
    const baseY = side * radius * 0.3

    ctx.translate(baseX, baseY)

    const windupPull = isWindup
      ? progress * 0.55
      : 0

    const strikeExtension = isLunging
      ? 0.25 + Math.sin(progress * Math.PI) * 0.15
      : isRecovering
        ? -progress * 0.12
        : 0

    const armAngle =
      side * (
        (isFront ? 0.95 : 0.75) +
        windupPull -
        strikeExtension
      )

    ctx.rotate(armAngle)

    // Upper arm
    ctx.strokeStyle = "#4d7c0f"
    ctx.lineWidth = 10
    ctx.lineCap = "round"

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(18, side * 16)
    ctx.lineTo(37, side * 23)
    ctx.stroke()

    // Arm armor
    ctx.fillStyle = "#a3e635"
    ctx.strokeStyle = "#365314"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(18, side * 16, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Scythe blade
    const bladeLength = radius * (
      isLunging ? 1.35 : 1.15
    )

    const bladeGradient = ctx.createLinearGradient(
      25, 0,
      bladeLength, side * 20,
    )

    bladeGradient.addColorStop(0, "#84cc16")
    bladeGradient.addColorStop(0.5, "#d9f99d")
    bladeGradient.addColorStop(1, "#f7fee7")

    ctx.fillStyle = bladeGradient
    ctx.strokeStyle = "#3f6212"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(32, side * 18)
    ctx.quadraticCurveTo(
      bladeLength * 0.7,
      side * 35,
      bladeLength,
      side * 8,
    )
    ctx.quadraticCurveTo(
      bladeLength * 0.68,
      side * 22,
      32,
      side * 18,
    )
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Blade inner edge
    ctx.strokeStyle = "rgba(255, 255, 220, 0.9)"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(38, side * 16)
    ctx.quadraticCurveTo(
      bladeLength * 0.65,
      side * 26,
      bladeLength * 0.96,
      side * 9,
    )
    ctx.stroke()

    ctx.restore()
  }

  drawScythe(-1, false)
  drawScythe(1, true)


  // HEAD


  ctx.save()
  ctx.translate(radius * 0.55, 0)

  ctx.fillStyle = "#65a30d"
  ctx.strokeStyle = "#1a2e05"
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.moveTo(radius * 0.55, 0)
  ctx.lineTo(radius * 0.25, -radius * 0.48)
  ctx.lineTo(-radius * 0.25, -radius * 0.4)
  ctx.lineTo(-radius * 0.38, 0)
  ctx.lineTo(-radius * 0.25, radius * 0.4)
  ctx.lineTo(radius * 0.25, radius * 0.48)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Compound eyes
  for (const side of [-1, 1]) {
    const eyeGlow = ctx.createRadialGradient(
      radius * 0.12,
      side * radius * 0.2,
      1,
      radius * 0.12,
      side * radius * 0.2,
      12,
    )

    eyeGlow.addColorStop(0, "#ffffff")
    eyeGlow.addColorStop(0.35, "#d9f99d")
    eyeGlow.addColorStop(1, "#65a30d")

    ctx.fillStyle = eyeGlow

    ctx.beginPath()
    ctx.ellipse(
      radius * 0.12,
      side * radius * 0.2,
      11,
      14,
      side * 0.3,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    ctx.fillStyle = "#1a2e05"

    ctx.beginPath()
    ctx.arc(
      radius * 0.16,
      side * radius * 0.2,
      3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  // Mandibles
  ctx.strokeStyle = "#365314"
  ctx.lineWidth = 4

  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(radius * 0.25, side * radius * 0.28)
    ctx.lineTo(radius * 0.5, side * radius * 0.4)
    ctx.lineTo(radius * 0.42, side * radius * 0.53)
    ctx.stroke()
  }

  // Antennae
  ctx.strokeStyle = "#84cc16"
  ctx.lineWidth = 2

  for (const side of [-1, 1]) {
    const antennaWave = Math.sin(time * 8 + side) * 5

    ctx.beginPath()
    ctx.moveTo(-radius * 0.1, side * radius * 0.35)
    ctx.quadraticCurveTo(
      radius * 0.1,
      side * (radius * 0.85 + antennaWave),
      radius * 0.5,
      side * (radius * 0.9 + antennaWave),
    )
    ctx.stroke()

    ctx.fillStyle = "#d9f99d"

    ctx.beginPath()
    ctx.arc(
      radius * 0.5,
      side * (radius * 0.9 + antennaWave),
      3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  ctx.restore()


  // ATTACK ENERGY


  if (isWindup || isLunging) {
    ctx.save()

    ctx.globalAlpha = isWindup
      ? 0.25 + progress * 0.5
      : 0.75

    ctx.strokeStyle = "#bef264"
    ctx.lineWidth = isLunging ? 4 : 2

    const energyLength = radius * (
      isLunging ? 2.3 : 1.5
    )

    ctx.beginPath()
    ctx.arc(
      0,
      0,
      energyLength,
      -0.5,
      0.5,
    )
    ctx.stroke()

    if (isLunging) {
      ctx.strokeStyle = "rgba(217, 249, 157, 0.7)"
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(-radius * 1.5, -radius * 0.5)
      ctx.lineTo(-radius * 2.6, -radius * 0.8)
      ctx.moveTo(-radius * 1.5, radius * 0.5)
      ctx.lineTo(-radius * 2.6, radius * 0.8)
      ctx.stroke()
    }

    ctx.restore()
  }


  // RECOVERY 


  if (isRecovering) {
    ctx.save()

    ctx.globalAlpha = 0.5 * (1 - progress)
    ctx.strokeStyle = "#d9f99d"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(
      0,
      0,
      radius * (1.5 + progress * 0.5),
      0,
      Math.PI * 2,
    )
    ctx.stroke()

    ctx.restore()
  }

  ctx.restore()
}
