
import type { ScreenShake } from "../screen-shake"

export function createScreenShake(
  intensityRef: React.RefObject<number>,
): ScreenShake {
  return {
    shake(intensity) {
      if (intensity > intensityRef.current) {
        intensityRef.current = intensity
      }
    },
  }
}