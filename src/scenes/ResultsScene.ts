import Phaser from 'phaser'
import { audio } from '../core/audio'
import { ACHIEVEMENT_BY_ID } from '../data/achievements'
import { worldAt } from '../data/worlds'
import { getLevelMeta } from '../data/levels'
import type { ResultsData } from '../types'
import { CSS, GAME_WIDTH } from '../config'
import { Backdrop } from '../world/Backdrop'
import { formatMs, formatScore, panel, UiButton } from '../ui/common'

export class ResultsScene extends Phaser.Scene {
  private resultData!: ResultsData

  constructor() {
    super('Results')
  }

  init(data: ResultsData): void {
    this.resultData = data
  }

  create(): void {
    const world = worldAt(this.resultData.worldIndex)
    audio.setMood('results', world)
    new Backdrop(this, this.resultData.worldIndex, false)
    this.cameras.main.flash(180, 255, 255, 255, false)
    const success = this.resultData.success
    this.add.text(GAME_WIDTH / 2, 70, this.resultData.boss ? 'WORLD BOSS DEFEATED' : success ? 'MEASURE COMPLETE' : 'THE MACHINE WINS', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold',
      color: success ? '#5cf2d6' : '#ff6b7a', letterSpacing: 3,
    }).setOrigin(0.5)
    this.add.text(GAME_WIDTH / 2, 100, this.resultData.boss ? this.resultData.boss.name : this.resultData.levelName, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '29px', fontStyle: 'bold', color: '#fff4dc',
      align: 'center', wordWrap: { width: 470 }, stroke: '#140e2b', strokeThickness: 5,
    }).setOrigin(0.5)
    this.add.text(GAME_WIDTH / 2, 143, this.resultData.boss ? this.resultData.boss.title : world.name, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: 'rgba(255,244,220,0.6)',
    }).setOrigin(0.5)

    if (success) {
      const stars = this.resultData.result.stars
      for (let index = 0; index < 3; index += 1) {
        const earned = index < stars
        const star = this.add.image(GAME_WIDTH / 2 + (index - 1) * 66, 217, earned ? 'star-full' : 'star-empty')
          .setDisplaySize(52, 52).setDepth(20)
        if (earned) {
          star.setScale(0.1)
          this.tweens.add({
            targets: star, scaleX: 1.3, scaleY: 1.3, duration: 240 + index * 130, delay: 220 + index * 110,
            ease: 'Back.easeOut',
            onComplete: () => {
              audio.sfx('star')
              this.tweens.add({ targets: star, scaleX: 1, scaleY: 1, duration: 120 })
              this.burst(star.x, star.y, 0xffe066)
            },
          })
        }
      }
      audio.sfx('victory')
    } else {
      this.add.text(GAME_WIDTH / 2, 220, 'TRY A DIFFERENT ROUTE', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ff6b7a',
      }).setOrigin(0.5)
    }

    panel(this, 38, 285, GAME_WIDTH - 76, 258, success ? 0xffe066 : 0xff6b7a, 0.82, 10)
    this.statRow('SCORE', formatScore(this.resultData.result.score), 320)
    this.statRow('TIME', formatMs(this.resultData.result.timeMs), 354)
    this.statRow('SPARKS', `${this.resultData.result.sparks}`, 388)
    this.statRow('BEST COMBO', `${this.resultData.result.combo}×`, 422)
    this.statRow('ENERGY LEFT', `${Math.round(this.resultData.result.energy)}%`, 456)
    this.statRow('CLEAN RUN', this.resultData.result.noDamage ? 'YES' : 'NO', 490)
    if (this.resultData.mode === 'endless' || this.resultData.mode === 'classic') {
      this.add.text(GAME_WIDTH / 2, 522, this.resultData.mode === 'endless' ? 'ENDLESS DESCENT' : 'CLASSIC ARCADE', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '9px', fontStyle: 'bold',
        color: '#a99fc4', letterSpacing: 2,
      }).setOrigin(0.5)
    }

    if (this.resultData.newAchievements?.length) {
      const ids = this.resultData.newAchievements.slice(0, 3).map((id) => ACHIEVEMENT_BY_ID.get(id)?.name).filter(Boolean)
      this.add.text(GAME_WIDTH / 2, 561, `NEW TROPHY${ids.length > 1 ? 'IES' : ''} · ${ids.join(' · ')}`, {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#ffe066',
        align: 'center', wordWrap: { width: 460 },
      }).setOrigin(0.5)
    }
    if (this.resultData.newOutfits?.length || this.resultData.newBoots?.length) {
      this.add.text(GAME_WIDTH / 2, 582, `${this.resultData.newOutfits?.length ?? 0} OUTFITS · ${this.resultData.newBoots?.length ?? 0} BOOT SKINS UNLOCKED`, {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '9px', color: '#9bffda',
      }).setOrigin(0.5)
    }

    this.buttons()

    if (success) {
      this.confetti()
    }
  }

  private statRow(label: string, value: string, y: number): void {
    this.add.text(62, y, label, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold', color: 'rgba(255,244,220,0.72)',
    })
    this.add.text(GAME_WIDTH - 62, y, value, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff4dc',
    }).setOrigin(1, 0)
  }

  private buttons(): void {
    const success = this.resultData.success
    const primary = success && this.resultData.mode === 'campaign' && this.resultData.nextLevelId
      ? 'NEXT LEVEL'
      : success && this.resultData.boss && this.resultData.nextWorldIndex != null
        ? 'NEXT WORLD'
        : success ? 'PLAY AGAIN' : 'TRY AGAIN'
    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 646, width: 360, height: 52, label: primary, color: success ? 0x5cf2d6 : 0xff6b7a,
      glyph: success ? '▶' : '↻',
      onClick: () => this.primaryAction(),
    }).setDepth(20)
    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 706, width: 360, height: 42, label: 'WORLD MAP', color: 0xb79cff,
      onClick: () => {
        audio.sfx('click')
        this.scene.start('World', { worldIndex: this.resultData.worldIndex, timeAttack: this.resultData.mode === 'time' })
      },
    }).setDepth(20)
    new UiButton(this, {
      x: 138, y: 770, width: 170, height: 40, label: 'MODES', small: true, color: 0xffe066,
      onClick: () => { audio.sfx('click'); this.scene.start('Modes') },
    }).setDepth(20)
    new UiButton(this, {
      x: 402, y: 770, width: 170, height: 40, label: 'MAIN MENU', small: true, color: 0x9beeff,
      onClick: () => { audio.sfx('back'); this.scene.start('Menu') },
    }).setDepth(20)
    this.add.text(GAME_WIDTH / 2, 842, 'TIP · EVERY REQUIRED SPARK OPENS THE EXIT. OPTIONAL RESONANCE IS PURE SCORE.', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '8px', color: 'rgba(255,244,220,0.35)',
      align: 'center', wordWrap: { width: 430 },
    }).setOrigin(0.5)
  }

  private primaryAction(): void {
    audio.sfx('click')
    if (this.resultData.success && this.resultData.mode === 'campaign' && this.resultData.nextLevelId) {
      this.scene.start('Game', { levelId: this.resultData.nextLevelId, mode: 'campaign' })
      return
    }
    if (this.resultData.success && this.resultData.boss && this.resultData.nextWorldIndex !== undefined && this.resultData.nextWorldIndex !== null) {
      this.scene.start('World', { worldIndex: this.resultData.nextWorldIndex })
      return
    }
    if (this.resultData.boss) {
      this.scene.start('Boss', { bossIndex: this.resultData.boss.worldIndex, mode: 'campaign' })
      return
    }
    if (this.resultData.mode === 'bossrush') {
      this.scene.start('Modes')
      return
    }
    if (this.resultData.mode === 'classic') {
      this.scene.start('Game', { levelId: 'w1-1', mode: 'classic', runScore: 0, runHealth: 3, runStage: 0 })
      return
    }
    if (this.resultData.mode === 'endless') {
      this.scene.start('Game', { levelId: this.resultData.levelId, mode: 'endless', stage: 0, runScore: 0, runHealth: 3 })
      return
    }
    this.scene.start('Game', { levelId: this.resultData.levelId, mode: this.resultData.mode, dailyDate: this.resultData.result.dailyDate })
  }

  private confetti(): void {
    for (let index = 0; index < 32; index += 1) {
      const color = [0xffe066, 0x5cf2d6, 0xff7ec4, 0x9bffda, 0xb79cff][index % 5]
      const image = this.add.image(Phaser.Math.Between(20, GAME_WIDTH - 20), -10, 'spark-4')
        .setDisplaySize(8, 8).setTint(color).setDepth(40).setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({
        targets: image,
        y: 960,
        x: image.x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(180, 720),
        duration: 1400 + Math.random() * 1700,
        delay: Math.random() * 700,
        ease: 'Quad.easeIn',
        onComplete: () => image.destroy(),
      })
    }
  }

  private burst(x: number, y: number, color: number): void {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2
      const image = this.add.image(x, y, 'dust').setTint(color).setDisplaySize(5, 5).setDepth(30)
      this.tweens.add({
        targets: image, x: x + Math.cos(angle) * 42, y: y + Math.sin(angle) * 42, alpha: 0,
        duration: 420, onComplete: () => image.destroy(),
      })
    }
  }
}
