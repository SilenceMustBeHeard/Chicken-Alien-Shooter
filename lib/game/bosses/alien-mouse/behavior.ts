
import type { Boss, BossType, Player } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"

import { drawAlienMouse } from "./draw"

const TYPE: BossType = "alienMouse"

export const alienMouseBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 100,
      radius: 34,
      speed: 1.0,
    }
  },

  create(canvasWidth, _canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: -34 - 20,
      radius: 34,
      health: 100,
      maxHealth: 100,
      type: TYPE,
      speed: 1.0,
      spawnTimer: 0,
      attackState: "stalk",
      attackTimer: 0,
      attackCooldown: 1200,
      dashDirX: 0,
      dashDirY: 0,
      dashIsFeint: false,
      burstDashCount: 0,
    }
  },

  update(boss, ctx) {
    const { player, deltaTime, projectiles, particles, floatingTexts, screenShake, audio, ui } = ctx

    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    if (boss.attackState === undefined) boss.attackState = "stalk"
    if (boss.attackTimer === undefined) boss.attackTimer = 0
    if (boss.attackCooldown === undefined) boss.attackCooldown = 1200
    if (boss.dashDirX === undefined) boss.dashDirX = 0
    if (boss.dashDirY === undefined) boss.dashDirY = 0
    if (boss.dashIsFeint === undefined) boss.dashIsFeint = false
    if (boss.burstDashCount === undefined) boss.burstDashCount = 0

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const state = boss.attackState as string
    boss.attackTimer += deltaTime

    // STALK 
    if (state === "stalk") {
      boss.attackCooldown = (boss.attackCooldown || 0) - deltaTime

      boss.x += Math.cos(angle) * boss.speed * 2
      boss.y += Math.sin(angle) * boss.speed * 2

      if ((boss.attackCooldown || 0) <= 0) {
        boss.attackTimer = 0
        boss.attackState = "dashCharge"
        audio.play(800, 0.1, "square")
      }
    }

    // DASH CHARGE
    else if (state === "dashCharge") {
      boss.x += Math.cos(angle) * boss.speed * 0.3
      boss.y += Math.sin(angle) * boss.speed * 0.3

      if ((boss.attackTimer || 0) >= 500) {
        boss.attackTimer = 0
        boss.attackState = "dashChase"
        audio.play(400, 0.15, "sawtooth")
      }
    }

    // DASH CHASE
    else if (state === "dashChase") {
      boss.x += Math.cos(angle) * boss.speed * 4
      boss.y += Math.sin(angle) * boss.speed * 4

      if (
        dist < player.radius + boss.radius &&
        player.invincibleTime <= 0 &&
        !player.shield
      ) {
        ctx.damagePlayer(10, "alienMouse.dash")
        screenShake.shake(8)
        floatingTexts.spawn(player.x, player.y - 25, "-10", "#c084fc", 20)
        particles.burst(boss.x, boss.y, "#a855f7")
      }

      if ((boss.attackTimer || 0) >= 3500) {
        boss.attackTimer = 0
        boss.attackState = "stun"
        audio.play(300, 0.3, "triangle")
      }
    }

    // STUN
    else if (state === "stun") {
      if ((boss.attackTimer || 0) >= 500) {
        boss.attackTimer = 0
        const escapeAngle = angle + Math.PI + (Math.random() - 0.5) * 1.2
        boss.dashDirX = Math.cos(escapeAngle)
        boss.dashDirY = Math.sin(escapeAngle)
        boss.attackState = "escape"
        audio.play(600, 0.2, "sine")
      }
    }

    // ESCAPE 
    else if (state === "escape") {
      boss.x += (boss.dashDirX || 0) * boss.speed * 6
      boss.y += (boss.dashDirY || 0) * boss.speed * 6

      boss.x = Math.max(boss.radius, Math.min(ctx.canvasWidth - boss.radius, boss.x))
      boss.y = Math.max(boss.radius, Math.min(ctx.canvasHeight - boss.radius, boss.y))

      if ((boss.attackTimer || 0) >= 2000) {
        boss.attackTimer = 0
        boss.attackCooldown = 2000 + Math.random() * 1000
        boss.attackState = "stalk"
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawAlienMouse(ctx, boss, bossTime, player)
  },
}