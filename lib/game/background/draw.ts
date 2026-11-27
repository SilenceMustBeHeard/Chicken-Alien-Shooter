
import type { Particle, FloatingText } from "@/lib/game/types"


  // Draws the gradient background
 
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
  bgGradient.addColorStop(0, "#0a0a1a")
  bgGradient.addColorStop(1, "#1a0a2a")
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}


 //Draws all particles

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  particles.forEach((particle) => {
    const alpha = particle.life / 30
    ctx.globalAlpha = alpha

    ctx.shadowBlur = 10
    ctx.shadowColor = particle.color

    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
  })
  ctx.globalAlpha = 1
}


 // Draws all floating texts

export function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  floatingTexts: FloatingText[],
): void {
  floatingTexts.forEach((text) => {
    ctx.globalAlpha = text.life / 60
    ctx.font = `bold ${text.fontSize}px Arial`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    ctx.strokeStyle = "#000"
    ctx.lineWidth = 3
    ctx.strokeText(text.text, text.x, text.y)

    ctx.fillStyle = text.color
    ctx.fillText(text.text, text.x, text.y)
  })
  ctx.globalAlpha = 1
}