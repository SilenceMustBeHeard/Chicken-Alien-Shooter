// hooks/use-projectiles.ts

import { type RefObject } from "react"
import type { Boss, Enemy, Player, Projectile } from "@/lib/game/types"
import type { OscillatorWaveType } from "@/lib/game/audio"
import { updateProjectiles as updateProjectilesFromModule } from "@/lib/game/projectiles"

export type UseProjectilesOptions = {
  projectilesRef: RefObject<Projectile[]>
  playerRef: RefObject<Player | null>
  bossRef: RefObject<Boss | null>
  enemiesRef: RefObject<Enemy[]>
  playSound: (freq: number, dur: number, type?: OscillatorWaveType) => void
  onLeviathanWaveHit: (proj: Projectile, player: Player) => void
  onEnemyProjectileHitPlayer: (proj: Projectile, player: Player) => void
  onBossHit: (proj: Projectile, boss: Boss) => void
  onEnemyHit: (proj: Projectile, enemy: Enemy) => void
  createParticles: (x: number, y: number, color: string) => void
  addFloatingText: (x: number, y: number, text: string, color: string, size?: number) => void
  addScreenShake: (intensity: number) => void
  eggSplashSound: () => void
  enemyDeadSound: () => void
  chickenHitSound: () => void
  chickenDeathSound: () => void
  setGameOver: () => void
  spawnWeaponPowerUp: (x: number, y: number) => void
  getAlienColor: (type: Enemy["type"]) => string
  scoreRef: RefObject<number>
  setScore: (score: number) => void
  killCountRef: RefObject<number>
  setKillCount: (count: number) => void
}

export function useProjectiles(options: UseProjectilesOptions) {
  const updateProjectiles = (canvas: HTMLCanvasElement, player: Player, deltaTime: number) => {
    options.projectilesRef.current = updateProjectilesFromModule({
      projectiles: options.projectilesRef.current,
      player,
      canvas,
      deltaTime,
      bossRef: options.bossRef,
      enemiesRef: options.enemiesRef,
      onLeviathanWaveHit: options.onLeviathanWaveHit,
      onHiveLordHit: () => {},
      onHiveSpawnHit: () => {},
      onEnemyProjectileHitPlayer: options.onEnemyProjectileHitPlayer,
      onBossHit: options.onBossHit,
      onEnemyHit: options.onEnemyHit,
      createParticles: options.createParticles,
      addFloatingText: options.addFloatingText,
      addScreenShake: options.addScreenShake,
      playSound: options.playSound,
      eggSplashSound: options.eggSplashSound,
      enemyDeadSound: options.enemyDeadSound,
      chickenHitSound: options.chickenHitSound,
      chickenDeathSound: options.chickenDeathSound,
      setGameOver: options.setGameOver,
      spawnWeaponPowerUp: options.spawnWeaponPowerUp,
      getAlienColor: options.getAlienColor,
      scoreRef: options.scoreRef,
      setScore: options.setScore,
      killCountRef: options.killCountRef,
      setKillCount: options.setKillCount,
    })
  }

  return { updateProjectiles }
}