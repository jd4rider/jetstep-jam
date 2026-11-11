import { describe, expect, it } from 'vitest'
import { defaultSave } from '../src/core/save'
import {
  ALL_LEVELS, LEVELS_PER_WORLD, TOTAL_LEVELS, WORLD_COUNT, completedLevels, dailyDate,
  dailyMeta, firstIncompleteLevel, getLevelMeta, levelId, levelUnlocked, nextLevelId,
  parseLevelId, totalStars, worldStars, worldUnlocked,
} from '../src/data/levels'
import { WORLDS, worldAt } from '../src/data/worlds'
import { FLOOR_HEIGHT, LIFT_TRAVEL, generateLevel } from '../src/generator/level'
import { catalogErrors, progressionProbe, validateAllLevels, validateLevel } from '../src/generator/validation'
import type { StarCount } from '../src/types'

const save = defaultSave()

function complete(id: string, stars: StarCount = 3): void {
  save.levels[id] = {
    completed: true, stars, bestScore: 1000, bestTimeMs: 30000, bestEnergy: 80,
    noDamage: true, optional: true, bestCombo: 10,
  }
}

describe('campaign catalogue', () => {
  it('contains exactly 1,000 unique levels across 20 worlds', () => {
    expect(ALL_LEVELS).toHaveLength(TOTAL_LEVELS)
    expect(TOTAL_LEVELS).toBe(1000)
    expect(WORLDS).toHaveLength(WORLD_COUNT)
    expect(catalogErrors()).toEqual([])
  })

  it('has fifty levels and one named boss in every world', () => {
    for (let world = 0; world < WORLD_COUNT; world += 1) {
      const levels = ALL_LEVELS.filter((level) => level.worldIndex === world)
      expect(levels).toHaveLength(LEVELS_PER_WORLD)
      expect(levels.filter((level) => level.boss)).toHaveLength(1)
      expect(levels.at(-1)?.id).toBe(levelId(world, 50))
      expect(levels.at(-1)?.name).toBe(worldAt(world).boss.name)
    }
  })

  it('parses and advances boundary level ids correctly', () => {
    expect(parseLevelId('w1-1')).toEqual({ worldIndex: 0, levelNumber: 1 })
    expect(parseLevelId('w20-50')).toEqual({ worldIndex: 19, levelNumber: 50 })
    expect(parseLevelId('w21-1')).toBeNull()
    expect(parseLevelId('w1-51')).toBeNull()
    expect(nextLevelId('w1-49')).toBe('w1-50')
    expect(nextLevelId('w1-50')).toBe('w2-1')
    expect(nextLevelId('w20-50')).toBeNull()
  })
})

describe('generated level validation', () => {
  it('validates all 1,000 levels with reachable sparks, exits and fuel', () => {
    const reports = validateAllLevels()
    const failures = reports.filter((report) => report.errors.length > 0)
    expect(reports).toHaveLength(1000)
    expect(failures).toEqual([])
  })

  it('is deterministic for the same level and seed', () => {
    const meta = getLevelMeta('w9-27')
    expect(meta).toBeDefined()
    if (!meta) return
    const first = generateLevel(meta)
    const second = generateLevel(meta)
    expect(second).toEqual(first)
    expect(first.requiredSparks).toBe(first.sparks.length)
    expect(first.height).toBeGreaterThan(2000)
    expect(first.platforms.length).toBeGreaterThan(8)
    expect(first.energy.length).toBeGreaterThanOrEqual(2)
  })

  it('generates zen stages without combat hazards', () => {
    const meta = getLevelMeta('w5-20')
    expect(meta).toBeDefined()
    if (!meta) return
    const zen = generateLevel(meta, { mode: 'zen', zen: true })
    expect(zen.hazards).toHaveLength(0)
    expect(zen.enemies).toHaveLength(0)
    expect(validateLevel(zen)).toEqual([])
  })

  it('sits every lift flush with its floor and clear of the floor below', () => {
    let lifts = 0
    for (const meta of ALL_LEVELS.slice(0, 60)) {
      const level = generateLevel(meta)
      const floorTops = new Set(level.platforms.map((platform) => platform.y))
      for (const lift of level.movingPlatforms.filter((item) => item.style === 'lift')) {
        lifts += 1
        expect(floorTops.has(lift.y - lift.height / 2)).toBe(true)
        expect(lift.distance).toBe(LIFT_TRAVEL)
        // Gaps alternate sides, so the floor below is solid under a lift.
        // It must never descend into that floor and crush its rider.
        expect(FLOOR_HEIGHT - lift.distance).toBeGreaterThanOrEqual(90)
        expect(lift.speed).toBeGreaterThanOrEqual(30)
        expect(lift.speed).toBeLessThanOrEqual(60)
      }
    }
    expect(lifts).toBeGreaterThan(30)
  })

  it('provides a safe front door and a reachable exit on every level', () => {
    for (const meta of ALL_LEVELS.slice(0, 40)) {
      const level = generateLevel(meta)
      expect(level.start.x).toBeGreaterThanOrEqual(0)
      expect(level.start.x).toBeLessThan(level.width)
      expect(level.exit.x).toBeLessThanOrEqual(level.width)
      expect(level.start.y).toBeLessThan(level.exit.y)
      expect(level.sparks.length).toBeGreaterThanOrEqual(level.floors - 1)
    }
  })
})

describe('campaign progression', () => {
  it('gates levels and worlds behind the previous clear', () => {
    const fresh = defaultSave()
    expect(levelUnlocked(fresh, 'w1-1')).toBe(true)
    expect(levelUnlocked(fresh, 'w1-2')).toBe(false)
    expect(levelUnlocked(fresh, 'w2-1')).toBe(false)
    expect(worldUnlocked(fresh, 1)).toBe(false)
    expect(progressionProbe()).toEqual([])

    fresh.levels['w1-1'] = {
      completed: true, stars: 2, bestScore: 1, bestTimeMs: 1, bestEnergy: 1,
      noDamage: false, optional: false, bestCombo: 1,
    }
    expect(levelUnlocked(fresh, 'w1-2')).toBe(true)
    fresh.levels['w1-50'] = {
      completed: true, stars: 1, bestScore: 1, bestTimeMs: 1, bestEnergy: 1,
      noDamage: false, optional: false, bestCombo: 1,
    }
    expect(worldUnlocked(fresh, 1)).toBe(true)
    expect(levelUnlocked(fresh, 'w2-1')).toBe(true)
  })

  it('finds the next incomplete stage and totals world stars', () => {
    expect(firstIncompleteLevel(save)).toBe('w1-1')
    complete('w1-1', 3)
    complete('w1-2', 2)
    expect(firstIncompleteLevel(save)).toBe('w1-3')
    expect(worldStars(save, 0)).toBe(5)
    expect(totalStars(save)).toBe(5)
    expect(completedLevels(save)).toBe(2)
  })
})

describe('daily challenge', () => {
  it('is deterministic per UTC date and selects a real level', () => {
    const a = dailyMeta('2026-11-11')
    const b = dailyMeta('2026-11-11')
    expect(a).toEqual(b)
    expect(a.worldIndex).toBeGreaterThanOrEqual(0)
    expect(a.worldIndex).toBeLessThan(20)
    expect(parseLevelId(a.id)).not.toBeNull()
    expect(dailyDate(new Date('2026-11-11T23:59:00Z'))).toBe('2026-11-11')
    expect(dailyMeta('2026-11-12').seed).not.toBe(dailyMeta('2026-11-11').seed)
  })
})
