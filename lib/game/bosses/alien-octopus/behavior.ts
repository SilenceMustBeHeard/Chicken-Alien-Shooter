import type { Boss, BossType } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"
import type { BossBehavior, BossStats } from "../base/boss-behavior"

import { drawAlienOctopus } from "./draw"

const TYPE: BossType = "alienOctopus"

const GRAB_RANGE = 300

const GRAB_COOLDOWN = 3000
const WINDUP_DURATION = 550
const STRIKE_DURATION = 300
const RETRACT_DURATION = 550

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
      reaperShootTimer: 0,
      combatTimer: 0,
      plagueTimer: 0,

      octopusGrabTimer: 0,
      octopusGrabState: "idle",
      octopusGrabTargetX: 0,
      octopusGrabTargetY: 0,
    }
  },

  update(boss, ctx: BossContext) {
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

    // TIMERS

    boss.spawnTimer = (boss.spawnTimer ?? 0) + deltaTime
    boss.combatTimer = (boss.combatTimer ?? 0) + deltaTime
    boss.plagueTimer = (boss.plagueTimer ?? 0) + deltaTime
    boss.octopusGrabTimer = (boss.octopusGrabTimer ?? 0) + deltaTime

    // CHASE

    const dx = player.x - boss.x
    const dy = player.y - boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    boss.x += Math.cos(angle) * boss.speed
    boss.y += Math.sin(angle) * boss.speed

    // TENTACLE PULL - RADIAL ATTACK

    switch (boss.octopusGrabState ?? "idle") {
      case "idle": {
        if (boss.octopusGrabTimer >= GRAB_COOLDOWN) {
          boss.octopusGrabTimer = 0
          boss.octopusGrabState = "windup"

          audio.play(400, 0.25, "sawtooth")
        }

        break
      }

      case "windup": {
        if (boss.octopusGrabTimer >= WINDUP_DURATION) {
          boss.octopusGrabTimer = 0
          boss.octopusGrabState = "strike"
        }

        break
      }

      case "strike": {
        if (boss.octopusGrabTimer >= STRIKE_DURATION) {
          boss.octopusGrabTimer = 0
          boss.octopusGrabState = "retract"

          // Recalculate distance at the actual impact moment.
          const hitDx = player.x - boss.x
          const hitDy = player.y - boss.y
          const hitDist = Math.sqrt(hitDx * hitDx + hitDy * hitDy)

          const isInsideRange = hitDist <= GRAB_RANGE + player.radius
          const canBeGrabbed =
            player.invincibleTime <= 0 && !player.shield

          // ONLY pull and damage if the player is inside the attack range.
          if (isInsideRange && canBeGrabbed) {
            ctx.damagePlayer(15, "alienOctopus.grab")

            screenShake.shake(12)

            floatingTexts.spawn(
              player.x,
              player.y - 30,
              "-15",
              "#a855f7",
              22,
            )

            if (hitDist > 0) {
              const pullX = hitDx / hitDist
              const pullY = hitDy / hitDist

              player.x -= pullX * 120
              player.y -= pullY * 120
            }

            particles.burst(
              player.x,
              player.y,
              "#a855f7",
              18,
            )

            audio.play(250, 0.25, "sawtooth")
          } else {
            // Miss: no damage and absolutely no pulling.
            audio.play(180, 0.12, "triangle")
          }
        }

        break
      }

      case "retract": {
        if (boss.octopusGrabTimer >= RETRACT_DURATION) {
          boss.octopusGrabTimer = 0
          boss.octopusGrabState = "idle"
        }

        break
      }
    }

    // INK SPRAY - EVERY 5 SECONDS

    if (boss.combatTimer >= 5000) {
      boss.combatTimer = 0

      projectiles.spawnRadial(boss.x, boss.y, 8, 3.5, {
        radius: 7,
        damage: 8,
        color: "#4c1d95",
        isEnemyProjectile: true,
      })

      audio.play(600, 0.2, "triangle")
      particles.burst(boss.x, boss.y, "#4c1d95", 20)
    }

    // BIO-EGGS - EVERY 8 SECONDS

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

    // CONTACT DAMAGE - SEPARATE FROM GRAB

    const contactDx = player.x - boss.x
    const contactDy = player.y - boss.y
    const contactDist = Math.sqrt(
      contactDx * contactDx + contactDy * contactDy,
    )

    if (
      contactDist < player.radius + boss.radius &&
      player.invincibleTime <= 0 &&
      !player.shield
    ) {
      ctx.damagePlayer(15, "alienOctopus.contact")

      screenShake.shake(10)

      floatingTexts.spawn(
        player.x,
        player.y - 30,
        "-15",
        "#ff0000",
        22,
      )

      if (contactDist > 0) {
        player.x += (contactDx / contactDist) * 50
        player.y += (contactDy / contactDist) * 50
      }
    }
  },

  draw(ctx, boss, bossTime, player) {
    drawAlienOctopus(ctx, boss, bossTime, player)
  },
}