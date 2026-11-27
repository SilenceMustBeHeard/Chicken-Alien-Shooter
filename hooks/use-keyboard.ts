
import { useEffect, type RefObject } from "react"

// keyboard hook to handle key presses and player charge ability
export function useKeyboard(
  keysRef: RefObject<Set<string>>,
  gameStateRef: RefObject<string>,
  playerRef: RefObject<{ isCharging: boolean; chargeCooldown: number; chargeDistance: number; chargeDirection: { x: number; y: number }; chargeReady: boolean; x: number; y: number } | null>,
  mouseRef: RefObject<{ x: number; y: number }>,
  onCharge: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysRef.current.add(key)

      // Q = Charge ability
      if (key === "q" && gameStateRef.current === "playing") {
        const player = playerRef.current
        if (player && !player.isCharging && player.chargeCooldown <= 0) {
          let dirX = 0
          let dirY = 0

          if (keysRef.current.has("w") || keysRef.current.has("arrowup")) dirY = -1
          if (keysRef.current.has("s") || keysRef.current.has("arrowdown")) dirY = 1
          if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) dirX = -1
          if (keysRef.current.has("d") || keysRef.current.has("arrowright")) dirX = 1

          if (dirX === 0 && dirY === 0) {
            const angleToMouse = Math.atan2(
              mouseRef.current.y - player.y,
              mouseRef.current.x - player.x,
            )
            dirX = Math.cos(angleToMouse)
            dirY = Math.sin(angleToMouse)
          } else {
            const len = Math.sqrt(dirX * dirX + dirY * dirY)
            dirX /= len
            dirY /= len
          }

          player.isCharging = true
          player.chargeDistance = 0
          player.chargeCooldown = 15000
          player.chargeDirection = { x: dirX, y: dirY }
          player.chargeReady = false

          onCharge()
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
    }
  }, [keysRef, gameStateRef, playerRef, mouseRef, onCharge])
}