
import type { Boss, Player } from "@/lib/game/types"

export function drawOmegaPrime(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  _bossTime: number,
  _player: Player,
) {
  ctx.save()

  const r = boss.radius
  const bx = boss.x
  const by = boss.y

  ctx.fillStyle = "#ffff00"
  ctx.beginPath()
  ctx.arc(bx - r * 0.3, by - r * 0.2, r * 0.15, 0, Math.PI * 2)
  ctx.arc(bx + r * 0.3, by - r * 0.2, r * 0.15, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.arc(bx - r * 0.3, by - r * 0.2, r * 0.08, 0, Math.PI * 2)
  ctx.arc(bx + r * 0.3, by - r * 0.2, r * 0.08, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}