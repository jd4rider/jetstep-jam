import { ACHIEVEMENTS, newlyUnlocked } from '../data/achievements'
import { BOOTS, OUTFITS } from '../data/cosmetics'
import { totalStars } from '../data/levels'
import type { SaveData } from '../types'
import { loadSave, writeSave } from './save'

export interface ProgressUpdate {
  save: SaveData
  achievements: string[]
  outfits: string[]
  boots: string[]
}

/**
 * Keeps local unlocks in one place. The arcade client mirrors this storage to the
 * signed-in player's account; achievements are game-local because the drop-in SDK
 * exposes saves and identity, not an achievement endpoint.
 */
export function reconcileProgress(): ProgressUpdate {
  const save = loadSave()
  const beforeAchievements = new Set(save.achievements)
  const beforeOutfits = new Set(save.cosmetics.unlockedOutfits)
  const beforeBoots = new Set(save.cosmetics.unlockedBoots)
  const stars = totalStars(save)

  save.cosmetics.unlockedOutfits = OUTFITS.filter((item) => item.unlockStars <= stars).map((item) => item.id)
  save.cosmetics.unlockedBoots = BOOTS.filter((item) => item.unlockStars <= stars).map((item) => item.id)
  if (!save.cosmetics.unlockedOutfits.includes(save.cosmetics.outfit)) save.cosmetics.outfit = 'classic'
  if (!save.cosmetics.unlockedBoots.includes(save.cosmetics.boots)) save.cosmetics.boots = 'chrome'

  const unlockedNow = newlyUnlocked(save)
  unlockedNow.forEach((achievement) => {
    if (!save.achievements.includes(achievement.id)) save.achievements.push(achievement.id)
  })
  const next = writeSave(save)
  return {
    save: next,
    achievements: next.achievements.filter((id) => !beforeAchievements.has(id)),
    outfits: next.cosmetics.unlockedOutfits.filter((id) => !beforeOutfits.has(id)),
    boots: next.cosmetics.unlockedBoots.filter((id) => !beforeBoots.has(id)),
  }
}

export function achievementCount(): number {
  return ACHIEVEMENTS.length
}
