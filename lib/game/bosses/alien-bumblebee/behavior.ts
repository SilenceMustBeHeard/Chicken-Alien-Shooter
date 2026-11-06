
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"

import { drawAlienBumblebee } from "./draw"

const TYPE: BossType = "alienBumblebee"

export const alienBumblebeeBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 120,
      radius: 42,
      speed: 1.2,
    }
  },

  create(canvasWidth, canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: canvasHeight * 0.3,
      radius: 42,
      health: 120,
      maxHealth: 120,
      type: TYPE,
      speed: 1.2,
      spawnTimer: 0,
      attackState: "patrol",
      attackTimer: 0,
      attackCooldown: 4000,
      dashDirX: 0,
      dashDirY: 0,
    }
  },

  update(boss, ctx) {
    const { player, canvasWidth, canvasHeight, deltaTime, audio, floatingTexts, screenShake } = ctx

    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    if (boss.attackState === undefined) boss.attackState = "patrol"
    if (boss.attackTimer === undefined) boss.attackTimer = 0
    if (boss.attackCooldown === undefined) boss.attackCooldown = 4000
    if (boss.dashDirX === undefined) boss.dashDirX = 0
    if (boss.dashDirY === undefined) boss.dashDirY = 0

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const state = boss.attackState as string
    boss.attackTimer += deltaTime

    //  PATROL (figure eight) 
    if (state === "patrol") {
      boss.attackCooldown = (boss.attackCooldown || 0) - deltaTime

      boss.x += Math.sin(Date.now() / 500) * 2.5
      boss.y += Math.cos(Date.now() / 700) * 1.5

      boss.x = Math.max(boss.radius, Math.min(canvasWidth - boss.radius, boss.x))
      boss.y = Math.max(boss.radius, Math.min(canvasHeight - boss.radius, boss.y))

      if ((boss.attackCooldown || 0) <= 0) {
        boss.attackTimer = 0
        boss.attackState = "windup"
        audio.play(900, 0.1, "square")
      }
    }

    // WINDUP (400ms shake) 
    else if (state === "windup") {
      boss.x += (Math.random() - 0.5) * 3
      boss.y += (Math.random() - 0.5) * 3

      boss.dashDirX = Math.cos(angle)
      boss.dashDirY = Math.sin(angle)

      if ((boss.attackTimer || 0) >= 400) {
        boss.attackTimer = 0
        boss.attackState = "dash"
        audio.play(600, 0.15, "sawtooth")
      }
    }

    //  DASH (950ms, 12× speed) 
    else if (state === "dash") {
      boss.x += (boss.dashDirX || 0) * boss.speed * 12
      boss.y += (boss.dashDirY || 0) * boss.speed * 12

      if (
        dist < player.radius + boss.radius &&
        player.invincibleTime <= 0 &&
        !player.shield
      ) {
        ctx.damagePlayer(12, "alienBumblebee.dash")
        screenShake.shake(8)
        floatingTexts.spawn(player.x, player.y - 25, "-12", "#facc15", 20)
        ctx.particles.burst(boss.x, boss.y, "#facc15")
      }

      boss.x = Math.max(boss.radius, Math.min(canvasWidth - boss.radius, boss.x))
      boss.y = Math.max(boss.radius, Math.min(canvasHeight - boss.radius, boss.y))

      if ((boss.attackTimer || 0) >= 950) {
        boss.attackTimer = 0
        boss.attackCooldown = 4000
        boss.attackState = "patrol"
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawAlienBumblebee(ctx, boss, bossTime, player)
  },
}