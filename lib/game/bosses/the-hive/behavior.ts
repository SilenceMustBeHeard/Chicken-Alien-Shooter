import type { Boss, BossType, Enemy } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawTheHive } from "./draw"

const TYPE: BossType = "theHive"

export const theHiveBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 800,
      radius: 70,
      speed: 0.8,
    }
  },

  create(canvasWidth, _canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: -70 - 20,
      radius: 70,
      health: 800,
      maxHealth: 800,
      type: TYPE,
      speed: 0.8,
      spawnTimer: 0,
      hivePhase: 1,
      hiveAttackTimer: 0,
      hiveAttackChoice: 0,
    }
  },

  update(boss, ctx) {
    const {
      player,
      canvasWidth,
      canvasHeight,
      deltaTime,
      projectiles,
      enemies,
      particles,
      floatingTexts,
      screenShake,
      audio,
      ui,
    } = ctx

    if (boss.spawnTimer === undefined) boss.spawnTimer = 0
    boss.spawnTimer += deltaTime

    if (boss.hivePhase === undefined) boss.hivePhase = 1
    if (boss.hiveAttackTimer === undefined) boss.hiveAttackTimer = 0
    if (boss.hiveAttackChoice === undefined) boss.hiveAttackChoice = 0

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    // PHASE 1: AMALGAM

    if (boss.hivePhase === 1) {
      // Chaotic movement
      const driftX = Math.cos(angle) * boss.speed * 0.5
      const driftY = Math.sin(angle) * boss.speed * 0.5
      const chaosX = (Math.random() - 0.5) * boss.speed * 2
      const chaosY = (Math.random() - 0.5) * boss.speed * 2

      boss.x += (driftX + chaosX) * (deltaTime / 16.667)
      boss.y += (driftY + chaosY) * (deltaTime / 16.667)

      boss.x = Math.max(boss.radius, Math.min(canvasWidth - boss.radius, boss.x))
      boss.y = Math.max(boss.radius, Math.min(canvasHeight - boss.radius, boss.y))

      // Shock aura (10 DPS)
      const shockAuraRadius = boss.radius * 3
      const isInShockAura = dist < shockAuraRadius + player.radius

      if (isInShockAura && player.invincibleTime <= 0 && !player.shield) {
        const shockDps = 10
        const damagePerFrame = (shockDps / 1000) * deltaTime
        player.health -= damagePerFrame

        if (
          Math.floor(boss.spawnTimer / 1000) !==
          Math.floor((boss.spawnTimer - deltaTime) / 1000)
        ) {
          floatingTexts.spawn(player.x, player.y - 30, `-${shockDps}`, "#fbbf24", 16)
        }

        if (player.health <= 0) {
          audio.playSfx("chickenDeath")
          ui.setGameState("gameOver")
          return
        }
      }

      // Attack timer — every 1.5s
      boss.hiveAttackTimer = (boss.hiveAttackTimer || 0) + deltaTime
      if (boss.hiveAttackTimer >= 1500) {
        boss.hiveAttackTimer = 0

        const choice = Math.floor(Math.random() * 3)
        boss.hiveAttackChoice = choice

        if (choice === 0) {
          // Spread shot — 5 projectiles in cone
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = angle + i * 0.18
            projectiles.spawn(
              boss.x,
              boss.y,
              Math.cos(spreadAngle) * 4,
              Math.sin(spreadAngle) * 4,
              {
                radius: 8,
                damage: 10,
                color: "#fbbf24",
                isEnemyProjectile: true,
              },
            )
          }
          audio.play(400, 0.15, "square")
        } else if (choice === 1) {
          // Radial burst — 8 projectiles
          projectiles.spawnRadial(boss.x, boss.y, 8, 3.5, {
            radius: 7,
            damage: 8,
            color: "#f97316",
            isEnemyProjectile: true,
          })
          audio.play(500, 0.2, "sawtooth")
        } else {
          // Spawn 2 minions
          for (let i = 0; i < 2; i++) {
            const minionAngle = Math.random() * Math.PI * 2
            const spawnDist = boss.radius + 60 + Math.random() * 40
            enemies.spawn({
              x: boss.x + Math.cos(minionAngle) * spawnDist,
              y: boss.y + Math.sin(minionAngle) * spawnDist,
              radius: 12,
              speed: 1.0,
              health: 3,
              type: "grunt",
              alienType: "grunt",
            })
          }
          audio.play(600, 0.25, "triangle")
        }
      }

      // Melee (20 dmg, range 100)
      if (dist < 100 + player.radius) {
        if (player.invincibleTime <= 0 && !player.shield) {
          ctx.damagePlayer(20, "theHive.amalgamMelee")
          screenShake.shake(12)
          floatingTexts.spawn(player.x, player.y - 30, "-20", "#fbbf24", 22)

          const pushAngle = Math.atan2(dy, dx)
          player.x += Math.cos(pushAngle) * 50
          player.y += Math.sin(pushAngle) * 50

          if (player.health <= 0) {
            audio.playSfx("chickenDeath")
            ui.setGameState("gameOver")
            return
          }
        }
      }

      // PHASE TRANSITION: HP < 600 → Phase 2
      if (boss.health <= 600) {
        boss.hivePhase = 2
        boss.hivePhase2Timer = 0

        boss.hiveLordA = {
          x: canvasWidth * 0.3,
          y: canvasHeight * 0.2,
          health: 300,
          maxHealth: 300,
          shootTimer: 0,
        }
        boss.hiveLordB = {
          x: canvasWidth * 0.7,
          y: canvasHeight * 0.2,
          health: 300,
          maxHealth: 300,
          stunTimer: 0,
          healTimer: 0,
          isHealing: false,
        }

        boss.health = 600
        boss.x = -9999
        boss.y = -9999
        boss.radius = 0

        audio.play(200, 0.5, "sawtooth")
        screenShake.shake(30)
        particles.burst(canvasWidth * 0.3, canvasHeight * 0.2, "#3b82f6")
        particles.burst(canvasWidth * 0.7, canvasHeight * 0.2, "#22c55e")
      }
    }
    // PHASE 2: 2 HIVE LORDS

    else if (boss.hivePhase === 2) {
      const lordA = boss.hiveLordA
      const lordB = boss.hiveLordB

      if (!lordA || !lordB) return

      boss.hivePhase2Timer = (boss.hivePhase2Timer || 0) + deltaTime

      const orbitCenterX = canvasWidth / 2
      const orbitCenterY = canvasHeight * 0.2
      const orbitRadius = 250
      const orbitSpeed = boss.hivePhase2Timer / 3000

      let targetAx = orbitCenterX + Math.cos(orbitSpeed) * orbitRadius
      let targetAy = orbitCenterY + Math.sin(orbitSpeed) * orbitRadius * 0.5
      let targetBx = orbitCenterX + Math.cos(orbitSpeed + Math.PI) * orbitRadius
      let targetBy = orbitCenterY + Math.sin(orbitSpeed + Math.PI) * orbitRadius * 0.5

      const healPhaseActive = boss.hivePhase2Timer % 8000 < 5000
      lordB.isHealing = healPhaseActive

      if (healPhaseActive) {
        targetAx = orbitCenterX - 40
        targetAy = orbitCenterY
        targetBx = orbitCenterX + 40
        targetBy = orbitCenterY

        // Heal 5 HP/s 
        const healPerFrame = (5 / 1000) * deltaTime
        lordA.health = Math.min(lordA.maxHealth, lordA.health + healPerFrame)
        lordB.health = Math.min(lordB.maxHealth, lordB.health + healPerFrame)
      }

      lordA.x += (targetAx - lordA.x) * 0.05
      lordA.y += (targetAy - lordA.y) * 0.05
      lordB.x += (targetBx - lordB.x) * 0.05
      lordB.y += (targetBy - lordB.y) * 0.05

      // Lord A: shoot (1.5s)
      lordA.shootTimer += deltaTime
      if (lordA.shootTimer >= 1500) {
        lordA.shootTimer = 0

        const angleToPlayer = Math.atan2(player.y - lordA.y, player.x - lordA.x)
        projectiles.spawn(
          lordA.x,
          lordA.y,
          Math.cos(angleToPlayer) * 5,
          Math.sin(angleToPlayer) * 5,
          {
            radius: 8,
            damage: 12,
            color: "#3b82f6",
            isEnemyProjectile: true,
          },
        )
        audio.play(500, 0.15, "square")
      }

      // Lord B: stun field (3s)
      lordB.stunTimer += deltaTime
      if (lordB.stunTimer >= 3000) {
        lordB.stunTimer = 0

        const stunRadius = 150
        const stunDx = player.x - lordB.x
        const stunDy = player.y - lordB.y
        const stunDist = Math.sqrt(stunDx * stunDx + stunDy * stunDy)

        if (stunDist < stunRadius + player.radius) {
          player.invincibleTime = Math.max(player.invincibleTime, 360)
          screenShake.shake(15)
          floatingTexts.spawn(player.x, player.y - 30, "STUNNED!", "#a855f7", 24)
          audio.playSfx("chickenHit")
        }

        audio.play(300, 0.3, "sawtooth")
      }

      // Melee collision
      const distA = Math.sqrt((player.x - lordA.x) ** 2 + (player.y - lordA.y) ** 2)
      const distB = Math.sqrt((player.x - lordB.x) ** 2 + (player.y - lordB.y) ** 2)
      const lordRadius = 30

      if (
        (distA < player.radius + lordRadius || distB < player.radius + lordRadius) &&
        player.invincibleTime <= 0 &&
        !player.shield
      ) {
        ctx.damagePlayer(15, "theHive.lordMelee")
        screenShake.shake(10)
        floatingTexts.spawn(player.x, player.y - 30, "-15", "#ff0000", 20)

        if (player.health <= 0) {
          audio.playSfx("chickenDeath")
          ui.setGameState("gameOver")
          return
        }
      }

      // PHASE TRANSITION: total HP < 400 → Phase 3
      if (lordA.health + lordB.health < 400) {
        boss.hivePhase = 3

        // Initialize 4 hive spawns in corners
        const spawnPositions = [
          { x: canvasWidth * 0.25, y: canvasHeight * 0.3 },
          { x: canvasWidth * 0.75, y: canvasHeight * 0.3 },
          { x: canvasWidth * 0.25, y: canvasHeight * 0.7 },
          { x: canvasWidth * 0.75, y: canvasHeight * 0.7 },
        ]

        boss.hiveSpawns = spawnPositions.map((pos, i) => ({
          x: pos.x,
          y: pos.y,
          health: 100,
          maxHealth: 100,
          shootTimer: 0,
          figureEightPhase: (i / 4) * Math.PI * 2,
          figureEightCenterX: pos.x,
          figureEightCenterY: pos.y,
          figureEightRadiusX: 180,
          figureEightRadiusY: 80,
        }))

        // Hide lords
        boss.hiveLordA = undefined
        boss.hiveLordB = undefined

        audio.play(250, 0.6, "sawtooth")
        screenShake.shake(35)
        for (const pos of spawnPositions) {
          particles.burst(pos.x, pos.y, "#dc2626")
        }
      }
    }
    // PHASE 3: 4 HIVE SPAWNS (figure-eight)

    else if (boss.hivePhase === 3) {
      const spawns = boss.hiveSpawns
      if (!spawns) return

      for (let i = 0; i < spawns.length; i++) {
        const spawn = spawns[i]

        // Figure-eight movement
        spawn.figureEightPhase += deltaTime / 1000

        const phase = spawn.figureEightPhase
        spawn.x = spawn.figureEightCenterX + Math.sin(phase) * spawn.figureEightRadiusX
        spawn.y = spawn.figureEightCenterY + Math.sin(phase * 2) * spawn.figureEightRadiusY

        spawn.x = Math.max(30, Math.min(canvasWidth - 30, spawn.x))
        spawn.y = Math.max(30, Math.min(canvasHeight - 30, spawn.y))

        spawn.shootTimer += deltaTime
        if (spawn.shootTimer >= 2000) {
          spawn.shootTimer = 0
        }
      }

      // Synchronized shooting
      const masterSpawn = spawns[0]
      if (masterSpawn.shootTimer >= 2000 - deltaTime && masterSpawn.shootTimer < 2000) {
        for (const spawn of spawns) {
          const angleToPlayer = Math.atan2(player.y - spawn.y, player.x - spawn.x)
          projectiles.spawn(
            spawn.x,
            spawn.y,
            Math.cos(angleToPlayer) * 4,
            Math.sin(angleToPlayer) * 4,
            {
              radius: 7,
              damage: 10,
              color: "#dc2626",
              isEnemyProjectile: true,
            },
          )
        }
        audio.play(400, 0.2, "square")
      }

      // Reset all timers when master resets
      if (masterSpawn.shootTimer >= 2000) {
        for (const spawn of spawns) {
          spawn.shootTimer = 0
        }
      }

      // Contact damage
      for (const spawn of spawns) {
        const sdx = player.x - spawn.x
        const sdy = player.y - spawn.y
        const sdist = Math.sqrt(sdx * sdx + sdy * sdy)

        if (
          sdist < player.radius + 25 &&
          player.invincibleTime <= 0 &&
          !player.shield
        ) {
          ctx.damagePlayer(12, "theHive.spawnMelee")
          screenShake.shake(8)
          floatingTexts.spawn(player.x, player.y - 30, "-12", "#dc2626", 18)

          if (player.health <= 0) {
            audio.playSfx("chickenDeath")
            ui.setGameState("gameOver")
            return
          }
        }
      }

      // PHASE TRANSITION: total HP < 200 → Phase 4
      const totalSpawnHP = spawns.reduce((sum, s) => sum + s.health, 0)
      if (totalSpawnHP < 200) {
        boss.hivePhase = 4
        boss.hiveSpawns = undefined
        boss.hiveFinalWave = true

        // Spawn hive tanks (4)
        for (let i = 0; i < 4; i++) {
          const spawnAngle = (i / 4) * Math.PI * 2
          const enemy = enemies.spawn({
            x: canvasWidth / 2 + Math.cos(spawnAngle) * 150,
            y: canvasHeight / 2 + Math.sin(spawnAngle) * 150,
            radius: 18,
            speed: 0.6,
            health: 30,
            type: "tank",
            alienType: "tank",
          })
          enemy.isHiveEnemy = true
        }

        // Spawn hive grunts (8)
        for (let i = 0; i < 8; i++) {
          const spawnAngle = (i / 8) * Math.PI * 2
          const enemy = enemies.spawn({
            x: canvasWidth / 2 + Math.cos(spawnAngle) * 250,
            y: canvasHeight / 2 + Math.sin(spawnAngle) * 250,
            radius: 12,
            speed: 1.2,
            health: 10,
            type: "grunt",
            alienType: "grunt",
          })
          enemy.isHiveEnemy = true
        }

        audio.play(150, 0.8, "sawtooth")
        screenShake.shake(40)
        particles.burst(canvasWidth / 2, canvasHeight / 2, "#dc2626", 30)
      }
    }
    // PHASE 4: FINAL WAVE (hive enemies cleanup)

    else if (boss.hiveFinalWave) {
      const hiveEnemiesAlive = ctx.getEnemies().filter((e) => e.isHiveEnemy)
      if (hiveEnemiesAlive.length === 0) {
        boss.health = 0
        audio.playSfx("bossDefeat")
        screenShake.shake(50)
        particles.burst(player.x, player.y, "#ffff00", 40)
        floatingTexts.spawn(player.x, player.y - 60, "VICTORY!", "#ffff00", 40)

        ctx.killBoss()
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawTheHive(ctx, boss, bossTime, player)
  },
}