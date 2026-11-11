import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave } from '../core/save'
import {
  currentWorld,
  worldCompleted,
  worldProgressLabel,
  worldStars,
  worldUnlocked,
} from '../data/levels'
import { WORLDS } from '../data/worlds'
import { CSS, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { Backdrop } from '../world/Backdrop'
import { backButton, pageTitle, UiButton } from '../ui/common'

interface UniverseData {
  timeAttack?: boolean
  returnTo?: string
  page?: number
}

export class UniverseScene extends Phaser.Scene {
  private page = 0
  private timeAttack = false
  private returnTo = 'Menu'
  private pageRoot?: Phaser.GameObjects.Container
  private pageLabel?: Phaser.GameObjects.Text
  private status?: Phaser.GameObjects.Text

  constructor() {
    super('Universe')
  }

  init(data: UniverseData): void {
    this.timeAttack = Boolean(data.timeAttack)
    this.returnTo = data.returnTo ?? 'Menu'
    const save = loadSave()
    this.page = data.page ?? Math.floor(currentWorld(save) / 5)
  }

  create(): void {
    const save = loadSave()
    audio.setMood('menu', WORLDS[Math.min(19, this.page * 5)])
    new Backdrop(this, Math.min(19, this.page * 5), save.settings.reducedMotion)
    pageTitle(
      this,
      this.timeAttack ? 'THE CLOCK IS RUNNING' : 'THE HARMONY ENGINE',
      this.timeAttack ? 'TIME ATTACK' : 'UNIVERSE MAP',
      this.timeAttack ? 'Choose an unlocked world and replay any of its levels against your best time.' : 'Twenty worlds. One thousand small machines. Find the next note.',
    )
    backButton(this, () => this.goBack(), 910)
    new UiButton(this, {
      x: 140, y: 828, width: 116, height: 40, label: '‹ PREV', small: true,
      color: 0x9bffda, onClick: () => this.turnPage(-1),
      disabled: this.page === 0,
    })
    new UiButton(this, {
      x: GAME_WIDTH - 140, y: 828, width: 116, height: 40, label: 'NEXT ›', small: true,
      color: 0x9bffda, onClick: () => this.turnPage(1),
      disabled: this.page >= 3,
    })
    this.pageLabel = this.add
      .text(GAME_WIDTH / 2, 834, '', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', fontStyle: 'bold', color: CSS.cream,
      })
      .setOrigin(0.5)
    this.status = this.add
      .text(GAME_WIDTH / 2, 876, '', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', color: CSS.gold, align: 'center',
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5)
    this.drawPage()
    void save
    void worldStars
  }

  private drawPage(): void {
    this.pageRoot?.destroy(true)
    const save = loadSave()
    const root = this.add.container(0, 0).setDepth(20)
    this.pageRoot = root
    const start = this.page * 5
    const path = this.add.graphics()
    root.add(path)
    const points: { x: number; y: number }[] = []
    WORLDS.slice(start, start + 5).forEach((world, index) => {
      const unlocked = worldUnlocked(save, world.index)
      const complete = worldCompleted(save, world.index)
      const stars = worldStars(save, world.index)
      const y = 168 + index * 139
      points.push({ x: 118, y })
      const accent = Phaser.Display.Color.HexStringToColor(world.palette.accent).color
      const color = unlocked ? accent : 0x5a4b72
      const progress = unlocked ? worldProgressLabel(save, world.index) : 'DEFEAT THE PREVIOUS WORLD BOSS'
      const button = new UiButton(this, {
        x: GAME_WIDTH / 2,
        y,
        width: 420,
        height: 112,
        label: world.name,
        sublabel: `${world.feature}\n${progress}`,
        glyph: String(world.index + 1).padStart(2, '0'),
        color,
        align: 'left',
        small: true,
        disabled: !unlocked,
        onClick: () => {
          if (!unlocked) {
            this.say(`Clear world ${world.index} and its boss to open ${world.name}.`)
            return
          }
          audio.sfx('click')
          this.scene.start('World', { worldIndex: world.index, timeAttack: this.timeAttack, returnTo: this.returnTo })
        },
      })
      button.setDepth(20)
      button.container.setAlpha(unlocked ? 1 : 0.52)
      root.add(button.container)
      if (world.index === currentWorld(save) && unlocked) {
        const marker = this.add.text(GAME_WIDTH / 2 + 198, y - 37, 'YOU ARE HERE', {
          fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '8px', fontStyle: 'bold', color: '#fff4dc',
          backgroundColor: '#3a2660', padding: { x: 6, y: 3 },
        }).setOrigin(1, 0.5)
        root.add(marker)
      }
      if (complete === 50) {
        const badge = this.add.text(GAME_WIDTH / 2 - 202, y + 40, `${stars}/150 ★`, {
          fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#ffe066',
        }).setOrigin(0, 0.5)
        root.add(badge)
      }
    })
    path.lineStyle(2, 0x5cf2d6, 0.28)
    path.beginPath()
    path.moveTo(points[0].x, points[0].y)
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]
      const current = points[index]
      path.lineTo(78 + (index % 2) * 44, (previous.y + current.y) / 2)
      path.lineTo(current.x, current.y)
    }
    path.strokePath()
    path.lineStyle(1, 0xffffff, 0.11)
    path.strokePath()
    if (this.pageLabel) this.pageLabel.setText(`${this.page + 1} / 4  ·  WORLDS ${start + 1}–${start + 5}`)
  }

  private turnPage(direction: number): void {
    const next = Phaser.Math.Clamp(this.page + direction, 0, 3)
    if (next === this.page) return
    audio.sfx(direction < 0 ? 'back' : 'click')
    this.page = next
    this.drawPage()
    this.refreshPager()
  }

  private refreshPager(): void {
    const children = this.children.list
    void children
    // Rebuild the header texture for the new world's palette.
    this.cameras.main.flash(120, 255, 255, 255, false)
  }

  private goBack(): void {
    audio.sfx('back')
    if (this.timeAttack && this.returnTo === 'Modes') this.scene.start('Modes')
    else this.scene.start(this.returnTo)
  }

  private say(message: string): void {
    audio.sfx('empty')
    if (!this.status) return
    this.status.setText(message)
    this.tweens.killTweensOf(this.status)
    this.status.setAlpha(1)
    this.tweens.add({ targets: this.status, alpha: 0, delay: 1500, duration: 400 })
  }
}
