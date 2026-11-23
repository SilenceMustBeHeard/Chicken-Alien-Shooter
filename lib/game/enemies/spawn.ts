
import type { Enemy, EnemyType } from "@/lib/game/types"
import { DIFFICULTY_SCALING, ALIEN_COLORS } from "@/lib/game/constants"

export type SpawnEnemiesContext = {
  canvas: HTMLCanvasElement
  wave: number
  timeInSeconds: number
  existingEnemyCount: number
  pushEnemy: (enemy: Enemy) => void
}

export function spawnEnemies(ctx: SpawnEnemiesContext): void {
  const { canvas, wave, timeInSeconds, existingEnemyCount, pushEnemy } = ctx

  // Calculate difficulty multipliers based on game time
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
  if (existingEnemyCount >= maxEnemies) {
    return // Soft cap - delay spawning
  }

  const groupId = Date.now()
  const side = Math.floor(Math.random() * 4)

  // Determine alien types based on wave progression
  const alienTypes: EnemyType[] = ["grunt"]
  if (wave > 5) alienTypes.push("tank")
  if (wave > 10) alienTypes.push("leech")
  if (wave > 15) alienTypes.push("splitter")
  if (wave > 20) alienTypes.push("blinker")

  // Occasionally spawn a tank as a special
  const spawnTank = Math.random() < DIFFICULTY_SCALING.TANK_SPAWN_CHANCE && wave > 5

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
    let health = 2 + Math.floor(wave / 5)
    let speed = (0.4 + difficultyTier * 0.03) * speedMultiplier

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

    pushEnemy({
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
      color: ALIEN_COLORS[type] ?? "#00ff00",
    })
  }
}