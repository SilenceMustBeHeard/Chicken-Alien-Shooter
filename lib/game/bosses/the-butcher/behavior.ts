
import type { Boss, Player } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior } from "../base/boss-behavior"

import { drawTheButcher } from "./draw"

const NORMAL_CYCLE = 5100
const BERSERK_CYCLE = 2000

const BERSERK_HEALTH_RATIO = 0.2

const NORMAL_CHASE_END = 2500
const NORMAL_WINDUP_END = 3100
const NORMAL_CHARGE_END = 3600

const BERSERK_CHASE_END = 1000
const BERSERK_WINDUP_END = 1300
const BERSERK_CHARGE_END = 1700

const DEVOUR_RADIUS_MULTIPLIER = 8
const DEVOUR_HEAL = 50

function isBerserk(boss: Boss): boolean {
  return boss.health / boss.maxHealth < BERSERK_HEALTH_RATIO
}

function getEnrageMultiplier(boss: Boss): number {
  const ratio = boss.health / boss.maxHealth

  if (ratio < BERSERK_HEALTH_RATIO) return 2
  if (ratio < 0.33) return 1.5
  if (ratio < 0.66) return 1.25

  return 1
}

function moveTowardPlayer(
  boss: Boss,
  player: Player,
  speed: number,
  frameScale: number,
): void {
  const dx = player.x - boss.x
  const dy = player.y - boss.y
  const distance = Math.hypot(dx, dy)

  if (distance <= 1) return

  boss.x += (dx / distance) * speed * frameScale
  boss.y += (dy / distance) * speed * frameScale
}

function clampBoss(boss: Boss, ctx: BossContext): void {
  boss.x = Math.max(
    boss.radius,
    Math.min(ctx.canvasWidth - boss.radius, boss.x),
  )

  boss.y = Math.max(
    boss.radius,
    Math.min(ctx.canvasHeight - boss.radius, boss.y),
  )
}

function devourNearbyEnemies(boss: Boss, ctx: BossContext): void {
  const enemies = ctx.getEnemies()
  const radius = boss.radius * DEVOUR_RADIUS_MULTIPLIER
  const radiusSquared = radius * radius

  for (const enemy of enemies) {
    const dx = enemy.x - boss.x
    const dy = enemy.y - boss.y

    if (dx * dx + dy * dy > radiusSquared) continue
    if (enemy.health <= 0) continue

    // Preserve the original fixed heal per consumed enemy.
    const previousHealth = boss.health
    boss.health = Math.min(
      boss.maxHealth,
      boss.health + DEVOUR_HEAL,
    )

    const actualHeal = boss.health - previousHealth

    // Mark the enemy as defeated. The normal enemy cleanup
    // should remove it from the active enemy collection.
    enemy.health = 0

    ctx.particles.burst(enemy.x, enemy.y, "#ff0000", 18)

    if (actualHeal > 0) {
      ctx.floatingTexts.spawn(
        boss.x,
        boss.y - boss.radius - 20,
        `+${actualHeal} HP`,
        "#00ff00",
        18,
      )
    }

    ctx.audio.play(110, 0.25, "sawtooth")
    ctx.screenShake.shake(3)
  }
}

export const theButcherBehavior: BossBehavior = {
  type: "theButcher",

  getStats() {
   
    return {
      health: 280,
      radius: 55,
      speed: 4,
    }
  },

  create(canvasWidth, canvasHeight): Boss {
    const stats = this.getStats()

    return {
      x: canvasWidth / 2,
      y: -stats.radius - 20,
      radius: stats.radius,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      type: "theButcher",
      spawnTimer: 0,
      phase: 1,
      chargeDirection: undefined,
    }
  },

  update(boss, ctx) {
    const dt = Math.min(Math.max(ctx.deltaTime, 0), 50)
    const frameScale = dt / 16.67

    boss.spawnTimer = (boss.spawnTimer ?? 0) + dt

    const berserk = isBerserk(boss)
    const enrageMultiplier = getEnrageMultiplier(boss)
    const player = ctx.player

    const cycleTime = berserk ? BERSERK_CYCLE : NORMAL_CYCLE
    const chaseEnd = berserk
      ? BERSERK_CHASE_END
      : NORMAL_CHASE_END
    const windupEnd = berserk
      ? BERSERK_WINDUP_END
      : NORMAL_WINDUP_END
    const chargeEnd = berserk
      ? BERSERK_CHARGE_END
      : NORMAL_CHARGE_END

    const cyclePhase = boss.spawnTimer % cycleTime

    // BERSERK: devour nearby enemies to recover health.
    if (berserk) {
      devourNearbyEnemies(boss, ctx)
    }

    if (cyclePhase < chaseEnd) {
      // CHASE
      boss.chargeDirection = undefined

      const chaseSpeed = berserk ? 0.8 : 0.4

      moveTowardPlayer(
        boss,
        player,
        boss.speed * chaseSpeed * enrageMultiplier,
        frameScale,
      )
    } else if (cyclePhase < windupEnd) {
      // WINDUP
      const windupStart = cyclePhase - chaseEnd

      if (windupStart < dt && !boss.chargeDirection) {
        const angle = Math.atan2(
          player.y - boss.y,
          player.x - boss.x,
        )

        boss.chargeDirection = {
          x: Math.cos(angle),
          y: Math.sin(angle),
        }
      }

     
      const jitter = berserk ? 8 : 4

      boss.x += (Math.random() - 0.5) * jitter * frameScale
      boss.y += (Math.random() - 0.5) * jitter * frameScale
    } else if (cyclePhase < chargeEnd) {
      // CHARGE
      const direction = boss.chargeDirection

      if (direction) {
        const chargeSpeed = berserk ? 20 : 15

        boss.x +=
          direction.x *
          boss.speed *
          chargeSpeed *
          enrageMultiplier *
          frameScale

        boss.y +=
          direction.y *
          boss.speed *
          chargeSpeed *
          enrageMultiplier *
          frameScale
      }
    } else {
      // STUNNED / RECOVERY
      const stunReset = berserk ? 1950 : 5050

      if (cyclePhase >= stunReset) {
        boss.chargeDirection = undefined
      }
    }

    clampBoss(boss, ctx)

    // CONTACT DAMAGE
    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const distance = Math.hypot(dx, dy)

    if (
      distance < player.radius + boss.radius * 0.85 &&
      player.invincibleTime <= 0 &&
      !player.shield
    ) {
      const isCharging =
        cyclePhase >= windupEnd && cyclePhase < chargeEnd

      const damage = berserk
        ? isCharging ? 60 : 20
        : isCharging ? 45 : 15

      ctx.damagePlayer(damage, "theButcher")

      ctx.screenShake.shake(isCharging ? 25 : 10)

      ctx.floatingTexts.spawn(
        player.x,
        player.y - 30,
        `-${damage}`,
        "#ff0000",
        isCharging ? 28 : 22,
      )

      const pushAngle = Math.atan2(dy, dx)
      const knockback = isCharging ? 60 : 35

      player.x += Math.cos(pushAngle) * knockback
      player.y += Math.sin(pushAngle) * knockback
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawTheButcher(ctx, boss, bossTime, player)
  },
}
