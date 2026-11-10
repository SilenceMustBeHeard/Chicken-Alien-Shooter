
import type { Boss, BossType, Player } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawQueenXenoHen } from "./draw"

const ORBIT_RADIUS = 180
const ORBIT_SPEED = 1500
const ENRAGE_ORBIT_SPEED = 1050

const HEAL_INTERVAL = 10
const HEAL_AMOUNT = 10
const MAX_BUFFED_ENEMY_SPEED = 2.5

const SHOOT_INTERVAL = 1500
const ENRAGE_SHOOT_INTERVAL = 1000
const SHOT_SPREAD = 0.2
const SHOT_SPEED = 4.5
const ENRAGE_SHOT_SPEED = 5.5
const SHOT_DAMAGE = 10
const ENRAGE_SHOT_DAMAGE = 9

const BUFF_RADIUS = 350
const ENRAGE_BUFF_RADIUS = 450
const ENRAGE_HEALTH_RATIO = 0.5

export const queenXenoHenBehavior: BossBehavior = {
  type: "queenXenoHen" as BossType,

  getStats(): BossStats {
    return {
      health: 230,
      radius: 50,
      speed: 3,
    }
  },

  create(canvasWidth: number, canvasHeight: number): Boss {
    return {
      type: "queenXenoHen",
      x: canvasWidth / 2,
      y: -70,
      radius: 50,
      health: 230,
      maxHealth: 230,
      speed: 3,
      spawnTimer: 0,
      shootTimer: 0,
      buffRadius: BUFF_RADIUS,
      queenEnraged: false,
    }
  },

  update(boss: Boss, ctx: BossContext): void {
    const { player, deltaTime, bossTime } = ctx

    const dt = Math.min(deltaTime, 50)
    const frameScale = dt / 16.67

    // ENRAGE STATE — activates once below 30% HP
    const healthRatio = boss.health / boss.maxHealth
    const isEnraged = boss.queenEnraged ?? false

    if (!isEnraged && healthRatio <= ENRAGE_HEALTH_RATIO) {
      boss.queenEnraged = true
      boss.buffRadius = ENRAGE_BUFF_RADIUS

      ctx.particles.burst(boss.x, boss.y, "#ff4dff", 30)
      ctx.screenShake.shake(8)
      ctx.audio.play(240, 0.35, "sawtooth")
      ctx.floatingTexts.spawn(
        boss.x,
        boss.y - boss.radius - 30,
        "ENRAGED!",
        "#ff4dff",
        22,
      )
    }

    const enraged = boss.queenEnraged ?? false

    // FIND THE CENTER OF THE LIVING ENEMY GROUP
    const livingEnemies = ctx.getEnemies().filter(
      (enemy) => enemy.health > 0,
    )

    let targetX = player.x
    let targetY = player.y

    if (livingEnemies.length > 0) {
      let sumX = 0
      let sumY = 0

      for (const enemy of livingEnemies) {
        sumX += enemy.x
        sumY += enemy.y
      }

      targetX = sumX / livingEnemies.length
      targetY = sumY / livingEnemies.length
    }

    // ORBIT AROUND THE ENEMY GROUP — OR THE PLAYER IF NO MOBS EXIST
    const orbitSpeed = enraged ? ENRAGE_ORBIT_SPEED : ORBIT_SPEED
    const orbitAngle = bossTime / orbitSpeed

    const orbitX = targetX + Math.cos(orbitAngle) * ORBIT_RADIUS
    const orbitY = targetY + Math.sin(orbitAngle) * ORBIT_RADIUS

    // Frame-rate-independent smoothing, equivalent to 3% per 60 FPS frame
    const smoothing = 1 - Math.pow(0.97, frameScale)

    boss.x += (orbitX - boss.x) * smoothing
    boss.y += (orbitY - boss.y) * smoothing

    boss.x = Math.max(
      boss.radius,
      Math.min(ctx.canvasWidth - boss.radius, boss.x),
    )
    boss.y = Math.max(
      boss.radius,
      Math.min(ctx.canvasHeight - boss.radius, boss.y),
    )

    // QUEEN'S PULSE — HEAL AND BUFF NEARBY ENEMIES
    boss.spawnTimer = (boss.spawnTimer ?? 0) + dt

    while (boss.spawnTimer >= HEAL_INTERVAL) {
      boss.spawnTimer -= HEAL_INTERVAL

      const buffRadius = boss.buffRadius ?? BUFF_RADIUS
      const buffRadiusSquared = buffRadius * buffRadius

      for (const enemy of livingEnemies) {
        const dx = enemy.x - boss.x
        const dy = enemy.y - boss.y
        const distanceSquared = dx * dx + dy * dy

        if (distanceSquared <= buffRadiusSquared) {
          if (enemy.health < enemy.maxHealth) {
            enemy.health = Math.min(
              enemy.maxHealth,
              enemy.health + HEAL_AMOUNT,
            )
          }

          if (enemy.speed < MAX_BUFFED_ENEMY_SPEED) {
            enemy.speed = Math.min(
              enemy.speed * 1.01,
              MAX_BUFFED_ENEMY_SPEED,
            )
          }
        }
      }

      ctx.particles.burst(
        boss.x,
        boss.y,
        enraged ? "#ff4dff" : "#28f0ff",
        enraged ? 20 : 12,
      )
    }

    // TRIPLE PLASMA SHOT
    boss.shootTimer = (boss.shootTimer ?? 0) + dt

    const shootInterval = enraged
      ? ENRAGE_SHOOT_INTERVAL
      : SHOOT_INTERVAL

    if (boss.shootTimer >= shootInterval) {
      boss.shootTimer -= shootInterval

      const angleToPlayer = Math.atan2(
        player.y - boss.y,
        player.x - boss.x,
      )

      ctx.projectiles.spawnSpread(
        boss.x,
        boss.y,
        3,
        angleToPlayer,
        SHOT_SPREAD,
        enraged ? ENRAGE_SHOT_SPEED : SHOT_SPEED,
        {
          radius: 9,
          damage: enraged ? ENRAGE_SHOT_DAMAGE : SHOT_DAMAGE,
          color: enraged ? "#ff4dff" : "#28f0ff",
          isEnemyProjectile: true,
        },
      )

      ctx.audio.play(
        enraged ? 520 : 400,
        0.15,
        "triangle",
      )

      ctx.particles.burst(
        boss.x,
        boss.y,
        enraged ? "#ff4dff" : "#28f0ff",
        5,
      )
    }
  },

  draw(
    ctx: CanvasRenderingContext2D,
    boss: Boss,
    bossTime: number,
    player: Player,
  ): void {
    drawQueenXenoHen(ctx, boss, bossTime, player)
  },
}
