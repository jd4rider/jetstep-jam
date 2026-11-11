import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave } from '../core/save'
import { ACHIEVEMENTS } from '../data/achievements'
import { CSS, GAME_WIDTH } from '../config'
import { Backdrop } from '../world/Backdrop'
import { backButton, pageTitle, UiButton } from '../ui/common'

export class AchievementsScene extends Phaser.Scene {
  private page = 0
  private root?: Phaser.GameObjects.Container

  constructor() {
    super('Achievements')
  }

  create(): void {
    const save = loadSave()
    new Backdrop(this, 16, save.settings.reducedMotion)
    pageTitle(this, 'THE TROPHY ROOM', 'ACHIEVEMENTS', `${save.achievements.length} of ${ACHIEVEMENTS.length} unlocked · every note counts.`)
    backButton(this, () => {
      audio.sfx('back')
      this.scene.start('Menu')
    }, 910)
    this.drawPage()
  }

  private drawPage(): void {
    this.root?.destroy(true)
    const root = this.add.container(0, 0).setDepth(20)
    this.root = root
    const save = loadSave()
    const pages = Math.ceil(ACHIEVEMENTS.length / 10)
    const unlocked = ACHIEVEMENTS.filter((achievement) => save.achievements.includes(achievement.id)).length
    const bar = this.add.graphics()
    bar.fillStyle(0x080611, 0.85)
    bar.fillRoundedRect(40, 126, GAME_WIDTH - 80, 9, 4)
    bar.fillGradientStyle(0xffe066, 0xffe066, 0xff9f68, 0xff9f68, 1, 1, 1, 1)
    bar.fillRoundedRect(40, 126, (GAME_WIDTH - 80) * (unlocked / ACHIEVEMENTS.length), 9, 4)
    root.add(bar)
    root.add(this.add.text(GAME_WIDTH - 40, 106, `${unlocked} / ${ACHIEVEMENTS.length}`, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold', color: CSS.gold,
    }).setOrigin(1, 0.5))
    const visible = ACHIEVEMENTS.slice(this.page * 10, this.page * 10 + 10)
    visible.forEach((achievement, index) => {
      const earned = save.achievements.includes(achievement.id)
      const y = 170 + index * 66
      const panel = this.add.graphics()
      panel.fillStyle(0x100b22, earned ? 0.76 : 0.48)
      panel.fillRoundedRect(30, y, GAME_WIDTH - 60, 56, 12)
      panel.lineStyle(1, earned ? 0xffe066 : 0xffffff, earned ? 0.42 : 0.08)
      panel.strokeRoundedRect(30, y, GAME_WIDTH - 60, 56, 12)
      root.add(panel)
      const glyph = this.add.text(56, y + 28, earned ? achievement.glyph : '·', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '19px', fontStyle: 'bold',
        color: earned ? '#ffe066' : 'rgba(255,244,220,0.28)',
      }).setOrigin(0.5)
      const name = this.add.text(80, y + 9, achievement.name, {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '12px', fontStyle: 'bold',
        color: earned ? '#fff4dc' : 'rgba(255,244,220,0.38)',
      })
      const desc = this.add.text(80, y + 28, achievement.description, {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '9px',
        color: earned ? 'rgba(255,244,220,0.62)' : 'rgba(255,244,220,0.24)',
        wordWrap: { width: 400 },
      })
      const status = this.add.text(GAME_WIDTH - 48, y + 28, earned ? 'UNLOCKED' : 'LOCKED', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '8px', fontStyle: 'bold',
        color: earned ? '#9bffda' : 'rgba(255,244,220,0.26)',
      }).setOrigin(1, 0.5)
      root.add([glyph, name, desc, status])
    })
    root.add(this.add.text(GAME_WIDTH / 2, 824, `PAGE ${this.page + 1} / ${pages}`, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold', color: CSS.muted,
    }).setOrigin(0.5))
    const prev = new UiButton(this, {
      x: 140, y: 858, width: 112, height: 36, label: '‹ PREV', small: true, color: 0xffa94d,
      onClick: () => this.turnPage(-1), disabled: this.page === 0,
    })
    const next = new UiButton(this, {
      x: GAME_WIDTH - 140, y: 858, width: 112, height: 36, label: 'NEXT ›', small: true, color: 0xffa94d,
      onClick: () => this.turnPage(1), disabled: this.page >= pages - 1,
    })
    root.add([prev.container, next.container])
  }

  private turnPage(direction: number): void {
    const pages = Math.ceil(ACHIEVEMENTS.length / 10)
    const next = Phaser.Math.Clamp(this.page + direction, 0, pages - 1)
    if (next === this.page) return
    audio.sfx(direction < 0 ? 'back' : 'click')
    this.page = next
    this.drawPage()
  }
}
