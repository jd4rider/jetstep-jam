import Phaser from 'phaser'
import { COLORS, CSS, DISPLAY_FONT, FONT, GAME_WIDTH } from '../config'
import type { PowerUpDefinition } from '../types'
import { iconButton } from './common'

export interface HudState {
  levelName: string
  worldName: string
  health: number
  maxHealth: number
  energy: number
  sparks: number
  required: number
  optional: number
  score: number
  combo: number
  power: PowerUpDefinition | null
  objective: string
  exitReady: boolean
}

export class Hud {
  private readonly scene: Phaser.Scene
  private readonly container: Phaser.GameObjects.Container
  private readonly hearts: Phaser.GameObjects.Graphics
  private readonly energyBar: Phaser.GameObjects.Graphics
  private readonly energyLabel: Phaser.GameObjects.Text
  private readonly sparkText: Phaser.GameObjects.Text
  private readonly scoreText: Phaser.GameObjects.Text
  private readonly levelText: Phaser.GameObjects.Text
  private readonly worldText: Phaser.GameObjects.Text
  private readonly objectiveText: Phaser.GameObjects.Text
  private readonly comboText: Phaser.GameObjects.Text
  private readonly powerText: Phaser.GameObjects.Text
  private readonly toastText: Phaser.GameObjects.Text
  private readonly pause: Phaser.GameObjects.Container
  private state: HudState | null = null
  private pulseTime = 0
  private lastEnergy = 1
  private readonly reducedFlash: boolean

  constructor(scene: Phaser.Scene, onPause: () => void, reducedFlash: boolean) {
    this.scene = scene
    this.reducedFlash = reducedFlash
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000)
    const background = scene.add.graphics()
    background.fillGradientStyle(0x0d0920, 0x0d0920, 0x1d1235, 0x1d1235, 0.95, 0.95, 0.78, 0.78)
    background.fillRect(0, 0, GAME_WIDTH, 124)
    background.lineStyle(1, COLORS.teal, 0.34)
    background.beginPath()
    background.moveTo(0, 123.5)
    background.lineTo(GAME_WIDTH, 123.5)
    background.strokePath()
    this.worldText = scene.add.text(64, 12, '', {
      fontFamily: FONT, fontSize: '9px', fontStyle: 'bold', color: CSS.teal, letterSpacing: 2,
    })
    this.levelText = scene.add.text(64, 26, '', {
      fontFamily: DISPLAY_FONT, fontSize: '17px', fontStyle: 'bold', color: CSS.cream,
    })
    this.hearts = scene.add.graphics()
    this.energyBar = scene.add.graphics()
    this.energyLabel = scene.add.text(64, 75, '', {
      fontFamily: FONT, fontSize: '8px', fontStyle: 'bold', color: 'rgba(255,244,220,0.72)',
    })
    this.sparkText = scene.add.text(350, 52, '', {
      fontFamily: DISPLAY_FONT, fontSize: '14px', fontStyle: 'bold', color: CSS.cream,
    })
    this.scoreText = scene.add.text(GAME_WIDTH - 64, 17, '', {
      fontFamily: DISPLAY_FONT, fontSize: '16px', fontStyle: 'bold', color: CSS.gold,
    }).setOrigin(1, 0)
    this.objectiveText = scene.add.text(GAME_WIDTH / 2, 132, '', {
      fontFamily: FONT, fontSize: '10px', fontStyle: 'bold', color: 'rgba(255,244,220,0.8)',
      backgroundColor: 'rgba(10,7,22,0.68)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0)
    this.comboText = scene.add.text(GAME_WIDTH / 2, 164, '', {
      fontFamily: DISPLAY_FONT, fontSize: '21px', fontStyle: 'bold', color: CSS.gold,
    }).setOrigin(0.5)
    this.powerText = scene.add.text(64, 96, '', {
      fontFamily: FONT, fontSize: '9px', fontStyle: 'bold', color: CSS.violet,
      wordWrap: { width: 260 },
    })
    this.toastText = scene.add.text(GAME_WIDTH / 2, 226, '', {
      fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: CSS.cream,
      backgroundColor: 'rgba(10,7,22,0.82)', padding: { x: 14, y: 7 }, align: 'center',
      wordWrap: { width: 360 },
    }).setOrigin(0.5).setAlpha(0)
    this.pause = iconButton(scene, GAME_WIDTH - 88, 87, 'Ⅱ', onPause, 'Pause')
    this.container.add([
      background, this.worldText, this.levelText, this.hearts, this.energyBar,
      this.energyLabel, this.sparkText, this.scoreText, this.objectiveText,
      this.comboText, this.powerText, this.toastText, this.pause,
    ])
  }

  update(state: HudState, deltaMs: number): void {
    this.state = state
    this.pulseTime += deltaMs
    this.worldText.setText(state.worldName.toUpperCase())
    this.levelText.setText(state.levelName)
    this.sparkText.setText(`${state.sparks}/${state.required} ✦`)
    this.scoreText.setText(String(state.score).padStart(5, '0'))
    this.objectiveText.setText(state.exitReady ? 'EXIT OPEN · FIND THE PORTAL' : state.objective)
    this.objectiveText.setColor(state.exitReady ? CSS.mint : 'rgba(255,244,220,0.8)')
    this.comboText.setText(state.combo >= 2 ? `${state.combo}× COMBO` : '')
    this.comboText.setAlpha(state.combo >= 2 ? 0.92 : 0)
    if (state.power) {
      const duration = state.power.durationMs > 0 ? ' · ACTIVE' : ' · ADDED'
      this.powerText.setText(`${state.power.glyph} ${state.power.name.toUpperCase()}${duration}`)
      this.powerText.setColor(`#${state.power.color.toString(16).padStart(6, '0')}`)
    } else {
      this.powerText.setText('')
    }
    this.drawHearts(state.health, state.maxHealth)
    this.drawEnergy(state.energy)
    if (state.energy < this.lastEnergy && state.energy < 24 && !this.reducedFlash) {
      this.energyBar.setAlpha(this.pulseTime % 360 < 180 ? 1 : 0.6)
    } else {
      this.energyBar.setAlpha(1)
    }
    this.lastEnergy = state.energy
  }

  private drawHearts(health: number, max: number): void {
    const g = this.hearts
    g.clear()
    const total = Math.max(3, max)
    for (let index = 0; index < total; index += 1) {
      const x = 70 + index * 22
      const y = 55
      const filled = index < health
      g.fillStyle(filled ? COLORS.coral : 0x3b2948, filled ? 1 : 0.7)
      g.beginPath()
      g.moveTo(x, y + 6)
      g.lineTo(x - 8, y - 1)
      g.lineTo(x - 6, y - 8)
      g.lineTo(x, y - 4)
      g.lineTo(x + 6, y - 8)
      g.lineTo(x + 8, y - 1)
      g.closePath()
      g.fillPath()
      if (filled) {
        g.fillStyle(0xffffff, 0.42)
        g.fillCircle(x - 3, y - 3, 1.8)
      }
    }
  }

  private drawEnergy(energy: number): void {
    const g = this.energyBar
    g.clear()
    const ratio = Phaser.Math.Clamp(energy / 100, 0, 1)
    g.fillStyle(0x080611, 0.88)
    g.fillRoundedRect(170, 52, 172, 13, 6)
    g.lineStyle(1, 0xffffff, 0.12)
    g.strokeRoundedRect(170, 52, 172, 13, 6)
    const color = ratio < 0.24 ? COLORS.coral : ratio < 0.5 ? COLORS.gold : COLORS.teal
    g.fillGradientStyle(color, color, 0x9bffda, 0x9bffda, 1, 1, 1, 1)
    if (ratio > 0) g.fillRoundedRect(172, 54, 168 * ratio, 9, 4)
    g.fillStyle(0xffffff, 0.34)
    g.fillRect(174, 55, Math.max(0, 164 * ratio), 1)
    this.energyLabel.setText(`JET  ${Math.ceil(energy)}%`)
  }

  toast(message: string, color = 0xffffff): void {
    this.toastText.setText(message)
    this.toastText.setColor(`#${color.toString(16).padStart(6, '0')}`)
    this.scene.tweens.killTweensOf(this.toastText)
    this.toastText.setAlpha(1).setY(226)
    this.scene.tweens.add({
      targets: this.toastText,
      alpha: 0,
      y: 210,
      delay: 900,
      duration: 480,
      ease: 'Quad.easeIn',
    })
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible)
  }

  get current(): HudState | null {
    return this.state
  }

  setPauseEnabled(enabled: boolean): void {
    this.pause.setAlpha(enabled ? 1 : 0.3)
    this.pause.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Arc) {
        const hit = child as Phaser.GameObjects.Arc
        if (hit.input) hit.input.enabled = enabled
      }
    })
  }

  destroy(): void {
    this.container.destroy(true)
  }
}
