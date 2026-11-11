import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave } from '../core/save'
import { dailyDate, dailyMeta, firstIncompleteLevel, getLevelMeta } from '../data/levels'
import { CSS, GAME_WIDTH } from '../config'
import { Backdrop } from '../world/Backdrop'
import { backButton, formatMs, formatScore, pageTitle, UiButton } from '../ui/common'

export class ModeScene extends Phaser.Scene {
  private status?: Phaser.GameObjects.Text

  constructor() {
    super('Modes')
  }

  create(): void {
    const save = loadSave()
    audio.setMood('menu')
    new Backdrop(this, 7, save.settings.reducedMotion)
    pageTitle(this, 'MORE WAYS TO PLAY', 'ARCADE MODES', 'Six different ways to test the boots. Campaign progress stays untouched.')
    backButton(this, () => {
      audio.sfx('back')
      this.scene.start('Menu')
    }, 910)
    this.status = this.add.text(GAME_WIDTH / 2, 774, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: CSS.gold,
      align: 'center', wordWrap: { width: 410 },
    }).setOrigin(0.5)

    const current = firstIncompleteLevel(save)
    const nextMeta = getLevelMeta(current)
    const daily = dailyMeta()
    const date = dailyDate()
    const dailyRecord = save.modes.daily
    const bosses = save.stats.bossesDefeated
    const modes = [
      {
        label: 'ENDLESS DESCENT',
        sub: `Keep falling · best ${formatScore(save.modes.endlessBest)}`,
        glyph: '↓', color: 0xb79cff,
        onClick: () => this.scene.start('Game', { levelId: current, mode: 'endless', stage: 0, runScore: 0, runHealth: 3 }),
      },
      {
        label: 'CLASSIC ARCADE',
        sub: `Ten stages, three hearts · best ${formatScore(save.modes.classicBest)}`,
        glyph: '▣', color: 0xffe066,
        onClick: () => this.scene.start('Game', { levelId: 'w1-1', mode: 'classic', runScore: 0, runHealth: 3, runStage: 0 }),
      },
      {
        label: 'DAILY CHALLENGE',
        sub: dailyRecord?.date === date ? `Today cleared · ${formatScore(dailyRecord.score)} · ${starText(dailyRecord.stars)}` : `${daily.name} · ${daily.worldIndex + 1}/20`,
        glyph: '◷', color: 0x5cf2d6,
        onClick: () => this.scene.start('Game', { levelId: daily.id, mode: 'daily', dailyDate: date }),
      },
      {
        label: 'TIME ATTACK',
        sub: Object.keys(save.modes.time).length ? `${Object.keys(save.modes.time).length} levels timed · choose a world` : 'Choose any unlocked level and chase gold',
        glyph: '◔', color: 0xff7ec4,
        onClick: () => this.scene.start('Universe', { timeAttack: true, returnTo: 'Modes' }),
      },
      {
        label: 'BOSS RUSH',
        sub: bosses ? `${bosses} boss${bosses === 1 ? '' : 'es'} available · best ${formatMs(save.modes.bossRushBestMs)}` : 'Defeat your first world boss to unlock',
        glyph: '◆', color: 0xff6b7a,
        onClick: () => {
          if (!bosses) {
            this.say('The orchestra is still locked. Defeat a world boss first.')
            return
          }
          const defeated = Array.from({ length: 20 }, (_, index) => index).filter((index) => save.levels[`w${index + 1}-50`]?.completed)
          this.scene.start('Boss', { bossIndex: defeated[0] ?? 0, rush: true, rushList: defeated, rushStep: 0, rushStartedAt: this.time.now })
        },
      },
      {
        label: 'ZEN MODE',
        sub: `No hazards, unlimited energy · ${nextMeta?.name ?? 'A quiet machine'}`,
        glyph: '☁', color: 0x9bffda,
        onClick: () => this.scene.start('Game', { levelId: current, mode: 'zen' }),
      },
    ]
    modes.forEach((mode, index) => {
      new UiButton(this, {
        x: GAME_WIDTH / 2, y: 168 + index * 94, width: 420, height: 78,
        label: mode.label, sublabel: mode.sub, glyph: mode.glyph, color: mode.color,
        align: 'left', onClick: () => {
          audio.sfx('click')
          mode.onClick()
        },
      }).setDepth(20)
    })
  }

  private say(message: string): void {
    if (!this.status) return
    audio.sfx('empty')
    this.status.setText(message).setAlpha(1)
    this.tweens.killTweensOf(this.status)
    this.tweens.add({ targets: this.status, alpha: 0, delay: 1800, duration: 400 })
  }
}

function starText(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`
}
