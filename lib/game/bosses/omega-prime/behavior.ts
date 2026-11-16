
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawOmegaPrime } from "././draw"

const TYPE: BossType = "omegaPrime"

export const omegaPrimeBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 1500,
      radius: 50,
      speed: 1.5,
    }
  },

  create(canvasWidth, _canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: -50 - 20,
      radius: 50,
      health: 1500,
      maxHealth: 1500,
      type: TYPE,
      speed: 1.5,
      spawnTimer: 0,
      phase: 1,
    }
  },

  update(boss, ctx) {
    const {
      player,
      deltaTime,
      enemies,
      audio,
      ui,
    } = ctx

    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    const phase = Math.floor(boss.spawnTimer / 3000) % 3
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x)

    // ─── Movement phase ───
    if (phase === 0) {
      // Orbit around player
      const orbitAngle = boss.spawnTimer / 500
      boss.x = player.x + Math.cos(orbitAngle) * 280
      boss.y = player.y + Math.sin(orbitAngle) * 280
    } else if (phase === 1) {
      // Chase player
      boss.x += Math.cos(angle) * boss.speed * 2.5
      boss.y += Math.sin(angle) * boss.speed * 2.5
    } else {
      // Erratic drift + slight pull toward player
      boss.x += Math.cos(boss.spawnTimer / 100) * boss.speed
      boss.y += Math.sin(boss.spawnTimer / 80) * boss.speed
      boss.x += (player.x - boss.x) * 0.008
      boss.y += (player.y - boss.y) * 0.008
    }

    // ─── Random spawn minions (only in chase phase) ───
    if (phase === 1 && Math.random() < 0.02) {
      const a = Math.random() * Math.PI * 2
      enemies.spawn({
        x: boss.x + Math.cos(a) * boss.radius,
        y: boss.y + Math.sin(a) * boss.radius,
        radius: 10,
        speed: 1.2,
        health: 3,
        type: "grunt",
        alienType: "grunt",
      })
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawOmegaPrime(ctx, boss, bossTime, player)
  },
}