// lib/game/bosses/void-reaper/behavior.ts

import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawVoidReaper } from "./draw"

const TYPE: BossType = "voidReaper"

export const voidReaperBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return { health: 380, radius: 48, speed: 1.5 }
  },

  create(canvasWidth, canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: canvasHeight * 0.3,
      radius: 48,
      health: 380,
      maxHealth: 380,
      type: TYPE,
      speed: 1.5,
      spawnTimer: 0,
      combatTimer: 0,
      healTimer: 0,
      blinkTimer: 0,
      reaperShootTimer: 0,
      isHealing: false,
    }
  },

  update(boss, ctx) {
    const { player, canvasWidth, canvasHeight, deltaTime, audio, particles, floatingTexts, screenShake } = ctx

    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    const distToPlayer = Math.sqrt(
      (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2,
    )

    const healthPercent = boss.health / boss.maxHealth
    const isBerserk = healthPercent < 0.10

    // HEAL PHASE
    if (boss.isHealing) {
      boss.healTimer = (boss.healTimer || 0) + deltaTime

      // Heal: +10 HP/sec
      const healPerMs = 10 / 1000
      boss.health = Math.min(boss.maxHealth, boss.health + healPerMs * deltaTime)

      // Spawn mobs every 1s: Math.ceil(HP / 50)
      if (Math.floor(boss.healTimer / 1000) !== Math.floor((boss.healTimer - deltaTime) / 1000)) {
        const mobCount = Math.ceil(boss.health / 50)
        for (let i = 0; i < mobCount; i++) {
          const angle = Math.random() * Math.PI * 2
          const spawnDist = boss.radius + 80 + Math.random() * 100
          ctx.enemies.spawn({
            x: boss.x + Math.cos(angle) * spawnDist,
            y: boss.y + Math.sin(angle) * spawnDist,
            radius: 12,
            speed: 0.6,
            health: 2,
            type: "grunt",
            alienType: "grunt",
          })
        }
      }

      // End heal after 5s
      if (boss.healTimer >= 5000) {
        boss.isHealing = false
        boss.healTimer = 0
        boss.combatTimer = 0
        boss.blinkTimer = 0
        boss.reaperShootTimer = 0
      }

      // Contact damage during heal
      if (distToPlayer < player.radius + boss.radius * 0.85) {
        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(10, "voidReaper.heal")
          screenShake.shake(5)
        }
      }

      // COMBAT PHASE
    } else {
      boss.combatTimer = (boss.combatTimer || 0) + deltaTime

      // Check if 10s combat ended
      if (boss.combatTimer >= 10000) {
        if (healthPercent < 0.5 && !isBerserk) {
          // Enter heal
          boss.isHealing = true
          boss.healTimer = 0
          boss.combatTimer = 0
          boss.blinkTimer = 0
          boss.reaperShootTimer = 0
        } else {
          // Continue combat
          boss.combatTimer = 0
        }
      }

      //  BERSERK 
      if (isBerserk) {
        // Fast blink every 2.5s
        boss.blinkTimer = (boss.blinkTimer || 0) + deltaTime
        if (boss.blinkTimer >= 2500) {
          boss.blinkTimer = 0
          boss.x = Math.random() * (canvasWidth - boss.radius * 2) + boss.radius
          boss.y = Math.random() * (canvasHeight - boss.radius * 2) + boss.radius
          particles.burst(boss.x, boss.y, "#ff0000")
        }

        // Spawn 5 mobs every 2s
        if (Math.floor(boss.combatTimer / 2000) !== Math.floor((boss.combatTimer - deltaTime) / 2000)) {
          for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2
            const spawnDist = boss.radius + 100 + Math.random() * 50
            ctx.enemies.spawn({
              x: boss.x + Math.cos(angle) * spawnDist,
              y: boss.y + Math.sin(angle) * spawnDist,
              radius: 12,
              speed: 0.8,
              health: 2,
              type: "grunt",
              alienType: "grunt",
            })
          }
        }

        // Shoot every 2s
        boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
        if (boss.reaperShootTimer >= 2000) {
          boss.reaperShootTimer = 0
          const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
          for (let i = -1; i <= 1; i++) {
            const spreadAngle = angleToPlayer + i * 0.15
            ctx.projectiles.spawn(
              boss.x,
              boss.y,
              Math.cos(spreadAngle) * 6,
              Math.sin(spreadAngle) * 6,
              {
                radius: 10,
                damage: 10,
                color: "#ff0000",
                isEnemyProjectile: true,
                isVoidSlash: true,
              },
            )
          }
          audio.play(300, 0.15, "sawtooth")
        }

        //  NORMAL COMBAT 
      } else {
        // Blink every 4s
        boss.blinkTimer = (boss.blinkTimer || 0) + deltaTime
        if (boss.blinkTimer >= 4000) {
          boss.blinkTimer = 0
          let newX = boss.x
          let newY = boss.y
          for (let attempt = 0; attempt < 10; attempt++) {
            newX = Math.random() * (canvasWidth - boss.radius * 2) + boss.radius
            newY = Math.random() * (canvasHeight - boss.radius * 2) + boss.radius
            const d = Math.sqrt((newX - player.x) ** 2 + (newY - player.y) ** 2)
            if (d > 200) break
          }
          particles.burst(boss.x, boss.y, "#a855f7")
          boss.x = newX
          boss.y = newY
          particles.burst(boss.x, boss.y, "#a855f7")
        }

        // Scythe Slash every 2s (3 aimed crescents)
        boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
        if (boss.reaperShootTimer >= 2000) {
          boss.reaperShootTimer = 0
          const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
          for (let i = -1; i <= 1; i++) {
            const spreadAngle = angleToPlayer + i * 0.15
            ctx.projectiles.spawn(
              boss.x,
              boss.y,
              Math.cos(spreadAngle) * 6,
              Math.sin(spreadAngle) * 6,
              {
                radius: 10,
                damage: 10,
                color: "#c084fc",
                isEnemyProjectile: true,
                isVoidSlash: true,
              },
            )
          }
          audio.play(400, 0.12, "sine")
        }

        // Void Orbs every 3s (8 radial)
        if (Math.floor(boss.combatTimer / 3000) !== Math.floor((boss.combatTimer - deltaTime) / 3000)) {
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2
            ctx.projectiles.spawn(
              boss.x,
              boss.y,
              Math.cos(angle) * 3,
              Math.sin(angle) * 3,
              {
                radius: 12,
                damage: 8,
                color: "#7c3aed",
                isEnemyProjectile: true,
                isVoidOrb: true,
              },
            )
          }
          audio.play(600, 0.15, "triangle")
        }
      }

      // Contact damage
      if (distToPlayer < player.radius + boss.radius * 0.85) {
        if (player.invincibleTime <= 0 && !player.shield) {
          const damage = isBerserk ? 25 : 15
          ctx.damagePlayer(damage, "voidReaper.contact")
          screenShake.shake(isBerserk ? 15 : 10)
          floatingTexts.spawn(player.x, player.y - 30, `-${damage}`, "#ff0000", 22)

          const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
          player.x += Math.cos(pushAngle) * 40
          player.y += Math.sin(pushAngle) * 40
        }
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawVoidReaper(ctx, boss, bossTime)
  },
}