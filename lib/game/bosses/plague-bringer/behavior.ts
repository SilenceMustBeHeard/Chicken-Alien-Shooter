
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawPlagueBringer } from "./draw"

const TYPE: BossType = "plagueBringer"

export const plagueBringerBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 420,
      radius: 42,
      speed: 0.8,
    }
  },

  create(canvasWidth, _canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: -42 - 20,
      radius: 42,
      health: 420,
      maxHealth: 420,
      type: TYPE,
      speed: 0.8,
      spawnTimer: 0,
      plagueTimer: 0,
      reaperShootTimer: 0,
      auraRadius: 250,
    }
  },

  update(boss, ctx) {
    const {
      player,
      deltaTime,
      enemies,
      projectiles,
      floatingTexts,
      screenShake,
      audio,
      ui,
    } = ctx

    // Init defaults 
    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    if (boss.plagueTimer === undefined) boss.plagueTimer = 0
    boss.plagueTimer += deltaTime

    if (boss.reaperShootTimer === undefined) boss.reaperShootTimer = 0

    const distToPlayer = Math.sqrt(
      (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2,
    )

    const healthPercent = boss.health / boss.maxHealth
    const isBerserk = healthPercent < 0.15

    // Aura radius (250 normal, 350 berserk)
    const currentAuraRadius = isBerserk ? 350 : (boss.auraRadius || 250)

    // SLOW CHASE 
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
    boss.x += Math.cos(angle) * boss.speed
    boss.y += Math.sin(angle) * boss.speed

    // DPS AURA 
    if (distToPlayer < currentAuraRadius) {
      const dps = isBerserk ? 20 : 10
      const damagePerFrame = (dps / 1000) * deltaTime

      // DoT — bypasses invincibility (intentional)
      player.health -= damagePerFrame

      // Visual feedback every ~1s
      if (
        Math.floor(boss.plagueTimer / 1000) !==
        Math.floor((boss.plagueTimer - deltaTime) / 1000)
      ) {
        floatingTexts.spawn(player.x, player.y - 30, `-${dps}`, "#84cc16", 16)
      }

            if (player.health <= 0) {
        audio.playSfx("chickenDeath")
        ui.setFinalStats(0, 0, ctx.getWave())
        ui.setGameState("gameOver")
        return
      }
    }

    // HEAL + MUTATE MOBS IN AURA
    for (const enemy of ctx.getEnemies()) {
      const dx = enemy.x - boss.x
      const dy = enemy.y - boss.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < currentAuraRadius) {
        const healPerFrame = (2 / 1000) * deltaTime
        enemy.health = Math.min(enemy.maxHealth, enemy.health + healPerFrame)

        if (enemy.speed < 7) {
          enemy.speed = Math.min(7, enemy.speed + (0.005 / 1000) * deltaTime)
        }

        if (enemy.color !== "#84cc16") {
          enemy.color = "#84cc16"
        }
      }
    }

    // SPAWN PLAGUE RATS (6 every 4s) 
    const spawnInterval = 4000
    if (
      Math.floor(boss.plagueTimer / spawnInterval) !==
      Math.floor((boss.plagueTimer - deltaTime) / spawnInterval)
    ) {
      for (let i = 0; i < 6; i++) {
        const spawnAngle = Math.random() * Math.PI * 2
        const spawnDist = boss.radius + 60 + Math.random() * 80
        enemies.spawn({
          x: boss.x + Math.cos(spawnAngle) * spawnDist,
          y: boss.y + Math.sin(spawnAngle) * spawnDist,
          radius: 9,
          speed: 6,
          health: 3,
          type: "grunt",
          alienType: "grunt",
          color: "#84cc16",
        })
      }
      audio.playSfx("bossAttack")
    }

    // SHOOT PLAGUE BALL 
    const shootInterval = isBerserk ? 700 : 1500
    boss.reaperShootTimer += deltaTime

    if (boss.reaperShootTimer >= shootInterval) {
      boss.reaperShootTimer = 0

      const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
      projectiles.spawn(
        boss.x,
        boss.y,
        Math.cos(angleToPlayer) * 2.5,
        Math.sin(angleToPlayer) * 2.5,
        {
          radius: 18,
          damage: 15,
          explosive: true,
          explosionRadius: 60,
          color: "#84cc16",
          isEnemyProjectile: true,
        },
      )
      audio.play(200, 0.25, "sawtooth")
    }

    // CONTACT DAMAGE 
    if (distToPlayer < player.radius + boss.radius * 0.85) {
      if (player.invincibleTime <= 0 && !player.shield) {
        const damage = isBerserk ? 25 : 20
        ctx.damagePlayer(damage, "plagueBringer.contact")
        screenShake.shake(isBerserk ? 15 : 10)
        floatingTexts.spawn(player.x, player.y - 30, `-${damage}`, "#84cc16", 22)

        const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
        player.x += Math.cos(pushAngle) * 40
        player.y += Math.sin(pushAngle) * 40

        if (player.health <= 0) {
          audio.playSfx("chickenDeath")
          ui.setGameState("gameOver")
          return
        }
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawPlagueBringer(ctx, boss, bossTime, player)
  },
}