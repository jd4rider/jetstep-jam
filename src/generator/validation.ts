import { generateLevel, platformUnder, FLOOR_HEIGHT, LEVEL_WIDTH } from './level'
import { ALL_LEVELS, LEVELS_PER_WORLD, TOTAL_LEVELS, worldUnlocked } from '../data/levels'
import type { LevelData, SaveData } from '../types'
import { defaultSave } from '../core/save'

export interface ValidationReport {
  levelId: string
  errors: string[]
}

export function validateLevel(level: LevelData): string[] {
  const errors: string[] = []
  if (!level.id) errors.push('missing id')
  if (level.width !== LEVEL_WIDTH) errors.push('unexpected width')
  if (level.floors < 8) errors.push('fewer than 8 floors')
  if (level.sparks.length !== level.requiredSparks) errors.push('required spark count mismatch')
  if (level.sparks.length < level.floors - 1) errors.push('too few required sparks')
  if (level.sparks.length === 0) errors.push('no required sparks')
  if (level.optionalSparks.length < 1) errors.push('no optional spark')

  if (level.start.x < 0 || level.start.x > level.width) errors.push('start outside world')
  if (level.start.y < 0 || level.start.y > level.height) errors.push('start outside world')
  if (level.exit.x < 0 || level.exit.x > level.width) errors.push('exit outside world')
  if (level.exit.y < 0 || level.exit.y > level.height) errors.push('exit outside world')
  if (!platformUnder(level, level.start.x, level.start.y, 140)) errors.push('start not on a platform')
  if (!platformUnder(level, level.exit.x, level.exit.y, 140)) errors.push('exit not on a platform')

  level.sparks.forEach((spark, index) => {
    const platform = platformUnder(level, spark.x, spark.y, 180)
    if (!platform) errors.push(`required spark ${index} has no platform below`)
    if (platform && spark.y > platform.y) errors.push(`required spark ${index} is below its platform`)
  })

  level.optionalSparks.forEach((spark, index) => {
    const platform = platformUnder(level, spark.x, spark.y, 260)
    if (!platform) errors.push(`optional spark ${index} is unreachable`)
  })

  if (level.energy.length < Math.max(2, Math.floor(level.floors / 2))) errors.push('not enough energy')
  if (level.hazards.some((hazard) => hazard.period < 0)) errors.push('negative hazard period')

  const starts = level.platforms.filter((platform) => platform.y === Math.min(...level.platforms.map((entry) => entry.y)))
  const startY = starts[0]?.y
  if (startY !== undefined) {
    const wallToWall = starts.sort((a, b) => a.x - b.x)
    for (let index = 1; index < wallToWall.length; index += 1) {
      const gap = wallToWall[index].x - (wallToWall[index - 1].x + wallToWall[index - 1].width)
      if (gap > 170) errors.push('top-floor gap is too wide')
    }
  }

  if (level.hazards.some((hazard) => Math.abs(hazard.x - level.start.x) < 70 && Math.abs(hazard.y - level.start.y) < 120)) {
    errors.push('hazard overlaps start')
  }

  const floorYs = new Set<number>()
  level.sparks.forEach((spark) => {
    const platform = platformUnder(level, spark.x, spark.y, 180)
    if (platform) floorYs.add(platform.y)
  })
  if (floorYs.size < Math.min(4, level.floors - 1)) errors.push('required sparks do not span the floors')

  return errors
}

export function validateAllLevels(): ValidationReport[] {
  return ALL_LEVELS.map((meta) => {
    const level = generateLevel(meta)
    return { levelId: meta.id, errors: validateLevel(level) }
  })
}

export function catalogErrors(): string[] {
  const errors: string[] = []
  if (ALL_LEVELS.length !== TOTAL_LEVELS) errors.push(`expected ${TOTAL_LEVELS} levels, found ${ALL_LEVELS.length}`)
  const ids = new Set<string>()
  ALL_LEVELS.forEach((level) => {
    if (ids.has(level.id)) errors.push(`duplicate id ${level.id}`)
    ids.add(level.id)
    if (level.levelNumber < 1 || level.levelNumber > LEVELS_PER_WORLD) errors.push(`bad level number ${level.id}`)
    if (level.boss !== (level.levelNumber === LEVELS_PER_WORLD)) errors.push(`bad boss flag ${level.id}`)
  })
  for (let world = 0; world < 20; world += 1) {
    const count = ALL_LEVELS.filter((level) => level.worldIndex === world).length
    if (count !== LEVELS_PER_WORLD) errors.push(`world ${world + 1} has ${count} levels`)
  }
  return errors
}

export function progressionProbe(): string[] {
  const errors: string[] = []
  const save = defaultSave() as SaveData
  // A fresh save may enter world 1 only; every later world must remain gated.
  for (let world = 1; world < 20; world += 1) {
    if (worldUnlocked(save, world)) errors.push(`world ${world + 1} unlocked too early`)
  }
  for (let level = 1; level <= LEVELS_PER_WORLD; level += 1) {
    const id = `w1-${level}`
    if (level > 1 && !save.levels[`w1-${level - 1}`]?.completed) {
      // locked levels are expected here; just make sure the id is catalogue-valid
      if (!ALL_LEVELS.some((entry) => entry.id === id)) errors.push(`missing ${id}`)
    }
  }
  return errors
}

export function floorHeight(): number {
  return FLOOR_HEIGHT
}
