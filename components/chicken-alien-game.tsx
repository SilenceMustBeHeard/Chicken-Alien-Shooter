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

  // Common 
  speed: number
  spawnTimer?: number       
  phase?: number           

  // queenXenoHen 
  shootTimer?: number       
  buffRadius?: number       

  //  devourer / theButcher / alienMouse / voidLeviathan 
  chargeDirection?: { x: number; y: number }  

  // voidReaper 
  combatTimer?: number     
  healTimer?: number        
  blinkTimer?: number       
  reaperShootTimer?: number 
  isHealing?: boolean      

  //  plagueBringer 
  auraRadius?: number       
  plagueTimer?: number     

  //  ironTyrant 
  armor?: number            
  maxArmor?: number        
  isArmored?: boolean       

  //  alienMouse 
  attackState?: string      
  attackTimer?: number      
  attackCooldown?: number   
  dashDirX?: number         
  dashDirY?: number         
  dashIsFeint?: boolean    
  burstDashCount?: number   

  //  voidLeviathan 
  leviathanPhase?: "forceField" | "zigzag" | "uroboros"  
  leviathanPhaseTimer?: number  
  leviathanWhipTimer?: number    
  leviathanDashCount?: number    
  leviathanHealTimer?: number   
  leviathanWaveTimer?: number
  leviathanTrail?: { x: number; y: number }[]   
  leviathanHeading?: number
  leviathanBurstTimer?: number
  leviathanTurnTimer?: number
  leviathanWaveCount?: number
leviathanWaveSequenceTimer?: number

// The Hive
  hivePhase?: 1 | 2 | 3 | 4
  hiveAttackTimer?: number
  hiveAttackChoice?: number
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
  isVoidSlash?: boolean
  isVoidOrb?: boolean
  isLeviathanWave?: boolean
  waveAngle?: number
  waveScaleX?: number
  waveScaleY?: number
  waveAge?: number
  waveMaxAge?: number
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
     // "theHive",
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
          if (boss.spawnTimer === undefined) boss.spawnTimer = 0
          boss.spawnTimer += deltaTime

          // State initialization
          if (boss.attackState === undefined) boss.attackState = "stalk"
          if (boss.attackTimer === undefined) boss.attackTimer = 0
          if (boss.attackCooldown === undefined) boss.attackCooldown = 1500
          if (boss.dashDirX === undefined) boss.dashDirX = 0
          if (boss.dashDirY === undefined) boss.dashDirY = 0
          if (boss.dashIsFeint === undefined) boss.dashIsFeint = false

          const dx = player.x - boss.x
          const dy = player.y - boss.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)

          const state = boss.attackState as string
          boss.attackTimer += deltaTime

          // STALK — chase player for 2-3s, then attack

          if (state === "stalk") {
            boss.attackCooldown -= deltaTime

            // Chase at 2× speed
            boss.x += Math.cos(angle) * boss.speed * 3
            boss.y += Math.sin(angle) * boss.speed * 3

            // After cooldown (2-3s), attack
            if (boss.attackCooldown <= 0) {
              boss.attackTimer = 0
              boss.attackState = "dashCharge"
              playSound(800, 0.1, "square")
            }
          }

          // DASH CHARGE — 200ms warning
          else if (state === "dashCharge") {
            boss.x += Math.cos(angle) * boss.speed * 0.3
            boss.y += Math.sin(angle) * boss.speed * 0.3

            if (boss.attackTimer >= 200) {
              boss.attackTimer = 0
              boss.attackState = "dashChase"
              playSound(400, 0.15, "sawtooth")
            }
          }

          // DASH CHASE — chase player at 5× speed for 3-4s

          else if (state === "dashChase") {
            boss.x += Math.cos(angle) * boss.speed * 5
            boss.y += Math.sin(angle) * boss.speed * 5

            // Collision check
            if (
              dist < player.radius + boss.radius &&
              player.invincibleTime <= 0 &&
              !player.shield
            ) {
              player.health -= 10
              player.invincibleTime = 60
              chickenHitSound()
              addScreenShake(8)
              addFloatingText(player.x, player.y - 25, "-10", "#c084fc", 20)

              const pushAngle = Math.atan2(dy, dx)
              player.x += Math.cos(pushAngle) * 60
              player.y += Math.sin(pushAngle) * 60

              createParticles(boss.x, boss.y, "#a855f7")

              if (player.health <= 0) {
                chickenDeathSound()
                gameStateRef.current = "gameOver"
                setGameState("gameOver")
                setFinalScore(scoreRef.current)
                setFinalKillCount(killCountRef.current)
                setFinalWave(waveRef.current)
              }
            }

            // After 3-4s, stop and stun
            if (boss.attackTimer >= 3500) {
              boss.attackTimer = 0
              boss.attackState = "stun"
              playSound(300, 0.3, "triangle")
            }
          }

          
          // STUN — 200ms, immobile, vulnerable

          else if (state === "stun") {
            // Don't move. Player can shoot freely.
            if (boss.attackTimer >= 200) {
              boss.attackTimer = 0

              // Pick random escape direction (away from player)
              const escapeAngle = angle + Math.PI + (Math.random() - 0.5) * 1.2
              boss.dashDirX = Math.cos(escapeAngle)
              boss.dashDirY = Math.sin(escapeAngle)

              boss.attackState = "escape"
              playSound(600, 0.2, "sine")
            }
          }

          // ESCAPE — 2s, flee at 6× speed in random direction
          else if (state === "escape") {
            boss.x += boss.dashDirX * boss.speed * 10
            boss.y += boss.dashDirY * boss.speed * 10

            // Clamp to canvas
            boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
            boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))

            if (boss.attackTimer >= 2000) {
              boss.attackTimer = 0
              boss.attackCooldown = 2000 + Math.random() * 1000  // 2-3s before next stalk attack
              boss.attackState = "stalk"
            }
          }

          break
        }

// Alien Bumblebee

                case "alienBumblebee": {
          if (boss.spawnTimer === undefined) boss.spawnTimer = 0
          boss.spawnTimer += deltaTime

          // State initialization
          if (boss.attackState === undefined) boss.attackState = "patrol"
          if (boss.attackTimer === undefined) boss.attackTimer = 0
          if (boss.attackCooldown === undefined) boss.attackCooldown = 4000
          if (boss.dashDirX === undefined) boss.dashDirX = 0
          if (boss.dashDirY === undefined) boss.dashDirY = 0

          const dx = player.x - boss.x
          const dy = player.y - boss.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)

          const state = boss.attackState as string
          boss.attackTimer += deltaTime

          // PATROL — figure eight for 4s

          if (state === "patrol") {
            boss.attackCooldown -= deltaTime

            // Figure eight patrol
            boss.x += Math.sin(Date.now() / 500) * 2.5
            boss.y += Math.cos(Date.now() / 700) * 1.5

            // Clamp to canvas
            boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
            boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))

            // After 4s, windup
            if (boss.attackCooldown <= 0) {
              boss.attackTimer = 0
              boss.attackState = "windup"
              playSound(900, 0.1, "square")
            }
          }

          // WINDUP — 400ms, shake in place

          else if (state === "windup") {
            // Shake in place
            boss.x += (Math.random() - 0.5) * 3
            boss.y += (Math.random() - 0.5) * 3

            // Lock direction toward player
            boss.dashDirX = Math.cos(angle)
            boss.dashDirY = Math.sin(angle)

            if (boss.attackTimer >= 400) {
              boss.attackTimer = 0
              boss.attackState = "dash"
              playSound(600, 0.15, "sawtooth")
            }
          }

          // DASH — 2000ms, fast lunge toward player

          else if (state === "dash") {
            boss.x += boss.dashDirX * boss.speed * 17
            boss.y += boss.dashDirY * boss.speed * 17

            // Collision check
            if (
              dist < player.radius + boss.radius &&
              player.invincibleTime <= 0 &&
              !player.shield
            ) {
              player.health -= 12
              player.invincibleTime = 60
              chickenHitSound()
              addScreenShake(8)
              addFloatingText(player.x, player.y - 25, "-12", "#facc15", 20)

              const pushAngle = Math.atan2(dy, dx)
              player.x += Math.cos(pushAngle) * 60
              player.y += Math.sin(pushAngle) * 60

              createParticles(boss.x, boss.y, "#facc15")

              if (player.health <= 0) {
                chickenDeathSound()
                gameStateRef.current = "gameOver"
                setGameState("gameOver")
                setFinalScore(scoreRef.current)
                setFinalKillCount(killCountRef.current)
                setFinalWave(waveRef.current)
              }
            }

            // Clamp to canvas
            boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
            boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))

            // After 2000ms, back to patrol
            if (boss.attackTimer >= 2000) {
              boss.attackTimer = 0
              boss.attackCooldown = 4000
              boss.attackState = "patrol"
            }
          }

          break
        }


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
          case "voidReaper":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            const distToPlayer = Math.sqrt(
              (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2
            )

            const healthPercent = boss.health / boss.maxHealth
            const isBerserk = healthPercent < 0.10

            //  HEAL PHASE 
            if (boss.isHealing) {
              boss.healTimer = (boss.healTimer || 0) + deltaTime

              // Heal: +10 HP/sec
              const healPerMs = 10 / 1000
              boss.health = Math.min(boss.maxHealth, boss.health + healPerMs * deltaTime)

              // Spawn mobs every 1s: Math.ceil(HP / 50)
              if (Math.floor(boss.healTimer / 1000) !== Math.floor((boss.healTimer - deltaTime) / 1000)) {
                const mobCount = Math.ceil(boss.health / 50)
                for (let i = 0; i < mobCount; i++) {
                  const angle = Math.random() * Math.PI * 2
                  const spawnDist = boss.radius + 80 + Math.random() * 100
                  enemiesRef.current.push({
                    x: boss.x + Math.cos(angle) * spawnDist,
                    y: boss.y + Math.sin(angle) * spawnDist,
                    radius: 12,
                    speed: 0.6,
                    health: 2,
                    maxHealth: 2,
                    groupId: Date.now() + i,
                    type: "grunt",
                    alienType: "grunt",
                    color: getAlienColor("grunt"),
                  })
                }
              }

              // End heal after 5s
              if (boss.healTimer >= 5000) {
                boss.isHealing = false
                boss.healTimer = 0
                boss.combatTimer = 0
                boss.blinkTimer = 0
                boss.reaperShootTimer = 0
              }

              // Contact damage still applies during heal
              if (distToPlayer < player.radius + boss.radius * 0.85) {
                if (player.invincibleTime <= 0 && !player.shield) {
                  player.health -= 10
                  player.invincibleTime = 60
                  chickenHitSound()
                  addScreenShake(5)
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
            } else {
              //  COMBAT PHASE 
              boss.combatTimer = (boss.combatTimer || 0) + deltaTime

              // Check if 10s combat ended
              if (boss.combatTimer >= 10000) {
                if (healthPercent < 0.5 && !isBerserk) {
                  // Enter heal
                  boss.isHealing = true
                  boss.healTimer = 0
                  boss.combatTimer = 0
                  boss.blinkTimer = 0
                  boss.reaperShootTimer = 0
                } else {
                  // Continue combat
                  boss.combatTimer = 0
                }
              }

              if (isBerserk) {
                //  BERSERK  //
                // Fast blink every 2.5s
                boss.blinkTimer = (boss.blinkTimer || 0) + deltaTime
                if (boss.blinkTimer >= 2500) {
                  boss.blinkTimer = 0
                  boss.x = Math.random() * (canvas.width - boss.radius * 2) + boss.radius
                  boss.y = Math.random() * (canvas.height - boss.radius * 2) + boss.radius
                  createParticles(boss.x, boss.y, "#ff0000")
                }

                // Spawn 5 mobs every 2s
                if (Math.floor(boss.combatTimer / 2000) !== Math.floor((boss.combatTimer - deltaTime) / 2000)) {
                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2
                    const spawnDist = boss.radius + 100 + Math.random() * 50
                    enemiesRef.current.push({
                      x: boss.x + Math.cos(angle) * spawnDist,
                      y: boss.y + Math.sin(angle) * spawnDist,
                      radius: 12,
                      speed: 0.8,
                      health: 2,
                      maxHealth: 2,
                      groupId: Date.now() + i,
                      type: "grunt",
                      alienType: "grunt",
                      color: getAlienColor("grunt"),
                    })
                  }
                }

                // Shoot every 1s
                boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
                if (boss.reaperShootTimer >= 2000) {
                  boss.reaperShootTimer = 0
                  const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
                  for (let i = -1; i <= 1; i++) {
                    const spreadAngle = angleToPlayer + i * 0.15
                    projectilesRef.current.push({
                      x: boss.x,
                      y: boss.y,
                      radius: 10,
                      vx: Math.cos(spreadAngle) * 6,
                      vy: Math.sin(spreadAngle) * 6,
                      damage: 10,
                      color: "#ff0000",
                      isEnemyProjectile: true,
                      isVoidSlash: true,
                    })
                  }
                  playSound(300, 0.15, "sawtooth")
                }
              } else {
                //  NORMAL COMBAT 
                // Blink every 4s
                boss.blinkTimer = (boss.blinkTimer || 0) + deltaTime
                if (boss.blinkTimer >= 4000) {
                  boss.blinkTimer = 0
                  let newX = boss.x
                  let newY = boss.y
                  for (let attempt = 0; attempt < 10; attempt++) {
                    newX = Math.random() * (canvas.width - boss.radius * 2) + boss.radius
                    newY = Math.random() * (canvas.height - boss.radius * 2) + boss.radius
                    const d = Math.sqrt((newX - player.x) ** 2 + (newY - player.y) ** 2)
                    if (d > 200) break
                  }
                  createParticles(boss.x, boss.y, "#a855f7")
                  boss.x = newX
                  boss.y = newY
                  createParticles(boss.x, boss.y, "#a855f7")
                }

                // Scythe Slash every 1.5s (3 aimed crescents)
                boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
                if (boss.reaperShootTimer >= 2000) {
                  boss.reaperShootTimer = 0
                  const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
                  for (let i = -1; i <= 1; i++) {
                    const spreadAngle = angleToPlayer + i * 0.15
                    projectilesRef.current.push({
                      x: boss.x,
                      y: boss.y,
                      radius: 10,
                      vx: Math.cos(spreadAngle) * 6,
                      vy: Math.sin(spreadAngle) * 6,
                      damage: 10,
                      color: "#c084fc",
                      isEnemyProjectile: true,
                      isVoidSlash: true,
                    })
                  }
                  playSound(400, 0.12, "sine")
                }

                // Void Orbs every 3s (8 radial)
                if (Math.floor(boss.combatTimer / 3000) !== Math.floor((boss.combatTimer - deltaTime) / 3000)) {
                  for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2
                    projectilesRef.current.push({
                      x: boss.x,
                      y: boss.y,
                      radius: 12,
                      vx: Math.cos(angle) * 3,
                      vy: Math.sin(angle) * 3,
                      damage: 8,
                      color: "#7c3aed",
                      isEnemyProjectile: true,
                      isVoidOrb: true,
                    })
                  }
                  playSound(600, 0.15, "triangle")
                }
              }

              // Contact damage
              if (distToPlayer < player.radius + boss.radius * 0.85) {
                if (player.invincibleTime <= 0 && !player.shield) {
                  const damage = isBerserk ? 25 : 15
                  player.health -= damage
                  player.invincibleTime = 60
                  chickenHitSound()
                  addScreenShake(isBerserk ? 15 : 10)
                  addFloatingText(player.x, player.y - 30, `-${damage}`, "#ff0000", 22)
                  const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                  player.x += Math.cos(pushAngle) * 40
                  player.y += Math.sin(pushAngle) * 40
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
          break

          // PLAGUE BRINGER 

               case "plagueBringer":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            if (boss.plagueTimer === undefined) boss.plagueTimer = 0
            boss.plagueTimer += deltaTime

            const distToPlayer = Math.sqrt(
              (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2
            )

            const healthPercent = boss.health / boss.maxHealth
            const isBerserk = healthPercent < 0.15

            // Aura radius (250 normal, 350 berserk)
            const currentAuraRadius = isBerserk ? 350 : (boss.auraRadius || 250)

            //  SLOW CHASE 
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            boss.x += Math.cos(angle) * boss.speed
            boss.y += Math.sin(angle) * boss.speed

            //  DPS AURA 
            if (distToPlayer < currentAuraRadius) {
              // Player takes damage per second
              const dps = isBerserk ? 20 : 10
              const damagePerFrame = (dps / 1000) * deltaTime

              // Apply damage (no invincibility — it's a DoT)
              player.health -= damagePerFrame

              // Visual feedback (floating text every ~1s)
              if (Math.floor(boss.plagueTimer / 1000) !== Math.floor((boss.plagueTimer - deltaTime) / 1000)) {
                addFloatingText(player.x, player.y - 30, `-${dps}`, "#84cc16", 16)
              }

              if (player.health <= 0) {
                chickenDeathSound()
                gameStateRef.current = "gameOver"
                setGameState("gameOver")
                setFinalScore(scoreRef.current)
                setFinalKillCount(killCountRef.current)
                setFinalWave(waveRef.current)
              }
            }

            //  HEAL MUTATE MOBS IN AURA 
            enemiesRef.current.forEach((enemy) => {
              const dx = enemy.x - boss.x
              const dy = enemy.y - boss.y
              const dist = Math.sqrt(dx * dx + dy * dy)

              if (dist < currentAuraRadius) {
                // Heal mobs (up to maxHealth)
                const healPerFrame = (2 / 1000) * deltaTime
                enemy.health = Math.min(enemy.maxHealth, enemy.health + healPerFrame)

                // Boost speed (up to 7x normal speed)
                if (enemy.speed < 7) {
                  enemy.speed = Math.min(7, enemy.speed + (0.005 / 1000) * deltaTime)
                }

                // Green color for mutated mobs
                if (enemy.color !== "#84cc16") {
                  enemy.color = "#84cc16"
                }
              }
            })

            //  SPAWN PLAGUE RATS (6 every 4s) 
            const spawnInterval = 4000
            if (Math.floor(boss.plagueTimer / spawnInterval) !== Math.floor((boss.plagueTimer - deltaTime) / spawnInterval)) {
              for (let i = 0; i < 6; i++) {
                const spawnAngle = Math.random() * Math.PI * 2
                const spawnDist = boss.radius + 60 + Math.random() * 80
                enemiesRef.current.push({
                  x: boss.x + Math.cos(spawnAngle) * spawnDist,
                  y: boss.y + Math.sin(spawnAngle) * spawnDist,
                  radius: 9,
                  speed: 6,
                  health: 3,
                  maxHealth: 3,
                  groupId: Date.now() + i,
                  type: "grunt",
                  alienType: "grunt",
                  color: "#84cc16",
                })
              }
              playSound(250, 0.2, "sawtooth")
            }

            //  SHOOT PLAGUE BALL 
            const shootInterval = isBerserk ? 700 : 1500

            boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
            if (boss.reaperShootTimer >= shootInterval) {
              boss.reaperShootTimer = 0

              const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x)
              projectilesRef.current.push({
                x: boss.x,
                y: boss.y,
                radius: 18,
                vx: Math.cos(angleToPlayer) * 2.5,
                vy: Math.sin(angleToPlayer) * 2.5,
                damage: 15,
                explosive: true,
                explosionRadius: 60,
                color: "#84cc16",
                isEnemyProjectile: true,
              })
              playSound(200, 0.25, "sawtooth")
            }

            //  CONTACT DAMAGE 
            if (distToPlayer < player.radius + boss.radius * 0.85) {
              if (player.invincibleTime <= 0 && !player.shield) {
                const damage = isBerserk ? 25 : 20
                player.health -= damage
                player.invincibleTime = 60
                chickenHitSound()
                addScreenShake(isBerserk ? 15 : 10)
                addFloatingText(player.x, player.y - 30, `-${damage}`, "#84cc16", 22)

                const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                player.x += Math.cos(pushAngle) * 40
                player.y += Math.sin(pushAngle) * 40

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

       // IRON TYRANT
        case "ironTyrant":
          {
            if (boss.spawnTimer === undefined) boss.spawnTimer = 0
            boss.spawnTimer += deltaTime

            if (boss.armor === undefined) boss.armor = 400
            if (boss.maxArmor === undefined) boss.maxArmor = 400
            if (boss.isArmored === undefined) boss.isArmored = true

            const distToPlayer = Math.sqrt(
              (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2
            )
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x)
            const healthPercent = boss.health / boss.maxHealth
            const isBerserk = healthPercent < 0.30

            //  BERSERK: pure melee, very fast 
            if (isBerserk) {
              boss.x += Math.cos(angle) * boss.speed * 4
              boss.y += Math.sin(angle) * boss.speed * 4

              boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
              if (distToPlayer < 200 && boss.reaperShootTimer >= 800) {
                boss.reaperShootTimer = 0

                if (player.invincibleTime <= 0 && !player.shield) {
                  player.health -= 70
                  player.invincibleTime = 60
                  chickenHitSound()
                  addScreenShake(22)
                  addFloatingText(player.x, player.y - 30, "-70", "#ff0000", 28)

                  const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                  player.x += Math.cos(pushAngle) * 100
                  player.y += Math.sin(pushAngle) * 100

                  createParticles(boss.x, boss.y, "#ff0000")

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

            } else if (boss.isArmored) {
              //  ARMORED: slow, cannon + light melee (150) 
              boss.x += Math.cos(angle) * boss.speed * 0.7
              boss.y += Math.sin(angle) * boss.speed * 0.7

              // Cannon: 3 balls every 2s
              boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
              if (boss.reaperShootTimer >= 2000) {
                boss.reaperShootTimer = 0

                for (let i = -1; i <= 1; i++) {
                  const spreadAngle = angle + i * 0.15
                  projectilesRef.current.push({
                    x: boss.x,
                    y: boss.y,
                    radius: 14,
                    vx: Math.cos(spreadAngle) * 3,
                    vy: Math.sin(spreadAngle) * 3,
                    damage: 15,
                    color: "#94a3b8",
                    isEnemyProjectile: true,
                  })
                }
                playSound(200, 0.25, "square")
              }

              // Light melee (range 150, 25 dmg, 1.5s cooldown)
              if (boss.combatTimer === undefined) boss.combatTimer = 0
              boss.combatTimer += deltaTime

              if (distToPlayer < 150 && boss.combatTimer >= 1500) {
                boss.combatTimer = 0

                if (player.invincibleTime <= 0 && !player.shield) {
                  player.health -= 25
                  player.invincibleTime = 60
                  chickenHitSound()
                  addScreenShake(10)
                  addFloatingText(player.x, player.y - 30, "-25", "#ff0000", 20)

                  const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                  player.x += Math.cos(pushAngle) * 50
                  player.y += Math.sin(pushAngle) * 50

                  createParticles(boss.x, boss.y, "#94a3b8")

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

              // Contact damage (reduced, armored)
              if (distToPlayer < player.radius + boss.radius * 0.85) {
                if (player.invincibleTime <= 0 && !player.shield) {
                  player.health -= 30
                  player.invincibleTime = 60
                  chickenHitSound()
                  addScreenShake(8)
                  addFloatingText(player.x, player.y - 30, "-30", "#ff0000", 28)

                  const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                  player.x += Math.cos(pushAngle) * 40
                  player.y += Math.sin(pushAngle) * 40

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
            } else {
              //  UNARMORED: fast, projectiles + melee (250) 
              boss.x += Math.cos(angle) * boss.speed * 1.2
              boss.y += Math.sin(angle) * boss.speed * 1.2

              // 6 spread projectiles every 1.5s
              boss.reaperShootTimer = (boss.reaperShootTimer || 0) + deltaTime
              if (boss.reaperShootTimer >= 1500) {
                boss.reaperShootTimer = 0

                for (let i = 0; i < 6; i++) {
                  const spreadAngle = angle + (i - 2.5) * 0.12
                  projectilesRef.current.push({
                    x: boss.x,
                    y: boss.y,
                    radius: 7,
                    vx: Math.cos(spreadAngle) * 4,
                    vy: Math.sin(spreadAngle) * 4,
                    damage: 10,
                    color: "#dc2626",
                    isEnemyProjectile: true,
                  })
                }
                playSound(400, 0.15, "sawtooth")
              }

              // Melee (range 250, 50 dmg, 1.5s cooldown)
              if (boss.combatTimer === undefined) boss.combatTimer = 0
              boss.combatTimer += deltaTime

              if (distToPlayer < 250 && boss.combatTimer >= 1500) {
                boss.combatTimer = 0

                if (player.invincibleTime <= 0 && !player.shield) {
                  player.health -= 50
                  player.invincibleTime = 60
                  chickenHitSound()
                  addScreenShake(15)
                  addFloatingText(player.x, player.y - 30, "-50", "#ff0000", 28)

                  const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x)
                  player.x += Math.cos(pushAngle) * 70
                  player.y += Math.sin(pushAngle) * 70

                  createParticles(boss.x, boss.y, "#dc2626")

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
          break

          
          
          // VOID LEVIATHAN
            case "voidLeviathan": {
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
              Math.cos(angleToPlayer - heading)
            )

            boss.leviathanHeading =
              heading + Math.max(-0.035, Math.min(0.035, turn)) * frameScale

            boss.x +=
              Math.cos(boss.leviathanHeading) * boss.speed * 0.5 * frameScale
            boss.y +=
              Math.sin(boss.leviathanHeading) * boss.speed * 0.5 * frameScale

            // Fire three waves in sequence, not three simultaneous bullets
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

                projectilesRef.current.push({
                  x: tailX,
                  y: tailY,
                  radius: boss.radius * 1.2,
                  vx: Math.cos(angleToPlayer) * 2,
                  vy: Math.sin(angleToPlayer) * 2,
                  damage: 50, 
                  color: "#a855f7",
                  isEnemyProjectile: true,
                  isLeviathanWave: true,
                  waveAngle: angleToPlayer,
                  waveScaleX: 1,
                  waveScaleY: 0.3,
                  waveAge: 0,
                  waveMaxAge: 3000, 
                } as typeof projectilesRef.current[number])

                playSound(300, 0.12, "sawtooth")

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
              playSound(600, 0.3, "square")
            }
          }

          // PHASE 2: ZIGZAG HUNT — 10 seconds, vulnerable
          else if (boss.leviathanPhase === "zigzag") {
            boss.leviathanTurnTimer += deltaTime

            // Four acceleration bursts, spread across the 10-second hunt.
            if (
              boss.leviathanDashCount < 4 &&
              boss.leviathanTurnTimer >= 2000
            ) {
              boss.leviathanTurnTimer -= 2000
              boss.leviathanDashCount += 1
              boss.leviathanBurstTimer = 350

              playSound(
                450 + boss.leviathanDashCount * 70,
                0.12,
                "sawtooth"
              )
              addScreenShake(5)
            }

            boss.leviathanBurstTimer = Math.max(
              0,
              boss.leviathanBurstTimer - deltaTime
            )

            const weave = Math.sin(boss.leviathanPhaseTimer / 190) * 0.9
            const diagonalOffset = Math.sin(boss.leviathanPhaseTimer / 420) * 0.45

            const desiredAngle = angleToPlayer + weave + diagonalOffset

            const heading = boss.leviathanHeading ?? angleToPlayer
            const angleDifference = Math.atan2(
              Math.sin(desiredAngle - heading),
              Math.cos(desiredAngle - heading)
            )

            const turnRate = 0.15 * frameScale

            boss.leviathanHeading =
              heading +
              Math.max(-turnRate, Math.min(turnRate, angleDifference))

            const moveSpeed =
              boss.speed * (boss.leviathanBurstTimer > 0 ? 5 : 2.5)

            boss.x +=
              Math.cos(boss.leviathanHeading) * moveSpeed * frameScale
            boss.y +=
              Math.sin(boss.leviathanHeading) * moveSpeed * frameScale

            const pdx = player.x - boss.x
            const pdy = player.y - boss.y
            const postMoveDist = Math.hypot(pdx, pdy)

            if (
              postMoveDist < player.radius + boss.radius &&
              player.invincibleTime <= 0 &&
              !player.shield
            ) {
              player.health -= 25
              player.invincibleTime = 60

              chickenHitSound()
              addScreenShake(15)
              addFloatingText(
                player.x, player.y - 30, "-25", "#a855f7", 24
              )

              const pushAngle = Math.atan2(pdy, pdx)
              player.x += Math.cos(pushAngle) * 80
              player.y += Math.sin(pushAngle) * 80

              createParticles(boss.x, boss.y, "#a855f7")

              if (player.health <= 0) {
                chickenDeathSound()
                gameStateRef.current = "gameOver"
                setGameState("gameOver")
                setFinalScore(scoreRef.current)
                setFinalKillCount(killCountRef.current)
                setFinalWave(waveRef.current)
              }
            }

            if (boss.leviathanPhaseTimer >= 10000) {
              boss.leviathanPhase = "uroboros"
              boss.leviathanPhaseTimer = 0
              boss.leviathanHealTimer = 0
              boss.leviathanBurstTimer = 0
              boss.leviathanTurnTimer = 0

              playSound(400, 0.4, "triangle")
            }
          }

          // PHASE 3: OUROBOROS — 4 seconds
          else if (boss.leviathanPhase === "uroboros") {
            // Heal 20 HP per second.
            boss.health = Math.min(
              boss.maxHealth,
              boss.health + 20 * deltaTime / 1000
             
            )

            if (dist < 300 + player.radius) {
              player.health -= 35 * deltaTime / 1000
               addScreenShake(10)
              if(player.health <= 0) {

              chickenDeathSound()
              addScreenShake(30)

              gameStateRef.current = "gameOver"
              setGameState("gameOver")
              setFinalScore(scoreRef.current)
              setFinalKillCount(killCountRef.current)
              setFinalWave(waveRef.current)
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

              playSound(800, 0.3, "sine")
            }
          }

          // Update the trail AFTER movement
          if (!boss.leviathanTrail) {
            boss.leviathanTrail = []
          }

          boss.leviathanTrail.unshift({ x: boss.x, y: boss.y })

          if (boss.leviathanTrail.length > 22) {
            boss.leviathanTrail.length = 22
          }

          break
        }


              case "theHive": {
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
            // Chaotic movement — random walk + slight drift toward player
            const driftX = Math.cos(angle) * boss.speed * 0.5
            const driftY = Math.sin(angle) * boss.speed * 0.5
            const chaosX = (Math.random() - 0.5) * boss.speed * 2
            const chaosY = (Math.random() - 0.5) * boss.speed * 2

                        //  SHOCK AURA (arms whipping) 

            const shockAuraRadius = boss.radius * 3 // 3× body radius
            const isInShockAura = dist < shockAuraRadius + player.radius

            if (isInShockAura && player.invincibleTime <= 0 && !player.shield) {
              // 10 damage per second (10 / 1000 * deltaTime)
              const shockDps = 10
              const damagePerFrame = (shockDps / 1000) * deltaTime
              player.health -= damagePerFrame

              // Visual feedback (floating text every ~1s)
              if (Math.floor(boss.spawnTimer / 1000) !== Math.floor((boss.spawnTimer - deltaTime) / 1000)) {
                addFloatingText(player.x, player.y - 30, `-${shockDps}`, "#fbbf24", 16)
              }

              if (player.health <= 0) {
                chickenDeathSound()
                gameStateRef.current = "gameOver"
                setGameState("gameOver")
                setFinalScore(scoreRef.current)
                setFinalKillCount(killCountRef.current)
                setFinalWave(waveRef.current)
              }
            }

            boss.x += (driftX + chaosX) * (deltaTime / 16.667)
            boss.y += (driftY + chaosY) * (deltaTime / 16.667)

            // Clamp to canvas (with margin for body)
            boss.x = Math.max(boss.radius, Math.min(canvas.width - boss.radius, boss.x))
            boss.y = Math.max(boss.radius, Math.min(canvas.height - boss.radius, boss.y))

            // Attack timer — every 1.5s
            boss.hiveAttackTimer = (boss.hiveAttackTimer || 0) + deltaTime
            if (boss.hiveAttackTimer >= 1500) {
              boss.hiveAttackTimer = 0

              // Random attack choice: 0 = spread, 1 = radial, 2 = spawn minions
              const choice = Math.floor(Math.random() * 3)
              boss.hiveAttackChoice = choice

              if (choice === 0) {
                // Spread shot — 5 projectiles in cone
                for (let i = -2; i <= 2; i++) {
                  const spreadAngle = angle + i * 0.18
                  projectilesRef.current.push({
                    x: boss.x,
                    y: boss.y,
                    radius: 8,
                    vx: Math.cos(spreadAngle) * 4,
                    vy: Math.sin(spreadAngle) * 4,
                    damage: 10,
                    color: "#fbbf24",
                    isEnemyProjectile: true,
                  })
                }
                playSound(400, 0.15, "square")
              } else if (choice === 1) {
                // Radial burst — 8 projectiles in circle
                for (let i = 0; i < 8; i++) {
                  const radialAngle = (i / 8) * Math.PI * 2
                  projectilesRef.current.push({
                    x: boss.x,
                    y: boss.y,
                    radius: 7,
                    vx: Math.cos(radialAngle) * 3.5,
                    vy: Math.sin(radialAngle) * 3.5,
                    damage: 8,
                    color: "#f97316",
                    isEnemyProjectile: true,
                  })
                }
                playSound(500, 0.2, "sawtooth")
              } else {
                // Spawn 2 minions (grunts)
                for (let i = 0; i < 2; i++) {
                  const minionAngle = Math.random() * Math.PI * 2
                  const spawnDist = boss.radius + 60 + Math.random() * 40
                  enemiesRef.current.push({
                    x: boss.x + Math.cos(minionAngle) * spawnDist,
                    y: boss.y + Math.sin(minionAngle) * spawnDist,
                    radius: 12,
                    speed: 1.0,
                    health: 3,
                    maxHealth: 3,
                    groupId: Date.now() + i,
                    type: "grunt",
                    alienType: "grunt",
                    color: getAlienColor("grunt"),
                  })
                }
                playSound(600, 0.25, "triangle")
              }
            }

            // Melee damage if player is very close
            if (dist < 100 + player.radius) {
              if (player.invincibleTime <= 0 && !player.shield) {
                player.health -= 20
                player.invincibleTime = 60
                chickenHitSound()
                addScreenShake(12)
                addFloatingText(player.x, player.y - 30, "-20", "#fbbf24", 22)

                const pushAngle = Math.atan2(dy, dx)
                player.x += Math.cos(pushAngle) * 50
                player.y += Math.sin(pushAngle) * 50

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

            // PHASE TRANSITION: HP < 600
            if (boss.health <= 600) {
              // TODO: transition to Phase 2 (2 hive lords)
              // For now, just log
              console.log("[HIVE] Phase 1 → Phase 2 transition (not yet implemented)")
              boss.hivePhase = 2
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


            //  LEVIATHAN WAVE ( collision + kick) 
        
      if (proj.isLeviathanWave) {
        proj.waveAge = (proj.waveAge || 0) + deltaTime

        // Age out
        if (proj.waveAge >= (proj.waveMaxAge || 5500)) {
          return false
        }

        // The wave expands over time (matches visual)
        const waveMaxAge = proj.waveMaxAge || 5500
        const waveProgress = Math.min(proj.waveAge / waveMaxAge, 4)  // cap at 4x expansion
        const currentRadius = proj.radius * (1 + waveProgress * 3.5)

        // Skip if player is invincible or shielded
        if (player.invincibleTime > 0) return true

        // Collision check with EXPANDED radius
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

            // Massive kickback — to opposite side of map
            const pushAngle = Math.atan2(waveDy, waveDx)
            const mapDiagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
            const kickDistance = mapDiagonal * 1.2

            player.x += Math.cos(pushAngle) * kickDistance
            player.y += Math.sin(pushAngle) * kickDistance

            // Clamp to canvas
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
          return false  // consume wave
        }

        return true  // keep wave alive
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
  // VOID LEVIATHAN: vulnerable only during zigzag
  if (
    boss.type === "voidLeviathan" &&
    boss.leviathanPhase !== "zigzag"
  ) {
    // Absorb the projectile without dealing damage
    createParticles(proj.x, proj.y, "#a855f7")
    playSound(300, 0.08, "sine")

    if (!proj.piercing) {
      proj.dead = true
      return false
    }
  } else {
    // If armored, damage armor first
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
        spawnWeaponPowerUp(
          boss.x + (Math.random() - 0.5) * 80,
          boss.y + (Math.random() - 0.5) * 80
        )
      }

      bossRef.current = null
      lastBossWaveRef.current = waveRef.current
    }

    if (!proj.piercing) {
      proj.dead = true
      return false
    }
  }
}}


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
          const r = boss.radius
          const t = bossTime
          const bx = boss.x
          const by = boss.y

          //  ATTACK STATE 
          const alienState = String(boss.attackState ?? "stalk")
          const attackTimer = boss.attackTimer ?? 0

          const isChargingDash = alienState === "dashCharge"
          const isDashing = alienState === "dash"
          const isFeint = alienState === "feint"
          const isBurstCharging = alienState === "burstCharge"
          const isBursting = alienState === "burstWave"
          const isRecovery = alienState === "recovery"

          //  HP-BASED COLOR 
          const hpPercent = boss.health / boss.maxHealth
          const isLowHP = hpPercent < 0.5
          const isCriticalHP = hpPercent < 0.25

          //  ANIMATION TIMING 
          const breathPulse = 1 + Math.sin(t / 180) * 0.05
          const tailWave = Math.sin(t / 145)
          const earWave = Math.sin(t / 260) * 0.1

          // Charge squash / dash stretch
          const chargeProgress = isChargingDash ? Math.min(attackTimer / 500, 1) : 0
          const squash = isChargingDash ? 1 - chargeProgress * 0.12 : 1
          const stretch = isDashing ? 1.15 : 1

          // Blink animation (every 3.5s, 150ms)
          const blinkCycle = t % 3500
          const isBlinking = blinkCycle > 3350

          // Recovery wobble
          const recoveryWobble = isRecovery ? Math.sin(t / 80) * 0.08 : 0

          //  LOOK DIRECTION 
          const lookDir = angleToPlayer > -Math.PI / 2 && angleToPlayer < Math.PI / 2 ? 1 : -1
          const headShift = lookDir * r * 0.08
          const headTilt = lookDir * 0.08
          const pupilShiftX = lookDir * r * 0.06

          //  AURA 
          ctx.save()
          ctx.globalCompositeOperation = "lighter"

          const auraColor = isCriticalHP
            ? { r: 255, g: 30, b: 30 }
            : isLowHP
              ? { r: 200, g: 50, b: 180 }
              : { r: 149, g: 18, b: 205 }

          const aura = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 1.70)
          aura.addColorStop(0, `rgba(${auraColor.r}, ${auraColor.g}, ${auraColor.b}, 0.65)`)
          aura.addColorStop(0.55, `rgba(${auraColor.r + 20}, ${auraColor.g + 60}, ${auraColor.b + 20}, 0.55)`)
          aura.addColorStop(1, `rgba(${auraColor.r + 30}, ${auraColor.g + 70}, ${auraColor.b + 20}, 0.6)`)

          ctx.fillStyle = aura
          ctx.beginPath()
          ctx.arc(bx, by, r * 1.70, 0, Math.PI * 2)
          ctx.fill()

          // Orbiting particles
          for (let i = 0; i < 6; i++) {
            const angle = t / 700 + (i * Math.PI) / 3
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

          //  TAIL 
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

          //  BODY (with squash/stretch)  //
          ctx.save()

          const bodyScaleX = squash / stretch
          const bodyScaleY = squash * stretch

          ctx.translate(bx, by + r * 0.15)
          ctx.scale(bodyScaleX, bodyScaleY)
          ctx.translate(-bx, -(by + r * 0.15))

          // Body shadow
          ctx.fillStyle = "#1e0838"
          ctx.beginPath()
          ctx.ellipse(bx, by + r * 0.6, r * 0.95, r * 0.5, 0, 0, Math.PI * 2)
          ctx.fill()

          // Body
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

          // Armor plates
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

          // Glow cracks
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

          ctx.restore() // end body squash/stretch

          //  LEGS (hovering)  
          ctx.lineCap = "round"

          for (let i = 0; i < 4; i++) {
            const side = i < 2 ? -1 : 1
            const idx = i % 2
            const baseX = bx + side * (r * 0.3 + idx * r * 0.35)
            const baseY = by + r * 0.5

            const hover = Math.sin(t / 200 + i * 0.8) * r * 0.08
            const length = r * 0.35

            ctx.strokeStyle = "#7c3aed"
            ctx.lineWidth = r * 0.09
            ctx.beginPath()
            ctx.moveTo(baseX, baseY)
            ctx.lineTo(baseX + side * r * 0.1, baseY + length + hover)
            ctx.stroke()

            // Anti-gravity ring
            ctx.strokeStyle = "rgba(232, 121, 249, 0.6)"
            ctx.lineWidth = r * 0.03
            const ringY = baseY + length + hover + r * 0.15
            const ringScale = 1 + Math.sin(t / 150 + i) * 0.2
            ctx.beginPath()
            ctx.ellipse(baseX + side * r * 0.1, ringY, r * 0.12 * ringScale, r * 0.04 * ringScale, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.lineCap = "butt"

          //  HEAD  
          const headBaseY = by - r * 0.55 + recoveryWobble

          ctx.save()
          ctx.translate(bx, headBaseY)
          ctx.rotate(headTilt)
          ctx.translate(-bx, -headBaseY)

          // Ears
          for (const side of [-1, 1]) {
            ctx.save()
            ctx.translate(bx + side * r * 0.45, headBaseY - r * 0.35)
            ctx.rotate(side * earWave)

            // Charge: ears stand up (less rotation, more vertical)
            const earTilt = isChargingDash ? side * 0.1 : side * earWave

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

          // Head shape (with breath)
          const headCenterX = bx + headShift
          const headCenterY = headBaseY

          ctx.save()
          ctx.translate(headCenterX, headCenterY)
          ctx.scale(breathPulse, breathPulse)
          ctx.translate(-headCenterX, -headCenterY)

          // Head shadow
          ctx.fillStyle = "#1e0838"
          ctx.beginPath()
          ctx.ellipse(headCenterX, headCenterY + r * 0.05, r * 0.6, r * 0.58, 0, 0, Math.PI * 2)
          ctx.fill()

          // Head
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

          // Snout
          ctx.fillStyle = "#c4b5fd"
          ctx.beginPath()
          ctx.ellipse(headCenterX, headCenterY + r * 0.42, r * 0.32, r * 0.28, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // Nose
          ctx.fillStyle = "#f472b6"
          ctx.beginPath()
          ctx.ellipse(headCenterX, headCenterY + r * 0.62, r * 0.08, r * 0.06, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = "#831843"
          ctx.lineWidth = r * 0.015
          ctx.stroke()

          //  EYES (with blink + charge glow)  
          const chargeGlow = isChargingDash ? 12 + chargeProgress * 20 : 0
          const baseEyeGlow = 14 + Math.sin(t / 110) * 7
          const eyeGlow = Math.max(baseEyeGlow, chargeGlow)

          for (const side of [-1, 1]) {
            const ex = headCenterX + side * r * 0.2
            const ey = headCenterY - r * 0.1

            if (isBlinking) {
              // Closed eye (line)
              ctx.strokeStyle = "#170524"
              ctx.lineWidth = r * 0.04
              ctx.lineCap = "round"
              ctx.beginPath()
              ctx.moveTo(ex - r * 0.14, ey)
              ctx.lineTo(ex + r * 0.14, ey)
              ctx.stroke()
              ctx.lineCap = "butt"
            } else {
              // Socket
              ctx.fillStyle = "#170524"
              ctx.beginPath()
              ctx.ellipse(ex, ey, r * 0.14, r * 0.17, side * 0.1, 0, Math.PI * 2)
              ctx.fill()

              // Pupil
              ctx.shadowColor = "#ff00cc"
              ctx.shadowBlur = eyeGlow
              ctx.fillStyle = "#ff006e"
              ctx.beginPath()
              ctx.arc(ex + pupilShiftX, ey + r * 0.05, r * 0.08, 0, Math.PI * 2)
              ctx.fill()
              ctx.shadowBlur = 0

              // Shine
              ctx.fillStyle = "#ffffff"
              ctx.beginPath()
              ctx.arc(ex + pupilShiftX + r * 0.02, ey + r * 0.02, r * 0.03, 0, Math.PI * 2)
              ctx.fill()
            }
          }

          // Whiskers
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

          // Mouth
          ctx.fillStyle = "#10051b"
          ctx.beginPath()
          ctx.ellipse(headCenterX, headCenterY + r * 0.74, r * 0.12, r * 0.06, 0, 0, Math.PI * 2)
          ctx.fill()

          // Fangs
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

          //  RECOVERY: dizzy stars  
          if (isRecovery) {
            ctx.save()
            for (let i = 0; i < 4; i++) {
              const starAngle = t / 200 + (i / 4) * Math.PI * 2
              const starRadius = r * 0.7
              const sx = bx + Math.cos(starAngle) * starRadius
              const sy = headBaseY - r * 0.8 + Math.sin(starAngle) * r * 0.2

              ctx.fillStyle = "#fbbf24"
              ctx.shadowColor = "#fbbf24"
              ctx.shadowBlur = 8

              // 4-point star
              ctx.beginPath()
              ctx.moveTo(sx, sy - r * 0.08)
              ctx.lineTo(sx + r * 0.03, sy - r * 0.02)
              ctx.lineTo(sx + r * 0.08, sy)
              ctx.lineTo(sx + r * 0.03, sy + r * 0.02)
              ctx.lineTo(sx, sy + r * 0.08)
              ctx.lineTo(sx - r * 0.03, sy + r * 0.02)
              ctx.lineTo(sx - r * 0.08, sy)
              ctx.lineTo(sx - r * 0.03, sy - r * 0.02)
              ctx.closePath()
              ctx.fill()
              ctx.shadowBlur = 0
            }
            ctx.restore()
          }
        
      

        // boss Alien Bumblebee

         } else if (boss.type === "alienBumblebee") {
        const t = bossTime
        const r = boss.radius

        //  ATTACK STATE 
        const beeState = String(boss.attackState ?? "patrol")
        const attackTimer = boss.attackTimer ?? 0
        const isWindingUp = beeState === "windup"
        const isDashing = beeState === "dash"

        //  HP-BASED COLOR 
        const hpPercent = boss.health / boss.maxHealth
        const isLowHP = hpPercent < 0.5
        const isCriticalHP = hpPercent < 0.25

        //  ANIMATIONS 
        const wingFlapSpeed = isWindingUp ? 10 : 30
        const wingFlap = Math.sin(t / wingFlapSpeed)
        const bodyBob = Math.sin(t / 220) * r * 0.025
        const legTwitch = Math.sin(t / 75) * r * 0.025
        const cx = boss.x
        const cy = boss.y + bodyBob

        // Blink animation
        const blinkCycle = t % 3500
        const isBlinking = blinkCycle > 3350

        //  DASH TRAIL (behind boss) 
        if (isDashing) {
          ctx.save()
          for (let i = 0; i < 5; i++) {
            const trailOffset = i * r * 0.4
            const tx = cx - (boss.dashDirX || 0) * trailOffset
            const ty = cy - (boss.dashDirY || 0) * trailOffset

            ctx.fillStyle = `rgba(250, 204, 21, ${0.5 - i * 0.1})`
            ctx.beginPath()
            ctx.arc(tx, ty, r * (0.35 - i * 0.06), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()

          // Sparks
          ctx.save()
          for (let i = 0; i < 8; i++) {
            const sparkAngle = (i / 8) * Math.PI * 2 + t / 100
            const sparkDist = r * (0.5 + Math.sin(t / 50 + i) * 0.5)
            const sx = cx + Math.cos(sparkAngle) * sparkDist
            const sy = cy + Math.sin(sparkAngle) * sparkDist

            ctx.fillStyle = "#facc15"
            ctx.globalAlpha = 0.6
            ctx.beginPath()
            ctx.arc(sx, sy, 3, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        //  WINDUP WARNING ───
        if (isWindingUp) {
          const progress = Math.min(attackTimer / 400, 1)

          ctx.save()

          // Pulsing warning ring
          ctx.globalAlpha = 0.4 + progress * 0.5
          ctx.strokeStyle = "#facc15"
          ctx.lineWidth = 4
          ctx.setLineDash([12, 8])
          ctx.lineDashOffset = -t / 20
          ctx.beginPath()
          ctx.arc(cx, cy, r * (1.2 + progress * 0.6), 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          // Direction arrow
          const arrowLength = r * (1.5 + progress * 0.8)
          ctx.globalAlpha = 0.7 + progress * 0.3
          ctx.strokeStyle = "#fef08a"
          ctx.lineWidth = 6
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(
            cx + (boss.dashDirX || 0) * arrowLength,
            cy + (boss.dashDirY || 0) * arrowLength
          )
          ctx.stroke()

          // Arrowhead
          const tipX = cx + (boss.dashDirX || 0) * arrowLength
          const tipY = cy + (boss.dashDirY || 0) * arrowLength
          const perpX = -(boss.dashDirY || 0)
          const perpY = (boss.dashDirX || 0)

          ctx.beginPath()
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(
            tipX - (boss.dashDirX || 0) * r * 0.3 + perpX * r * 0.18,
            tipY - (boss.dashDirY || 0) * r * 0.3 + perpY * r * 0.18
          )
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(
            tipX - (boss.dashDirX || 0) * r * 0.3 - perpX * r * 0.18,
            tipY - (boss.dashDirY || 0) * r * 0.3 - perpY * r * 0.18
          )
          ctx.stroke()

          ctx.lineCap = "butt"
          ctx.restore()
        }

        ctx.save()

        // WINGS

        const drawWing = (side: number, outer: boolean) => {
          ctx.save()

          const wingX = cx + side * r * (outer ? 0.43 : 0.29)
          const wingY = cy - r * 0.36
          const wingLength = r * (outer ? 0.82 : 0.59)
          const wingHeight = r * (outer ? 0.34 : 0.25)
          const flap = wingFlap * (outer ? 0.25 : 0.19)

          ctx.translate(wingX, wingY)
          ctx.rotate(side * (outer ? 0.62 : 0.48) - side * flap)

          // Wings glow more during windup/dash
          const wingAlpha = isWindingUp ? 0.7 : (isDashing ? 0.6 : 1)

          ctx.fillStyle = outer
            ? `rgba(186, 230, 253, ${0.48 * wingAlpha})`
            : `rgba(224, 242, 254, ${0.30 * wingAlpha})`

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

          // Wing veins
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

        drawWing(-1, false)
        drawWing(1, false)
        drawWing(-1, true)
        drawWing(1, true)

        // SEGMENTED LEGS

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

        // FUZZY ABDOMEN (HP-based color)

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

        bodyGrad.addColorStop(0, isCriticalHP ? "#ff9999" : isLowHP ? "#ffcc66" : "#fff9cf")
        bodyGrad.addColorStop(0.35, isCriticalHP ? "#ff3333" : isLowHP ? "#ff9900" : "#facc15")
        bodyGrad.addColorStop(0.75, isCriticalHP ? "#990000" : isLowHP ? "#cc6600" : "#eab308")
        bodyGrad.addColorStop(1, isCriticalHP ? "#450000" : isLowHP ? "#663300" : "#92400e")

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

        // Three horizontal black bands
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

        // HEAD
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

        // Fuzz around head
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

        // COMPOUND EYES (with blink + charge glow)
        for (const side of [-1, 1]) {
          const eyeX = cx + side * r * 0.255
          const eyeY = headY - r * 0.015
          const eyeRX = r * 0.17
          const eyeRY = r * 0.205

          // Blink
          if (isBlinking) {
            ctx.strokeStyle = "#0a0000"
            ctx.lineWidth = r * 0.05
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(eyeX - r * 0.15, eyeY)
            ctx.lineTo(eyeX + r * 0.15, eyeY)
            ctx.stroke()
            ctx.lineCap = "butt"
            continue
          }

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

          // Glow (stronger during windup/dash)
          ctx.save()
          ctx.shadowColor = "#ff2222"
          ctx.shadowBlur = isWindingUp ? r * 0.25 : (isDashing ? r * 0.2 : r * 0.12)

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

          // Facets
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

          // Reflection
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
     
      // boss The Butcher
        
           } else if (boss.type === "theButcher") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const angleToPlayer = playerRef.current
          ? Math.atan2(playerRef.current.y - by, playerRef.current.x - bx)
          : 0

        // Berserk + cycle state
        const healthPercent = boss.health / boss.maxHealth
        const isBerserk = healthPercent < 0.20

        const cycleTime = isBerserk ? 2000 : 5100
        const chaseEnd = isBerserk ? 1000 : 2500
        const windupEnd = isBerserk ? 1300 : 3100
        const chargeEnd = isBerserk ? 1700 : 3600

        const cyclePhase = (boss.spawnTimer || 0) % cycleTime
        const isWindup = cyclePhase >= chaseEnd && cyclePhase < windupEnd
        const isCharging = cyclePhase >= windupEnd && cyclePhase < chargeEnd
        const isStunned = cyclePhase >= chargeEnd
        const isSlashing = isCharging

        const pulse = 1 + Math.sin(t / 300) * 0.03
        const angerGlow = isBerserk
          ? 1.5
          : isCharging ? 1 : isWindup ? 0.8 : isStunned ? 0.1 : 0.3

        const axeSpin = isWindup ? t / 50 : isCharging ? 0 : t / 200
        const axeLift = isWindup ? -r * 0.5 : isCharging ? r * 0.3 : 0

        // AURA (behind body)
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const aura = ctx.createRadialGradient(bx, by, r * 0.4, bx, by, r * 2)
        aura.addColorStop(0, `rgba(180, 20, 20, ${0.15 + angerGlow * 0.2})`)
        aura.addColorStop(0.6, `rgba(120, 10, 10, ${0.08 + angerGlow * 0.1})`)
        aura.addColorStop(1, "rgba(80, 5, 5, 0.63)")
        ctx.fillStyle = aura
        ctx.beginPath()
        ctx.arc(bx, by, r * 2, 0, Math.PI * 4)
        ctx.fill()

        // Berserk pulsing rage aura
        if (isBerserk) {
          const ragePulse = 0.5 + Math.sin(t / 100) * 0.5
          const rageGrad = ctx.createRadialGradient(bx, by, r * 0.8, bx, by, r * 3.5)
          rageGrad.addColorStop(0, `rgba(255, 0, 0, ${0.3 + ragePulse * 0.3})`)
          rageGrad.addColorStop(0.5, `rgba(200, 0, 0, ${0.15 + ragePulse * 0.15})`)
          rageGrad.addColorStop(1, "rgba(100, 0, 0, 0)")
          ctx.fillStyle = rageGrad
          ctx.beginPath()
          ctx.arc(bx, by, r * 3.5, 0, Math.PI * 4)
          ctx.fill()
        }

        // Floating blood droplets
        for (let i = 0; i < 6; i++) {
          const pa = t / 600 + (i / 6) * Math.PI * 2
          const pd = r * (1.3 + Math.sin(t / 250 + i) * 0.2)
          const px = bx + Math.cos(pa) * pd
          const py = by + Math.sin(pa) * pd * 0.7
          ctx.fillStyle = `rgba(180, 20, 20, ${0.5 + Math.sin(t / 100 + i) * 0.3})`
          ctx.beginPath()
          ctx.arc(px, py, r * 0.045, 0, Math.PI * 4)
          ctx.fill()
        }
        ctx.restore()

        // CHARGE TRAIL (motion lines behind butcher)
        if (isCharging && boss.chargeDirection) {
          ctx.save()
          ctx.globalAlpha = 0.6
          for (let i = 0; i < 8; i++) {
            const trailOffset = i * 15 + 20
            const tx = bx - boss.chargeDirection.x * trailOffset
            const ty = by - boss.chargeDirection.y * trailOffset

            ctx.fillStyle = `rgba(220, 30, 30, ${0.7 - i * 0.08})`
            ctx.beginPath()
            ctx.arc(tx, ty, r * (0.4 - i * 0.04), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        }

        // THE BUTCHER — EXECUTIONER BODY
        ctx.save()
        ctx.translate(bx, by)
        ctx.rotate(angleToPlayer)
        ctx.scale(pulse, pulse)

        // Palette
        const flesh = "#641414"
        const fleshLight = "#8f2525"
        const fleshDark = "#210707"
        const metal = "#8c969f"
        const bone = "#e4d4b6"

        // === BACK SHADOW / MASS ===
        ctx.fillStyle = "#100303"
        ctx.beginPath()
        ctx.ellipse(-r * 0.05, r * 0.12, r * 0.88, r * 0.94, 0, 0, Math.PI * 2)
        ctx.fill()

        // === TORSO ===
        const torso = ctx.createLinearGradient(-r, -r, r, r)
        torso.addColorStop(0, fleshLight)
        torso.addColorStop(0.32, flesh)
        torso.addColorStop(0.72, "#3a0909")
        torso.addColorStop(1, fleshDark)

        ctx.fillStyle = torso
        ctx.strokeStyle = "#180303"
        ctx.lineWidth = r * 0.055
        ctx.beginPath()
        ctx.moveTo(-r * 0.28, -r * 0.76)
        ctx.lineTo(-r * 0.7, -r * 0.67)
        ctx.lineTo(-r * 0.98, -r * 0.28)
        ctx.lineTo(-r * 0.8, r * 0.27)
        ctx.lineTo(-r * 0.55, r * 0.53)
        ctx.lineTo(-r * 0.43, r * 0.91)
        ctx.lineTo(r * 0.4, r * 0.91)
        ctx.lineTo(r * 0.56, r * 0.53)
        ctx.lineTo(r * 0.82, r * 0.23)
        ctx.lineTo(r * 0.96, -r * 0.29)
        ctx.lineTo(r * 0.65, -r * 0.7)
        ctx.lineTo(r * 0.25, -r * 0.78)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // === MUSCLE / SCAR RIDGES ===
        ctx.strokeStyle = "rgba(15, 0, 0, 0.65)"
        ctx.lineWidth = r * 0.045
        ctx.lineCap = "round"

        ctx.beginPath()
        ctx.moveTo(-r * 0.48, -r * 0.36)
        ctx.quadraticCurveTo(-r * 0.2, -r * 0.12, -r * 0.24, r * 0.25)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(r * 0.48, -r * 0.34)
        ctx.quadraticCurveTo(r * 0.18, -r * 0.05, r * 0.3, r * 0.22)
        ctx.stroke()

        //  HEAVY SHOULDER ARMOR 
        for (const side of [-1, 1]) {
          const sx = side * r * 0.73
          const sy = -r * 0.48

          const armor = ctx.createLinearGradient(
            sx - r * 0.2, sy - r * 0.2,
            sx + r * 0.2, sy + r * 0.3
          )
          armor.addColorStop(0, "#5d6268")
          armor.addColorStop(0.35, "#24272b")
          armor.addColorStop(0.75, "#111214")
          armor.addColorStop(1, "#050505")

          ctx.fillStyle = armor
          ctx.strokeStyle = "#090909"
          ctx.lineWidth = r * 0.035

          ctx.beginPath()
          ctx.moveTo(sx - side * r * 0.22, sy - r * 0.12)
          ctx.lineTo(sx + side * r * 0.1, sy - r * 0.27)
          ctx.lineTo(sx + side * r * 0.3, sy - r * 0.02)
          ctx.lineTo(sx + side * r * 0.23, sy + r * 0.25)
          ctx.lineTo(sx - side * r * 0.12, sy + r * 0.2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Bone spikes
          ctx.fillStyle = bone
          ctx.strokeStyle = "#51402d"
          ctx.lineWidth = r * 0.018

          ctx.beginPath()
          ctx.moveTo(sx + side * r * 0.02, sy - r * 0.14)
          ctx.lineTo(sx + side * r * 0.3, sy - r * 0.53)
          ctx.lineTo(sx + side * r * 0.23, sy - r * 0.08)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Armor rivets
          ctx.fillStyle = "#b6b9bc"
          ctx.beginPath()
          ctx.arc(sx - side * r * 0.08, sy + r * 0.08, r * 0.025, 0, Math.PI * 2)
          ctx.fill()
        }

        //  LEATHER APRON 
        const apron = ctx.createLinearGradient(0, r * 0.08, 0, r * 0.93)
        apron.addColorStop(0, "#512020")
        apron.addColorStop(0.45, "#281010")
        apron.addColorStop(1, "#100606")

        ctx.fillStyle = apron
        ctx.strokeStyle = "#0b0202"
        ctx.lineWidth = r * 0.04

        ctx.beginPath()
        ctx.moveTo(-r * 0.43, r * 0.06)
        ctx.lineTo(r * 0.43, r * 0.06)
        ctx.lineTo(r * 0.53, r * 0.73)
        ctx.lineTo(r * 0.35, r * 0.91)
        ctx.lineTo(-r * 0.38, r * 0.91)
        ctx.lineTo(-r * 0.53, r * 0.72)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Apron seams
        ctx.strokeStyle = "#754040"
        ctx.lineWidth = r * 0.018
        ctx.beginPath()
        ctx.moveTo(-r * 0.34, r * 0.16)
        ctx.lineTo(-r * 0.4, r * 0.73)
        ctx.moveTo(r * 0.34, r * 0.16)
        ctx.lineTo(r * 0.4, r * 0.73)
        ctx.stroke()

        // Blood stains
        ctx.fillStyle = "rgba(145, 0, 0, 0.75)"
        ctx.beginPath()
        ctx.ellipse(-r * 0.19, r * 0.38, r * 0.13, r * 0.07, -0.5, 0, Math.PI * 2)
        ctx.ellipse(r * 0.17, r * 0.59, r * 0.09, r * 0.12, 0.35, 0, Math.PI * 2)
        ctx.fill()

        // Metal apron buckle
        ctx.fillStyle = "#17191c"
        ctx.fillRect(-r * 0.13, r * 0.1, r * 0.26, r * 0.13)
        ctx.strokeStyle = metal
        ctx.lineWidth = r * 0.025
        ctx.strokeRect(-r * 0.13, r * 0.1, r * 0.26, r * 0.13)

        // === ARMS ===
        ctx.lineCap = "round"

        // Left arm — hanging fist
        ctx.strokeStyle = "#250606"
        ctx.lineWidth = r * 0.21
        ctx.beginPath()
        ctx.moveTo(-r * 0.68, -r * 0.24)
        ctx.lineTo(-r * 0.9, r * 0.24)
        ctx.stroke()

        ctx.strokeStyle = flesh
        ctx.lineWidth = r * 0.15
        ctx.beginPath()
        ctx.moveTo(-r * 0.68, -r * 0.24)
        ctx.lineTo(-r * 0.9, r * 0.24)
        ctx.stroke()

        // Fist
        ctx.fillStyle = "#390909"
        ctx.beginPath()
        ctx.ellipse(-r * 0.92, r * 0.32, r * 0.16, r * 0.18, -0.2, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = "#170303"
        ctx.lineWidth = r * 0.03
        ctx.stroke()

        // Knuckle lines
        ctx.strokeStyle = "#8a2929"
        ctx.lineWidth = r * 0.018
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(-r * (1.01 - i * 0.055), r * 0.26)
          ctx.lineTo(-r * (1.0 - i * 0.055), r * 0.36)
          ctx.stroke()
        }

        // Right arm — gripping the axe
        ctx.strokeStyle = "#220505"
        ctx.lineWidth = r * 0.22
        ctx.beginPath()
        ctx.moveTo(r * 0.65, -r * 0.3)
        ctx.lineTo(r * 0.89, -r * 0.58)
        ctx.stroke()

        ctx.strokeStyle = "#521010"
        ctx.lineWidth = r * 0.15
        ctx.beginPath()
        ctx.moveTo(r * 0.65, -r * 0.3)
        ctx.lineTo(r * 0.89, -r * 0.58)
        ctx.stroke()

        //  AXE 
        ctx.save()
        ctx.translate(r * 0.9, -r * 0.61 + axeLift)
        ctx.rotate(axeSpin)

        // Long, heavy handle
        ctx.strokeStyle = "#160d09"
        ctx.lineWidth = r * 0.085
        ctx.beginPath()
        ctx.moveTo(0, r * 0.1)
        ctx.lineTo(0, -r * 1.15)
        ctx.stroke()

        ctx.strokeStyle = "#76503a"
        ctx.lineWidth = r * 0.045
        ctx.beginPath()
        ctx.moveTo(-r * 0.015, r * 0.02)
        ctx.lineTo(-r * 0.015, -r * 1.1)
        ctx.stroke()

        // Handle bindings
        ctx.strokeStyle = "#17100d"
        ctx.lineWidth = r * 0.055
        for (let i = 0; i < 4; i++) {
          const hy = -r * (0.18 + i * 0.13)
          ctx.beginPath()
          ctx.moveTo(-r * 0.04, hy)
          ctx.lineTo(r * 0.04, hy - r * 0.035)
          ctx.stroke()
        }

        // Oversized cleaver head
        const blade = ctx.createLinearGradient(-r * 0.65, -r, r * 0.1, -r * 0.65)
        blade.addColorStop(0, "#3b4249")
        blade.addColorStop(0.28, "#c8d0d8")
        blade.addColorStop(0.55, "#f1f5f9")
        blade.addColorStop(0.8, "#727d88")
        blade.addColorStop(1, "#252b31")

        ctx.fillStyle = blade
        ctx.strokeStyle = "#111519"
        ctx.lineWidth = r * 0.045

        ctx.beginPath()
        ctx.moveTo(-r * 0.02, -r * 0.98)
        ctx.lineTo(-r * 0.37, -r * 1.08)
        ctx.lineTo(-r * 0.72, -r * 0.91)
        ctx.lineTo(-r * 0.68, -r * 0.48)
        ctx.lineTo(-r * 0.48, -r * 0.34)
        ctx.lineTo(-r * 0.04, -r * 0.47)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Blade edge
        ctx.strokeStyle = "#f0f3f6"
        ctx.lineWidth = r * 0.025
        ctx.beginPath()
        ctx.moveTo(-r * 0.68, -r * 0.48)
        ctx.lineTo(-r * 0.72, -r * 0.91)
        ctx.lineTo(-r * 0.37, -r * 1.08)
        ctx.stroke()

        // Blood on blade
        ctx.strokeStyle = "#8b0000"
        ctx.lineWidth = r * 0.055
        ctx.beginPath()
        ctx.moveTo(-r * 0.49, -r * 0.88)
        ctx.lineTo(-r * 0.34, -r * 0.73)
        ctx.lineTo(-r * 0.46, -r * 0.63)
        ctx.stroke()

        ctx.restore()

        //  HEAD 
        const head = ctx.createRadialGradient(
          -r * 0.12, -r * 0.7, r * 0.04,
          0, -r * 0.57, r * 0.47
        )
        head.addColorStop(0, "#6b1a1a")
        head.addColorStop(0.65, "#310808")
        head.addColorStop(1, "#100202")

        ctx.fillStyle = head
        ctx.strokeStyle = "#100202"
        ctx.lineWidth = r * 0.045

        ctx.beginPath()
        ctx.moveTo(-r * 0.35, -r * 0.82)
        ctx.lineTo(-r * 0.29, -r * 1.0)
        ctx.lineTo(-r * 0.1, -r * 1.04)
        ctx.lineTo(r * 0.12, -r * 0.98)
        ctx.lineTo(r * 0.34, -r * 0.8)
        ctx.lineTo(r * 0.31, -r * 0.48)
        ctx.lineTo(r * 0.16, -r * 0.31)
        ctx.lineTo(-r * 0.19, -r * 0.31)
        ctx.lineTo(-r * 0.34, -r * 0.51)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // === EYES ===
        for (const side of [-1, 1]) {
          const ex = side * r * 0.17
          const ey = -r * 0.7

          ctx.fillStyle = "#080101"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.13, r * 0.105, side * -0.18, 0, Math.PI * 2)
          ctx.fill()

          ctx.shadowColor = isBerserk ? "#ff00ff" : "#ff1717"
          ctx.shadowBlur = isBerserk ? 25 : 7 + angerGlow * 9

          const eye = ctx.createRadialGradient(
            ex, ey, r * 0.01,
            ex, ey, r * 0.09
          )
          eye.addColorStop(0, "#fff1dc")
          eye.addColorStop(0.3, isBerserk ? "#ff5bff" : "#ff5b36")
          eye.addColorStop(0.7, isBerserk ? "#d000d0" : "#e00000")
          eye.addColorStop(1, isBerserk ? "#510051" : "#510000")

          ctx.fillStyle = eye
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.085, r * 0.06, side * -0.18, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          ctx.strokeStyle = "#100202"
          ctx.lineWidth = r * 0.075
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(ex - r * 0.12, ey - r * 0.1)
          ctx.lineTo(ex + r * 0.1, ey - r * 0.045)
          ctx.stroke()
        }

        //  JAW / MOUTH
        ctx.fillStyle = "#080101"
        ctx.beginPath()
        ctx.moveTo(-r * 0.23, -r * 0.47)
        ctx.lineTo(r * 0.23, -r * 0.47)
        ctx.lineTo(r * 0.18, -r * 0.28)
        ctx.lineTo(0, -r * 0.23)
        ctx.lineTo(-r * 0.18, -r * 0.28)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = bone
        ctx.strokeStyle = "#55422e"
        ctx.lineWidth = r * 0.012

        for (const dx of [-r * 0.13, 0, r * 0.13]) {
          ctx.beginPath()
          ctx.moveTo(dx - r * 0.035, -r * 0.46)
          ctx.lineTo(dx + r * 0.035, -r * 0.46)
          ctx.lineTo(dx, -r * 0.34)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        for (const dx of [-r * 0.08, r * 0.08]) {
          ctx.beginPath()
          ctx.moveTo(dx - r * 0.03, -r * 0.29)
          ctx.lineTo(dx + r * 0.03, -r * 0.29)
          ctx.lineTo(dx, -r * 0.39)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        //  LEGS 
        ctx.lineCap = "round"
        ctx.strokeStyle = "#190303"
        ctx.lineWidth = r * 0.2

        ctx.beginPath()
        ctx.moveTo(-r * 0.34, r * 0.78)
        ctx.lineTo(-r * 0.45, r * 1.12)
        ctx.moveTo(r * 0.34, r * 0.78)
        ctx.lineTo(r * 0.45, r * 1.12)
        ctx.stroke()

        ctx.strokeStyle = "#4b0d0d"
        ctx.lineWidth = r * 0.12
        ctx.beginPath()
        ctx.moveTo(-r * 0.34, r * 0.79)
        ctx.lineTo(-r * 0.45, r * 1.1)
        ctx.moveTo(r * 0.34, r * 0.79)
        ctx.lineTo(r * 0.45, r * 1.1)
        ctx.stroke()

        // Heavy boots
        ctx.fillStyle = "#171719"
        for (const side of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(side * r * 0.45, r * 1.02)
          ctx.lineTo(side * r * 0.64, r * 1.13)
          ctx.lineTo(side * r * 0.36, r * 1.17)
          ctx.lineTo(side * r * 0.3, r * 1.08)
          ctx.closePath()
          ctx.fill()
        }

        ctx.lineCap = "butt"

        //  MEAT HOOK 
        ctx.strokeStyle = "#b3bdc7"
        ctx.lineWidth = r * 0.035
        ctx.beginPath()
        ctx.moveTo(-r * 0.83, -r * 0.08)
        ctx.lineTo(-r * 1.02, -r * 0.08)
        ctx.quadraticCurveTo(-r * 1.19, -r * 0.06, -r * 1.14, r * 0.09)
        ctx.quadraticCurveTo(-r * 1.1, r * 0.19, -r * 0.98, r * 0.15)
        ctx.stroke()

        ctx.strokeStyle = "#eef2f5"
        ctx.lineWidth = r * 0.012
        ctx.beginPath()
        ctx.moveTo(-r * 1.02, -r * 0.07)
        ctx.quadraticCurveTo(-r * 1.14, -r * 0.04, -r * 1.1, r * 0.04)
        ctx.stroke()

        ctx.restore() // end body transform

        // STUNNED: dizzy stars
        if (isStunned) {
          ctx.save()
          const starCount = 4
          for (let i = 0; i < starCount; i++) {
            const angle = (t / 300) + (i / starCount) * Math.PI * 2
            const orbitR = r * 0.5
            const sx = bx + Math.cos(angle) * orbitR
            const sy = by - r * 0.9 + Math.sin(angle) * r * 0.15

            ctx.fillStyle = "#fbbf24"
            ctx.shadowColor = "#fbbf24"
            ctx.shadowBlur = 10

            ctx.beginPath()
            ctx.moveTo(sx, sy - r * 0.08)
            ctx.lineTo(sx + r * 0.03, sy - r * 0.02)
            ctx.lineTo(sx + r * 0.08, sy)
            ctx.lineTo(sx + r * 0.03, sy + r * 0.02)
            ctx.lineTo(sx, sy + r * 0.08)
            ctx.lineTo(sx - r * 0.03, sy + r * 0.02)
            ctx.lineTo(sx - r * 0.08, sy)
            ctx.lineTo(sx - r * 0.03, sy - r * 0.02)
            ctx.closePath()
            ctx.fill()
            ctx.shadowBlur = 0
          }
          ctx.restore()
        }

        // BERSERK: rage particles around body
        if (isBerserk) {
          ctx.save()
          for (let i = 0; i < 20; i++) {
            const pa = t / 200 + (i / 12) * Math.PI * 2
            const pd = r * (1.5 + Math.sin(t / 150 + i) * 0.5)
            const px = bx + Math.cos(pa) * pd
            const py = by + Math.sin(pa) * pd * 0.6

            ctx.fillStyle = `rgba(255, 0, 0, ${0.6 + Math.sin(t / 80 + i) * 0.4})`
            ctx.shadowColor = "#ff0000"
            ctx.shadowBlur = 10
            ctx.beginPath()
            ctx.arc(px, py, r * 0.05, 0, Math.PI * 6)
            ctx.fill()
            ctx.shadowBlur = 0
          }
          ctx.restore()

          // Skull indicator
          ctx.save()
          ctx.font = "bold 28px Arial"
          ctx.textAlign = "center"
          ctx.fillStyle = "#ff0000"
          ctx.shadowColor = "#ff0000"
          ctx.shadowBlur = 15
          ctx.fillText("💀", bx, by - r * 1.5 + Math.sin(t / 100) * 5)
          ctx.shadowBlur = 0
          ctx.restore()
        }

        // TELEGRAPH LINE (during windup)
        if (isWindup && boss.chargeDirection) {
          ctx.save()
          const telegraphLength = 2000
          ctx.globalAlpha = 0.4 + Math.sin(t / 40) * 0.3
          ctx.strokeStyle = "#ff0000"
          ctx.lineWidth = 10
          ctx.setLineDash([30, 20])
          ctx.beginPath()
          ctx.moveTo(bx, by)
          ctx.lineTo(bx + boss.chargeDirection.x * telegraphLength, by + boss.chargeDirection.y * telegraphLength)
          ctx.stroke()

          // Arrow at the end
          const endX = bx + boss.chargeDirection.x * telegraphLength
          const endY = by + boss.chargeDirection.y * telegraphLength
          const arrowAngle = Math.atan2(boss.chargeDirection.y, boss.chargeDirection.x)
          const arrowSize = 30

          ctx.setLineDash([])
          ctx.fillStyle = "#ff0000"
          ctx.beginPath()
          ctx.moveTo(endX, endY)
          ctx.lineTo(
            endX - Math.cos(arrowAngle - 0.4) * arrowSize,
            endY - Math.sin(arrowAngle - 0.4) * arrowSize
          )
          ctx.lineTo(
            endX - Math.cos(arrowAngle + 0.4) * arrowSize,
            endY - Math.sin(arrowAngle + 0.4) * arrowSize
          )
          ctx.closePath()
          ctx.fill()

          ctx.restore()
        }
      
      
// boss Void Reaper
        } else if (boss.type === "voidReaper") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const healthPercent = boss.health / boss.maxHealth
        const isBerserk = healthPercent < 0.10
        const isHealing = boss.isHealing || false

        // Wobble animation
        const wobble = Math.sin(t / 400) * r * 0.04
        const hover = Math.sin(t / 250) * r * 0.05

        // Translucent during heal
        ctx.save()
        if (isHealing) {
          ctx.globalAlpha = 0.35
        }

        // Aura
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const auraColor = isBerserk ? "255, 0, 0" : isHealing ? "255, 100, 100" : "168, 85, 247"
        const auraGrad = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 2.5)
        auraGrad.addColorStop(0, `rgba(${auraColor}, 0.25)`)
        auraGrad.addColorStop(0.6, `rgba(${auraColor}, 0.1)`)
        auraGrad.addColorStop(1, `rgba(${auraColor}, 0)`)
        ctx.fillStyle = auraGrad
        ctx.beginPath()
        ctx.arc(bx, by, r * 2.5, 0, Math.PI * 2)
        ctx.fill()

        // Floating particles
        for (let i = 0; i < 8; i++) {
          const pa = t / 600 + (i / 8) * Math.PI * 2
          const pd = r * (1.3 + Math.sin(t / 300 + i) * 0.3)
          const px = bx + Math.cos(pa) * pd
          const py = by + Math.sin(pa) * pd * 0.6
          ctx.fillStyle = `rgba(${auraColor}, ${0.4 + Math.sin(t / 100 + i) * 0.3})`
          ctx.beginPath()
          ctx.arc(px, py, r * 0.04, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        // Body (shadowy)
        ctx.save()
        ctx.translate(bx + wobble, by + hover)

        // Shadowy body
        const bodyGrad = ctx.createRadialGradient(
          -r * 0.2, -r * 0.3, r * 0.1,
          0, 0, r * 1.1
        )
        bodyGrad.addColorStop(0, isBerserk ? "#8b0000" : isHealing ? "#8b5cf6" : "#4c1d95")
        bodyGrad.addColorStop(0.6, isBerserk ? "#4a0000" : isHealing ? "#5b21b6" : "#2e1065")
        bodyGrad.addColorStop(1, "#0a0015")

        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        // Amorphous shadow shape
        for (let i = 0; i <= 16; i++) {
          const a = (i / 16) * Math.PI * 2
          const bulge = Math.sin(a * 3 + t / 500) * r * 0.05 + Math.cos(a * 5 - t / 400) * r * 0.03
          const rad = r * 0.95 + bulge
          const px = Math.cos(a) * rad
          const py = Math.sin(a) * rad * 1.1
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()

        // Wispy tendrils at bottom
        ctx.strokeStyle = isBerserk ? "#5a0000" : "#2e1065"
        ctx.lineWidth = r * 0.06
        ctx.lineCap = "round"
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * 0.6 + (i / 6) * Math.PI * 0.8
          const startX = Math.cos(a) * r * 0.7
          const startY = Math.sin(a) * r * 0.9
          const endX = startX + Math.sin(t / 200 + i) * r * 0.15
          const endY = startY + r * (0.3 + Math.sin(t / 150 + i) * 0.1)
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY + r * 0.15, endX, endY)
          ctx.stroke()
        }
        ctx.lineCap = "butt"

        // Hood (darker top)
        ctx.fillStyle = isBerserk ? "#2a0000" : "#0a0015"
        ctx.beginPath()
        ctx.moveTo(-r * 0.65, -r * 0.2)
        ctx.quadraticCurveTo(-r * 0.7, -r * 0.85, 0, -r * 1.0)
        ctx.quadraticCurveTo(r * 0.7, -r * 0.85, r * 0.65, -r * 0.2)
        ctx.closePath()
        ctx.fill()

        // Void inside hood (black hole)
        const voidGrad = ctx.createRadialGradient(0, -r * 0.5, 0, 0, -r * 0.5, r * 0.6)
        voidGrad.addColorStop(0, "#000000")
        voidGrad.addColorStop(0.7, "#050010")
        voidGrad.addColorStop(1, "rgba(10, 0, 21, 0.8)")
        ctx.fillStyle = voidGrad
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.5, r * 0.55, r * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()

        // Stars inside the void
        for (let i = 0; i < 6; i++) {
          const sa = (i / 6) * Math.PI * 2 + t / 3000
          const sr = r * (0.15 + (i % 3) * 0.12)
          const sx = Math.cos(sa) * sr
          const sy = -r * 0.5 + Math.sin(sa) * sr * 0.7
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(t / 200 + i) * 0.4})`
          ctx.beginPath()
          ctx.arc(sx, sy, r * 0.02, 0, Math.PI * 2)
          ctx.fill()
        }

        // Eyes (glowing red)
        for (const side of [-1, 1]) {
          const ex = side * r * 0.18
          const ey = -r * 0.55

          ctx.shadowColor = isBerserk ? "#ff0000" : "#ff2222"
          ctx.shadowBlur = isBerserk ? 30 : 18

          ctx.fillStyle = isBerserk ? "#ff0000" : "#ff2222"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.07, r * 0.05, side * 0.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          // Pupil
          ctx.fillStyle = "#000000"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.025, r * 0.04, 0, 0, Math.PI * 2)
          ctx.fill()

          // Reflection
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(ex - side * r * 0.015, ey - r * 0.015, r * 0.015, 0, Math.PI * 2)
          ctx.fill()
        }

        // Scythe
        const scytheSwing = isBerserk ? Math.sin(t / 100) * 0.15 : Math.sin(t / 600) * 0.1
        ctx.save()
        ctx.translate(r * 0.7, -r * 0.2)
        ctx.rotate(0.4 + scytheSwing)

        // Handle
        ctx.strokeStyle = "#1a0a2a"
        ctx.lineWidth = r * 0.07
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(0, r * 0.8)
        ctx.lineTo(0, -r * 1.2)
        ctx.stroke()

        // Blade (crescent)
        const bladeGrad = ctx.createLinearGradient(-r * 0.6, -r, r * 0.2, -r * 0.6)
        bladeGrad.addColorStop(0, isBerserk ? "#ff3333" : "#c084fc")
        bladeGrad.addColorStop(0.5, isBerserk ? "#ff0000" : "#a855f7")
        bladeGrad.addColorStop(1, isBerserk ? "#8b0000" : "#7c3aed")

        ctx.fillStyle = bladeGrad
        ctx.shadowColor = isBerserk ? "#ff0000" : "#a855f7"
        ctx.shadowBlur = 15
        ctx.beginPath()
        ctx.moveTo(0, -r * 1.2)
        ctx.quadraticCurveTo(-r * 0.8, -r * 1.0, -r * 0.5, -r * 0.3)
        ctx.quadraticCurveTo(-r * 0.2, -r * 0.6, 0, -r * 0.7)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0

        // Blade edge glow
        ctx.strokeStyle = isBerserk ? "#ff6666" : "#e9d5ff"
        ctx.lineWidth = r * 0.02
        ctx.beginPath()
        ctx.moveTo(0, -r * 1.2)
        ctx.quadraticCurveTo(-r * 0.8, -r * 1.0, -r * 0.5, -r * 0.3)
        ctx.stroke()

        ctx.restore()

        ctx.restore() // end body translate

        //  BERSERK: extra rage particles 
        if (isBerserk) {
          for (let i = 0; i < 8; i++) {
            const pa = t / 150 + (i / 8) * Math.PI * 2
            const pd = r * (1.5 + Math.sin(t / 100 + i) * 0.4)
            const px = bx + Math.cos(pa) * pd
            const py = by + Math.sin(pa) * pd * 0.6
            ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(t / 80 + i) * 0.3})`
            ctx.shadowColor = "#ff0000"
            ctx.shadowBlur = 12
            ctx.beginPath()
            ctx.arc(px, py, r * 0.05, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0
          }
        }

        // ─── HEAL: red particles rising ───
        if (isHealing) {
          for (let i = 0; i < 6; i++) {
            const pa = t / 400 + (i / 6) * Math.PI * 2
            const rise = (t / 10 + i * 30) % 200
            const px = bx + Math.cos(pa) * r * 1.2
            const py = by + r * 0.5 - rise
            ctx.fillStyle = `rgba(255, 100, 100, ${0.6 - rise / 300})`
            ctx.beginPath()
            ctx.arc(px, py, r * 0.05, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        ctx.restore() // end heal alpha
        


// boss Plague Bringer
      } else if (boss.type === "plagueBringer") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const healthPercent = boss.health / boss.maxHealth
        const isBerserk = healthPercent < 0.15

        const currentAuraRadius = isBerserk ? (boss.auraRadius ? boss.auraRadius + 100 : 350) : (boss.auraRadius || 250)
        const auraPulse = 0.5 + Math.sin(t / 400) * 0.5
        const breath = 1 + Math.sin(t / 350) * 0.035
        const wobble = Math.sin(t / 250) * r * 0.025

        const toxic = isBerserk ? "#ff7a18" : "#a3e635"
        const toxicBright = isBerserk ? "#ffe16b" : "#e4ff9a"
        const toxicDark = isBerserk ? "#b52b08" : "#365314"

  //  AURA 
  ctx.save()

  const auraColor = isBerserk ? "255, 30, 30" : "0, 255, 100"
  const auraColorBright = isBerserk ? "255, 120, 120" : "150, 255, 180"

  // OUTER TRANSLUCENT FILL 
  ctx.fillStyle = `rgba(${auraColor}, ${0.08 + auraPulse * 0.05})`
  ctx.beginPath()
  ctx.arc(bx, by, currentAuraRadius, 0, Math.PI * 2)
  ctx.fill()

  //. INNER SOFT GRADIENT (glow from center) 
  const innerGlow = ctx.createRadialGradient(
    bx, by, r * 0.3,
    bx, by, currentAuraRadius * 0.75
  )
  innerGlow.addColorStop(0, `rgba(${auraColor}, ${0.18 + auraPulse * 0.1})`)
  innerGlow.addColorStop(0.5, `rgba(${auraColor}, ${0.08 + auraPulse * 0.04})`)
  innerGlow.addColorStop(1, `rgba(${auraColor}, 0)`)

  ctx.fillStyle = innerGlow
  ctx.beginPath()
  ctx.arc(bx, by, currentAuraRadius * 0.75, 0, Math.PI * 2)
  ctx.fill()

  //  PULSING CLOUD LAYERS 
  for (let layer = 0; layer < 3; layer++) {
    const layerPhase = ((t / 2000) + layer / 3) % 1
    const layerRadius = currentAuraRadius * (0.3 + layerPhase * 0.65)
    const layerAlpha = (1 - layerPhase) * 0.15

    // Wobbly cloud shape (not perfect circle)
    ctx.beginPath()
    const points = 20
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2
      const wobble =
        Math.sin(a * 3 + t / 400 + layer) * currentAuraRadius * 0.04 +
        Math.cos(a * 5 - t / 300 + layer) * currentAuraRadius * 0.03
      const ri = layerRadius + wobble
      const px = bx + Math.cos(a) * ri
      const py = by + Math.sin(a) * ri
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()

    ctx.fillStyle = `rgba(${auraColor}, ${layerAlpha})`
    ctx.fill()
  }

  //  EDGE PARTICLES (escaping the aura) 
  for (let i = 0; i < 24; i++) {
    const pa = (i / 24) * Math.PI * 2 + t / 1800
    const escape = (t / 2500 + i * 0.15) % 1
    const pr = currentAuraRadius * (0.85 + escape * 0.25)
    const px = bx + Math.cos(pa) * pr
    const py = by + Math.sin(pa) * pr
    const alpha = (1 - escape) * 0.6
    const size = r * (0.03 + escape * 0.03)

    ctx.fillStyle = `rgba(${auraColorBright}, ${alpha})`
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()
  }

  //  INNER PARTICLES (rising inside aura) 
  for (let i = 0; i < 20; i++) {
    const seed = i * 2.399
    const cycle = (t * (0.00015 + (i % 4) * 0.00003) + i * 0.173) % 1
    const orbit = currentAuraRadius * (0.15 + ((i * 7) % 11) / 16)
    const angle = seed + t * (i % 2 === 0 ? 0.0004 : -0.0003)

    const px = bx + Math.cos(angle) * orbit * (0.7 + cycle * 0.3)
    const py = by + Math.sin(angle) * orbit * 0.55 - cycle * currentAuraRadius * 0.5

    const alpha = Math.max(0, Math.sin(cycle * Math.PI)) * 0.8
    const size = r * (0.015 + (i % 4) * 0.01)

    ctx.fillStyle = `rgba(${auraColorBright}, ${alpha})`
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()

    // Bright core
    if (i % 3 === 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`
      ctx.beginPath()
      ctx.arc(px - size * 0.2, py - size * 0.2, size * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()


        // RISING SPORES 
        
        for (let i = 0; i < 20; i++) {
          const seed = i * 2.399
          const cycle = (t * (0.00012 + (i % 4) * 0.000025) + i * 0.173) % 1
          const orbit = currentAuraRadius * (0.18 + ((i * 7) % 11) / 14)
          const angle = seed + t * (i % 2 === 0 ? 0.00035 : -0.00025)

          const px = bx + Math.cos(angle) * orbit * (0.7 + cycle * 0.3)
          const py = by + Math.sin(angle) * orbit * 0.52 - cycle * currentAuraRadius * 0.45

          const alpha = Math.max(0, Math.sin(cycle * Math.PI)) * 0.7
          const size = r * (0.012 + (i % 4) * 0.008)

          ctx.fillStyle = isBerserk
            ? `rgba(255, ${100 + (i % 5) * 20}, 15, ${alpha})`
            : `rgba(${150 + (i % 4) * 20}, 230, ${55 + (i % 3) * 20}, ${alpha})`

          ctx.beginPath()
          ctx.arc(px, py, size, 0, Math.PI * 2)
          ctx.fill()

          if (i % 4 === 0) {
            ctx.fillStyle = `rgba(240, 255, 200, ${alpha * 0.6})`
            ctx.beginPath()
            ctx.arc(px - size * 0.25, py - size * 0.25, size * 0.3, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // ORBITING PLAGUE TOTEMS 
        for (let i = 0; i < 4; i++) {
          const angle = t / 2500 + (i / 4) * Math.PI * 2
          const orbitRadius = r * (1.65 + Math.sin(t / 600 + i) * 0.08)
          const sx = bx + Math.cos(angle) * orbitRadius
          const sy = by + Math.sin(angle) * orbitRadius * 0.56
            + Math.sin(t / 450 + i) * r * 0.08

          const skullScale = 0.72 + Math.sin(t / 300 + i) * 0.08

          ctx.save()
          ctx.translate(sx, sy)
          ctx.rotate(Math.sin(t / 700 + i) * 0.12)
          ctx.scale(skullScale, skullScale)

          // Toxic halo (no gradient, simple)
          ctx.fillStyle = isBerserk
            ? "rgba(255, 80, 0, 0.12)"
            : "rgba(163, 230, 53, 0.12)"
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.27, 0, Math.PI * 2)
          ctx.fill()

          // Cracked skull silhouette
          ctx.fillStyle = "#192014"
          ctx.strokeStyle = toxicDark
          ctx.lineWidth = Math.max(1, r * 0.018)

          ctx.beginPath()
          ctx.moveTo(-r * 0.19, -r * 0.15)
          ctx.lineTo(-r * 0.13, -r * 0.24)
          ctx.lineTo(-r * 0.02, -r * 0.26)
          ctx.lineTo(r * 0.13, -r * 0.21)
          ctx.lineTo(r * 0.2, -r * 0.1)
          ctx.lineTo(r * 0.17, r * 0.06)
          ctx.lineTo(r * 0.1, r * 0.12)
          ctx.lineTo(r * 0.09, r * 0.2)
          ctx.lineTo(-r * 0.1, r * 0.2)
          ctx.lineTo(-r * 0.12, r * 0.12)
          ctx.lineTo(-r * 0.19, r * 0.05)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Eye sockets
          ctx.fillStyle = "#050805"
          for (const side of [-1, 1]) {
            ctx.beginPath()
            ctx.ellipse(side * r * 0.075, -r * 0.055, r * 0.052, r * 0.065, side * -0.2, 0, Math.PI * 2)
            ctx.fill()
          }

          // Glowing eye points
          ctx.fillStyle = toxicBright
          ctx.beginPath()
          ctx.arc(-r * 0.075, -r * 0.055, r * 0.022, 0, Math.PI * 2)
          ctx.arc(r * 0.075, -r * 0.055, r * 0.022, 0, Math.PI * 2)
          ctx.fill()

          // Jaw teeth
          ctx.fillStyle = "#8a9874"
          for (let tooth = 0; tooth < 3; tooth++) {
            const tx = -r * 0.075 + tooth * r * 0.075
            ctx.beginPath()
            ctx.moveTo(tx - r * 0.02, r * 0.11)
            ctx.lineTo(tx + r * 0.02, r * 0.11)
            ctx.lineTo(tx, r * 0.16)
            ctx.closePath()
            ctx.fill()
          }

          ctx.restore()
        }

        // BODY 
        ctx.save()
        ctx.translate(bx + wobble, by)
        ctx.scale(breath, breath)

        // Ground shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.48)"
        ctx.beginPath()
        ctx.ellipse(0, r * 0.92, r * 0.82, r * 0.18, 0, 0, Math.PI * 2)
        ctx.fill()

        // Tattered lower robe
        const robeGrad = ctx.createLinearGradient(-r * 0.55, -r * 0.2, r * 0.45, r)
        robeGrad.addColorStop(0, "#46552a")
        robeGrad.addColorStop(0.28, "#28351b")
        robeGrad.addColorStop(0.72, "#11190b")
        robeGrad.addColorStop(1, "#070b05")

        ctx.fillStyle = robeGrad
        ctx.strokeStyle = "#090d06"
        ctx.lineWidth = r * 0.05

        ctx.beginPath()
        ctx.moveTo(-r * 0.28, -r * 0.45)
        ctx.lineTo(-r * 0.58, -r * 0.29)
        ctx.lineTo(-r * 0.75, r * 0.16)
        ctx.lineTo(-r * 0.66, r * 0.47)
        ctx.lineTo(-r * 0.76, r * 0.75)
        ctx.lineTo(-r * 0.44, r * 0.7)
        ctx.lineTo(-r * 0.18, r * 0.87)
        ctx.lineTo(r * 0.05, r * 0.72)
        ctx.lineTo(r * 0.34, r * 0.85)
        ctx.lineTo(r * 0.5, r * 0.64)
        ctx.lineTo(r * 0.72, r * 0.7)
        ctx.lineTo(r * 0.66, r * 0.3)
        ctx.lineTo(r * 0.76, -r * 0.13)
        ctx.lineTo(r * 0.45, -r * 0.43)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Torn fabric cuts
        ctx.fillStyle = "#070b05"
        for (let i = 0; i < 4; i++) {
          const tx = r * (-0.53 + i * 0.34)
          const ty = r * (0.67 + (i % 2) * 0.06)

          ctx.beginPath()
          ctx.moveTo(tx - r * 0.06, ty)
          ctx.lineTo(tx + r * 0.07, ty - r * 0.015)
          ctx.lineTo(tx + r * 0.015, ty + r * 0.13)
          ctx.closePath()
          ctx.fill()
        }

        // Asymmetrical arms
        ctx.lineCap = "round"

        // Long left arm
        ctx.strokeStyle = "#11190b"
        ctx.lineWidth = r * 0.19
        ctx.beginPath()
        ctx.moveTo(-r * 0.53, -r * 0.29)
        ctx.lineTo(-r * 0.76, r * 0.08)
        ctx.lineTo(-r * 0.85, r * 0.49)
        ctx.stroke()

        ctx.strokeStyle = "#3b4b24"
        ctx.lineWidth = r * 0.105
        ctx.beginPath()
        ctx.moveTo(-r * 0.53, -r * 0.29)
        ctx.lineTo(-r * 0.76, r * 0.08)
        ctx.lineTo(-r * 0.85, r * 0.47)
        ctx.stroke()

        // Left claws
        ctx.strokeStyle = "#0a1007"
        ctx.lineWidth = r * 0.04
        for (let i = 0; i < 3; i++) {
          const fx = -r * 0.85 + (i - 1) * r * 0.075
          ctx.beginPath()
          ctx.moveTo(-r * 0.85, r * 0.47)
          ctx.lineTo(fx, r * (0.61 + (i % 2) * 0.035))
          ctx.stroke()
        }

        // Right arm
        ctx.strokeStyle = "#11190b"
        ctx.lineWidth = r * 0.22
        ctx.beginPath()
        ctx.moveTo(r * 0.49, -r * 0.29)
        ctx.lineTo(r * 0.75, -r * 0.02)
        ctx.lineTo(r * 0.84, r * 0.23)
        ctx.stroke()

        ctx.strokeStyle = "#50662b"
        ctx.lineWidth = r * 0.12
        ctx.beginPath()
        ctx.moveTo(r * 0.5, -r * 0.29)
        ctx.lineTo(r * 0.75, -r * 0.02)
        ctx.lineTo(r * 0.84, r * 0.22)
        ctx.stroke()

        // Infected growth on right arm
        ctx.fillStyle = toxicDark
        ctx.beginPath()
        ctx.ellipse(r * 0.79, r * 0.12, r * 0.09, r * 0.13, -0.35, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = toxicBright
        ctx.beginPath()
        ctx.ellipse(r * 0.77, r * 0.09, r * 0.025, r * 0.055, -0.35, 0, Math.PI * 2)
        ctx.fill()

        // Shoulder carapace
        for (const side of [-1, 1]) {
          const sx = side * r * 0.53
          const sy = -r * 0.36

          const armor = ctx.createLinearGradient(
            sx - r * 0.15, sy - r * 0.2,
            sx + r * 0.2, sy + r * 0.18
          )
          armor.addColorStop(0, "#536044")
          armor.addColorStop(0.45, "#202b17")
          armor.addColorStop(1, "#0a1008")

          ctx.fillStyle = armor
          ctx.strokeStyle = "#080d06"
          ctx.lineWidth = r * 0.035

          ctx.beginPath()
          ctx.moveTo(sx - side * r * 0.16, sy - r * 0.12)
          ctx.lineTo(sx + side * r * 0.2, sy - r * 0.2)
          ctx.lineTo(sx + side * r * 0.29, sy + r * 0.04)
          ctx.lineTo(sx + side * r * 0.09, sy + r * 0.18)
          ctx.lineTo(sx - side * r * 0.13, sy + r * 0.08)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = "#87966b"
          ctx.beginPath()
          ctx.moveTo(sx + side * r * 0.04, sy - r * 0.11)
          ctx.lineTo(sx + side * r * 0.25, sy - r * 0.35)
          ctx.lineTo(sx + side * r * 0.2, sy - r * 0.04)
          ctx.closePath()
          ctx.fill()
        }

        // Chest carapace
        ctx.fillStyle = "#151e0d"
        ctx.strokeStyle = "#080d05"
        ctx.lineWidth = r * 0.035

        ctx.beginPath()
        ctx.moveTo(-r * 0.34, -r * 0.37)
        ctx.lineTo(-r * 0.12, -r * 0.47)
        ctx.lineTo(r * 0.27, -r * 0.35)
        ctx.lineTo(r * 0.36, r * 0.06)
        ctx.lineTo(r * 0.13, r * 0.27)
        ctx.lineTo(-r * 0.29, r * 0.15)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Toxic veins in chest
        ctx.strokeStyle = toxic
        ctx.lineWidth = r * 0.025
        ctx.beginPath()
        ctx.moveTo(-r * 0.22, -r * 0.28)
        ctx.lineTo(-r * 0.06, -r * 0.12)
        ctx.lineTo(-r * 0.16, r * 0.03)
        ctx.moveTo(-r * 0.06, -r * 0.12)
        ctx.lineTo(r * 0.13, -r * 0.2)
        ctx.lineTo(r * 0.22, -r * 0.04)
        ctx.stroke()

        // Hood
        const hood = ctx.createRadialGradient(
          -r * 0.13, -r * 0.76, r * 0.03,
          0, -r * 0.63, r * 0.48
        )
        hood.addColorStop(0, "#46532b")
        hood.addColorStop(0.5, "#202b16")
        hood.addColorStop(1, "#080d06")

        ctx.fillStyle = hood
        ctx.strokeStyle = "#080c05"
        ctx.lineWidth = r * 0.05

        ctx.beginPath()
        ctx.moveTo(-r * 0.39, -r * 0.57)
        ctx.lineTo(-r * 0.42, -r * 0.82)
        ctx.lineTo(-r * 0.25, -r * 1.04)
        ctx.lineTo(r * 0.05, -r * 1.1)
        ctx.lineTo(r * 0.35, -r * 0.92)
        ctx.lineTo(r * 0.42, -r * 0.65)
        ctx.lineTo(r * 0.24, -r * 0.39)
        ctx.lineTo(-r * 0.19, -r * 0.36)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Hood rim
        ctx.strokeStyle = "#647546"
        ctx.lineWidth = r * 0.035
        ctx.beginPath()
        ctx.moveTo(-r * 0.36, -r * 0.69)
        ctx.quadraticCurveTo(0, -r * 0.85, r * 0.37, -r * 0.68)
        ctx.stroke()

        // Plague mask
        const maskGrad = ctx.createLinearGradient(
          -r * 0.25, -r * 0.68,
          r * 0.25, -r * 0.37
        )
        maskGrad.addColorStop(0, "#78846b")
        maskGrad.addColorStop(0.45, "#394532")
        maskGrad.addColorStop(1, "#151d13")

        ctx.fillStyle = maskGrad
        ctx.strokeStyle = "#090e08"
        ctx.lineWidth = r * 0.04

        ctx.beginPath()
        ctx.moveTo(-r * 0.29, -r * 0.67)
        ctx.lineTo(r * 0.28, -r * 0.67)
        ctx.lineTo(r * 0.23, -r * 0.43)
        ctx.lineTo(r * 0.04, -r * 0.29)
        ctx.lineTo(-r * 0.16, -r * 0.39)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Beak respirator
        ctx.fillStyle = "#10170d"
        ctx.beginPath()
        ctx.moveTo(-r * 0.15, -r * 0.52)
        ctx.lineTo(r * 0.15, -r * 0.52)
        ctx.lineTo(r * 0.09, -r * 0.34)
        ctx.lineTo(0, -r * 0.22)
        ctx.lineTo(-r * 0.1, -r * 0.35)
        ctx.closePath()
        ctx.fill()

        // Filter vents
        ctx.strokeStyle = "#85966d"
        ctx.lineWidth = r * 0.018
        for (let i = 0; i < 3; i++) {
          const vy = -r * (0.47 - i * 0.045)
          ctx.beginPath()
          ctx.moveTo(-r * 0.085, vy)
          ctx.lineTo(r * 0.085, vy)
          ctx.stroke()
        }

        // Eyes in the hood (optimized shadowBlur)
        for (const side of [-1, 1]) {
          const ex = side * r * 0.2
          const ey = -r * 0.72

          ctx.fillStyle = "#050804"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.13, r * 0.085, side * -0.18, 0, Math.PI * 2)
          ctx.fill()

          ctx.shadowColor = toxic
          ctx.shadowBlur = isBerserk ? 10 : 6

          ctx.fillStyle = toxicBright
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.075, r * 0.035, side * -0.18, 0, Math.PI * 2)
          ctx.fill()

          ctx.shadowBlur = 0

          ctx.fillStyle = "#0a1007"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.018, r * 0.032, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        // Infected wounds (optimized shadowBlur)
        for (let i = 0; i < 3; i++) {
          const wx = r * (-0.25 + i * 0.16)
          const wy = r * (0.27 + (i % 2) * 0.13)
          const woundPulse = 0.75 + Math.sin(t / 180 + i) * 0.25

          ctx.fillStyle = `rgba(8, 15, 4, ${0.65 * woundPulse})`
          ctx.beginPath()
          ctx.ellipse(wx, wy, r * 0.065, r * 0.09, -0.4, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = toxic
          ctx.lineWidth = r * 0.018
          ctx.beginPath()
          ctx.moveTo(wx - r * 0.04, wy - r * 0.04)
          ctx.lineTo(wx + r * 0.035, wy + r * 0.025)
          ctx.lineTo(wx - r * 0.005, wy + r * 0.065)
          ctx.stroke()
        }

        // Uneven legs
        ctx.lineCap = "round"
        ctx.strokeStyle = "#11180b"
        ctx.lineWidth = r * 0.19

        ctx.beginPath()
        ctx.moveTo(-r * 0.32, r * 0.68)
        ctx.lineTo(-r * 0.43, r * 0.97)
        ctx.moveTo(r * 0.32, r * 0.68)
        ctx.lineTo(r * 0.48, r * 0.94)
        ctx.stroke()

        ctx.strokeStyle = "#3a4a23"
        ctx.lineWidth = r * 0.1

        ctx.beginPath()
        ctx.moveTo(-r * 0.32, r * 0.68)
        ctx.lineTo(-r * 0.43, r * 0.95)
        ctx.moveTo(r * 0.32, r * 0.68)
        ctx.lineTo(r * 0.48, r * 0.92)
        ctx.stroke()

        // Clawed feet
        ctx.strokeStyle = "#0b1007"
        ctx.lineWidth = r * 0.04

        for (const side of [-1, 1]) {
          const fx = side * r * 0.45
          const fy = r * 0.96

          ctx.beginPath()
          ctx.moveTo(fx, fy)
          ctx.lineTo(fx + side * r * 0.13, fy + r * 0.05)
          ctx.lineTo(fx + side * r * 0.17, fy + r * 0.01)
          ctx.stroke()
        }

        ctx.lineCap = "butt"
        ctx.restore()
      


  // boss Iron Tyrant
      } else if (boss.type === "ironTyrant") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const healthPercent = boss.health / boss.maxHealth
        const isBerserk = healthPercent < 0.30
        const isArmored = boss.isArmored !== false
        const armorPercent = (boss.armor || 0) / (boss.maxArmor || 400)

        const shootTimer = boss.reaperShootTimer || 0
        const combatTimer = boss.combatTimer || 0

        // Melee active in ALL phases 
        const meleeEnabled = true
        const meleeRange = isBerserk ? 200 : (isArmored ? 150 : 250)
        const meleeCooldown = isBerserk ? 800 : 1500
        const meleeTimer = isBerserk ? shootTimer : combatTimer

        const windupStart = isBerserk ? 480 : (isArmored ? 1100 : 1050)
        const windupDuration = isBerserk ? 320 : (isArmored ? 400 : 450)

        const windup =
          meleeEnabled &&
          meleeTimer >= windupStart &&
          meleeTimer < meleeCooldown
            ? Math.min(1, (meleeTimer - windupStart) / windupDuration)
            : 0

        const isWindingUp = windup > 0
        const facing = Math.atan2(player.y - by, player.x - bx)

        const breath = 1 + Math.sin(t / 350) * (isBerserk ? 0.045 : 0.018)
        const hover = Math.sin(t / 250) * r * 0.018
        const pulse = 0.5 + Math.sin(t / (isBerserk ? 65 : 160)) * 0.5

        // PERMANENT MELEE RANGE SCANNER

        if (meleeEnabled) {
          ctx.save()
          ctx.translate(bx, by)

          const ringRadius = meleeRange
          const rotation = t / (isBerserk ? 240 : 420)
          const dangerColor = isBerserk ? "#ff2020" : (isArmored ? "#fbbf24" : "#ef4444")
          const dangerRGB = isBerserk ? "255, 32, 32" : (isArmored ? "251, 191, 36" : "239, 68, 68")

          const zone = ctx.createRadialGradient(
            0, 0, r * 0.65,
            0, 0, ringRadius
          )

          zone.addColorStop(
            0,
            `rgba(${dangerRGB}, ${isBerserk ? 0.10 : isArmored ? 0.04 : 0.035})`
          )
          zone.addColorStop(
            0.72,
            `rgba(${dangerRGB}, ${isBerserk ? 0.07 : isArmored ? 0.03 : 0.025})`
          )
          zone.addColorStop(1, "rgba(255, 0, 0, 0.01)")

          ctx.fillStyle = zone
          ctx.beginPath()
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
          ctx.fill()

          // Outer boundary: exact melee range
          ctx.setLineDash([r * 0.16, r * 0.09])
          ctx.lineDashOffset = -rotation * ringRadius * 0.08
          ctx.strokeStyle = dangerColor
          ctx.globalAlpha = 0.55 + pulse * 0.2
          ctx.lineWidth = isBerserk ? 3.5 : 2.5
          ctx.beginPath()
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          // Rotating scanner arc
          ctx.globalAlpha = 0.55 + pulse * 0.25
          ctx.lineWidth = 2
          ctx.strokeStyle = isBerserk ? "#ff7777" : isArmored ? "#fde68a" : "#f87171"
          ctx.beginPath()
          ctx.arc(
            0, 0,
            ringRadius * 0.91,
            rotation,
            rotation + Math.PI * 1.25
          )
          ctx.stroke()

          // Counter-rotating inner arc
          ctx.strokeStyle = "#fecaca"
          ctx.globalAlpha = 0.45
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(
            0, 0,
            ringRadius * 0.96,
            -rotation * 0.72,
            -rotation * 0.72 + Math.PI * 0.45
          )
          ctx.stroke()

          // Range ticks
          const tickCount = 32

          for (let i = 0; i < tickCount; i++) {
            const a = (i / tickCount) * Math.PI * 2
            const major = i % 4 === 0
            const inner = ringRadius - (major ? r * 0.14 : r * 0.07)

            ctx.globalAlpha = major ? 0.8 : 0.38
            ctx.strokeStyle = dangerColor
            ctx.lineWidth = major ? 2.5 : 1.25

            ctx.beginPath()
            ctx.moveTo(
              Math.cos(a) * inner,
              Math.sin(a) * inner
            )
            ctx.lineTo(
              Math.cos(a) * ringRadius,
              Math.sin(a) * ringRadius
            )
            ctx.stroke()
          }

          // Rotating sweep sector
          const sweepAngle = rotation * 0.85

          ctx.globalAlpha = isBerserk ? 0.24 : 0.15
          ctx.fillStyle = dangerColor
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.arc(
            0, 0,
            ringRadius,
            sweepAngle,
            sweepAngle + 0.22
          )
          ctx.closePath()
          ctx.fill()

          // Direction marker
          ctx.globalAlpha = 0.65 + pulse * 0.25
          ctx.strokeStyle = isBerserk ? "#ffffff" : (isArmored ? "#fef3c7" : "#fca5a5")
          ctx.lineWidth = isBerserk ? 3 : 2
          ctx.beginPath()
          ctx.arc(
            0, 0,
            ringRadius,
            facing - 0.12,
            facing + 0.12
          )
          ctx.stroke()

          ctx.fillStyle = isBerserk ? "#ffffff" : (isArmored ? "#fef3c7" : "#fecaca")
          ctx.beginPath()
          ctx.arc(
            Math.cos(facing) * ringRadius,
            Math.sin(facing) * ringRadius,
            isBerserk ? 5 : 4,
            0,
            Math.PI * 2
          )
          ctx.fill()

          ctx.restore()
        }

        // BERSERK AURA
        if (isBerserk) {
          ctx.save()
          ctx.globalCompositeOperation = "lighter"

          const auraRadius = r * (2.1 + pulse * 0.18)
          const aura = ctx.createRadialGradient(
            bx, by, r * 0.2,
            bx, by, auraRadius
          )

          aura.addColorStop(0, `rgba(255, 20, 20, ${0.23 + pulse * 0.08})`)
          aura.addColorStop(0.45, `rgba(220, 15, 15, ${0.12 + pulse * 0.06})`)
          aura.addColorStop(1, "rgba(150, 0, 0, 0)")

          ctx.fillStyle = aura
          ctx.beginPath()
          ctx.arc(bx, by, auraRadius, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = `rgba(255, 55, 55, ${0.45 + pulse * 0.4})`
          ctx.lineWidth = Math.max(2, r * 0.025)
          ctx.setLineDash([r * 0.16, r * 0.12])
          ctx.lineDashOffset = -t / 18
          ctx.beginPath()
          ctx.arc(bx, by, auraRadius * 0.83, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          for (let i = 0; i < 12; i++) {
            const a = t / 180 + (i / 12) * Math.PI * 2
            const orbit = r * (1.35 + 0.25 * Math.sin(t / 120 + i * 1.7))
            const px = bx + Math.cos(a) * orbit
            const py = by + Math.sin(a) * orbit * 0.7

            ctx.fillStyle = `rgba(255, ${25 + (i % 3) * 20}, 20, ${0.45 + pulse * 0.45})`
            ctx.beginPath()
            ctx.arc(px, py, r * (0.025 + (i % 3) * 0.008), 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.restore()
        }

        // MELEE WINDUP WARNING

        if (isWindingUp) {
          ctx.save()
          ctx.translate(bx, by)
          ctx.globalAlpha = 0.25 + windup * 0.5

          ctx.strokeStyle = isBerserk ? "#ff2020" : (isArmored ? "#fbbf24" : "#ef4444")
          ctx.lineWidth = r * (0.025 + windup * 0.025)
          ctx.setLineDash([r * 0.12, r * 0.09])
          ctx.beginPath()
          ctx.arc(
            0, 0,
            meleeRange * (0.68 + windup * 0.16),
            facing - 0.65,
            facing + 0.65
          )
          ctx.stroke()
          ctx.setLineDash([])

          ctx.restore()
        }

        // BODY TRANSFORM + SHADOW

        ctx.save()
        ctx.translate(bx, by + hover)
        ctx.scale(breath, breath)

        ctx.fillStyle = "rgba(0, 0, 0, 0.42)"
        ctx.beginPath()
        ctx.ellipse(0, r * 1.23, r * 0.82, r * 0.2, 0, 0, Math.PI * 2)
        ctx.fill()

        // Limb helper
        const drawLimb = (
          x1: number, y1: number,
          x2: number, y2: number,
          width: number,
          fill: string,
          outline: string
        ) => {
          ctx.lineCap = "round"
          ctx.lineJoin = "round"

          ctx.strokeStyle = outline
          ctx.lineWidth = width + r * 0.045
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          ctx.strokeStyle = fill
          ctx.lineWidth = width
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }

        // LEGS 
        for (const side of [-1, 1]) {
          const hipX = side * r * 0.28
          const kneeX = side * r * 0.34
          const ankleX = side * r * 0.37

          if (isArmored) {
            drawLimb(hipX, r * 0.48, kneeX, r * 0.87, r * 0.25, "#475569", "#111827")

            ctx.fillStyle = "#94a3b8"
            ctx.strokeStyle = "#1e293b"
            ctx.lineWidth = r * 0.035
            ctx.beginPath()
            ctx.roundRect(kneeX - r * 0.14, r * 0.75, r * 0.28, r * 0.22, r * 0.055)
            ctx.fill()
            ctx.stroke()

            drawLimb(kneeX, r * 0.88, ankleX, r * 1.12, r * 0.2, "#334155", "#0f172a")

            ctx.fillStyle = "#1e293b"
            ctx.strokeStyle = "#020617"
            ctx.lineWidth = r * 0.035
            ctx.beginPath()
            ctx.roundRect(ankleX - r * 0.19, r * 1.06, r * 0.38, r * 0.19, r * 0.045)
            ctx.fill()
            ctx.stroke()

            ctx.fillStyle = "#64748b"
            ctx.fillRect(ankleX - r * 0.13, r * 1.09, r * 0.26, r * 0.035)
          } else {
            drawLimb(hipX, r * 0.5, kneeX, r * 0.85, r * 0.22, "#991b1b", "#450a0a")

            ctx.fillStyle = "#dc2626"
            ctx.beginPath()
            ctx.ellipse(kneeX, r * 0.85, r * 0.13, r * 0.15, 0, 0, Math.PI * 2)
            ctx.fill()

            drawLimb(kneeX, r * 0.87, ankleX, r * 1.12, r * 0.17, "#7f1d1d", "#450a0a")

            ctx.fillStyle = "#450a0a"
            ctx.beginPath()
            ctx.ellipse(ankleX, r * 1.17, r * 0.2, r * 0.09, 0, 0, Math.PI * 2)
            ctx.fill()

            ctx.strokeStyle = "#fb4b4b"
            ctx.lineWidth = r * 0.025
            ctx.beginPath()
            ctx.moveTo(hipX, r * 0.62)
            ctx.lineTo(kneeX - side * r * 0.04, r * 0.76)
            ctx.stroke()
          }
        }

        // ARMS 
        for (const side of [-1, 1]) {
          const shoulderX = side * r * 0.52
          const shoulderY = -r * 0.34

          const pullBack = isWindingUp ? windup * r * 0.16 : 0
          const swing = isWindingUp ? Math.sin(windup * Math.PI) : 0

          const elbowX = side * (r * 0.72 - pullBack * 0.25)
          const elbowY = r * (0.02 + swing * 0.12)

          const handX = side * (r * 0.78 + pullBack * 0.7)
          const handY = r * (0.39 - swing * 0.22)

          if (isArmored) {
            ctx.fillStyle = "#64748b"
            ctx.strokeStyle = "#0f172a"
            ctx.lineWidth = r * 0.045
            ctx.beginPath()
            ctx.moveTo(shoulderX - side * r * 0.18, shoulderY - r * 0.12)
            ctx.lineTo(shoulderX + side * r * 0.15, shoulderY - r * 0.19)
            ctx.lineTo(shoulderX + side * r * 0.28, shoulderY + r * 0.03)
            ctx.lineTo(shoulderX + side * r * 0.12, shoulderY + r * 0.22)
            ctx.lineTo(shoulderX - side * r * 0.16, shoulderY + r * 0.12)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            ctx.save()
            ctx.translate(shoulderX + side * r * 0.06, shoulderY - r * 0.07)
            ctx.rotate(-side * 0.12)

            ctx.fillStyle = "#1e293b"
            ctx.strokeStyle = "#020617"
            ctx.lineWidth = r * 0.035
            ctx.beginPath()
            ctx.roundRect(-r * 0.09, -r * 0.22, r * 0.18, r * 0.39, r * 0.045)
            ctx.fill()
            ctx.stroke()

            ctx.fillStyle = "#94a3b8"
            ctx.fillRect(-r * 0.055, -r * 0.18, r * 0.11, r * 0.09)

            ctx.fillStyle = "#0f172a"
            ctx.beginPath()
            ctx.arc(0, r * 0.14, r * 0.065, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()

            drawLimb(shoulderX, shoulderY, elbowX, elbowY, r * 0.22, "#475569", "#0f172a")

            ctx.fillStyle = "#94a3b8"
            ctx.strokeStyle = "#1e293b"
            ctx.lineWidth = r * 0.035
            ctx.beginPath()
            ctx.arc(elbowX, elbowY, r * 0.12, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            drawLimb(elbowX, elbowY, handX, handY, r * 0.19, "#334155", "#0f172a")

            ctx.fillStyle = "#64748b"
            ctx.strokeStyle = "#0f172a"
            ctx.lineWidth = r * 0.04
            ctx.beginPath()
            ctx.roundRect(handX - r * 0.14, handY - r * 0.12, r * 0.28, r * 0.25, r * 0.055)
            ctx.fill()
            ctx.stroke()

            ctx.fillStyle = "#cbd5e1"
            ctx.fillRect(handX - r * 0.095, handY - r * 0.075, r * 0.19, r * 0.045)

            ctx.fillStyle = "#1e293b"
            for (let knuckle = 0; knuckle < 3; knuckle++) {
              ctx.fillRect(
                handX - r * 0.09 + knuckle * r * 0.065,
                handY + r * 0.025,
                r * 0.04,
                r * 0.07
              )
            }
          } else {
            ctx.fillStyle = "#b91c1c"
            ctx.strokeStyle = "#450a0a"
            ctx.lineWidth = r * 0.035
            ctx.beginPath()
            ctx.ellipse(shoulderX, shoulderY, r * 0.2, r * 0.22, side * -0.25, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            drawLimb(shoulderX, shoulderY, elbowX, elbowY, r * 0.2, "#b91c1c", "#450a0a")

            ctx.fillStyle = "#ef4444"
            ctx.beginPath()
            ctx.ellipse(elbowX, elbowY, r * 0.12, r * 0.13, 0, 0, Math.PI * 2)
            ctx.fill()

            drawLimb(elbowX, elbowY, handX, handY, r * 0.17, "#991b1b", "#450a0a")

            ctx.fillStyle = "#dc2626"
            ctx.strokeStyle = "#450a0a"
            ctx.lineWidth = r * 0.03
            ctx.beginPath()
            ctx.ellipse(handX, handY, r * 0.16, r * 0.15, side * -0.15, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            for (let finger = 0; finger < 3; finger++) {
              ctx.strokeStyle = "#7f1d1d"
              ctx.lineWidth = r * 0.025
              ctx.beginPath()
              ctx.moveTo(handX - r * 0.09 + finger * r * 0.07, handY - r * 0.015)
              ctx.lineTo(handX - r * 0.08 + finger * r * 0.07, handY + r * 0.075)
              ctx.stroke()
            }

            ctx.strokeStyle = `rgba(255, 90, 50, ${0.5 + pulse * 0.4})`
            ctx.lineWidth = r * 0.025
            ctx.beginPath()
            ctx.moveTo(shoulderX, shoulderY)
            ctx.lineTo(elbowX, elbowY)
            ctx.lineTo(handX - side * r * 0.05, handY)
            ctx.stroke()
          }
        }

        // TORSO 
        if (isArmored) {
          const metal = ctx.createLinearGradient(-r * 0.6, 0, r * 0.6, 0)
          metal.addColorStop(0, "#1e293b")
          metal.addColorStop(0.25, "#64748b")
          metal.addColorStop(0.5, "#cbd5e1")
          metal.addColorStop(0.75, "#64748b")
          metal.addColorStop(1, "#1e293b")

          ctx.fillStyle = metal
          ctx.strokeStyle = "#0f172a"
          ctx.lineWidth = r * 0.05
          ctx.beginPath()
          ctx.moveTo(-r * 0.48, -r * 0.46)
          ctx.lineTo(-r * 0.3, -r * 0.65)
          ctx.lineTo(r * 0.3, -r * 0.65)
          ctx.lineTo(r * 0.48, -r * 0.46)
          ctx.lineTo(r * 0.4, r * 0.28)
          ctx.lineTo(r * 0.24, r * 0.53)
          ctx.lineTo(-r * 0.24, r * 0.53)
          ctx.lineTo(-r * 0.4, r * 0.28)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          for (const side of [-1, 1]) {
            ctx.fillStyle = "#94a3b8"
            ctx.beginPath()
            ctx.moveTo(side * r * 0.05, -r * 0.48)
            ctx.lineTo(side * r * 0.34, -r * 0.43)
            ctx.lineTo(side * r * 0.3, -r * 0.12)
            ctx.lineTo(side * r * 0.05, -r * 0.2)
            ctx.closePath()
            ctx.fill()

            ctx.strokeStyle = "#334155"
            ctx.lineWidth = r * 0.025
            ctx.stroke()
          }

          ctx.save()
          ctx.shadowColor = isBerserk ? "#ff1f1f" : "#f97316"
          ctx.shadowBlur = isBerserk ? 24 : 12

          ctx.fillStyle = "#111827"
          ctx.beginPath()
          ctx.moveTo(0, -r * 0.4)
          ctx.lineTo(r * 0.16, -r * 0.22)
          ctx.lineTo(r * 0.12, r * 0.04)
          ctx.lineTo(0, r * 0.13)
          ctx.lineTo(-r * 0.12, r * 0.04)
          ctx.lineTo(-r * 0.16, -r * 0.22)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = isBerserk ? "#ff2020" : "#fb923c"
          ctx.beginPath()
          ctx.moveTo(0, -r * 0.32)
          ctx.lineTo(r * 0.075, -r * 0.19)
          ctx.lineTo(0, -r * 0.04)
          ctx.lineTo(-r * 0.075, -r * 0.19)
          ctx.closePath()
          ctx.fill()
          ctx.restore()

          ctx.fillStyle = "#334155"
          ctx.beginPath()
          ctx.moveTo(-r * 0.29, r * 0.28)
          ctx.lineTo(r * 0.29, r * 0.28)
          ctx.lineTo(r * 0.24, r * 0.53)
          ctx.lineTo(-r * 0.24, r * 0.53)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = "#0f172a"
          ctx.lineWidth = r * 0.035
          ctx.stroke()

          ctx.strokeStyle = "#cbd5e1"
          ctx.lineWidth = r * 0.018
          ctx.beginPath()
          ctx.moveTo(-r * 0.3, -r * 0.32)
          ctx.lineTo(-r * 0.2, -r * 0.12)
          ctx.moveTo(r * 0.3, -r * 0.32)
          ctx.lineTo(r * 0.2, -r * 0.12)
          ctx.moveTo(-r * 0.2, r * 0.35)
          ctx.lineTo(r * 0.2, r * 0.35)
          ctx.stroke()

          ctx.strokeStyle = "#0f172a"
          ctx.lineWidth = r * 0.025
          ctx.beginPath()
          ctx.moveTo(-r * 0.31, -r * 0.24)
          ctx.lineTo(-r * 0.23, -r * 0.16)
          ctx.lineTo(-r * 0.27, -r * 0.07)
          ctx.moveTo(r * 0.28, r * 0.13)
          ctx.lineTo(r * 0.19, r * 0.2)
          ctx.stroke()
        } else {
          const flesh = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0)
          flesh.addColorStop(0, "#7f1d1d")
          flesh.addColorStop(0.35, "#b91c1c")
          flesh.addColorStop(0.5, "#ef4444")
          flesh.addColorStop(0.7, "#b91c1c")
          flesh.addColorStop(1, "#450a0a")

          ctx.fillStyle = flesh
          ctx.strokeStyle = "#450a0a"
          ctx.lineWidth = r * 0.045
          ctx.beginPath()
          ctx.moveTo(-r * 0.47, -r * 0.49)
          ctx.lineTo(-r * 0.3, -r * 0.61)
          ctx.lineTo(r * 0.3, -r * 0.61)
          ctx.lineTo(r * 0.47, -r * 0.49)
          ctx.lineTo(r * 0.39, r * 0.19)
          ctx.lineTo(r * 0.23, r * 0.54)
          ctx.lineTo(-r * 0.23, r * 0.54)
          ctx.lineTo(-r * 0.39, r * 0.19)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          for (const side of [-1, 1]) {
            ctx.fillStyle = "#dc2626"
            ctx.strokeStyle = "#7f1d1d"
            ctx.lineWidth = r * 0.025
            ctx.beginPath()
            ctx.ellipse(side * r * 0.22, -r * 0.32, r * 0.23, r * 0.17, side * 0.12, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()

            ctx.strokeStyle = "#7f1d1d"
            ctx.lineWidth = r * 0.035
            ctx.beginPath()
            ctx.moveTo(0, -r * 0.46)
            ctx.lineTo(side * r * 0.34, -r * 0.38)
            ctx.stroke()
          }

          for (let row = 0; row < 3; row++) {
            const yy = -r * 0.04 + row * r * 0.16

            for (const side of [-1, 1]) {
              ctx.fillStyle = row % 2 === 0 ? "#b91c1c" : "#991b1b"
              ctx.beginPath()
              ctx.roundRect(
                side * r * 0.105 - r * 0.09,
                yy,
                r * 0.18,
                r * 0.12,
                r * 0.035
              )
              ctx.fill()
            }
          }

          ctx.strokeStyle = "#7f1d1d"
          ctx.lineWidth = r * 0.03
          ctx.beginPath()
          ctx.moveTo(0, -r * 0.17)
          ctx.lineTo(0, r * 0.45)
          ctx.stroke()

          ctx.save()
          ctx.shadowColor = isBerserk ? "#ff1a1a" : "#fb923c"
          ctx.shadowBlur = isBerserk ? 18 : 8
          ctx.strokeStyle = isBerserk
            ? `rgba(255, 35, 35, ${0.7 + pulse * 0.3})`
            : `rgba(255, 115, 50, ${0.55 + pulse * 0.35})`
          ctx.lineWidth = r * 0.025

          ctx.beginPath()
          ctx.moveTo(-r * 0.31, -r * 0.42)
          ctx.lineTo(-r * 0.2, -r * 0.23)
          ctx.lineTo(-r * 0.27, -r * 0.07)
          ctx.lineTo(-r * 0.12, r * 0.12)
          ctx.lineTo(-r * 0.17, r * 0.36)

          ctx.moveTo(r * 0.29, -r * 0.35)
          ctx.lineTo(r * 0.18, -r * 0.15)
          ctx.lineTo(r * 0.27, r * 0.04)
          ctx.lineTo(r * 0.14, r * 0.26)
          ctx.stroke()
          ctx.restore()

          ctx.fillStyle = "#450a0a"
          for (let i = 0; i < 3; i++) {
            const wx = (i - 1) * r * 0.23
            const wy = r * (0.2 + (i % 2) * 0.13)
            ctx.beginPath()
            ctx.ellipse(wx, wy, r * 0.065, r * 0.035, -0.3, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // HEAD 
        if (isArmored) {
          ctx.fillStyle = "#1e293b"
          ctx.fillRect(-r * 0.16, -r * 0.72, r * 0.32, r * 0.16)

          const helmet = ctx.createLinearGradient(-r * 0.35, 0, r * 0.35, 0)
          helmet.addColorStop(0, "#334155")
          helmet.addColorStop(0.5, "#cbd5e1")
          helmet.addColorStop(1, "#334155")

          ctx.fillStyle = helmet
          ctx.strokeStyle = "#020617"
          ctx.lineWidth = r * 0.045
          ctx.beginPath()
          ctx.moveTo(-r * 0.29, -r * 0.91)
          ctx.lineTo(-r * 0.2, -r * 1.12)
          ctx.lineTo(r * 0.2, -r * 1.12)
          ctx.lineTo(r * 0.29, -r * 0.91)
          ctx.lineTo(r * 0.23, -r * 0.68)
          ctx.lineTo(0, -r * 0.61)
          ctx.lineTo(-r * 0.23, -r * 0.68)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = "#64748b"
          ctx.beginPath()
          ctx.moveTo(-r * 0.18, -r * 1.04)
          ctx.lineTo(r * 0.18, -r * 1.04)
          ctx.lineTo(r * 0.12, -r * 0.93)
          ctx.lineTo(-r * 0.12, -r * 0.93)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = "#0f172a"
          ctx.beginPath()
          ctx.moveTo(-r * 0.22, -r * 0.88)
          ctx.lineTo(r * 0.22, -r * 0.88)
          ctx.lineTo(r * 0.17, -r * 0.75)
          ctx.lineTo(0, -r * 0.69)
          ctx.lineTo(-r * 0.17, -r * 0.75)
          ctx.closePath()
          ctx.fill()

          ctx.save()
          ctx.shadowColor = "#f97316"
          ctx.shadowBlur = 12
          ctx.fillStyle = "#fb923c"
          ctx.beginPath()
          ctx.moveTo(-r * 0.17, -r * 0.83)
          ctx.lineTo(r * 0.17, -r * 0.83)
          ctx.lineTo(r * 0.12, -r * 0.78)
          ctx.lineTo(-r * 0.12, -r * 0.78)
          ctx.closePath()
          ctx.fill()
          ctx.restore()

          for (const side of [-1, 1]) {
            ctx.fillStyle = "#cbd5e1"
            ctx.beginPath()
            ctx.arc(side * r * 0.245, -r * 0.83, r * 0.035, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          ctx.fillStyle = "#7f1d1d"
          ctx.beginPath()
          ctx.roundRect(-r * 0.17, -r * 0.74, r * 0.34, r * 0.19, r * 0.06)
          ctx.fill()

          const head = ctx.createRadialGradient(
            -r * 0.1, -r * 0.96, r * 0.02,
            0, -r * 0.89, r * 0.39
          )
          head.addColorStop(0, "#f87171")
          head.addColorStop(0.45, "#dc2626")
          head.addColorStop(1, "#450a0a")

          ctx.fillStyle = head
          ctx.strokeStyle = "#450a0a"
          ctx.lineWidth = r * 0.04
          ctx.beginPath()
          ctx.moveTo(-r * 0.28, -r * 0.91)
          ctx.lineTo(-r * 0.2, -r * 1.09)
          ctx.lineTo(0, -r * 1.15)
          ctx.lineTo(r * 0.2, -r * 1.09)
          ctx.lineTo(r * 0.28, -r * 0.91)
          ctx.lineTo(r * 0.2, -r * 0.73)
          ctx.lineTo(0, -r * 0.66)
          ctx.lineTo(-r * 0.2, -r * 0.73)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = "#7f1d1d"
          ctx.beginPath()
          ctx.moveTo(-r * 0.24, -r * 0.96)
          ctx.lineTo(-r * 0.02, -r * 0.91)
          ctx.lineTo(0, -r * 0.86)
          ctx.lineTo(r * 0.02, -r * 0.91)
          ctx.lineTo(r * 0.24, -r * 0.96)
          ctx.lineTo(r * 0.17, -r * 0.86)
          ctx.lineTo(-r * 0.17, -r * 0.86)
          ctx.closePath()
          ctx.fill()

          ctx.save()
          ctx.shadowColor = "#ff0000"
          ctx.shadowBlur = isBerserk ? 30 : 18

          for (const side of [-1, 1]) {
            ctx.fillStyle = "#240000"
            ctx.beginPath()
            ctx.ellipse(side * r * 0.115, -r * 0.88, r * 0.105, r * 0.065, side * -0.2, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = isBerserk ? "#ffffff" : "#ff6666"
            ctx.beginPath()
            ctx.ellipse(side * r * 0.115, -r * 0.88, r * 0.075, r * 0.035, side * -0.2, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()

          ctx.fillStyle = "#450a0a"
          ctx.beginPath()
          ctx.moveTo(-r * 0.15, -r * 0.79)
          ctx.lineTo(r * 0.15, -r * 0.79)
          ctx.lineTo(r * 0.1, -r * 0.71)
          ctx.lineTo(0, -r * 0.68)
          ctx.lineTo(-r * 0.1, -r * 0.71)
          ctx.closePath()
          ctx.fill()

          ctx.strokeStyle = "#fb7185"
          ctx.lineWidth = r * 0.018
          ctx.beginPath()
          ctx.moveTo(-r * 0.07, -r * 0.75)
          ctx.lineTo(-r * 0.025, -r * 0.72)
          ctx.lineTo(r * 0.02, -r * 0.75)
          ctx.lineTo(r * 0.07, -r * 0.72)
          ctx.stroke()
        }

        // ARMOR DAMAGE 
        if (isArmored && armorPercent < 0.65) {
          ctx.strokeStyle = `rgba(248, 113, 113, ${0.35 + pulse * 0.3})`
          ctx.lineWidth = r * 0.025
          ctx.beginPath()
          ctx.moveTo(-r * 0.32, -r * 0.2)
          ctx.lineTo(-r * 0.22, -r * 0.08)
          ctx.lineTo(-r * 0.28, r * 0.04)
          ctx.stroke()

          if (armorPercent < 0.3) {
            ctx.fillStyle = `rgba(255, 100, 50, ${0.25 + pulse * 0.3})`
            ctx.beginPath()
            ctx.arc(r * 0.15, -r * 0.2, r * 0.055, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        ctx.restore()

        // MELEE SWIPE TELEGRAPH 
        if (isWindingUp) {
          ctx.save()

          const progress = windup
          const swipeRadius = meleeRange * (0.72 + progress * 0.18)
          const swipeAlpha = 0.15 + progress * 0.75

          ctx.globalAlpha = swipeAlpha
          ctx.lineCap = "round"

          ctx.strokeStyle = isBerserk ? "#ff2020" : (isArmored ? "#fbbf24" : "#ef4444")
          ctx.lineWidth = r * (0.035 + progress * 0.045)
          ctx.beginPath()
          ctx.arc(
            bx, by,
            swipeRadius,
            facing - (0.28 + progress * 0.3),
            facing + (0.28 + progress * 0.3)
          )
          ctx.stroke()

          ctx.strokeStyle = "#fff1f2"
          ctx.lineWidth = Math.max(2, r * 0.012)
          ctx.beginPath()
          ctx.arc(
            bx, by,
            swipeRadius * 0.96,
            facing - (0.2 + progress * 0.24),
            facing + (0.2 + progress * 0.24)
          )
          ctx.stroke()

          for (let i = 0; i < 7; i++) {
            const spread = (i / 6 - 0.5) * (0.5 + progress * 0.6)
            const a = facing + spread
            const d = swipeRadius * (0.85 + (i % 3) * 0.045)
            const px = bx + Math.cos(a) * d
            const py = by + Math.sin(a) * d

            ctx.fillStyle = isBerserk ? "#ffb4b4" : (isArmored ? "#fef3c7" : "#fecaca")
            ctx.beginPath()
            ctx.arc(px, py, r * (0.018 + progress * 0.018), 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.lineCap = "butt"
          ctx.restore()
        }
      
// Void Leviathan 

      } else if (boss.type === "voidLeviathan") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const phase = boss.leviathanPhase ?? "forceField"
        const phaseTimer = boss.leviathanPhaseTimer ?? 0
        const heading = boss.leviathanHeading ?? 0

        const isForceField = phase === "forceField"
        const isZigzag = phase === "zigzag"
        const isUroboros = phase === "uroboros"

        const hpPercent = boss.health / boss.maxHealth
        const isLowHP = hpPercent < 0.5
        const pulse = 0.5 + Math.sin(t / 150) * 0.5

        // COSMIC AURA

        ctx.save()
        ctx.globalCompositeOperation = "lighter"

            const auraRadius = isUroboros ? 300 : r * 2.5
        const aura = ctx.createRadialGradient(
          bx, by, r * 0.2,
          bx, by, auraRadius
        )

        if (isUroboros) {
        
          aura.addColorStop(0, "rgba(168, 85, 247, 0.45)")
          aura.addColorStop(0.5, "rgba(126, 34, 206, 0.30)")
          aura.addColorStop(0.85, "rgba(88, 28, 135, 0.15)")
          aura.addColorStop(1, "rgba(88, 28, 135, 0)")
        } else {
          aura.addColorStop(
            0,
            isLowHP
              ? "rgba(217,70,239,0.30)"
              : "rgba(126,34,206,0.24)"
          )
          aura.addColorStop(0.55, "rgba(126,34,206,0.13)")
          aura.addColorStop(1, "rgba(88,28,135,0)")
        }

              ctx.fillStyle = aura
        ctx.beginPath()
        ctx.arc(bx, by, auraRadius, 0, Math.PI * 2)
        ctx.fill()

        // Pulsing border for heal aura
        if (isUroboros) {
          ctx.strokeStyle = `rgba(232, 121, 249, ${0.7 + pulse * 0.3})`
          ctx.lineWidth = 6
          ctx.setLineDash([25, 20])
          ctx.lineDashOffset = -t / 25
          ctx.beginPath()
          ctx.arc(bx, by, auraRadius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          // Inner pulsing ring
          ctx.strokeStyle = `rgba(255, 200, 255, ${0.4 + pulse * 0.3})`
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(bx, by, auraRadius * 0.9, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()

        // FORCE FIELD

        if (isForceField) {
          ctx.save()
          ctx.globalCompositeOperation = "lighter"

          const shieldR = r * 2.0
          const shieldGrad = ctx.createRadialGradient(
            bx, by, r * 0.6,
            bx, by, shieldR
          )

          shieldGrad.addColorStop(0, "rgba(96,165,250,0.03)")
          shieldGrad.addColorStop(0.65, `rgba(96,165,250,${0.12 + pulse * 0.08})`)
          shieldGrad.addColorStop(1, "rgba(59,130,246,0.01)")

          ctx.fillStyle = shieldGrad
          ctx.beginPath()
          ctx.arc(bx, by, shieldR, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = `rgba(147,197,253,${0.45 + pulse * 0.4})`
          ctx.lineWidth = 2
          ctx.shadowColor = "#60a5fa"
          ctx.shadowBlur = 18

          // Rotating shield arcs
          for (let i = 0; i < 3; i++) {
            const arcR = shieldR * (0.76 + i * 0.1)
            const start = t / (700 + i * 250) + i * 2.1

            ctx.beginPath()
            ctx.arc(bx, by, arcR, start, start + Math.PI * 1.2)
            ctx.stroke()
          }

          // Hexagonal energy cells
          ctx.shadowBlur = 0
          ctx.lineWidth = 1

          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + t / 1800
            const hx = bx + Math.cos(a) * shieldR * 0.82
            const hy = by + Math.sin(a) * shieldR * 0.82
            const hexR = r * 0.22

            ctx.beginPath()
            for (let j = 0; j <= 6; j++) {
              const ha = (j / 6) * Math.PI * 2
              const x = hx + Math.cos(ha) * hexR
              const y = hy + Math.sin(ha) * hexR

              if (j === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
            ctx.stroke()
          }

          ctx.restore()
        }

        //  BODY
        // Head is at the front; body tapers into a long tail.
        // Ouroboros uses the same segments arranged as a ring.
        type LeviathanPoint = { x: number; y: number }

        const segmentCount = 24
        const bodyPoints: LeviathanPoint[] = []

        if (isUroboros) {
          const ringR = r * 2.0
          const startAngle = -Math.PI / 2 + Math.sin(t / 700) * 0.08

          for (let i = 0; i < segmentCount; i++) {
            const a =
              startAngle + (i / (segmentCount - 1)) * Math.PI * 2

            bodyPoints.push({
              x: Math.cos(a) * ringR,
              y: Math.sin(a) * ringR,
            })
          }
                   } else {
          // Local coordinates: head faces right, tail extends behind it.
          // Multi-frequency S-curves make the creature read as a serpent.
          const bodyLength = r * 9.2

          // When zigzagging, the whole body should "whip" — not just wave.
          // Add a large traveling wave that moves along the body.
          const travelPhase = t / 180

          for (let i = 0; i < segmentCount; i++) {
            const u = i / (segmentCount - 1)
            const x = -u * bodyLength

            // Big primary wave — VERY strong
            const primaryWave =
              Math.sin(u * Math.PI * 3.2 - travelPhase) *
              r * (0.5 + u * 1.2)  // ← much bigger

            // Secondary wave (opposite phase, faster)
            const secondaryWave =
              Math.sin(u * Math.PI * 6.4 + travelPhase * 1.5) *
              r * u * 0.6

            // Tertiary wave (subtle detail)
            const tertiaryWave =
              Math.cos(u * Math.PI * 1.6 - travelPhase * 0.7) *
              r * u * 0.3

            // Zigzag emphasis: add a big diagonal swing when zigzagging
            const zigzagSwing = isZigzag
              ? Math.sin(u * Math.PI * 2 - t / 150) * r * u * 1.8
              : 0

            bodyPoints.push({
              x,
              y: primaryWave + secondaryWave + tertiaryWave + zigzagSwing,
            })
          }
        }

        //  SEGMENTS FROM TAIL TO HEAD
        ctx.save()
        ctx.translate(bx, by)

        if (!isUroboros) {
          ctx.rotate(heading)
        }

        for (let i = segmentCount - 1; i >= 0; i--) {
          const p = bodyPoints[i]
          const u = i / (segmentCount - 1)

          // Head-side segments are thick; tail tapers naturally.
          const segmentR = r * (0.11 + (1 - u) * 0.39)

          const prev = bodyPoints[Math.max(0, i - 1)]
          const next = bodyPoints[Math.min(segmentCount - 1, i + 1)]
          const angle = Math.atan2(next.y - prev.y, next.x - prev.x)

          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(angle)

          const bodyGrad = ctx.createLinearGradient(
            0, -segmentR,
            0, segmentR
          )
          bodyGrad.addColorStop(0, "#c4b5fd")
          bodyGrad.addColorStop(0.22, "#7c3aed")
          bodyGrad.addColorStop(0.58, "#3b176b")
          bodyGrad.addColorStop(0.84, "#170c30")
          bodyGrad.addColorStop(1, "#090516")

          // Overlapping armored body segment
          ctx.shadowColor = isForceField ? "#60a5fa" : "#a855f7"
          ctx.shadowBlur = isZigzag ? 15 : 8
          ctx.fillStyle = bodyGrad
          ctx.strokeStyle = isForceField ? "#60a5fa" : "#6d28d9"
          ctx.lineWidth = Math.max(1, segmentR * 0.12)

          ctx.beginPath()
          ctx.ellipse(
            0, 0,
            segmentR * 1.35,
            segmentR,
            0, 0, Math.PI * 2
          )
          ctx.fill()
          ctx.stroke()

          // Bright dorsal armor ridge
          ctx.shadowBlur = 5
          ctx.strokeStyle = "#d8b4fe"
          ctx.lineWidth = Math.max(1, segmentR * 0.1)

          ctx.beginPath()
          ctx.moveTo(-segmentR * 0.65, -segmentR * 0.15)
          ctx.lineTo(-segmentR * 0.1, -segmentR * 0.62)
          ctx.lineTo(segmentR * 0.55, -segmentR * 0.12)
          ctx.stroke()

          // Backward-pointing spine
          if (i % 2 === 0 && i > 1) {
            ctx.fillStyle = isForceField ? "#93c5fd" : "#c084fc"
            ctx.beginPath()
            ctx.moveTo(-segmentR * 0.5, -segmentR * 0.45)
            ctx.lineTo(-segmentR * 0.95, -segmentR * 1.05)
            ctx.lineTo(segmentR * 0.05, -segmentR * 0.52)
            ctx.closePath()
            ctx.fill()
          }

          // Glowing side plate
          ctx.strokeStyle = "rgba(232,121,249,0.65)"
          ctx.lineWidth = Math.max(1, segmentR * 0.07)
          ctx.beginPath()
          ctx.moveTo(-segmentR * 0.35, segmentR * 0.48)
          ctx.lineTo(segmentR * 0.35, segmentR * 0.48)
          ctx.stroke()

          ctx.restore()
        }

        // FORKED TAIL

        const tail = bodyPoints[segmentCount - 1]
        const tailPrev = bodyPoints[segmentCount - 2]
        const tailAngle = Math.atan2(
          tail.y - tailPrev.y,
          tail.x - tailPrev.x
        )

        ctx.save()
        ctx.translate(tail.x, tail.y)
        ctx.rotate(tailAngle)

        ctx.strokeStyle = "#7e22ce"
        ctx.lineWidth = Math.max(2, r * 0.09)
        ctx.lineCap = "round"
        ctx.shadowColor = "#c084fc"
        ctx.shadowBlur = 12

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-r * 0.65, -r * 0.28)
        ctx.moveTo(0, 0)
        ctx.lineTo(-r * 0.65, r * 0.28)
        ctx.stroke()

        ctx.restore()

        ctx.restore()

        // HEAD

        ctx.save()

        let headX = bx
        let headY = by
        let headAngle = heading

        if (isUroboros) {
          // Place the head on the ring and point it along the curve.
          const head = bodyPoints[0]
          const next = bodyPoints[1]

          headX = bx + head.x
          headY = by + head.y
          headAngle = Math.atan2(
            next.y - head.y,
            next.x - head.x
          )
        }

        ctx.translate(headX, headY)
        ctx.rotate(headAngle)

        ctx.shadowColor = "#a855f7"
        ctx.shadowBlur = isZigzag ? 24 : 15

        const headGrad = ctx.createLinearGradient(
          -r, -r, r * 1.4, r
        )
        headGrad.addColorStop(0, "#1e1038")
        headGrad.addColorStop(0.42, "#6d28d9")
        headGrad.addColorStop(0.75, "#c084fc")
        headGrad.addColorStop(1, "#3b0764")

        // Long angular skull
        ctx.fillStyle = headGrad
        ctx.strokeStyle = "#d8b4fe"
        ctx.lineWidth = Math.max(1.5, r * 0.055)

        ctx.beginPath()
        ctx.moveTo(r * 1.55, 0)
        ctx.lineTo(r * 0.72, -r * 0.58)
        ctx.lineTo(r * 0.15, -r * 0.76)
        ctx.lineTo(-r * 0.68, -r * 0.48)
        ctx.lineTo(-r * 0.88, 0)
        ctx.lineTo(-r * 0.68, r * 0.48)
        ctx.lineTo(r * 0.15, r * 0.76)
        ctx.lineTo(r * 0.72, r * 0.58)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Brow horns
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#581c87"
          ctx.beginPath()
          ctx.moveTo(r * 0.05, side * r * 0.48)
          ctx.lineTo(-r * 0.48, side * r * 1.05)
          ctx.lineTo(r * 0.48, side * r * 0.66)
          ctx.closePath()
          ctx.fill()

          ctx.strokeStyle = "#c084fc"
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Two luminous eyes
        for (const side of [-1, 1]) {
          const ex = r * 0.52
          const ey = side * r * 0.29

          ctx.fillStyle = "#090516"
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.2, r * 0.17, 0, 0, Math.PI * 2)
          ctx.fill()

          const eyeGrad = ctx.createRadialGradient(
            ex - r * 0.04, ey - r * 0.04, 0,
            ex, ey, r * 0.2
          )
          eyeGrad.addColorStop(0, "#ffffff")
          eyeGrad.addColorStop(0.35, "#fef08a")
          eyeGrad.addColorStop(0.75, "#f59e0b")
          eyeGrad.addColorStop(1, "#7c2d12")

          ctx.fillStyle = eyeGrad
          ctx.shadowColor = "#facc15"
          ctx.shadowBlur = 18
          ctx.beginPath()
          ctx.ellipse(ex, ey, r * 0.16, r * 0.13, 0, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = "#1c071e"
          ctx.beginPath()
          ctx.ellipse(ex + r * 0.04, ey, r * 0.045, r * 0.1, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.shadowBlur = 0

        // Narrow jaw with visible fangs
        ctx.fillStyle = "#10051e"
        ctx.strokeStyle = "#c084fc"
        ctx.lineWidth = 1.5

        ctx.beginPath()
        ctx.moveTo(r * 0.48, -r * 0.12)
        ctx.lineTo(r * 1.45, 0)
        ctx.lineTo(r * 0.48, r * 0.12)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        for (let i = 0; i < 4; i++) {
          const tx = r * (0.62 + i * 0.17)

          ctx.fillStyle = "#f5d0fe"
          ctx.beginPath()
          ctx.moveTo(tx, -r * 0.08)
          ctx.lineTo(tx + r * 0.07, 0)
          ctx.lineTo(tx, r * 0.025)
          ctx.closePath()
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(tx, r * 0.08)
          ctx.lineTo(tx + r * 0.07, 0)
          ctx.lineTo(tx, -r * 0.025)
          ctx.closePath()
          ctx.fill()
        }

        // Side fins behind the skull
        for (const side of [-1, 1]) {
          ctx.fillStyle = "rgba(126,34,206,0.7)"
          ctx.strokeStyle = "#a855f7"
          ctx.lineWidth = 1.5

          ctx.beginPath()
          ctx.moveTo(-r * 0.35, side * r * 0.36)
          ctx.quadraticCurveTo(
            -r * 0.7, side * r * 0.9,
            -r * 1.15, side * r * 0.82
          )
          ctx.quadraticCurveTo(
            -r * 0.85, side * r * 0.35,
            -r * 0.35, side * r * 0.36
          )
          ctx.fill()
          ctx.stroke()
        }

        // Zigzag dash trails
        if (isZigzag) {
          ctx.globalCompositeOperation = "lighter"

          for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = `rgba(192,132,252,${0.45 - i * 0.08})`
            ctx.lineWidth = 4 - i * 0.6

            ctx.beginPath()
            ctx.moveTo(-r * 0.75, (i - 1.5) * r * 0.2)
            ctx.lineTo(-r * (1.5 + i * 0.35), (i - 1.5) * r * 0.4)
            ctx.stroke()
          }
        }

        ctx.restore()

        // OUROBOROS CORE + RING ACCENTS
        
        if (isUroboros) {
          ctx.save()
          ctx.globalCompositeOperation = "lighter"

          const corePulse = 0.6 + Math.sin(t / 110) * 0.25
          const coreR = r * 0.55

          const coreGrad = ctx.createRadialGradient(
            bx, by, 0,
            bx, by, coreR * 2
          )
          coreGrad.addColorStop(0, `rgba(255,220,255,${corePulse})`)
          coreGrad.addColorStop(0.35, "rgba(216,180,254,0.35)")
          coreGrad.addColorStop(1, "rgba(168,85,247,0)")

          ctx.fillStyle = coreGrad
          ctx.beginPath()
          ctx.arc(bx, by, coreR * 2, 0, Math.PI * 2)
          ctx.fill()

          ctx.strokeStyle = `rgba(232,121,249,${0.5 + pulse * 0.4})`
          ctx.lineWidth = 3
          ctx.setLineDash([10, 12])
          ctx.lineDashOffset = -t / 24
          ctx.beginPath()
          ctx.arc(bx, by, r * 2.7, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.restore()
        }

        // PHASE LABEL

        ctx.save()
        ctx.textAlign = "center"
        ctx.font = "bold 14px Arial"

        if (isForceField) {
          ctx.fillStyle = "#93c5fd"
          ctx.shadowColor = "#3b82f6"
          ctx.shadowBlur = 12
          ctx.fillText("FORCE FIELD", bx, by - r * 2.35)
        } else if (isZigzag) {
          ctx.fillStyle = "#e9d5ff"
          ctx.shadowColor = "#a855f7"
          ctx.shadowBlur = 12
          ctx.fillText(
            `HUNT ${Math.min(4, boss.leviathanDashCount ?? 0)}/4`,
            bx, by - r * 1.65
          )
        } else {
          ctx.fillStyle = "#e9d5ff"
          ctx.shadowColor = "#a855f7"
          ctx.shadowBlur = 12
          ctx.fillText("OUROBOROS", bx, by - r * 3.05)
        }

        ctx.restore()
      

// The Hive 

      } else if (boss.type === "theHive") {
        const r = boss.radius
        const t = bossTime
        const bx = boss.x
        const by = boss.y

        const hpPercent = boss.health / boss.maxHealth
        const isLowHP = hpPercent < 0.75  // After first transition

        const breath = 1 + Math.sin(t / 250) * 0.05
        const wobble = Math.sin(t / 180) * r * 0.03

        // HIVE AURA (yellow-orange, pulsing)

        ctx.save()
        ctx.globalCompositeOperation = "lighter"

        const auraPulse = 0.5 + Math.sin(t / 150) * 0.5
        const auraColor = isLowHP ? "255, 100, 0" : "251, 191, 36"

        const auraGrad = ctx.createRadialGradient(bx, by, r * 0.3, bx, by, r * 2.2)
        auraGrad.addColorStop(0, `rgba(${auraColor}, ${0.2 + auraPulse * 0.1})`)
        auraGrad.addColorStop(0.5, `rgba(${auraColor}, ${0.1 + auraPulse * 0.05})`)
        auraGrad.addColorStop(1, `rgba(${auraColor}, 0)`)

        ctx.fillStyle = auraGrad
        ctx.beginPath()
        ctx.arc(bx, by, r * 2.2, 0, Math.PI * 2)
        ctx.fill()

        // Floating particles (honey drops)

        for (let i = 0; i < 10; i++) {
          const pa = t / 500 + (i / 10) * Math.PI * 2
          const pd = r * (1.2 + Math.sin(t / 200 + i) * 0.3)
          const px = bx + Math.cos(pa) * pd
          const py = by + Math.sin(pa) * pd * 0.6

          ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + Math.sin(t / 100 + i) * 0.3})`
          ctx.beginPath()
          ctx.arc(px, py, r * 0.05, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()

        // SHOCK AURA (arms whipping)
        const shockAuraRadius = r * 3
        const shockPulse = 0.5 + Math.sin(t / 80) * 0.5  // fast pulse (sync with arms)

        ctx.save()
        ctx.globalCompositeOperation = "lighter"

        // Filled aura
        const shockGrad = ctx.createRadialGradient(bx, by, r, bx, by, shockAuraRadius)
        shockGrad.addColorStop(0, `rgba(251, 191, 36, ${0.15 + shockPulse * 0.1})`)
        shockGrad.addColorStop(0.7, `rgba(251, 146, 60, ${0.08 + shockPulse * 0.05})`)
        shockGrad.addColorStop(1, "rgba(251, 191, 36, 0)")
        ctx.fillStyle = shockGrad
        ctx.beginPath()
        ctx.arc(bx, by, shockAuraRadius, 0, Math.PI * 2)
        ctx.fill()

        // Pulsing border
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 + shockPulse * 0.3})`
        ctx.lineWidth = 3
        ctx.setLineDash([15, 10])
        ctx.lineDashOffset = -t / 30
        ctx.beginPath()
        ctx.arc(bx, by, shockAuraRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        // Whipping arm trails (visual sync)
        for (let i = 0; i < 4; i++) {
          const trailAngle = (i / 4) * Math.PI * 2 + t / 150
          const trailRadius = shockAuraRadius * (0.85 + Math.sin(t / 100 + i) * 0.1)
          const tx = bx + Math.cos(trailAngle) * trailRadius
          const ty = by + Math.sin(trailAngle) * trailRadius

          ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + shockPulse * 0.3})`
          ctx.beginPath()
          ctx.arc(tx, ty, r * 0.08, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()

        // BODY (large, uneven ellipse)
        ctx.save()
        ctx.translate(bx + wobble, by)
        ctx.scale(breath, breath)

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
        ctx.beginPath()
        ctx.ellipse(0, r * 1.05, r * 1.0, r * 0.25, 0, 0, Math.PI * 2)
        ctx.fill()

        // Body base (irregular blob)
        const bodyGrad = ctx.createRadialGradient(
          -r * 0.3, -r * 0.3, r * 0.1,
          0, 0, r * 1.15
        )
        bodyGrad.addColorStop(0, "#7c2d12")
        bodyGrad.addColorStop(0.4, "#451a03")
        bodyGrad.addColorStop(0.8, "#291002")
        bodyGrad.addColorStop(1, "#0a0501")

        ctx.fillStyle = bodyGrad
        ctx.strokeStyle = "#1c0a01"
        ctx.lineWidth = r * 0.06

        // Irregular body shape
        ctx.beginPath()
        const bodyPoints = 20
        for (let i = 0; i <= bodyPoints; i++) {
          const a = (i / bodyPoints) * Math.PI * 2
          const bulge =
            Math.sin(a * 4 + t / 400) * r * 0.06 +
            Math.cos(a * 6 - t / 300) * r * 0.04
          const rad = r * 1.0 + bulge
          const px = Math.cos(a) * rad
          const py = Math.sin(a) * rad * 0.9
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Honeycomb pattern (hexagons on body)

        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)"
        ctx.lineWidth = r * 0.02
        for (let i = 0; i < 8; i++) {
          const ha = (i / 8) * Math.PI * 2 + t / 3000
          const hr = r * (0.3 + (i % 3) * 0.15)
          const hx = Math.cos(ha) * hr
          const hy = Math.sin(ha) * hr * 0.8

          // Small hexagon
          const hexSize = r * 0.1
          ctx.beginPath()
          for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2
            const px = hx + Math.cos(angle) * hexSize
            const py = hy + Math.sin(angle) * hexSize
            if (j === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }

        // Yellow spots (honey pools)
        ctx.fillStyle = "rgba(251, 191, 36, 0.6)"
        for (let i = 0; i < 5; i++) {
          const sa = (i / 5) * Math.PI * 2 + t / 2500
          const sr = r * (0.4 + (i % 2) * 0.2)
          const sx = Math.cos(sa) * sr
          const sy = Math.sin(sa) * sr * 0.7
          ctx.beginPath()
          ctx.ellipse(sx, sy, r * 0.12, r * 0.08, sa, 0, Math.PI * 2)
          ctx.fill()
        }

        // 3 HEADS (hydra style)

        const headPositions = [
          { x: -r * 0.6, y: -r * 0.5, side: -1 },  // left
          { x: 0, y: -r * 0.75, side: 0 },          // center (biggest)
          { x: r * 0.6, y: -r * 0.5, side: 1 },     // right
        ]

        for (let i = 0; i < headPositions.length; i++) {
          const head = headPositions[i]
          const isCenter = i === 1
          const headR = r * (isCenter ? 0.35 : 0.28)
          const headSway = Math.sin(t / 300 + i * 1.5) * r * 0.05

          // Head shadow
          ctx.fillStyle = "#1c0a01"
          ctx.beginPath()
          ctx.arc(head.x, head.y + headSway, headR * 1.05, 0, Math.PI * 2)
          ctx.fill()

          // Head
          const headGrad = ctx.createRadialGradient(
            head.x - headR * 0.3, head.y - headR * 0.3 + headSway, headR * 0.05,
            head.x, head.y + headSway, headR * 1.1
          )
          headGrad.addColorStop(0, "#a16207")
          headGrad.addColorStop(0.5, "#713f12")
          headGrad.addColorStop(1, "#291002")

          ctx.fillStyle = headGrad
          ctx.strokeStyle = "#1c0a01"
          ctx.lineWidth = r * 0.025

          ctx.beginPath()
          ctx.arc(head.x, head.y + headSway, headR, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // Eyes (different for each head)
          if (i === 0) {
            // Left head — 1 eye
            ctx.fillStyle = "#0a0000"
            ctx.beginPath()
            ctx.arc(head.x - headR * 0.2, head.y + headSway, headR * 0.3, 0, Math.PI * 2)
            ctx.fill()

            ctx.shadowColor = "#fbbf24"
            ctx.shadowBlur = 10
            ctx.fillStyle = "#fbbf24"
            ctx.beginPath()
            ctx.arc(head.x - headR * 0.2, head.y + headSway, headR * 0.15, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0
          } else if (i === 1) {
            // Center head — 2 eyes
            for (const side of [-1, 1]) {
              ctx.fillStyle = "#0a0000"
              ctx.beginPath()
              ctx.arc(head.x + side * headR * 0.3, head.y + headSway, headR * 0.25, 0, Math.PI * 2)
              ctx.fill()

              ctx.shadowColor = "#fbbf24"
              ctx.shadowBlur = 15
              ctx.fillStyle = "#fbbf24"
              ctx.beginPath()
              ctx.arc(head.x + side * headR * 0.3, head.y + headSway, headR * 0.12, 0, Math.PI * 2)
              ctx.fill()
              ctx.shadowBlur = 0
            }
          } else {
            // Right head — 3 eyes (alien)
            for (let e = -1; e <= 1; e++) {
              const ex = head.x + e * headR * 0.25
              const ey = head.y + headSway + Math.abs(e) * headR * 0.15

              ctx.fillStyle = "#0a0000"
              ctx.beginPath()
              ctx.arc(ex, ey, headR * 0.2, 0, Math.PI * 2)
              ctx.fill()

              ctx.shadowColor = "#ef4444"
              ctx.shadowBlur = 10
              ctx.fillStyle = "#ef4444"
              ctx.beginPath()
              ctx.arc(ex, ey, headR * 0.1, 0, Math.PI * 2)
              ctx.fill()
              ctx.shadowBlur = 0
            }
          }

          // Mouth (each head)
          ctx.fillStyle = "#0a0000"
          ctx.beginPath()
          ctx.ellipse(
            head.x,
            head.y + headSway + headR * 0.4,
            headR * 0.4,
            headR * 0.15,
            0,
            0,
            Math.PI * 2
          )
          ctx.fill()

          // Teeth
          ctx.fillStyle = "#e5d5b8"
          for (let tooth = -1; tooth <= 1; tooth++) {
            const tx = head.x + tooth * headR * 0.15
            const ty = head.y + headSway + headR * 0.35

            ctx.beginPath()
            ctx.moveTo(tx - headR * 0.05, ty)
            ctx.lineTo(tx + headR * 0.05, ty)
            ctx.lineTo(tx, ty + headR * 0.12)
            ctx.closePath()
            ctx.fill()
          }
        }

        // 4 ARMS (different sizes)

        const armPositions = [
          { x: -r * 0.9, y: -r * 0.1, angle: -0.5, len: 2 },  // left
          { x: r * 0.9, y: -r * 0.1, angle: 0.5, len: 2.4 },    // right
          { x: -r * 0.5, y: r * 0.4, angle: 0.8, len: 1.5 },    // bottom-left
          { x: r * 0.5, y: r * 0.4, angle: -0.8, len: 1.3 },    // bottom-right
        ]

        for (let i = 0; i < armPositions.length; i++) {
          const arm = armPositions[i]
         const armSway = Math.sin(t / 400 + i * 2) * r * 0.15  

          ctx.strokeStyle = "#451a03"
          ctx.lineWidth = r * 0.15
          ctx.lineCap = "round"

          const endX = arm.x + Math.cos(arm.angle + armSway) * r * arm.len
          const endY = arm.y + Math.sin(arm.angle + armSway) * r * arm.len

          ctx.beginPath()
          ctx.moveTo(arm.x, arm.y)
          ctx.quadraticCurveTo(
            (arm.x + endX) / 2,
            (arm.y + endY) / 2 - r * 0.2,
            endX,
            endY
          )
          ctx.stroke()

          // Claw at end
          ctx.fillStyle = "#1c0a01"
          ctx.beginPath()
          ctx.arc(endX, endY, r * 0.1, 0, Math.PI * 2)
          ctx.fill()

          // Sharp claws
          for (let c = -1; c <= 1; c++) {
            ctx.strokeStyle = "#e5d5b8"
            ctx.lineWidth = r * 0.03
            ctx.beginPath()
            ctx.moveTo(endX, endY)
            ctx.lineTo(
              endX + Math.cos(arm.angle + armSway + c * 0.3) * r * 0.15,
              endY + Math.sin(arm.angle + armSway + c * 0.3) * r * 0.15
            )
            ctx.stroke()
          }

          ctx.lineCap = "butt"
        }

        // 2 TATTERED WINGS

        for (const side of [-1, 1]) {
          ctx.save()
           ctx.translate(side * r * 1.0, -r * 0.4)
          ctx.rotate(side * (0.3 + Math.sin(t / 200) * 0.1))

          ctx.fillStyle = "rgba(251, 191, 36, 0.55)"  
          ctx.strokeStyle = "#a16207"
          ctx.lineWidth = r * 0.02

          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.quadraticCurveTo(side * r * 0.8, -r * 0.5, side * r * 1.2, -r * 0.2)
          ctx.quadraticCurveTo(side * r * 0.9, r * 0.2, side * r * 0.6, r * 0.1)
          // Tattered edge
          for (let i = 0; i < 4; i++) {
            const tx = side * r * (0.6 - i * 0.15)
            const ty = r * (0.1 - i * 0.05)
            ctx.lineTo(tx, ty + r * 0.15)
            ctx.lineTo(tx - side * r * 0.05, ty + r * 0.05)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.restore()
        }

        // SPLIT TAIL (3 branches)

        const tailBaseX = 0
        const tailBaseY = r * 0.7
        const tailWave = Math.sin(t / 200) * r * 0.1

        for (let i = -1; i <= 1; i++) {
          ctx.strokeStyle = "#451a03"
          ctx.lineWidth = r * 0.12
          ctx.lineCap = "round"

          const endX = i * r * 0.4 + tailWave
          const endY = r * 1.6

          ctx.beginPath()
          ctx.moveTo(tailBaseX, tailBaseY)
          ctx.quadraticCurveTo(
            i * r * 0.3,
            r * 1.1,
            endX,
            endY
          )
          ctx.stroke()

          // Tail tip glow
          ctx.fillStyle = "#fbbf24"
          ctx.shadowColor = "#fbbf24"
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(endX, endY, r * 0.06, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
        ctx.lineCap = "butt"

        ctx.restore()
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
