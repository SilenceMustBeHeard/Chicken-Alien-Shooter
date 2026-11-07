
import type { Boss, Player } from "@/lib/game/types"

export function drawAlienOctopus(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  bossTime: number,
  _player: Player,
) {
  const r = boss.radius
  const time = bossTime / 300
  const pulse = 1 + Math.sin(time * 0.8) * 0.025
  const sway = Math.sin(time) * 0.08

  ctx.save()

 //  AURA

  const aura = ctx.createRadialGradient(
    boss.x, boss.y, r * 0.3,
    boss.x, boss.y + r * 0.3, r * 1.8
  )
  aura.addColorStop(0, "rgba(89, 28, 135, 0.54)")
  aura.addColorStop(0.6, "rgba(157, 23, 77, 0.47)")
  aura.addColorStop(1, "rgba(30, 5, 40, 0)")

  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(boss.x, boss.y, r * 1.8, 0, Math.PI * 2)
  ctx.fill()

 
  // TENTACLES

  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1
    const index = i < 4 ? i : i - 4
    const spread = (index - 1.5) / 1.5

    const baseX = boss.x + side * r * (0.12 + index * 0.13)
    const baseY = boss.y + r * 0.48

    const length = r * (1.05 + (3 - index) * 0.13)
    const phase = time * 1.4 + i * 1.15

    const wave = Math.sin(phase) * r * 0.24
    const wave2 = Math.sin(phase * 0.7 + 1) * r * 0.12

    const endX = baseX + side * r * (0.25 + index * 0.10) + wave
    const endY = baseY + length

    const c1x = baseX + side * r * 0.12 + wave2
    const c1y = baseY + length * 0.35

    const c2x = endX - side * r * 0.18 + wave
    const c2y = baseY + length * 0.72

    // Cubic bezier sampler
  const pointAt = (t: number) => {
      const mt = 1 - t
      return {
        x: mt * mt * mt * baseX +
          3 * mt * mt * t * c1x +
          3 * mt * t * t * c2x +
          t * t * t * endX,
        y: mt * mt * mt * baseY +
          3 * mt * mt * t * c1y +
          3 * mt * t * t * c2y +
          t * t * t * endY
      }
    }

    // Draw a genuinely tapered tentacle from short segments
  const segments = 12


    for (let j = 0; j < segments; j++) {
      const t0 = j / segments
      const t1 = (j + 1) / segments
      const p0 = pointAt(t0)
      const p1 = pointAt(t1)

      const width0 = r * (0.19 * (1 - t0) + 0.025)
      const width1 = r * (0.19 * (1 - t1) + 0.025)

      // Dark armored outline
      ctx.strokeStyle = "#300b40"
      ctx.lineWidth = width0 + r * 0.055
      ctx.lineCap = "round"

      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()

      // Main tentacle gradient
  ctx.strokeStyle = "#a01860" 
ctx.lineWidth = (width0 + width1) / 2
ctx.beginPath()
ctx.moveTo(p0.x, p0.y)
ctx.lineTo(p1.x, p1.y)
ctx.stroke()

      // Thin bioluminescent ridge
      ctx.strokeStyle = "rgba(249, 168, 212, 0.65)"
      ctx.lineWidth = Math.max(r * 0.012, width0 * 0.12)
      ctx.beginPath()
      ctx.moveTo(p0.x - r * 0.025, p0.y)
      ctx.lineTo(p1.x - r * 0.025, p1.y)
      ctx.stroke()
    }

    // Suction cups along the inner side
   for (let s = 0; s < 3; s++) {
  const t = 0.28 + s * 0.18
      const p = pointAt(t)
      const cupR = r * (0.052 * (1 - t * 0.45))

      // Cup shadow
      ctx.fillStyle = "#4a103d"
      ctx.beginPath()
      ctx.arc(p.x, p.y, cupR * 1.3, 0, Math.PI * 2)
      ctx.fill()

      // Pink outer ring
      ctx.fillStyle = "#f9a8d4"
      ctx.beginPath()
      ctx.arc(p.x, p.y, cupR, 0, Math.PI * 2)
      ctx.fill()

      // Dark center
      ctx.fillStyle = "#8b1c63"
      ctx.beginPath()
      ctx.arc(p.x, p.y, cupR * 0.52, 0, Math.PI * 2)
      ctx.fill()

      // Small wet highlight
      ctx.fillStyle = "#fff1f7"
      ctx.beginPath()
      ctx.arc(
        p.x - cupR * 0.2,
        p.y - cupR * 0.25,
        cupR * 0.18,
        0, Math.PI * 2
      )
      ctx.fill()
    }

    // Sharp tip
    const tip = pointAt(1)
    ctx.fillStyle = "#f472b6"
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, r * 0.032, 0, Math.PI * 2)
    ctx.fill()
  }


  // HEAD SHADOW
 
  ctx.fillStyle = "rgba(12, 3, 25, 0.5)"
  ctx.beginPath()
  ctx.ellipse(
    boss.x, boss.y + r * 0.2,
    r * 0.92, r * 1.03, 0, 0, Math.PI * 2
  )
  ctx.fill()


  // 4. MANTLE - DISTINCT OCTOPUS HEAD
 

  ctx.save()
  ctx.translate(boss.x, boss.y - r * 0.13)
  ctx.scale(0.88 * pulse, 1.04 * pulse)

  const headGrad = ctx.createRadialGradient(
    -r * 0.25, -r * 0.48, r * 0.08,
    0, 0, r * 1.2
  )
  headGrad.addColorStop(0, "#fbcfe8")
  headGrad.addColorStop(0.22, "#f472b6")
  headGrad.addColorStop(0.52, "#c02678")
  headGrad.addColorStop(0.78, "#831843")
  headGrad.addColorStop(1, "#310b40")

  // Outer mantle
  ctx.fillStyle = "#310b40"
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.08)
  ctx.bezierCurveTo(
    r * 0.55, -r * 1.03,
    r * 0.94, -r * 0.55,
    r * 0.91, -r * 0.06
  )
  ctx.bezierCurveTo(
    r * 0.91, r * 0.40,
    r * 0.54, r * 0.72,
    r * 0.26, r * 0.77
  )
  ctx.lineTo(-r * 0.26, r * 0.77)
  ctx.bezierCurveTo(
    -r * 0.54, r * 0.72,
    -r * 0.91, r * 0.40,
    -r * 0.91, -r * 0.06
  )
  ctx.bezierCurveTo(
    -r * 0.94, -r * 0.55,
    -r * 0.55, -r * 1.03,
    0, -r * 1.08
  )
  ctx.closePath()
  ctx.fill()

  // Main skin
  ctx.fillStyle = headGrad
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.02)
  ctx.bezierCurveTo(
    r * 0.50, -r * 0.99,
    r * 0.84, -r * 0.53,
    r * 0.82, -r * 0.10
  )
  ctx.bezierCurveTo(
    r * 0.82, r * 0.35,
    r * 0.48, r * 0.66,
    r * 0.23, r * 0.69
  )
  ctx.lineTo(-r * 0.23, r * 0.69)
  ctx.bezierCurveTo(
    -r * 0.48, r * 0.66,
    -r * 0.82, r * 0.35,
    -r * 0.82, -r * 0.10
  )
  ctx.bezierCurveTo(
    -r * 0.84, -r * 0.53,
    -r * 0.50, -r * 0.99,
    0, -r * 1.02
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

  // Organic skin markings
 for (let i = 0; i < 6; i++) {
    const a = i * 2.399
    const dist = r * (0.22 + (i % 4) * 0.105)
    const x = Math.cos(a) * dist * 0.76
    const y = Math.sin(a) * dist * 0.76 - r * 0.12

    ctx.fillStyle = i % 3 === 0
      ? "rgba(255, 190, 230, 0.65)"
      : "rgba(75, 8, 54, 0.35)"

    ctx.beginPath()
    ctx.ellipse(
      x, y,
      r * 0.035, r * 0.052,
      a, 0, Math.PI * 2
    )
    ctx.fill()
  }

  ctx.restore()


  //  EYE SOCKETS

  for (const side of [-1, 1]) {
    const ex = boss.x + side * r * 0.40
    const ey = boss.y - r * 0.20

    // Raised socket
    const socketGrad = ctx.createRadialGradient(
      ex - side * r * 0.04, ey - r * 0.06, r * 0.02,
      ex, ey, r * 0.31
    )
    socketGrad.addColorStop(0, "#fbcfe8")
    socketGrad.addColorStop(0.7, "#be185d")
    socketGrad.addColorStop(1, "#500b40")

    ctx.fillStyle = socketGrad
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.30, r * 0.34, side * 0.12, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#4a103d"
    ctx.lineWidth = r * 0.045
    ctx.stroke()

    // Dark eye
    ctx.fillStyle = "#17051f"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.225, r * 0.245, 0, 0, Math.PI * 2)
    ctx.fill()

    // Golden iris glow
    ctx.save()
    ctx.shadowColor = "#facc15"
    ctx.shadowBlur = r * (0.18 + Math.sin(time * 2) * 0.025)

    const iris = ctx.createRadialGradient(
      ex - r * 0.035, ey - r * 0.045, r * 0.01,
      ex, ey, r * 0.19
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

    // Predator slit
    ctx.fillStyle = "#16051b"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.038, r * 0.135, 0, 0, Math.PI * 2)
    ctx.fill()

    // Reflection
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(
      ex - side * r * 0.065,
      ey - r * 0.075,
      r * 0.035, 0, Math.PI * 2
    )
    ctx.fill()
  }


  // 6. HEAVY BROW RIDGES
  
    for (const side of [-1, 1]) {
    ctx.lineCap = "round"

    ctx.strokeStyle = "#500b40"
    ctx.lineWidth = r * 0.12
    ctx.beginPath()
    ctx.moveTo(boss.x + side * r * 0.12, boss.y - r * 0.51)
    ctx.quadraticCurveTo(
      boss.x + side * r * 0.38,
      boss.y - r * 0.63,
      boss.x + side * r * 0.65,
      boss.y - r * 0.43
    )
    ctx.stroke()

    ctx.strokeStyle = "#f9a8d4"
    ctx.lineWidth = r * 0.023
    ctx.beginPath()
    ctx.moveTo(boss.x + side * r * 0.20, boss.y - r * 0.51)
    ctx.quadraticCurveTo(
      boss.x + side * r * 0.42,
      boss.y - r * 0.57,
      boss.x + side * r * 0.58,
      boss.y - r * 0.44
    )
    ctx.stroke()
  }

  ctx.lineCap = "butt"

  
  // BEAK 
 
  const beakY = boss.y + r * 0.29

  const beakGrad = ctx.createLinearGradient(
    boss.x - r * 0.12, beakY,
    boss.x + r * 0.12, beakY + r * 0.35
  )
  beakGrad.addColorStop(0, "#a78bfa")
  beakGrad.addColorStop(0.35, "#3b0764")
  beakGrad.addColorStop(1, "#10051b")

  ctx.fillStyle = "#26082e"
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.21, beakY)
  ctx.quadraticCurveTo(
    boss.x, beakY - r * 0.07,
    boss.x + r * 0.21, beakY
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

  // Beak highlight
  ctx.strokeStyle = "#d8b4fe"
  ctx.lineWidth = r * 0.018
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.10, beakY + r * 0.04)
  ctx.lineTo(boss.x, beakY + r * 0.12)
  ctx.stroke()

 
  // SMALL GLOWING CROWN NODES

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