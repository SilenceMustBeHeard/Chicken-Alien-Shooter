
import type { FloatingText } from "@/lib/game/types"
import type { FloatingTextSpawner } from "../floating-text-spawner"

export function createFloatingTextSpawner(
  ref: React.RefObject<FloatingText[]>,
): FloatingTextSpawner {
  return {
    spawn(x, y, text, color, size = 20) {
      ref.current.push({
        x,
        y,
        text,
        color,
        life: 60,
        fontSize: size,
        velocity: { x: 0, y: -1 },
      })
    },
  }
}