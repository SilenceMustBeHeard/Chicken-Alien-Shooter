
import { useRef, type RefObject } from "react"
import type { Player } from "@/lib/game/types"
import { updatePlayer as updatePlayerFromModule } from "@/lib/game/player"

export type UsePlayerOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  keysRef: RefObject<Set<string>>
  mouseRef: RefObject<{ x: number; y: number; down: boolean }>
  isMobile: boolean
  joystickActive: boolean
  joystickPos: { x: number; y: number }
  shootButtonPressed: boolean
  shoot: (canvas: HTMLCanvasElement, angle?: number) => void
  onCharge: () => void
  onStun: () => void
  chickenHitSound: () => void
}

export function usePlayer(options: UsePlayerOptions) {
  const playerRef = useRef<Player | null>(null)

  const initPlayer = () => {
    const canvas = options.canvasRef.current
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
  }

  const updatePlayer = (canvas: HTMLCanvasElement, deltaTime: number) => {
    const player = playerRef.current
    if (!player) return

    updatePlayerFromModule({
      player,
      keys: options.keysRef.current,
      mouse: options.mouseRef.current,
      canvas,
      isMobile: options.isMobile,
      joystickActive: options.joystickActive,
      joystickPos: options.joystickPos,
      shootButtonPressed: options.shootButtonPressed,
      deltaTime,
      shoot: () => options.shoot(canvas),
      onCharge: options.onCharge,
      onStun: options.onStun,
    })
  }

  return {
    playerRef,
    initPlayer,
    updatePlayer,
  }
}