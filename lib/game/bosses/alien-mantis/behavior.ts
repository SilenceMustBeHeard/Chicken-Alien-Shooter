
import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"

import { drawAlienMantis } from "./draw"

const TYPE: BossType = "alienMantis"

// MOVEMENT
const STALK_SPEED = 3.4
const PREFERRED_DISTANCE = 400
const ATTACK_RANGE = 650

// ATTACK CYCLE
const ATTACK_COOLDOWN = 650
const WINDUP_DURATION = 280
const LUNGE_DURATION = 420
const RECOVERY_DURATION = 180

// ATTACK POWER
const LUNGE_SPEED = 20
const LUNGE_DAMAGE = 20

export const alienMantisBehavior: BossBehavior = {
  type: TYPE,

  getStats(): BossStats {
    return {
      health: 160,
      radius: 46,
      speed: STALK_SPEED,
    }
  },

  create(canvasWidth, canvasHeight): Boss {
    return {
      x: canvasWidth / 2,
      y: canvasHeight * 0.25,
      radius: 46,
      health: 160,
      maxHealth: 160,
      type: TYPE,
      speed: STALK_SPEED,

      spawnTimer: 0,
      reaperShootTimer: 0,
      combatTimer: 0,
      plagueTimer: 0,

      mantisState: "stalk",
      mantisAttackTimer: 0,
      mantisStateTimer: 0,
      mantisAttackAngle: 0,
      mantisAttackProgress: 0,
      mantisTargetX: 0,
      mantisTargetY: 0,
      mantisHasHit: false,
      mantisStalkTimer: 0,
    }
  },

  update(boss, ctx: BossContext) {
    const {
      player,
      deltaTime,
      particles,
      floatingTexts,
      screenShake,
      audio,
    } = ctx

    // Normalize movement for different frame rates.
    const frameScale = Math.min(deltaTime / 16.67, 2)

    const state = boss.mantisState ?? "stalk"

    boss.mantisStateTimer =
      (boss.mantisStateTimer ?? 0) + deltaTime

    boss.mantisStalkTimer =
      (boss.mantisStalkTimer ?? 0) + deltaTime

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    // ATTACK COOLDOWN ONLY COUNTS DURING STALK
    if (state === "stalk") {
      boss.mantisAttackTimer =
        (boss.mantisAttackTimer ?? 0) + deltaTime
    }

    switch (state) {
 
      // STALK


      case "stalk": {
        boss.mantisAttackProgress = 0

        if (dist > PREFERRED_DISTANCE) {
          const strafe =
            Math.sin(boss.mantisStalkTimer / 190) * 0.32

          const moveAngle = angle + strafe

          boss.x +=
            Math.cos(moveAngle) * STALK_SPEED * frameScale

          boss.y +=
            Math.sin(moveAngle) * STALK_SPEED * frameScale
        } else {
          // Circle around the player 
          const orbitDirection =
            Math.sin(boss.mantisStalkTimer / 500) >= 0 ? 1 : -1

          const orbitAngle = angle + Math.PI / 2 * orbitDirection

          boss.x +=
            Math.cos(orbitAngle) * STALK_SPEED * 0.65 * frameScale

          boss.y +=
            Math.sin(orbitAngle) * STALK_SPEED * 0.65 * frameScale
        }

     if (
  (boss.mantisAttackTimer ?? 0) >= ATTACK_COOLDOWN &&
  dist <= ATTACK_RANGE
) {
          boss.mantisAttackTimer = 0
          boss.mantisState = "windup"
          boss.mantisStateTimer = 0

          boss.mantisTargetX = player.x
          boss.mantisTargetY = player.y

          boss.mantisAttackAngle = angle
          boss.mantisAttackProgress = 0
          boss.mantisHasHit = false

          audio.play(500, 0.16, "sawtooth")
        }

        break
      }

      // WINDUP

      case "windup": {
        boss.mantisAttackProgress = Math.min(
          boss.mantisStateTimer / WINDUP_DURATION,
          1,
        )

        const targetX = boss.mantisTargetX ?? player.x
        const targetY = boss.mantisTargetY ?? player.y

        const targetDx = targetX - boss.x
        const targetDy = targetY - boss.y

        boss.mantisAttackAngle = Math.atan2(
          targetDy,
          targetDx,
        )

        if (boss.mantisStateTimer >= WINDUP_DURATION) {
          boss.mantisState = "lunge"
          boss.mantisStateTimer = 0
          boss.mantisAttackProgress = 0
          boss.mantisHasHit = false

          audio.play(850, 0.18, "sawtooth")
          particles.burst(
            boss.x,
            boss.y,
            "#84cc16",
            8,
          )
        }

        break
      }

    
      // LUNGE
   

      case "lunge": {
        boss.mantisAttackProgress = Math.min(
          boss.mantisStateTimer / LUNGE_DURATION,
          1,
        )

        const attackAngle = boss.mantisAttackAngle ?? 0

        const lungeX = Math.cos(attackAngle)
        const lungeY = Math.sin(attackAngle)

        // Slight acceleration at the beginning of the dash
        const acceleration =
          0.85 + Math.sin(
            Math.min(boss.mantisStateTimer / LUNGE_DURATION, 1)
            * Math.PI,
          ) * 0.35

        const currentSpeed = LUNGE_SPEED * acceleration

        boss.x += lungeX * currentSpeed * frameScale
        boss.y += lungeY * currentSpeed * frameScale

        // Actual collision check
        const hitDx = player.x - boss.x
        const hitDy = player.y - boss.y
        const hitDist = Math.sqrt(
          hitDx * hitDx + hitDy * hitDy,
        )

        const isColliding =
          hitDist <= boss.radius + player.radius

        // One hit per attack
        if (isColliding && !boss.mantisHasHit) {
          boss.mantisHasHit = true

          const canTakeDamage =
            player.invincibleTime <= 0 && !player.shield

          if (canTakeDamage) {
            ctx.damagePlayer(
              LUNGE_DAMAGE,
              "alienMantis.lunge",
            )

            screenShake.shake(13)

            floatingTexts.spawn(
              player.x,
              player.y - 30,
              `-${LUNGE_DAMAGE}`,
              "#84cc16",
              22,
            )

            if (hitDist > 0) {
              const knockbackX = hitDx / hitDist
              const knockbackY = hitDy / hitDist

              player.x += knockbackX * 95
              player.y += knockbackY * 95
            }

            particles.burst(
              player.x,
              player.y,
              "#84cc16",
              24,
            )

            audio.play(180, 0.22, "sawtooth")
          } else {
            particles.burst(
              player.x,
              player.y,
              "#a3e635",
              8,
            )
          }
        }

        // Dash trail.
        if (Math.random() < 0.45) {
          particles.burst(
            boss.x - lungeX * 25,
            boss.y - lungeY * 25,
            "#65a30d",
            2,
          )
        }

        if (boss.mantisStateTimer >= LUNGE_DURATION) {
          boss.mantisState = "recovery"
          boss.mantisStateTimer = 0
          boss.mantisAttackProgress = 0

          audio.play(260, 0.1, "triangle")
        }

        break
      }


      // RECOVERY

      case "recovery": {
        boss.mantisAttackProgress = Math.min(
          boss.mantisStateTimer / RECOVERY_DURATION,
          1,
        )

        if (boss.mantisStateTimer >= RECOVERY_DURATION) {
          boss.mantisState = "stalk"
          boss.mantisStateTimer = 0
          boss.mantisAttackProgress = 0
        }

        break
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawAlienMantis(ctx, boss, bossTime, player)
  },
}
