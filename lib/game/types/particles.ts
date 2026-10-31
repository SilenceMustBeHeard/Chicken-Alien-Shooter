// lib/game/types/particles.ts

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export type FloatingText = {
  x: number
  y: number
  text: string
  color: string
  life: number
  fontSize: number
  velocity: { x: number; y: number }
}