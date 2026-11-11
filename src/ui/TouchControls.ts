import Phaser from 'phaser'
import { COLORS, CSS, DISPLAY_FONT, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { GameplaySettings, PlayerInput } from '../types'

type ButtonName = 'left' | 'right' | 'jet' | 'duck'

interface TouchButton {
  name: ButtonName
  glyph: string
  label: string
  x: number
  y: number
  radius: number
  color: number
  pointerId: number | null
  graphics: Phaser.GameObjects.Graphics
  glyphText: Phaser.GameObjects.Text
  labelText: Phaser.GameObjects.Text
  pressed: boolean
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  const forced = new URLSearchParams(window.location.search).get('touch') === '1'
  return forced || window.navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760
}

export class TouchControls {
  private readonly scene: Phaser.Scene
  private settings: GameplaySettings
  private readonly container: Phaser.GameObjects.Container
  private readonly buttons: TouchButton[] = []
  private visible = false
  private enabled = true
  private readonly down = new Set<ButtonName>()
  private lastTouch = 0
  private readonly canvas: HTMLCanvasElement

  constructor(scene: Phaser.Scene, settings: GameplaySettings) {
    this.scene = scene
    this.settings = settings
    this.canvas = scene.game.canvas
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(1200).setVisible(false)
    const defs: Array<{ name: ButtonName; glyph: string; label: string; color: number }> = [
      { name: 'left', glyph: '‹', label: 'LEFT', color: COLORS.teal },
      { name: 'right', glyph: '›', label: 'RIGHT', color: COLORS.teal },
      { name: 'duck', glyph: '↓', label: 'DUCK', color: COLORS.gold },
      { name: 'jet', glyph: '▲', label: 'JET', color: COLORS.pink },
    ]
    defs.forEach((def) => {
      const graphics = scene.add.graphics()
      const glyphText = scene.add
        .text(0, 0, def.glyph, { fontFamily: DISPLAY_FONT, fontSize: '31px', fontStyle: 'bold', color: CSS.cream })
        .setOrigin(0.5)
      const labelText = scene.add
        .text(0, 0, def.label, { fontFamily: FONT, fontSize: '9px', fontStyle: 'bold', color: CSS.cream })
        .setOrigin(0.5)
      this.container.add([graphics, glyphText, labelText])
      this.buttons.push({
        ...def, x: 0, y: 0, radius: 42, pointerId: null, graphics, glyphText, labelText, pressed: false,
      })
    })
    this.layout()
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  private layout(): void {
    const scale = this.settings.touchScale
    const leftHanded = this.settings.leftHanded
    const edge = 54
    const leftBase = leftHanded ? GAME_WIDTH - edge - 97 * scale : edge + 97 * scale
    const rightBase = leftHanded ? edge + 83 * scale : GAME_WIDTH - edge - 83 * scale
    const positions: Record<ButtonName, { x: number; y: number; radius: number }> = {
      left: { x: leftBase - 54 * scale, y: GAME_HEIGHT - 122, radius: 43 * scale },
      right: { x: leftBase + 54 * scale, y: GAME_HEIGHT - 122, radius: 43 * scale },
      duck: { x: rightBase - 38 * scale, y: GAME_HEIGHT - 78, radius: 34 * scale },
      jet: { x: rightBase + 30 * scale, y: GAME_HEIGHT - 146, radius: 53 * scale },
    }
    this.buttons.forEach((button) => {
      const position = positions[button.name]
      button.x = position.x
      button.y = position.y
      button.radius = position.radius
      button.glyphText.setPosition(position.x, position.y - 3)
      button.labelText.setPosition(position.x, position.y + position.radius * 0.55)
      this.paint(button)
    })
  }

  private paint(button: TouchButton): void {
    const g = button.graphics
    const alpha = this.settings.touchOpacity
    const r = button.radius
    g.clear()
    g.fillStyle(0x080611, 0.48 * alpha)
    g.fillCircle(button.x, button.y, r + 6)
    g.fillStyle(button.color, (button.pressed ? 0.64 : 0.26) * alpha)
    g.fillCircle(button.x, button.y, r)
    g.lineStyle(button.pressed ? 3 : 2, button.color, button.pressed ? 1 : 0.72)
    g.strokeCircle(button.x, button.y, r)
    g.lineStyle(1, 0xffffff, 0.16)
    g.strokeCircle(button.x, button.y, r - 7)
    button.glyphText.setAlpha(0.94)
    button.labelText.setAlpha(0.8)
  }

  private buttonAt(x: number, y: number): TouchButton | null {
    for (const button of this.buttons) {
      if (Phaser.Math.Distance.Between(x, y, button.x, button.y) <= button.radius + 8) return button
    }
    return null
  }

  private point(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * GAME_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * GAME_HEIGHT,
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.visible || !this.enabled) return
    const point = this.point(event)
    const button = this.buttonAt(point.x, point.y)
    if (!button) return
    event.preventDefault()
    button.pointerId = event.pointerId
    button.pressed = true
    this.down.add(button.name)
    this.lastTouch = this.scene.time.now
    this.paint(button)
    if (this.settings.haptics && 'vibrate' in navigator) navigator.vibrate(button.name === 'jet' ? 12 : 7)
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.visible) return
    const point = this.point(event)
    for (const button of this.buttons) {
      if (button.pointerId !== event.pointerId) continue
      if (Phaser.Math.Distance.Between(point.x, point.y, button.x, button.y) > button.radius + 20) {
        button.pointerId = null
        button.pressed = false
        this.down.delete(button.name)
        this.paint(button)
      }
    }
  }

  private onPointerUp = (event: PointerEvent): void => {
    for (const button of this.buttons) {
      if (button.pointerId !== event.pointerId) continue
      button.pointerId = null
      button.pressed = false
      this.down.delete(button.name)
      this.paint(button)
    }
  }

  readInto(input: PlayerInput): PlayerInput {
    if (!this.visible) return input
    input.left ||= this.down.has('left')
    input.right ||= this.down.has('right')
    input.jet ||= this.down.has('jet')
    input.duck ||= this.down.has('duck')
    return input
  }

  setVisible(visible: boolean): void {
    this.visible = visible && this.enabled
    this.container.setVisible(this.visible)
    if (!this.visible) this.clear()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.setVisible(false)
  }

  setSettings(settings: GameplaySettings): void {
    this.settings = settings
    this.layout()
    if (!settings.haptics) this.clear()
  }

  clear(): void {
    this.down.clear()
    this.buttons.forEach((button) => {
      button.pointerId = null
      button.pressed = false
      this.paint(button)
    })
  }

  get visibleNow(): boolean {
    return this.visible
  }

  get lastInteraction(): number {
    return this.lastTouch
  }

  destroy = (): void => {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    this.container.destroy(true)
  }
}
