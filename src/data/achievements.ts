import { completedLevels, levelsForWorld, totalStars, worldCompleted, worldUnlocked } from './levels'
import { WORLDS } from './worlds'
import type { SaveData } from '../types'

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  glyph: string
  check: (save: SaveData) => boolean
}

function completedWorlds(save: SaveData): number {
  return WORLDS.filter((world) => worldCompleted(save, world.index) === 50).length
}

function completedInWorld(save: SaveData, index: number): number {
  return levelsForWorld(index).filter((level) => save.levels[level.id]?.completed).length
}

const global: AchievementDefinition[] = [
  { id: 'first-flight', name: 'First Flight', description: 'Finish your first expedition.', glyph: '▲', check: (s) => (s.modes.plays.campaign ?? 0) >= 1 },
  { id: 'first-spark', name: 'A Little Light', description: 'Collect your first Sound Spark.', glyph: '✦', check: (s) => s.stats.sparksCollected >= 1 },
  { id: 'first-clear', name: 'The First Measure', description: 'Clear any campaign level.', glyph: '★', check: (s) => completedLevels(s) >= 1 },
  { id: 'first-three-star', name: 'Perfect Pitch', description: 'Earn three stars on a level.', glyph: '✺', check: (s) => s.stats.threeStarClears >= 1 },
  { id: 'first-boss', name: 'Silenced the Machine', description: 'Defeat your first world boss.', glyph: '◆', check: (s) => s.stats.bossesDefeated >= 1 },
  { id: 'combo-10', name: 'Ten Note Streak', description: 'Reach a 10× combo.', glyph: '∞', check: (s) => s.stats.bestCombo >= 10 },
  { id: 'combo-25', name: 'Runaway Rhythm', description: 'Reach a 25× combo.', glyph: '∞', check: (s) => s.stats.bestCombo >= 25 },
  { id: 'combo-50', name: 'Unbroken Melody', description: 'Reach a 50× combo.', glyph: '∞', check: (s) => s.stats.bestCombo >= 50 },
  { id: 'air-10', name: 'Air Collector', description: 'Collect 10 sparks without landing.', glyph: '≋', check: (s) => s.stats.airSparks >= 10 },
  { id: 'air-100', name: 'Sky Librarian', description: 'Collect 100 sparks in the air over your journey.', glyph: '≋', check: (s) => s.stats.airSparks >= 100 },
  { id: 'no-damage-1', name: 'Not a Scratch', description: 'Clear a level without taking damage.', glyph: '◇', check: (s) => s.stats.noDamageClears >= 1 },
  { id: 'no-damage-10', name: 'Careful Boots', description: 'Clear 10 levels without damage.', glyph: '◇', check: (s) => s.stats.noDamageClears >= 10 },
  { id: 'no-damage-50', name: 'Untouchable', description: 'Clear 50 levels without damage.', glyph: '◇', check: (s) => s.stats.noDamageClears >= 50 },
  { id: 'optional-1', name: 'Curious Ear', description: 'Find an optional resonance fragment.', glyph: '◎', check: (s) => s.stats.optionalSparks >= 1 },
  { id: 'optional-25', name: 'Secret Seeker', description: 'Find 25 optional fragments.', glyph: '◎', check: (s) => s.stats.optionalSparks >= 25 },
  { id: 'optional-100', name: 'Hidden Harmony', description: 'Find 100 optional fragments.', glyph: '◎', check: (s) => s.stats.optionalSparks >= 100 },
  { id: 'optional-500', name: 'Every Quiet Corner', description: 'Find 500 optional fragments.', glyph: '◎', check: (s) => s.stats.optionalSparks >= 500 },
  { id: 'stars-10', name: 'Ten Stars', description: 'Collect 10 campaign stars.', glyph: '★', check: (s) => totalStars(s) >= 10 },
  { id: 'stars-50', name: 'Fifty Stars', description: 'Collect 50 campaign stars.', glyph: '★', check: (s) => totalStars(s) >= 50 },
  { id: 'stars-100', name: 'Century of Stars', description: 'Collect 100 campaign stars.', glyph: '★', check: (s) => totalStars(s) >= 100 },
  { id: 'stars-250', name: 'Constellation', description: 'Collect 250 campaign stars.', glyph: '✺', check: (s) => totalStars(s) >= 250 },
  { id: 'stars-500', name: 'Starry Machine', description: 'Collect 500 campaign stars.', glyph: '✺', check: (s) => totalStars(s) >= 500 },
  { id: 'stars-1000', name: 'A Thousand Lights', description: 'Collect 1,000 campaign stars.', glyph: '✺', check: (s) => totalStars(s) >= 1000 },
  { id: 'levels-5', name: 'Five Steps', description: 'Clear five campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 5 },
  { id: 'levels-25', name: 'Getting Warm', description: 'Clear 25 campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 25 },
  { id: 'levels-50', name: 'A World Away', description: 'Clear 50 campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 50 },
  { id: 'levels-100', name: 'Hundredfold', description: 'Clear 100 campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 100 },
  { id: 'levels-250', name: 'Machine Marathon', description: 'Clear 250 campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 250 },
  { id: 'levels-500', name: 'Halfway to Harmony', description: 'Clear 500 campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 500 },
  { id: 'levels-750', name: 'The Long Descent', description: 'Clear 750 campaign levels.', glyph: '▮', check: (s) => completedLevels(s) >= 750 },
  { id: 'levels-1000', name: 'Harmony Restored', description: 'Clear all 1,000 campaign levels.', glyph: '♛', check: (s) => completedLevels(s) >= 1000 },
  { id: 'worlds-1', name: 'One World Sings', description: 'Complete every level in one world.', glyph: '♫', check: (s) => completedWorlds(s) >= 1 },
  { id: 'worlds-3', name: 'Three-part Harmony', description: 'Complete three worlds.', glyph: '♫', check: (s) => completedWorlds(s) >= 3 },
  { id: 'worlds-5', name: 'Five Movements', description: 'Complete five worlds.', glyph: '♫', check: (s) => completedWorlds(s) >= 5 },
  { id: 'worlds-10', name: 'Half the Universe', description: 'Complete ten worlds.', glyph: '♫', check: (s) => completedWorlds(s) >= 10 },
  { id: 'worlds-20', name: 'The Whole Song', description: 'Complete all twenty worlds.', glyph: '♛', check: (s) => completedWorlds(s) >= 20 },
  { id: 'bosses-1', name: 'First Fortissimo', description: 'Defeat one boss.', glyph: '◆', check: (s) => s.stats.bossesDefeated >= 1 },
  { id: 'bosses-5', name: 'Five Big Noises', description: 'Defeat five bosses.', glyph: '◆', check: (s) => s.stats.bossesDefeated >= 5 },
  { id: 'bosses-10', name: 'Colossus Breaker', description: 'Defeat ten bosses.', glyph: '◆', check: (s) => s.stats.bossesDefeated >= 10 },
  { id: 'bosses-15', name: 'Almost Silent', description: 'Defeat fifteen bosses.', glyph: '◆', check: (s) => s.stats.bossesDefeated >= 15 },
  { id: 'bosses-20', name: 'All the Giants', description: 'Defeat all twenty bosses.', glyph: '♛', check: (s) => s.stats.bossesDefeated >= 20 },
  { id: 'play-endless', name: 'Down and Down', description: 'Play Endless Descent.', glyph: '↓', check: (s) => (s.modes.plays.endless ?? 0) >= 1 },
  { id: 'endless-1000', name: 'Deep Listener', description: 'Score 1,000 in Endless Descent.', glyph: '↓', check: (s) => s.modes.endlessBest >= 1000 },
  { id: 'endless-5000', name: 'Below the Bass', description: 'Score 5,000 in Endless Descent.', glyph: '↓', check: (s) => s.modes.endlessBest >= 5000 },
  { id: 'classic-1', name: 'Insert Coin', description: 'Play Classic Arcade.', glyph: '▣', check: (s) => (s.modes.plays.classic ?? 0) >= 1 },
  { id: 'classic-5000', name: 'High Score Hero', description: 'Score 5,000 in Classic Arcade.', glyph: '▣', check: (s) => s.modes.classicBest >= 5000 },
  { id: 'daily-1', name: 'A Daily Note', description: 'Clear a Daily Challenge.', glyph: '◷', check: (s) => s.modes.dailyCompletions >= 1 },
  { id: 'daily-7', name: 'Seven Days of Song', description: 'Clear seven Daily Challenges.', glyph: '◷', check: (s) => s.modes.dailyCompletions >= 7 },
  { id: 'daily-30', name: 'A Month in Tune', description: 'Clear thirty Daily Challenges.', glyph: '◷', check: (s) => s.modes.dailyCompletions >= 30 },
  { id: 'time-1', name: 'Against the Clock', description: 'Set a Time Attack record.', glyph: '◔', check: (s) => Object.keys(s.modes.time).length >= 1 },
  { id: 'time-10', name: 'Ten Fast Measures', description: 'Set Time Attack records on ten levels.', glyph: '◔', check: (s) => Object.keys(s.modes.time).length >= 10 },
  { id: 'bossrush-1', name: 'Encore', description: 'Play Boss Rush.', glyph: '◆', check: (s) => (s.modes.plays.bossrush ?? 0) >= 1 },
  { id: 'bossrush-all', name: 'The Whole Orchestra', description: 'Play Boss Rush after defeating every boss.', glyph: '♛', check: (s) => (s.modes.plays.bossrush ?? 0) >= 1 && s.stats.bossesDefeated >= 20 },
  { id: 'zen-1', name: 'Soft Landing', description: 'Play Zen Mode.', glyph: '☁', check: (s) => (s.modes.plays.zen ?? 0) >= 1 },
  { id: 'powers-1', name: 'A New Gadget', description: 'Collect a power-up.', glyph: '◆', check: (s) => s.stats.powerupsCollected >= 1 },
  { id: 'powers-10', name: 'Gadget Rack', description: 'Collect ten power-ups.', glyph: '◆', check: (s) => s.stats.powerupsCollected >= 10 },
  { id: 'powers-35', name: 'Every Trick', description: 'Use all 35 power-ups.', glyph: '✺', check: (s) => Object.keys(s.stats.powersUsed).length >= 35 },
  { id: 'powers-100', name: 'Power Collector', description: 'Collect 100 power-ups.', glyph: '◆', check: (s) => s.stats.powerupsCollected >= 100 },
  { id: 'outfit-5', name: 'Wardrobe Change', description: 'Unlock five outfits.', glyph: '♢', check: (s) => s.cosmetics.unlockedOutfits.length >= 5 },
  { id: 'boots-10', name: 'Boot Rack', description: 'Unlock ten jet-boot skins.', glyph: '▲', check: (s) => s.cosmetics.unlockedBoots.length >= 10 },
  { id: 'boots-30', name: 'Every Pair', description: 'Unlock all thirty jet-boot skins.', glyph: '♛', check: (s) => s.cosmetics.unlockedBoots.length >= 30 },
  { id: 'plays-100', name: 'A Hundred Curtain Calls', description: 'Play one hundred levels in any mode.', glyph: '▮', check: (s) => Object.values(s.modes.plays).reduce((sum, value) => sum + (value ?? 0), 0) >= 100 },
]

const worldExplorer: AchievementDefinition[] = WORLDS.map((world) => ({
  id: `explore-${world.id}`,
  name: `${world.name} Regular`,
  description: `Clear 10 levels in ${world.name}.`,
  glyph: '♫',
  check: (save) => worldUnlocked(save, world.index) && completedInWorld(save, world.index) >= 10,
}))

const worldChampion: AchievementDefinition[] = WORLDS.map((world) => ({
  id: `boss-${world.id}`,
  name: `${world.boss.name} Silenced`,
  description: `Defeat ${world.boss.name} in ${world.name}.`,
  glyph: '◆',
  check: (save) => Boolean(save.levels[`w${world.index + 1}-50`]?.completed),
}))

export const ACHIEVEMENTS: AchievementDefinition[] = [...global, ...worldExplorer, ...worldChampion]
export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]))

export function newlyUnlocked(save: SaveData): AchievementDefinition[] {
  const owned = new Set(save.achievements)
  return ACHIEVEMENTS.filter((achievement) => !owned.has(achievement.id) && achievement.check(save))
}
