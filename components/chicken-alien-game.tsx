"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"

const DIFFICULTY_SCALING = {
  SPEED_INCREASE_PER_30S: 0.1,
  SPAWN_FREQUENCY_DECREASE_PER_30S: 200,
  MIN_SPAWN_INTERVAL: 2000,
  MAX_ENEMIES_BASE: 15,
  MAX_ENEMIES_INCREASE_PER_30S: 3,
  GROUP_SIZE_BASE: 2,
  GROUP_SIZE_INCREASE_PER_30S: 1,
  MAX_GROUP_SIZE: 8,
  TANK_SPAWN_CHANCE: 0.15,
  POWER_UP_EARLY_INTERVAL: 6000,
  POWER_UP_LATE_INTERVAL: 12000,
  POWER_UP_TRANSITION_TIME: 180, // 3 minutes
}

type GameObject = {
  x: number
  y: number
  radius: number
}

type Player = GameObject & {
  health: number
  maxHealth: number
  speed: number
  shootCooldown: number
  weaponType: "basic" | "doubleYolk" | "scrambled" | "hardBoiled" | "explosive" | "golden"
  weaponTime: number
  shield: boolean
  shieldTime: number
  chargeCooldown: number
  stunCooldown: number
  isCharging: boolean
  chargeDistance: number
  chargeDirection: { x: number; y: number }  
  chargeReady: boolean                        
  invincibleTime: number
}

type Enemy = GameObject & {
  speed: number
  health: number
  maxHealth: number
  groupId: number
  type: "grunt" | "tank" | "leech" | "splitter" | "blinker"
  blinkerTimer?: number
  healTimer?: number
  stunned?: boolean // Added for stun ability
  stunnedTime?: number // Added for stun ability
  teleportCooldown?: number // Added for blinker behavior
  alienType?: string // Added for more specific behavior
  color?: string // Added for particle color
  hitFlash?: number // For hit flash effect
  contactCooldown?: number // Prevents repeated contact effects while separated
}

type Boss = GameObject & {
  health: number
  maxHealth: number
  type:
    | "alienMouse"
    | "alienBumblebee"
    | "alienOctopus"
    | "alienMantis"
    | "abductor"
    | "queenXenoHen"
    | "devourer"
    | "theButcher"
    | "voidReaper"
    | "plagueBringer"
    | "ironTyrant"
    | "voidLeviathan"
    | "theHive"
    | "omegaPrime"
  speed: number
  spawnTimer?: number
  buffRadius?: number
  shootTimer?: number
  phase?: number
  chargeDirection?: { x: number; y: number }
}

type FlyingSaucer = GameObject & {
  speed: number
  health: number
  direction: number
  bobOffset: number
}

type Projectile = GameObject & {
  vx: number
  vy: number
  damage: number
  piercing?: boolean
  explosive?: boolean
  explosionRadius?: number
  color?: string
  dead?: boolean
  isEnemyProjectile?: boolean
}

type PowerUp = GameObject & {
  type:
    | "doubleYolk"
    | "scrambled"
    | "hardBoiled"
    | "explosive"
    | "golden"
    | "shield"
    | "health"
    | "speedBoost"
    | "charge" 
  lifetime: number
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

type FloatingText = {
  x: number
  y: number
  text: string
  color: string
  life: number
  fontSize: number // Added fontSize
  velocity: { x: number; y: number } // Added velocity
}

type GameState = "menu" | "playing" | "gameOver"

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
      // ─── EARLY GAME (waves 5-35) ───
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
      // ─── LATE GAME (waves 40+) — "THE BIG ONES" ───
      case "theButcher":
        health = 320
        radius = 42
        speed = 1.3
        break
      case "voidReaper":
        health = 380
        radius = 48
        speed = 1.5
        break
      case "plagueBringer":
        health = 420
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
        speed = 0.7
        break
      case "theHive":
        health = 680
        radius = 58
        speed = 1.1
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
      || type === "devourer" ? 0 : undefined,
      buffRadius: type === "queenXenoHen" ? 150 : undefined,
     shootTimer: type === "queenXenoHen" ? 0 : undefined, 
      phase: 1,
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

      // Double-tap detection for charge
      const player = playerRef.current
      const gameRunning = gameStateRef.current === "playing"
      const directionKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]

      if (gameRunning && player 
        && directionKeys.includes(key) 
        && !player.isCharging && player.chargeCooldown <= 0) {
        const now = performance.now()
        const last = lastKeyPressRef.current
        const DOUBLE_TAP_WINDOW = 250 // ms

        if (last.key === key && now - last.time < DOUBLE_TAP_WINDOW) {
          // Double-tap detected! Activate charge in this direction.
          let dirX = 0
          let dirY = 0
          switch (key) {
            case "w":
            case "arrowup":
              dirY = -1
              break
            case "s":
            case "arrowdown":
              dirY = 1
              break
            case "a":
            case "arrowleft":
              dirX = -1
              break
            case "d":
            case "arrowright":
              dirX = 1
              break
          }

          player.isCharging = true
          player.chargeDistance = 0
          player.chargeCooldown = 15000
          player.chargeDirection = { x: dirX, y: dirY }
          player.chargeReady = false
          chargeSound()
          addFloatingText(player.x, player.y - 40, "CHARGE!", "#ff0000", 24)
          addScreenShake(10)

          // Reset last key so it doesn't retrigger
          lastKeyPressRef.current = { key: "", time: 0 }
        } else {
          lastKeyPressRef.current = { key, time: now }
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
        case "alienMouse":
          // The mouse darts around the arena in quick zigzags.
          boss.x += Math.cos(Date.now() / 180) * 3
          boss.y += Math.sin(Date.now() / 240) * 2
          break
        case "alienBumblebee":
          // The bumblebee patrols in a buzzing figure eight.
          boss.x += Math.sin(Date.now() / 500) * 2.5
          boss.y += Math.cos(Date.now() / 700) * 1.5
          break
        case "alienOctopus":
          // The octopus slowly tracks the player like a living trap.
          boss.x += (player.x - boss.x) * 0.002
          boss.y += (player.y - boss.y) * 0.002
          break
        case "alienMantis":
          // The mantis makes sharp lunges toward the chicken.
          if (Math.sin(Date.now() / 900) > 0.7) {
            boss.x += (player.x - boss.x) * 0.018
            boss.y += (player.y - boss.y) * 0.018
          }
          break
        case "abductor":
          // Move to center then hover
          if (boss.y < canvas.height * 0.2) {
            boss.y += boss.speed * 2
          } else {
            // Hover and spawn waves continuously
            boss.x += Math.sin(Date.now() / 1000) * 2
            boss.y += Math.cos(Date.now() / 1500) * 1

            if (boss.spawnTimer !== undefined) {
              boss.spawnTimer += deltaTime
              if (boss.spawnTimer > 3000) {
                // Spawn mini wave of aliens
                for (let i = 0; i < 3; i++) {
                  const angle = (Math.PI * 2 * i) / 3 + Date.now() / 1000
                  enemiesRef.current.push({
                    x: boss.x + Math.cos(angle) * 60,
                    y: boss.y + Math.sin(angle) * 60,
                    radius: 10,
                    speed: 0.8,
                    health: 2,
                    maxHealth: 2,
                    groupId: Date.now(),
                    type: "grunt",
                    alienType: "grunt",
                    color: getAlienColor("grunt"),
                  })
                }
                boss.spawnTimer = 0
              }
            }
          }
          break

             case "queenXenoHen":
          {
            // Find centroid of all mobs (to orbit around them)
            let targetX = player.x
            let targetY = player.y

            if (enemiesRef.current.length > 0) {
              let sumX = 0
              let sumY = 0
              for (const enemy of enemiesRef.current) {
                sumX += enemy.x
                sumY += enemy.y
              }
              targetX = sumX / enemiesRef.current.length
              targetY = sumY / enemiesRef.current.length
            }

            // Orbit around mob group (or player if no mobs)
            const orbitRadius = 180
            const orbitSpeed = Date.now() / 1500
            const orbitX = targetX + Math.cos(orbitSpeed) * orbitRadius
            const orbitY = targetY + Math.sin(orbitSpeed) * orbitRadius

            // Smooth move toward orbit position
            boss.x += (orbitX - boss.x) * 0.03
            boss.y += (orbitY - boss.y) * 0.03

            // Clamp to canvas bounds
            boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
            boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))

            //  HEAL MOBS (every 1s, +2 HP each) 
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            if (boss.spawnTimer > 1000) {
              boss.spawnTimer = 0

              const buffRadius = boss.buffRadius ?? 0
              if (buffRadius > 0) {
                enemiesRef.current.forEach((enemy) => {
                  const dx = enemy.x - boss.x
                  const dy = enemy.y - boss.y
                  const dist = Math.sqrt(dx * dx + dy * dy)

                  if (dist < buffRadius) {
                    // Heal + buff speed
                    if (enemy.health < enemy.maxHealth) {
                      enemy.health = Math.min(enemy.maxHealth, enemy.health + 2)
                    }
                    if (enemy.speed < 1.5) {
                      enemy.speed = Math.min(enemy.speed * 1.01, 1.5)
                    }
                  }
                })

                // Healing pulse visual
                createParticles(boss.x, boss.y, "#28f0ff")
              }
            }
            //  SHOOT 3 PROJECTILES (every 1.5s) 
            if (boss.shootTimer === undefined) boss.shootTimer = 0
            boss.shootTimer += deltaTime

            if (boss.shootTimer > 1500) {
              boss.shootTimer = 0

              const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
              for (let i = -1; i <= 1; i++) {
                const spreadAngle = angleToPlayer + i * 0.2

                projectilesRef.current.push({
                  x: boss.x,
                  y: boss.y,
                  radius: 9,
                  vx: Math.cos(spreadAngle) * 4.5,
                  vy: Math.sin(spreadAngle) * 4.5,
                  damage: 7,
                  color: "#28f0ff",
                  isEnemyProjectile: true,
                })
              }

              playSound(400, 0.15, "triangle")
            }

            //  CONTACT DAMAGE 
            const dxp = player.x - boss.x
            const dyp = player.y - boss.y
            const distp = Math.sqrt(dxp * dxp + dyp * dyp)

            if (distp < player.radius + boss.radius * 0.85) {
              if (player.invincibleTime <= 0 && !player.shield) {
                player.health -= 15
                player.invincibleTime = 60
                chickenHitSound()
                addScreenShake(10)
                addFloatingText(player.x, player.y - 30, "-15", "#ff0000", 18)

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


                            case "devourer":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            const distToPlayer = Math.sqrt(
              (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2
            )

            //  ENRAGE (3 tiers, ordered correctly) ───
            const healthPercent = boss.health / boss.maxHealth
            let enrageMultiplier = 1
            if (healthPercent < 0.33) {
              enrageMultiplier = 1.5     // critical
            } else if (healthPercent < 0.50) {
              enrageMultiplier = 1.30    // medium
            } else if (healthPercent < 0.70) {
              enrageMultiplier = 1.15    // light
            }

            // CHOMP DASH CYCLE (3.8s) 
            const cycleTime = 3800
            const cyclePhase = boss.spawnTimer % cycleTime

            if (cyclePhase < 2000) {
              // Chase
              boss.x += Math.cos(angle) * boss.speed * enrageMultiplier
              boss.y += Math.sin(angle) * boss.speed * enrageMultiplier
            } else if (cyclePhase < 2700) {
              // Windup — lock direction at start
              boss.x += (Math.random() - 0.5) * 4
              boss.y += (Math.random() - 0.5) * 4
              if (cyclePhase < 2050) {
                boss.chargeDirection = { x: Math.cos(angle), y: Math.sin(angle) }
              }
            } else if (cyclePhase < 3300) {
              // Dash — fixed direction
              if (boss.chargeDirection) {
                boss.x += boss.chargeDirection.x * boss.speed * 1.5 * enrageMultiplier
                boss.y += boss.chargeDirection.y * boss.speed * 1.5 * enrageMultiplier
              }
            } else {
              // Recover
              boss.x += Math.cos(angle) * boss.speed * 0.3 * enrageMultiplier
              boss.y += Math.sin(angle) * boss.speed * 0.3 * enrageMultiplier
              if (cyclePhase > 3700) {
                boss.chargeDirection = undefined
              }
            }

            //  CONTACT DAMAGE 
            if (distToPlayer < player.radius + boss.radius * 0.9) {
              if (player.invincibleTime <= 0 && !player.shield) {
                const isDashing = cyclePhase >= 2700 && cyclePhase < 3300
                const damage = isDashing ? 30 : 12

                player.health -= damage
                player.invincibleTime = 60
                chickenHitSound()
                addScreenShake(isDashing ? 15 : 8)
                addFloatingText(player.x, player.y - 30, `-${damage}`, "#ff0000", 20)

                const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                player.x += Math.cos(pushAngle) * 30
                player.y += Math.sin(pushAngle) * 30

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

        //  LATE GAME BOSSES 

        case "theButcher":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            const phase = Math.floor(boss.spawnTimer / 1800) % 2

            if (phase === 0) {
              boss.x += Math.cos(angle) * boss.speed * 0.5
              boss.y += Math.sin(angle) * boss.speed * 0.5
            } else {
              boss.x += Math.cos(angle) * boss.speed * 3
              boss.y += Math.sin(angle) * boss.speed * 3
            }
          }
          break

        case "voidReaper":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            if (boss.spawnTimer > 2500) {
              const angle = Math.atan2(boss.y - player.y, boss.x - player.x)
              boss.x = player.x + Math.cos(angle) * 250
              boss.y = player.y + Math.sin(angle) * 250
              boss.spawnTimer = 0
            } else {
              const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
              boss.x += Math.cos(angle) * boss.speed * 0.6
              boss.y += Math.sin(angle) * boss.speed * 0.6
            }
          }
          break

        case "plagueBringer":
          {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            boss.x += Math.cos(angle) * boss.speed * 0.7
            boss.y += Math.sin(angle) * boss.speed * 0.7
          }
          break

        case "ironTyrant":
          {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            boss.x += Math.cos(angle) * boss.speed
            boss.y += Math.sin(angle) * boss.speed
          }
          break

        case "voidLeviathan":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            const dashActive = Math.sin(boss.spawnTimer / 2000) > 0.7

            if (dashActive) {
              boss.x += Math.cos(angle) * boss.speed * 4
              boss.y += Math.sin(angle) * boss.speed * 4
            } else {
              boss.x += Math.cos(angle) * boss.speed * 0.5
              boss.y += Math.sin(angle) * boss.speed * 0.5
            }
          }
          break

        case "theHive":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            boss.x += Math.cos(angle) * boss.speed * 0.4
            boss.y += Math.sin(angle) * boss.speed * 0.4

            if (boss.spawnTimer > 2500) {
              for (let i = 0; i < 2; i++) {
                const a = Math.random() * Math.PI * 2
                enemiesRef.current.push({
                  x: boss.x + Math.cos(a) * boss.radius,
                  y: boss.y + Math.sin(a) * boss.radius,
                  radius: 9,
                  speed: 0.9,
                  health: 2,
                  maxHealth: 2,
                  groupId: Date.now(),
                  type: "grunt",
                  alienType: "grunt",
                  color: getAlienColor("grunt"),
                })
              }
              boss.spawnTimer = 0
            }
          }
          break

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
                contactDamage = 20
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
          return false // projectile consumed
        }

        return true // keep flying
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
          boss.health -= proj.damage
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
                   case "charge":
            if (player.chargeCooldown <= 0) {
              player.chargeReady = true // store charge, wait for direction
              addFloatingText(player.x, player.y - 40, "CHARGE READY!", "#ff4400", 22)
            }
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
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const pulse = 1 + Math.sin(t / 180) * 0.03
        const tailWave = Math.sin(t / 145)
        const earWave = Math.sin(t / 260) * 0.06
        const eyeGlow = 14 + Math.sin(t / 110) * 7
        const bodyBob = Math.sin(t / 220) * 2

        // Angle to player 
        let lookDir = 0
        if (angleToPlayer > -Math.PI / 2 && angleToPlayer < Math.PI / 2) {
          // Player is to the right
          lookDir = 1
        } else {
          // Player is to the left
          lookDir = -1
        }

        // Head shifts slightly in the look direction (not rotates)
        const headShift = lookDir * r * 0.08
        const headTilt = lookDir * 0.08  // very subtle tilt

        // Pupil offset — stronger than head tilt
        const pupilShiftX = lookDir * r * 0.06
        const pupilShiftY = 0

      
        // COSMIC AURA
     
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const aura = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 1.70)
        aura.addColorStop(0, "rgba(149, 18, 205, 0.65)")
        aura.addColorStop(0.55, "rgba(175, 91, 254, 0.69)")
        aura.addColorStop(1, "rgba(169, 85, 247, 0.79)")
        ctx.fillStyle = aura
        ctx.beginPath()
        ctx.arc(bx, by, r * 1.70, 0, Math.PI * 2)
        ctx.fill()
        for (let i = 0; i < 6; i++) {
          const angle = t / 700 + i * Math.PI / 3
          const orbit = r * (1.20 + Math.sin(t / 250 + i) * 0.08)
          const px = bx + Math.cos(angle) * orbit
          const py = by + Math.sin(angle) * orbit * 0.7
          ctx.fillStyle = i % 2 === 0 ? "#e879f9" : "#818cf8"
          ctx.globalAlpha = 0.55 + Math.sin(t / 100 + i) * 0.3
          ctx.beginPath()
          ctx.arc(px, py, r * 0.035, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.restore()

 
        // TAIL
      
        const tailStartX = bx - r * 0.75
        const tailStartY = by + r * 0.35

        const tailPoints = []
        for (let i = 0; i <= 12; i++) {
          const p = i / 12
          const x = tailStartX - p * r * 1.5
          const y = tailStartY + Math.sin(p * Math.PI * 2 + tailWave) * r * 0.35 + p * r * 0.15
          tailPoints.push({ x, y })
        }

        ctx.beginPath()
        tailPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.strokeStyle = "#124d90"
        ctx.lineWidth = r * 0.24
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.stroke()

        const tailGrad = ctx.createLinearGradient(tailStartX, 0, tailStartX - r * 1.5, 0)
        tailGrad.addColorStop(0, "#a78bfa")
        tailGrad.addColorStop(0.5, "#7c3aed")
        tailGrad.addColorStop(1, "#4c1d95")
        ctx.beginPath()
        tailPoints.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.strokeStyle = tailGrad
        ctx.lineWidth = r * 0.14
        ctx.stroke()

        const tailTip = tailPoints[tailPoints.length - 1]
        ctx.shadowColor = "#e879f9"
        ctx.shadowBlur = 18
        ctx.fillStyle = "#f0abfc"
        ctx.beginPath()
        ctx.arc(tailTip.x, tailTip.y, r * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0


        // BODY
 
        ctx.save()
        ctx.translate(0, bodyBob)

        ctx.fillStyle = "#1e0838"
        ctx.beginPath()
        ctx.ellipse(bx, by + r * 0.6, r * 0.95, r * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()

        const bodyGrad = ctx.createRadialGradient(
          bx - r * 0.3, by, r * 0.1,
          bx, by + r * 0.15, r * 1.2
        )
        bodyGrad.addColorStop(0, "#ddd6fe")
        bodyGrad.addColorStop(0.4, "#a78bfa")
        bodyGrad.addColorStop(0.75, "#7c3aed")
        bodyGrad.addColorStop(1, "#4c1d95")

        ctx.fillStyle = bodyGrad
        ctx.strokeStyle = "#2e1065"
        ctx.lineWidth = r * 0.065

        ctx.beginPath()
        ctx.ellipse(bx, by + r * 0.15, r * 0.95, r * 0.62, -0.08, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = "#6d28d9"
        ctx.strokeStyle = "#a78bfa"
        ctx.lineWidth = r * 0.02

        for (let i = 0; i < 3; i++) {
          const px = bx - r * 0.4 + i * r * 0.35
          const py = by - r * 0.35 + i * r * 0.04

          ctx.beginPath()
          ctx.moveTo(px - r * 0.12, py)
          ctx.lineTo(px, py - r * 0.12)
          ctx.lineTo(px + r * 0.12, py)
          ctx.lineTo(px, py + r * 0.08)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        ctx.strokeStyle = "#f0abfc"
        ctx.shadowColor = "#e879f9"
        ctx.shadowBlur = 8
        ctx.lineWidth = r * 0.02
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(bx - r * 0.5, by + r * 0.15)
        ctx.lineTo(bx - r * 0.15, by + r * 0.1)
        ctx.moveTo(bx + r * 0.1, by + r * 0.3)
        ctx.lineTo(bx + r * 0.45, by + r * 0.25)
        ctx.stroke()
        ctx.restore()

        ctx.restore() // body bob

        // LEGS - hovering (don't touch ground)
        ctx.lineCap = "round"

        for (let i = 0; i < 4; i++) {
          const side = i < 2 ? -1 : 1
          const idx = i % 2
          const baseX = bx + side * (r * 0.3 + idx * r * 0.35)
          const baseY = by + r * 0.5

          const hover = Math.sin(t / 200 + i * 0.8) * r * 0.08
          const length = r * 0.35

          // Leg (short, doesn't reach ground)
          ctx.strokeStyle = "#7c3aed"
          ctx.lineWidth = r * 0.09
          ctx.beginPath()
          ctx.moveTo(baseX, baseY)
          ctx.lineTo(baseX + side * r * 0.1, baseY + length + hover)
          ctx.stroke()

          // Anti-gravity ring under leg
          ctx.strokeStyle = "rgba(232, 121, 249, 0.6)"
          ctx.lineWidth = r * 0.03
          const ringY = baseY + length + hover + r * 0.15
          const ringScale = 1 + Math.sin(t / 150 + i) * 0.2
          ctx.beginPath()
          ctx.ellipse(baseX + side * r * 0.1, ringY, r * 0.12 * ringScale, r * 0.04 * ringScale, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.lineCap = "butt"

        // HEAD 
      
        const headBaseY = by - r * 0.55 + bodyBob

        // Subtle tilt of head only (rotate around head center)
        ctx.save()
        ctx.translate(bx, headBaseY)
        ctx.rotate(headTilt)
        ctx.translate(-bx, -headBaseY)

        // Ears (in head space, so they tilt with head)
        for (const side of [-1, 1]) {
          ctx.save()
          ctx.translate(bx + side * r * 0.45, headBaseY - r * 0.35)
          ctx.rotate(side * earWave)

          ctx.fillStyle = "#3b0764"
          ctx.strokeStyle = "#6d28d9"
          ctx.lineWidth = r * 0.04
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = "#ec4899"
          ctx.beginPath()
          ctx.arc(side * r * 0.05, 0, r * 0.28, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = "#f0abfc"
          ctx.lineWidth = r * 0.02
          ctx.beginPath()
          ctx.arc(side * r * 0.05, -r * 0.05, r * 0.2, 0, Math.PI * 2)
          ctx.stroke()

          ctx.restore()
        }

        // Head shape (with pulse + slight shift)
        const headCenterX = bx + headShift
        const headCenterY = headBaseY

        ctx.save()
        ctx.translate(headCenterX, headCenterY)
        ctx.scale(pulse, pulse)
        ctx.translate(-headCenterX, -headCenterY)

        ctx.fillStyle = "#1e0838"
        ctx.beginPath()
        ctx.ellipse(headCenterX, headCenterY + r * 0.05, r * 0.6, r * 0.58, 0, 0, Math.PI * 2)
        ctx.fill()

        const headGrad = ctx.createRadialGradient(
          headCenterX - r * 0.2, headCenterY - r * 0.2, r * 0.05,
          headCenterX, headCenterY, r * 0.7
        )
        headGrad.addColorStop(0, "#ddd6fe")
        headGrad.addColorStop(0.4, "#a78bfa")
        headGrad.addColorStop(0.75, "#7c3aed")
        headGrad.addColorStop(1, "#4c1d95")

        ctx.fillStyle = headGrad
        ctx.strokeStyle = "#2e1065"
        ctx.lineWidth = r * 0.05

        ctx.beginPath()
        ctx.ellipse(headCenterX, headCenterY, r * 0.62, r * 0.58, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        
           // Snout (points down)
        ctx.fillStyle = "#c4b5fd"
        ctx.beginPath()
        ctx.ellipse(headCenterX, headCenterY + r * 0.42, r * 0.32, r * 0.28, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()



        
             // Nose (small, at bottom of snout, center)
        ctx.fillStyle = "#f472b6"
        ctx.beginPath()
        ctx.ellipse(headCenterX, headCenterY + r * 0.62, r * 0.08, r * 0.06, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#831843"
        ctx.lineWidth = r * 0.015
        ctx.stroke()
        // LEFT EYE socket
        ctx.fillStyle = "#170524"
        ctx.beginPath()
        ctx.ellipse(headCenterX - r * 0.15, headCenterY - r * 0.05, r * 0.14, r * 0.17, -0.1, 0, Math.PI * 2)
        ctx.fill()

        // LEFT EYE pupil (moves toward player)
        ctx.shadowColor = "#ff00cc"
        ctx.shadowBlur = eyeGlow
        ctx.fillStyle = "#ff006e"
        ctx.beginPath()
        ctx.arc(headCenterX - r * 0.15 + pupilShiftX, headCenterY - r * 0.05 + pupilShiftY, r * 0.08, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

               // LEFT EYE socket
        ctx.fillStyle = "#170524"
        ctx.beginPath()
        ctx.ellipse(headCenterX - r * 0.22, headCenterY - r * 0.1, r * 0.14, r * 0.17, -0.1, 0, Math.PI * 2)
        ctx.fill()


        // RIGHT EYE socket
        ctx.fillStyle = "#170524"
        ctx.beginPath()
        ctx.ellipse(headCenterX + r * 0.22, headCenterY - r * 0.1, r * 0.14, r * 0.17, 0.1, 0, Math.PI * 2)
        ctx.fill()

        // RIGHT EYE pupil (moves toward player)
        ctx.shadowColor = "#ff00cc"
        ctx.shadowBlur = eyeGlow
        ctx.fillStyle = "#ff006e"
        ctx.beginPath()
        ctx.arc(headCenterX + r * 0.15 + pupilShiftX, headCenterY - r * 0.05 + pupilShiftY, r * 0.08, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // RIGHT EYE shine
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(headCenterX + r * 0.17 + pupilShiftX, headCenterY - r * 0.08 + pupilShiftY, r * 0.03, 0, Math.PI * 2)
        ctx.fill()

           // WHISKERS (from sides of snout, curving outward)
        const whiskerWave = Math.sin(t / 180) * r * 0.04
        ctx.lineCap = "round"

        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const startX = headCenterX + side * r * 0.22
            const startY = headCenterY + r * (0.35 + i * 0.08)
            const endX = headCenterX + side * r * (1.05 + (i % 2) * 0.1)
            const endY = startY + (i - 1) * r * 0.18 + whiskerWave * side

            ctx.strokeStyle = i === 1 ? "#e879f9" : "#c4b5fd"
            ctx.lineWidth = r * (i === 1 ? 0.018 : 0.013)

            ctx.beginPath()
            ctx.moveTo(startX, startY)
            ctx.quadraticCurveTo(
              headCenterX + side * r * 0.7,
              startY + (i - 1) * r * 0.1,
              endX,
              endY
            )
            ctx.stroke()
          }
        }
        ctx.lineCap = "butt"



        // MOUTH 
        ctx.fillStyle = "#10051b"
        ctx.beginPath()
        ctx.ellipse(headCenterX, headCenterY + r * 0.74, r * 0.12, r * 0.06, 0, 0, Math.PI * 2)
        ctx.fill()

        // Fangs (2 small, at top of mouth)
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.moveTo(headCenterX - r * 0.08, headCenterY + r * 0.7)
        ctx.lineTo(headCenterX - r * 0.05, headCenterY + r * 0.8)
        ctx.lineTo(headCenterX - r * 0.02, headCenterY + r * 0.7)
        ctx.closePath()
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(headCenterX + r * 0.08, headCenterY + r * 0.7)
        ctx.lineTo(headCenterX + r * 0.05, headCenterY + r * 0.8)
        ctx.lineTo(headCenterX + r * 0.02, headCenterY + r * 0.7)
        ctx.closePath()
        ctx.fill()
        ctx.restore() // head scale

        ctx.restore() // head tilt
      
      

        // boss Alien Bumblebee

      } else if (boss.type === "alienBumblebee") {
        const t = bossTime
        const r = boss.radius
        const wingFlap = Math.sin(t / 24)
        const bodyBob = Math.sin(t / 220) * r * 0.025
        const legTwitch = Math.sin(t / 75) * r * 0.025
        const cx = boss.x
        const cy = boss.y + bodyBob

        ctx.save()

        
        //  WINGS 
       
        const drawWing = (side: number, outer: boolean) => {
          ctx.save()

          const wingX = cx + side * r * (outer ? 0.43 : 0.29)
          const wingY = cy - r * 0.36
          const wingLength = r * (outer ? 0.82 : 0.59)
          const wingHeight = r * (outer ? 0.34 : 0.25)
          const flap = wingFlap * (outer ? 0.25 : 0.19)

          ctx.translate(wingX, wingY)
          ctx.rotate(side * (outer ? 0.62 : 0.48) - side * flap)

          ctx.fillStyle = outer
            ? "rgba(186, 230, 253, 0.48)"
            : "rgba(224, 242, 254, 0.30)"

          ctx.beginPath()
          ctx.ellipse(
            side * wingLength * 0.35,
            -r * 0.04,
            wingLength,
            wingHeight,
            side * 0.12,
            0,
            Math.PI * 2
          )
          ctx.fill()

          ctx.strokeStyle = "rgba(147, 197, 253, 0.72)"
          ctx.lineWidth = Math.max(1, r * 0.012)
          ctx.stroke()

          // A few clean wing veins
          ctx.strokeStyle = "rgba(96, 165, 250, 0.58)"
          ctx.lineWidth = Math.max(0.8, r * 0.009)

          for (let i = 0; i < 3; i++) {
            const startX = side * wingLength * 0.08
            const endX = side * wingLength * (0.38 + i * 0.22)

            ctx.beginPath()
            ctx.moveTo(startX, 0)
            ctx.quadraticCurveTo(
              endX * 0.45,
              -wingHeight * 0.9,
              endX,
              wingHeight * (i - 1) * 0.48
            )
            ctx.stroke()
          }

          ctx.restore()
        }

        // Rear wings first, then the larger front pair
        drawWing(-1, false)
        drawWing(1, false)
        drawWing(-1, true)
        drawWing(1, true)

       
        //  SEGMENTED LEGS
  
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        for (let i = 0; i < 3; i++) {
          const legY = cy + r * (0.20 + i * 0.19)
          const spread = r * (0.66 + i * 0.12)
          const twitch = legTwitch * (i + 1) * 0.45

          for (const side of [-1, 1]) {
            ctx.strokeStyle = "#38200b"
            ctx.lineWidth = Math.max(2, r * 0.055)

            ctx.beginPath()
            ctx.moveTo(cx + side * r * 0.43, legY)
            ctx.quadraticCurveTo(
              cx + side * r * 0.65,
              legY + r * 0.08,
              cx + side * spread + twitch,
              legY + r * 0.25
            )
            ctx.lineTo(
              cx + side * (spread + r * 0.09) + twitch,
              legY + r * 0.39
            )
            ctx.stroke()

            // Small golden joint
            ctx.fillStyle = "#d6a329"
            ctx.beginPath()
            ctx.arc(
              cx + side * spread + twitch,
              legY + r * 0.25,
              r * 0.035,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }
        }

        ctx.lineCap = "butt"

       
        // LONGER STINGER
      
        const stingerY = cy + r * 0.69

        ctx.fillStyle = "#38200b"
        ctx.beginPath()
        ctx.moveTo(cx - r * 0.105, stingerY)
        ctx.quadraticCurveTo(
          cx,
          stingerY + r * 0.04,
          cx + r * 0.105,
          stingerY
        )
        ctx.lineTo(cx, stingerY + r * 0.55)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = "#a16207"
        ctx.beginPath()
        ctx.moveTo(cx - r * 0.035, stingerY + r * 0.10)
        ctx.lineTo(cx, stingerY + r * 0.48)
        ctx.lineTo(cx + r * 0.035, stingerY + r * 0.10)
        ctx.closePath()
        ctx.fill()

        // One small venom drop, without a costly glow
        const dropOffset = (t / 100) % 14

        ctx.fillStyle = "#84cc16"
        ctx.beginPath()
        ctx.arc(
          cx,
          stingerY + r * 0.55 + dropOffset,
          r * 0.035,
          0,
          Math.PI * 2
        )
        ctx.fill()

        
        //  FUZZY, GOLDEN ABDOMEN
        
        // Soft ground shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)"
        ctx.beginPath()
        ctx.ellipse(
          cx,
          cy + r * 0.89,
          r * 0.73,
          r * 0.12,
          0,
          0,
          Math.PI * 2
        )
        ctx.fill()

        const bodyGrad = ctx.createRadialGradient(
          cx - r * 0.32,
          cy - r * 0.35,
          r * 0.08,
          cx,
          cy,
          r * 1.12
        )

        bodyGrad.addColorStop(0, "#fff9cf")
        bodyGrad.addColorStop(0.35, "#facc15")
        bodyGrad.addColorStop(0.75, "#eab308")
        bodyGrad.addColorStop(1, "#92400e")

        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        ctx.ellipse(
          cx,
          cy,
          r * 0.91,
          r * 0.73,
          0,
          0,
          Math.PI * 2
        )
        ctx.fill()

        // Three HORIZONTAL black bands (real bee style), clipped to abdomen
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(
          cx,
          cy,
          r * 0.91,
          r * 0.73,
          0,
          0,
          Math.PI * 2
        )
        ctx.clip()

        ctx.fillStyle = "#1a120a"

        // 3 horizontal stripes, thicker
        for (let i = -1; i <= 1; i++) {
          const stripeY = cy + i * r * 0.32

          ctx.beginPath()
          ctx.ellipse(
            cx,
            stripeY,
            r * 1.0,
            r * 0.14,
            0,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }

        ctx.restore()

        // Abdomen outline
        ctx.strokeStyle = "#8a5b16"
        ctx.lineWidth = Math.max(1.5, r * 0.025)
        ctx.beginPath()
        ctx.ellipse(
          cx,
          cy,
          r * 0.91,
          r * 0.73,
          0,
          0,
          Math.PI * 2
        )
        ctx.stroke()

        // Fuzzy highlight
        ctx.fillStyle = "rgba(255, 255, 210, 0.32)"
        ctx.beginPath()
        ctx.ellipse(
          cx - r * 0.31,
          cy - r * 0.30,
          r * 0.29,
          r * 0.17,
          -0.4,
          0,
          Math.PI * 2
        )
        ctx.fill()

        
        //  HEAD
       
        const headY = cy - r * 0.70
        const headR = r * 0.48

        const headGrad = ctx.createRadialGradient(
          cx - headR * 0.32,
          headY - headR * 0.38,
          headR * 0.04,
          cx,
          headY,
          headR * 1.2
        )

        headGrad.addColorStop(0, "#4b4538")
        headGrad.addColorStop(0.55, "#24211d")
        headGrad.addColorStop(1, "#090909")

        ctx.fillStyle = headGrad
        ctx.beginPath()
        ctx.arc(cx, headY, headR, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = "#100d0a"
        ctx.lineWidth = Math.max(1.5, r * 0.025)
        ctx.stroke()

        // Subtle fuzz around the head
        ctx.strokeStyle = "rgba(220, 190, 125, 0.48)"
        ctx.lineWidth = Math.max(0.8, r * 0.009)

        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          const x = cx + Math.cos(a) * headR * 0.93
          const y = headY + Math.sin(a) * headR * 0.93

          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(
            x + Math.cos(a) * r * 0.045,
            y + Math.sin(a) * r * 0.045
          )
          ctx.stroke()
        }

        
        // COMPOUND EYES (with subtle glow)
        
        for (const side of [-1, 1]) {
          const eyeX = cx + side * r * 0.255
          const eyeY = headY - r * 0.015
          const eyeRX = r * 0.17
          const eyeRY = r * 0.205

          const eyeGrad = ctx.createRadialGradient(
            eyeX - eyeRX * 0.35,
            eyeY - eyeRY * 0.38,
            r * 0.01,
            eyeX,
            eyeY,
            eyeRY * 1.3
          )

          eyeGrad.addColorStop(0, "#ff9999")
          eyeGrad.addColorStop(0.32, "#ef4444")
          eyeGrad.addColorStop(0.72, "#b91c1c")
          eyeGrad.addColorStop(1, "#450a0a")

          // Glow (only 1 shadowBlur for all eyes)
          ctx.save()
          ctx.shadowColor = "#ff2222"
          ctx.shadowBlur = r * 0.12

          ctx.fillStyle = eyeGrad
          ctx.beginPath()
          ctx.ellipse(
            eyeX,
            eyeY,
            eyeRX,
            eyeRY,
            side * 0.10,
            0,
            Math.PI * 2
          )
          ctx.fill()
          ctx.restore()

          ctx.strokeStyle = "#450a0a"
          ctx.lineWidth = Math.max(1, r * 0.018)
          ctx.stroke()

          // Sparse facets 
          ctx.strokeStyle = "rgba(255, 220, 220, 0.55)"
          ctx.lineWidth = Math.max(0.7, r * 0.008)

          for (let i = -1; i <= 1; i++) {
            ctx.beginPath()
            ctx.arc(
              eyeX + i * eyeRX * 0.45,
              eyeY,
              r * 0.025,
              0,
              Math.PI * 2
            )
            ctx.stroke()
          }

          // Small natural reflection
          ctx.fillStyle = "#fff1f2"
          ctx.beginPath()
          ctx.arc(
            eyeX - side * r * 0.045,
            eyeY - r * 0.075,
            r * 0.028,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }

        
        // MANDIBLES 

        for (const side of [-1, 1]) {
          ctx.fillStyle = "#342016"
          ctx.strokeStyle = "#0c0805"
          ctx.lineWidth = Math.max(0.8, r * 0.012)

          ctx.beginPath()
          ctx.moveTo(cx + side * r * 0.08, headY + r * 0.35)
          ctx.lineTo(cx + side * r * 0.14, headY + r * 0.42)
          ctx.lineTo(cx + side * r * 0.10, headY + r * 0.44)
          ctx.lineTo(cx + side * r * 0.06, headY + r * 0.40)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        
        // ANTENNAE 
        
        const antTwitch = Math.sin(t / 150) * r * 0.035

        ctx.strokeStyle = "#21170f"
        ctx.lineWidth = Math.max(2, r * 0.045)
        ctx.lineCap = "round"

        for (const side of [-1, 1]) {
          const startX = cx + side * r * 0.19
          const startY = headY - headR * 0.72
          const tipX = cx + side * r * 0.48 + antTwitch * side
          const tipY = headY - r * 0.95

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.quadraticCurveTo(
            cx + side * r * 0.35,
            headY - r * 0.78,
            tipX,
            tipY
          )
          ctx.stroke()

          ctx.fillStyle = "#facc15"
          ctx.beginPath()
          ctx.arc(tipX, tipY, r * 0.075, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = "#a16207"
          ctx.lineWidth = Math.max(1, r * 0.018)
          ctx.stroke()

          ctx.strokeStyle = "#21170f"
          ctx.lineWidth = Math.max(2, r * 0.045)
        }

        ctx.lineCap = "butt"
        ctx.restore()
      
      
      

// boss Alien Octopus
      
} else if (boss.type === "alienOctopus") {
  const r = boss.radius
  const time = bossTime / 300
  const pulse = 1 + Math.sin(time * 0.8) * 0.025
  const sway = Math.sin(time) * 0.08

  ctx.save()


  //  AURA

  const aura = ctx.createRadialGradient(
    boss.x, boss.y, r * 0.3,
    boss.x, boss.y + r * 0.3, r * 1.8
  )
  aura.addColorStop(0, "rgba(89, 28, 135, 0.54)")
  aura.addColorStop(0.6, "rgba(157, 23, 77, 0.47)")
  aura.addColorStop(1, "rgba(30, 5, 40, 0)")

  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(boss.x, boss.y, r * 1.8, 0, Math.PI * 2)
  ctx.fill()

 
  // TENTACLES

  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1
    const index = i < 4 ? i : i - 4
    const spread = (index - 1.5) / 1.5

    const baseX = boss.x + side * r * (0.12 + index * 0.13)
    const baseY = boss.y + r * 0.48

    const length = r * (1.05 + (3 - index) * 0.13)
    const phase = time * 1.4 + i * 1.15

    const wave = Math.sin(phase) * r * 0.24
    const wave2 = Math.sin(phase * 0.7 + 1) * r * 0.12

    const endX = baseX + side * r * (0.25 + index * 0.10) + wave
    const endY = baseY + length

    const c1x = baseX + side * r * 0.12 + wave2
    const c1y = baseY + length * 0.35

    const c2x = endX - side * r * 0.18 + wave
    const c2y = baseY + length * 0.72

    // Cubic bezier sampler
  const pointAt = (t: number) => {
      const mt = 1 - t
      return {
        x: mt * mt * mt * baseX +
          3 * mt * mt * t * c1x +
          3 * mt * t * t * c2x +
          t * t * t * endX,
        y: mt * mt * mt * baseY +
          3 * mt * mt * t * c1y +
          3 * mt * t * t * c2y +
          t * t * t * endY
      }
    }

    // Draw a genuinely tapered tentacle from short segments
  const segments = 12


    for (let j = 0; j < segments; j++) {
      const t0 = j / segments
      const t1 = (j + 1) / segments
      const p0 = pointAt(t0)
      const p1 = pointAt(t1)

      const width0 = r * (0.19 * (1 - t0) + 0.025)
      const width1 = r * (0.19 * (1 - t1) + 0.025)

      // Dark armored outline
      ctx.strokeStyle = "#300b40"
      ctx.lineWidth = width0 + r * 0.055
      ctx.lineCap = "round"

      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()

      // Main tentacle gradient
  ctx.strokeStyle = "#a01860" 
ctx.lineWidth = (width0 + width1) / 2
ctx.beginPath()
ctx.moveTo(p0.x, p0.y)
ctx.lineTo(p1.x, p1.y)
ctx.stroke()

      // Thin bioluminescent ridge
      ctx.strokeStyle = "rgba(249, 168, 212, 0.65)"
      ctx.lineWidth = Math.max(r * 0.012, width0 * 0.12)
      ctx.beginPath()
      ctx.moveTo(p0.x - r * 0.025, p0.y)
      ctx.lineTo(p1.x - r * 0.025, p1.y)
      ctx.stroke()
    }

    // Suction cups along the inner side
   for (let s = 0; s < 3; s++) {
  const t = 0.28 + s * 0.18
      const p = pointAt(t)
      const cupR = r * (0.052 * (1 - t * 0.45))

      // Cup shadow
      ctx.fillStyle = "#4a103d"
      ctx.beginPath()
      ctx.arc(p.x, p.y, cupR * 1.3, 0, Math.PI * 2)
      ctx.fill()

      // Pink outer ring
      ctx.fillStyle = "#f9a8d4"
      ctx.beginPath()
      ctx.arc(p.x, p.y, cupR, 0, Math.PI * 2)
      ctx.fill()

      // Dark center
      ctx.fillStyle = "#8b1c63"
      ctx.beginPath()
      ctx.arc(p.x, p.y, cupR * 0.52, 0, Math.PI * 2)
      ctx.fill()

      // Small wet highlight
      ctx.fillStyle = "#fff1f7"
      ctx.beginPath()
      ctx.arc(
        p.x - cupR * 0.2,
        p.y - cupR * 0.25,
        cupR * 0.18,
        0, Math.PI * 2
      )
      ctx.fill()
    }

    // Sharp tip
    const tip = pointAt(1)
    ctx.fillStyle = "#f472b6"
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, r * 0.032, 0, Math.PI * 2)
    ctx.fill()
  }


  // HEAD SHADOW
 
  ctx.fillStyle = "rgba(12, 3, 25, 0.5)"
  ctx.beginPath()
  ctx.ellipse(
    boss.x, boss.y + r * 0.2,
    r * 0.92, r * 1.03, 0, 0, Math.PI * 2
  )
  ctx.fill()


  // 4. MANTLE - DISTINCT OCTOPUS HEAD
 

  ctx.save()
  ctx.translate(boss.x, boss.y - r * 0.13)
  ctx.scale(0.88 * pulse, 1.04 * pulse)

  const headGrad = ctx.createRadialGradient(
    -r * 0.25, -r * 0.48, r * 0.08,
    0, 0, r * 1.2
  )
  headGrad.addColorStop(0, "#fbcfe8")
  headGrad.addColorStop(0.22, "#f472b6")
  headGrad.addColorStop(0.52, "#c02678")
  headGrad.addColorStop(0.78, "#831843")
  headGrad.addColorStop(1, "#310b40")

  // Outer mantle
  ctx.fillStyle = "#310b40"
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.08)
  ctx.bezierCurveTo(
    r * 0.55, -r * 1.03,
    r * 0.94, -r * 0.55,
    r * 0.91, -r * 0.06
  )
  ctx.bezierCurveTo(
    r * 0.91, r * 0.40,
    r * 0.54, r * 0.72,
    r * 0.26, r * 0.77
  )
  ctx.lineTo(-r * 0.26, r * 0.77)
  ctx.bezierCurveTo(
    -r * 0.54, r * 0.72,
    -r * 0.91, r * 0.40,
    -r * 0.91, -r * 0.06
  )
  ctx.bezierCurveTo(
    -r * 0.94, -r * 0.55,
    -r * 0.55, -r * 1.03,
    0, -r * 1.08
  )
  ctx.closePath()
  ctx.fill()

  // Main skin
  ctx.fillStyle = headGrad
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.02)
  ctx.bezierCurveTo(
    r * 0.50, -r * 0.99,
    r * 0.84, -r * 0.53,
    r * 0.82, -r * 0.10
  )
  ctx.bezierCurveTo(
    r * 0.82, r * 0.35,
    r * 0.48, r * 0.66,
    r * 0.23, r * 0.69
  )
  ctx.lineTo(-r * 0.23, r * 0.69)
  ctx.bezierCurveTo(
    -r * 0.48, r * 0.66,
    -r * 0.82, r * 0.35,
    -r * 0.82, -r * 0.10
  )
  ctx.bezierCurveTo(
    -r * 0.84, -r * 0.53,
    -r * 0.50, -r * 0.99,
    0, -r * 1.02
  )
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "#5b123e"
  ctx.lineWidth = r * 0.035
  ctx.stroke()

  // Crown ridge
  ctx.strokeStyle = "rgba(255, 210, 240, 0.55)"
  ctx.lineWidth = r * 0.025
  ctx.beginPath()
  ctx.moveTo(-r * 0.32, -r * 0.66)
  ctx.quadraticCurveTo(0, -r * 0.91, r * 0.32, -r * 0.66)
  ctx.stroke()

  // Organic skin markings
 for (let i = 0; i < 6; i++) {
    const a = i * 2.399
    const dist = r * (0.22 + (i % 4) * 0.105)
    const x = Math.cos(a) * dist * 0.76
    const y = Math.sin(a) * dist * 0.76 - r * 0.12

    ctx.fillStyle = i % 3 === 0
      ? "rgba(255, 190, 230, 0.65)"
      : "rgba(75, 8, 54, 0.35)"

    ctx.beginPath()
    ctx.ellipse(
      x, y,
      r * 0.035, r * 0.052,
      a, 0, Math.PI * 2
    )
    ctx.fill()
  }

  ctx.restore()


  //  EYE SOCKETS

  for (const side of [-1, 1]) {
    const ex = boss.x + side * r * 0.40
    const ey = boss.y - r * 0.20

    // Raised socket
    const socketGrad = ctx.createRadialGradient(
      ex - side * r * 0.04, ey - r * 0.06, r * 0.02,
      ex, ey, r * 0.31
    )
    socketGrad.addColorStop(0, "#fbcfe8")
    socketGrad.addColorStop(0.7, "#be185d")
    socketGrad.addColorStop(1, "#500b40")

    ctx.fillStyle = socketGrad
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.30, r * 0.34, side * 0.12, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = "#4a103d"
    ctx.lineWidth = r * 0.045
    ctx.stroke()

    // Dark eye
    ctx.fillStyle = "#17051f"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.225, r * 0.245, 0, 0, Math.PI * 2)
    ctx.fill()

    // Golden iris glow
    ctx.save()
    ctx.shadowColor = "#facc15"
    ctx.shadowBlur = r * (0.18 + Math.sin(time * 2) * 0.025)

    const iris = ctx.createRadialGradient(
      ex - r * 0.035, ey - r * 0.045, r * 0.01,
      ex, ey, r * 0.19
    )
    iris.addColorStop(0, "#fff7ae")
    iris.addColorStop(0.35, "#facc15")
    iris.addColorStop(0.75, "#ca8a04")
    iris.addColorStop(1, "#713f12")

    ctx.fillStyle = iris
    ctx.beginPath()
    ctx.arc(ex, ey, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Predator slit
    ctx.fillStyle = "#16051b"
    ctx.beginPath()
    ctx.ellipse(ex, ey, r * 0.038, r * 0.135, 0, 0, Math.PI * 2)
    ctx.fill()

    // Reflection
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(
      ex - side * r * 0.065,
      ey - r * 0.075,
      r * 0.035, 0, Math.PI * 2
    )
    ctx.fill()
  }


  // 6. HEAVY BROW RIDGES
  
    for (const side of [-1, 1]) {
    ctx.lineCap = "round"

    ctx.strokeStyle = "#500b40"
    ctx.lineWidth = r * 0.12
    ctx.beginPath()
    ctx.moveTo(boss.x + side * r * 0.12, boss.y - r * 0.51)
    ctx.quadraticCurveTo(
      boss.x + side * r * 0.38,
      boss.y - r * 0.63,
      boss.x + side * r * 0.65,
      boss.y - r * 0.43
    )
    ctx.stroke()

    ctx.strokeStyle = "#f9a8d4"
    ctx.lineWidth = r * 0.023
    ctx.beginPath()
    ctx.moveTo(boss.x + side * r * 0.20, boss.y - r * 0.51)
    ctx.quadraticCurveTo(
      boss.x + side * r * 0.42,
      boss.y - r * 0.57,
      boss.x + side * r * 0.58,
      boss.y - r * 0.44
    )
    ctx.stroke()
  }

  ctx.lineCap = "butt"

  
  // BEAK 
 
  const beakY = boss.y + r * 0.29

  const beakGrad = ctx.createLinearGradient(
    boss.x - r * 0.12, beakY,
    boss.x + r * 0.12, beakY + r * 0.35
  )
  beakGrad.addColorStop(0, "#a78bfa")
  beakGrad.addColorStop(0.35, "#3b0764")
  beakGrad.addColorStop(1, "#10051b")

  ctx.fillStyle = "#26082e"
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.21, beakY)
  ctx.quadraticCurveTo(
    boss.x, beakY - r * 0.07,
    boss.x + r * 0.21, beakY
  )
  ctx.lineTo(boss.x + r * 0.06, beakY + r * 0.25)
  ctx.lineTo(boss.x, beakY + r * 0.34)
  ctx.lineTo(boss.x - r * 0.06, beakY + r * 0.25)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = beakGrad
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.15, beakY + r * 0.015)
  ctx.lineTo(boss.x, beakY + r * 0.09)
  ctx.lineTo(boss.x + r * 0.15, beakY + r * 0.015)
  ctx.lineTo(boss.x + r * 0.045, beakY + r * 0.24)
  ctx.lineTo(boss.x, beakY + r * 0.29)
  ctx.lineTo(boss.x - r * 0.045, beakY + r * 0.24)
  ctx.closePath()
  ctx.fill()

  // Beak highlight
  ctx.strokeStyle = "#d8b4fe"
  ctx.lineWidth = r * 0.018
  ctx.beginPath()
  ctx.moveTo(boss.x - r * 0.10, beakY + r * 0.04)
  ctx.lineTo(boss.x, beakY + r * 0.12)
  ctx.stroke()

 
  // SMALL GLOWING CROWN NODES

  for (let i = -2; i <= 2; i++) {
    const x = boss.x + i * r * 0.22
    const y = boss.y - r * (0.91 - Math.abs(i) * 0.06)
    const nodeR = r * (i === 0 ? 0.065 : 0.043)

    ctx.save()
    ctx.shadowColor = "#f0abfc"
    ctx.shadowBlur = r * 0.12
    ctx.fillStyle = i === 0 ? "#ffffff" : "#f0abfc"

    ctx.beginPath()
    ctx.arc(x, y, nodeR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.restore()



    // boss Alien Mantis
      } else if (boss.type === "alienMantis") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y
        const pulse = 1 + Math.sin(t / 200) * 0.03
        const sway = Math.sin(t / 300) * 0.06
        const scytheSwing = Math.sin(t / 400) * 0.15
        const wingFlap = Math.sin(t / 60) * 0.1
        const eyeGlow = 10 + Math.sin(t / 130) * 6

    
        // AURA 
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const aura = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 1.7)
        aura.addColorStop(0, "rgba(34, 197, 94, 0.22)")
        aura.addColorStop(0.6, "rgba(74, 222, 128, 0.08)")
        aura.addColorStop(1, "rgba(34, 197, 94, 0)")
        ctx.fillStyle = aura
        ctx.beginPath()
        ctx.arc(bx, by, r * 1.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

      
        // WINGS 
        ctx.save()
        ctx.translate(bx, by + r * 0.1)
        ctx.rotate(-0.4 + wingFlap)

        const wingGradL = ctx.createLinearGradient(0, 0, -r * 1.4, -r * 0.5)
        wingGradL.addColorStop(0, "rgba(134, 239, 172, 0.75)")
        wingGradL.addColorStop(0.6, "rgba(74, 222, 128, 0.4)")
        wingGradL.addColorStop(1, "rgba(22, 101, 52, 0.6)")

        ctx.fillStyle = wingGradL
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(-r * 0.8, -r * 0.9, -r * 1.5, -r * 0.5)
        ctx.quadraticCurveTo(-r * 1.2, r * 0.1, 0, r * 0.3)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#14532d"
        ctx.lineWidth = 2
        ctx.stroke()

        // Wing veins
        ctx.strokeStyle = "rgba(20, 83, 45, 0.5)"
        ctx.lineWidth = 1.5
        for (let i = 0; i < 4; i++) {
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(
            -r * (0.4 + i * 0.25),
            -r * (0.5 - i * 0.08)
          )
          ctx.stroke()
        }
        ctx.restore()

        ctx.save()
        ctx.translate(bx, by + r * 0.1)
        ctx.rotate(0.4 - wingFlap)

        const wingGradR = ctx.createLinearGradient(0, 0, r * 1.4, -r * 0.5)
        wingGradR.addColorStop(0, "rgba(134, 239, 172, 0.75)")
        wingGradR.addColorStop(0.6, "rgba(74, 222, 128, 0.4)")
        wingGradR.addColorStop(1, "rgba(22, 101, 52, 0.6)")

        ctx.fillStyle = wingGradR
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(r * 0.8, -r * 0.9, r * 1.5, -r * 0.5)
        ctx.quadraticCurveTo(r * 1.2, r * 0.1, 0, r * 0.3)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#14532d"
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.strokeStyle = "rgba(20, 83, 45, 0.5)"
        ctx.lineWidth = 1.5
        for (let i = 0; i < 4; i++) {
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(
            r * (0.4 + i * 0.25),
            -r * (0.5 - i * 0.08)
          )
          ctx.stroke()
        }
        ctx.restore()

     
        // SCYTHE ARMS 
     
        // LEFT SCYTHE
        ctx.save()
        ctx.translate(bx - r * 0.4, by - r * 0.3)
        ctx.rotate(scytheSwing)

        // Upper arm segment
        ctx.strokeStyle = "#166534"
        ctx.lineWidth = r * 0.12
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-r * 0.5, -r * 0.4)
        ctx.stroke()

        // Scythe blade (curved, sharp)
        const scytheGradL = ctx.createLinearGradient(-r * 0.5, -r * 0.4, -r * 1.6, -r * 1.0)
        scytheGradL.addColorStop(0, "#bbf7d0")
        scytheGradL.addColorStop(0.5, "#86efac")
        scytheGradL.addColorStop(1, "#14532d")

        ctx.fillStyle = scytheGradL
        ctx.beginPath()
        ctx.moveTo(-r * 0.5, -r * 0.4)
        ctx.quadraticCurveTo(-r * 1.0, -r * 1.3, -r * 1.7, -r * 0.6)
        ctx.quadraticCurveTo(-r * 1.2, -r * 0.5, -r * 0.9, -r * 0.2)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Scythe edge highlight
        ctx.strokeStyle = "#dcfce7"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(-r * 0.6, -r * 0.5)
        ctx.quadraticCurveTo(-r * 1.0, -r * 1.1, -r * 1.5, -r * 0.7)
        ctx.stroke()

        // Barbed hook at tip
        ctx.fillStyle = "#bbf7d0"
        ctx.beginPath()
        ctx.moveTo(-r * 1.7, -r * 0.6)
        ctx.lineTo(-r * 1.9, -r * 0.75)
        ctx.lineTo(-r * 1.75, -r * 0.55)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.restore()

        // RIGHT SCYTHE (mirror)
        ctx.save()
        ctx.translate(bx + r * 0.4, by - r * 0.3)
        ctx.rotate(-scytheSwing)

        ctx.strokeStyle = "#166534"
        ctx.lineWidth = r * 0.12
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(r * 0.5, -r * 0.4)
        ctx.stroke()

        const scytheGradR = ctx.createLinearGradient(r * 0.5, -r * 0.4, r * 1.6, -r * 1.0)
        scytheGradR.addColorStop(0, "#bbf7d0")
        scytheGradR.addColorStop(0.5, "#86efac")
        scytheGradR.addColorStop(1, "#14532d")

        ctx.fillStyle = scytheGradR
        ctx.beginPath()
        ctx.moveTo(r * 0.5, -r * 0.4)
        ctx.quadraticCurveTo(r * 1.0, -r * 1.3, r * 1.7, -r * 0.6)
        ctx.quadraticCurveTo(r * 1.2, -r * 0.5, r * 0.9, -r * 0.2)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = 2.5
        ctx.stroke()

        ctx.strokeStyle = "#dcfce7"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(r * 0.6, -r * 0.5)
        ctx.quadraticCurveTo(r * 1.0, -r * 1.1, r * 1.5, -r * 0.7)
        ctx.stroke()

        ctx.fillStyle = "#bbf7d0"
        ctx.beginPath()
        ctx.moveTo(r * 1.7, -r * 0.6)
        ctx.lineTo(r * 1.9, -r * 0.75)
        ctx.lineTo(r * 1.75, -r * 0.55)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.restore()

      
        // BODY 
       
        ctx.save()
        ctx.translate(bx + Math.sin(t / 200) * 3, by)  // subtle sway
        ctx.scale(pulse, pulse)

        // Thorax (upper body)
        const thoraxGrad = ctx.createRadialGradient(
          -r * 0.15, -r * 0.2, r * 0.05,
          0, 0, r * 0.7
        )
        thoraxGrad.addColorStop(0, "#dcfce7")
        thoraxGrad.addColorStop(0.4, "#86efac")
        thoraxGrad.addColorStop(0.75, "#22c55e")
        thoraxGrad.addColorStop(1, "#14532d")

        ctx.fillStyle = thoraxGrad
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.1, r * 0.55, r * 0.75, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = r * 0.045
        ctx.stroke()

        // Thorax armor plates
        ctx.strokeStyle = "#166534"
        ctx.lineWidth = r * 0.03
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(-r * 0.45, -r * 0.4 + i * r * 0.3)
          ctx.quadraticCurveTo(0, -r * 0.3 + i * r * 0.3, r * 0.45, -r * 0.4 + i * r * 0.3)
          ctx.stroke()
        }

        // Abdomen (lower body, pointed)
        const abdomenGrad = ctx.createRadialGradient(
          -r * 0.1, r * 0.3, r * 0.05,
          0, r * 0.5, r * 0.8
        )
        abdomenGrad.addColorStop(0, "#86efac")
        abdomenGrad.addColorStop(0.5, "#22c55e")
        abdomenGrad.addColorStop(1, "#14532d")

        ctx.fillStyle = abdomenGrad
        ctx.beginPath()
        ctx.moveTo(-r * 0.45, r * 0.4)
        ctx.quadraticCurveTo(-r * 0.3, r * 1.1, 0, r * 1.25)
        ctx.quadraticCurveTo(r * 0.3, r * 1.1, r * 0.45, r * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = r * 0.04
        ctx.stroke()

        // Abdomen segments
        ctx.strokeStyle = "#166534"
        ctx.lineWidth = r * 0.025
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(-r * 0.3 + i * r * 0.05, r * 0.6 + i * r * 0.18)
          ctx.quadraticCurveTo(0, r * 0.65 + i * r * 0.18, r * 0.3 - i * r * 0.05, r * 0.6 + i * r * 0.18)
          ctx.stroke()
        }

        // Abdomen tip (stinger)
        ctx.fillStyle = "#bbf7d0"
        ctx.beginPath()
        ctx.moveTo(-r * 0.1, r * 1.2)
        ctx.lineTo(0, r * 1.45)
        ctx.lineTo(r * 0.1, r * 1.2)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.restore()

       
        // LEGS 
       
        ctx.strokeStyle = "#166534"
        ctx.lineWidth = r * 0.06
        ctx.lineCap = "round"

        for (let i = 0; i < 2; i++) {
          const lx = bx + (i === 0 ? -r * 0.35 : r * 0.35)
          const ly = by + r * 0.25
          const legWave = Math.sin(t / 200 + i * Math.PI) * r * 0.05

          // Leg
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(lx + (i === 0 ? -r * 0.15 : r * 0.15), ly + r * 0.25)
          ctx.lineTo(lx + (i === 0 ? -r * 0.25 : r * 0.25) + legWave, ly + r * 0.55)
          ctx.stroke()
        }
        ctx.lineCap = "butt"

        
        // HEAD 
      
        const headY = by - r * 0.95
        ctx.save()
        ctx.translate(bx, headY)

        // Head (triangle/diamond)
        const headGrad = ctx.createRadialGradient(
          -r * 0.1, -r * 0.1, r * 0.05,
          0, 0, r * 0.55
        )
        headGrad.addColorStop(0, "#dcfce7")
        headGrad.addColorStop(0.5, "#86efac")
        headGrad.addColorStop(1, "#166534")

        ctx.fillStyle = headGrad
        ctx.beginPath()
        ctx.moveTo(-r * 0.5, -r * 0.25)
        ctx.lineTo(0, -r * 0.65)
        ctx.lineTo(r * 0.5, -r * 0.25)
        ctx.lineTo(r * 0.35, r * 0.25)
        ctx.lineTo(0, r * 0.45)
        ctx.lineTo(-r * 0.35, r * 0.25)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = "#052e16"
        ctx.lineWidth = r * 0.04
        ctx.stroke()

     
        // EYES
      
        for (const side of [-1, 1]) {
          const ex = side * r * 0.22
          const ey = -r * 0.15

          // Socket
          ctx.fillStyle = "#170524"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.20, r * 0.25, 0, 0, Math.PI * 2)
          ctx.fill()

          // Glowing green iris
          ctx.shadowColor = "#22c55e"
          ctx.shadowBlur = eyeGlow
          const eyeGrad = ctx.createRadialGradient(
            ex - r * 0.04, ey - r * 0.04, r * 0.02,
            ex, ey, r * 0.16
          )
          eyeGrad.addColorStop(0, "#ffffff")
          eyeGrad.addColorStop(0.3, "#86efac")
          eyeGrad.addColorStop(0.7, "#22c55e")
          eyeGrad.addColorStop(1, "#14532d")

          ctx.fillStyle = eyeGrad
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.15, r * 0.19, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          // Compound facets (dots)
          ctx.fillStyle = "rgba(5, 46, 22, 0.4)"
          for (let fx = -1; fx <= 1; fx++) {
            for (let fy = -1; fy <= 1; fy++) {
              ctx.beginPath()
              ctx.arc(ex + fx * r * 0.06, ey + fy * r * 0.07, r * 0.02, 0, Math.PI * 2)
              ctx.fill()
            }
          }

          // Reflection
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(ex - r * 0.04, ey - r * 0.06, r * 0.03, 0, Math.PI * 2)
          ctx.fill()
        }

        // Mandibles (small pincers below head)
        ctx.fillStyle = "#14532d"
        ctx.beginPath()
        ctx.moveTo(-r * 0.12, r * 0.35)
        ctx.lineTo(-r * 0.2, r * 0.55)
        ctx.lineTo(-r * 0.08, r * 0.45)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(r * 0.12, r * 0.35)
        ctx.lineTo(r * 0.2, r * 0.55)
        ctx.lineTo(r * 0.08, r * 0.45)
        ctx.closePath()
        ctx.fill()

        ctx.restore() // head

      
        // ANTENNAE 
       
        const antennaSway = Math.sin(t / 250) * r * 0.08
        ctx.strokeStyle = "#166534"
        ctx.lineWidth = r * 0.04
        ctx.lineCap = "round"

        // Left antenna
        ctx.beginPath()
        ctx.moveTo(bx - r * 0.15, headY - r * 0.5)
        ctx.quadraticCurveTo(
          bx - r * 0.4,
          headY - r * 1.1,
          bx - r * 0.6 + antennaSway,
          headY - r * 1.5
        )
        ctx.stroke()

        // Right antenna
        ctx.beginPath()
        ctx.moveTo(bx + r * 0.15, headY - r * 0.5)
        ctx.quadraticCurveTo(
          bx + r * 0.4,
          headY - r * 1.1,
          bx + r * 0.6 - antennaSway,
          headY - r * 1.5
        )
        ctx.stroke()
        ctx.lineCap = "butt"

        // Antenna tips (glowing)
        ctx.fillStyle = "#bbf7d0"
        ctx.shadowColor = "#86efac"
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(bx - r * 0.6 + antennaSway, headY - r * 1.5, r * 0.05, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(bx + r * 0.6 - antennaSway, headY - r * 1.5, r * 0.05, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      



        // boss Alien Abductor
        } else if (boss.type === "abductor") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y
        const hover = Math.sin(t / 400) * 6
        const lightRotation = t / 500
        const beamPulse = 0.6 + Math.sin(t / 200) * 0.2

        ctx.save()
        ctx.translate(bx, by + hover)

      
        // TRACTOR BEAM (going down, behind UFO)
        
        ctx.save()
        ctx.globalCompositeOperation = "lighter"

        const beamGrad = ctx.createLinearGradient(0, 0, 0, r * 4)
        beamGrad.addColorStop(0, `rgba(0, 255, 200, ${beamPulse * 0.7})`)
        beamGrad.addColorStop(0.4, `rgba(0, 255, 200, ${beamPulse * 0.35})`)
        beamGrad.addColorStop(1, "rgba(0, 255, 200, 0.39)")

        ctx.fillStyle = beamGrad
        ctx.beginPath()
        ctx.moveTo(-r * 0.5, r * 0.3)
        ctx.lineTo(-r * 2, r * 4)
        ctx.lineTo(r * 2, r * 4)
        ctx.lineTo(r * 0.5, r * 0.3)
        ctx.closePath()
        ctx.fill()

        // Beam rings (moving down)
        const ringOffset = (t / 30) % (r * 3.5)
        for (let i = 0; i < 3; i++) {
          const ringY = r * 0.5 + ringOffset + i * r * 1.2
          if (ringY > r * 3.5) continue

          const ringWidth = r * (0.4 + (ringY / (r * 4)) * 1.5)
          const ringAlpha = 0.6 - (ringY / (r * 4)) * 0.5

          ctx.strokeStyle = `rgba(120, 255, 220, ${ringAlpha})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(0, ringY, ringWidth, ringWidth * 0.15, 0, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.restore()

    
        // UFO SHADOW (on ground)
      
        ctx.fillStyle = "rgba(16, 16, 16, 0.35)"
        ctx.beginPath()
        ctx.ellipse(0, r * 1.1, r * 1.1, r * 0.25, 0, 0, Math.PI * 2)
        ctx.fill()

      
        // UFO BOTTOM HULL (metallic saucer)
   
        const hullGrad = ctx.createLinearGradient(0, -r * 0.2, 0, r * 0.6)
        hullGrad.addColorStop(0, "#94a3b8")
        hullGrad.addColorStop(0.4, "#64748b")
        hullGrad.addColorStop(0.8, "#334155")
        hullGrad.addColorStop(1, "#1e293b")

        ctx.fillStyle = hullGrad
        ctx.beginPath()
        ctx.ellipse(0, r * 0.25, r * 1.3, r * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#0f172a"
        ctx.lineWidth = r * 0.04
        ctx.stroke()

        // Bottom rim (dark)
        ctx.fillStyle = "#0f172a"
        ctx.beginPath()
        ctx.ellipse(0, r * 0.35, r * 1.25, r * 0.45, 0, 0, Math.PI)
        ctx.fill()

        // Bottom panels (2 darker rings)
        ctx.strokeStyle = "#1e293b"
        ctx.lineWidth = r * 0.02
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath()
          ctx.ellipse(0, r * (0.3 + i * 0.1), r * (1.15 - i * 0.08), r * (0.35 - i * 0.05), 0, 0, Math.PI)
          ctx.stroke()
        }

   
        // UFO MIDDLE RIM (lights)
 
        ctx.fillStyle = "#475569"
        ctx.beginPath()
        ctx.ellipse(0, r * 0.05, r * 1.35, r * 0.28, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#0f172a"
        ctx.lineWidth = r * 0.03
        ctx.stroke()

        // Rotating lights around the rim
        for (let i = 0; i < 10; i++) {
          const angle = lightRotation + (i / 10) * Math.PI * 2
          const lightX = Math.cos(angle) * r * 1.2
          const lightY = Math.sin(angle) * r * 0.22 + r * 0.05

          // Determine light color (alternating pattern)
          const colorIndex = Math.floor((lightRotation * 2 + i) % 3)
          let lightColor = "#00ffff"
          let glowColor = "#00ffff"
          if (colorIndex === 1) {
            lightColor = "#ff00ff"
            glowColor = "#ff00ff"
          } else if (colorIndex === 2) {
            lightColor = "#ffff00"
            glowColor = "#ffff00"
          }

          // Only draw lights that are "visible" (front of the ellipse)
          const isVisible = Math.sin(angle) > -0.5

          if (isVisible) {
            ctx.shadowBlur = 12
            ctx.shadowColor = glowColor
            ctx.fillStyle = lightColor
            ctx.beginPath()
            ctx.arc(lightX, lightY, r * 0.08, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0

            // Bright center
            ctx.fillStyle = "#ffffff"
            ctx.beginPath()
            ctx.arc(lightX - r * 0.02, lightY - r * 0.02, r * 0.03, 0, Math.PI * 2)
            ctx.fill()
          }
        }

     
        // UFO DOME (glass, transparent)
    
        const domeGrad = ctx.createLinearGradient(0, -r * 0.9, 0, r * 0.1)
        domeGrad.addColorStop(0, "rgba(186, 230, 253, 0.85)")
        domeGrad.addColorStop(0.5, "rgba(125, 211, 252, 0.6)")
        domeGrad.addColorStop(1, "rgba(56, 189, 248, 0.4)")

        ctx.fillStyle = domeGrad
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.15, r * 0.85, r * 0.7, 0, Math.PI, 0)
        ctx.fill()
        ctx.strokeStyle = "rgba(14, 165, 233, 0.8)"
        ctx.lineWidth = r * 0.03
        ctx.stroke()

        // Dome shine (highlight)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
        ctx.beginPath()
        ctx.ellipse(-r * 0.35, -r * 0.55, r * 0.25, r * 0.15, -0.4, 0, Math.PI * 2)
        ctx.fill()

      
        // ALIENS INSIDE THE DOME (2 small pilots)
       
        for (const pilotOffset of [-r * 0.3, r * 0.3]) {
          // Body
          ctx.fillStyle = "#22c55e"
          ctx.beginPath()
          ctx.ellipse(pilotOffset, -r * 0.2, r * 0.12, r * 0.15, 0, 0, Math.PI * 2)
          ctx.fill()

          // Head
          ctx.fillStyle = "#4ade80"
          ctx.beginPath()
          ctx.arc(pilotOffset, -r * 0.4, r * 0.13, 0, Math.PI * 2)
          ctx.fill()

          // Big alien eyes (black)
          ctx.fillStyle = "#000000"
          ctx.beginPath()
          ctx.ellipse(pilotOffset - r * 0.05, -r * 0.4, r * 0.04, r * 0.06, -0.3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(pilotOffset + r * 0.05, -r * 0.4, r * 0.04, r * 0.06, 0.3, 0, Math.PI * 2)
          ctx.fill()

          // Eye shine
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(pilotOffset - r * 0.06, -r * 0.42, r * 0.015, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(pilotOffset + r * 0.04, -r * 0.42, r * 0.015, 0, Math.PI * 2)
          ctx.fill()
        }

        
        // ANTENNA (top)
    
        ctx.strokeStyle = "#94a3b8"
        ctx.lineWidth = r * 0.04
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(0, -r * 0.85)
        ctx.lineTo(0, -r * 1.2)
        ctx.stroke()
        ctx.lineCap = "butt"

        // Antenna ball (glowing red, blinking)
        const antennaBlink = Math.sin(t / 200) > 0 ? 1 : 0.4
        ctx.fillStyle = `rgba(255, 50, 50, ${antennaBlink})`
        ctx.shadowBlur = 15
        ctx.shadowColor = "#ff0000"
        ctx.beginPath()
        ctx.arc(0, -r * 1.25, r * 0.1, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // ENGINE GLOW (bottom, blue thrusters)
     
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const engineGrad = ctx.createRadialGradient(0, r * 0.6, 0, 0, r * 0.6, r * 0.7)
        engineGrad.addColorStop(0, "rgba(100, 200, 255, 0.9)")
        engineGrad.addColorStop(0.5, "rgba(100, 200, 255, 0.4)")
        engineGrad.addColorStop(1, "rgba(100, 200, 255, 0)")

        ctx.fillStyle = engineGrad
        ctx.beginPath()
        ctx.ellipse(0, r * 0.65, r * 0.5, r * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        ctx.restore()
      

        // boss Queen Xeno Hen
      } else if (boss.type === "queenXenoHen") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const pulse = 1 + Math.sin(t / 180) * 0.025
        const wingFlap = Math.sin(t / 75) * 0.18
        const crestPulse = 0.7 + Math.sin(t / 120) * 0.3
        const auraPulse = 0.5 + Math.sin(t / 250) * 0.3
        const hover = Math.sin(t / 160) * r * 0.025
        const cy = by + hover

        // Orbit setup for eggs
        const orbitRadius = r * 1.35
        const orbitSpeed = t / 1200
        const eggCount = 5

        // Outer save — protects everything after from leaking state
        ctx.save()

        // BIO-MUTATED XENO-HEN QUEEN

        // BIOLOGICAL BUFF FIELD
        if (boss.buffRadius) {
          ctx.save()
          ctx.globalCompositeOperation = "lighter"

          const aura = ctx.createRadialGradient(
            bx, cy, r * 0.55,
            bx, cy, boss.buffRadius
          )
          aura.addColorStop(0, `rgba(170, 45, 255, ${auraPulse * 0.2})`)
          aura.addColorStop(0.65, `rgba(65, 210, 255, ${auraPulse * 0.1})`)
          aura.addColorStop(1, "rgba(65, 211, 255, 0.62)")

          ctx.fillStyle = aura
          ctx.beginPath()
          ctx.arc(bx, cy, boss.buffRadius, 0, Math.PI * 10)
          ctx.fill()

          ctx.strokeStyle = `rgba(110, 230, 255, ${auraPulse * 0.5})`
          ctx.lineWidth = 2
          ctx.setLineDash([12, 9])
          ctx.beginPath()
          ctx.arc(bx, cy, boss.buffRadius, -t / 900, Math.PI * 2 - t / 900)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.restore()
        }

        // ALIEN TAIL: segmented spines
        ctx.save()
        ctx.translate(bx, cy + r * 0.35)
        ctx.rotate(Math.sin(t / 220) * 0.08)

        for (let i = -2; i <= 2; i++) {
          const spread = i * r * 0.19
          const length = r * (0.62 + (2 - Math.abs(i)) * 0.12)

          ctx.fillStyle = i % 2 === 0 ? "#5c2a8a" : "#2a2244"
          ctx.strokeStyle = "#a56bff"
          ctx.lineWidth = 1.5

          ctx.beginPath()
          ctx.moveTo(spread * 0.25, 0)
          ctx.quadraticCurveTo(
            spread * 0.6, length * 0.45,
            spread * 1.4, length
          )
          ctx.lineTo(spread * 1.4 + r * 0.055, length * 0.66)
          ctx.quadraticCurveTo(
            spread * 0.8, length * 0.25,
            spread * 0.25, 0
          )
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.strokeStyle = `rgba(90, 240, 255, ${0.35 + crestPulse * 0.25})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(spread * 0.3, r * 0.08)
          ctx.lineTo(spread * 1.3, length * 0.82)
          ctx.stroke()
        }
        ctx.restore()

        // FOUR ALIEN WINGS
        for (const side of [-1, 1]) {
          for (const rear of [true, false]) {
            ctx.save()
            ctx.translate(
              bx + side * r * (rear ? 0.35 : 0.48),
              cy - r * (rear ? 0.05 : 0.12)
            )

            ctx.rotate(
              side * (rear ? 0.48 : -0.28) +
              wingFlap * (rear ? -0.7 : 1)
            )

            const length = r * (rear ? 0.9 : 1.25)
            const height = r * (rear ? 0.31 : 0.4)

            ctx.fillStyle = rear
              ? "rgba(91, 45, 155, 0.48)"
              : "rgba(88, 200, 255, 0.25)"
            ctx.strokeStyle = rear ? "#8954c9" : "#65dfff"
            ctx.lineWidth = 2

            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.quadraticCurveTo(
              side * length * 0.35, -height * 1.2,
              side * length, -height * 0.15
            )
            ctx.quadraticCurveTo(
              side * length * 0.75, height * 0.9,
              side * length * 0.2, height * 0.55
            )
            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            ctx.strokeStyle = "rgba(180, 245, 255, 0.65)"
            ctx.lineWidth = 1.2

            for (let i = 0; i < 3; i++) {
              ctx.beginPath()
              ctx.moveTo(r * 0.04, r * 0.04 * i)
              ctx.quadraticCurveTo(
                side * length * 0.45,
                (i - 1) * height * 0.15,
                side * length * (0.65 + i * 0.1),
                (i - 1) * height * 0.17
              )
              ctx.stroke()
            }

            ctx.restore()
          }
        }

        // SIX JOINTED PREDATOR LIMBS
        ctx.save()
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const anchorX = bx + side * r * (0.28 + i * 0.2)
            const anchorY = cy + r * (0.12 + i * 0.23)
            const swing = Math.sin(t / 95 + i * 1.7 + side) * r * 0.07

            const kneeX = anchorX + side * r * (0.22 + i * 0.035)
            const kneeY = anchorY + r * 0.24
            const footX = kneeX + side * r * 0.12 + swing
            const footY = cy + r * (0.9 + i * 0.035)

            ctx.strokeStyle = "#811af86b"
            ctx.lineWidth = r * 0.075
            ctx.beginPath()
            ctx.moveTo(anchorX, anchorY)
            ctx.lineTo(kneeX, kneeY)
            ctx.lineTo(footX, footY)
            ctx.stroke()

            ctx.strokeStyle = "#8954c9"
            ctx.lineWidth = r * 0.022
            ctx.beginPath()
            ctx.moveTo(anchorX, anchorY)
            ctx.lineTo(kneeX, kneeY)
            ctx.stroke()

            ctx.fillStyle = "#5b3188"
            ctx.beginPath()
            ctx.arc(kneeX, kneeY, r * 0.055, 0, Math.PI * 2)
            ctx.fill()

            ctx.strokeStyle = "#b9f7ff"
            ctx.lineWidth = r * 0.025

            for (let claw = -1; claw <= 1; claw++) {
              ctx.beginPath()
              ctx.moveTo(footX, footY)
              ctx.lineTo(
                footX + side * r * (0.09 + claw * 0.025),
                footY + r * (0.07 + Math.abs(claw) * 0.025)
              )
              ctx.stroke()
            }
          }
        }

        ctx.restore()

        // BODY — fleshy bio-mutated queen (NOT roasted chicken)
        
        ctx.save()
        ctx.translate(bx, cy)
        ctx.scale(pulse, pulse)

        const bodyGrad = ctx.createRadialGradient(
          -r * 0.25, -r * 0.25, r * 0.05,
          0, r * 0.12, r * 1.05
        )
        // Deep flesh/membrane tones — purple-red bio, not roasted brown
        bodyGrad.addColorStop(0, "#a35cd6")
        bodyGrad.addColorStop(0.3, "#7c3aed")
        bodyGrad.addColorStop(0.65, "#4c1d95")
        bodyGrad.addColorStop(1, "#1a0a2a")

        ctx.fillStyle = bodyGrad
        ctx.strokeStyle = "#c084fc"
        ctx.lineWidth = r * 0.045

        ctx.beginPath()
        ctx.ellipse(0, r * 0.1, r * 0.68, r * 0.83, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Chitin armor plates (bio-luminescent edges)
        for (let i = 0; i < 3; i++) {
          const plateY = -r * 0.25 + i * r * 0.29
          const plateW = r * (0.48 - i * 0.045)

          ctx.fillStyle = i % 2 === 0 ? "#4c1d95" : "#3b1478"
          ctx.strokeStyle = "#a78bfa"
          ctx.lineWidth = 1.5

          ctx.beginPath()
          ctx.moveTo(-plateW, plateY)
          ctx.quadraticCurveTo(0, plateY - r * 0.12, plateW, plateY)
          ctx.lineTo(plateW * 0.72, plateY + r * 0.14)
          ctx.quadraticCurveTo(0, plateY + r * 0.23, -plateW * 0.72, plateY + r * 0.14)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        // Empty egg chamber (glowing cavity where eggs USED to be)
        ctx.fillStyle = "rgba(40, 20, 60, 0.7)"
        ctx.beginPath()
        ctx.ellipse(0, r * 0.4, r * 0.45, r * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = "rgba(167, 139, 250, 0.6)"
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])

        // Armor glint
        ctx.strokeStyle = "rgba(205, 175, 255, 0.45)"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(-r * 0.23, -r * 0.1, r * 0.2, r * 0.35, -0.3, -1.2, 1.2)
        ctx.stroke()

        ctx.restore()

        // ALIEN NECK: layered armored collar
        ctx.fillStyle = "#1b1429"
        ctx.strokeStyle = "#8050b6"
        ctx.lineWidth = 2

        ctx.beginPath()
        ctx.moveTo(bx - r * 0.43, cy - r * 0.55)
        ctx.lineTo(bx - r * 0.3, cy - r * 0.83)
        ctx.lineTo(bx, cy - r * 0.7)
        ctx.lineTo(bx + r * 0.3, cy - r * 0.83)
        ctx.lineTo(bx + r * 0.43, cy - r * 0.55)
        ctx.lineTo(bx + r * 0.28, cy - r * 0.4)
        ctx.lineTo(bx - r * 0.28, cy - r * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // XENO HEAD
        const headY = cy - r * 0.86

        const headGrad = ctx.createRadialGradient(
          bx - r * 0.15, headY - r * 0.12, r * 0.03,
          bx, headY, r * 0.57
        )
        headGrad.addColorStop(0, "#69448d")
        headGrad.addColorStop(0.45, "#3a2856")
        headGrad.addColorStop(1, "#0b0b17")

        ctx.fillStyle = headGrad
        ctx.strokeStyle = "#9e69d6"
        ctx.lineWidth = r * 0.04

        ctx.beginPath()
        ctx.moveTo(bx, headY - r * 0.58)
        ctx.lineTo(bx + r * 0.39, headY - r * 0.2)
        ctx.lineTo(bx + r * 0.34, headY + r * 0.2)
        ctx.lineTo(bx + r * 0.13, headY + r * 0.42)
        ctx.lineTo(bx, headY + r * 0.32)
        ctx.lineTo(bx - r * 0.13, headY + r * 0.42)
        ctx.lineTo(bx - r * 0.34, headY + r * 0.2)
        ctx.lineTo(bx - r * 0.39, headY - r * 0.2)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Forehead armor ridge
        ctx.fillStyle = "#7c4fb0"
        ctx.beginPath()
        ctx.moveTo(bx, headY - r * 0.48)
        ctx.lineTo(bx + r * 0.13, headY - r * 0.12)
        ctx.lineTo(bx, headY + r * 0.04)
        ctx.lineTo(bx - r * 0.13, headY - r * 0.12)
        ctx.closePath()
        ctx.fill()

        // THREE HORNED BIO-CROWN
        ctx.save()
        ctx.globalAlpha = crestPulse

        for (let i = -1; i <= 1; i++) {
          const hx = bx + i * r * 0.23
          const hy = headY - r * 0.38 + Math.abs(i) * r * 0.09
          const tipY = hy - r * (i === 0 ? 0.53 : 0.36)

          ctx.fillStyle = i === 0 ? "#6d28d9" : "#3b1478"
          ctx.strokeStyle = "#c4b5fd"
          ctx.lineWidth = 2

          ctx.beginPath()
          ctx.moveTo(hx - r * 0.1, hy)
          ctx.quadraticCurveTo(
            hx - r * 0.08, tipY + r * 0.1,
            hx + r * 0.02, tipY
          )
          ctx.quadraticCurveTo(
            hx + r * 0.1, tipY + r * 0.16,
            hx + r * 0.1, hy
          )
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        ctx.restore()

        // CYAN PREDATOR EYES
        for (const side of [-1, 1]) {
          const eyeX = bx + side * r * 0.205
          const eyeY = headY - r * 0.035

          ctx.fillStyle = "#070b17"
          ctx.beginPath()
          ctx.ellipse(eyeX, eyeY, r * 0.145, r * 0.105, side * -0.22, 0, Math.PI * 2)
          ctx.fill()

          const eyeGrad = ctx.createRadialGradient(
            eyeX - r * 0.025, eyeY - r * 0.02, r * 0.01,
            eyeX, eyeY, r * 0.15
          )
          eyeGrad.addColorStop(0, "#f3ffff")
          eyeGrad.addColorStop(0.25, "#7cfaff")
          eyeGrad.addColorStop(0.7, "#19bce9")
          eyeGrad.addColorStop(1, "#174a87")

          ctx.fillStyle = eyeGrad
          ctx.beginPath()
          ctx.ellipse(eyeX, eyeY, r * 0.12, r * 0.078, side * -0.22, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = "#0478f388"
          ctx.beginPath()
          ctx.ellipse(eyeX, eyeY, r * 0.022, r * 0.064, 0, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(eyeX - side * r * 0.035, eyeY - r * 0.025, r * 0.018, 0, Math.PI * 2)
          ctx.fill()
        }

        // SPLIT MANDIBLES
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#171122"
          ctx.strokeStyle = "#9e69d6"
          ctx.lineWidth = 2

          ctx.beginPath()
          ctx.moveTo(bx + side * r * 0.1, headY + r * 0.22)
          ctx.quadraticCurveTo(
            bx + side * r * 0.3, headY + r * 0.24,
            bx + side * r * 0.22, headY + r * 0.43
          )
          ctx.lineTo(bx + side * r * 0.08, headY + r * 0.31)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = "#c9fbff"
          ctx.beginPath()
          ctx.moveTo(bx + side * r * 0.12, headY + r * 0.29)
          ctx.lineTo(bx + side * r * 0.16, headY + r * 0.4)
          ctx.lineTo(bx + side * r * 0.19, headY + r * 0.3)
          ctx.closePath()
          ctx.fill()
        }

        // BIO-LUMINESCENT SENSORS
        for (const side of [-1, 1]) {
          const sway = Math.sin(t / 90 + side) * r * 0.045
          const rootX = bx + side * r * 0.2
          const rootY = headY - r * 0.3
          const tipX = rootX + side * r * 0.18 + sway
          const tipY = rootY - r * 0.32

          ctx.strokeStyle = "#8b67b5"
          ctx.lineWidth = r * 0.035
          ctx.beginPath()
          ctx.moveTo(rootX, rootY)
          ctx.quadraticCurveTo(
            rootX + side * r * 0.12,
            rootY - r * 0.2,
            tipX, tipY
          )
          ctx.stroke()

          ctx.fillStyle = "#70f7ff"
          ctx.beginPath()
          ctx.arc(tipX, tipY, r * 0.055, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = "rgba(90, 240, 255, 0.22)"
          ctx.beginPath()
          ctx.arc(tipX, tipY, r * 0.105, 0, Math.PI * 2)
          ctx.fill()
        }

        // ENERGY SPINES along the back
        for (let i = 0; i < 5; i++) {
          const sx = bx + (i - 2) * r * 0.19
          const sy = cy - r * (0.48 - Math.abs(i - 2) * 0.04)

          ctx.fillStyle = "#5b3188"
          ctx.strokeStyle = "#6beaff"
          ctx.lineWidth = 1.2

          ctx.beginPath()
          ctx.moveTo(sx - r * 0.055, sy)
          ctx.lineTo(sx, sy - r * (0.14 + (i === 2 ? 0.06 : 0)))
          ctx.lineTo(sx + r * 0.055, sy)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        // ORBITING EGGS 
        for (let i = 0; i < eggCount; i++) {
          const eggAngle = orbitSpeed + (i / eggCount) * Math.PI * 2
          // Elliptical orbit (flattened, so eggs pass in front/behind visually)
          const eggX = bx + Math.cos(eggAngle) * orbitRadius
          const eggY = cy + Math.sin(eggAngle) * orbitRadius * 0.5

          // Depth: eggs in front (sin > 0) drawn later, behind drawn earlier
          // Simple: draw all on top for clarity, but scale by depth
          const depth = Math.sin(eggAngle) // -1 (behind) to 1 (front)
          const eggScale = 0.75 + depth * 0.25
          const eggR = r * 0.13 * eggScale

          // Outer glow
          ctx.shadowColor = "#28f0ff"
          ctx.shadowBlur = 18
          ctx.fillStyle = "rgba(40, 240, 255, 0.2)"
          ctx.beginPath()
          ctx.ellipse(eggX, eggY, eggR * 1.5, eggR * 1.8, eggAngle, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          // Egg body
          const eggGrad = ctx.createRadialGradient(
            eggX - eggR * 0.3, eggY - eggR * 0.4, eggR * 0.05,
            eggX, eggY, eggR * 1.2
          )
          eggGrad.addColorStop(0, "#f2ffff")
          eggGrad.addColorStop(0.3, "#8bf8ff")
          eggGrad.addColorStop(0.75, "#28a9dc")
          eggGrad.addColorStop(1, "#3154a8")

          ctx.fillStyle = eggGrad
          ctx.strokeStyle = "#9af8ff"
          ctx.lineWidth = 1.5

          ctx.beginPath()
          ctx.ellipse(eggX, eggY, eggR, eggR * 1.35, eggAngle, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // Crack detail (hint that it's about to hatch)
          ctx.strokeStyle = "rgba(20, 80, 120, 0.6)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(eggX - eggR * 0.4, eggY - eggR * 0.3)
          ctx.lineTo(eggX - eggR * 0.1, eggY)
          ctx.lineTo(eggX - eggR * 0.3, eggY + eggR * 0.4)
          ctx.stroke()
        }

        // Close outer save
        ctx.restore()
      

        // boss Devourer

            } else if (boss.type === "devourer") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const angleToPlayer = playerRef.current
          ? Math.atan2(playerRef.current.y - by, playerRef.current.x - bx)
          : 0

        const cyclePhase = (boss.spawnTimer || 0) % 3800
        const isDashing = cyclePhase >= 2700 && cyclePhase < 3300
        const isWindup = cyclePhase >= 2000 && cyclePhase < 2700

        // Mouth opens wider during dash
        const baseMouth = Math.sin(t / 200) * 0.25 + 0.55
        const mouthAngle = isDashing
          ? 1.15
          : isWindup
            ? baseMouth * 0.4 + 0.75
            : baseMouth

        const pulse = 1 + Math.sin(t / 250) * 0.05
        const angerGlow = isDashing ? 1 : isWindup ? 0.6 : 0.3

        // Aura
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const aura = ctx.createRadialGradient(bx, by, r * 0.4, bx, by, r * 2.4)
        aura.addColorStop(0, `rgba(220, 38, 38, ${0.15 + angerGlow * 0.2})`)
        aura.addColorStop(0.5, `rgba(153, 27, 27, ${0.08 + angerGlow * 0.1})`)
        aura.addColorStop(1, "rgba(255, 2, 2, 0.59)")
        ctx.fillStyle = aura
        ctx.beginPath()
        ctx.arc(bx, by, r * 2.4, 0, Math.PI * 4)
        ctx.fill()

        // Floating embers
        for (let i = 0; i < 6; i++) {
          const pa = t / 800 + (i / 6) * Math.PI * 2
          const pd = r * (1.2 + Math.sin(t / 300 + i) * 0.3)
          const px = bx + Math.cos(pa) * pd
          const py = by + Math.sin(pa) * pd * 0.7
          ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + Math.sin(t / 100 + i) * 0.3})`
          ctx.beginPath()
          ctx.arc(px, py, r * 0.04, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        // AMORPHOUS FLESH BODY
        
        ctx.save()
        ctx.translate(bx, by)
        ctx.rotate(angleToPlayer)
        ctx.scale(pulse, pulse)

        // Deforming wobble over time — this is the "deformed" part
        const wobble1 = Math.sin(t / 380) * r * 0.06
        const wobble2 = Math.cos(t / 290) * r * 0.07
        const wobble3 = Math.sin(t / 450 + 1) * r * 0.05
        const wobble4 = Math.cos(t / 320 + 2) * r * 0.06

        // Build an irregular organic silhouette
        // Base: an ellipse that bulges outward at random angles
        const points = 16  // more points = smoother blob
        const bodyRadiusBase = r * 0.98

        ctx.beginPath()
        for (let i = 0; i <= points; i++) {
          const a = (i / points) * Math.PI * 2

          // Organic radius per angle (fleshy bulges)
          const bulge =
            Math.sin(a * 3 + t / 700) * r * 0.06 +
            Math.sin(a * 5 - t / 500) * r * 0.04 +
            Math.cos(a * 7 + t / 900) * r * 0.03

          const rad = bodyRadiusBase + bulge

          // Apply wobble to specific spots (top, bottom, sides)
          const wobbleX =
            a < Math.PI / 2 ? wobble1 * Math.sin(a) :
            a < Math.PI ? wobble2 * Math.sin(a) :
            a < 1.5 * Math.PI ? wobble3 * Math.sin(a) :
            wobble4 * Math.sin(a)

          const px = Math.cos(a) * rad + (a > Math.PI ? wobbleX * 0.5 : 0)
          const py = Math.sin(a) * rad + (a > Math.PI ? 0 : wobbleX * 0.5)

          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()

        // Flesh gradient
        const flesh = ctx.createRadialGradient(
          -r * 0.3, -r * 0.35, r * 0.08,
          0, 0, r * 1.2
        )
        flesh.addColorStop(0, "#fb4949")
        flesh.addColorStop(0.3, "#b91c1c")
        flesh.addColorStop(0.7, "#641010")
        flesh.addColorStop(1, "#ba4646")

        ctx.fillStyle = flesh
        ctx.fill()
        ctx.strokeStyle = "#310606"
        ctx.lineWidth = r * 0.05
        ctx.stroke()

        // TATTERED FLESH EDGES (small tendrils around)
        
        ctx.strokeStyle = "#f80101"
        ctx.lineWidth = r * 0.04
        ctx.lineCap = "round"

        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t / 3000
          const startR = r * 0.92
          const endR = r * (1.05 + Math.sin(t / 200 + i) * 0.08)

          const sx = Math.cos(a) * startR
          const sy = Math.sin(a) * startR
          const ex = Math.cos(a + Math.sin(t / 400 + i) * 0.1) * endR
          const ey = Math.sin(a + Math.cos(t / 400 + i) * 0.1) * endR

          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.quadraticCurveTo(
            (sx + ex) / 2 + Math.cos(a + 0.5) * r * 0.05,
            (sy + ey) / 2 + Math.sin(a + 0.5) * r * 0.05,
            ex,
            ey
          )
          ctx.stroke()
        }

        ctx.lineCap = "butt"

        
        // FLESH VEINS (glowing cracks, pulsing)
        ctx.strokeStyle = `rgba(255, 65, 65, ${0.25 + angerGlow * 0.35})`
        ctx.lineWidth = r * 0.018

        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.3
          ctx.beginPath()
          ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3)
          ctx.quadraticCurveTo(
            Math.cos(a + 0.2) * r * 0.55,
            Math.sin(a + 0.2) * r * 0.55,
            Math.cos(a - 0.1) * r * 0.85,
            Math.sin(a - 0.1) * r * 0.85
          )
          ctx.stroke()
        }

        // MAW — torn, jagged mouth 
        // Mouth opens toward +X (since we rotated by angleToPlayer)
        const mawOpen = mouthAngle

        // Mouth interior — jagged torn shape
        const mawGrad = ctx.createRadialGradient(r * 0.4, 0, r * 0.1, r * 0.5, 0, r * 0.95)
        mawGrad.addColorStop(0, "#000000")
        mawGrad.addColorStop(0.6, "#0a0000")
        mawGrad.addColorStop(1, "#2a0303")

        ctx.fillStyle = mawGrad
        ctx.beginPath()

        // Upper jaw — torn, jagged
        ctx.moveTo(r * 0.05, -r * 0.25)
        ctx.lineTo(r * 0.2, -mawOpen * r * 0.5)
        ctx.lineTo(r * 0.35, -mawOpen * r * 0.55 + Math.sin(t / 150) * r * 0.03)
        ctx.lineTo(r * 0.5, -mawOpen * r * 0.68)
        ctx.lineTo(r * 0.65, -mawOpen * r * 0.58)
        ctx.lineTo(r * 0.8, -mawOpen * r * 0.75)
        ctx.lineTo(r * 0.95, -mawOpen * r * 0.5)

        // Tip of mouth
        ctx.lineTo(r * 1.08, 0)

        // Lower jaw — torn, jagged

        ctx.lineTo(r * 0.95, mawOpen * r * 0.5)
        ctx.lineTo(r * 0.8, mawOpen * r * 0.75)
        ctx.lineTo(r * 0.65, mawOpen * r * 0.58)
        ctx.lineTo(r * 0.5, mawOpen * r * 0.68)
        ctx.lineTo(r * 0.35, mawOpen * r * 0.55 + Math.cos(t / 150) * r * 0.03)
        ctx.lineTo(r * 0.2, mawOpen * r * 0.5)
        ctx.lineTo(r * 0.05, r * 0.25)

        ctx.closePath()
        ctx.fill()

        // Deep throat (pit)
        ctx.fillStyle = "#000000"
        ctx.beginPath()
        ctx.ellipse(r * 0.55, 0, r * 0.28, mawOpen * r * 0.35, 0, 0, Math.PI * 2)
        ctx.fill()

        // TEETH — jagged, protruding in BOTH directions
        const teethCount = 8

        for (let i = 0; i < teethCount; i++) {
          const u = (i + 0.5) / teethCount
          const xPos = r * (0.15 + u * 0.85)

          // Upper teeth — point INTO the mouth (down)
          const upperY = -mawOpen * r * (0.45 + 0.15 * Math.sin(u * Math.PI))
          const upperToothLen = r * (0.1 + (i % 3) * 0.03)
          const upperTipY = upperY + upperToothLen

          ctx.fillStyle = i % 2 === 0 ? "#fff1cf" : "#d6c5a4"
          ctx.strokeStyle = "#6b2118"
          ctx.lineWidth = Math.max(1, r * 0.012)

          ctx.beginPath()
          ctx.moveTo(xPos - r * 0.05, upperY)
          ctx.lineTo(xPos + r * 0.05, upperY)
          ctx.lineTo(xPos + r * 0.015, upperTipY)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Lower teeth — point INTO the mouth (up)
          const lowerY = mawOpen * r * (0.45 + 0.15 * Math.sin(u * Math.PI))
          const lowerToothLen = r * (0.1 + ((i + 1) % 3) * 0.03)
          const lowerTipY = lowerY - lowerToothLen

          ctx.beginPath()
          ctx.moveTo(xPos - r * 0.05, lowerY)
          ctx.lineTo(xPos + r * 0.05, lowerY)
          ctx.lineTo(xPos + r * 0.015, lowerTipY)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        // SUNKEN EYES (fleshy sockets)

        for (const side of [-1, 1]) {
          const ex = -r * 0.25
          const ey = side * r * 0.35 + Math.sin(t / 400 + side) * r * 0.02

          // Sunken flesh socket (dark, deep)
          const socketGrad = ctx.createRadialGradient(
            ex - r * 0.03, ey - side * r * 0.03, r * 0.02,
            ex, ey, r * 0.24
          )
          socketGrad.addColorStop(0, "#2a0303")
          socketGrad.addColorStop(1, "#0a0000")

          ctx.fillStyle = socketGrad
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.22, r * 0.26, 0, 0, Math.PI * 2)
          ctx.fill()

          // Glowing iris (vertical slit, predator style)

          ctx.shadowColor = "#facc15"
          ctx.shadowBlur = 10 + angerGlow * 15

          const eyeGrad = ctx.createRadialGradient(
            ex - r * 0.04, ey - side * r * 0.04, r * 0.01,
            ex, ey, r * 0.16
          )
          eyeGrad.addColorStop(0, "#fff7ae")
          eyeGrad.addColorStop(0.45, "#facc15")
          eyeGrad.addColorStop(0.85, "#a16207")
          eyeGrad.addColorStop(1, "#713f12")

          ctx.fillStyle = eyeGrad
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.15, r * 0.18, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          // Vertical slit pupil
          ctx.fillStyle = "#160101"
          ctx.beginPath()
          ctx.ellipse(ex + r * 0.02, ey, r * 0.04, r * 0.13, 0, 0, Math.PI * 2)
          ctx.fill()

          // Reflection
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(ex - r * 0.05, ey - side * r * 0.06, r * 0.03, 0, Math.PI * 2)
          ctx.fill()

          // fleshy ridge above eye

          ctx.strokeStyle = "#540303d4"
          ctx.lineWidth = r * 0.06
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(ex - r * 0.2, ey - side * r * 0.25)
          ctx.quadraticCurveTo(
            ex, ey - side * r * 0.32,
            ex + r * 0.18, ey - side * r * 0.22
          )
          ctx.stroke()
          ctx.lineCap = "butt"
        }

        
        // CROWN SPIKES (fleshy horns on top)

        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i - 1) * 0.4
          const baseX = Math.cos(a) * r * 0.7
          const baseY = Math.sin(a) * r * 0.7
          const tipX = Math.cos(a) * r * (1.05 + Math.sin(t / 300 + i) * 0.05)
          const tipY = Math.sin(a) * r * (1.05 + Math.sin(t / 300 + i) * 0.05)

          const hornGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY)
          hornGrad.addColorStop(0, "#b91c1c")
          hornGrad.addColorStop(1, "#a20101a2")

          ctx.fillStyle = hornGrad
          ctx.beginPath()
          ctx.moveTo(baseX - Math.sin(a) * r * 0.08, baseY + Math.cos(a) * r * 0.08)
          ctx.lineTo(tipX, tipY)
          ctx.lineTo(baseX + Math.sin(a) * r * 0.08, baseY - Math.cos(a) * r * 0.08)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = "#e01717a6"
          ctx.lineWidth = r * 0.02
          ctx.stroke()
        }

        ctx.restore() // end body transform

        // TELEGRAPH LINE (during windup)

        if (isWindup && boss.chargeDirection) {
          ctx.save()
          ctx.globalAlpha = 0.35 + Math.sin(t / 50) * 0.25
          ctx.strokeStyle = "#ff0000"
          ctx.lineWidth = 6
          ctx.setLineDash([20, 15])
          ctx.beginPath()
          ctx.moveTo(bx, by)
          ctx.lineTo(bx + boss.chargeDirection.x * r * 6, by + boss.chargeDirection.y * r * 6)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }

      // boss The Butcher
      else if (boss.type === "theButcher") {
       
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
      else if (boss.type === "voidReaper") {
        
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
      else if (boss.type === "plagueBringer") {
       
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
      else if (boss.type === "ironTyrant") {
        // Draw intimidating eyes
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
      else if (boss.type === "voidLeviathan") {
        
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
      else if (boss.type === "theHive") {
        
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

      // Boss health bar (large and prominent)
      const barWidth = canvas.width * 0.6
      const barHeight = 20
      const barX = (canvas.width - barWidth) / 2
      const barY = canvas.height - 40
      const healthPercent = boss.health / boss.maxHealth

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
      ctx.fillText(`${bossNames[boss.type]} - ${Math.ceil(boss.health)}/${boss.maxHealth}`, canvas.width / 2, barY - 10)
    }

      projectilesRef.current.forEach((proj) => {
      //  ENEMY PROJECTILE 
      if (proj.isEnemyProjectile) {
        // Outer glow
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

        // Crack detail (bio-hint)
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

  const getAlienColor = (type: Enemy["type"]): string => {
    switch (type) {
      case "grunt":
        return "#00ff00"
      case "tank":
        return "#00aa00"
      case "leech":
        return "#ff00ff"
      case "splitter":
        return "#ffff00"
      case "blinker":
        return "#00ffff"
      default:
        return "#00ff00"
    }
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
