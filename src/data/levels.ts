import { hashString } from '../core/rng'
import type { SaveData } from '../types'
import { WORLDS, worldAt } from './worlds'

export const WORLD_COUNT = 20
export const LEVELS_PER_WORLD = 50
export const TOTAL_LEVELS = WORLD_COUNT * LEVELS_PER_WORLD

export interface LevelMeta {
  id: string
  worldIndex: number
  levelNumber: number
  name: string
  seed: number
  boss: boolean
  signature: boolean
  difficulty: number
}

const ADJECTIVES = [
  'Amber', 'Bouncing', 'Bright', 'Broken', 'Chiming', 'Cobalt', 'Copper', 'Crystal', 'Dancing', 'Distant',
  'Electric', 'Fading', 'Feathered', 'Floating', 'Frosted', 'Gilded', 'Glowing', 'Golden', 'Hidden', 'Hollow',
  'Humming', 'Lively', 'Lucky', 'Lunar', 'Magnetic', 'Midnight', 'Misty', 'Neon', 'Patient', 'Playful',
  'Quiet', 'Radiant', 'Rapid', 'Ringing', 'Rising', 'Rolling', 'Silver', 'Singing', 'Skipping', 'Sonic',
  'Sparkling', 'Spinning', 'Starlit', 'Sunken', 'Tender', 'Thunder', 'Velvet', 'Wandering', 'Winding', 'Wondrous',
] as const

const NOUNS = [
  'Accordion', 'Antenna', 'Arpeggio', 'Ascender', 'Ballad', 'Beat', 'Bellows', 'Belt', 'Bridge', 'Cadence',
  'Chime', 'Chorus', 'Circuit', 'Clavier', 'Coda', 'Cog', 'Conduit', 'Crescendo', 'Cymbal', 'Descant',
  'Echo', 'Fanfare', 'Fugue', 'Gear', 'Groove', 'Harmonic', 'Harp', 'Hoist', 'Hymn', 'Interval',
  'Key', 'Lantern', 'Lift', 'Measure', 'Melody', 'Metronome', 'Motif', 'Octave', 'Overture', 'Pedal',
  'Pulse', 'Refrain', 'Relay', 'Reverb', 'Rhythm', 'Riff', 'Run', 'Scale', 'Shaft', 'Signal',
  'Sonata', 'Spark', 'Spindle', 'Spring', 'Station', 'Steam', 'Step', 'String', 'Switch', 'Tempo',
  'Theme', 'Thrum', 'Toccata', 'Tone', 'Treble', 'Tremolo', 'Tune', 'Valve', 'Verse', 'Vibration',
] as const

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function levelId(worldIndex: number, levelNumber: number): string {
  return `w${worldIndex + 1}-${levelNumber}`
}

export function parseLevelId(id: string): { worldIndex: number; levelNumber: number } | null {
  const match = /^w(\d{1,2})-(\d{1,2})$/.exec(id)
  if (!match) return null
  const worldIndex = Number(match[1]) - 1
  const levelNumber = Number(match[2])
  if (worldIndex < 0 || worldIndex >= WORLD_COUNT) return null
  if (levelNumber < 1 || levelNumber > LEVELS_PER_WORLD) return null
  return { worldIndex, levelNumber }
}

export function levelName(worldIndex: number, levelNumber: number): string {
  if (levelNumber === LEVELS_PER_WORLD) {
    return worldAt(worldIndex).boss.name
  }
  const adjective = ADJECTIVES[(levelNumber - 1) % ADJECTIVES.length]
  const noun = NOUNS[(levelNumber * 7 + worldIndex * 13) % NOUNS.length]
  return `${adjective} ${noun}`
}

function buildCatalog(): LevelMeta[] {
  const out: LevelMeta[] = []
  for (let worldIndex = 0; worldIndex < WORLD_COUNT; worldIndex += 1) {
    for (let levelNumber = 1; levelNumber <= LEVELS_PER_WORLD; levelNumber += 1) {
      const id = levelId(worldIndex, levelNumber)
      const boss = levelNumber === LEVELS_PER_WORLD
      out.push({
        id,
        worldIndex,
        levelNumber,
        name: levelName(worldIndex, levelNumber),
        seed: hashString(`${id}:jetstep:v1`),
        boss,
        signature: levelNumber === 1,
        difficulty: Math.min(10, 1 + Math.floor((worldIndex * LEVELS_PER_WORLD + levelNumber) / 105)),
      })
    }
  }
  return out
}

export const ALL_LEVELS: LevelMeta[] = buildCatalog()
export const LEVELS_BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]))

export function getLevelMeta(id: string): LevelMeta | undefined {
  return LEVELS_BY_ID.get(id)
}

export function levelsForWorld(worldIndex: number): LevelMeta[] {
  return ALL_LEVELS.filter((level) => level.worldIndex === worldIndex)
}

export function nextLevelId(id: string): string | null {
  const meta = getLevelMeta(id)
  if (!meta) return null
  if (meta.worldIndex === WORLD_COUNT - 1 && meta.levelNumber === LEVELS_PER_WORLD) return null
  if (meta.levelNumber === LEVELS_PER_WORLD) return levelId(meta.worldIndex + 1, 1)
  return levelId(meta.worldIndex, meta.levelNumber + 1)
}

export function previousLevelId(id: string): string | null {
  const meta = getLevelMeta(id)
  if (!meta) return null
  if (meta.worldIndex === 0 && meta.levelNumber === 1) return null
  if (meta.levelNumber === 1) return levelId(meta.worldIndex - 1, LEVELS_PER_WORLD)
  return levelId(meta.worldIndex, meta.levelNumber - 1)
}

export function levelUnlocked(save: SaveData, id: string): boolean {
  const meta = getLevelMeta(id)
  if (!meta) return false
  if (!worldUnlocked(save, meta.worldIndex)) return false
  if (meta.levelNumber === 1) return true
  const previous = levelId(meta.worldIndex, meta.levelNumber - 1)
  return Boolean(save.levels[previous]?.completed)
}

export function worldUnlocked(save: SaveData, worldIndex: number): boolean {
  if (worldIndex <= 0) return true
  const previousBoss = levelId(worldIndex - 1, LEVELS_PER_WORLD)
  return Boolean(save.levels[previousBoss]?.completed)
}

export function firstIncompleteLevel(save: SaveData, worldIndex?: number): string {
  const pool = typeof worldIndex === 'number' ? levelsForWorld(worldIndex) : ALL_LEVELS
  for (const level of pool) {
    if (!save.levels[level.id]?.completed && levelUnlocked(save, level.id)) return level.id
  }
  if (typeof worldIndex === 'number') {
    return levelId(worldIndex, LEVELS_PER_WORLD)
  }
  return levelId(WORLD_COUNT - 1, LEVELS_PER_WORLD)
}

export function worldStars(save: SaveData, worldIndex: number): number {
  return levelsForWorld(worldIndex).reduce((total, level) => total + (save.levels[level.id]?.stars ?? 0), 0)
}

export function worldCompleted(save: SaveData, worldIndex: number): number {
  return levelsForWorld(worldIndex).filter((level) => save.levels[level.id]?.completed).length
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((total, record) => total + record.stars, 0)
}

export function completedLevels(save: SaveData): number {
  return Object.values(save.levels).filter((record) => record.completed).length
}

export function currentWorld(save: SaveData): number {
  const meta = getLevelMeta(firstIncompleteLevel(save))
  return meta?.worldIndex ?? 0
}

export function worldProgressLabel(save: SaveData, worldIndex: number): string {
  const complete = worldCompleted(save, worldIndex)
  const stars = worldStars(save, worldIndex)
  return `${complete}/${LEVELS_PER_WORLD} · ${stars}/150 ★`
}

export function levelLabel(id: string): string {
  const meta = getLevelMeta(id)
  return meta ? `${meta.id.toUpperCase()} · ${meta.name}` : id
}

export function dailyDate(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dailyMeta(date = dailyDate()): LevelMeta {
  const seed = hashString(`daily:${date}`)
  const worldIndex = seed % WORLD_COUNT
  const levelNumber = 1 + ((seed >>> 8) % (LEVELS_PER_WORLD - 1))
  const id = levelId(worldIndex, levelNumber)
  const base = getLevelMeta(id) ?? ALL_LEVELS[0]
  return {
    ...base,
    seed: hashString(`${date}:jetstep:daily`),
    name: `Daily: ${base.name}`,
    signature: false,
    difficulty: Math.min(10, 3 + (worldIndex % 6)),
  }
}

export function worldNumber(meta: LevelMeta): string {
  return `${meta.worldIndex + 1}`.padStart(2, '0')
}

export function worldName(worldIndex: number): string {
  return worldAt(worldIndex).name
}

export function worldTagline(worldIndex: number): string {
  return WORLDS[worldIndex]?.tagline ?? ''
}

export function worldRoman(index: number): string {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
  return numerals[index] ?? String(index + 1)
}

export { pad }
