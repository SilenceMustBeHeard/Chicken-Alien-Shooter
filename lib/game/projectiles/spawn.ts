
import type { Player, Projectile } from "@/lib/game/types"

export type ShootOptions = {
  player: Player
  angle?: number
  mouseX: number
  mouseY: number
  pushProjectile: (proj: Projectile) => void
  playSound: (freq: number, dur: number, type?: "sine" | "square" | "sawtooth" | "triangle") => void
}

export function shoot(options: ShootOptions): void {
  const { player, angle, mouseX, mouseY, pushProjectile, playSound } = options

  const getShootAngle = () => {
    return angle !== undefined ? angle : Math.atan2(mouseY - player.y, mouseX - player.x)
  }

  let cooldownTime = 15

  if (player.shootCooldown <= 0) {
    playSound(500, 0.08, "square") // shootSound

    switch (player.weaponType) {
      case "basic":
        cooldownTime = 15
        pushProjectile({
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
        cooldownTime = 10
        for (let i = -1; i <= 1; i += 2) {
          const perpAngle = getShootAngle() + Math.PI / 2
          const offsetX = Math.cos(perpAngle) * 8 * i
          const offsetY = Math.sin(perpAngle) * 8 * i

          pushProjectile({
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
        cooldownTime = 12
        for (let i = -2; i <= 2; i++) {
          const spreadAngle = getShootAngle() + i * 0.25
          pushProjectile({
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
        cooldownTime = 20
        pushProjectile({
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
        cooldownTime = 25
        pushProjectile({
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
        cooldownTime = 30
        pushProjectile({
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
        playSound(1200, 0.3, "sine")
        break
    }

    player.shootCooldown = cooldownTime
  }
}