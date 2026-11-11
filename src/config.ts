export const GAME_WIDTH = 540
export const GAME_HEIGHT = 960
export const GAME_ID = 'jetstep-jam'
export const STORAGE_KEY = 'jetstep-jam-save-v1'
export const VERSION = '1.0.2'
export const SCHEMA_VERSION = 2

export const FONT = '"Avenir Next", "Trebuchet MS", "Segoe UI", system-ui, sans-serif'
export const DISPLAY_FONT = '"Avenir Next", "Trebuchet MS", "Segoe UI", system-ui, sans-serif'

export const COLORS = {
  ink: 0x140e2b,
  night: 0x1b1438,
  panel: 0x261d4b,
  panelLight: 0x352866,
  cream: 0xfff4dc,
  muted: 0xa99fc4,
  teal: 0x5cf2d6,
  mint: 0x9bffda,
  pink: 0xff7ec4,
  gold: 0xffe066,
  orange: 0xffa94d,
  coral: 0xff6b7a,
  violet: 0xb79cff,
  white: 0xffffff,
  danger: 0xff5679,
  shield: 0x76e8ff,
} as const

export const CSS = {
  ink: '#140e2b',
  cream: '#fff4dc',
  muted: '#a99fc4',
  teal: '#5cf2d6',
  mint: '#9bffda',
  pink: '#ff7ec4',
  gold: '#ffe066',
  orange: '#ffa94d',
  coral: '#ff6b7a',
  violet: '#b79cff',
  white: '#ffffff',
  danger: '#ff5679',
} as const

export const TUNING = {
  gravity: 1760,
  runSpeed: 272,
  runAcceleration: 2350,
  airAcceleration: 1680,
  groundDrag: 2700,
  airDrag: 430,
  jumpVelocity: -655,
  jumpCutVelocity: -235,
  coyoteMs: 105,
  jumpBufferMs: 125,
  apexGravityScale: 0.72,
  maxFallSpeed: 870,
  jetThrust: -1720,
  jetMaxRise: 265,
  jetMaxFall: 560,
  jetDrainPerSecond: 24,
  jetGroundRefillPerSecond: 5.5,
  jetPickupRefill: 34,
  slideSpeed: 420,
  slideMs: 320,
  duckSpeed: 105,
  invulnerableMs: 1350,
  hitKnockbackX: 260,
  hitKnockbackY: -310,
  respawnGraceMs: 1200,
} as const

export const PLAYER = {
  width: 30,
  height: 56,
  duckHeight: 32,
  slideHeight: 26,
  startEnergy: 100,
  maxEnergy: 100,
  maxHealth: 3,
} as const

export const CAMERA = {
  lerpX: 0.12,
  lerpY: 0.09,
  lookAheadX: 88,
  lookAheadDown: 150,
  lookAheadUp: 80,
} as const
