
import type { Player, Enemy, Boss, Projectile } from "@/lib/game/types"
import type { OscillatorWaveType } from "@/lib/game/audio"

export type ProjectileCollisionContext = {
  projectiles: Projectile[]
  player: Player
  canvas: HTMLCanvasElement
  deltaTime: number
  bossRef: React.RefObject<Boss | null>
  enemiesRef: React.RefObject<Enemy[]>

  // Callbacks
  onLeviathanWaveHit: (proj: Projectile, player: Player) => void
  onHiveLordHit: (proj: Projectile, lordA: NonNullable<Boss["hiveLordA"]>, lordB: NonNullable<Boss["hiveLordB"]>) => void
  onHiveSpawnHit: (proj: Projectile, spawn: NonNullable<Boss["hiveSpawns"]>[number]) => void
  onEnemyProjectileHitPlayer: (proj: Projectile, player: Player) => void
  onBossHit: (proj: Projectile, boss: Boss) => void
  onEnemyHit: (proj: Projectile, enemy: Enemy) => void

  // Helpers
  createParticles: (x: number, y: number, color: string) => void
  addFloatingText: (x: number, y: number, text: string, color: string, size?: number) => void
  addScreenShake: (intensity: number) => void
  playSound: (freq: number, dur: number, type?: OscillatorWaveType) => void
  eggSplashSound: () => void
  enemyDeadSound: () => void
  chickenHitSound: () => void
  chickenDeathSound: () => void
  setGameOver: () => void
  spawnWeaponPowerUp: (x: number, y: number) => void
  getAlienColor: (type: Enemy["type"]) => string
  scoreRef: React.RefObject<number>
  setScore: (score: number) => void
  killCountRef: React.RefObject<number>
  setKillCount: (count: number) => void
}

/**
 * Updates all projectiles and handles collisions
 * Returns the filtered array (dead/out-of-bounds removed)
 */
export function updateProjectiles(ctx: ProjectileCollisionContext): Projectile[] {
  const {
    projectiles,
    player,
    canvas,
    deltaTime,
    bossRef,
    enemiesRef,
    onLeviathanWaveHit,
    onHiveLordHit,
    onHiveSpawnHit,
    onEnemyProjectileHitPlayer,
    onBossHit,
    onEnemyHit,
    createParticles,
    addFloatingText,
    addScreenShake,
    playSound,
    eggSplashSound,
    enemyDeadSound,
    chickenHitSound,
    chickenDeathSound,
    setGameOver,
    spawnWeaponPowerUp,
    getAlienColor,
    scoreRef,
    setScore,
    killCountRef,
    setKillCount,
  } = ctx

  return projectiles.filter((proj) => {
    if (proj.dead) return false

    //  LEVIATHAN WAVE
    if (proj.isLeviathanWave) {
      proj.waveAge = (proj.waveAge || 0) + deltaTime

      if (proj.waveAge >= (proj.waveMaxAge || 3500)) {
        return false
      }

      const waveMaxAge = proj.waveMaxAge || 3500
      const waveProgress = Math.min(proj.waveAge / waveMaxAge, 1)
      const currentRadius = proj.radius * (1 + waveProgress * 3.5)

      if (player.invincibleTime > 0) return true

      const waveDx = proj.x - player.x
      const waveDy = proj.y - player.y
      const waveDist = Math.sqrt(waveDx * waveDx + waveDy * waveDy)

      if (waveDist < currentRadius + player.radius) {
        if (!player.shield) {
          onLeviathanWaveHit(proj, player)
        }
        return false
      }

      return true
    }

    // HIVE PHASE 2 & 3: PLAYER PROJECTILES HIT LORDS/SPAWNS 
    {
      const hiveBoss = bossRef.current
      if (
        hiveBoss &&
        !proj.isEnemyProjectile &&
        (hiveBoss.hivePhase === 2 || hiveBoss.hivePhase === 3)
      ) {
        // Phase 2: Lords
        if (hiveBoss.hivePhase === 2 && hiveBoss.hiveLordA && hiveBoss.hiveLordB) {
          const lordA = hiveBoss.hiveLordA
          const lordB = hiveBoss.hiveLordB
          const lordRadius = 30
          const shieldReduction = 0.75

          const dA = Math.sqrt((proj.x - lordA.x) ** 2 + (proj.y - lordA.y) ** 2)
          const dB = Math.sqrt((proj.x - lordB.x) ** 2 + (proj.y - lordB.y) ** 2)

          if (dA < proj.radius + lordRadius) {
            lordA.health -= proj.damage * shieldReduction
            createParticles(proj.x, proj.y, "#3b82f6")
            addFloatingText(proj.x, proj.y - 20, `-${Math.round(proj.damage * shieldReduction)}`, "#93c5fd", 16)
            playSound(400, 0.08, "square")
            return false
          }

          if (dB < proj.radius + lordRadius) {
            lordB.health -= proj.damage
            createParticles(proj.x, proj.y, "#22c55e")
            addFloatingText(proj.x, proj.y - 20, `-${Math.round(proj.damage)}`, "#86efac", 16)
            playSound(400, 0.08, "square")
            return false
          }
        }

        // Phase 3: Hive Spawns
        if (hiveBoss.hivePhase === 3 && hiveBoss.hiveSpawns) {
          for (const spawn of hiveBoss.hiveSpawns) {
            const sdx = proj.x - spawn.x
            const sdy = proj.y - spawn.y
            const sdist = Math.sqrt(sdx * sdx + sdy * sdy)

            if (sdist < proj.radius + 25) {
              spawn.health -= proj.damage
              createParticles(proj.x, proj.y, "#dc2626")
              addFloatingText(proj.x, proj.y - 20, `-${Math.round(proj.damage)}`, "#fca5a5", 16)
              playSound(400, 0.08, "square")
              return false
            }
          }
        }
      }
    }

    // Move projectile
    proj.x += proj.vx
    proj.y += proj.vy

    // Out of bounds
    if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
      return false
    }

    //  ENEMY PROJECTILE: only hits player ───
    if (proj.isEnemyProjectile) {
      const dxp = proj.x - player.x
      const dyp = proj.y - player.y
      const distp = Math.sqrt(dxp * dxp + dyp * dyp)

      if (distp < proj.radius + player.radius) {
        if (!player.shield && player.invincibleTime <= 0) {
          onEnemyProjectileHitPlayer(proj, player)
        }
        return false
      }

      return true
    }

    //  PLAYER PROJECTILE: check boss 
    const boss = bossRef.current
    if (boss) {
      const bdx = proj.x - boss.x
      const bdy = proj.y - boss.y
      const bdist = Math.sqrt(bdx * bdx + bdy * bdy)

      const bossHit = proj.explosive && proj.explosionRadius
        ? bdist < proj.explosionRadius + boss.radius
        : bdist < proj.radius + boss.radius

      if (bossHit) {
        onBossHit(proj, boss)

        if (boss.health <= 0) {
          bossRef.current = null
        }

        if (!proj.piercing) {
          proj.dead = true
          return false
        }
      }
    }

    // PLAYER PROJECTILE: check enemies 
    const enemies = enemiesRef.current
    const enemiesToDamage: Enemy[] = []

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]
      const dx = proj.x - enemy.x
      const dy = proj.y - enemy.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (proj.explosive && proj.explosionRadius) {
        if (dist < proj.explosionRadius) {
          enemiesToDamage.push(enemy)
        }
      } else if (dist < proj.radius + enemy.radius) {
        enemiesToDamage.push(enemy)
        break
      }
    }

    if (enemiesToDamage.length > 0) {
      enemiesToDamage.forEach((enemy) => {
        onEnemyHit(proj, enemy)
      })

      if (proj.explosive) {
        createParticles(proj.x, proj.y, proj.color ?? "#ffffff")
        playSound(150, 0.2, "sawtooth")
        addScreenShake(6)
        addFloatingText(proj.x, proj.y - 20, "BOOM!", "#ff6600", 20)
      }

      return proj.piercing && !proj.explosive
    }

    return true
  })
}