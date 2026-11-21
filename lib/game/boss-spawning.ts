
import type { Boss, BossType } from "@/lib/game/types"
import { getBossBehavior } from "@/lib/game/bosses"
import { OscillatorWaveType } from "./audio"

const BOSS_TYPES: BossType[] = [
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

type SpawnBossOptions = {
  canvas: HTMLCanvasElement
  lastBossWave: number
  playSound: (freq: number, dur: number, type?: OscillatorWaveType) => void
}
/**
 * Spawns a boss based on the current wave.
 * Returns the new boss object, or null if no boss should spawn.
 */
export function spawnBoss(options: SpawnBossOptions): Boss | null {
  const { canvas, lastBossWave, playSound } = options

  // Bosses rotate through distinct alien species every five waves
  const bossIndex = Math.floor(lastBossWave / 5) % BOSS_TYPES.length
  const type = BOSS_TYPES[bossIndex]

  // Every full cycle through all bosses = +60% HP for extra challenge
  const cycleNumber = Math.floor(Math.floor(lastBossWave / 5) / BOSS_TYPES.length)
  const healthMultiplier = 1 + cycleNumber * 0.6

  // Get behavior from registry — each boss defines its own stats + creation
  const behavior = getBossBehavior(type)
  const stats = behavior.getStats()

  // Apply cycle multiplier to health
  const health = Math.floor(stats.health * healthMultiplier)

  // Create boss via behavior
  const boss = behavior.create(canvas.width, canvas.height)
  boss.health = health
  boss.maxHealth = health

  // Boss announcement sound
  playSound(100, 0.5, "sawtooth")

  return boss
}