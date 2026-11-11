import { SCHEMA_VERSION, STORAGE_KEY } from '../config'
import type {
  CosmeticState,
  DailyRecord,
  GameplaySettings,
  LevelRecord,
  LevelResult,
  ModeRecords,
  PlayMode,
  SaveData,
  SaveStats,
  StarCount,
} from '../types'

const VALID_LEVEL = /^w(?:[1-9]|1\d|20)-(?:[1-9]|[1-4]\d|50)$/
const STAR_VALUES = new Set([0, 1, 2, 3])

export const DEFAULT_SETTINGS: GameplaySettings = {
  masterVolume: 0.85,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  ambienceVolume: 0.4,
  muted: false,
  reducedMotion: false,
  reducedFlash: false,
  highContrast: false,
  largeUi: false,
  touchScale: 1,
  touchOpacity: 0.65,
  leftHanded: false,
  haptics: true,
}

const EMPTY_MODES: ModeRecords = {
  endlessBest: 0,
  classicBest: 0,
  bossRushBestMs: 0,
  daily: null,
  dailyCompletions: 0,
  time: {},
  plays: {},
}

const EMPTY_STATS: SaveStats = {
  sparksCollected: 0,
  optionalSparks: 0,
  deaths: 0,
  airSparks: 0,
  bestCombo: 0,
  powerupsCollected: 0,
  powersUsed: {},
  bossesDefeated: 0,
  noDamageClears: 0,
  threeStarClears: 0,
}

const EMPTY_COSMETICS: CosmeticState = {
  outfit: 'classic',
  boots: 'chrome',
  unlockedOutfits: ['classic', 'neon', 'crystal'],
  unlockedBoots: ['chrome', 'gold', 'neon'],
}

export function defaultSave(): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    levels: {},
    settings: { ...DEFAULT_SETTINGS },
    cosmetics: {
      ...EMPTY_COSMETICS,
      unlockedOutfits: [...EMPTY_COSMETICS.unlockedOutfits],
      unlockedBoots: [...EMPTY_COSMETICS.unlockedBoots],
    },
    achievements: [],
    modes: { ...EMPTY_MODES, time: {}, plays: {}, daily: null },
    stats: { ...EMPTY_STATS, powersUsed: {} },
    lastLevelId: 'w1-1',
  }
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function string(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function stars(value: unknown): StarCount {
  return typeof value === 'number' && STAR_VALUES.has(value) ? (value as StarCount) : 0
}

function validIdList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && /^[a-z0-9-]{2,40}$/.test(entry)))] : []
}

function cleanRecord(value: unknown): LevelRecord | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.completed !== 'boolean') return null
  return {
    completed: raw.completed,
    stars: stars(raw.stars),
    bestScore: Math.round(number(raw.bestScore, 0, 0, 2_000_000)),
    bestTimeMs: Math.round(number(raw.bestTimeMs, 0, 0, 3_600_000)),
    bestEnergy: Math.round(number(raw.bestEnergy, 0, 0, 100)),
    noDamage: bool(raw.noDamage, false),
    optional: bool(raw.optional, false),
    bestCombo: Math.round(number(raw.bestCombo, 0, 0, 999)),
  }
}

function cleanSettings(value: unknown): GameplaySettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    masterVolume: number(raw.masterVolume, DEFAULT_SETTINGS.masterVolume, 0, 1),
    musicVolume: number(raw.musicVolume, DEFAULT_SETTINGS.musicVolume, 0, 1),
    sfxVolume: number(raw.sfxVolume, DEFAULT_SETTINGS.sfxVolume, 0, 1),
    ambienceVolume: number(raw.ambienceVolume, DEFAULT_SETTINGS.ambienceVolume, 0, 1),
    muted: bool(raw.muted, DEFAULT_SETTINGS.muted),
    reducedMotion: bool(raw.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    reducedFlash: bool(raw.reducedFlash, DEFAULT_SETTINGS.reducedFlash),
    highContrast: bool(raw.highContrast, DEFAULT_SETTINGS.highContrast),
    largeUi: bool(raw.largeUi, DEFAULT_SETTINGS.largeUi),
    touchScale: number(raw.touchScale, DEFAULT_SETTINGS.touchScale, 0.7, 1.45),
    touchOpacity: number(raw.touchOpacity, DEFAULT_SETTINGS.touchOpacity, 0.15, 1),
    leftHanded: bool(raw.leftHanded, DEFAULT_SETTINGS.leftHanded),
    haptics: bool(raw.haptics, DEFAULT_SETTINGS.haptics),
  }
}

function cleanDaily(value: unknown): DailyRecord | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null
  return {
    date: raw.date,
    score: Math.round(number(raw.score, 0, 0, 2_000_000)),
    stars: stars(raw.stars),
    timeMs: Math.round(number(raw.timeMs, 0, 0, 3_600_000)),
  }
}

function cleanModes(value: unknown): ModeRecords {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const timeRaw = raw.time && typeof raw.time === 'object' ? (raw.time as Record<string, unknown>) : {}
  const time: Record<string, number> = {}
  Object.entries(timeRaw).forEach(([key, entry]) => {
    if (VALID_LEVEL.test(key) && typeof entry === 'number' && Number.isFinite(entry) && entry > 0) {
      time[key] = Math.round(Math.min(3_600_000, entry))
    }
  })
  const playsRaw = raw.plays && typeof raw.plays === 'object' ? (raw.plays as Record<string, unknown>) : {}
  const plays: Partial<Record<PlayMode, number>> = {}
  ;(['campaign', 'endless', 'classic', 'daily', 'time', 'bossrush', 'zen'] as PlayMode[]).forEach((mode) => {
    if (typeof playsRaw[mode] === 'number') plays[mode] = Math.round(number(playsRaw[mode], 0, 0, 100_000))
  })
  return {
    endlessBest: Math.round(number(raw.endlessBest, 0, 0, 2_000_000)),
    classicBest: Math.round(number(raw.classicBest, 0, 0, 2_000_000)),
    bossRushBestMs: Math.round(number(raw.bossRushBestMs, 0, 0, 3_600_000)),
    daily: cleanDaily(raw.daily),
    dailyCompletions: Math.round(number(raw.dailyCompletions, 0, 0, 100_000)),
    time,
    plays,
  }
}

function cleanStats(value: unknown): SaveStats {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const used = raw.powersUsed && typeof raw.powersUsed === 'object' ? (raw.powersUsed as Record<string, unknown>) : {}
  const powersUsed: Record<string, number> = {}
  Object.entries(used).forEach(([key, entry]) => {
    if (typeof key === 'string' && typeof entry === 'number') powersUsed[key] = Math.round(number(entry, 0, 0, 100_000))
  })
  return {
    sparksCollected: Math.round(number(raw.sparksCollected, 0, 0, 10_000_000)),
    optionalSparks: Math.round(number(raw.optionalSparks, 0, 0, 1_000_000)),
    deaths: Math.round(number(raw.deaths, 0, 0, 1_000_000)),
    airSparks: Math.round(number(raw.airSparks, 0, 0, 1_000_000)),
    bestCombo: Math.round(number(raw.bestCombo, 0, 0, 999)),
    powerupsCollected: Math.round(number(raw.powerupsCollected, 0, 0, 1_000_000)),
    powersUsed,
    bossesDefeated: Math.round(number(raw.bossesDefeated, 0, 0, 20)),
    noDamageClears: Math.round(number(raw.noDamageClears, 0, 0, 10_000)),
    threeStarClears: Math.round(number(raw.threeStarClears, 0, 0, 10_000)),
  }
}

function cleanCosmetics(value: unknown): CosmeticState {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const outfits = validIdList(raw.unlockedOutfits)
  const boots = validIdList(raw.unlockedBoots)
  return {
    outfit: string(raw.outfit, EMPTY_COSMETICS.outfit),
    boots: string(raw.boots, EMPTY_COSMETICS.boots),
    unlockedOutfits: outfits.length ? outfits : [...EMPTY_COSMETICS.unlockedOutfits],
    unlockedBoots: boots.length ? boots : [...EMPTY_COSMETICS.unlockedBoots],
  }
}

export function sanitizeSave(value: unknown): SaveData {
  const fallback = defaultSave()
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Record<string, unknown>
  const levelsRaw = raw.levels && typeof raw.levels === 'object' ? (raw.levels as Record<string, unknown>) : {}
  const levels: Record<string, LevelRecord> = {}
  Object.entries(levelsRaw).forEach(([id, record]) => {
    if (!VALID_LEVEL.test(id)) return
    const clean = cleanRecord(record)
    if (clean) levels[id] = clean
  })
  return {
    schemaVersion: SCHEMA_VERSION,
    levels,
    settings: cleanSettings(raw.settings),
    cosmetics: cleanCosmetics(raw.cosmetics),
    achievements: validIdList(raw.achievements),
    modes: cleanModes(raw.modes),
    stats: cleanStats(raw.stats),
    lastLevelId: typeof raw.lastLevelId === 'string' && VALID_LEVEL.test(raw.lastLevelId) ? raw.lastLevelId : 'w1-1',
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? sanitizeSave(JSON.parse(raw)) : defaultSave()
  } catch {
    return defaultSave()
  }
}

export function writeSave(save: SaveData): SaveData {
  const clean = sanitizeSave(save)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  } catch {
    // Local storage can be unavailable in private or embedded contexts.
  }
  return clean
}

export function saveSettings(settings: GameplaySettings): SaveData {
  const save = loadSave()
  save.settings = cleanSettings(settings)
  return writeSave(save)
}

export function saveCosmetics(cosmetics: CosmeticState): SaveData {
  const save = loadSave()
  save.cosmetics = cleanCosmetics(cosmetics)
  return writeSave(save)
}

export function recordLevelResult(result: LevelResult): SaveData {
  const save = loadSave()
  if (result.mode === 'campaign') {
    const previous = save.levels[result.levelId]
    const next: LevelRecord = {
      completed: true,
      stars: Math.max(previous?.stars ?? 0, result.stars) as StarCount,
      bestScore: Math.max(previous?.bestScore ?? 0, result.score),
      bestTimeMs: previous?.bestTimeMs ? Math.min(previous.bestTimeMs, result.timeMs) : result.timeMs,
      bestEnergy: Math.max(previous?.bestEnergy ?? 0, Math.round(result.energy)),
      noDamage: Boolean(previous?.noDamage || result.noDamage),
      optional: Boolean(previous?.optional || result.optional),
      bestCombo: Math.max(previous?.bestCombo ?? 0, result.combo),
    }
    save.levels[result.levelId] = next
    save.lastLevelId = result.levelId
  }
  if (result.mode === 'time') {
    save.modes.time[result.levelId] = Math.min(save.modes.time[result.levelId] ?? Number.MAX_SAFE_INTEGER, result.timeMs)
  }
  if (result.mode === 'daily' && result.dailyDate) {
    const prior = save.modes.daily
    save.modes.daily = {
      date: result.dailyDate,
      score: Math.max(prior?.date === result.dailyDate ? prior.score : 0, result.score),
      stars: Math.max(prior?.date === result.dailyDate ? prior.stars : 0, result.stars) as StarCount,
      timeMs: prior?.date === result.dailyDate ? Math.min(prior.timeMs || result.timeMs, result.timeMs) : result.timeMs,
    }
    if (prior?.date !== result.dailyDate) save.modes.dailyCompletions += 1
  }
  const stats = save.stats
  stats.sparksCollected += result.sparks
  stats.optionalSparks += result.optionalSparks
  stats.deaths += result.deaths
  stats.airSparks = Math.max(stats.airSparks, result.airSparkRun)
  stats.bestCombo = Math.max(stats.bestCombo, result.combo)
  stats.powerupsCollected += result.powerups.length
  stats.bossesDefeated = Math.max(stats.bossesDefeated, countBosses(save))
  stats.noDamageClears = countNoDamage(save)
  stats.threeStarClears = countStars(save, 3)
  result.powerups.forEach((id) => {
    stats.powersUsed[id] = (stats.powersUsed[id] ?? 0) + 1
  })
  if (result.mode === 'endless') save.modes.endlessBest = Math.max(save.modes.endlessBest, result.score)
  if (result.mode === 'classic') save.modes.classicBest = Math.max(save.modes.classicBest, result.score)
  if (result.mode === 'bossrush') {
    save.modes.bossRushBestMs = save.modes.bossRushBestMs
      ? Math.min(save.modes.bossRushBestMs, result.timeMs)
      : result.timeMs
  }
  save.modes.plays[result.mode] = (save.modes.plays[result.mode] ?? 0) + 1
  return writeSave(save)
}

export function recordSettingPlay(mode: PlayMode): SaveData {
  const save = loadSave()
  save.modes.plays[mode] = (save.modes.plays[mode] ?? 0) + 1
  return writeSave(save)
}

export function recordRunFailure(mode: PlayMode, score: number, deaths: number): SaveData {
  const save = loadSave()
  save.stats.deaths += Math.max(1, deaths)
  save.modes.plays[mode] = (save.modes.plays[mode] ?? 0) + 1
  if (mode === 'endless') save.modes.endlessBest = Math.max(save.modes.endlessBest, score)
  if (mode === 'classic') save.modes.classicBest = Math.max(save.modes.classicBest, score)
  return writeSave(save)
}

export function recordBossDefeat(): SaveData {
  const save = loadSave()
  save.stats.bossesDefeated = countBosses(save)
  return writeSave(save)
}

export function countBosses(save: SaveData): number {
  let count = 0
  Object.entries(save.levels).forEach(([id, record]) => {
    if (record.completed && /-50$/.test(id)) count += 1
  })
  return count
}

export function countNoDamage(save: SaveData): number {
  return Object.values(save.levels).filter((record) => record.completed && record.noDamage).length
}

export function countStars(save: SaveData, minimum = 1): number {
  return Object.values(save.levels).reduce((total, record) => total + (record.stars >= minimum ? 1 : 0), 0)
}
