import Phaser from 'phaser'
import { PLAYER, TUNING } from '../config'
import type { PlayerInput, PowerModifiers } from '../types'
import {
  approach,
  canThrust,
  clampFall,
  coyoteRemaining,
  cutJump,
  jumpBufferRemaining,
  jumpVelocity,
  stepEnergy,
  stepHorizontal,
} from './movement'

export interface StepEvents {
  jumped: boolean
  landed: boolean
  jetStarted: boolean
  jetStopped: boolean
  energyEmpty: boolean
  slid: boolean
  ducked: boolean
}

export class Player {
  readonly hitbox: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  energy: number = PLAYER.startEnergy
  health: number = PLAYER.maxHealth
  facing: -1 | 1 = 1
  invulnerable: number = 0
  jetting = false
  ducking = false
  sliding = false
  onGround = false
  private coyote: number = TUNING.coyoteMs
  private buffer: number = 0
  private slideRemaining: number = 0
  private slideDirection: -1 | 1 = 1
  private jetLock: number = 0
  private previousJet = false
  private previousDuck = false
  private wasGrounded = true
  private speedMultiplier = 1
  private gravityMultiplier = 1
  private thrustMultiplier = 1
  private drainMultiplier = 1
  private jumpMultiplier = 1
  private maxFall: number = TUNING.maxFallSpeed
  private infiniteEnergy = false
  private landingRefill = 0
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.hitbox = scene.add.rectangle(x, y, PLAYER.width, PLAYER.height, 0xffffff, 0).setOrigin(0.5, 1)
    scene.physics.add.existing(this.hitbox)
    this.body = this.hitbox.body as Phaser.Physics.Arcade.Body
    this.body.setSize(PLAYER.width, PLAYER.height, false)
    this.body.setOffset(0, 0)
    this.body.setCollideWorldBounds(true)
    this.body.setMaxVelocity(560, TUNING.maxFallSpeed)
    this.body.setDragX(0)
    this.body.setAllowGravity(true)
  }

  setMods(mods: PowerModifiers): void {
    this.speedMultiplier = mods.speedMult
    this.gravityMultiplier = mods.gravityMult
    this.thrustMultiplier = mods.thrustMult
    this.drainMultiplier = mods.drainMult
    this.jumpMultiplier = mods.jumpMult
    this.maxFall = mods.maxFall
    this.infiniteEnergy = mods.infiniteEnergy
    this.landingRefill = mods.landingRefill
  }

  update(input: PlayerInput, deltaMs: number): StepEvents {
    const dt = Math.min(deltaMs, 34) / 1000
    const events: StepEvents = {
      jumped: false, landed: false, jetStarted: false, jetStopped: false,
      energyEmpty: false, slid: false, ducked: false,
    }
    this.onGround = this.body.blocked.down || this.body.touching.down
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - deltaMs)
    this.jetLock = Math.max(0, this.jetLock - deltaMs)
    this.slideRemaining = Math.max(0, this.slideRemaining - deltaMs)
    this.coyote = coyoteRemaining(this.coyote, this.onGround, deltaMs)
    this.buffer = jumpBufferRemaining(this.buffer, input.jet && !this.previousJet, deltaMs)

    if (this.onGround && !this.wasGrounded) {
      events.landed = true
      this.jetting = false
      this.body.setAllowGravity(true)
      if (this.landingRefill > 0) this.energy = Math.min(PLAYER.maxEnergy, this.energy + this.landingRefill)
      if (!this.ducking) this.setBodyHeight(PLAYER.height)
    }
    this.wasGrounded = this.onGround

    if (input.duck && !this.previousDuck && this.onGround && Math.abs(this.body.velocity.x) > 110) {
      this.sliding = true
      this.slideRemaining = TUNING.slideMs
      this.slideDirection = this.facing
      this.ducking = true
      this.setBodyHeight(PLAYER.slideHeight)
      this.body.velocity.x = this.slideDirection * TUNING.slideSpeed
      events.slid = true
    } else if (input.duck && !this.ducking && this.onGround) {
      this.ducking = true
      this.setBodyHeight(PLAYER.duckHeight)
      events.ducked = true
    }
    if (!input.duck && this.ducking) {
      if (this.canStand()) {
        this.ducking = false
        this.sliding = false
        this.slideRemaining = 0
        this.setBodyHeight(PLAYER.height)
      }
    }
    if (this.sliding && this.slideRemaining <= 0) {
      this.sliding = false
      if (this.canStand() && !input.duck) {
        this.ducking = false
        this.setBodyHeight(PLAYER.height)
      }
    }

    if (this.buffer > 0 && (this.onGround || this.coyote > 0) && !this.sliding) {
      if (this.ducking) {
        if (!this.canStand()) {
          // A low tunnel belongs to the duck. If there is no headroom, the jump
          // buffer waits until Pip can stand instead of clipping into the roof.
        } else {
          this.ducking = false
          this.setBodyHeight(PLAYER.height)
        }
      }
      if (!this.ducking) {
        this.body.setAllowGravity(true)
        this.body.velocity.y = jumpVelocity(this.jumpMultiplier)
        this.coyote = 0
        this.buffer = 0
        this.jetLock = 105
        this.jetting = false
        events.jumped = true
      }
    }

    if (!input.jet && this.body.velocity.y < TUNING.jumpCutVelocity) {
      this.body.velocity.y = cutJump(this.body.velocity.y)
    }

    const shouldJet =
      !this.onGround &&
      input.jet &&
      this.jetLock <= 0 &&
      canThrust(this.energy, true, false)
    if (shouldJet && !this.jetting) {
      this.jetting = true
      this.body.setAllowGravity(false)
      events.jetStarted = true
    }
    if (this.jetting && (!input.jet || this.energy <= 0 || this.onGround)) {
      this.jetting = false
      this.body.setAllowGravity(true)
      events.jetStopped = true
    }

    if (this.jetting) {
      const target = -TUNING.jetMaxRise * this.thrustMultiplier
      this.body.velocity.y = approach(this.body.velocity.y, target, 1500 * dt)
      this.body.velocity.y = Math.max(this.body.velocity.y, -TUNING.jetMaxRise * this.thrustMultiplier)
      this.energy = stepEnergy(this.energy, true, false, dt, this.drainMultiplier, this.infiniteEnergy)
      if (this.energy <= 0 && !this.infiniteEnergy) {
        events.energyEmpty = true
        this.jetting = false
        this.body.setAllowGravity(true)
      }
    } else {
      this.energy = stepEnergy(this.energy, false, this.onGround, dt, 1, this.infiniteEnergy)
    }

    const duckLimit = this.ducking ? 0.42 : 1
    if (this.sliding && this.slideRemaining > 0) {
      this.body.velocity.x = approach(this.body.velocity.x, this.slideDirection * TUNING.runSpeed, 220 * dt)
    } else {
      const targetX = stepHorizontal(this.body.velocity.x, input, this.onGround, dt, this.speedMultiplier * duckLimit)
      this.body.velocity.x = targetX
    }
    if (Math.abs(this.body.velocity.x) > 6) this.facing = this.body.velocity.x > 0 ? 1 : -1
    if (this.onGround && !this.sliding) this.body.velocity.x = Phaser.Math.Clamp(this.body.velocity.x, -TUNING.runSpeed * this.speedMultiplier, TUNING.runSpeed * this.speedMultiplier)
    this.body.velocity.y = clampFall(this.body.velocity.y, Math.max(TUNING.jetMaxFall, this.maxFall))
    if (this.infiniteEnergy) this.energy = PLAYER.maxEnergy
    this.previousJet = input.jet
    this.previousDuck = input.duck
    return events
  }

  private canStand(): boolean {
    const feet = this.body.bottom
    const centerX = this.body.center.x
    const hits = this.scene.physics.overlapRect(centerX - PLAYER.width / 2 + 1, feet - PLAYER.height + 2, PLAYER.width - 2, PLAYER.height - 4, false, true)
    return !hits.some((body) => body.gameObject !== this.hitbox && body.enable)
  }

  private setBodyHeight(height: number): void {
    this.body.setSize(PLAYER.width, height, false)
    this.body.setOffset(0, PLAYER.height - height)
    const bottom = this.body.bottom
    this.hitbox.y = bottom
  }

  hurt(fromX: number): boolean {
    if (this.invulnerable > 0) return false
    const dir = fromX < this.body.center.x ? 1 : -1
    this.body.velocity.x = dir * TUNING.hitKnockbackX
    this.body.velocity.y = TUNING.hitKnockbackY
    this.jetting = false
    this.body.setAllowGravity(true)
    this.invulnerable = TUNING.invulnerableMs
    return true
  }

  addEnergy(amount: number): void {
    this.energy = Math.min(PLAYER.maxEnergy, this.energy + amount)
  }

  setHealth(value: number): void {
    this.health = Phaser.Math.Clamp(value, 0, 5)
  }

  reset(x: number, y: number): void {
    this.body.reset(x, y)
    this.body.setAllowGravity(true)
    this.body.setVelocity(0, 0)
    this.jetting = false
    this.ducking = false
    this.sliding = false
    this.slideRemaining = 0
    this.setBodyHeight(PLAYER.height)
    this.energy = PLAYER.maxEnergy
    this.invulnerable = TUNING.respawnGraceMs
    this.previousJet = false
    this.previousDuck = false
    this.wasGrounded = true
  }

  teleport(x: number, y: number): void {
    this.body.reset(x, y)
    this.body.setVelocity(0, 0)
    this.jetting = false
    this.body.setAllowGravity(true)
  }

  get gravityScale(): number {
    return this.gravityMultiplier
  }

  get feetY(): number {
    return this.body.bottom
  }

  destroy(): void {
    this.hitbox.destroy()
  }
}
