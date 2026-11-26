
import type { Boss, BossType } from "@/lib/game/types"

const BOSS_NAMES: Record<BossType, string> = {
  alienMouse: "THE ALIEN MOUSE",
  alienBumblebee: "THE ALIEN BUMBLEBEE",
  alienOctopus: "THE ALIEN OCTOPUS",
  alienMantis: "THE ALIEN MANTIS",
  abductor: "THE ABDUCTOR",
  queenXenoHen: "QUEEN XENOHEN",
  devourer: "THE DEVOURER",
  theButcher: "THE BUTCHER",
  voidReaper: "VOID REAPER",
  plagueBringer: "PLAGUE BRINGER",
  ironTyrant: "IRON TYRANT",
  voidLeviathan: "VOID LEVIATHAN",
  theHive: "THE HIVE",
  omegaPrime: "OMEGA PRIME",
}

function getBossDisplayHP(boss: Boss): { current: number; max: number } {
  if (boss.type === "theHive") {
    if (boss.hivePhase === 2 && boss.hiveLordA && boss.hiveLordB) {
      return {
        current: boss.hiveLordA.health + boss.hiveLordB.health,
        max: 600,
      }
    }
    if (boss.hivePhase === 3 && boss.hiveSpawns) {
      return {
        current: boss.hiveSpawns.reduce((sum, s) => sum + s.health, 0),
        max: 400,
      }
    }
    if (boss.hiveFinalWave) {
      return { current: 0, max: 1 }
    }
  }
  return { current: boss.health, max: boss.maxHealth }
}

export function drawBossBar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  boss: Boss,
): void {
  //  ARMOR BAR (only if boss has armor) 
  if (boss.maxArmor !== undefined && boss.armor !== undefined) {
    const armorBarWidth = canvas.width * 0.6
    const armorBarHeight = 12
    const armorBarX = (canvas.width - armorBarWidth) / 2
    const armorBarY = canvas.height - 70
    const armorPercent = boss.armor / boss.maxArmor

    ctx.fillStyle = "#1e293b"
    ctx.fillRect(armorBarX, armorBarY, armorBarWidth, armorBarHeight)
    ctx.fillStyle = "#94a3b8"
    ctx.fillRect(armorBarX, armorBarY, armorBarWidth * armorPercent, armorBarHeight)
    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 2
    ctx.strokeRect(armorBarX, armorBarY, armorBarWidth, armorBarHeight)

    ctx.fillStyle = "#fff"
    ctx.font = "bold 12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(`ARMOR: ${Math.ceil(boss.armor)}/${boss.maxArmor}`, canvas.width / 2, armorBarY - 5)
  }

  //  BOSS HEALTH BAR 
  const barWidth = canvas.width * 0.6
  const barHeight = 20
  const barX = (canvas.width - barWidth) / 2
  const barY = canvas.height - 40
  const { current: displayHP, max: displayMaxHP } = getBossDisplayHP(boss)
  const healthPercent = displayHP / displayMaxHP

  ctx.fillStyle = "#333"
  ctx.fillRect(barX, barY, barWidth, barHeight)
  ctx.fillStyle = healthPercent > 0.5 ? "#ff0000" : "#ff6600"
  ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)
  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 2
  ctx.strokeRect(barX, barY, barWidth, barHeight)

  //  BOSS NAME + HP ───
  ctx.fillStyle = "#fff"
  ctx.font = "bold 16px Arial"
  ctx.textAlign = "center"
  ctx.fillText(
    `${BOSS_NAMES[boss.type]} - ${Math.ceil(displayHP)}/${displayMaxHP}`,
    canvas.width / 2,
    barY - 10,
  )
}