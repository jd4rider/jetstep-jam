import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave, saveSettings } from '../core/save'
import type { GameplaySettings } from '../types'
import { CSS, GAME_WIDTH } from '../config'
import { Backdrop } from '../world/Backdrop'
import { backButton, pageTitle, UiButton } from '../ui/common'

export class SettingsScene extends Phaser.Scene {
  private settings!: GameplaySettings
  private refreshers: Array<() => void> = []

  constructor() {
    super('Settings')
  }

  create(): void {
    const save = loadSave()
    this.settings = { ...save.settings }
    new Backdrop(this, 2, this.settings.reducedMotion)
    pageTitle(this, 'MAKE IT YOURS', 'SETTINGS', 'Audio, touch controls and comfort. Changes save instantly.')
    backButton(this, () => {
      audio.setSettings(this.settings)
      audio.sfx('back')
      this.scene.start('Menu')
    }, 910)

    this.section('AUDIO', 136)
    this.volumeRow('MASTER', 166, 'masterVolume')
    this.volumeRow('MUSIC', 208, 'musicVolume')
    this.volumeRow('SOUND FX', 250, 'sfxVolume')
    this.volumeRow('AMBIENCE', 292, 'ambienceVolume')

    this.section('TOUCH', 344)
    this.touchRow('BUTTON SIZE', 374, 'touchScale', 0.1, 0.7, 1.45)
    this.touchRow('BUTTON OPACITY', 416, 'touchOpacity', 0.1, 0.15, 1)

    this.section('ACCESS & FEEL', 468)
    this.toggle('MUTE', 496, 130, 'muted')
    this.toggle('REDUCED MOTION', 496, 360, 'reducedMotion')
    this.toggle('REDUCED FLASH', 542, 130, 'reducedFlash')
    this.toggle('HIGH CONTRAST', 542, 360, 'highContrast')
    this.toggle('LARGE UI TEXT', 588, 130, 'largeUi')
    this.toggle('LEFT-HANDED', 588, 360, 'leftHanded')
    this.toggle('HAPTICS', 634, 130, 'haptics')

    this.add.text(36, 690, 'KEYBOARD  A/D or arrows · Space/↑ jump + jet · S/↓ duck · E interact · Esc pause · R restart', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', color: 'rgba(255,244,220,0.56)',
      wordWrap: { width: 468 }, lineSpacing: 5,
    })
    this.add.text(36, 728, 'TOUCH  Left/right on the left · JET and DUCK on the right. Tap JET to jump; hold to fly.', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', color: 'rgba(255,244,220,0.56)',
      wordWrap: { width: 468 }, lineSpacing: 5,
    })
    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 800, width: 300, height: 40, label: 'RESET SETTINGS', small: true,
      color: 0xff7ec4, onClick: () => this.resetDefaults(),
    })
    this.refreshAll()
  }

  private section(label: string, y: number): void {
    this.add.text(32, y, label, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold',
      color: CSS.teal, letterSpacing: 3,
    })
    const line = this.add.graphics()
    line.lineStyle(1, 0x5cf2d6, 0.18)
    line.beginPath()
    line.moveTo(32, y + 17)
    line.lineTo(GAME_WIDTH - 32, y + 17)
    line.strokePath()
  }

  private volumeRow(label: string, y: number, key: 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'ambienceVolume'): void {
    this.add.text(38, y + 11, label, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', fontStyle: 'bold', color: CSS.cream,
    })
    const value = this.add.text(300, y + 11, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: CSS.muted,
    })
    new UiButton(this, {
      x: 390, y: y + 14, width: 36, height: 30, label: '−', small: true, color: 0x5cf2d6,
      onClick: () => this.changeNumber(key, -0.1, 0, 1),
    })
    new UiButton(this, {
      x: 436, y: y + 14, width: 36, height: 30, label: '+', small: true, color: 0x5cf2d6,
      onClick: () => this.changeNumber(key, 0.1, 0, 1),
    })
    this.refreshers.push(() => value.setText(`${Math.round(this.settings[key] * 100)}%`))
  }

  private touchRow(label: string, y: number, key: 'touchScale' | 'touchOpacity', step: number, min: number, max: number): void {
    this.add.text(38, y + 11, label, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', fontStyle: 'bold', color: CSS.cream,
    })
    const value = this.add.text(300, y + 11, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: CSS.muted,
    })
    new UiButton(this, {
      x: 390, y: y + 14, width: 36, height: 30, label: '−', small: true, color: 0xb79cff,
      onClick: () => this.changeNumber(key, -step, min, max),
    })
    new UiButton(this, {
      x: 436, y: y + 14, width: 36, height: 30, label: '+', small: true, color: 0xb79cff,
      onClick: () => this.changeNumber(key, step, min, max),
    })
    this.refreshers.push(() => value.setText(key === 'touchScale' ? `${Math.round(this.settings[key] * 100)}%` : `${Math.round(this.settings[key] * 100)}%`))
  }

  private toggle(label: string, y: number, x: number, key: 'muted' | 'reducedMotion' | 'reducedFlash' | 'highContrast' | 'largeUi' | 'leftHanded' | 'haptics'): void {
    const button = new UiButton(this, {
      x: x + 90, y, width: 190, height: 36, label, small: true, color: 0x9beeff, align: 'left',
      onClick: () => {
        this.settings[key] = !this.settings[key]
        this.persist()
      },
    })
    this.refreshers.push(() => {
      button.setLabel(`${this.settings[key] ? '●' : '○'}  ${label}`)
      button.container.setAlpha(this.settings[key] ? 1 : 0.7)
    })
  }

  private changeNumber<K extends 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'ambienceVolume' | 'touchScale' | 'touchOpacity'>(key: K, delta: number, min: number, max: number): void {
    this.settings[key] = Phaser.Math.Clamp(Math.round((this.settings[key] + delta) * 10) / 10, min, max)
    this.persist()
  }

  private persist(): void {
    saveSettings(this.settings)
    audio.setSettings(this.settings)
    audio.sfx('click')
    this.refreshAll()
  }

  private refreshAll(): void {
    this.refreshers.forEach((refresh) => refresh())
  }

  private resetDefaults(): void {
    this.settings = {
      masterVolume: 0.85, musicVolume: 0.55, sfxVolume: 0.8, ambienceVolume: 0.4,
      muted: false, reducedMotion: false, reducedFlash: false, highContrast: false,
      largeUi: false, touchScale: 1, touchOpacity: 0.65, leftHanded: false, haptics: true,
    }
    this.persist()
  }
}
