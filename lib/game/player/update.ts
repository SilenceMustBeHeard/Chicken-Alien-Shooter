
import type { Player } from "@/lib/game/types"

export type PlayerUpdateContext = {
  player: Player
  keys: Set<string>
  mouse: { x: number; y: number; down: boolean }
  canvas: HTMLCanvasElement
  isMobile: boolean
  joystickActive: boolean
  joystickPos: { x: number; y: number }
  shootButtonPressed: boolean
  deltaTime: number
  shoot: () => void
  onCharge: () => void
  onStun: () => void
}

/**
 * Updates player movement, cooldowns, and actions
 * Returns nothing — mutates player in place
 */
export function updatePlayer(ctx: PlayerUpdateContext): void {
  const {
    player,
    keys,
    canvas,
    isMobile,
    joystickActive,
    joystickPos,
    deltaTime,
    shoot,
    onCharge,
    onStun,
  } = ctx

  // Movement 
  let dx = 0
  let dy = 0

  if (isMobile && joystickActive) {
    dx = joystickPos.x
    dy = joystickPos.y
  } else {
    if (keys.has("w") || keys.has("arrowup")) dy -= 1
    if (keys.has("s") || keys.has("arrowdown")) dy += 1
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1
    if (keys.has("d") || keys.has("arrowright")) dx += 1
  }

  // Charge (from power-up or Q key) 
  if (player.isCharging) {
    const chargeSpeed = 15
    player.x += player.chargeDirection.x * chargeSpeed
    player.y += player.chargeDirection.y * chargeSpeed
    player.chargeDistance += chargeSpeed

    if (player.chargeDistance > 300) {
      player.isCharging = false
      player.chargeDistance = 0
      player.chargeDirection = { x: 0, y: 0 }
    }
  } else if (player.chargeReady) {
    // Wait for direction input
    let dirX = 0
    let dirY = 0
    if (keys.has("w") || keys.has("arrowup")) dirY = -1
    if (keys.has("s") || keys.has("arrowdown")) dirY = 1
    if (keys.has("a") || keys.has("arrowleft")) dirX = -1
    if (keys.has("d") || keys.has("arrowright")) dirX = 1

    if (dirX !== 0 || dirY !== 0) {
      const len = Math.sqrt(dirX * dirX + dirY * dirY)
      player.isCharging = true
      player.chargeDistance = 0
      player.chargeDirection = { x: dirX / len, y: dirY / len }
      player.chargeReady = false
      onCharge()

      player.x += player.chargeDirection.x * 15
      player.y += player.chargeDirection.y * 15
      player.chargeDistance += 15
    } else {
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length > 0) {
        player.x += (dx / length) * player.speed
        player.y += (dy / length) * player.speed
      }
    }
  } else {
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length > 0) {
      player.x += (dx / length) * player.speed
      player.y += (dy / length) * player.speed
    }
  }

  // Keep in bounds 
  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x))
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y))

  // Cooldowns 
  if (player.chargeCooldown > 0) player.chargeCooldown -= deltaTime
  if (player.stunCooldown > 0) player.stunCooldown -= deltaTime
  if (player.invincibleTime > 0) player.invincibleTime--
  if (player.shootCooldown > 0) player.shootCooldown--

  // Shooting 
  if ((ctx.mouse.down || ctx.shootButtonPressed) && player.shootCooldown <= 0) {
    shoot()
  }

  // Stun (Space) 
  if (keys.has(" ") && player.stunCooldown <= 0 && !player.isCharging) {
    onStun()
    keys.delete(" ")
  }

  // Weapon timer 
  if (player.weaponType !== "basic" && player.weaponTime > 0) {
    player.weaponTime -= deltaTime
    if (player.weaponTime <= 0) {
      player.weaponType = "basic"
    }
  }

  //  Shield timer 
  if (player.shield && player.shieldTime > 0) {
    player.shieldTime -= deltaTime
    if (player.shieldTime <= 0) player.shield = false
  }
}