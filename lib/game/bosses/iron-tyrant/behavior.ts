
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawIronTyrant } from "./draw"

const TYPE: BossType = "ironTyrant"

export const ironTyrantBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 500,
      radius: 44,
      speed: 1.2,
    }
  },

  create(canvasWidth, _canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: -44 - 20,
      radius: 44,
      health: 500,
      maxHealth: 500,
      type: TYPE,
      speed: 1.2,
      spawnTimer: 0,
      combatTimer: 0,
      reaperShootTimer: 0,
      armor: 400,
      maxArmor: 400,
      isArmored: true,
    }
  },

  update(boss, ctx) {
    const {
      player,
      deltaTime,
      projectiles,
      particles,
      floatingTexts,
      screenShake,
      audio,
      ui,
    } = ctx

    // Init defaults 
    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    if (boss.armor === undefined) boss.armor = 400
    if (boss.maxArmor === undefined) boss.maxArmor = 400
    if (boss.isArmored === undefined) boss.isArmored = true

    const distToPlayer = Math.sqrt(
      (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2,
    )
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
    const healthPercent = boss.health / boss.maxHealth
    const isBerserk = healthPercent < 0.30

    
    // BERSERK: pure melee, very fast
    
    if (isBerserk) {
      boss.x += Math.cos(angle) * boss.speed * 4
      boss.y += Math.sin(angle) * boss.speed * 4

      boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
      if (distToPlayer < 200 && boss.reaperShootTimer >= 800) {
        boss.reaperShootTimer = 0

        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(70, "ironTyrant.berserkMelee")
          screenShake.shake(22)
          floatingTexts.spawn(player.x, player.y - 30, "-70", "#ff0000", 28)

          const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
          player.x += Math.cos(pushAngle) * 100
          player.y += Math.sin(pushAngle) * 100

          particles.burst(boss.x, boss.y, "#ff0000")

          if (player.health <= 0) {
            audio.playSfx("chickenDeath")
            ui.setGameState("gameOver")
            return
          }
        }
      }
    }
    // ARMORED: slow, cannon + light melee (150)

    else if (boss.isArmored) {
      boss.x += Math.cos(angle) * boss.speed * 0.7
      boss.y += Math.sin(angle) * boss.speed * 0.7

      // Cannon: 3 balls every 2s
      boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
      if (boss.reaperShootTimer >= 2000) {
        boss.reaperShootTimer = 0

        for (let i = -1; i <= 1; i++) {
          const spreadAngle = angle + i * 0.15
          projectiles.spawn(
            boss.x,
            boss.y,
            Math.cos(spreadAngle) * 3,
            Math.sin(spreadAngle) * 3,
            {
              radius: 14,
              damage: 15,
              color: "#94a3b8",
              isEnemyProjectile: true,
            },
          )
        }
        audio.play(200, 0.25, "square")
      }

      // Light melee (range 150, 25 dmg, 1.5s cooldown)
      if (boss.combatTimer === undefined) boss.combatTimer = 0
      boss.combatTimer += deltaTime

      if (distToPlayer < 150 && boss.combatTimer >= 1500) {
        boss.combatTimer = 0

        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(25, "ironTyrant.armoredMelee")
          screenShake.shake(10)
          floatingTexts.spawn(player.x, player.y - 30, "-25", "#ff0000", 20)

          const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
          player.x += Math.cos(pushAngle) * 50
          player.y += Math.sin(pushAngle) * 50

          particles.burst(boss.x, boss.y, "#94a3b8")

          if (player.health <= 0) {
            audio.playSfx("chickenDeath")
            ui.setGameState("gameOver")
            return
          }
        }
      }

      // Contact damage (reduced, armored)
      if (distToPlayer < player.radius + boss.radius * 0.85) {
        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(30, "ironTyrant.armoredContact")
          screenShake.shake(8)
          floatingTexts.spawn(player.x, player.y - 30, "-30", "#ff0000", 28)

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
    }
    // UNARMORED: fast, projectiles + melee (250)
    
    else {
      boss.x += Math.cos(angle) * boss.speed * 1.2
      boss.y += Math.sin(angle) * boss.speed * 1.2

      // 6 spread projectiles every 1.5s
      boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
      if (boss.reaperShootTimer >= 1500) {
        boss.reaperShootTimer = 0

        for (let i = 0; i < 6; i++) {
          const spreadAngle = angle + (i - 2.5) * 0.12
          projectiles.spawn(
            boss.x,
            boss.y,
            Math.cos(spreadAngle) * 4,
            Math.sin(spreadAngle) * 4,
            {
              radius: 7,
              damage: 10,
              color: "#dc2626",
              isEnemyProjectile: true,
            },
          )
        }
        audio.play(400, 0.15, "sawtooth")
      }

      // Melee (range 250, 50 dmg, 1.5s cooldown)
      if (boss.combatTimer === undefined) boss.combatTimer = 0
      boss.combatTimer += deltaTime

      if (distToPlayer < 250 && boss.combatTimer >= 1500) {
        boss.combatTimer = 0

        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(50, "ironTyrant.unarmoredMelee")
          screenShake.shake(15)
          floatingTexts.spawn(player.x, player.y - 30, "-50", "#ff0000", 28)

          const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
          player.x += Math.cos(pushAngle) * 70
          player.y += Math.sin(pushAngle) * 70

          particles.burst(boss.x, boss.y, "#dc2626")

          if (player.health <= 0) {
            audio.playSfx("chickenDeath")
            ui.setGameState("gameOver")
            return
          }
        }
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawIronTyrant(ctx, boss, bossTime, player)
  },
}