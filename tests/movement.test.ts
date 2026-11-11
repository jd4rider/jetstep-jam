import { describe, expect, it } from 'vitest'
import { PLAYER, TUNING } from '../src/config'
import {
  approach, bodyHeight, canThrust, clampFall, coyoteRemaining, cutJump, energyRatio,
  horizontalTarget, jumpBufferRemaining, jumpVelocity, powerMultipliers, scoreForSpark,
  starsFor, stepEnergy, stepHorizontal,
} from '../src/player/movement'

describe('horizontal movement', () => {
  it('accelerates toward the configured run speed and decelerates with drag', () => {
    let speed = 0
    for (let index = 0; index < 60; index += 1) {
      speed = stepHorizontal(speed, { left: false, right: true }, true, 1 / 60)
    }
    expect(speed).toBeCloseTo(TUNING.runSpeed, 2)
    const stopped = stepHorizontal(speed, { left: false, right: false }, true, 1 / 60)
    expect(stopped).toBeLessThan(speed)
    expect(horizontalTarget({ left: true, right: false }, 100)).toBe(-100)
  })

  it('is frame-rate independent across one second', () => {
    let at60 = 0
    let at30 = 0
    for (let index = 0; index < 60; index += 1) at60 = stepHorizontal(at60, { left: false, right: true }, true, 1 / 60)
    for (let index = 0; index < 30; index += 1) at30 = stepHorizontal(at30, { left: false, right: true }, true, 1 / 30)
    expect(Math.abs(at60 - at30)).toBeLessThan(0.01)
    expect(approach(0, 10, 4)).toBe(4)
    expect(approach(9, 10, 4)).toBe(10)
    expect(approach(11, 10, 4)).toBe(10)
  })
})

describe('jump feel', () => {
  it('uses coyote time, input buffering and a variable-height cut', () => {
    expect(coyoteRemaining(TUNING.coyoteMs, false, 40)).toBe(TUNING.coyoteMs - 40)
    expect(coyoteRemaining(0, false, 40)).toBe(0)
    expect(coyoteRemaining(0, true, 40)).toBe(TUNING.coyoteMs)
    expect(jumpBufferRemaining(0, true, 16)).toBe(TUNING.jumpBufferMs)
    expect(jumpBufferRemaining(40, false, 16)).toBe(24)
    expect(jumpBufferRemaining(5, false, 16)).toBe(0)
    expect(jumpVelocity()).toBe(TUNING.jumpVelocity)
    expect(jumpVelocity(1.2)).toBeCloseTo(TUNING.jumpVelocity * 1.2)
    expect(cutJump(-600)).toBe(TUNING.jumpCutVelocity)
    expect(cutJump(-100)).toBe(-100)
  })
})

describe('jet energy', () => {
  it('drains while thrusting and refills on the ground', () => {
    expect(stepEnergy(100, true, false, 1)).toBe(100 - TUNING.jetDrainPerSecond)
    expect(stepEnergy(50, false, true, 1)).toBe(50 + TUNING.jetGroundRefillPerSecond)
    expect(stepEnergy(1, true, false, 10)).toBe(0)
    expect(stepEnergy(100, true, false, 1, 1, true)).toBe(100)
  })

  it('stops thrusting at empty and reports a readable ratio', () => {
    expect(canThrust(0, true, false)).toBe(false)
    expect(canThrust(1, true, false)).toBe(true)
    expect(canThrust(100, false, true)).toBe(false)
    expect(energyRatio(-2)).toBe(0)
    expect(energyRatio(50)).toBe(0.5)
    expect(energyRatio(120)).toBe(1)
  })
})

describe('ducking, sliding and falling', () => {
  it('shrinks the collision height for duck and slide', () => {
    expect(bodyHeight(false, false)).toBe(PLAYER.height)
    expect(bodyHeight(true, false)).toBe(PLAYER.duckHeight)
    expect(bodyHeight(false, true)).toBe(PLAYER.slideHeight)
    expect(bodyHeight(true, true)).toBe(PLAYER.slideHeight)
    expect(PLAYER.slideHeight).toBeLessThan(PLAYER.duckHeight)
    expect(PLAYER.duckHeight).toBeLessThan(PLAYER.height)
  })

  it('clamps falling without affecting upward motion', () => {
    expect(clampFall(2000)).toBe(TUNING.maxFallSpeed)
    expect(clampFall(2000, 300)).toBe(300)
    expect(clampFall(-400)).toBe(-400)
  })
})

describe('power stacking and scoring', () => {
  it('multiplies compatible power effects', () => {
    const mods = powerMultipliers([
      { effect: { thrustMult: 1.45, drainMult: 0.55 } },
      { effect: { thrustMult: 1.2, scoreMult: 2, magnetRange: 180 } },
    ])
    expect(mods.thrustMult).toBeCloseTo(1.74)
    expect(mods.drainMult).toBeCloseTo(0.55)
    expect(mods.scoreMult).toBe(2)
    expect(mods.magnetRange).toBe(180)
    expect(mods.invincible).toBe(false)
  })

  it('awards one to three stars and escalating spark scores', () => {
    expect(starsFor({ completed: false, energy: 100, noDamage: true, allOptional: true })).toBe(0)
    expect(starsFor({ completed: true, energy: 10, noDamage: false, allOptional: false })).toBe(1)
    expect(starsFor({ completed: true, energy: 60, noDamage: false, allOptional: false })).toBe(2)
    expect(starsFor({ completed: true, energy: 60, noDamage: true, allOptional: false })).toBe(3)
    expect(starsFor({ completed: true, energy: 1, noDamage: false, allOptional: true })).toBe(2)
    expect(scoreForSpark(0)).toBe(25)
    expect(scoreForSpark(10)).toBe(75)
    expect(scoreForSpark(100)).toBe(100)
    expect(scoreForSpark(4, 2)).toBe(90)
  })
})
