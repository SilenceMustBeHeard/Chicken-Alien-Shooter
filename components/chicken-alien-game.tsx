"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { createProjectileSpawner } from "@/lib/game/context/impl/create-projectile-spawner"
import { createEnemySpawner } from "@/lib/game/context/impl/create-enemy-spawner"
import { createParticleSpawner } from "@/lib/game/context/impl/create-particle-spawner"
import { createFloatingTextSpawner } from "@/lib/game/context/impl/create-floating-text-spawner"
import { createScreenShake } from "@/lib/game/context/impl/create-screen-shake"
import { createAudioSystem } from "@/lib/game/context/impl/create-audio-system"
import { createUIController } from "@/lib/game/context/impl/create-ui-controller"
import { createBossContext } from "@/lib/game/context/impl/create-boss-context"

import { getBossBehavior } from "@/lib/game/bosses"

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


function getBossDisplayHP(boss: Boss): { current: number; max: number } {
  if (boss.type === "theHive") {
    if (boss.hivePhase === 2 && boss.hiveLordA && boss.hiveLordB) {
      return {
        current: boss.hiveLordA.health + boss.hiveLordB.health,
        max: 600,
      }
    }
    if (boss.hivePhase === 3 && boss.hiveSpawns) {
      return {
        current: boss.hiveSpawns.reduce((sum, s) => sum + s.health, 0),
        max: 400,
      }
    }
    if (boss.hiveFinalWave) {
      
      return { current: 0, max: 1 }
    }
  }
  return { current: boss.health, max: boss.maxHealth }
}

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
    const soundEnabledRef = useRef(soundEnabled)

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

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
  // Added kill count tracking
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
  const audioContextRef = useRef<AudioContext | null>(null)
  const getAlienColor = (type: EnemyType): string => {
    return ALIEN_COLORS[type] ?? "#00ff00"
  }
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
    const audio = createAudioSystem({
      audioContextRef,
      isEnabledRef: soundEnabledRef,
    })
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
      audio,
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
  useEffect(() => {
    
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()

      // Cap at 1200x800 for gameplay balance
      const maxW = 1200
      const maxH = 800
      const aspect = maxW / maxH

      let w = rect.width
      let h = rect.height

      // Fit within aspect ratio
      if (w / h > aspect) {
        w = h * aspect
      } else {
        h = w / aspect
      }

      canvas.width = Math.floor(w)
      canvas.height = Math.floor(h)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.style.position = "absolute"
      canvas.style.left = `${(rect.width - w) / 2}px`
      canvas.style.top = `${(rect.height - h) / 2}px`

      // Keep player inside new bounds
      const player = playerRef.current
      if (player) {
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x))
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y))
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])



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


  // Initialize audio context
  const initAudio = () => {
    if (!audioContextRef.current) {
     audioContextRef.current = new (window.AudioContext 
      || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
  }

  // Sound effects using Web Audio API
  const playSound = (
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    gainValue = 0.3, // Default gain
    startFrequency: number = frequency, // Default start frequency
    endFrequency: number = frequency, // Default end frequency
  ) => {
    if (!soundEnabled || !audioContextRef.current) return

    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = type
      oscillator.frequency.setValueAtTime(startFrequency, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration)

      gainNode.gain.setValueAtTime(gainValue, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      console.log("[v0] Audio error:", e)
    }
  }

  const shootSound = () => {
    // Quick pew sound
    playSound(500, 0.08, "square")
  }

  const eggSplashSound = () => {
    // Wet splash sound with frequency sweep
    if (!soundEnabled || !audioContextRef.current) return
    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = "sawtooth"
      oscillator.frequency.setValueAtTime(600, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15)

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
    } catch (e) {
      console.log("[v0] Audio error:", e)
    }
  }

  const enemyDeadSound = () => {
    // Funny cartoonish death sound with wobble
    if (!soundEnabled || !audioContextRef.current) return
    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = "triangle"
      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4)

      gainNode.gain.setValueAtTime(0.25, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.4)
    } catch (e) {
      console.log("[v0] Audio error:", e)
    }
  }

  const chickenHitSound = () => {
    // Chicken squawk when hit
    if (!soundEnabled || !audioContextRef.current) return
    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = "sawtooth"
      oscillator.frequency.setValueAtTime(400, ctx.currentTime)
      oscillator.frequency.setValueAtTime(350, ctx.currentTime + 0.05)
      oscillator.frequency.setValueAtTime(300, ctx.currentTime + 0.1)

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.25)
    } catch (e) {
      console.log("[v0] Audio error:", e)
    }
  }

  const chickenDeathSound = () => {
    // Renamed from chickenDeadSound
    // Dramatic chicken death squawk
    if (!soundEnabled || !audioContextRef.current) return
    try {
      const ctx = audioContextRef.current

      // First squawk
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.type = "sawtooth"
      osc1.frequency.setValueAtTime(500, ctx.currentTime)
      osc1.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain1.gain.setValueAtTime(0.3, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.3)

      // Second lower squawk
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.type = "triangle"
      osc2.frequency.setValueAtTime(300, ctx.currentTime + 0.15)
      osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5)
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc2.start(ctx.currentTime + 0.15)
      osc2.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.log("[v0] Audio error:", e)
    }
  }

  const powerUpSound = () => playSound(800, 0.2, "sine")

  // // Dummy function for hitSound to resolve linting error
  // const hitSound = () => {
  //   if (!soundEnabled || !audioContextRef.current) return
  //   try {
  //     const ctx = audioContextRef.current
  //     const oscillator = ctx.createOscillator()
  //     const gainNode = ctx.createGain()

  //     oscillator.connect(gainNode)
  //     gainNode.connect(ctx.destination)

  //     oscillator.type = "sine"
  //     oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4 note

  //     gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
  //     gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

  //     oscillator.start(ctx.currentTime)
  //     oscillator.stop(ctx.currentTime + 0.1)
  //   } catch (e) {
  //     console.log("[v0] Audio error:", e)
  //   }
  // }

  // New sound effect for charge ability
  const chargeSound = () => {
    playSound(200, 0.2, "sawtooth", 0.05, 100, 0.1) // Swoosh sound
    playSound(400, 0.15, "sine", 0.05, 300, 0.08) // Wing flap
  }

  // New sound effect for stun ability
  const stunSound = () => {
    // Chicken crow sound
    playSound(600, 0.3, "square", 0.1, 400, 0.15)
    playSound(500, 0.25, "sawtooth", 0.15, 350, 0.2)
    playSound(700, 0.2, "sine", 0.2, 600, 0.1)
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

  // Start game
  const startGame = () => {
    initAudio()
    initGame()
    gameStateRef.current = "playing"
    setGameState("playing")
    if (animationIdRef.current === null) {
      gameLoop(performance.now()) // Pass initial time to gameLoop
    }
  }

  // Restart game
  const restartGame = () => {
    startGame()
  }

  // Spawn enemies
  const spawnEnemies = (canvas: HTMLCanvasElement) => {
    // Calculate difficulty multipliers based on game time
    const timeInSeconds = gameTimeRef.current / 1000
    const difficultyTier = Math.floor(timeInSeconds / 30)

    // Calculate group size
    const groupSize = Math.min(
      DIFFICULTY_SCALING.GROUP_SIZE_BASE + Math.floor(difficultyTier * DIFFICULTY_SCALING.GROUP_SIZE_INCREASE_PER_30S),
      DIFFICULTY_SCALING.MAX_GROUP_SIZE,
    )

    // Calculate speed multiplier
    const speedMultiplier = 1 + difficultyTier * DIFFICULTY_SCALING.SPEED_INCREASE_PER_30S

    // Check enemy cap
    const maxEnemies =
      DIFFICULTY_SCALING.MAX_ENEMIES_BASE + difficultyTier * DIFFICULTY_SCALING.MAX_ENEMIES_INCREASE_PER_30S
    if (enemiesRef.current.length >= maxEnemies) {
      return // Soft cap - delay spawning
    }

    const groupId = Date.now()
    const side = Math.floor(Math.random() * 4)

    // Determine alien types based on wave progression
    const alienTypes: Enemy["type"][] = ["grunt"]
    if (waveRef.current > 5) alienTypes.push("tank")
    if (waveRef.current > 10) alienTypes.push("leech")
    if (waveRef.current > 15) alienTypes.push("splitter")
    if (waveRef.current > 20) alienTypes.push("blinker")

    // Occasionally spawn a tank as a special
    const spawnTank = Math.random() < DIFFICULTY_SCALING.TANK_SPAWN_CHANCE && waveRef.current > 5

    // Spawn enemies in a cluster formation
    const centerOffset = Math.random() * 100 - 50
    for (let i = 0; i < groupSize; i++) {
      let x, y
      const clusterOffset = (i - groupSize / 2) * 35 + centerOffset

      switch (side) {
        case 0: // top
          x = Math.random() * canvas.width + clusterOffset
          y = -20 - Math.random() * 40
          break
        case 1: // right
          x = canvas.width + 20 + Math.random() * 40
          y = Math.random() * canvas.height + clusterOffset
          break
        case 2: // bottom
          x = Math.random() * canvas.width + clusterOffset
          y = canvas.height + 20 + Math.random() * 40
          break
        default: // left
          x = -20 - Math.random() * 40
          y = Math.random() * canvas.height + clusterOffset
      }

      // Spawn tank or choose random type
      const type = spawnTank && i === 0 ? "tank" : alienTypes[Math.floor(Math.random() * alienTypes.length)]

      // Configure enemy based on type
      let radius = 12
      let health = 2 + Math.floor(waveRef.current / 5) // Slower health scaling
      let speed = (0.4 + difficultyTier * 0.03) * speedMultiplier // Early game slower

      switch (type) {
        case "tank":
          radius = 18
          health *= 3
          speed *= 0.6
          break
        case "leech":
          radius = 10
          health *= 0.8
          speed *= 1.1
          break
        case "splitter":
          radius = 14
          health *= 1.5
          break
        case "blinker":
          radius = 11
          speed *= 1.3
          break
      }

      enemiesRef.current.push({
        x,
        y,
        radius,
        speed,
        health,
        maxHealth: health,
        groupId,
        type,
        blinkerTimer: type === "blinker" ? Math.random() * 3000 : undefined,
        healTimer: type === "leech" ? 0 : undefined,
        alienType: type,
        color: getAlienColor(type),
      })
    }
  }

  // Spawn power-up
  const spawnPowerUp = (canvas: HTMLCanvasElement) => {
    const types: PowerUp["type"][] = [
      "doubleYolk",
      "scrambled",
      "hardBoiled",
      "explosive",
      "shield",
      "health",
      "speedBoost",
      "charge", // Added charge
      "charge", // Add twice to make it more common
    ]

    // Golden egg is rare
    if (Math.random() < 0.05) {
      types.push("golden")
    }

    const type = types[Math.floor(Math.random() * types.length)]

    powerUpsRef.current.push({
      x: Math.random() * (canvas.width - 100) + 50,
      y: Math.random() * (canvas.height - 100) + 50,
      radius: 10,
      type,
      lifetime: 10000,
    })
  }

  // Spawn weapon power-up from flying saucer
  const spawnWeaponPowerUp = (x: number, y: number) => {
    const weaponTypes: PowerUp["type"][] = ["doubleYolk", "scrambled", "hardBoiled", "explosive", "charge"] // Added charge

    if (Math.random() < 0.1) {
      weaponTypes.push("golden")
    }

    const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)]

    powerUpsRef.current.push({
      x,
      y,
      radius: 12,
      type,
      lifetime: 15000,
    })
  }

  // Spawn flying saucers
  const spawnFlyingSaucer = (canvas: HTMLCanvasElement) => {
    const side = Math.random() < 0.5 ? 0 : 1 // Left or right
    const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.1 // Top 70% of screen

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
    const bossTypes: Boss["type"][] = [
     "alienMouse",
     "alienBumblebee",
      "alienOctopus",
      "alienMantis",
      "abductor",
      "queenXenoHen",
      "devourer",
      "theButcher",
      "voidReaper",
      "plagueBringer",
      "ironTyrant",
      "voidLeviathan",
      "theHive",
      "omegaPrime",
    ]

    // Bosses rotate through distinct alien species every five waves
    const bossIndex = Math.floor(lastBossWaveRef.current / 5) % bossTypes.length
    const type = bossTypes[bossIndex]

    // Every full cycle through all bosses = +60% HP for extra challenge
    const cycleNumber = Math.floor(Math.floor(lastBossWaveRef.current / 5) / bossTypes.length)
    const healthMultiplier = 1 + cycleNumber * 0.6

    let health = 100
    let radius = 40
    let speed = 0.3

    switch (type) {
      //  EARLY GAME (waves 5-35) 
      case "alienMouse":
        health = 100
        radius = 34
        speed = 1
        break
      case "alienBumblebee":
        health = 120
        radius = 42
        speed = 1.2
        break
      case "alienOctopus":
        health = 180
        radius = 52
        speed = 0.9
        break
      case "alienMantis":
        health = 140
        radius = 46
        speed = 1.8
        break
      case "abductor":
        health = 200
        radius = 45
        speed = 2
        break
      case "queenXenoHen":
        health = 230
        radius = 50
        speed = 3
        break
      case "devourer":
        health = 280
        radius = 55
        speed = 4
        break

      //  LATE GAME (waves 40+) — "THE BIG ONES" 
      case "theButcher":
        health = 320
        radius = 42
        speed = 1.3
        break
      case "voidReaper":
        health = 380
        radius = 48
        speed = 0.5
        break
      case "plagueBringer":
        health = 620
        radius = 46
        speed = 1.0
        break
      case "ironTyrant":
        health = 500
        radius = 54
        speed = 0.9
        break
      case "voidLeviathan":
        health = 600
        radius = 60
        speed = 1.2
        break
          case "theHive":
        health = 800
        radius = 70
        speed = 0.8
        break
      case "omegaPrime":
        health = 900
        radius = 70
        speed = 6
        break
    }

    // Apply cycle multiplier
    health = Math.floor(health * healthMultiplier)

       bossRef.current = {
      x: canvas.width / 2,
      y: -radius - 20,
      radius,
      health,
      maxHealth: health,
      type,
      speed,
        spawnTimer: 
         type === "abductor" 
      || type === "theHive" 
      || type === "plagueBringer"
      || type === "queenXenoHen" 
      || type === "devourer" 
      || type === "theButcher" 
      || type === "voidReaper" 
      || type === "ironTyrant"
      || type === "voidLeviathan"
      ? 0 : undefined,

      shootTimer: type === "queenXenoHen" ? 0 : undefined,
      buffRadius: type === "queenXenoHen" ? 150 : undefined,
      phase: 1,
      combatTimer: type === "voidReaper" ? 0 : undefined,
      healTimer: type === "voidReaper" ? 0 : undefined,
      blinkTimer: type === "voidReaper" ? 0 : undefined,
      reaperShootTimer: type === "voidReaper" ? 0 : undefined,
      isHealing: type === "voidReaper" ? false : undefined,
      auraRadius: type === "plagueBringer" ? 250 : undefined,
      plagueTimer: type === "plagueBringer" ? 0 : undefined,
      armor: type === "ironTyrant" ? 400 : undefined,
      maxArmor: type === "ironTyrant" ? 400 : undefined,
      isArmored: type === "ironTyrant" ? true : undefined,
      leviathanPhase: type === "voidLeviathan" ? "forceField" : undefined,
      leviathanPhaseTimer: type === "voidLeviathan" ? 0 : undefined,
      leviathanWhipTimer: type === "voidLeviathan" ? 0 : undefined,
      leviathanDashCount: type === "voidLeviathan" ? 0 : undefined,
      leviathanHealTimer: type === "voidLeviathan" ? 0 : undefined,
      leviathanWaveTimer: type === "voidLeviathan" ? 0 : undefined,
      hivePhase: type === "theHive" ? 1 : undefined,
      hiveAttackTimer: type === "theHive" ? 0 : undefined,
      hiveAttackChoice: type === "theHive" ? 0 : undefined,
    }

    // Boss announcement sound
    playSound(100, 0.5, "sawtooth")
  }

  // Shoot projectile
  const shoot = (canvas: HTMLCanvasElement, angle?: number) => {
    const player = playerRef.current
    if (!player) return

    const getShootAngle = () => {
      return angle !== undefined ? angle : Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x)
    }

    let cooldownTime = 15

    if (player.shootCooldown <= 0) {
      shootSound()

      switch (player.weaponType) {
        case "basic":
          // Single egg
          cooldownTime = 15
          projectilesRef.current.push({
            x: player.x,
            y: player.y,
            radius: 5,
            vx: Math.cos(getShootAngle()) * 8,
            vy: Math.sin(getShootAngle()) * 8,
            damage: 1,
            color: "#ffffff",
          })
          break

        case "doubleYolk":
          // Fires 2 eggs side by side
          cooldownTime = 10
          for (let i = -1; i <= 1; i += 2) {
            const perpAngle = getShootAngle() + Math.PI / 2
            const offsetX = Math.cos(perpAngle) * 8 * i
            const offsetY = Math.sin(perpAngle) * 8 * i

            projectilesRef.current.push({
              x: player.x + offsetX,
              y: player.y + offsetY,
              radius: 5,
              vx: Math.cos(getShootAngle()) * 8,
              vy: Math.sin(getShootAngle()) * 8,
              damage: 1,
              color: "#ffffff",
            })
          }
          break

        case "scrambled":
          // Spread shot - 5 eggs in a cone
          cooldownTime = 12
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = getShootAngle() + i * 0.25
            projectilesRef.current.push({
              x: player.x,
              y: player.y,
              radius: 4,
              vx: Math.cos(spreadAngle) * 7,
              vy: Math.sin(spreadAngle) * 7,
              damage: 1,
              color: "#ffaa00",
            })
          }
          break

        case "hardBoiled":
          // Piercing egg
          cooldownTime = 20
          projectilesRef.current.push({
            x: player.x,
            y: player.y,
            radius: 6,
            vx: Math.cos(getShootAngle()) * 10,
            vy: Math.sin(getShootAngle()) * 10,
            damage: 2,
            piercing: true,
            color: "#8b4513",
          })
          break

        case "explosive":
          // Explosive egg with AoE
          cooldownTime = 25
          projectilesRef.current.push({
            x: player.x,
            y: player.y,
            radius: 7,
            vx: Math.cos(getShootAngle()) * 6,
            vy: Math.sin(getShootAngle()) * 6,
            damage: 3,
            explosive: true,
            explosionRadius: 50,
            color: "#ff6600",
          })
          break

        case "golden":
          // Massive damage, slow fire rate
          cooldownTime = 30
          projectilesRef.current.push({
            x: player.x,
            y: player.y,
            radius: 8,
            vx: Math.cos(getShootAngle()) * 12,
            vy: Math.sin(getShootAngle()) * 12,
            damage: 10,
            explosive: true,
            explosionRadius: 80,
            color: "#ffd700",
          })
          playSound(1200, 0.3, "sine") // Special golden egg sound
          break
      }

      player.shootCooldown = cooldownTime
    }
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
      fontSize: size, // Use fontSize
      velocity: { x: 0, y: -1 }, // Initial upward velocity
    })
  }
    // Effect 3: Keyboard listeners
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysRef.current.add(key)

      // ─── Q = Charge ability ───
      if (key === "q" && gameStateRef.current === "playing") {
        const player = playerRef.current
        if (player && !player.isCharging && player.chargeCooldown <= 0) {
          // Determine charge direction
          let dirX = 0
          let dirY = 0

          // Priority 1: movement keys
          if (keysRef.current.has("w") || keysRef.current.has("arrowup")) dirY = -1
          if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) dirY = 1
          if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) dirX = -1
          if (keysRef.current.has("d") || keysRef.current.has("arrowright")) dirX = 1

          // Priority 2: aim toward mouse if no movement keys
          if (dirX === 0 && dirY === 0) {
            const angleToMouse = Math.atan2(
              mouseRef.current.y - player.y,
              mouseRef.current.x - player.x
            )
            dirX = Math.cos(angleToMouse)
            dirY = Math.sin(angleToMouse)
          } else {
            // Normalize diagonal
            const len = Math.sqrt(dirX * dirX + dirY * dirY)
            dirX /= len
            dirY /= len
          }

          player.isCharging = true
          player.chargeDistance = 0
          player.chargeCooldown = 15000
          player.chargeDirection = { x: dirX, y: dirY }
          player.chargeReady = false

          chargeSound()
          addFloatingText(player.x, player.y - 40, "CHARGE!", "#ff0000", 24)
          addScreenShake(10)
        }
      }
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

  const drawAlienCreature = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) => {
    const color = enemy.hitFlash && enemy.hitFlash > 0 ? "#ffffff" : enemy.color || getAlienColor(enemy.type)
    const pulse = 1 + Math.sin(time / 260 + enemy.x * 0.01) * 0.06
    const bob = Math.sin(time / 180 + enemy.x * 0.02) * enemy.radius * 0.08
    const blink = Math.sin(time / 900 + enemy.y) > 0.94
    ctx.save()
    ctx.translate(enemy.x, enemy.y + bob)
    ctx.scale(pulse, pulse)
    ctx.shadowBlur = 14
    ctx.shadowColor = color

    // Each enemy gets its own silhouette and motion signature.
    if (enemy.type === "tank") {
      ctx.fillStyle = "#18233d"
      ctx.beginPath()
      ctx.roundRect(-enemy.radius, -enemy.radius * 0.78, enemy.radius * 2, enemy.radius * 1.56, 8)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillRect(-enemy.radius * 0.72, -enemy.radius * 0.24, enemy.radius * 1.44, enemy.radius * 0.48)
    } else if (enemy.type === "leech") {
      const squish = 1 + Math.sin(time / 100) * 0.18
      ctx.scale(1 / squish, squish)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, 0, enemy.radius * 0.72, enemy.radius * 1.15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#fda4af"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, enemy.radius * 0.45, enemy.radius * 0.36, 0, Math.PI)
      ctx.stroke()
    } else if (enemy.type === "splitter") {
      ctx.fillStyle = color
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const r = i % 2 ? enemy.radius * 0.72 : enemy.radius * 1.12
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
      }
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#fde68a"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -enemy.radius * 0.72)
      ctx.lineTo(0, enemy.radius * 0.72)
      ctx.stroke()
    } else if (enemy.type === "blinker") {
      ctx.globalAlpha = 0.65 + Math.sin(time / 90) * 0.3
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, enemy.radius * (0.86 + Math.sin(time / 130) * 0.12), 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#e0f2fe"
      ctx.setLineDash([3, 4])
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.9, 0, 0, Math.PI * 2)
      ctx.fill()
      // Antennae sway independently so the swarm feels alive.
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(side * enemy.radius * 0.35, -enemy.radius * 0.65)
        ctx.quadraticCurveTo(side * enemy.radius * 0.7, -enemy.radius * 1.3, side * enemy.radius * (0.55 + Math.sin(time / 240) * 0.12), -enemy.radius * 1.5)
        ctx.stroke()
        ctx.fillStyle = "#fef08a"
        ctx.beginPath()
        ctx.arc(side * enemy.radius * (0.55 + Math.sin(time / 240) * 0.12), -enemy.radius * 1.5, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.shadowBlur = 0
    ctx.fillStyle = blink ? "#ffffff" : "#07111f"
    ctx.beginPath()
    ctx.ellipse(-enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.18, enemy.radius * 0.26, 0, 0, Math.PI * 2)
    ctx.ellipse(enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.18, enemy.radius * 0.26, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#bffcff"
    ctx.beginPath()
    ctx.arc(-enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.07, 0, Math.PI * 2)
    ctx.arc(enemy.radius * 0.34, -enemy.radius * 0.1, enemy.radius * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (enemy.hitFlash && enemy.hitFlash > 0) enemy.hitFlash--
  }

  // Update game state
  const update = (canvas: HTMLCanvasElement, deltaTime: number) => {
    const player = playerRef.current
    if (!player) return

    // Keep simulation speed stable even when a frame stalls. Enemy motion is
    // authored per 60 FPS frame, so scale it by the actual frame duration and
    // cap the scale to prevent a long frame from becoming a teleport.
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
    let dx = 0
    let dy = 0

    if (isMobile && joystickActive) {
      dx = joystickPos.x
      dy = joystickPos.y
    } else {
      if (keysRef.current.has("w") || keysRef.current.has("arrowup")) dy -= 1
      if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) dy += 1
      if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) dx -= 1
      if (keysRef.current.has("d") || keysRef.current.has("arrowright")) dx += 1
    }

    if (player.isCharging) {
  // Continue charging forward in the stored direction
  const chargeSpeed = 15
  player.x += player.chargeDirection.x * chargeSpeed
  player.y += player.chargeDirection.y * chargeSpeed
  player.chargeDistance += chargeSpeed

  // Kill enemies in path
  enemiesRef.current = enemiesRef.current.filter((enemy) => {
        const edx = player.x - enemy.x
        const edy = player.y - enemy.y
        const dist = Math.sqrt(edx * edx + edy * edy)

        if (dist < player.radius + enemy.radius) {
          enemyDeadSound()
          scoreRef.current += 10
          setScore(scoreRef.current)
          killCountRef.current += 1
          setKillCount(killCountRef.current)
          createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
          addFloatingText(enemy.x, enemy.y - 30, "+10", "#ffff00", 20)
          addScreenShake(4)
          return false
        }
        return true
      })

      // Stop charge after distance
      if (player.chargeDistance > 300) {
    player.isCharging = false
    player.chargeDistance = 0
    player.chargeDirection = { x: 0, y: 0 }
      }
    } else if (player.chargeReady) {
      // Player has a stored charge from power-up; wait for direction input
      // If a movement key is pressed, consume it and charge in that direction
      let dirX = 0
      let dirY = 0
      if (keysRef.current.has("w") || keysRef.current.has("arrowup")) dirY = -1
      if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) dirY = 1
      if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) dirX = -1
      if (keysRef.current.has("d") || keysRef.current.has("arrowright")) dirX = 1

      if (dirX !== 0 || dirY !== 0) {
        // Normalize diagonal
        const len = Math.sqrt(dirX * dirX + dirY * dirY)
        player.isCharging = true
        player.chargeDistance = 0
        player.chargeDirection = { x: dirX / len, y: dirY / len }
        player.chargeReady = false
        chargeSound()
        addFloatingText(player.x, player.y - 40, "CHARGE!", "#ff0000", 24)
        addScreenShake(10)

        // Also move this frame
        player.x += player.chargeDirection.x * 15
        player.y += player.chargeDirection.y * 15
        player.chargeDistance += 15
      } else {
        // No direction pressed, allow normal movement
        const length = Math.sqrt(dx * dx + dy * dy)
        if (length > 0) {
          player.x += (dx / length) * player.speed
          player.y += (dy / length) * player.speed
        }
      }
    } else {
      // Normal movement
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length > 0) {
        player.x += (dx / length) * player.speed
        player.y += (dy / length) * player.speed
      }
    }

    // Keep player in bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x))
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y))

    if (player.chargeCooldown > 0) player.chargeCooldown -= deltaTime
    if (player.stunCooldown > 0) player.stunCooldown -= deltaTime
    if (player.invincibleTime > 0) player.invincibleTime--

    // Update shooting
    if (player.shootCooldown > 0) player.shootCooldown--

    if ((mouseRef.current.down || shootButtonPressed) && player.shootCooldown <= 0) {
      shoot(canvas)
    }

    if (keysRef.current.has(" ") && player.stunCooldown <= 0 && !player.isCharging) {
      stunSound()
      player.stunCooldown = 10000 // 10 second cooldown
      addFloatingText(player.x, player.y - 40, "CACA-DOO!", "#ffff00", 24)
      addScreenShake(8)

      // Stun all enemies for 3 seconds
      enemiesRef.current.forEach((enemy) => {
        enemy.stunned = true
        enemy.stunnedTime = 3000
      })

      // Remove space key to prevent repeated activation
      keysRef.current.delete(" ")
    }

    if (player.weaponType !== "basic" && player.weaponTime > 0) {
      player.weaponTime -= deltaTime
      if (player.weaponTime <= 0) {
        player.weaponType = "basic"
      }
    }

    if (player.shield && player.shieldTime > 0) {
      player.shieldTime -= deltaTime
      if (player.shieldTime <= 0) player.shield = false
    }

    // Spawn boss
    if (waveRef.current - lastBossWaveRef.current >= 5 && !bossRef.current) {
      spawnBoss(canvas)
      lastBossWaveRef.current = waveRef.current
    }

    // Spawn enemies (disabled during boss fight) with dynamic interval
    if (!bossRef.current) {
      spawnTimerRef.current += deltaTime
      if (spawnTimerRef.current > currentSpawnInterval) {
        spawnEnemies(canvas)
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
      switch (boss.type) {

  
        // Alien Mouse 
        case "alienMouse": {
          const behavior = getBossBehavior("alienMouse")
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
              const behavior = getBossBehavior(boss.type)
              bossRef.current = null
              lastBossWaveRef.current = waveRef.current
              addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
              addScreenShake(15)
              playSound(200, 0.5, "sawtooth")
              scoreRef.current += 500
              setScore(scoreRef.current)
              killCountRef.current += 1
              setKillCount(killCountRef.current)
              for (let p = 0; p < 3; p++) {
                spawnWeaponPowerUp(
                  boss.x + (Math.random() - 0.5) * 80,
                  boss.y + (Math.random() - 0.5) * 80,
                )
              }
            },
            damagePlayer: (amount, source) => {
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
          break
        }

// Alien Bumblebee

                  case "alienBumblebee": {
          const behavior = getBossBehavior("alienBumblebee")
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

          // Rewards on death
          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }


                case "alienOctopus": {
          const behavior = getBossBehavior("alienOctopus")
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

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }


               case "alienMantis": {
          const behavior = getBossBehavior("alienMantis")
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

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }

        case "abductor":
         const behavior = getBossBehavior("abductor")
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

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        

         
case "queenXenoHen": {
  const queenBehavior = getBossBehavior("queenXenoHen")

  const queenContext = createBossContext({
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

  queenBehavior.update(boss, queenContext)

  if (!bossRef.current) {
    scoreRef.current += 500
    setScore(scoreRef.current)
    killCountRef.current += 1
    setKillCount(killCountRef.current)
    addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
    addScreenShake(15)
    playSound(200, 0.5, "sawtooth")

    for (let p = 0; p < 3; p++) {
      spawnWeaponPowerUp(
        boss.x + (Math.random() - 0.5) * 80,
        boss.y + (Math.random() - 0.5) * 80,
      )
    }
  }

  break
}



              case "devourer": {
  const behavior = getBossBehavior("devourer")

  const devourerContext = createBossContext({
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

  behavior.update(boss, devourerContext)
  break
}

        //  LATE GAME BOSSES 

                     case "theButcher":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            const distToPlayer = Math.sqrt(
              (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2
            )

            // Health + Berserk state
            const healthPercent = boss.health / boss.maxHealth
            const isBerserk = healthPercent < 0.20  // <20% HP = berserk

            // Enrage multiplier (berserk makes him even faster)
            let enrageMultiplier = 1
            if (isBerserk) {
              enrageMultiplier = 2  // 2x speed when berserk
            } else if (healthPercent < 0.33) {
              enrageMultiplier = 1.5
            } else if (healthPercent < 0.66) {
              enrageMultiplier = 1.25
            }

            //  BERSERK: DEVOUR MOBS TO HEAL 
            if (isBerserk) {
              // Look for nearby enemies to eat
              const devourRadius = boss.radius * 4 // huge devour radius
              enemiesRef.current = enemiesRef.current.filter((enemy) => {
                const dx = enemy.x - boss.x
                const dy = enemy.y - boss.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                if (dist < devourRadius) {
                  // DEVOUR! Heal boss and destroy enemy
                  const healAmount = 30  // +30 HP per mob eaten
                  boss.health = Math.min(boss.maxHealth, boss.health + healAmount)

                  // Visual feedback
                  createParticles(enemy.x, enemy.y, "#ff0000")
                  addFloatingText(enemy.x, enemy.y - 30, `+${healAmount} HP`, "#00ff00", 18)

                  // Sound
                  enemyDeadSound()

                  return false  // remove enemy
                }
                return true
              })
            }

            //  CYCLE TIMING 
            // Normal: 2.5s chase → 0.6s windup → 0.5s charge → 1.5s stunned = 5.1s
            // Berserk: 1s chase → 0.3s windup → 0.4s charge → 0.3s stunned = 2s (much faster)
            const cycleTime = isBerserk ? 2000 : 5100
            const chaseEnd = isBerserk ? 1000 : 2500
            const windupEnd = isBerserk ? 1300 : 3100
            const chargeEnd = isBerserk ? 1700 : 3600

            const cyclePhase = boss.spawnTimer % cycleTime

            if (cyclePhase < chaseEnd) {
              //  PHASE 1: CHASE 
              const chaseSpeed = isBerserk ? 0.8 : 0.4
              boss.x += Math.cos(angle) * boss.speed * chaseSpeed * enrageMultiplier
              boss.y += Math.sin(angle) * boss.speed * chaseSpeed * enrageMultiplier
            } else if (cyclePhase < windupEnd) {

              //  PHASE 2: WINDUP 
              boss.x += (Math.random() - 0.5) * (isBerserk ? 8 : 4)
              boss.y += (Math.random() - 0.5) * (isBerserk ? 8 : 4)
              const windupStart = cyclePhase - (isBerserk ? 1000 : 2500)
              if (windupStart < 50) {
                boss.chargeDirection = { x: Math.cos(angle), y: Math.sin(angle) }
              }
            } else if (cyclePhase < chargeEnd) {
              //  PHASE 3: CHARGE 
              if (boss.chargeDirection) {
                const chargeSpeed = isBerserk ? 20 : 15
                boss.x += boss.chargeDirection.x * boss.speed * chargeSpeed * enrageMultiplier
                boss.y += boss.chargeDirection.y * boss.speed * chargeSpeed * enrageMultiplier

                // Clamp to canvas
                boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
                boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))
              }
            } else {
              //  PHASE 4: STUNNED 
              // Berserk stun is very short (0.3s), normal is 1.5s
              const stunReset = isBerserk ? 1950 : 5050
              if (cyclePhase > stunReset) {
                boss.chargeDirection = undefined
              }
            }

            //  CONTACT DAMAGE 
            if (distToPlayer < player.radius + boss.radius * 0.85) {
              if (player.invincibleTime <= 0 && !player.shield) {
                const isCharging = cyclePhase >= windupEnd && cyclePhase < chargeEnd
                let damage = isCharging ? 45 : 15
                if (isBerserk) damage = isCharging ? 60 : 20  // more damage in berserk

                player.health -= damage
                player.invincibleTime = 60
                chickenHitSound()
                addScreenShake(isCharging ? 25 : 10)
                addFloatingText(player.x, player.y - 30, `-${damage}`, "#ff0000", isCharging ? 28 : 22)

                const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                player.x += Math.cos(pushAngle) * (isCharging ? 60 : 35)
                player.y += Math.sin(pushAngle) * (isCharging ? 60 : 35)

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
          break

      // VOID REAPER 
             case "voidReaper": {
          const behavior = getBossBehavior("voidReaper")
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

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }

          // PLAGUE BRINGER 

               case "plagueBringer": {
          const behavior = getBossBehavior("plagueBringer")
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

          // Game Over check (DoT can kill without invincibility) 
          if (gameStateRef.current === "gameOver") {
            setFinalScore(scoreRef.current)
            setFinalKillCount(killCountRef.current)
            setFinalWave(waveRef.current)
            break
          }

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }

       // IRON TYRANT
               case "ironTyrant": {
          const behavior = getBossBehavior("ironTyrant")
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

          // ─── Game Over check ───
          if (gameStateRef.current === "gameOver") {
            setFinalScore(scoreRef.current)
            setFinalKillCount(killCountRef.current)
            setFinalWave(waveRef.current)
            break
          }

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }

          
          
          // VOID LEVIATHAN
              case "voidLeviathan": {
          const behavior = getBossBehavior("voidLeviathan")
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

          if (gameStateRef.current === "gameOver") {
            setFinalScore(scoreRef.current)
            setFinalKillCount(killCountRef.current)
            setFinalWave(waveRef.current)
            break
          }

          if (!bossRef.current) {
            scoreRef.current += 500
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+500", "#ffff00", 28)
            addScreenShake(15)
            playSound(200, 0.5, "sawtooth")
            for (let p = 0; p < 3; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 80,
                boss.y + (Math.random() - 0.5) * 80,
              )
            }
          }
          break
        }


                  case "theHive": {
          const behavior = getBossBehavior("theHive")
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

          if (gameStateRef.current === "gameOver") {
            setFinalScore(scoreRef.current)
            setFinalKillCount(killCountRef.current)
            setFinalWave(waveRef.current)
            break
          }

          if (!bossRef.current) {
            scoreRef.current += 1000  // bigger reward for final boss
            setScore(scoreRef.current)
            killCountRef.current += 1
            setKillCount(killCountRef.current)
            addFloatingText(boss.x, boss.y - 40, "+1000", "#ffff00", 32)
            addScreenShake(20)
            playSound(150, 0.8, "sawtooth")
            for (let p = 0; p < 5; p++) {
              spawnWeaponPowerUp(
                boss.x + (Math.random() - 0.5) * 100,
                boss.y + (Math.random() - 0.5) * 100,
              )
            }
          }
          break
        }

        case "omegaPrime":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const phase = Math.floor(boss.spawnTimer / 3000) % 3
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)

            if (phase === 0) {
              const orbitAngle = boss.spawnTimer / 500
              boss.x = player.x + Math.cos(orbitAngle) * 280
              boss.y = player.y + Math.sin(orbitAngle) * 280
            } else if (phase === 1) {
              boss.x += Math.cos(angle) * boss.speed * 2.5
              boss.y += Math.sin(angle) * boss.speed * 2.5
            } else {
              boss.x += Math.cos(boss.spawnTimer / 100) * boss.speed
              boss.y += Math.sin(boss.spawnTimer / 80) * boss.speed
              boss.x += (player.x - boss.x) * 0.008
              boss.y += (player.y - boss.y) * 0.008
            }

            if (phase === 1 && Math.random() < 0.02) {
              const a = Math.random() * Math.PI * 2
              enemiesRef.current.push({
                x: boss.x + Math.cos(a) * boss.radius,
                y: boss.y + Math.sin(a) * boss.radius,
                radius: 10,
                speed: 1.2,
                health: 3,
                maxHealth: 3,
                groupId: Date.now(),
                type: "grunt",
                alienType: "grunt",
                color: getAlienColor("grunt"),
              })
            }
          }
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
        const contactDist = player.radius + boss.radius * 0.85  // slightly smaller than visual

        if (distp < contactDist) {
          // Cooldown per boss (to avoid 60fps drain)
          if (boss.phase === 1 && !boss.spawnTimer) boss.spawnTimer = 0  // ensure timer

          // Use invincibleTime on player to throttle
          if (player.invincibleTime <= 0 && !player.shield) {
            // Different damage per boss type
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
            player.invincibleTime = 60  // ~1 second invincibility
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
    enemiesRef.current.forEach((enemy) => {
      if (enemy.stunned && enemy.stunnedTime && enemy.stunnedTime > 0) {
        enemy.stunnedTime -= deltaTime
        if (enemy.stunnedTime <= 0) {
          enemy.stunned = false
          enemy.stunnedTime = undefined
        }
        return // Don't move stunned enemies
      }

      // Move towards player
      const dx = player.x - enemy.x
      const dy = player.y - enemy.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 1) { // guard against NaN from dist === 0
        // Apply alien type specific behavior
        switch (enemy.alienType) {
          case "grunt":
            enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
            enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
            break

          case "tank":
            enemy.x += (dx / dist) * Math.min(enemy.speed * 0.7, 1.6) * frameScale
            enemy.y += (dy / dist) * Math.min(enemy.speed * 0.7, 1.6) * frameScale
            break

          case "leech":
            // Stays at medium distance
            if (dist > 150) {
              enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
              enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
            }
            break

          case "blinker":
            if (!enemy.teleportCooldown) enemy.teleportCooldown = 0
            enemy.teleportCooldown -= deltaTime

            if (enemy.teleportCooldown <= 0 && dist > 100) {
              const angle = Math.atan2(dy, dx)
              enemy.x = player.x - Math.cos(angle) * 80
              enemy.y = player.y - Math.sin(angle) * 80
              enemy.teleportCooldown = 2000
              createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
            } else {
              enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
              enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
            }
            break

          case "splitter":
          default:
            enemy.x += (dx / dist) * Math.min(enemy.speed, 2.25) * frameScale
            enemy.y += (dy / dist) * Math.min(enemy.speed, 2.25) * frameScale
            break
        }
      }

      // Blinker teleport logic
      if (enemy.type === "blinker" && enemy.blinkerTimer !== undefined) {
        enemy.blinkerTimer -= deltaTime
        if (enemy.blinkerTimer <= 0) {
          // Teleport closer to player
          const angle = Math.random() * Math.PI * 2
          const teleportDist = 100 + Math.random() * 50
          enemy.x = player.x + Math.cos(angle) * teleportDist
          enemy.y = player.y + Math.sin(angle) * teleportDist

          // Keep within bounds
          enemy.x = Math.max(30, Math.min(canvas.width - 30, enemy.x))
          enemy.y = Math.max(30, Math.min(canvas.height - 30, enemy.y))

          enemy.blinkerTimer = 3000 + Math.random() * 2000
          createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
        }
      }

      // Leech healing logic
      if (enemy.type === "leech" && enemy.healTimer !== undefined) {
        enemy.healTimer += deltaTime
        if (enemy.healTimer > 2000) {
          // Heal nearby aliens
          enemiesRef.current.forEach((other) => {
            if (other !== enemy) {
              const dx2 = other.x - enemy.x
              const dy2 = other.y - enemy.y
              const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
              if (dist2 < 80 && other.health < other.maxHealth) {
                other.health = Math.min(other.maxHealth, other.health + 1)
              }
            }
          })
          enemy.healTimer = 0
        }
      }

      // Resolve contact before applying damage. A separating impulse plus a short
      // cooldown prevents enemies from tunneling back into the chicken every frame.
      if (enemy.contactCooldown && enemy.contactCooldown > 0) enemy.contactCooldown -= deltaTime
      const dxPlayerEnemy = player.x - enemy.x
      const dyPlayerEnemy = player.y - enemy.y
      const distSquared = dxPlayerEnemy * dxPlayerEnemy + dyPlayerEnemy * dyPlayerEnemy
      const contactDistance = player.radius + enemy.radius

      if (distSquared < contactDistance * contactDistance) {
        const distPlayerEnemy = Math.sqrt(distSquared)
        const normalX = distPlayerEnemy > 0.001 ? dxPlayerEnemy / distPlayerEnemy : -1
        const normalY = distPlayerEnemy > 0.001 ? dyPlayerEnemy / distPlayerEnemy : 0
        const separation = contactDistance + 8

        // Put the alien fully outside the chicken's hit circle, even when they
        // start at exactly the same position or the chicken is against a wall.
        enemy.x = player.x - normalX * separation
        enemy.y = player.y - normalY * separation
        enemy.x = Math.max(enemy.radius, Math.min(canvas.width - enemy.radius, enemy.x))
        enemy.y = Math.max(enemy.radius, Math.min(canvas.height - enemy.radius, enemy.y))

        if ((enemy.contactCooldown ?? 0) <= 0) {
          enemy.contactCooldown = 350
          if (player.invincibleTime <= 0 && !player.shield) {
            const damage = enemy.type === "tank" ? 20 : 10
            player.health -= damage
            player.invincibleTime = 60 // ~1 second of invincibility at 60fps
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
          createParticles(enemy.x, enemy.y, enemy.color || "#ff00ff")
        }
      }
    })

    enemiesRef.current = enemiesRef.current.filter((enemy) => enemy.health > 0) // Filter out dead enemies

    flyingSaucersRef.current = flyingSaucersRef.current.filter((saucer) => {
      // Move horizontally
      saucer.x += saucer.speed * saucer.direction
      // Bob up and down
      saucer.bobOffset += 0.05
      saucer.y += Math.sin(saucer.bobOffset) * 0.5

      // Check collision with projectiles
      for (let i = 0; i < projectilesRef.current.length; i++) {
        const proj = projectilesRef.current[i]
        const dx = proj.x - saucer.x
        const dy = proj.y - saucer.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < proj.radius + saucer.radius) {
          saucer.health -= proj.damage
          eggSplashSound() // Play egg splash sound when hitting saucer

          if (!proj.piercing) {
            projectilesRef.current.splice(i, 1)
            i--
          }

          if (saucer.health <= 0) {
            enemyDeadSound() // Play enemy death sound for saucer
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

      // Remove if off screen
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
    projectilesRef.current = projectilesRef.current.filter((proj) => {
      if (proj.dead) return false

      //  LEVIATHAN WAVE (collision + kick) 
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
            player.health -= 50
            player.invincibleTime = 120
            chickenHitSound()
            addScreenShake(40)
            addFloatingText(player.x, player.y - 40, "-50", "#ff0000", 32)

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
          }
          return false
        }

        return true
      }

              // ─── HIVE PHASE 2 & 3: PLAYER PROJECTILES HIT LORDS/SPAWNS ───
      {
        const hiveBoss = bossRef.current
        if (
          hiveBoss &&
          !proj.isEnemyProjectile &&
          (hiveBoss.hivePhase === 2 || hiveBoss.hivePhase === 3)
        ) {
          // ─── Phase 2: Lords ───
          if (hiveBoss.hivePhase === 2 && hiveBoss.hiveLordA && hiveBoss.hiveLordB) {
            const lordA = hiveBoss.hiveLordA
            const lordB = hiveBoss.hiveLordB
            const lordRadius = 30
            const shieldReduction = 0.75  // Lord A взима 75% (25% shield)

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

          // ─── Phase 3: Hive Spawns ───
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
      
      

      // Move projectile (ONCE, for both player and enemy)
      proj.x += proj.vx
      proj.y += proj.vy

      // Remove if out of bounds
      if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
        return false
      }

      //  ENEMY PROJECTILE: only hits player 
      if (proj.isEnemyProjectile) {
        const dxp = proj.x - player.x
        const dyp = proj.y - player.y
        const distp = Math.sqrt(dxp * dxp + dyp * dyp)

        if (distp < proj.radius + player.radius) {
          if (!player.shield && player.invincibleTime <= 0) {
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
          // Armored boss: damage armor first
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

          if (!proj.piercing) {
            proj.dead = true
            return false
          }
        }
      }

      //  PLAYER PROJECTILE: check enemies 
      const enemiesToDamage: Enemy[] = []

      for (let i = 0; i < enemiesRef.current.length; i++) {
        const enemy = enemiesRef.current[i]
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

    // Check collisions between player and power-ups
    powerUpsRef.current = powerUpsRef.current.filter((powerUp) => {
      const dx = player.x - powerUp.x
      const dy = player.y - powerUp.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < player.radius + powerUp.radius) {
        powerUpSound()

        switch (powerUp.type) {
          case "doubleYolk":
          case "scrambled":
          case "hardBoiled":
          case "explosive":
          case "golden":
            player.weaponType = powerUp.type
            player.weaponTime = 15000 // 15 seconds
            addFloatingText(player.x, player.y - 40, powerUp.type.toUpperCase(), "#ffaa00", 20)
            break

          case "shield":
            player.shield = true
            player.shieldTime = 10000 // 10 seconds
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

              // Power-up:
case "charge":
  player.chargeCooldown = 0  // reset cooldown
  addFloatingText(player.x, player.y - 40, "CHARGE READY!", "#ff4400", 22)
  break
        }

        return false
      }

      // Remove power-ups after lifetime
      powerUp.lifetime -= deltaTime
      return powerUp.lifetime > 0
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
      // Update floating text position based on velocity
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
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    bgGradient.addColorStop(0, "#0a0a1a")
    bgGradient.addColorStop(1, "#1a0a2a")
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const player = playerRef.current
    if (!player) return

    particlesRef.current.forEach((particle) => {
      const alpha = particle.life / 30
      ctx.globalAlpha = alpha

      // Glow effect
      ctx.shadowBlur = 10
      ctx.shadowColor = particle.color

      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
    })
    ctx.globalAlpha = 1

  powerUpsRef.current.forEach((powerUp) => {
  const colors = {
    doubleYolk: "#ffff00",
    scrambled: "#ffaa00",
    hardBoiled: "#8b4513",
    explosive: "#ff3300",
    golden: "#ffd700",
    shield: "#00ffff",
    health: "#00ff00",
    speedBoost: "#ff00ff",
    charge: "#f32206", 
  }

      const pulse = 1 + Math.sin(Date.now() / 200) * 0.15

      // Glow
      ctx.shadowBlur = 15
      ctx.shadowColor = colors[powerUp.type] || "#ffffff" // Fallback color

      ctx.fillStyle = colors[powerUp.type] || "#ffffff"
      ctx.beginPath()
      ctx.arc(powerUp.x, powerUp.y, powerUp.radius * pulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0

      // Golden egg special glow
      if (powerUp.type === "golden") {
        ctx.strokeStyle = "#ffff00"
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.5
        ctx.beginPath()
        ctx.arc(powerUp.x, powerUp.y, powerUp.radius * pulse + 5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.fillStyle = "#000"
      ctx.font = "bold 10px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const icons = {
        doubleYolk: "2",
        scrambled: "S",
        hardBoiled: "P",
        explosive: "E",
        golden: "G",
        shield: "S",
        health: "+",
        speedBoost: "F",
          charge: "Q",
      }
      if (icons[powerUp.type]) {
        ctx.fillText(icons[powerUp.type], powerUp.x, powerUp.y)
      }
    })

    // Draw enemies with distinct silhouettes and animation loops.
    const animationTime = Date.now()
    enemiesRef.current.forEach((enemy) => {
      drawAlienCreature(ctx, enemy, animationTime)
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
      // Saucer body
      ctx.fillStyle = "#00ffff"
      ctx.beginPath()
      ctx.ellipse(saucer.x, saucer.y, saucer.radius, saucer.radius * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Saucer dome
      ctx.fillStyle = "#0099cc"
      ctx.beginPath()
      ctx.ellipse(saucer.x, saucer.y - 5, saucer.radius * 0.6, saucer.radius * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Saucer lights
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const x = saucer.x + Math.cos(angle) * saucer.radius * 0.7
        const y = saucer.y + Math.sin(angle) * saucer.radius * 0.3
        ctx.fillStyle = i % 2 === 0 ? "#ffff00" : "#ff00ff"
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Health indicator
      ctx.fillStyle = "#fff"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`${saucer.health}`, saucer.x, saucer.y + saucer.radius + 10)
    })

    const boss = bossRef.current
    if (boss) {
      const bossTime = Date.now()
      const bossBob = Math.sin(bossTime / 260) * 4
      const bossBreath = 1 + Math.sin(bossTime / 340) * 0.045
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
          bossColor = "#cc0000" // Dark red
          break
        case "queenXenoHen":
          bossColor = "#ff3333" // Bright red
          break
        case "devourer":
          bossColor = "#990000" // Deep red
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

      // Type-specific visuals




      // Start of boss drawing 

      // boss Alien Mouse
               if (boss.type === "alienMouse") {
        const behavior = getBossBehavior("alienMouse")
        behavior.draw(ctx, boss, bossTime, playerRef.current!)
      
      

        // boss Alien Bumblebee

         } else if (boss.type === "alienBumblebee") {
        const behavior = getBossBehavior("alienBumblebee")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      
      
      
      

// boss Alien Octopus
      

      } else if (boss.type === "alienOctopus") {
        const behavior = getBossBehavior("alienOctopus")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      

  



    // boss Alien Mantis
         } else if (boss.type === "alienMantis") {
        const behavior = getBossBehavior("alienMantis")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      
      



        // boss Alien Abductor
         // boss Alien Abductor
           } else if (boss.type === "abductor") {
        const behavior = getBossBehavior("abductor")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      
        // boss Queen Xeno Hen
    
} else if (boss.type === "queenXenoHen") {
  const queenBehavior = getBossBehavior("queenXenoHen")
  const playerForDraw = playerRef.current

  if (playerForDraw) {
    queenBehavior.draw(ctx, boss, bossTime, playerForDraw)
  }

      

        // boss Devourer

      } else if (boss.type === "devourer") {
  const behavior = getBossBehavior("devourer")
  const playerForDraw = playerRef.current

  if (playerForDraw) {
    behavior.draw(ctx, boss, bossTime, playerForDraw)
  }

     
      // boss The Butcher
        
          } else if (boss.type === "theButcher") {
  const behavior = getBossBehavior("theButcher")
  const playerForDraw = playerRef.current

  if (playerForDraw) {
    behavior.draw(ctx, boss, bossTime, playerForDraw)
  }

      
      
// boss Void Reaper
           } else if (boss.type === "voidReaper") {
        const behavior = getBossBehavior("voidReaper")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      


      // boss Plague Bringer
          } else if (boss.type === "plagueBringer") {
        const behavior = getBossBehavior("plagueBringer")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      
      


  // boss Iron Tyrant
         } else if (boss.type === "ironTyrant") {
        const behavior = getBossBehavior("ironTyrant")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      
      
// Void Leviathan 

          } else if (boss.type === "voidLeviathan") {
        const behavior = getBossBehavior("voidLeviathan")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      
      

// The Hive 

          } else if (boss.type === "theHive") {
        const behavior = getBossBehavior("theHive")
        const playerForDraw = playerRef.current
        if (playerForDraw) {
          behavior.draw(ctx, boss, bossTime, playerForDraw)
        }
      }





      else if (boss.type === "omegaPrime") {
       
        ctx.fillStyle = "#ffff00"
        ctx.beginPath()
        ctx.arc(boss.x - boss.radius * 0.3, boss.y - boss.radius * 0.2, boss.radius * 0.15, 0, Math.PI * 2)
        ctx.arc(boss.x + boss.radius * 0.3, boss.y - boss.radius * 0.2, boss.radius * 0.15, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = "#000000"
        ctx.beginPath()
        ctx.arc(boss.x - boss.radius * 0.3, boss.y - boss.radius * 0.2, boss.radius * 0.08, 0, Math.PI * 2)
        ctx.arc(boss.x + boss.radius * 0.3, boss.y - boss.radius * 0.2, boss.radius * 0.08, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()



      // End of boss drawing

            // Armor bar (only if boss has armor)
      if (boss.maxArmor !== undefined && boss.armor !== undefined) {
        const armorBarWidth = canvas.width * 0.6
        const armorBarHeight = 12
        const armorBarX = (canvas.width - armorBarWidth) / 2
        const armorBarY = canvas.height - 70
        const armorPercent = boss.armor / boss.maxArmor

        ctx.fillStyle = "#1e293b"
        ctx.fillRect(armorBarX, armorBarY, armorBarWidth, armorBarHeight)
        ctx.fillStyle = "#94a3b8"
        ctx.fillRect(armorBarX, armorBarY, armorBarWidth * armorPercent, armorBarHeight)
        ctx.strokeStyle = "#64748b"
        ctx.lineWidth = 2
        ctx.strokeRect(armorBarX, armorBarY, armorBarWidth, armorBarHeight)

        ctx.fillStyle = "#fff"
        ctx.font = "bold 12px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`ARMOR: ${Math.ceil(boss.armor)}/${boss.maxArmor}`, canvas.width / 2, armorBarY - 5)
      }

       // Boss health bar (large and prominent)
      const barWidth = canvas.width * 0.6
      const barHeight = 20
      const barX = (canvas.width - barWidth) / 2
      const barY = canvas.height - 40
      const { current: displayHP, max: displayMaxHP } = getBossDisplayHP(boss)
      const healthPercent = displayHP / displayMaxHP

      ctx.fillStyle = "#333"
      ctx.fillRect(barX, barY, barWidth, barHeight)
      ctx.fillStyle = healthPercent > 0.5 ? "#ff0000" : "#ff6600"
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2
      ctx.strokeRect(barX, barY, barWidth, barHeight)

          // Boss name and health text
      ctx.fillStyle = "#fff"
      ctx.font = "bold 16px Arial"
      ctx.textAlign = "center"
      const bossNames = {
        alienMouse: "THE ALIEN MOUSE",
        alienBumblebee: "THE ALIEN BUMBLEBEE",
        alienOctopus: "THE ALIEN OCTOPUS",
        alienMantis: "THE ALIEN MANTIS",
        abductor: "THE ABDUCTOR",
        queenXenoHen: "QUEEN XENOHEN",
        devourer: "THE DEVOURER",
        theButcher: "THE BUTCHER",
        voidReaper: "VOID REAPER",
        plagueBringer: "PLAGUE BRINGER",
        ironTyrant: "IRON TYRANT",
        voidLeviathan: "VOID LEVIATHAN",
        theHive: "THE HIVE",
        omegaPrime: "OMEGA PRIME",
      }
           ctx.fillText(`${bossNames[boss.type]} - ${Math.ceil(displayHP)}/${displayMaxHP}`, canvas.width / 2, barY - 10)
    }

     projectilesRef.current.forEach((proj) => {
    
      

        //  LEVIATHAN SHOCKWAVE (elliptical, C-shaped) 
      if (proj.isLeviathanWave) {
        const waveAge = proj.waveAge || 0
        const waveMaxAge = proj.waveMaxAge || 1100
        const waveAngle = proj.waveAngle || 0

        const progress = Math.min(waveAge / waveMaxAge, 1)
        const alpha = 1 - progress * 0.7  
        const waveRadius = proj.radius * (1 + progress * 3.5)  

        ctx.save()
        ctx.translate(proj.x, proj.y)
        ctx.rotate(waveAngle)

        // Outer C-shaped arc
        ctx.globalAlpha = alpha * 0.8
        ctx.strokeStyle = proj.color || "#a855f7"
        ctx.lineWidth = 6 * alpha + 2
        ctx.shadowColor = proj.color || "#a855f7"
        ctx.shadowBlur = 20

        ctx.beginPath()
        ctx.arc(0, 0, waveRadius, -Math.PI * 0.85, Math.PI * 0.85, false)  // wider arc
        ctx.stroke()

        // Inner bright arc
        ctx.globalAlpha = alpha * 0.6
        ctx.strokeStyle = "#e9d5ff"
        ctx.lineWidth = 3 * alpha + 1
        ctx.shadowBlur = 12

        ctx.beginPath()
        ctx.arc(0, 0, waveRadius * 0.85, -Math.PI * 0.75, Math.PI * 0.75, false)
        ctx.stroke()

        // Glow particles along arc
        ctx.globalAlpha = alpha * 0.5

               for (let i = 0; i < 10; i++) {
          const a = -Math.PI * 0.8 + (i / 10) * Math.PI * 1.6

          const px = Math.cos(a) * waveRadius
          const py = Math.sin(a) * waveRadius

          ctx.fillStyle = "#c084fc"
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.shadowBlur = 0
        ctx.restore()
        return
      }

      // VOID SLASH (curved, crescent-shaped)
  if (proj.isVoidSlash) {
    const angle = Math.atan2(proj.vy, proj.vx)
    

    ctx.save()
    ctx.translate(proj.x, proj.y)
    ctx.rotate(angle)

    ctx.shadowColor = proj.color || "#c084fc"
    ctx.shadowBlur = 15

    ctx.strokeStyle = proj.color || "#c084fc"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, 0, proj.radius, -Math.PI * 0.5, Math.PI * 0.5)
    ctx.stroke()

    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, proj.radius * 0.6, -Math.PI * 0.4, Math.PI * 0.4)
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.restore()
    return
  }

  //  VOID ORB 
  if (proj.isVoidOrb) {
    ctx.save()
    ctx.shadowColor = proj.color || "#7c3aed"
    ctx.shadowBlur = 20

    const orbGrad = ctx.createRadialGradient(
      proj.x - proj.radius * 0.3,
      proj.y - proj.radius * 0.3,
      proj.radius * 0.1,
      proj.x,
      proj.y,
      proj.radius * 1.2
    )
    orbGrad.addColorStop(0, "#ffffff")
    orbGrad.addColorStop(0.3, proj.color || "#c084fc")
    orbGrad.addColorStop(0.7, "#7c3aed")
    orbGrad.addColorStop(1, "#1a0a2a")

    ctx.fillStyle = orbGrad
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = "#0a0a15"
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.radius * 0.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
    return
  }
        //  PLAGUE BALL (green explosive) 
      if (proj.isEnemyProjectile && proj.color === "#84cc16" && proj.explosive) {
        ctx.save()
        ctx.shadowColor = "#84cc16"
        ctx.shadowBlur = 25

        const plagueGrad = ctx.createRadialGradient(
          proj.x - proj.radius * 0.3,
          proj.y - proj.radius * 0.3,
          proj.radius * 0.1,
          proj.x,
          proj.y,
          proj.radius * 1.3
        )
        plagueGrad.addColorStop(0, "#fef9c3")
        plagueGrad.addColorStop(0.3, "#d4ff00")
        plagueGrad.addColorStop(0.7, "#84cc16")
        plagueGrad.addColorStop(1, "#3f6212")

        ctx.fillStyle = plagueGrad
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Dark core
        ctx.fillStyle = "#1a2e05"
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius * 0.3, 0, Math.PI * 2)
        ctx.fill()

        // Pulsing outline


        const time = Date.now()
        ctx.strokeStyle = `rgba(212, 255, 0, ${0.6 + Math.sin(time / 100) * 0.4})`
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.restore()
        return
      }

  //  BIO-EGG (isEnemyProjectile) 
  if (proj.isEnemyProjectile) {
    ctx.save()
    ctx.shadowColor = proj.color || "#28f0ff"
    ctx.shadowBlur = 20

    // Egg body
    const eggGrad = ctx.createRadialGradient(
      proj.x - proj.radius * 0.35,
      proj.y - proj.radius * 0.4,
      proj.radius * 0.1,
      proj.x,
      proj.y,
      proj.radius * 1.3
    )
    eggGrad.addColorStop(0, "#fff2f2")
    eggGrad.addColorStop(0.3, "#ff8b8b")
    eggGrad.addColorStop(0.7, "#ed0a0a")
    eggGrad.addColorStop(1, "#df0f0f")

    ctx.fillStyle = eggGrad
    ctx.beginPath()
    ctx.ellipse(proj.x, proj.y, proj.radius, proj.radius * 1.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Bright outline
    ctx.strokeStyle = "#fdf908"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(proj.x, proj.y, proj.radius, proj.radius * 1.3, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Crack detail
    ctx.strokeStyle = "rgba(255, 246, 246, 0.7)"
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(proj.x - proj.radius * 0.35, proj.y - proj.radius * 0.4)
    ctx.lineTo(proj.x - proj.radius * 0.05, proj.y)
    ctx.lineTo(proj.x - proj.radius * 0.25, proj.y + proj.radius * 0.5)
    ctx.stroke()

    // Trailing glow
    ctx.fillStyle = "rgba(221, 27, 27, 0.87)"
    ctx.beginPath()
    ctx.arc(
      proj.x - proj.vx * 2,
      proj.y - proj.vy * 2,
      proj.radius * 0.9,
      0, Math.PI * 2
    )
    ctx.fill()

    return
  }



      //  PLAYER PROJECTILES (existing) 
      if (proj.explosive) {
        // Explosive egg (red-orange)
        ctx.fillStyle = "#ff6600"
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#ff0000"
        ctx.lineWidth = 1
        ctx.stroke()
      } else if (proj.piercing) {
        // Hard-boiled egg (brown)
        ctx.fillStyle = "#8b4513"
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
        ctx.fill()
      } else if (proj.damage >= 10) {
        // Golden egg
        ctx.fillStyle = "#ffd700"
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#ffff00"
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // Regular egg
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2)
        ctx.fill()

        // Egg spots
        ctx.fillStyle = "#d4a574"
        ctx.beginPath()
        ctx.arc(proj.x - 1, proj.y - 1, 1.5, 0, Math.PI * 2)
        ctx.arc(proj.x + 1, proj.y + 1, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    floatingTextsRef.current.forEach((text) => {
      ctx.globalAlpha = text.life / 60
      ctx.font = `bold ${text.fontSize}px Arial` // Use fontSize
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Text outline
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 3
      ctx.strokeText(text.text, text.x, text.y)

      ctx.fillStyle = text.color
      ctx.fillText(text.text, text.x, text.y)
    })
    ctx.globalAlpha = 1

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

    // start of player drawing

    // Draw player — Simple White Rooster (front view)
    ctx.save()
    ctx.translate(player.x, player.y)

    const now = Date.now()
    const wingFlap = Math.sin(now / 180) * 0.3
    const bodyBob = Math.sin(now / 300) * 2

    if (player.isCharging) {
      ctx.strokeStyle = "rgba(255, 200, 100, 0.8)"
      ctx.lineWidth = 4
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(-player.radius * 1.4 - i * 10, -12 + i * 6)
        ctx.lineTo(-player.radius * 1.4 - 24 - i * 10, -12 + i * 6)
        ctx.stroke()
      }
    }

    ctx.translate(0, bodyBob)

    // ─── WINGS (2 big simple shapes) ───
    ctx.save()
    ctx.translate(-player.radius * 0.7, 0)
    ctx.rotate(wingFlap)
    ctx.fillStyle = "#e8e8e8"
    ctx.beginPath()
    ctx.ellipse(-player.radius * 0.5, 0, player.radius * 0.9, player.radius * 0.5, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#888888"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.translate(player.radius * 0.7, 0)
    ctx.rotate(-wingFlap)
    ctx.fillStyle = "#e8e8e8"
    ctx.beginPath()
    ctx.ellipse(player.radius * 0.5, 0, player.radius * 0.9, player.radius * 0.5, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#888888"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    // ─── FEET (2 simple triangles) ───
    ctx.fillStyle = "#ff9900"
    ctx.strokeStyle = "#aa5500"
    ctx.lineWidth = 1.5
    // Left
    ctx.beginPath()
    ctx.moveTo(-player.radius * 0.35, player.radius * 0.85)
    ctx.lineTo(-player.radius * 0.55, player.radius * 1.15)
    ctx.lineTo(-player.radius * 0.15, player.radius * 1.15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // Right
    ctx.beginPath()
    ctx.moveTo(player.radius * 0.35, player.radius * 0.85)
    ctx.lineTo(player.radius * 0.55, player.radius * 1.15)
    ctx.lineTo(player.radius * 0.15, player.radius * 1.15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // ─── BODY (one big white circle) ───
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 2
    ctx.stroke()

    // Subtle belly shadow (one arc)
    ctx.strokeStyle = "#d0d0d0"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, player.radius * 0.7, 0.3, Math.PI - 0.3)
    ctx.stroke()

    // ─── COMB (one big red blob) ───
    ctx.fillStyle = "#ee1111"
    ctx.beginPath()
    ctx.ellipse(0, -player.radius * 0.95, player.radius * 0.35, player.radius * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#880000"
    ctx.lineWidth = 2
    ctx.stroke()

    // ─── BEAK (one big orange triangle) ───
    ctx.fillStyle = "#ffaa00"
    ctx.beginPath()
    ctx.moveTo(-player.radius * 0.2, -player.radius * 0.05)
    ctx.lineTo(0, player.radius * 0.3)
    ctx.lineTo(player.radius * 0.2, -player.radius * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "#aa6600"
    ctx.lineWidth = 2
    ctx.stroke()

    // ─── EYES (2 simple black dots) ───
    ctx.fillStyle = "#000000"
    ctx.beginPath()
    ctx.arc(-player.radius * 0.35, -player.radius * 0.3, player.radius * 0.13, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(player.radius * 0.35, -player.radius * 0.3, player.radius * 0.13, 0, Math.PI * 2)
    ctx.fill()

    // Eye shine (2 tiny white dots)
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(-player.radius * 0.32, -player.radius * 0.33, player.radius * 0.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(player.radius * 0.38, -player.radius * 0.33, player.radius * 0.05, 0, Math.PI * 2)
    ctx.fill()

    // ─── WATTLE (one red blob below beak) ───
    ctx.fillStyle = "#ee1111"
    ctx.beginPath()
    ctx.ellipse(0, player.radius * 0.45, player.radius * 0.12, player.radius * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#880000"
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.restore()
    // end of player drawing



    enemiesRef.current.forEach((enemy) => {
      ctx.save()
      ctx.translate(enemy.x, enemy.y)

      // Draw stunned indicator
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
      ctx.save()
      ctx.translate(powerUp.x, powerUp.y)

      // Pulsing glow effect
      const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.15
      ctx.shadowBlur = 20
      ctx.shadowColor = (() => {
        switch (powerUp.type) {
          case "doubleYolk":
            return "#ffaa00"
          case "scrambled":
            return "#ff6600"
          case "hardBoiled":
            return "#888888"
          case "explosive":
            return "#ff0000"
          case "golden":
            return "#ffff00"
          case "shield":
            return "#00ffff"
          case "health":
            return "#00ff00"
          case "speedBoost":
            return "#ff00ff"
          case "charge":
            return "#ff4400"
          default:
            return "#ffffff"
        }
      })()

      ctx.scale(pulseScale, pulseScale)
 // Draw power-up shape
      if (powerUp.type === "shield") {
        // Shield icon
        ctx.fillStyle = "#00ffff"
        ctx.beginPath()
        ctx.moveTo(0, -powerUp.radius)
        ctx.quadraticCurveTo(powerUp.radius, -powerUp.radius, powerUp.radius, 0)
        ctx.quadraticCurveTo(powerUp.radius, powerUp.radius, 0, powerUp.radius)
        ctx.quadraticCurveTo(-powerUp.radius, powerUp.radius, -powerUp.radius, 0)
        ctx.quadraticCurveTo(-powerUp.radius, -powerUp.radius, 0, -powerUp.radius)
        ctx.fill()
      } else if (powerUp.type === "health") {
        // Health cross
        ctx.fillStyle = "#00ff00"
        ctx.fillRect(-powerUp.radius / 3, -powerUp.radius, powerUp.radius / 1.5, powerUp.radius * 2)
        ctx.fillRect(-powerUp.radius, -powerUp.radius / 3, powerUp.radius * 2, powerUp.radius / 1.5)
      } else if (powerUp.type === "speedBoost") {
        // Lightning bolt
        ctx.fillStyle = "#ff00ff"
        ctx.beginPath()
        ctx.moveTo(-powerUp.radius / 2, -powerUp.radius)
        ctx.lineTo(powerUp.radius / 2, 0)
        ctx.lineTo(0, 0)
        ctx.lineTo(powerUp.radius / 2, powerUp.radius)
        ctx.lineTo(-powerUp.radius / 2, 0)
        ctx.lineTo(0, 0)
        ctx.closePath()
        ctx.fill()
      } else if (powerUp.type === "charge") {
        ctx.fillStyle = "#ff4400"
        ctx.strokeStyle = "#ffaa00"
        ctx.lineWidth = 2
        // Draw forward arrow
        ctx.beginPath()
        ctx.moveTo(-powerUp.radius, 0)
        ctx.lineTo(powerUp.radius, 0)
        ctx.lineTo(powerUp.radius - 6, -6)
        ctx.moveTo(powerUp.radius, 0)
        ctx.lineTo(powerUp.radius - 6, 6)
        ctx.stroke()
        // Draw star burst
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2
          ctx.beginPath()
          ctx.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4)
          ctx.lineTo(Math.cos(angle) * powerUp.radius, Math.sin(angle) * powerUp.radius)
          ctx.stroke()
        }
      } else {
        // Egg for weapons
        ctx.fillStyle = ctx.shadowColor
        ctx.beginPath()
        ctx.ellipse(0, 0, powerUp.radius * 0.7, powerUp.radius, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.restore()
    })
    // Draw UI
    ctx.shadowBlur = 0

    // ─── TOP-LEFT: Health bar ───
    const healthBarGradient = ctx.createLinearGradient(10, 10, 210, 30)
    if (player.health > 30) {
      healthBarGradient.addColorStop(0, "#246605")
      healthBarGradient.addColorStop(1, "#246605")
    } else {
      healthBarGradient.addColorStop(0, "#ff0000")
      healthBarGradient.addColorStop(1, "#aa0000")
    }

    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(10, 10, 200, 24)
    ctx.fillStyle = healthBarGradient
    ctx.fillRect(12, 12, (player.health / player.maxHealth) * 196, 20)

    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, 200, 24)

    ctx.fillStyle = "#fff"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`${Math.ceil(player.health)}/${player.maxHealth}`, 110, 22)

    // ─── TOP-LEFT (below health): Weapon timer ───
    ctx.textAlign = "left"
    ctx.font = "bold 15px Arial"
    let yOffset = 46

    if (player.weaponType !== "basic") {
      const weaponNames = {
        doubleYolk: "Double Yolk",
        scrambled: "Scrambled",
        hardBoiled: "Piercing",
        explosive: "Explosive",
        golden: "GOLDEN!",
      }
      const weaponColors = {
        doubleYolk: "#ffff00",
        scrambled: "#ffaa00",
        hardBoiled: "#8b4513",
        explosive: "#ff3300",
        golden: "#ffd700",
      }

      const color = weaponColors[player.weaponType as keyof typeof weaponColors] || "#fff"
      const timeLeft = Math.ceil(player.weaponTime / 1000)
      const timePercent = player.weaponType === "golden" ? player.weaponTime / 8000 : player.weaponTime / 15000

      // Countdown ring
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(25, yOffset + 5, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent)
      ctx.stroke()

      ctx.fillStyle = color
      ctx.shadowBlur = 3
      ctx.shadowColor = color
      ctx.fillText(`${weaponNames[player.weaponType as keyof typeof weaponNames]} (${timeLeft}s)`, 45, yOffset + 10)
      ctx.shadowBlur = 0
      yOffset += 26
    }

    // ─── TOP-LEFT (below weapon): Shield timer ───
    if (player.shield) {
      const timeLeft = Math.ceil(player.shieldTime / 1000)
      const timePercent = player.shieldTime / 10000

      ctx.strokeStyle = "#00ffff"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(25, yOffset + 5, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent)
      ctx.stroke()

      ctx.fillStyle = "#00ffff"
      ctx.shadowBlur = 3
      ctx.shadowColor = "#00ffff"
      ctx.fillText(`Shield (${timeLeft}s)`, 45, yOffset + 10)
      ctx.shadowBlur = 0
    }

    // ─── TOP-RIGHT: Time / Kills / Wave ───
    ctx.shadowBlur = 3
    ctx.shadowColor = "#000"
    ctx.fillStyle = "#fff"
    ctx.font = "bold 20px Arial"
    ctx.textAlign = "right"

    const totalSeconds = Math.floor(scoreRef.current / 60)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

    ctx.fillText(`Time: ${timeString}`, canvas.width - 10, 25)
    ctx.fillText(`Kills: ${killCountRef.current}`, canvas.width - 10, 50)
    ctx.fillText(`Wave: ${waveRef.current}`, canvas.width - 10, 75)
    ctx.shadowBlur = 0

    // ─── TOP-RIGHT (below wave): CACA-DOO cooldown ───
    const cooldownWidth = 130
    const cooldownHeight = 22
    const cooldownX = canvas.width - cooldownWidth - 10

    if (player.stunCooldown > 0) {
      const stunCooldownPercent = player.stunCooldown / 10000
      ctx.fillStyle = "rgba(255, 255, 0, 0.8)"
      ctx.fillRect(cooldownX, 92, cooldownWidth, cooldownHeight)
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(cooldownX + cooldownWidth * (1 - stunCooldownPercent), 92, cooldownWidth * stunCooldownPercent, cooldownHeight)
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`CACA-DOO: ${Math.ceil(player.stunCooldown / 1000)}s`, cooldownX + cooldownWidth / 2, 107)
    } else {
      ctx.fillStyle = "rgba(129, 2, 2, 0.8)"
      ctx.fillRect(cooldownX, 92, cooldownWidth, cooldownHeight)
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("CACA-DOO: READY", cooldownX + cooldownWidth / 2, 107)
    }

   
    // ─── TOP-RIGHT (below CACA-DOO): Charge status ───
    if (player.isCharging) {
      // Currently charging
      ctx.fillStyle = "rgba(255, 68, 0, 0.9)"
      ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("CHARGING!", cooldownX + cooldownWidth / 2, 133)
    } else if (player.chargeReady) {
      // Has stored charge, waiting for direction
      ctx.fillStyle = "rgba(255, 68, 0, 0.9)"
      ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("PICK DIRECTION!", cooldownX + cooldownWidth / 2, 133)
    } else if (player.chargeCooldown > 0) {
      // Cooldown
      const chargeCooldownPercent = player.chargeCooldown / 15000
      ctx.fillStyle = "rgba(100, 100, 100, 0.8)"
      ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(cooldownX + cooldownWidth * (1 - chargeCooldownPercent), 118, cooldownWidth * chargeCooldownPercent, cooldownHeight)
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`CHARGE: ${Math.ceil(player.chargeCooldown / 1000)}s`, cooldownX + cooldownWidth / 2, 133)
    } else {
      // Ready (no power-up, but can double-tap)
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)"
      ctx.fillRect(cooldownX, 118, cooldownWidth, cooldownHeight)
      ctx.fillStyle = "white"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.fillText("CHARGE: READY", cooldownX + cooldownWidth / 2, 133)
    }
    ctx.restore()
  }

// Game loop
type GameLoopFn = ((currentTime: number) => void) & { lastTime?: number }

const gameLoop: GameLoopFn = (currentTime: number) => {
  const canvas = canvasRef.current
  const ctx = canvas?.getContext("2d")
  if (!canvas || !ctx) return

  if (gameStateRef.current === "playing") {
    // Calculate deltaTime dynamically for smoother updates
    const rawDeltaTime = currentTime - (gameLoop.lastTime ?? 0) || 16
    // Cap catch-up work after a tab switch or a stalled frame so aliens cannot
    // jump through the chicken and trigger a burst of collision effects.
    const deltaTime = Math.min(Math.max(rawDeltaTime, 1), 34)
    update(canvas, deltaTime)
    draw(ctx, canvas)
    gameLoop.lastTime = currentTime
  }

  animationIdRef.current = requestAnimationFrame(gameLoop)
}

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

 
  // Moved the startGame and restartGame functions to the end of the `useEffect` hook and then removed the duplicated declarations
  // Moved the handleMouseMove, handleMouseDown, handleMouseUp, and handleTouchMove functions inside the useEffect hook

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
          {/* Joystick */}
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

          {/* Shoot Button */}
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