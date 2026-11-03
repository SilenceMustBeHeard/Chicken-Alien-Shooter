
import type { Particle } from "@/lib/game/types"
import type { ParticleSpawner } from "../particle-spawner"

export function createParticleSpawner(
  ref: React.RefObject<Particle[]>,
): ParticleSpawner {
  return {
    burst(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count
        const speed = 2 + Math.random() * 3
        ref.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30,
          color,
        })
      }
    },

    trail(x, y, color) {
      ref.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: 20,
        color,
      })
    },
  }
}