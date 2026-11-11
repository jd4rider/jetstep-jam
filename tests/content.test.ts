import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../src/data/achievements'
import { BOOTS, OUTFITS, unlockedBoots, unlockedOutfits } from '../src/data/cosmetics'
import { POWERUPS } from '../src/data/powerups'
import { WORLDS } from '../src/data/worlds'
import { defaultSave } from '../src/core/save'
import { ALL_LEVELS } from '../src/data/levels'

const PATTERNS = new Set(['shockwave', 'laser', 'rain', 'charge', 'orbit', 'pulse'])

describe('content catalogue', () => {
  it('ships 20 distinct worlds and 20 unique bosses', () => {
    expect(WORLDS).toHaveLength(20)
    expect(new Set(WORLDS.map((world) => world.id)).size).toBe(20)
    expect(new Set(WORLDS.map((world) => world.name)).size).toBe(20)
    expect(new Set(WORLDS.map((world) => world.boss.name)).size).toBe(20)
    for (const world of WORLDS) {
      expect(world.boss.patterns.length).toBeGreaterThanOrEqual(3)
      for (const pattern of world.boss.patterns) expect(PATTERNS.has(pattern)).toBe(true)
      expect(world.palette.skyTop).toMatch(/^#[0-9a-f]{6}$/i)
      expect(world.music.scale.length).toBeGreaterThanOrEqual(5)
    }
    const bosses = ALL_LEVELS.filter((level) => level.boss)
    expect(bosses).toHaveLength(20)
  })

  it('ships all 35 power-ups with unique ids, usable durations and effects', () => {
    expect(POWERUPS).toHaveLength(35)
    expect(new Set(POWERUPS.map((power) => power.id)).size).toBe(35)
    for (const power of POWERUPS) {
      expect(power.durationMs).toBeGreaterThanOrEqual(0)
      expect(power.maxStacks).toBeGreaterThanOrEqual(1)
      expect(Object.keys(power.effect).length).toBeGreaterThan(0)
      expect(power.name.length).toBeGreaterThan(0)
      expect(power.description.length).toBeGreaterThan(10)
    }
    expect(POWERUPS.filter((power) => power.effect.immediate)).toHaveLength(8)
  })

  it('ships 20 outfits and 30 boot skins with star-based unlocks', () => {
    expect(OUTFITS).toHaveLength(20)
    expect(BOOTS).toHaveLength(30)
    expect(new Set(OUTFITS.map((item) => item.id)).size).toBe(20)
    expect(new Set(BOOTS.map((item) => item.id)).size).toBe(30)
    expect(unlockedOutfits(0)).toEqual(['classic', 'neon', 'crystal'])
    expect(unlockedBoots(0)).toEqual(['chrome', 'gold', 'neon'])
    expect(unlockedOutfits(100000)).toHaveLength(20)
    expect(unlockedBoots(100000)).toHaveLength(30)
  })

  it('ships at least 100 unique achievements that are safe on a fresh save', () => {
    const save = defaultSave()
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(100)
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(ACHIEVEMENTS.length)
    for (const achievement of ACHIEVEMENTS) {
      expect(() => achievement.check(save)).not.toThrow()
      expect(achievement.description.length).toBeGreaterThan(8)
      expect(ACHIEVEMENT_BY_ID.get(achievement.id)).toBe(achievement)
    }
    expect(ACHIEVEMENTS.filter((achievement) => achievement.check(save))).toHaveLength(0)
  })
})
