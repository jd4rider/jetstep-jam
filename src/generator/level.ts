import { clamp, int, mulberry32, pick, range } from '../core/rng'
import type { LevelMeta } from '../data/levels'
import { powerForLevel } from '../data/powerups'
import { worldAt } from '../data/worlds'
import type {
  CheckpointSpec,
  EnemyKind,
  EnemySpec,
  HazardKind,
  HazardSpec,
  LevelData,
  MovingPlatformSpec,
  PlatformKind,
  PlatformSpec,
  PlayMode,
  PickupSpec,
} from '../types'

export const LEVEL_WIDTH = 900
export const TOP_FLOOR_Y = 500
export const FLOOR_HEIGHT = 360
export const FLOOR_LEFT = 38
export const FLOOR_RIGHT = 862
const GAP_WIDTH_MIN = 116
const GAP_WIDTH_MAX = 154

interface GenerateOptions {
  mode?: PlayMode
  seedSalt?: number
  zen?: boolean
  stage?: number
}

const HAZARDS_BY_WORLD: HazardKind[][] = [
  ['spike', 'saw', 'steam'],
  ['laser', 'shutter', 'electric', 'saw'],
  ['spike', 'laser', 'beam', 'saw'],
  ['steam', 'piston', 'crusher', 'shutter'],
  ['icicle', 'spike', 'shutter', 'saw'],
  ['wind', 'spike', 'water', 'fan'],
  ['laser', 'saw', 'beam', 'mine'],
  ['boulder', 'spike', 'hammer', 'acid'],
  ['electric', 'beam', 'laser', 'rhythm'],
  ['hammer', 'piston', 'shutter', 'crusher'],
  ['gravity', 'mine', 'laser', 'saw'],
  ['beam', 'rhythm', 'laser', 'shutter'],
  ['spike', 'boulder', 'saw', 'wind'],
  ['water', 'saw', 'laser', 'mine'],
  ['fire', 'acid', 'steam', 'piston'],
  ['gravity', 'mine', 'rhythm', 'beam'],
  ['wind', 'laser', 'mine', 'fan'],
  ['rhythm', 'shutter', 'beam', 'electric'],
  ['laser', 'saw', 'piston', 'hammer', 'electric', 'spike', 'fire'],
  ['laser', 'piston', 'rhythm', 'fire', 'mine', 'shutter', 'electric'],
]

const ENEMY_KINDS: EnemyKind[] = ['patrol', 'hover', 'chase', 'turret', 'hopper', 'shield', 'vertical', 'orbit', 'charger', 'drifter']
export const ENEMY_NAMES = [
  'Circuit Critter', 'Spark Bug', 'Rolling Bot', 'Hover Drone', 'Clockwork Crab',
  'Mechanical Bat', 'Laser Spider', 'Patrol Bot', 'Spring Hopper', 'Static Slime',
  'Magnetic Mite', 'Mini Rocket Drone', 'Steam Gremlin', 'Crystal Beetle', 'Neon Wasp',
  'Shield Bot', 'Pulse Phantom', 'Ice Imp', 'Ember Sprite', 'Gear Guardian',
  'Tunnel Crawler', 'Sonic Sentinel', 'Mirror Drone', 'Gravity Gnat', 'Plasma Jelly',
  'Glitch Sprite', 'Flying Saw Bot', 'Charge Beetle', 'Portal Imp', 'Elite Security Drone',
] as const

function platformKind(worldIndex: number, random: () => number, floor: number): PlatformKind {
  if (worldIndex === 4) return random() < 0.32 ? 'ice' : 'solid'
  if (worldIndex === 1) return random() < 0.3 ? 'conveyor' : 'solid'
  if (worldIndex === 7) return random() < 0.25 ? 'bounce' : 'solid'
  if ((worldIndex === 11 || worldIndex === 15) && floor % 3 === 2) return 'oneway'
  return 'solid'
}

function floorSegments(
  y: number,
  gapX: number,
  gapWidth: number,
  kind: PlatformKind,
  conveyorDirection: -1 | 1,
): PlatformSpec[] {
  const leftWidth = gapX - FLOOR_LEFT
  const rightX = gapX + gapWidth
  const rightWidth = FLOOR_RIGHT - rightX
  const height = 28
  const segments: PlatformSpec[] = []
  if (leftWidth > 20) segments.push({ x: FLOOR_LEFT, y, width: leftWidth, height, kind, direction: conveyorDirection })
  if (rightWidth > 20) segments.push({ x: rightX, y, width: rightWidth, height, kind, direction: conveyorDirection })
  return segments
}

function pointOnSegment(segments: PlatformSpec[], random: () => number, inset = 54): { x: number; y: number } {
  const segment = pick(random, segments)
  const usable = Math.max(20, segment.width - inset * 2)
  return { x: segment.x + inset + random() * usable, y: segment.y }
}

function hazardAwayFrom(
  kind: HazardKind,
  segments: PlatformSpec[],
  occupied: Array<{ x: number; y: number; radius?: number }>,
  random: () => number,
): HazardSpec | null {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const segment = pick(random, segments)
    if (segment.width < 100) continue
    const inset = 60
    const x = segment.x + inset + random() * Math.max(1, segment.width - inset * 2)
    if (occupied.some((point) => Math.abs(point.x - x) < (point.radius ?? 70))) continue
    const base = { x, y: segment.y - 18, kind, phase: random(), linkedSwitch: undefined }
    switch (kind) {
      case 'spike':
        return { ...base, width: 34, height: 24, period: 0 }
      case 'laser':
      case 'beam':
      case 'shutter':
        return { ...base, x, y: segment.y - 105, width: kind === 'shutter' ? 26 : 14, height: 100, period: range(random, 1600, 2800) }
      case 'saw':
        return { ...base, x, y: segment.y - 32, width: 46, height: 46, period: range(random, 2600, 4200), axis: 'x', distance: range(random, 70, 170) }
      case 'steam':
      case 'fire':
        return { ...base, x, y: segment.y - 128, width: 44, height: 118, period: range(random, 1700, 2700) }
      case 'piston':
      case 'crusher':
      case 'hammer':
        return { ...base, x, y: segment.y - 150, width: 58, height: 62, period: range(random, 2100, 3400), axis: 'y', distance: range(random, 70, 110) }
      case 'electric':
      case 'acid':
        return { ...base, x, y: segment.y - 16, width: 86, height: 20, period: range(random, 1300, 2200) }
      case 'mine':
        return { ...base, x, y: segment.y - 120 - random() * 110, width: 34, height: 34, period: range(random, 2200, 3600) }
      case 'wind':
      case 'fan':
        return { ...base, x, y: segment.y - 170, width: 120, height: 160, period: range(random, 2600, 4000) }
      case 'water':
        return { ...base, x, y: segment.y - 90, width: 150, height: 90, period: 0 }
      case 'icicle':
        return { ...base, x, y: segment.y - 210, width: 22, height: 54, period: range(random, 2100, 3600), axis: 'y', distance: range(random, 120, 170) }
      case 'gravity':
        return { ...base, x, y: segment.y - 125, width: 145, height: 130, period: range(random, 3500, 5200) }
      case 'rhythm':
        return { ...base, x, y: segment.y - 100, width: 38, height: 96, period: range(random, 900, 1500) }
      case 'boulder':
        return { ...base, x, y: segment.y - 48, width: 56, height: 56, period: range(random, 3200, 4800), axis: 'x', distance: range(random, 90, 180) }
      default:
        return null
    }
  }
  return null
}

function enemyFor(worldIndex: number, floor: number, x: number, y: number, random: () => number): EnemySpec {
  const variant = (worldIndex * 3 + floor * 5 + Math.floor(random() * 3)) % 30
  const kind = ENEMY_KINDS[variant % ENEMY_KINDS.length]
  return {
    x,
    y,
    kind,
    variant,
    range: range(random, 70, 155),
    speed: range(random, 28, 64) + worldIndex * 0.7,
    shielded: kind === 'shield',
  }
}

export function generateLevel(meta: LevelMeta, options: GenerateOptions = {}): LevelData {
  const world = worldAt(meta.worldIndex)
  const mode = options.mode ?? 'campaign'
  const baseSeed = options.seedSalt ? meta.seed ^ options.seedSalt : meta.seed
  const random = mulberry32(baseSeed)
  const stage = options.stage ?? 0
  const floorCount = clamp(8 + Math.floor(meta.worldIndex / 5) + (stage > 0 ? 1 : 0), 8, 12)
  const width = LEVEL_WIDTH
  const height = TOP_FLOOR_Y + floorCount * FLOOR_HEIGHT + 240
  const platforms: PlatformSpec[] = []
  const movingPlatforms: MovingPlatformSpec[] = []
  const hazards: HazardSpec[] = []
  const enemies: EnemySpec[] = []
  const sparks: PickupSpec[] = []
  const optionalSparks: PickupSpec[] = []
  const energy: PickupSpec[] = []
  const switches: LevelData['switches'] = []
  const checkpoints: CheckpointSpec[] = []
  const occupied: Array<{ x: number; y: number; radius?: number }> = []
  const isZen = options.zen ?? mode === 'zen'
  const hazardPool = HAZARDS_BY_WORLD[meta.worldIndex] ?? HAZARDS_BY_WORLD[0]

  for (let floor = 0; floor < floorCount; floor += 1) {
    const y = TOP_FLOOR_Y + floor * FLOOR_HEIGHT
    const gapWidth = Math.round(range(random, GAP_WIDTH_MIN, GAP_WIDTH_MAX))
    const gapX = floor % 2 === 0 ? 292 : 492
    const kind = platformKind(meta.worldIndex, random, floor)
    const direction: -1 | 1 = floor % 4 < 2 ? 1 : -1
    const segments = floorSegments(y, gapX, gapWidth, kind, direction)
    platforms.push(...segments)

    const requiredPoint = pointOnSegment(segments, random)
    // One required spark per floor. Every spark sits close enough above a wide
    // platform that it is reachable with a normal jump or a short jet tap.
    sparks.push({ x: requiredPoint.x, y: y - 46, required: true, variant: (meta.worldIndex + floor) % 5 })
    occupied.push({ x: requiredPoint.x, y: y - 46, radius: 64 })

    if (floor === 0) {
      const optional = pointOnSegment(segments, random)
      optionalSparks.push({ x: optional.x, y: y - 148, variant: 4 })
      occupied.push({ x: optional.x, y: y - 148, radius: 55 })
    } else if (floor % 3 === 0) {
      const optional = pointOnSegment(segments, random)
      optionalSparks.push({ x: optional.x, y: y - 162, variant: (floor + 2) % 5 })
      occupied.push({ x: optional.x, y: y - 162, radius: 55 })
    }

    if (floor % 2 === 0 || floor === floorCount - 1) {
      const fuel = pointOnSegment(segments, random)
      energy.push({ x: fuel.x, y: y - 40, amount: 32 })
      occupied.push({ x: fuel.x, y: y - 40, radius: 44 })
    }

    if (floor > 0 && floor % 3 === 0) {
      checkpoints.push({ x: FLOOR_LEFT + 42, y: y - 22, floor })
    }

    if (floor > 0 && !isZen) {
      const count = Math.min(2, 1 + Math.floor((meta.difficulty + floor) / 7))
      for (let index = 0; index < count; index += 1) {
        const hazardKind = pick(random, hazardPool)
        const hazard = hazardAwayFrom(hazardKind, segments, occupied, random)
        if (!hazard) continue
        hazards.push(hazard)
        occupied.push({ x: hazard.x, y: hazard.y, radius: 58 })
      }
    }

    if (floor > 0 && !isZen && random() < 0.56) {
      const spot = pointOnSegment(segments, random)
      const enemy = enemyFor(meta.worldIndex, floor, spot.x, y - 58, random)
      if (!occupied.some((point) => Math.abs(point.x - spot.x) < 52)) {
        enemies.push(enemy)
        occupied.push({ x: spot.x, y: y - 58, radius: 50 })
      }
    }

    if (floor === Math.floor(floorCount / 2) && !isZen) {
      const linked = hazards.find((hazard) => hazard.y < y && hazard.y > y - 140)
      if (linked) {
        const switchSpot = pointOnSegment(segments, random)
        const id = `switch-${floor}`
        switches.push({ id, x: switchSpot.x, y: y - 28, color: world.palette.accent })
        linked.linkedSwitch = id
      }
    }

    if (floor < floorCount - 1) {
      // A lift lives in the gap. It gives a second route and a way back up for a
      // missed spark, without turning the level into a free-flying sandbox.
      if (floor % 2 === 0) {
        movingPlatforms.push({
          x: gapX + gapWidth / 2,
          y: y - 14,
          width: Math.min(104, gapWidth - 18),
          height: 16,
          axis: 'y',
          distance: FLOOR_HEIGHT,
          speed: range(random, 38, 56),
          phase: random(),
          style: 'lift',
        })
      } else if (random() < 0.4) {
        movingPlatforms.push({
          x: 190 + random() * 210,
          y: y - 150,
          width: 96,
          height: 15,
          axis: 'x',
          distance: 120 + random() * 60,
          speed: range(random, 30, 48),
          phase: random(),
          style: 'carrier',
        })
      }
    }
  }

  const lastY = TOP_FLOOR_Y + (floorCount - 1) * FLOOR_HEIGHT
  const exitX = 758
  const topSegment = platforms.find((platform) => platform.y === TOP_FLOOR_Y && platform.x <= 150)
  const startX = topSegment ? clamp(topSegment.x + 64, 64, 180) : 90
  const exitPlatform = platforms.find(
    (platform) => platform.y === lastY && platform.x <= exitX && platform.x + platform.width >= exitX,
  )
  const safeExitX = exitPlatform ? clamp(exitX, exitPlatform.x + 50, exitPlatform.x + exitPlatform.width - 50) : 720

  const powerup = powerForLevel(baseSeed >>> 3)
  if (isZen) {
    hazards.length = 0
    enemies.length = 0
  }

  return {
    id: meta.id,
    worldIndex: meta.worldIndex,
    levelNumber: meta.levelNumber,
    name: meta.name,
    seed: baseSeed,
    width,
    height,
    start: { x: startX, y: TOP_FLOOR_Y - 64 },
    exit: { x: safeExitX, y: lastY - 64 },
    floors: floorCount,
    platforms,
    movingPlatforms,
    hazards,
    enemies,
    sparks,
    optionalSparks,
    energy,
    switches,
    checkpoints,
    powerupId: powerup.id,
    requiredSparks: sparks.length,
    boss: meta.boss,
    gravityScale: isZen ? 1 : meta.worldIndex === 10 ? 0.56 : meta.worldIndex === 15 ? 0.82 : 1,
    drag: meta.worldIndex === 13 || meta.worldIndex === 5 ? 1.12 : 1,
    zen: isZen,
  }
}

export function platformUnder(level: LevelData, x: number, y: number, maxDistance = 220): PlatformSpec | null {
  let best: PlatformSpec | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const platform of level.platforms) {
    if (x < platform.x || x > platform.x + platform.width) continue
    if (platform.y < y) continue
    const distance = platform.y - y
    if (distance <= maxDistance && distance < bestDistance) {
      best = platform
      bestDistance = distance
    }
  }
  return best
}
