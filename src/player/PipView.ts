import Phaser from 'phaser'
import { BOOT_BY_ID, OUTFIT_BY_ID } from '../data/cosmetics'
import type { CosmeticState } from '../types'

export interface PipViewState {
  x: number
  y: number
  velocityX: number
  velocityY: number
  onGround: boolean
  jetting: boolean
  ducking: boolean
  sliding: boolean
  facing: -1 | 1
  invulnerable: boolean
  shield: boolean
  energyRatio: number
  reducedMotion: boolean
}

export class PipView {
  readonly container: Phaser.GameObjects.Container
  private readonly parts: {
    pack: Phaser.GameObjects.Image
    jacket: Phaser.GameObjects.Image
    head: Phaser.GameObjects.Image
    visor: Phaser.GameObjects.Image
    armBack: Phaser.GameObjects.Image
    armFront: Phaser.GameObjects.Image
    legBack: Phaser.GameObjects.Image
    legFront: Phaser.GameObjects.Image
    bootBack: Phaser.GameObjects.Image
    bootFront: Phaser.GameObjects.Image
    flameBack: Phaser.GameObjects.Image
    flameFront: Phaser.GameObjects.Image
    handBack: Phaser.GameObjects.Image
    handFront: Phaser.GameObjects.Image
  }
  private readonly bubble: Phaser.GameObjects.Image
  private readonly shadow: Phaser.GameObjects.Ellipse
  private time = 0
  private runPhase = 0
  private cosmetics: CosmeticState

  constructor(scene: Phaser.Scene, cosmetics: CosmeticState, depth: number) {
    this.cosmetics = cosmetics
    this.shadow = scene.add.ellipse(0, 0, 54, 13, 0x090510, 0.34).setDepth(depth - 1)
    const make = (key: string, x: number, y: number, scale = 0.5): Phaser.GameObjects.Image =>
      scene.add.image(x, y, key).setScale(scale).setBlendMode(Phaser.BlendModes.NORMAL)
    this.parts = {
      pack: make('pip-pack', -19, -1, 0.48),
      jacket: make('pip-jacket', 0, 1, 0.48),
      head: make('pip-head', 5, -31, 0.46),
      visor: make('pip-visor', 10, -34, 0.45),
      armBack: make('pip-arm', -17, -2, 0.42),
      armFront: make('pip-arm', 18, 0, 0.42),
      legBack: make('pip-leg', -8, 19, 0.38),
      legFront: make('pip-leg', 9, 19, 0.38),
      bootBack: make('pip-boot', -13, 35, 0.43),
      bootFront: make('pip-boot', 14, 35, 0.43),
      flameBack: make('pip-flame', -13, 51, 0.5).setBlendMode(Phaser.BlendModes.ADD),
      flameFront: make('pip-flame', 14, 51, 0.5).setBlendMode(Phaser.BlendModes.ADD),
      handBack: make('pip-hand', -20, 9, 0.45),
      handFront: make('pip-hand', 21, 10, 0.45),
    }
    this.bubble = scene.add.image(0, -15, 'pip-bubble').setScale(0.68).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD)
    this.container = scene.add.container(0, 0, [
      this.parts.pack,
      this.parts.armBack,
      this.parts.legBack,
      this.parts.bootBack,
      this.parts.flameBack,
      this.parts.jacket,
      this.parts.head,
      this.parts.visor,
      this.parts.armFront,
      this.parts.legFront,
      this.parts.bootFront,
      this.parts.flameFront,
      this.parts.handBack,
      this.parts.handFront,
      this.bubble,
    ])
    this.container.setDepth(depth)
    this.applyCosmetics(cosmetics)
    this.shadow.setDepth(depth - 2)
  }

  applyCosmetics(cosmetics: CosmeticState): void {
    this.cosmetics = cosmetics
    const outfit = OUTFIT_BY_ID.get(cosmetics.outfit) ?? OUTFIT_BY_ID.get('classic')
    const boots = BOOT_BY_ID.get(cosmetics.boots) ?? BOOT_BY_ID.get('chrome')
    if (!outfit || !boots) return
    this.parts.jacket.setTint(outfit.jacket)
    this.parts.head.setTint(0xffd9b0)
    this.parts.visor.setTint(outfit.visor)
    this.parts.pack.setTint(outfit.pack)
    this.parts.armBack.setTint(outfit.jacket)
    this.parts.armFront.setTint(outfit.jacket)
    this.parts.handBack.setTint(outfit.jacket)
    this.parts.handFront.setTint(outfit.jacket)
    this.parts.legBack.setTint(outfit.trousers)
    this.parts.legFront.setTint(outfit.trousers)
    this.parts.bootBack.setTint(boots.boots)
    this.parts.bootFront.setTint(boots.boots)
    this.parts.flameBack.setTint(boots.exhaust)
    this.parts.flameFront.setTint(boots.exhaust)
  }

  update(state: PipViewState, deltaMs: number): void {
    this.time += deltaMs
    this.container.setPosition(state.x, state.y - 4)
    this.shadow.setPosition(state.x, state.y + 38)
    this.container.setScale(state.facing, 1)
    const speed = Math.abs(state.velocityX)
    const moving = speed > 10

    this.runPhase += deltaMs * (moving ? 0.012 + speed * 0.00006 : 0.004)
    const cycle = Math.sin(this.runPhase)
    const bob = state.onGround && !state.ducking ? Math.sin(this.runPhase * 2) * 1.5 : 0
    const idle = state.onGround && !state.ducking ? Math.sin(this.time * 0.0024) * 1.2 : 0
    let duckScale = 1
    let lean = 0
    if (state.sliding) {
      duckScale = 0.58
      lean = -0.22 * state.facing
    } else if (state.ducking) {
      duckScale = 0.7
    }
    this.parts.jacket.setRotation(lean)
    this.parts.head.setRotation(lean * 0.55)
    this.parts.visor.setRotation(lean * 0.55)
    this.parts.pack.setRotation(lean * 0.4)
    this.container.setScale(state.facing, duckScale)
    this.parts.jacket.y = 1 + bob + idle
    this.parts.head.y = -31 + bob * 0.7 + idle
    this.parts.visor.y = -34 + bob * 0.7 + idle
    this.parts.pack.y = -1 + bob + idle
    this.parts.armBack.y = -2 + bob
    this.parts.armFront.y = bob
    this.parts.handBack.y = 9 + bob
    this.parts.handFront.y = 10 + bob

    if (state.onGround) {
      this.parts.armBack.setRotation(cycle * 0.32)
      this.parts.armFront.setRotation(-cycle * 0.32)
      this.parts.legBack.setRotation(cycle * 0.28)
      this.parts.legFront.setRotation(-cycle * 0.28)
      this.parts.bootBack.y = 35 + Math.max(0, cycle) * 3
      this.parts.bootFront.y = 35 + Math.max(0, -cycle) * 3
    } else {
      const lift = state.jetting ? 5 : 0
      this.parts.armBack.setRotation(-0.5)
      this.parts.armFront.setRotation(0.5)
      this.parts.legBack.setRotation(0.16)
      this.parts.legFront.setRotation(-0.12)
      this.parts.bootBack.y = 35 + lift
      this.parts.bootFront.y = 35 + lift
    }
    this.parts.flameBack.y = this.parts.bootBack.y + 17
    this.parts.flameFront.y = this.parts.bootFront.y + 17
    const flicker = 0.8 + Math.sin(this.time * 0.045) * 0.14 + Math.random() * 0.08
    const flameScale = state.jetting ? (0.55 + (1 - state.energyRatio) * 0.28) * flicker : 0
    this.parts.flameBack.setVisible(state.jetting)
    this.parts.flameFront.setVisible(state.jetting)
    this.parts.flameBack.setScale(0.42, flameScale * 0.6)
    this.parts.flameFront.setScale(0.42, flameScale * 0.6)
    this.parts.flameBack.setAlpha(state.jetting ? 0.82 : 0)
    this.parts.flameFront.setAlpha(state.jetting ? 0.82 : 0)
    if (!state.jetting) {
      this.parts.bootBack.setTint(this.parts.bootFront.tintTopLeft)
    }

    this.bubble.setAlpha(state.shield ? 0.75 + Math.sin(this.time * 0.006) * 0.12 : 0)
    if (state.invulnerable) {
      this.container.setAlpha(Math.sin(this.time * 0.024) > 0 ? 0.32 : 1)
    } else {
      this.container.setAlpha(1)
    }
    if (state.jetting && !state.reducedMotion) {
      this.parts.flameBack.setAngle(-4 + Math.sin(this.time * 0.02) * 4)
      this.parts.flameFront.setAngle(4 - Math.sin(this.time * 0.02) * 4)
    } else {
      this.parts.flameBack.setAngle(0)
      this.parts.flameFront.setAngle(0)
    }
    this.shadow.setVisible(state.onGround)
    this.shadow.setDepth(this.container.depth - 2)
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth)
    this.shadow.setDepth(depth - 2)
  }

  destroy(): void {
    this.container.destroy(true)
    this.shadow.destroy()
  }
}
