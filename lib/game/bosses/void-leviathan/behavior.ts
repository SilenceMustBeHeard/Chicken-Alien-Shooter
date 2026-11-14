
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"
import { drawVoidLeviathan } from "././draw"

const TYPE: BossType = "voidLeviathan"

export const voidLeviathanBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 550,
      radius: 40,
      speed: 1.4,
    }
  },

  create(canvasWidth, _canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: -40 - 20,
      radius: 40,
      health: 550,
      maxHealth: 550,
      type: TYPE,
      speed: 1.4,
      spawnTimer: 0,
      leviathanPhase: "forceField",
      leviathanPhaseTimer: 0,
      leviathanWhipTimer: 0,
      leviathanDashCount: 0,
      leviathanHealTimer: 0,
      leviathanWaveTimer: 0,
      leviathanTurnTimer: 0,
      leviathanBurstTimer: 0,
      leviathanWaveCount: 0,
      leviathanWaveSequenceTimer: 0,
      leviathanTrail: [],
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
    boss.spawnTimer ??= 0
    boss.leviathanPhase ??= "forceField"
    boss.leviathanPhaseTimer ??= 0
    boss.leviathanWhipTimer ??= 0
    boss.leviathanDashCount ??= 0
    boss.leviathanHealTimer ??= 0
    boss.leviathanWaveTimer ??= 0
    boss.leviathanTurnTimer ??= 0
    boss.leviathanBurstTimer ??= 0
    boss.leviathanWaveCount ??= 0
    boss.leviathanWaveSequenceTimer ??= 0

    boss.spawnTimer += deltaTime
    boss.leviathanPhaseTimer += deltaTime

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.hypot(dx, dy)
    const angleToPlayer = Math.atan2(dy, dx)
    const frameScale = Math.min(deltaTime / 16.667, 2.5)

    if (boss.leviathanHeading === undefined) {
      boss.leviathanHeading = angleToPlayer
    }

    // PHASE 1: FORCE FIELD — 5 seconds
    if (boss.leviathanPhase === "forceField") {
      const heading = boss.leviathanHeading
      const turn = Math.atan2(
        Math.sin(angleToPlayer - heading),
        Math.cos(angleToPlayer - heading),
      )

      boss.leviathanHeading =
        heading + Math.max(-0.035, Math.min(0.035, turn)) * frameScale

      boss.x +=
        Math.cos(boss.leviathanHeading) * boss.speed * 0.5 * frameScale
      boss.y +=
        Math.sin(boss.leviathanHeading) * boss.speed * 0.5 * frameScale

      // Fire three waves in sequence
      boss.leviathanWhipTimer += deltaTime

      if (
        boss.leviathanWaveCount === 0 &&
        boss.leviathanWhipTimer >= 1500
      ) {
        boss.leviathanWhipTimer = 0
        boss.leviathanWaveCount = 1
        boss.leviathanWaveSequenceTimer = 0
      }

      if (boss.leviathanWaveCount > 0) {
        boss.leviathanWaveSequenceTimer += deltaTime

        if (
          boss.leviathanWaveCount === 1 ||
          boss.leviathanWaveSequenceTimer >= 220
        ) {
          if (boss.leviathanWaveCount > 1) {
            boss.leviathanWaveSequenceTimer = 0
          }

          const tailAngle = boss.leviathanHeading + Math.PI
          const tailX = boss.x + Math.cos(tailAngle) * boss.radius * 0.4
          const tailY = boss.y + Math.sin(tailAngle) * boss.radius * 0.4

          projectiles.spawn(
            tailX,
            tailY,
            Math.cos(angleToPlayer) * 2,
            Math.sin(angleToPlayer) * 2,
            {
              radius: boss.radius * 1.2,
              damage: 50,
              color: "#a855f7",
              isEnemyProjectile: true,
              // custom fields — extend Projectile type or use cast
              ...({
                isLeviathanWave: true,
                waveAngle: angleToPlayer,
                waveScaleX: 1,
                waveScaleY: 0.3,
                waveAge: 0,
                waveMaxAge: 3000,
              } as Partial<typeof projectiles>),
            } as Parameters<typeof projectiles.spawn>[4],
          )

          audio.play(300, 0.12, "sawtooth")

          boss.leviathanWaveCount += 1

          if (boss.leviathanWaveCount > 3) {
            boss.leviathanWaveCount = 0
            boss.leviathanWaveSequenceTimer = 0
          }
        }
      }

      if (boss.leviathanPhaseTimer >= 5000) {
        boss.leviathanPhase = "zigzag"
        boss.leviathanPhaseTimer = 0
        boss.leviathanDashCount = 0
        boss.leviathanTurnTimer = 0
        boss.leviathanBurstTimer = 0
        boss.leviathanWaveCount = 0
        boss.leviathanWaveSequenceTimer = 0
        boss.leviathanWhipTimer = 0
        boss.leviathanHeading = angleToPlayer
        audio.play(600, 0.3, "square")
      }
    }
    // PHASE 2: ZIGZAG HUNT — 10 seconds, vulnerable

    else if (boss.leviathanPhase === "zigzag") {
      boss.leviathanTurnTimer += deltaTime

      // Four acceleration bursts
      if (
        boss.leviathanDashCount < 4 &&
        boss.leviathanTurnTimer >= 2000
      ) {
        boss.leviathanTurnTimer -= 2000
        boss.leviathanDashCount += 1
        boss.leviathanBurstTimer = 350

        audio.play(450 + boss.leviathanDashCount * 70, 0.12, "sawtooth")
        screenShake.shake(5)
      }

      boss.leviathanBurstTimer = Math.max(
        0,
        boss.leviathanBurstTimer - deltaTime,
      )

      const weave = Math.sin(boss.leviathanPhaseTimer / 190) * 0.9
      const diagonalOffset = Math.sin(boss.leviathanPhaseTimer / 420) * 0.45

      const desiredAngle = angleToPlayer + weave + diagonalOffset

      const heading = boss.leviathanHeading ?? angleToPlayer
      const angleDifference = Math.atan2(
        Math.sin(desiredAngle - heading),
        Math.cos(desiredAngle - heading),
      )

      const turnRate = 0.15 * frameScale

      boss.leviathanHeading =
        heading + Math.max(-turnRate, Math.min(turnRate, angleDifference))

      const moveSpeed =
        boss.speed * (boss.leviathanBurstTimer > 0 ? 5 : 2.5)

      boss.x += Math.cos(boss.leviathanHeading) * moveSpeed * frameScale
      boss.y += Math.sin(boss.leviathanHeading) * moveSpeed * frameScale

      const pdx = player.x - boss.x
      const pdy = player.y - boss.y
      const postMoveDist = Math.hypot(pdx, pdy)

      if (
        postMoveDist < player.radius + boss.radius &&
        player.invincibleTime <= 0 &&
        !player.shield
      ) {
        ctx.damagePlayer(25, "voidLeviathan.zigzag")
        screenShake.shake(15)
        floatingTexts.spawn(player.x, player.y - 30, "-25", "#a855f7", 24)

        const pushAngle = Math.atan2(pdy, pdx)
        player.x += Math.cos(pushAngle) * 80
        player.y += Math.sin(pushAngle) * 80

        particles.burst(boss.x, boss.y, "#a855f7")

        if (player.health <= 0) {
          audio.playSfx("chickenDeath")
          ui.setGameState("gameOver")
          return
        }
      }

      if (boss.leviathanPhaseTimer >= 10000) {
        boss.leviathanPhase = "uroboros"
        boss.leviathanPhaseTimer = 0
        boss.leviathanHealTimer = 0
        boss.leviathanBurstTimer = 0
        boss.leviathanTurnTimer = 0

        audio.play(400, 0.4, "triangle")
      }
    }
    // PHASE 3: OUROBOROS — 4 seconds

    else if (boss.leviathanPhase === "uroboros") {
      // Heal 20 HP per second
      boss.health = Math.min(
        boss.maxHealth,
        boss.health + (20 * deltaTime) / 1000,
      )

      if (dist < 300 + player.radius) {
        player.health -= (35 * deltaTime) / 1000
        screenShake.shake(10)

        if (player.health <= 0) {
          audio.playSfx("chickenDeath")
          screenShake.shake(30)
          ui.setGameState("gameOver")
          return
        }
      }

      if (boss.leviathanPhaseTimer >= 4000) {
        boss.leviathanPhase = "forceField"
        boss.leviathanPhaseTimer = 0
        boss.leviathanWhipTimer = 0
        boss.leviathanWaveCount = 0
        boss.leviathanWaveSequenceTimer = 0
        boss.leviathanTurnTimer = 0
        boss.leviathanBurstTimer = 0

        audio.play(800, 0.3, "sine")
      }
    }

    //  Update trail AFTER movement 
    
    if (!boss.leviathanTrail) {
      boss.leviathanTrail = []
    }

    boss.leviathanTrail.unshift({ x: boss.x, y: boss.y })

    if (boss.leviathanTrail.length > 22) {
      boss.leviathanTrail.length = 22
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawVoidLeviathan(ctx, boss, bossTime, player)
  },
}