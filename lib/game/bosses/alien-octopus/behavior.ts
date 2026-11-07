
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"

import { drawAlienOctopus } from "./draw"

const TYPE: BossType = "alienOctopus"

export const alienOctopusBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 180,
      radius: 52,
      speed: 0.9,
    }
  },

  create(canvasWidth, canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: canvasHeight * 0.25,
      radius: 52,
      health: 180,
      maxHealth: 180,
      type: TYPE,
      speed: 0.9,
      spawnTimer: 0,
      reaperShootTimer: 0,  // reused as tentacle timer
      combatTimer: 0,       // reused as ink timer
      plagueTimer: 0,       // reused as spawn timer
    }
  },

  update(boss, ctx) {
    const {
      player,
      deltaTime,
      projectiles,
      enemies,
      particles,
      floatingTexts,
      screenShake,
      audio,
    } = ctx

    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    if (boss.reaperShootTimer === undefined) boss.reaperShootTimer = 0
    boss.reaperShootTimer += deltaTime

    if (boss.combatTimer === undefined) boss.combatTimer = 0
    boss.combatTimer += deltaTime

    if (boss.plagueTimer === undefined) boss.plagueTimer = 0
    boss.plagueTimer += deltaTime

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

   
    // CHASE (slow)

    boss.x += Math.cos(angle) * boss.speed
    boss.y += Math.sin(angle) * boss.speed


    // TENTACLE GRAB (every 3s, range 200)
   
    if (boss.reaperShootTimer >= 3000) {
      boss.reaperShootTimer = 0

      const grabRange = 200
      if (dist < grabRange + player.radius) {
        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(15, "alienOctopus.grab")
          screenShake.shake(12)
          floatingTexts.spawn(player.x, player.y - 30, "-15", "#a855f7", 22)

          // Pull player toward boss
          const pullAngle = Math.atan2(dy, dx)
          player.x += Math.cos(pullAngle) * 120
          player.y += Math.sin(pullAngle) * 120

          particles.burst(player.x, player.y, "#a855f7", 15)
        }
      }

      audio.play(400, 0.2, "sawtooth")
    }

  
    // INK SPRAY (every 5s, 8 radial)

    if (boss.combatTimer >= 5000) {
      boss.combatTimer = 0

      // 8 projectiles in circle
      projectiles.spawnRadial(boss.x, boss.y, 8, 3.5, {
        radius: 7,
        damage: 8,
        color: "#4c1d95",
        isEnemyProjectile: true,
      })

      audio.play(600, 0.2, "triangle")
      particles.burst(boss.x, boss.y, "#4c1d95", 20)
    }

  
    // BIO-EGGS (every 8s, spawn 2 grunts)
    
    if (boss.plagueTimer >= 8000) {
      boss.plagueTimer = 0

      for (let i = 0; i < 2; i++) {
        const spawnAngle = Math.random() * Math.PI * 2
        const spawnDist = boss.radius + 80 + Math.random() * 40

        enemies.spawn({
          type: "grunt",
          x: boss.x + Math.cos(spawnAngle) * spawnDist,
          y: boss.y + Math.sin(spawnAngle) * spawnDist,
          speed: 0.8,
          health: 2,
          radius: 10,
          color: "#a855f7",
        })
      }

      audio.play(500, 0.25, "sine")
      particles.burst(boss.x, boss.y, "#a855f7", 10)
    }

   
    // CONTACT DAMAGE (push away)
   
    if (
      dist < player.radius + boss.radius &&
      player.invincibleTime <= 0 &&
      !player.shield
    ) {
      ctx.damagePlayer(15, "alienOctopus.contact")
      screenShake.shake(10)
      floatingTexts.spawn(player.x, player.y - 30, "-15", "#ff0000", 22)

      const pushAngle = Math.atan2(dy, dx)
      player.x += Math.cos(pushAngle) * 50
      player.y += Math.sin(pushAngle) * 50
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawAlienOctopus(ctx, boss, bossTime, player)
  },
}