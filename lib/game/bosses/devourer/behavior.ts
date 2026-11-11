
import type { Boss, Player } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior } from "../base/boss-behavior"

import { drawDevourer } from "./draw"

const CYCLE_DURATION = 3800

const CHASE_END = 2000
const WINDUP_END = 2700
const DASH_END = 3300

const CHASE_SPEED = 1
const WINDUP_SPEED = 0
const DASH_SPEED = 1.5
const RECOVERY_SPEED = 0.3

const ENRAGE_LIGHT = 0.7
const ENRAGE_MEDIUM = 0.5
const ENRAGE_CRITICAL = 0.33

function getEnrageMultiplier(boss: Boss): number {
  const healthRatio = boss.health / boss.maxHealth

  if (healthRatio < ENRAGE_CRITICAL) return 1.5
  if (healthRatio < ENRAGE_MEDIUM) return 1.3
  if (healthRatio < ENRAGE_LIGHT) return 1.15

  return 1
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

export const devourerBehavior: BossBehavior = {
  type: "devourer",

  getStats() {
    return {
      health: 280,
      radius: 55,
      speed: 4,
    }
  },

  create(canvasWidth, canvasHeight): Boss {
  const stats = {
  health: 280,
  radius: 55,
  speed: 4,
}
    return {
      x: canvasWidth / 2,
      y: -stats.radius - 20,
      radius: stats.radius,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      type: "devourer",
      spawnTimer: 0,
      phase: 1,
      chargeDirection: undefined,
    }
  },

  update(boss, ctx) {
    const dt = Math.min(Math.max(ctx.deltaTime, 0), 50)
    const frameScale = dt / 16.67

    boss.spawnTimer = (boss.spawnTimer ?? 0) + dt

    const cyclePhase = boss.spawnTimer % CYCLE_DURATION
    const enrageMultiplier = getEnrageMultiplier(boss)
    const player = ctx.player

    if (cyclePhase < CHASE_END) {
      // CHASE: aggressively pursue the player.
      boss.chargeDirection = undefined

      moveTowardPlayer(
        boss,
        player,
        boss.speed * CHASE_SPEED * enrageMultiplier,
        frameScale,
      )
    } else if (cyclePhase < WINDUP_END) {
      // WINDUP: lock the direction once, then hold position.
      if (!boss.chargeDirection) {
        const angle = Math.atan2(
          player.y - boss.y,
          player.x - boss.x,
        )

        boss.chargeDirection = {
          x: Math.cos(angle),
          y: Math.sin(angle),
        }
      }

      // No random jitter: the anticipation is communicated visually.
      if (WINDUP_SPEED > 0) {
        moveTowardPlayer(
          boss,
          player,
          boss.speed * WINDUP_SPEED * enrageMultiplier,
          frameScale,
        )
      }
    } else if (cyclePhase < DASH_END) {
      // DASH: commit to the locked direction. No steering.
      const direction = boss.chargeDirection

      if (direction) {
        boss.x +=
          direction.x *
          boss.speed *
          DASH_SPEED *
          enrageMultiplier *
          frameScale

        boss.y +=
          direction.y *
          boss.speed *
          DASH_SPEED *
          enrageMultiplier *
          frameScale
      }
    } else {
      // RECOVERY: slow down and resume the chase.
      moveTowardPlayer(
        boss,
        player,
        boss.speed * RECOVERY_SPEED * enrageMultiplier,
        frameScale,
      )

      // Clear the locked direction before the next cycle.
      if (cyclePhase >= 3700) {
        boss.chargeDirection = undefined
      }
    }

    clampBoss(boss, ctx)
  },

  draw(ctx, boss, bossTime, player) {
    drawDevourer(ctx, boss, bossTime, player)
  },
}
