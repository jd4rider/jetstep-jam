import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, defaultSave, loadSave, recordLevelResult, recordRunFailure, sanitizeSave, writeSave } from '../src/core/save'
import { reconcileProgress } from '../src/core/progress'
import { STORAGE_KEY } from '../src/config'
import type { LevelResult } from '../src/types'

const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => store.clear(),
  },
})

function result(overrides: Partial<LevelResult> = {}): LevelResult {
  return {
    levelId: 'w1-1', mode: 'campaign', score: 2400, stars: 3, timeMs: 41000,
    energy: 62, noDamage: true, optional: true, combo: 12, sparks: 8,
    optionalSparks: 2, deaths: 0, airSparkRun: 6,
    powerups: ['mega-thrusters', 'spark-magnet'], ...overrides,
  }
}

describe('versioned save', () => {
  beforeEach(() => {
    store.clear()
  })

  it('starts with a complete v2 save and safe defaults', () => {
    const save = defaultSave()
    expect(save.schemaVersion).toBe(2)
    expect(save.settings).toEqual(DEFAULT_SETTINGS)
    expect(save.levels).toEqual({})
    expect(save.cosmetics.outfit).toBe('classic')
    expect(save.lastLevelId).toBe('w1-1')
    expect(loadSave()).toEqual(save)
  })

  it('sanitises hostile or corrupt values without losing valid progress', () => {
    const raw = {
      schemaVersion: 99,
      levels: {
        'w1-1': { completed: true, stars: 99, bestScore: -40, bestTimeMs: 9000000, bestEnergy: 9999, bestCombo: 5000 },
        'not-a-level': { completed: true, stars: 3 },
        'w20-50': { completed: true, stars: 3, bestScore: 12 },
      },
      settings: { masterVolume: 80, touchScale: 9, muted: 'yes', reducedMotion: true },
      cosmetics: { outfit: 'missing', boots: 'missing', unlockedOutfits: ['classic', 'bad id!'], unlockedBoots: [] },
      achievements: ['first-flight', 'first-flight', 'bad id!'],
      modes: { daily: { date: 'not-a-date', score: 10 }, time: { 'w1-1': -99, 'bad': 10 } },
      stats: { sparksCollected: -10, deaths: 2.7 },
      lastLevelId: 'w99-99',
    }
    const save = sanitizeSave(raw)
    expect(save.schemaVersion).toBe(2)
    expect(save.levels['w1-1']?.bestScore).toBe(0)
    expect(save.levels['w1-1']?.stars).toBe(0)
    expect(save.levels['not-a-level']).toBeUndefined()
    expect(save.levels['w20-50']?.completed).toBe(true)
    expect(save.settings.masterVolume).toBe(1)
    expect(save.settings.touchScale).toBe(1.45)
    expect(save.settings.muted).toBe(false)
    expect(save.settings.reducedMotion).toBe(true)
    expect(save.cosmetics.unlockedOutfits).toEqual(['classic'])
    expect(save.cosmetics.outfit).toBe('missing')
    expect(save.achievements).toEqual(['first-flight'])
    expect(save.modes.daily).toBeNull()
    expect(save.modes.time).toEqual({})
    expect(save.stats.sparksCollected).toBe(0)
    expect(save.stats.deaths).toBe(3)
    expect(save.lastLevelId).toBe('w1-1')
  })

  it('falls back safely when storage is empty or corrupt', () => {
    expect(loadSave().levels).toEqual({})
    localStorage.setItem(STORAGE_KEY, '{broken')
    expect(loadSave().schemaVersion).toBe(2)
    expect(loadSave().levels).toEqual({})
  })
})

describe('recording results', () => {
  beforeEach(() => {
    store.clear()
  })

  it('records campaign completion, stats and best values', () => {
    const first = recordLevelResult(result())
    expect(first.levels['w1-1']?.completed).toBe(true)
    expect(first.levels['w1-1']?.stars).toBe(3)
    expect(first.stats.sparksCollected).toBe(8)
    expect(first.stats.powerupsCollected).toBe(2)
    expect(first.modes.plays.campaign).toBe(1)
    expect(first.modes.plays.time).toBeUndefined()

    const better = recordLevelResult(result({ score: 3000, stars: 2, timeMs: 30000, powerups: [] }))
    expect(better.levels['w1-1']?.bestScore).toBe(3000)
    expect(better.levels['w1-1']?.stars).toBe(3)
    expect(better.levels['w1-1']?.bestTimeMs).toBe(30000)
    expect(better.stats.sparksCollected).toBe(16)
  })

  it('does not unlock campaign levels from daily, time or boss rush runs', () => {
    recordLevelResult(result({ mode: 'daily', dailyDate: '2026-11-11' }))
    recordLevelResult(result({ mode: 'time', levelId: 'w1-4' }))
    recordLevelResult(result({ mode: 'bossrush', timeMs: 90000 }))
    const save = loadSave()
    expect(save.levels).toEqual({})
    expect(save.modes.daily?.date).toBe('2026-11-11')
    expect(save.modes.dailyCompletions).toBe(1)
    expect(save.modes.time['w1-4']).toBe(41000)
    expect(save.modes.bossRushBestMs).toBe(90000)
    expect(save.modes.plays.bossrush).toBe(1)
  })

  it('tracks endless and classic records and failed-run deaths', () => {
    recordLevelResult(result({ mode: 'endless', levelId: 'w1-1', score: 4321, stars: 0 }))
    recordLevelResult(result({ mode: 'classic', levelId: 'w1-1', score: 7654, stars: 0 }))
    const save = recordRunFailure('classic', 100, 2)
    expect(save.modes.endlessBest).toBe(4321)
    expect(save.modes.classicBest).toBe(7654)
    expect(save.stats.deaths).toBe(2)
    expect(save.modes.plays.classic).toBe(2)
  })

  it('writes sanitised save data back to storage', () => {
    const save = defaultSave()
    save.levels['w1-1'] = {
      completed: true, stars: 3, bestScore: 999999999, bestTimeMs: 1, bestEnergy: 100,
      noDamage: true, optional: true, bestCombo: 10,
    }
    writeSave(save)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.levels['w1-1'].bestScore).toBe(2000000)
  })
})

describe('progression reconciliation', () => {
  beforeEach(() => {
    store.clear()
  })

  it('unlocks achievements, outfits and boots exactly once', () => {
    recordLevelResult(result({ mode: 'campaign', levelId: 'w1-1', sparks: 10 }))
    const first = reconcileProgress()
    expect(first.achievements).toContain('first-clear')
    expect(first.achievements).toContain('first-spark')
    expect(first.achievements).toContain('first-three-star')
    expect(first.achievements).toContain('no-damage-1')
    const second = reconcileProgress()
    expect(second.achievements).toEqual([])
    expect(new Set(second.save.achievements).size).toBe(second.save.achievements.length)
    expect(second.save.cosmetics.unlockedOutfits).toContain('classic')
    expect(second.save.cosmetics.unlockedBoots).toContain('chrome')
  })
})
