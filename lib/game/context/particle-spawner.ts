
export interface ParticleSpawner {
 // Spawn a burst of particles 
  burst(x: number, y: number, color: string, count?: number): void

//  Spawn a trail of particles 
  trail(x: number, y: number, color: string): void
}