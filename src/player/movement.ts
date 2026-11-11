import { PLAYER, TUNING } from '../config'
import type { PlayerInput, PowerModifiers, StarCount } from '../types'

export interface Motion {
  vx: number
  vy: number
  energy: number
  onGround: boolean
  sliding: boolean
  slideRemaining: number
  invulnerable: number
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta)
  return Math.max(target, current - maxDelta)
}

export function horizontalTarget(input: Pick<PlayerInput, 'left' | 'right'>, speed: number): number {
  return (input.right ? 1 : 0) * speed - (input.left ? 1 : 0) * speed
}

export function stepHorizontal(
  velocityX: number,
  input: Pick<PlayerInput, 'left' | 'right'>,
  onGround: boolean,
  deltaSeconds: number,
  speedMultiplier = 1,
): number {
  const speed = TUNING.runSpeed * speedMultiplier
  const target = horizontalTarget(input, speed)
  if (target !== 0) {
    const acceleration = onGround ? TUNING.runAcceleration : TUNING.airAcceleration
    return approach(velocityX, target, acceleration * deltaSeconds)
  }
  const drag = onGround ? TUNING.groundDrag : TUNING.airDrag
  return approach(velocityX, 0, drag * deltaSeconds)
}

export function stepEnergy(
  energy: number,
  jetting: boolean,
  onGround: boolean,
  deltaSeconds: number,
  drainMultiplier = 1,
  infinite = false,
): number {
  if (infinite) return PLAYER.maxEnergy
  let next = energy
  if (jetting) next -= TUNING.jetDrainPerSecond * drainMultiplier * deltaSeconds
  else if (onGround) next += TUNING.jetGroundRefillPerSecond * deltaSeconds
  return Math.max(0, Math.min(PLAYER.maxEnergy, next))
}

export function canThrust(energy: number, jetting: boolean, onGround: boolean): boolean {
  if (energy <= 0) return false
  if (onGround && !jetting) return false
  return true
}

export function coyoteRemaining(current: number, onGround: boolean, deltaMs: number): number {
  if (onGround) return TUNING.coyoteMs
  return Math.max(0, current - deltaMs)
}

export function jumpBufferRemaining(current: number, pressed: boolean, deltaMs: number): number {
  if (pressed) return TUNING.jumpBufferMs
  return Math.max(0, current - deltaMs)
}

export function jumpVelocity(multiplier = 1): number {
  return TUNING.jumpVelocity * multiplier
}

export function cutJump(velocityY: number): number {
  return Math.max(velocityY, TUNING.jumpCutVelocity)
}

export function clampFall(velocityY: number, maxFall: number = TUNING.maxFallSpeed): number {
  return Math.min(velocityY, maxFall)
}

export function bodyHeight(ducking: boolean, sliding: boolean): number {
  if (sliding) return PLAYER.slideHeight
  if (ducking) return PLAYER.duckHeight
  return PLAYER.height
}

export function energyRatio(energy: number): number {
  return Math.max(0, Math.min(1, energy / PLAYER.maxEnergy))
}

export function powerMultipliers(active: ReadonlyArray<{ effect: { thrustMult?: number; drainMult?: number; speedMult?: number; gravityMult?: number; jumpMult?: number; maxFall?: number; magnetRange?: number; scoreMult?: number; comboBonus?: number; hazardImmune?: boolean; invincible?: boolean; phase?: boolean; infiniteEnergy?: boolean; slowHazards?: boolean; freezeMachines?: boolean; enemyFreeze?: boolean; radar?: boolean; sparkBonus?: number; landingRefill?: number } }>): PowerModifiers {
  const mods: PowerModifiers = {
    thrustMult: 1,
    drainMult: 1,
    speedMult: 1,
    gravityMult: 1,
    jumpMult: 1,
    maxFall: TUNING.maxFallSpeed,
    magnetRange: 0,
    scoreMult: 1,
    comboBonus: 0,
    hazardImmune: false,
    invincible: false,
    phase: false,
    infiniteEnergy: false,
    slowHazards: false,
    freezeMachines: false,
    enemyFreeze: false,
    radar: false,
    sparkBonus: 0,
    landingRefill: 0,
  }
  active.forEach(({ effect }) => {
    mods.thrustMult *= effect.thrustMult ?? 1
    mods.drainMult *= effect.drainMult ?? 1
    mods.speedMult *= effect.speedMult ?? 1
    mods.gravityMult *= effect.gravityMult ?? 1
    mods.jumpMult *= effect.jumpMult ?? 1
    mods.maxFall = Math.max(mods.maxFall, effect.maxFall ?? 0)
    mods.magnetRange = Math.max(mods.magnetRange, effect.magnetRange ?? 0)
    mods.scoreMult *= effect.scoreMult ?? 1
    mods.comboBonus += effect.comboBonus ?? 0
    mods.hazardImmune ||= effect.hazardImmune ?? false
    mods.invincible ||= effect.invincible ?? false
    mods.phase ||= effect.phase ?? false
    mods.infiniteEnergy ||= effect.infiniteEnergy ?? false
    mods.slowHazards ||= effect.slowHazards ?? false
    mods.freezeMachines ||= effect.freezeMachines ?? false
    mods.enemyFreeze ||= effect.enemyFreeze ?? false
    mods.radar ||= effect.radar ?? false
    mods.sparkBonus += effect.sparkBonus ?? 0
    mods.landingRefill = Math.max(mods.landingRefill, effect.landingRefill ?? 0)
  })
  return mods
}

export interface StarInput {
  completed: boolean
  energy: number
  noDamage: boolean
  allOptional: boolean
}

export function starsFor(input: StarInput): StarCount {
  if (!input.completed) return 0
  let stars = 1
  if (input.energy >= 25) stars += 1
  if (input.noDamage || input.allOptional) stars += 1
  return Math.min(3, stars) as StarCount
}

export function scoreForSpark(combo: number, multiplier = 1): number {
  const base = 25 + Math.min(75, Math.floor(combo) * 5)
  return Math.round(base * multiplier)
}
