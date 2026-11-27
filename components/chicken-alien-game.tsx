"use client"

import type React from "react"
import { useKeyboard } from "@/hooks/use-keyboard"
import { useCanvas } from "@/hooks/use-canvas"
import { useAudio } from "@/hooks/use-audio"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { createProjectileSpawner } from "@/lib/game/context/impl/create-projectile-spawner"
import { createEnemySpawner } from "@/lib/game/context/impl/create-enemy-spawner"
import { createParticleSpawner } from "@/lib/game/context/impl/create-particle-spawner"
import { createFloatingTextSpawner } from "@/lib/game/context/impl/create-floating-text-spawner"
import { createScreenShake } from "@/lib/game/context/impl/create-screen-shake"
import { createUIController } from "@/lib/game/context/impl/create-ui-controller"
import { createBossContext } from "@/lib/game/context/impl/create-boss-context"
import { createAudioSystem, type OscillatorWaveType } from "@/lib/game/audio"
import { getBossBehavior } from "@/lib/game/bosses"
import { spawnBoss as spawnBossFromRegistry } from "@/lib/game/boss-spawning"
import { drawPlayer as drawPlayerFromModule, updatePlayer as updatePlayerFromModule } from "@/lib/game/player"
import {
  drawAlienCreature as drawAlienCreatureFromModule,
  spawnEnemies as spawnEnemiesFromModule,
  updateEnemies as updateEnemiesFromModule,
} from "@/lib/game/enemies"
import {
  shoot as shootFromModule,
  updateProjectiles as updateProjectilesFromModule,
  drawProjectile as drawProjectileFromModule,
} from "@/lib/game/projectiles"
import {
  spawnPowerUp as spawnPowerUpFromModule,
  spawnWeaponPowerUp as spawnWeaponPowerUpFromModule,
  updatePowerUps as updatePowerUpsFromModule,
  drawPowerUp as drawPowerUpFromModule,
  drawPowerUpDetailed as drawPowerUpDetailedFromModule,
} from "@/lib/game/powerups"
import { drawHud as drawHudFromModule, drawBossBar as drawBossBarFromModule } from "@/lib/game/ui"
import {
  drawBackground as drawBackgroundFromModule,
  drawParticles as drawParticlesFromModule,
  drawFloatingTexts as drawFloatingTextsFromModule,
} from "@/lib/game/background"

import type {
  GameObject,
  Player,
  Enemy,
  EnemyType,
  FlyingSaucer,
  Boss,
  BossType,
  Projectile,
  PowerUp,
  PowerUpType,
  Particle,
  FloatingText,
  GameState,
} from "@/lib/game/types"
import { DIFFICULTY_SCALING, ALIEN_COLORS } from "@/lib/game/constants"

// Game loop type (defined outside component)
type GameLoopFn = ((currentTime: number) => void) & { lastTime?: number }

export function ChickenAlienGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>("menu")
  const [_score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [_killCount, setKillCount] = useState(0)
  const [finalKillCount, setFinalKillCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [finalWave, setFinalWave] = useState(0)

  // Touch controls state
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const [shootButtonPressed, setShootButtonPressed] = useState(false)

  // Game refs
  const gameStateRef = useRef<GameState>("menu")
  const keysRef = useRef<Set<string>>(new Set())
  const lastKeyPressRef = useRef<{ key: string; time: number }>({ key: "", time: 0 })
  const mouseRef = useRef({ x: 0, y: 0, down: false })
  const playerRef = useRef<Player | null>(null)
  const enemiesRef = useRef<Enemy[]>([])
  const flyingSaucersRef = useRef<FlyingSaucer[]>([])
  const projectilesRef = useRef<Projectile[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const particlesRef = useRef<Particle[]>([])
  const floatingTextsRef = useRef<FloatingText[]>([])
  const bossRef = useRef<Boss | null>(null)
  const killCountRef = useRef(0)
  const scoreRef = useRef(0)
  const waveRef = useRef(1)
  const spawnTimerRef = useRef(0)
  const powerUpTimerRef = useRef(0)
  const saucerSpawnTimerRef = useRef(0)
  const lastBossWaveRef = useRef(0)
  const screenShakeRef = useRef(0)
  const screenShakeXRef = useRef(0)
  const screenShakeYRef = useRef(0)
  const gameTimeRef = useRef(0)
  const animationIdRef = useRef<number | null>(null)

  const gameLoopRef = useRef<GameLoopFn | null>(null)

  const getAlienColor = (type: EnemyType): string => {
    return ALIEN_COLORS[type] ?? "#00ff00"
  }

  const {
  audioContextRef,
  soundEnabledRef,
  audioSystem,
  initAudio,
  playSound,
  shootSound,
  eggSplashSound,
  enemyDeadSound,
  chickenHitSound,
  chickenDeathSound,
  powerUpSound,
  chargeSound,
  stunSound,
} = useAudio(soundEnabled)

  // Game context (abstractions)
  const gameContext = useMemo(() => {
    const projectiles = createProjectileSpawner(projectilesRef)
    const enemies = createEnemySpawner(
      enemiesRef,
      canvasRef.current?.width ?? 800,
      canvasRef.current?.height ?? 600,
      getAlienColor,
    )
    const particles = createParticleSpawner(particlesRef)
    const floatingTexts = createFloatingTextSpawner(floatingTextsRef)
    const screenShake = createScreenShake(screenShakeRef)
    const ui = createUIController({
      setGameState,
      setScore,
      setKillCount,
      setFinalScore,
      setFinalKillCount,
      setFinalWave,
      gameStateRef,
    })

    return {
      projectiles,
      enemies,
      particles,
      floatingTexts,
      screenShake,
      audio: audioSystem,
      ui,
    }
  }, [
    projectilesRef,
    enemiesRef,
    particlesRef,
    floatingTextsRef,
    screenShakeRef,
    audioContextRef,
    gameStateRef,
    canvasRef,
  ])

  // Effect 1: Detect mobile
  useEffect(() => {
    setIsMobile("ontouchstart" in window)
  }, [])

  // Effect 2: Resize canvas to fill container (with max size + centering)
  useCanvas(canvasRef, playerRef)

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!joystickActive && gameState === "playing") {
      e.preventDefault()
      const touch = e.touches[0]
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      mouseRef.current.x = (touch.clientX - rect.left) * scaleX
      mouseRef.current.y = (touch.clientY - rect.top) * scaleY
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    mouseRef.current.x = (e.clientX - rect.left) * scaleX
    mouseRef.current.y = (e.clientY - rect.top) * scaleY
  }

  const handleMouseDown = () => {
    mouseRef.current.down = true
  }

  const handleMouseUp = () => {
    mouseRef.current.down = false
  }




 

  // Initialize game
  const initGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    playerRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 15,
      health: 100,
      maxHealth: 100,
      speed: 5,
      shootCooldown: 0,
      weaponType: "basic",
      weaponTime: 0,
      shield: false,
      shieldTime: 0,
      chargeCooldown: 0,
      stunCooldown: 0,
      isCharging: false,
      chargeDistance: 0,
      chargeDirection: { x: 0, y: 0 },
      chargeReady: false,
      invincibleTime: 0,
    }
    enemiesRef.current = []
    flyingSaucersRef.current = []
    projectilesRef.current = []
    powerUpsRef.current = []
    particlesRef.current = []
    floatingTextsRef.current = []
    bossRef.current = null
    scoreRef.current = 0
    waveRef.current = 1
    spawnTimerRef.current = 0
    powerUpTimerRef.current = 0
    saucerSpawnTimerRef.current = 0
    lastBossWaveRef.current = 0
    screenShakeRef.current = 0
    setScore(0)
  }

  // Start game (uses gameLoopRef to avoid TDZ)
  const startGame = () => {
    initAudio()
    initGame()
    gameStateRef.current = "playing"
    setGameState("playing")
    if (animationIdRef.current === null && gameLoopRef.current) {
      animationIdRef.current = requestAnimationFrame(gameLoopRef.current)
    }
  }

  // Restart game
  const restartGame = () => {
    startGame()
  }

  // Spawn power-up
  const spawnPowerUp = (canvas: HTMLCanvasElement) => {
    spawnPowerUpFromModule(canvas, (powerUp) => powerUpsRef.current.push(powerUp))
  }

  // Spawn weapon power-up from flying saucer
  const spawnWeaponPowerUp = (x: number, y: number) => {
    spawnWeaponPowerUpFromModule(x, y, (powerUp) => powerUpsRef.current.push(powerUp))
  }

  // Spawn flying saucers
  const spawnFlyingSaucer = (canvas: HTMLCanvasElement) => {
    const side = Math.random() < 0.5 ? 0 : 1
    const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.1

    flyingSaucersRef.current.push({
      x: side === 0 ? -30 : canvas.width + 30,
      y,
      radius: 18,
      speed: 1.5 + Math.random(),
      health: 5,
      direction: side === 0 ? 1 : -1,
      bobOffset: Math.random() * Math.PI * 2,
    })
  }

  const spawnBoss = (canvas: HTMLCanvasElement) => {
    const boss = spawnBossFromRegistry({
      canvas,
      lastBossWave: lastBossWaveRef.current,
      playSound: (freq, dur, type) => playSound(freq, dur, type ?? "sine"),
    })

    if (boss) {
      bossRef.current = boss
    }
  }

  // Shoot projectile
  const shoot = (canvas: HTMLCanvasElement, angle?: number) => {
    const player = playerRef.current
    if (!player) return

    shootFromModule({
      player,
      angle,
      mouseX: mouseRef.current.x,
      mouseY: mouseRef.current.y,
      pushProjectile: (proj) => projectilesRef.current.push(proj),
      playSound,
    })
  }

  // Create particles
  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12
      const speed = 2 + Math.random() * 3
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color,
      })
    }
  }

  const addScreenShake = (intensity: number) => {
    screenShakeRef.current = Math.max(screenShakeRef.current, intensity)
  }

  const addFloatingText = (x: number, y: number, text: string, color: string, size = 20) => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      life: 60,
      fontSize: size,
      velocity: { x: 0, y: -1 },
    })
  }
useKeyboard(keysRef, gameStateRef, playerRef, mouseRef, () => {
  chargeSound()
  addFloatingText(playerRef.current!.x, playerRef.current!.y - 40, "CHARGE!", "#ff0000", 24)
  addScreenShake(10)
})

  // Update game state
  const update = (canvas: HTMLCanvasElement, deltaTime: number) => {
    const player = playerRef.current
    if (!player) return

    const frameScale = Math.min(Math.max(deltaTime, 0) / (1000 / 60), 1.5)
    gameTimeRef.current += Math.min(deltaTime, 100)

    const timeInSeconds = gameTimeRef.current / 1000
    const difficultyTier = Math.floor(timeInSeconds / 30)
    const currentSpawnInterval = Math.max(
      4000 - difficultyTier * DIFFICULTY_SCALING.SPAWN_FREQUENCY_DECREASE_PER_30S,
      DIFFICULTY_SCALING.MIN_SPAWN_INTERVAL,
    )

    if (screenShakeRef.current > 0) {
      screenShakeRef.current -= 1
      screenShakeXRef.current = (Math.random() - 0.5) * screenShakeRef.current
      screenShakeYRef.current = (Math.random() - 0.5) * screenShakeRef.current
    } else {
      screenShakeXRef.current = 0
      screenShakeYRef.current = 0
    }

    // Update player movement
    updatePlayerFromModule({
      player,
      keys: keysRef.current,
      mouse: mouseRef.current,
      canvas,
      isMobile,
      joystickActive,
      joystickPos,
      shootButtonPressed,
      deltaTime,
      shoot: () => shoot(canvas),
      onCharge: () => {
        chargeSound()
        addFloatingText(player.x, player.y - 40, "CHARGE!", "#ff0000", 24)
        addScreenShake(10)
      },
      onStun: () => {
        stunSound()
        player.stunCooldown = 10000
        addFloatingText(player.x, player.y - 40, "CACA-DOO!", "#ffff00", 24)
        addScreenShake(8)
        enemiesRef.current.forEach((enemy) => {
          enemy.stunned = true
          enemy.stunnedTime = 3000
        })
      },
    })

    // Spawn boss
    if (waveRef.current - lastBossWaveRef.current >= 5 && !bossRef.current) {
      spawnBoss(canvas)
      lastBossWaveRef.current = waveRef.current
    }

    // Spawn enemies (disabled during boss fight) with dynamic interval
    if (!bossRef.current) {
      spawnTimerRef.current += deltaTime
      if (spawnTimerRef.current > currentSpawnInterval) {
        spawnEnemiesFromModule({
          canvas,
          wave: waveRef.current,
          timeInSeconds,
          existingEnemyCount: enemiesRef.current.length,
          pushEnemy: (enemy) => enemiesRef.current.push(enemy),
        })
        spawnTimerRef.current = 0
        waveRef.current++
      }
    }

    const powerUpInterval =
      timeInSeconds < DIFFICULTY_SCALING.POWER_UP_TRANSITION_TIME
        ? DIFFICULTY_SCALING.POWER_UP_EARLY_INTERVAL
        : DIFFICULTY_SCALING.POWER_UP_LATE_INTERVAL

    powerUpTimerRef.current += deltaTime
    if (powerUpTimerRef.current > powerUpInterval && powerUpsRef.current.length < 3) {
      spawnPowerUp(canvas)
      powerUpTimerRef.current = 0
    }

    // Spawn flying saucers more frequently
    saucerSpawnTimerRef.current += deltaTime
    if (saucerSpawnTimerRef.current > 12000 && flyingSaucersRef.current.length < 2) {
      spawnFlyingSaucer(canvas)
      saucerSpawnTimerRef.current = 0
    }

    const boss = bossRef.current
    if (boss) {
      // Helper to avoid repeating 20 lines per case
      const runBossUpdate = (type: BossType) => {
        const behavior = getBossBehavior(type)
        const bossCtx = createBossContext({
          boss,
          player,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          deltaTime,
          bossTime: gameTimeRef.current,
          enemiesRef,
          projectilesRef,
          getWave: () => waveRef.current,
          killBoss: () => {
            bossRef.current = null
            lastBossWaveRef.current = waveRef.current
          },
          damagePlayer: (amount, _source) => {
            if (player.invincibleTime <= 0 && !player.shield) {
              player.health -= amount
              player.invincibleTime = 60
              chickenHitSound()
            }
          },
          healPlayer: (amount) => {
            player.health = Math.min(player.maxHealth, player.health + amount)
          },
          projectiles: gameContext.projectiles,
          enemies: gameContext.enemies,
          particles: gameContext.particles,
          floatingTexts: gameContext.floatingTexts,
          screenShake: gameContext.screenShake,
          audio: gameContext.audio,
          ui: gameContext.ui,
        })
        behavior.update(boss, bossCtx)

        // Rewards on death (unless boss already handled it via killBoss)
        if (!bossRef.current) {
          const rewardScore =
            type === "omegaPrime" ? 2000 : type === "theHive" ? 1000 : 500
          const rewardPowerUps =
            type === "omegaPrime" || type === "theHive" ? 5 : 3

          scoreRef.current += rewardScore
          setScore(scoreRef.current)
          killCountRef.current += 1
          setKillCount(killCountRef.current)

          const fx = type === "omegaPrime" ? canvas.width / 2 : boss.x
          const fy = type === "omegaPrime" ? canvas.height / 2 : boss.y

          addFloatingText(fx, fy - 40, `+${rewardScore}`, "#ffff00", 32)
          addScreenShake(type === "omegaPrime" ? 25 : type === "theHive" ? 20 : 15)
          playSound(200, 0.5, "sawtooth")

          for (let p = 0; p < rewardPowerUps; p++) {
            spawnWeaponPowerUp(
              fx + (Math.random() - 0.5) * (type === "omegaPrime" ? 120 : 80),
              fy + (Math.random() - 0.5) * (type === "omegaPrime" ? 120 : 80),
            )
          }
        }

        // Extra: game over check for bosses that can kill player
        if (gameStateRef.current === "gameOver") {
          setFinalScore(scoreRef.current)
          setFinalKillCount(killCountRef.current)
          setFinalWave(waveRef.current)
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
            chickenHitSound()
            addScreenShake(10)
            addFloatingText(player.x, player.y - 30, `-${contactDamage}`, "#ff0000", 18)

            if (player.health <= 0) {
              chickenDeathSound()
              gameStateRef.current = "gameOver"
              setGameState("gameOver")
              setFinalScore(scoreRef.current)
              setFinalKillCount(killCountRef.current)
              setFinalWave(waveRef.current)
            }
          }
        }
      }
    }

    // Update enemies
    enemiesRef.current = updateEnemiesFromModule({
      enemies: enemiesRef.current,
      player,
      canvas,
      deltaTime,
      frameScale,
      createParticles: (x, y, color) => createParticles(x, y, color),
      onEnemyContact: (enemy, damage) => {
        if (player.invincibleTime <= 0 && !player.shield) {
          player.health -= damage
          player.invincibleTime = 60
          chickenHitSound()
          addScreenShake(8)
          addFloatingText(player.x, player.y - 30, `-${damage}`, "#ff0000", 18)
          if (player.health <= 0) {
            chickenDeathSound()
            gameStateRef.current = "gameOver"
            setGameState("gameOver")
            setFinalScore(scoreRef.current)
            setFinalKillCount(killCountRef.current)
            setFinalWave(waveRef.current)
          }
        }
      },
    })

    flyingSaucersRef.current = flyingSaucersRef.current.filter((saucer) => {
      saucer.x += saucer.speed * saucer.direction
      saucer.bobOffset += 0.05
      saucer.y += Math.sin(saucer.bobOffset) * 0.5

      for (let i = 0; i < projectilesRef.current.length; i++) {
        const proj = projectilesRef.current[i]
        const dx = proj.x - saucer.x
        const dy = proj.y - saucer.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < proj.radius + saucer.radius) {
          saucer.health -= proj.damage
          eggSplashSound()

          if (!proj.piercing) {
            projectilesRef.current.splice(i, 1)
            i--
          }

          if (saucer.health <= 0) {
            enemyDeadSound()
            scoreRef.current += 50
            setScore(scoreRef.current)
            createParticles(saucer.x, saucer.y, "#00ffff")
            addFloatingText(saucer.x, saucer.y - 30, "+50", "#ffff00", 24)
            addScreenShake(6)
            spawnWeaponPowerUp(saucer.x, saucer.y)
            return false
          }
        }
      }

      if (saucer.x < -50 || saucer.x > canvas.width + 50) {
        return false
      }

      return saucer.health > 0
    })

    // Check if game over
    if (player.health <= 0) {
      chickenDeathSound()
      setFinalScore(scoreRef.current)
      setFinalKillCount(killCountRef.current)
      setGameState("gameOver")
      gameStateRef.current = "gameOver"
      setFinalWave(waveRef.current)
    }

    // Update projectiles and check enemy collision
    projectilesRef.current = updateProjectilesFromModule({
      projectiles: projectilesRef.current,
      player,
      canvas,
      deltaTime,
      bossRef,
      enemiesRef,

      onLeviathanWaveHit: (proj, player) => {
        player.health -= 50
        player.invincibleTime = 120
        chickenHitSound()
        addScreenShake(40)
        addFloatingText(player.x, player.y - 40, "-50", "#ff0000", 32)

        const waveDx = proj.x - player.x
        const waveDy = proj.y - player.y
        const pushAngle = Math.atan2(waveDy, waveDx)
        const mapDiagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
        const kickDistance = mapDiagonal * 1.2

        player.x += Math.cos(pushAngle) * kickDistance
        player.y += Math.sin(pushAngle) * kickDistance
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x))
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y))

        createParticles(player.x, player.y, "#a855f7")
        playSound(150, 0.4, "sawtooth")
        playSound(80, 0.6, "triangle")

        if (player.health <= 0) {
          chickenDeathSound()
          gameStateRef.current = "gameOver"
          setGameState("gameOver")
          setFinalScore(scoreRef.current)
          setFinalKillCount(killCountRef.current)
          setFinalWave(waveRef.current)
        }
      },

      onHiveLordHit: () => {},
      onHiveSpawnHit: () => {},

      onEnemyProjectileHitPlayer: (proj, player) => {
        player.health -= proj.damage
        player.invincibleTime = 30
        chickenHitSound()
        addScreenShake(6)
        addFloatingText(player.x, player.y - 30, `-${proj.damage}`, "#ff4444", 18)
        createParticles(proj.x, proj.y, proj.color || "#28f0ff")

        if (player.health <= 0) {
          chickenDeathSound()
          gameStateRef.current = "gameOver"
          setGameState("gameOver")
          setFinalScore(scoreRef.current)
          setFinalKillCount(killCountRef.current)
          setFinalWave(waveRef.current)
        }
      },

      onBossHit: (proj, boss) => {
        if (boss.isArmored && boss.armor !== undefined && boss.armor > 0) {
          boss.armor -= proj.damage
          createParticles(proj.x, proj.y, "#94a3b8")

          if (boss.armor <= 0) {
            boss.armor = 0
            boss.isArmored = false
            addFloatingText(boss.x, boss.y - 50, "ARMOR BROKEN!", "#fbbf24", 28)
            addScreenShake(20)
            playSound(150, 0.5, "sawtooth")
          }
        } else {
          boss.health -= proj.damage
        }

        eggSplashSound()
        createParticles(boss.x, boss.y, "#ff4444")
        addFloatingText(boss.x, boss.y - 30, `-${proj.damage}`, "#ff9999", 18)
        addScreenShake(4)

        if (proj.explosive) {
          createParticles(proj.x, proj.y, proj.color ?? "#ffffff")
          playSound(150, 0.2, "sawtooth")
          addFloatingText(proj.x, proj.y - 20, "BOOM!", "#ff6600", 20)
        }

        if (boss.health <= 0) {
          enemyDeadSound()
          scoreRef.current += 500
          setScore(scoreRef.current)
          killCountRef.current += 1
          setKillCount(killCountRef.current)
          createParticles(boss.x, boss.y, "#ff0000")
          addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
          addScreenShake(15)
          for (let p = 0; p < 3; p++) {
            spawnWeaponPowerUp(boss.x + (Math.random() - 0.5) * 80, boss.y + (Math.random() - 0.5) * 80)
          }
          bossRef.current = null
          lastBossWaveRef.current = waveRef.current
        }
      },

      onEnemyHit: (proj, enemy) => {
        const damage = proj.damage

        enemy.health -= damage
        enemy.hitFlash = 5

        eggSplashSound()
        createParticles(proj.x, proj.y, proj.color ?? "#ffffff")
        addFloatingText(enemy.x, enemy.y - 20, `-${damage}`, "#ff9999", 16)

        if (!proj.piercing) {
          proj.dead = true
        }

        if (enemy.health <= 0) {
          enemyDeadSound()
          scoreRef.current += 10
          setScore(scoreRef.current)
          killCountRef.current += 1
          setKillCount(killCountRef.current)
          createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
          addFloatingText(enemy.x, enemy.y - 30, "+10", "#ffff00", 20)
          addScreenShake(3)

          if (enemy.type === "splitter" && enemy.radius > 8) {
            for (let j = 0; j < 2; j++) {
              const angle = (Math.PI / 3) * j + (Math.random() * Math.PI) / 6
              enemiesRef.current.push({
                x: enemy.x + Math.cos(angle) * 20,
                y: enemy.y + Math.sin(angle) * 20,
                radius: 8,
                speed: enemy.speed * 1.2,
                health: 1,
                maxHealth: 1,
                groupId: enemy.groupId,
                type: "grunt",
                alienType: "grunt",
                color: getAlienColor("grunt"),
              })
            }
          }

          const index = enemiesRef.current.indexOf(enemy)
          if (index > -1) {
            enemiesRef.current.splice(index, 1)
          }
        }
      },

      createParticles,
      addFloatingText,
      addScreenShake,
      playSound,
      eggSplashSound,
      enemyDeadSound,
      chickenHitSound,
      chickenDeathSound,
      setGameOver: () => {
        gameStateRef.current = "gameOver"
        setGameState("gameOver")
      },
      spawnWeaponPowerUp,
      getAlienColor,
      scoreRef,
      setScore,
      killCountRef,
      setKillCount,
    })

    // Check collisions between player and power-ups
    powerUpsRef.current = updatePowerUpsFromModule({
      powerUps: powerUpsRef.current,
      player,
      deltaTime,
      onCollect: (powerUp) => {
        powerUpSound()

        switch (powerUp.type) {
          case "doubleYolk":
          case "scrambled":
          case "hardBoiled":
          case "explosive":
          case "golden":
            player.weaponType = powerUp.type
            player.weaponTime = 15000
            addFloatingText(player.x, player.y - 40, powerUp.type.toUpperCase(), "#ffaa00", 20)
            break

          case "shield":
            player.shield = true
            player.shieldTime = 10000
            addFloatingText(player.x, player.y - 40, "SHIELD!", "#00ffff", 20)
            break

          case "health":
            player.health = Math.min(player.health + 30, player.maxHealth)
            addFloatingText(player.x, player.y - 40, "+30 HP", "#00ff00", 20)
            break

          case "speedBoost":
            player.speed = 8
            setTimeout(() => {
              if (playerRef.current) playerRef.current.speed = 5
            }, 5000)
            addFloatingText(player.x, player.y - 40, "SPEED UP!", "#ff00ff", 20)
            break

          case "charge":
            player.chargeCooldown = 0
            addFloatingText(player.x, player.y - 40, "CHARGE READY!", "#ff4400", 22)
            break
        }
      },
    })

    // Update particles
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += 0.1
      particle.life--
      return particle.life > 0
    })

    floatingTextsRef.current = floatingTextsRef.current.filter((text) => {
      text.x += text.velocity.x
      text.y += text.velocity.y
      text.life--
      return text.life > 0
    })

    // Update score (survival time)
    scoreRef.current += 1
    if (scoreRef.current % 60 === 0) {
      setScore(scoreRef.current)
    }
  }

  // Draw game
  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.save()
    ctx.translate(screenShakeXRef.current, screenShakeYRef.current)

    // Clear canvas with gradient background
  drawBackgroundFromModule(ctx, canvas)

    const player = playerRef.current
    if (!player) {
      ctx.restore()
      return
    }

   drawParticlesFromModule(ctx, particlesRef.current)

    // Draw enemies
    const animationTime = Date.now()
    enemiesRef.current.forEach((enemy) => {
      drawAlienCreatureFromModule(ctx, enemy, animationTime)
      const bob = Math.sin(animationTime / 180 + enemy.x * 0.02) * enemy.radius * 0.08

      if (enemy.maxHealth > 3) {
        const barWidth = enemy.radius * 2
        const barHeight = 4
        const healthPercent = enemy.health / enemy.maxHealth
        ctx.fillStyle = "#35152a"
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y + bob - enemy.radius - 8, barWidth, barHeight)
        ctx.fillStyle = enemy.type === "tank" ? "#fbbf24" : "#67e8f9"
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y + bob - enemy.radius - 8, barWidth * healthPercent, barHeight)
      }

      if (enemy.stunned) {
        ctx.fillStyle = "#fef08a"
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Z", enemy.x - 10, enemy.y + bob - enemy.radius - 15)
        ctx.fillText("z", enemy.x - 5, enemy.y + bob - enemy.radius - 25)
        ctx.fillText("z", enemy.x, enemy.y + bob - enemy.radius - 35)
      }
    })

    flyingSaucersRef.current.forEach((saucer) => {
      ctx.fillStyle = "#00ffff"
      ctx.beginPath()
      ctx.ellipse(saucer.x, saucer.y, saucer.radius, saucer.radius * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#0099cc"
      ctx.beginPath()
      ctx.ellipse(saucer.x, saucer.y - 5, saucer.radius * 0.6, saucer.radius * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const x = saucer.x + Math.cos(angle) * saucer.radius * 0.7
        const y = saucer.y + Math.sin(angle) * saucer.radius * 0.3
        ctx.fillStyle = i % 2 === 0 ? "#ffff00" : "#ff00ff"
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = "#fff"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`${saucer.health}`, saucer.x, saucer.y + saucer.radius + 10)
    })

    const boss = bossRef.current
    if (boss) {
      const bossTime = Date.now()
      const bossBob = Math.sin(bossTime / 260) * 4
      const bossBreath = 1

      const bossPlayerRef = playerRef.current
      const angleToPlayer = bossPlayerRef
        ? Math.atan2(bossPlayerRef.y - boss.y, bossPlayerRef.x - boss.x)
        : 0

      ctx.save()
      ctx.translate(0, bossBob)
      ctx.translate(boss.x, boss.y)
      ctx.scale(bossBreath, bossBreath)
      ctx.translate(-boss.x, -boss.y)

      // Boss shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.beginPath()
      ctx.ellipse(boss.x, boss.y + boss.radius + 10, boss.radius * 0.8, boss.radius * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()

      let bossColor = "#ff0000"
      switch (boss.type) {
        case "alienMouse":
          bossColor = "#a78bfa"
          break
        case "alienBumblebee":
          bossColor = "#facc15"
          break
        case "alienOctopus":
          bossColor = "#ec4899"
          break
        case "alienMantis":
          bossColor = "#22c55e"
          break
        case "abductor":
          bossColor = "#cc0000"
          break
        case "queenXenoHen":
          bossColor = "#ff3333"
          break
        case "devourer":
          bossColor = "#990000"
          break
      }

      // Pulsing effect
      const pulse = 1 + Math.sin(Date.now() / 300) * 0.05
      ctx.fillStyle = bossColor
      ctx.beginPath()
      ctx.arc(boss.x, boss.y, boss.radius * pulse, 0, Math.PI * 2)
      ctx.fill()

      // Boss outline
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 3
      ctx.stroke()

      // Start of boss drawing
      {
        const behavior = getBossBehavior(boss.type)
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          ctx.save()
          behavior.draw(ctx, boss, bossTime, playerForDraw)
          ctx.restore()
        }
      }
      // End of boss drawing

      drawBossBarFromModule(ctx, canvas, boss)

      ctx.restore()
    }

    projectilesRef.current.forEach((proj) => {
      drawProjectileFromModule(ctx, proj)
    })

  drawFloatingTextsFromModule(ctx, floatingTextsRef.current)

    if (player.shield) {
      const shieldPulse = 1 + Math.sin(Date.now() / 150) * 0.1
      ctx.strokeStyle = "#00ffff"
      ctx.shadowBlur = 15
      ctx.shadowColor = "#00ffff"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(player.x, player.y, (player.radius + 5) * shieldPulse, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Draw player
    drawPlayerFromModule(ctx, player)

    enemiesRef.current.forEach((enemy) => {
      ctx.save()
      ctx.translate(enemy.x, enemy.y)

      if (enemy.stunned) {
        ctx.strokeStyle = "yellow"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, -enemy.radius - 15, 8, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = "yellow"
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Z", -5, -enemy.radius - 25)
        ctx.fillText("Z", 5, -enemy.radius - 32)
        ctx.fillText("Z", 0, -enemy.radius - 38)
      }

      ctx.restore()
    })

    powerUpsRef.current.forEach((powerUp) => {
      drawPowerUpDetailedFromModule(ctx, powerUp)
    })

    // Draw UI
    drawHudFromModule(ctx, {
      player,
      canvas,
      score: scoreRef.current,
      killCount: killCountRef.current,
      wave: waveRef.current,
    })

    ctx.restore()
  }  

  // Game loop 
  const gameLoop: GameLoopFn = (currentTime: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    if (gameStateRef.current === "playing") {
      const rawDeltaTime = currentTime - (gameLoop.lastTime ?? 0) || 16
      const deltaTime = Math.min(Math.max(rawDeltaTime, 1), 34)
      update(canvas, deltaTime)
      draw(ctx, canvas)
      gameLoop.lastTime = currentTime
    }

    animationIdRef.current = requestAnimationFrame(gameLoop)
  }

  // Store gameLoop in ref for startGame to use
  gameLoopRef.current = gameLoop

  // Event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  // Handle touch controls for joystick
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setJoystickActive(true)
  }

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickActive) return
    e.preventDefault()

    const touch = e.touches[0]
    const joystick = e.currentTarget as HTMLElement
    const rect = joystick.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = touch.clientX - centerX
    const dy = touch.clientY - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 40

    if (distance > 0) {
      const normalized = Math.min(distance, maxDistance) / maxDistance
      setJoystickPos({
        x: (dx / distance) * normalized,
        y: (dy / distance) * normalized,
      })
    }
  }

  const handleJoystickEnd = () => {
    setJoystickActive(false)
    setJoystickPos({ x: 0, y: 0 })
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="border-2 border-slate-700 rounded-lg shadow-2xl"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchStart={() => {
          if (gameState === "playing") {
            setShootButtonPressed(true)
          }
        }}
        onTouchEnd={() => {
          if (gameState === "playing") {
            setShootButtonPressed(false)
          }
        }}
      />

      {/* Start Menu */}
      {gameState === "menu" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm transition-opacity duration-500">
          <div className="text-center space-y-6 px-4">
            <h1 className="text-6xl font-bold text-yellow-400 drop-shadow-lg animate-pulse">Chicken vs Aliens</h1>
            <p className="text-xl text-gray-300 max-w-md mx-auto">
              Survive as long as possible against the alien invasion!
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>WASD or Arrow Keys to move</p>
              <p>Mouse or Touch to aim and shoot</p>
              <p>SPACE for Caca-Doo stun</p>
              <p>Q for Charge</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Play
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === "gameOver" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm transition-opacity duration-500">
          <div className="text-center space-y-6 px-4">
            <h2 className="text-5xl font-bold text-red-500 drop-shadow-lg">Game Over</h2>
            <div className="space-y-3 text-2xl text-white">
              <p className="text-3xl font-bold text-yellow-400">
                Survival Time:{" "}
                {Math.floor(finalScore / 60 / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(Math.floor(finalScore / 60) % 60).toString().padStart(2, "0")}
              </p>
              <p className="text-2xl text-green-400">Total Kills: {finalKillCount}</p>
              <p className="text-xl text-gray-400">Waves Survived: {finalWave}</p>
            </div>
            <button
              onClick={restartGame}
              className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Restart
            </button>
          </div>
        </div>
      )}

      {/* Sound Toggle */}
      <Button
        onClick={() => {
          initAudio()
          setSoundEnabled(!soundEnabled)
        }}
        size="icon"
        variant="secondary"
        className="absolute right-2 top-2 bg-purple-900/80 hover:bg-purple-800"
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
      </Button>

      {/* Mobile Controls */}
      {isMobile && gameState === "playing" && (
        <>
          <div
            className="absolute bottom-4 left-4 flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
          >
            <div
              className="h-12 w-12 rounded-full border-2 border-white/50 bg-white/70 shadow-lg"
              style={{
                transform: `translate(${joystickPos.x * 40}px, ${joystickPos.y * 40}px)`,
              }}
            />
          </div>

          <button
            className="absolute bottom-4 right-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-red-300 bg-gradient-to-br from-red-500 to-red-700 text-3xl shadow-lg backdrop-blur-sm active:from-red-600 active:to-red-800 active:shadow-xl"
            onTouchStart={() => setShootButtonPressed(true)}
            onTouchEnd={() => setShootButtonPressed(false)}
          >
            🥚
          </button>
        </>
      )}
    </div>
  )
}