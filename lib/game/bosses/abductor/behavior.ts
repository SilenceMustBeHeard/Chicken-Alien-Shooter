import type { Boss, BossType, Player } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawAbductor } from "./draw"

const FIELD_RADIUS = 380
const FIELD_MIN_DPS = 10
const FIELD_MAX_DPS = 50

const SPAWN_INTERVAL = 3000
const SPAWN_COUNT = 3

const CENTER_HEIGHT = 0.2
const CENTER_SPEED = 2

const FIELD_PULL_MIN = 0.2
const FIELD_PULL_MAX = 6.2

export const abductorBehavior: BossBehavior = {
  type: "abductor" as BossType,

  getStats(): BossStats {
    return {
      health: 220,
      radius: 58,
      speed: 1,
    }
  },

  create(canvasWidth: number, canvasHeight: number): Boss {
    return {
      type: "abductor",
      x: canvasWidth / 2,
      y: -80,
      radius: 58,
      health: 220,
      maxHealth: 220,
      speed: 1,
      spawnTimer: 0,
      reaperShootTimer: 0,
      combatTimer: 0,
      plagueTimer: 0,
      abductorTargetY: canvasHeight * CENTER_HEIGHT,
    }
  },

  update(boss: Boss, ctx: BossContext): void {
    const {
      player,
      deltaTime,
      enemies,
    } = ctx

    const dt = Math.min(deltaTime, 50)
    const frameScale = dt / 16.67

    //  MOVE TO CENTER

   const targetY = boss.abductorTargetY ?? boss.y

    if (boss.y < targetY) {
      boss.y = Math.min(
        targetY,
        boss.y + boss.speed * CENTER_SPEED * frameScale,
      )
    } else {
      //  HOVER MOVEMENT

      const time = Date.now()

      boss.x += Math.sin(time / 1000) * 2 * frameScale
      boss.y += Math.cos(time / 1500) * frameScale

      // SPAWN ALIEN WAVES

      boss.spawnTimer = (boss.spawnTimer ?? 0) + dt

     if (boss.spawnTimer >= SPAWN_INTERVAL) {
  const time = Date.now()

  for (let i = 0; i < SPAWN_COUNT; i++) {
    const angle =
      (Math.PI * 2 * i) / SPAWN_COUNT + time / 1000

    enemies.spawn({
      type: "grunt",
      x: boss.x + Math.cos(angle) * 60,
      y: boss.y + Math.sin(angle) * 60,
      speed: 0.8,
      health: 2,
      radius: 10,
      color: "#a3e635",
    })
  }

  boss.spawnTimer = 0

  ctx.audio.play(500, 0.2, "sine")
  ctx.particles.burst(boss.x, boss.y, "#00ffc8", 12)
}
    }

 // TRACTOR FIELD

const dx = boss.x - player.x
const dy = boss.y - player.y
const distance = Math.sqrt(dx * dx + dy * dy)

if (distance > 0 && distance < FIELD_RADIUS) {
  // 0 = outer edge, 1 = directly beside the UFO
  const proximity = 1 - distance / FIELD_RADIUS

  // Pull becomes stronger the closer the player gets.
  const pullStrength =
    FIELD_PULL_MIN +
    (FIELD_PULL_MAX - FIELD_PULL_MIN) * proximity

  const directionX = dx / distance
  const directionY = dy / distance

  player.x += directionX * pullStrength * frameScale
  player.y += directionY * pullStrength * frameScale

  // Damage scales from 10 to 50 HP per second.
  const damagePerSecond =
    FIELD_MIN_DPS +
    (FIELD_MAX_DPS - FIELD_MIN_DPS) * proximity

  ctx.damagePlayer(
    damagePerSecond * (dt / 1000),
    "abductor",
  )
}
  },

  draw(
    ctx: CanvasRenderingContext2D,
    boss: Boss,
    bossTime: number,
    player: Player,
  ): void {
    drawAbductor(ctx, boss, bossTime, player)
  },
}