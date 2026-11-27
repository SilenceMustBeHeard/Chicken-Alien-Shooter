
import { useRef, type RefObject } from "react"
import type { Enemy, Player } from "@/lib/game/types"
import {
  spawnEnemies as spawnEnemiesFromModule,
  updateEnemies as updateEnemiesFromModule,
} from "@/lib/game/enemies"

export type UseEnemiesOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  playerRef: RefObject<Player | null>
  createParticles: (x: number, y: number, color: string) => void
  onEnemyContact: (enemy: Enemy, damage: number) => void
}

export function useEnemies(options: UseEnemiesOptions) {
  const enemiesRef = useRef<Enemy[]>([])

  const spawnEnemies = (wave: number, timeInSeconds: number) => {
    const canvas = options.canvasRef.current
    if (!canvas) return

    spawnEnemiesFromModule({
      canvas,
      wave,
      timeInSeconds,
      existingEnemyCount: enemiesRef.current.length,
      pushEnemy: (enemy) => enemiesRef.current.push(enemy),
    })
  }

  const updateEnemies = (canvas: HTMLCanvasElement, deltaTime: number, frameScale: number) => {
    const player = options.playerRef.current
    if (!player) return

    enemiesRef.current = updateEnemiesFromModule({
      enemies: enemiesRef.current,
      player,
      canvas,
      deltaTime,
      frameScale,
      createParticles: options.createParticles,
      onEnemyContact: options.onEnemyContact,
    })
  }

  return {
    enemiesRef,
    spawnEnemies,
    updateEnemies,
  }
}