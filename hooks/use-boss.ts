
import { useRef, type RefObject } from "react"
import type { Boss, BossType, Enemy, Player, Projectile, GameState } from "@/lib/game/types"
import type { OscillatorWaveType } from "@/lib/game/audio"
import { getBossBehavior } from "@/lib/game/bosses"
import { spawnBoss as spawnBossFromRegistry } from "@/lib/game/boss-spawning"
import { createBossContext } from "@/lib/game/context/impl/create-boss-context"


export type UseBossOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  playerRef: RefObject<Player | null>
  enemiesRef: RefObject<Enemy[]>
  projectilesRef: RefObject<Projectile[]>
  waveRef: RefObject<number>
  lastBossWaveRef: RefObject<number>
  gameTimeRef: RefObject<number>
  scoreRef: RefObject<number>
  killCountRef: RefObject<number>
  gameStateRef: RefObject<string>
  gameContext: {
    projectiles: any
    enemies: any
    particles: any
    floatingTexts: any
    screenShake: any
    audio: any
    ui: any
  }
 playSound: (freq: number, dur: number, type?: OscillatorWaveType) => void
  chickenHitSound: () => void
  addFloatingText: (x: number, y: number, text: string, color: string, size?: number) => void
  addScreenShake: (intensity: number) => void
  spawnWeaponPowerUp: (x: number, y: number) => void
  setScore: (score: number) => void
  setKillCount: (count: number) => void
  setFinalScore: (score: number) => void
  setFinalKillCount: (count: number) => void
  setFinalWave: (wave: number) => void
  setGameState: (state: GameState) => void
}

export function useBoss(options: UseBossOptions) {
  const bossRef = useRef<Boss | null>(null)

const spawnBoss = (canvas: HTMLCanvasElement) => {
  const boss = spawnBossFromRegistry({
    canvas,
    lastBossWave: options.lastBossWaveRef.current,
    playSound: (freq, dur, type) => options.playSound(freq, dur, type),
  })

  if (boss) {
    bossRef.current = boss
  }
}

  const updateBoss = (canvas: HTMLCanvasElement, deltaTime: number) => {
    const boss = bossRef.current
    const player = options.playerRef.current
    if (!boss || !player) return

    const runBossUpdate = (type: BossType) => {
      const behavior = getBossBehavior(type)
      const bossCtx = createBossContext({
        boss,
        player,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        deltaTime,
        bossTime: options.gameTimeRef.current,
        enemiesRef: options.enemiesRef,
        projectilesRef: options.projectilesRef,
        getWave: () => options.waveRef.current,
        killBoss: () => {
          bossRef.current = null
          options.lastBossWaveRef.current = options.waveRef.current
        },
        damagePlayer: (amount, _source) => {
          if (player.invincibleTime <= 0 && !player.shield) {
            player.health -= amount
            player.invincibleTime = 60
            options.chickenHitSound()
          }
        },
        healPlayer: (amount) => {
          player.health = Math.min(player.maxHealth, player.health + amount)
        },
        projectiles: options.gameContext.projectiles,
        enemies: options.gameContext.enemies,
        particles: options.gameContext.particles,
        floatingTexts: options.gameContext.floatingTexts,
        screenShake: options.gameContext.screenShake,
        audio: options.gameContext.audio,
        ui: options.gameContext.ui,
      })
      behavior.update(boss, bossCtx)

      // Rewards on death
      if (!bossRef.current) {
        const rewardScore =
          type === "omegaPrime" ? 2000 : type === "theHive" ? 1000 : 500
        const rewardPowerUps =
          type === "omegaPrime" || type === "theHive" ? 5 : 3

        options.scoreRef.current += rewardScore
        options.setScore(options.scoreRef.current)
        options.killCountRef.current += 1
        options.setKillCount(options.killCountRef.current)

        const fx = type === "omegaPrime" ? canvas.width / 2 : boss.x
        const fy = type === "omegaPrime" ? canvas.height / 2 : boss.y

        options.addFloatingText(fx, fy - 40, `+${rewardScore}`, "#ffff00", 32)
        options.addScreenShake(type === "omegaPrime" ? 25 : type === "theHive" ? 20 : 15)
        options.playSound(200, 0.5, "sawtooth")

        for (let p = 0; p < rewardPowerUps; p++) {
          options.spawnWeaponPowerUp(
            fx + (Math.random() - 0.5) * (type === "omegaPrime" ? 120 : 80),
            fy + (Math.random() - 0.5) * (type === "omegaPrime" ? 120 : 80),
          )
        }
      }

      // Extra: game over check for bosses that can kill player
      if (options.gameStateRef.current === "gameOver") {
        options.setFinalScore(options.scoreRef.current)
        options.setFinalKillCount(options.killCountRef.current)
        options.setFinalWave(options.waveRef.current)
      }
    }

    switch (boss.type) {
      case "alienMouse":
        runBossUpdate("alienMouse")
        break
      case "alienBumblebee":
        runBossUpdate("alienBumblebee")
        break
      case "alienOctopus":
        runBossUpdate("alienOctopus")
        break
      case "alienMantis":
        runBossUpdate("alienMantis")
        break
      case "abductor":
        runBossUpdate("abductor")
        break
      case "queenXenoHen":
        runBossUpdate("queenXenoHen")
        break
      case "devourer":
        runBossUpdate("devourer")
        break
      case "theButcher":
        runBossUpdate("theButcher")
        break
      case "voidReaper":
        runBossUpdate("voidReaper")
        break
      case "plagueBringer":
        runBossUpdate("plagueBringer")
        break
      case "ironTyrant":
        runBossUpdate("ironTyrant")
        break
      case "voidLeviathan":
        runBossUpdate("voidLeviathan")
        break
      case "theHive":
        runBossUpdate("theHive")
        break
      case "omegaPrime":
        runBossUpdate("omegaPrime")
        break
    }

    // Keep boss in bounds
    boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
    boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))

    // UNIVERSAL BOSS CONTACT DAMAGE
    {
      const dxp = player.x - boss.x
      const dyp = player.y - boss.y
      const distp = Math.sqrt(dxp * dxp + dyp * dyp)
      const contactDist = player.radius + boss.radius * 0.85

      if (distp < contactDist) {
        if (boss.phase === 1 && !boss.spawnTimer) boss.spawnTimer = 0

        if (player.invincibleTime <= 0 && !player.shield) {
          let contactDamage = 15
          switch (boss.type) {
            case "alienMouse":
              contactDamage = 10
              break
            case "alienBumblebee":
              contactDamage = 12
              break
            case "alienOctopus":
              contactDamage = 18
              break
            case "alienMantis":
              contactDamage = 20
              break
            case "abductor":
              contactDamage = 15
              break
            case "queenXenoHen":
              contactDamage = boss.queenEnraged ? 20 : 15
              break
            case "devourer":
              contactDamage = 25
              break
            case "theButcher":
              contactDamage = 30
              break
            case "voidReaper":
              contactDamage = 35
              break
            case "plagueBringer":
              contactDamage = 45
              break
            case "ironTyrant":
              contactDamage = 55
              break
            case "voidLeviathan":
              contactDamage = 65
              break
            case "theHive":
              contactDamage = 75
              break
            case "omegaPrime":
              contactDamage = 100
              break
          }

          player.health -= contactDamage
          player.invincibleTime = 60
          options.chickenHitSound()
          options.addScreenShake(10)
          options.addFloatingText(player.x, player.y - 30, `-${contactDamage}`, "#ff0000", 18)

          if (player.health <= 0) {
            options.setGameState("gameOver")
            options.setFinalScore(options.scoreRef.current)
            options.setFinalKillCount(options.killCountRef.current)
            options.setFinalWave(options.waveRef.current)
          }
        }
      }
    }
  }

  return {
    bossRef,
    spawnBoss,
    updateBoss,
  }
}