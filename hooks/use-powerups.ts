
import { useRef, type RefObject } from "react"
import type { Player, PowerUp } from "@/lib/game/types"
import {
  spawnPowerUp as spawnPowerUpFromModule,
  spawnWeaponPowerUp as spawnWeaponPowerUpFromModule,
  updatePowerUps as updatePowerUpsFromModule,
} from "@/lib/game/powerups"

export type UsePowerUpsOptions = {
  playerRef: RefObject<Player | null>
  onCollect: (powerUp: PowerUp, player: Player) => void
}

export function usePowerUps(options: UsePowerUpsOptions) {
  const powerUpsRef = useRef<PowerUp[]>([])

  const spawnPowerUp = (canvas: HTMLCanvasElement) => {
    spawnPowerUpFromModule(canvas, (powerUp) => powerUpsRef.current.push(powerUp))
  }

  const spawnWeaponPowerUp = (x: number, y: number) => {
    spawnWeaponPowerUpFromModule(x, y, (powerUp) => powerUpsRef.current.push(powerUp))
  }

  const updatePowerUps = (player: Player, deltaTime: number) => {
    powerUpsRef.current = updatePowerUpsFromModule({
      powerUps: powerUpsRef.current,
      player,
      deltaTime,
      onCollect: (powerUp) => {
        options.onCollect(powerUp, player)
      },
    })
  }

  return {
    powerUpsRef,
    spawnPowerUp,
    spawnWeaponPowerUp,
    updatePowerUps,
  }
}