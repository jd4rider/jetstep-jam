export type PlayMode = 'campaign' | 'endless' | 'classic' | 'daily' | 'time' | 'bossrush' | 'zen'
export type StarCount = 0 | 1 | 2 | 3

export interface LevelRecord {
  completed: boolean
  stars: StarCount
  bestScore: number
  bestTimeMs: number
  bestEnergy: number
  noDamage: boolean
  optional: boolean
  bestCombo: number
}

export interface GameplaySettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  ambienceVolume: number
  muted: boolean
  reducedMotion: boolean
  reducedFlash: boolean
  highContrast: boolean
  largeUi: boolean
  touchScale: number
  touchOpacity: number
  leftHanded: boolean
  haptics: boolean
}

export interface CosmeticState {
  outfit: string
  boots: string
  unlockedOutfits: string[]
  unlockedBoots: string[]
}

export interface DailyRecord {
  date: string
  score: number
  stars: StarCount
  timeMs: number
}

export interface ModeRecords {
  endlessBest: number
  classicBest: number
  bossRushBestMs: number
  daily: DailyRecord | null
  dailyCompletions: number
  time: Record<string, number>
  plays: Partial<Record<PlayMode, number>>
}

export interface SaveStats {
  sparksCollected: number
  optionalSparks: number
  deaths: number
  airSparks: number
  bestCombo: number
  powerupsCollected: number
  powersUsed: Record<string, number>
  bossesDefeated: number
  noDamageClears: number
  threeStarClears: number
}

export interface SaveData {
  schemaVersion: number
  levels: Record<string, LevelRecord>
  settings: GameplaySettings
  cosmetics: CosmeticState
  achievements: string[]
  modes: ModeRecords
  stats: SaveStats
  lastLevelId: string
}

export interface LevelResult {
  levelId: string
  mode: PlayMode
  score: number
  stars: StarCount
  timeMs: number
  energy: number
  noDamage: boolean
  optional: boolean
  combo: number
  sparks: number
  optionalSparks: number
  deaths: number
  airSparkRun: number
  powerups: string[]
  dailyDate?: string
}

export interface WorldPalette {
  skyTop: string
  skyBottom: string
  horizon: string
  platform: string
  platformLight: string
  accent: string
  accentTwo: string
  glow: string
  hazard: string
  ink: string
}

export interface WorldTheme {
  index: number
  id: string
  name: string
  tagline: string
  feature: string
  palette: WorldPalette
  music: {
    root: number
    scale: number[]
    tempo: number
    wave: OscillatorType
    ambient: string
  }
  boss: {
    name: string
    title: string
    color: string
    patterns: BossPattern[]
  }
}

export type BossPattern = 'shockwave' | 'laser' | 'rain' | 'charge' | 'orbit' | 'pulse'

export interface PowerEffect {
  thrustMult?: number
  drainMult?: number
  speedMult?: number
  gravityMult?: number
  jumpMult?: number
  maxFall?: number
  shield?: number
  invincible?: boolean
  hazardImmune?: boolean
  enemyFreeze?: boolean
  magnetRange?: number
  scoreMult?: number
  comboBonus?: number
  radar?: boolean
  energyRefill?: number
  sparkBonus?: number
  slowHazards?: boolean
  freezeMachines?: boolean
  phase?: boolean
  drone?: boolean
  infiniteEnergy?: boolean
  landingRefill?: number
  immediate?: 'dash' | 'twin' | 'teleport' | 'pulse' | 'sonic' | 'portal' | 'life'
}

export interface PowerUpDefinition {
  id: string
  name: string
  short: string
  description: string
  color: number
  glyph: string
  durationMs: number
  maxStacks: number
  effect: PowerEffect
}

export interface CosmeticDefinition {
  id: string
  name: string
  description: string
  jacket: number
  trousers: number
  boots: number
  visor: number
  pack: number
  exhaust: number
  unlockStars: number
}

export type PlatformKind = 'solid' | 'oneway' | 'ice' | 'conveyor' | 'bounce'

export interface PlatformSpec {
  x: number
  y: number
  width: number
  height: number
  kind: PlatformKind
  direction?: -1 | 1
}

export interface MovingPlatformSpec {
  x: number
  y: number
  width: number
  height: number
  axis: 'x' | 'y' | 'xy'
  distance: number
  speed: number
  phase: number
  style: 'lift' | 'carrier'
}

export type HazardKind =
  | 'spike'
  | 'laser'
  | 'saw'
  | 'steam'
  | 'crusher'
  | 'electric'
  | 'mine'
  | 'fire'
  | 'wind'
  | 'water'
  | 'acid'
  | 'icicle'
  | 'hammer'
  | 'shutter'
  | 'gravity'
  | 'fan'
  | 'rhythm'
  | 'boulder'
  | 'piston'
  | 'beam'

export interface HazardSpec {
  x: number
  y: number
  width: number
  height: number
  kind: HazardKind
  phase: number
  period: number
  axis?: 'x' | 'y'
  distance?: number
  linkedSwitch?: string
}

export type EnemyKind =
  | 'patrol'
  | 'hover'
  | 'chase'
  | 'turret'
  | 'hopper'
  | 'shield'
  | 'vertical'
  | 'orbit'
  | 'charger'
  | 'drifter'

export interface EnemySpec {
  x: number
  y: number
  kind: EnemyKind
  variant: number
  range: number
  speed: number
  shielded?: boolean
}

export interface PickupSpec {
  x: number
  y: number
  required?: boolean
  variant?: number
  amount?: number
}

export interface SwitchSpec {
  id: string
  x: number
  y: number
  color: string
}

export interface CheckpointSpec {
  x: number
  y: number
  floor: number
}

export interface LevelData {
  id: string
  worldIndex: number
  levelNumber: number
  name: string
  seed: number
  width: number
  height: number
  start: { x: number; y: number }
  exit: { x: number; y: number }
  floors: number
  platforms: PlatformSpec[]
  movingPlatforms: MovingPlatformSpec[]
  hazards: HazardSpec[]
  enemies: EnemySpec[]
  sparks: PickupSpec[]
  optionalSparks: PickupSpec[]
  energy: PickupSpec[]
  switches: SwitchSpec[]
  checkpoints: CheckpointSpec[]
  powerupId: string
  requiredSparks: number
  boss: boolean
  gravityScale: number
  drag: number
  zen: boolean
}

export interface ResultsData {
  success: boolean
  mode: PlayMode
  levelId: string
  levelName: string
  worldIndex: number
  result: LevelResult
  nextLevelId?: string | null
  nextWorldIndex?: number | null
  newAchievements?: string[]
  newOutfits?: string[]
  newBoots?: string[]
  boss?: { name: string; title: string; worldIndex: number }
  rushComplete?: boolean
}

export interface PlayerInput {
  left: boolean
  right: boolean
  jet: boolean
  duck: boolean
  interact: boolean
  pause: boolean
  restart: boolean
}

export interface PowerModifiers {
  thrustMult: number
  drainMult: number
  speedMult: number
  gravityMult: number
  jumpMult: number
  maxFall: number
  magnetRange: number
  scoreMult: number
  comboBonus: number
  hazardImmune: boolean
  invincible: boolean
  phase: boolean
  infiniteEnergy: boolean
  slowHazards: boolean
  freezeMachines: boolean
  enemyFreeze: boolean
  radar: boolean
  sparkBonus: number
  landingRefill: number
}
