
import type { Boss, Player } from "@/lib/game/types"

const CYCLE_DURATION = 3800
const WINDUP_START = 2000
const DASH_START = 2700
const DASH_END = 3300
const VISUAL_SCALE = 1.5

function getEnrageLevel(boss: Boss): number {
  const ratio = boss.health / boss.maxHealth

  if (ratio < 0.33) return 3
  if (ratio < 0.5) return 2
  if (ratio < 0.7) return 1

  return 0
}

function drawFleshTooth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  length: number,
  direction: number,
  rotation = 0,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)

  const gradient = ctx.createLinearGradient(0, 0, 0, direction * length)
  gradient.addColorStop(0, "#fff4d4")
  gradient.addColorStop(0.55, "#d9c4a0")
  gradient.addColorStop(1, "#82634e")

  ctx.fillStyle = gradient
  ctx.strokeStyle = "#4a100d"
  ctx.lineWidth = 1.2

  ctx.beginPath()
  ctx.moveTo(-width / 2, 0)
  ctx.quadraticCurveTo(
    -width * 0.35,
    direction * length * 0.6,
    0,
    direction * length,
  )
  ctx.quadraticCurveTo(
    width * 0.35,
    direction * length * 0.6,
    width / 2,
    0,
  )
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawTumorLobe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  color: string,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)

  const gradient = ctx.createRadialGradient(
    -radiusX * 0.3,
    -radiusY * 0.35,
    radiusX * 0.05,
    0,
    0,
    radiusX,
  )

  gradient.addColorStop(0, "#e65b48")
  gradient.addColorStop(0.45, color)
  gradient.addColorStop(1, "#4a0b0a")

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "rgba(65, 5, 5, 0.7)"
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

export function drawDevourer(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  player: Player,
): void {
  const r = boss.radius
  const t = bossTime
  const x = boss.x
  const y = boss.y

  const angle = Math.atan2(player.y - y, player.x - x)
  const cyclePhase = (boss.spawnTimer ?? 0) % CYCLE_DURATION

  const isWindup = cyclePhase >= WINDUP_START && cyclePhase < DASH_START
  const isDashing = cyclePhase >= DASH_START && cyclePhase < DASH_END

  const enrage = getEnrageLevel(boss)

  const pulse = 1 + Math.sin(t / 230) * 0.035
  const breathing = 1 + Math.sin(t / 170) * 0.025

  // The entire front of the tumor opens like a monstrous Pac-Man.
  const idleMouth = 0.88 + Math.sin(t / 220) * 0.055
  const windupMouth = 1.38 + Math.sin(t / 55) * 0.06
  const dashMouth = 1.72 + Math.sin(t / 45) * 0.045

const mouthCycle = (Math.sin(bossTime / 260) + 1) / 2

let mouthOpen = 0.12 + mouthCycle * 0.22

if (cyclePhase >= WINDUP_START && cyclePhase < DASH_START) {
  mouthOpen = 0.55 + mouthCycle * 0.35
} else if (cyclePhase >= DASH_START && cyclePhase < DASH_END) {
  mouthOpen = 0.85 + mouthCycle * 0.15
}

  const angerGlow = isDashing ? 1 : isWindup ? 0.8 : 0.3 + enrage * 0.12



  // WINDUP TELEGRAPH

  if (isWindup && boss.chargeDirection) {
    const direction = boss.chargeDirection
    const warningPulse = 0.35 + Math.sin(t / 55) * 0.22

    ctx.save()
    ctx.globalAlpha = warningPulse
    ctx.strokeStyle = "#ff1717"
    ctx.lineWidth = 6
    ctx.lineCap = "round"
    ctx.setLineDash([20, 15])

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(
      x + direction.x * r * 6,
      y + direction.y * r * 6,
    )
    ctx.stroke()

    ctx.setLineDash([])
    ctx.restore()
  }

  // THE DEVOURER
  // Local +X points toward the player.

  ctx.save()
ctx.translate(x, y)
ctx.rotate(angle)
ctx.scale(
  pulse * VISUAL_SCALE,
  pulse * VISUAL_SCALE,
)

  const recoil = isWindup
    ? Math.sin(t / 42) * r * 0.035
    : isDashing
      ? -r * 0.055
      : 0

  ctx.translate(-recoil, 0)

  // Irregular tumor silhouette.
  // Several overlapping lobes break the perfect-circle shape.

  drawTumorLobe(
    ctx,
    -r * 0.12,
    0,
    r * 0.91 * breathing,
    r * 0.9,
    0,
    "#a51e19",
  )

  drawTumorLobe(ctx, -r * 0.52, -r * 0.48, r * 0.34, r * 0.3, -0.6, "#841713")
  drawTumorLobe(ctx, -r * 0.58, r * 0.43, r * 0.32, r * 0.29, 0.55, "#8e1914")
  drawTumorLobe(ctx, -r * 0.05, -r * 0.78, r * 0.28, r * 0.2, 0.1, "#a9231c")
  drawTumorLobe(ctx, -r * 0.08, r * 0.77, r * 0.3, r * 0.2, -0.1, "#8d1713")

  // Small organic nodules along the rear edge.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.55 + (i / 6) * Math.PI * 0.9
    const distance = r * (0.78 + Math.sin(i * 4.2) * 0.06)

    drawTumorLobe(
      ctx,
      Math.cos(a) * distance - r * 0.05,
      Math.sin(a) * distance,
      r * (0.12 + (i % 3) * 0.025),
      r * (0.1 + (i % 2) * 0.025),
      a,
      "#76130f",
    )
  }

  // MOUTH

  

  const jawAngle = mouthOpen * 0.85
  const hingeX = -r * 0.38
  const hingeY = 0
 const mouthLength = r * 1.18

  const upperTipX = hingeX + Math.cos(-jawAngle) * mouthLength
  const upperTipY = Math.sin(-jawAngle) * mouthLength

  const lowerTipX = hingeX + Math.cos(jawAngle) * mouthLength
  const lowerTipY = Math.sin(jawAngle) * mouthLength

  // Deep mouth cavity.
  const cavity = ctx.createRadialGradient(
    r * 0.35, 0, r * 0.05,
    r * 0.5, 0, r * 0.9,
  )

  cavity.addColorStop(0, "#000000")
  cavity.addColorStop(0.55, "#080101")
  cavity.addColorStop(0.82, "#300605")
  cavity.addColorStop(1, "#74120d")

  ctx.fillStyle = cavity
  ctx.beginPath()
  ctx.moveTo(hingeX, -r * 0.04)
  ctx.quadraticCurveTo(r * 0.25, -r * 0.2, upperTipX, upperTipY)
  ctx.quadraticCurveTo(r * 1.15, 0, lowerTipX, lowerTipY)
  ctx.quadraticCurveTo(r * 0.25, r * 0.2, hingeX, r * 0.04)
  ctx.closePath()
  ctx.fill()

  // Throat.
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.ellipse(
    r * 0.48,
    0,
    r * 0.24,
    Math.max(r * 0.07, Math.sin(jawAngle) * r * 0.2),
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  // Thick, curved upper lip.
  ctx.strokeStyle = "#c52c24"
  ctx.lineWidth = r * 0.2
  ctx.lineCap = "round"

  ctx.beginPath()
  ctx.moveTo(hingeX, 0)
  ctx.quadraticCurveTo(
    r * 0.12,
    -r * 0.3,
    upperTipX,
    upperTipY,
  )
  ctx.stroke()

  // Thick, curved lower lip.
  ctx.beginPath()
  ctx.moveTo(hingeX, 0)
  ctx.quadraticCurveTo(
    r * 0.12,
    r * 0.3,
    lowerTipX,
    lowerTipY,
  )
  ctx.stroke()

  ctx.lineCap = "butt"

  // Irregular teeth follow the curved mouth edges.
  for (let i = 0; i < 10; i++) {
    const progress = (i + 1) / 11
    const distance = mouthLength * progress

    const upperAngle = -jawAngle * progress
    const lowerAngle = jawAngle * progress

    const toothX = hingeX + Math.cos(upperAngle) * distance
    const upperY = Math.sin(upperAngle) * distance
    const lowerY = Math.sin(lowerAngle) * distance

    const size = r * (0.12 + (i % 3) * 0.025)

    drawFleshTooth(
      ctx,
      toothX,
      upperY,
      size,
      size * 1.65,
      1,
      -upperAngle * 0.7,
    )

    drawFleshTooth(
      ctx,
      toothX,
      lowerY,
      size,
      size * 1.65,
      -1,
      lowerAngle * 0.7,
    )
  }

  // Two enormous front fangs.
  drawFleshTooth(
    ctx,
    upperTipX * 0.88,
    upperTipY * 0.88,
    r * 0.2,
    r * 0.36,
    1,
    -jawAngle * 0.5,
  )

  drawFleshTooth(
    ctx,
    lowerTipX * 0.88,
    lowerTipY * 0.88,
    r * 0.2,
    r * 0.36,
    -1,
    jawAngle * 0.5,
  )

  // DETAILS

  // Organic folds around the mouth.
  ctx.strokeStyle = "#5d0c0a"
  ctx.lineWidth = r * 0.045

  for (let i = 0; i < 5; i++) {
    const sy = (i - 2) * r * 0.22

    ctx.beginPath()
    ctx.moveTo(-r * 0.7, sy)
    ctx.bezierCurveTo(
      -r * 0.5,
      sy - r * 0.12,
      -r * 0.38,
      sy + r * 0.12,
      -r * 0.22,
      sy * 0.75,
    )
    ctx.stroke()
  }

  // Pulsating red veins.
  ctx.save()
  ctx.globalAlpha = 0.45 + angerGlow * 0.25
  ctx.strokeStyle = "#ff5036"
  ctx.lineWidth = r * 0.025

  for (let i = 0; i < 5; i++) {
    const sy = (i - 2) * r * 0.28

    ctx.beginPath()
    ctx.moveTo(-r * 0.75, sy)
    ctx.lineTo(-r * 0.57, sy - r * 0.1)
    ctx.lineTo(-r * 0.43, sy + r * 0.04)
    ctx.lineTo(-r * 0.25, sy - r * 0.13)
    ctx.stroke()
  }

  ctx.restore()

  // Enrage makes the flesh look like it is splitting open.

  if (enrage > 0 || isDashing) {
    ctx.save()
    ctx.globalAlpha = 0.35 + angerGlow * 0.3
    ctx.strokeStyle = "#ff3018"
    ctx.lineWidth = r * 0.035

    ctx.beginPath()
    ctx.ellipse(-r * 0.1, 0, r * 0.9, r * 0.88, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }

  ctx.restore()
}
