import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { worldAt } from '../data/worlds'
import { ensureBackground } from './textures'

export class Backdrop {
  private readonly scene: Phaser.Scene
  private readonly sky: Phaser.GameObjects.Image
  private readonly deco: Phaser.GameObjects.Image[] = []
  private readonly vignette: Phaser.GameObjects.Graphics
  private readonly flash: Phaser.GameObjects.Rectangle
  private readonly reducedMotion: boolean

  constructor(scene: Phaser.Scene, worldIndex: number, reducedMotion: boolean) {
    this.scene = scene
    this.reducedMotion = reducedMotion
    ensureBackground(scene, worldIndex)
    const world = worldAt(worldIndex)
    this.sky = scene.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `backdrop-${worldIndex}`)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(-30)
    for (let index = 0; index < 7; index += 1) {
      const key = index % 2 === 0 ? 'spark-optional' : 'spark-3'
      const image = scene.add
        .image(50 + ((index * 97) % 460), 80 + ((index * 137) % 760), key)
        .setScale(0.16 + (index % 3) * 0.06)
        .setAlpha(0.16)
        .setScrollFactor(0.08 + (index % 3) * 0.04)
        .setDepth(-29)
        .setTint(Phaser.Display.Color.HexStringToColor(world.palette.accent).color)
      this.deco.push(image)
      if (!reducedMotion) {
        scene.tweens.add({
          targets: image,
          y: image.y - 18 - (index % 4) * 8,
          duration: 2600 + index * 430,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: index * 170,
        })
      }
    }
    this.vignette = scene.add.graphics().setScrollFactor(0).setDepth(80)
    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.06, 0.06, 0.34, 0.34)
    this.vignette.fillRect(0, 0, GAME_WIDTH, 180)
    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.35, 0.35, 0.06, 0.06)
    this.vignette.fillRect(0, GAME_HEIGHT - 220, GAME_WIDTH, 220)
    this.flash = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
      .setScrollFactor(0)
      .setDepth(4000)
  }

  pulse(color = 0xffffff, alpha = 0.16): void {
    if (this.reducedMotion) return
    this.flash.setFillStyle(color, alpha)
    this.scene.tweens.killTweensOf(this.flash)
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 260, ease: 'Quad.easeOut' })
  }

  destroy(): void {
    this.sky.destroy()
    this.deco.forEach((image) => image.destroy())
    this.vignette.destroy()
    this.flash.destroy()
  }
}
