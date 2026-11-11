import Phaser from 'phaser'
import { COLORS, CSS, DISPLAY_FONT, FONT, GAME_WIDTH } from '../config'
import type { GameplaySettings } from '../types'

export interface ButtonOptions {
  x: number
  y: number
  width: number
  height: number
  label: string
  sublabel?: string
  glyph?: string
  color?: number
  textColor?: string
  fill?: number
  fillAlpha?: number
  onClick: () => void
  disabled?: boolean
  align?: 'center' | 'left'
  small?: boolean
}

export class UiButton {
  readonly container: Phaser.GameObjects.Container
  private readonly background: Phaser.GameObjects.Graphics
  private readonly labelText: Phaser.GameObjects.Text
  private readonly subText?: Phaser.GameObjects.Text
  private readonly glyphText?: Phaser.GameObjects.Text
  private readonly hit: Phaser.GameObjects.Rectangle
  private readonly options: ButtonOptions
  private hovered = false
  private pressed = false

  constructor(scene: Phaser.Scene, options: ButtonOptions) {
    this.options = options
    const width = options.width
    const height = options.height
    const color = options.color ?? COLORS.teal
    this.background = scene.add.graphics()
    this.labelText = scene.add
      .text(0, 0, options.label, {
        fontFamily: DISPLAY_FONT,
        fontSize: options.small ? '15px' : '17px',
        fontStyle: 'bold',
        color: options.textColor ?? CSS.cream,
      })
      .setOrigin(options.align === 'left' ? 0 : 0.5, 0.5)
    const children: Phaser.GameObjects.GameObject[] = [this.background, this.labelText]
    if (options.sublabel) {
      this.subText = scene.add
        .text(0, 0, options.sublabel, {
          fontFamily: FONT,
          fontSize: options.small ? '10px' : '11px',
          color: 'rgba(255,244,220,0.64)',
          wordWrap: { width: width - 54 },
        })
        .setOrigin(options.align === 'left' ? 0 : 0.5, 0.5)
      children.push(this.subText)
    }
    if (options.glyph) {
      this.glyphText = scene.add
        .text(0, 0, options.glyph, {
          fontFamily: DISPLAY_FONT,
          fontSize: options.small ? '19px' : '23px',
          fontStyle: 'bold',
          color: CSS.white,
        })
        .setOrigin(0.5)
      children.push(this.glyphText)
    }
    this.hit = scene.add
      .rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
    children.push(this.hit)
    this.container = scene.add.container(options.x, options.y, children)
    this.container.setSize(width, height)
    this.paint(color)
    this.layout()
    this.hit.on('pointerover', () => {
      this.hovered = true
      this.paint(color)
    })
    this.hit.on('pointerout', () => {
      this.hovered = false
      this.pressed = false
      this.paint(color)
    })
    this.hit.on('pointerdown', () => {
      if (options.disabled) return
      this.pressed = true
      this.paint(color)
      this.hit.setScale(0.985)
      options.onClick()
    })
    this.hit.on('pointerup', () => {
      this.pressed = false
      this.hit.setScale(1)
      this.paint(color)
    })
    if (options.disabled) this.container.setAlpha(0.43)
  }

  private paint(color: number): void {
    const { width, height, fill, fillAlpha, align, small } = this.options
    const g = this.background
    const x = -width / 2
    const y = -height / 2
    g.clear()
    if (fill !== undefined) {
      g.fillStyle(fill, fillAlpha ?? 0.92)
    } else {
      g.fillGradientStyle(color, color, 0x1d153b, 0x1d153b, this.pressed ? 0.36 : this.hovered ? 0.28 : 0.18, this.pressed ? 0.36 : this.hovered ? 0.28 : 0.18, 0.82, 0.82)
    }
    g.fillRoundedRect(x, y, width, height, small ? 11 : 14)
    g.lineStyle(1.5, color, this.hovered ? 0.9 : 0.55)
    g.strokeRoundedRect(x, y, width, height, small ? 11 : 14)
    g.lineStyle(1, 0xffffff, 0.12)
    g.beginPath()
    g.moveTo(x + 12, y + 8)
    g.lineTo(x + width - 12, y + 8)
    g.strokePath()
    if (align === 'left') {
      this.labelText.setPosition(-width / 2 + (this.glyphText ? 54 : 16), this.subText ? -8 : 0)
      this.subText?.setPosition(-width / 2 + (this.glyphText ? 54 : 16), 13)
      this.glyphText?.setPosition(-width / 2 + 28, 0)
    } else {
      this.labelText.setPosition(0, this.subText ? -7 : 0)
      this.subText?.setPosition(0, 16)
      this.glyphText?.setPosition(-width / 2 + 27, 0)
    }
  }

  private layout(): void {
    const { width, height, glyph, align } = this.options
    if (glyph && align === 'center') {
      this.labelText.setX(0)
    }
    this.labelText.setWordWrapWidth(width - (glyph ? 64 : 28))
    this.hit.setPosition(0, 0)
    this.hit.setSize(width, height)
    this.container.setSize(width, height)
    this.container.setDepth(this.container.depth)
  }

  setLabel(label: string): void {
    this.labelText.setText(label)
  }

  setEnabled(enabled: boolean): void {
    this.hit.input!.enabled = enabled
    this.container.setAlpha(enabled ? 1 : 0.43)
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth)
    return this
  }
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number = COLORS.teal,
  alpha = 0.9,
  depth = 10,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth)
  g.fillStyle(0x0d0920, alpha)
  g.fillRoundedRect(x, y, width, height, 18)
  g.fillGradientStyle(color, color, 0x1d153b, 0x1d153b, 0.07, 0.07, 0.22, 0.22)
  g.fillRoundedRect(x, y, width, height, 18)
  g.lineStyle(1.5, color, 0.44)
  g.strokeRoundedRect(x, y, width, height, 18)
  g.lineStyle(1, 0xffffff, 0.08)
  g.beginPath()
  g.moveTo(x + 18, y + 11)
  g.lineTo(x + width - 18, y + 11)
  g.strokePath()
  return g
}

export function pageTitle(
  scene: Phaser.Scene,
  eyebrow: string,
  title: string,
  subtitle?: string,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0).setDepth(20)
  const eyebrowText = scene.add
    .text(GAME_WIDTH / 2, 44, eyebrow.toUpperCase(), {
      fontFamily: FONT,
      fontSize: '10px',
      fontStyle: 'bold',
      color: CSS.teal,
      letterSpacing: 4,
    })
    .setOrigin(0.5)
  const titleText = scene.add
    .text(GAME_WIDTH / 2, 62, title, {
      fontFamily: DISPLAY_FONT,
      fontSize: '31px',
      fontStyle: 'bold',
      color: CSS.cream,
    })
    .setOrigin(0.5)
  container.add([eyebrowText, titleText])
  if (subtitle) {
    container.add(
      scene.add
        .text(GAME_WIDTH / 2, 99, subtitle, {
          fontFamily: FONT,
          fontSize: '11px',
          color: 'rgba(255,244,220,0.62)',
          align: 'center',
          wordWrap: { width: 430 },
        })
        .setOrigin(0.5, 0),
    )
  }
  return container
}

export function addStars(
  scene: Phaser.Scene,
  x: number,
  y: number,
  stars: number,
  size = 20,
  gap = 23,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y)
  for (let index = 0; index < 3; index += 1) {
    const image = scene.add
      .image((index - 1) * gap, 0, index < stars ? 'star-full' : 'star-empty')
      .setDisplaySize(size, size)
    container.add(image)
  }
  return container
}

export function backButton(scene: Phaser.Scene, onClick: () => void, y = 910): UiButton {
  return new UiButton(scene, {
    x: 98, y, width: 88, height: 38, label: 'BACK', small: true, glyph: '‹',
    color: COLORS.muted, onClick, align: 'center',
  })
}

export function iconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  glyph: string,
  onClick: () => void,
  label = '',
): Phaser.GameObjects.Container {
  const g = scene.add.graphics()
  g.fillStyle(0x0e0a20, 0.8)
  g.fillCircle(0, 0, 20)
  g.lineStyle(1.5, COLORS.teal, 0.4)
  g.strokeCircle(0, 0, 20)
  const text = scene.add
    .text(0, 0, glyph, { fontFamily: DISPLAY_FONT, fontSize: '18px', color: CSS.cream })
    .setOrigin(0.5)
  const hit = scene.add.circle(0, 0, 25, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
  hit.on('pointerdown', onClick)
  const container = scene.add.container(x, y, [g, text, hit])
  container.setSize(50, 50)
  if (label) container.setName(label)
  return container
}

export function starsLabel(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`
}

export function formatMs(ms: number): string {
  if (!ms) return '—'
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${seconds}s`
}

export function formatScore(score: number): string {
  return score.toLocaleString('en-GB')
}

export function clampUiSettings(settings: GameplaySettings): GameplaySettings {
  return {
    ...settings,
    touchScale: Phaser.Math.Clamp(settings.touchScale, 0.7, 1.45),
    touchOpacity: Phaser.Math.Clamp(settings.touchOpacity, 0.15, 1),
  }
}
