import Phaser from 'phaser'
import { audio } from '../core/audio'
import { reconcileProgress } from '../core/progress'
import { loadSave, saveCosmetics } from '../core/save'
import { BOOTS, OUTFITS } from '../data/cosmetics'
import { totalStars } from '../data/levels'
import type { CosmeticDefinition, SaveData } from '../types'
import { CSS, GAME_WIDTH } from '../config'
import { PipView } from '../player/PipView'
import { Backdrop } from '../world/Backdrop'
import { backButton, pageTitle, UiButton } from '../ui/common'

type Tab = 'outfit' | 'boots'

export class CustomizeScene extends Phaser.Scene {
  private save!: SaveData
  private tab: Tab = 'outfit'
  private page = 0
  private preview!: PipView
  private clock = 0
  private pageRoot?: Phaser.GameObjects.Container
  private pageLabel?: Phaser.GameObjects.Text
  private detailText?: Phaser.GameObjects.Text

  constructor() {
    super('Customize')
  }

  create(): void {
    reconcileProgress()
    this.save = loadSave()
    audio.setMood('menu', undefined)
    new Backdrop(this, 12, this.save.settings.reducedMotion)
    pageTitle(this, 'LOOK THE PART', 'CUSTOMIZE PIP', 'Twenty outfits and thirty jet-boot skins. Cosmetic only — every pair flies the same.')
    backButton(this, () => {
      audio.sfx('back')
      this.scene.start('Menu')
    }, 910)
    this.preview = new PipView(this, this.save.cosmetics, 20)
    this.add.text(GAME_WIDTH / 2, 330, `${totalStars(this.save)} STARS EARNED`, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold',
      color: CSS.gold, letterSpacing: 2,
    }).setOrigin(0.5)
    new UiButton(this, {
      x: 166, y: 374, width: 174, height: 38, label: 'OUTFITS', small: true,
      color: 0xffe066, onClick: () => this.setTab('outfit'),
    })
    new UiButton(this, {
      x: 374, y: 374, width: 174, height: 38, label: 'JET BOOTS', small: true,
      color: 0x5cf2d6, onClick: () => this.setTab('boots'),
    })
    this.pageLabel = this.add.text(GAME_WIDTH / 2, 630, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold', color: CSS.muted,
    }).setOrigin(0.5)
    this.detailText = this.add.text(GAME_WIDTH / 2, 676, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: CSS.cream,
      align: 'center', wordWrap: { width: 430 },
    }).setOrigin(0.5)
    this.drawPage()
  }

  private setTab(tab: Tab): void {
    if (this.tab === tab) return
    this.tab = tab
    this.page = 0
    audio.sfx('click')
    this.drawPage()
  }

  private items(): CosmeticDefinition[] {
    return this.tab === 'outfit' ? OUTFITS : BOOTS
  }

  private drawPage(): void {
    this.pageRoot?.destroy(true)
    const root = this.add.container(0, 0).setDepth(25)
    this.pageRoot = root
    const items = this.items()
    const pages = Math.ceil(items.length / 10)
    const visible = items.slice(this.page * 10, this.page * 10 + 10)
    visible.forEach((item, index) => {
      const column = index % 5
      const row = Math.floor(index / 5)
      const x = 54 + column * 108
      const y = 438 + row * 84
      const unlocked = this.tab === 'outfit'
        ? this.save.cosmetics.unlockedOutfits.includes(item.id)
        : this.save.cosmetics.unlockedBoots.includes(item.id)
      const equipped = this.tab === 'outfit' ? this.save.cosmetics.outfit === item.id : this.save.cosmetics.boots === item.id
      const color = unlocked ? (this.tab === 'outfit' ? item.jacket : item.boots) : 0x4f4168
      const button = new UiButton(this, {
        x, y, width: 94, height: 66,
        label: item.name.split(' ')[0], sublabel: equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : `${item.unlockStars}★`,
        color, small: true,
        onClick: () => this.equip(item, unlocked),
      })
      button.setDepth(25)
      if (!unlocked) button.container.setAlpha(0.42)
      root.add(button.container)
    })
    const pageColor = this.tab === 'outfit' ? 0xffe066 : 0x5cf2d6
    new UiButton(this, {
      x: 150, y: 602, width: 104, height: 34, label: '‹', small: true, color: pageColor,
      onClick: () => this.turnPage(-1), disabled: this.page === 0,
    }).setDepth(30)
    new UiButton(this, {
      x: GAME_WIDTH - 150, y: 602, width: 104, height: 34, label: '›', small: true, color: pageColor,
      onClick: () => this.turnPage(1), disabled: this.page >= pages - 1,
    }).setDepth(30)
    this.pageLabel?.setText(`${this.page + 1} / ${pages} · ${this.tab === 'outfit' ? 'OUTFITS' : 'JET BOOTS'}`)
    const equippedItem = this.tab === 'outfit'
      ? OUTFITS.find((item) => item.id === this.save.cosmetics.outfit)
      : BOOTS.find((item) => item.id === this.save.cosmetics.boots)
    this.detailText?.setText(equippedItem ? `${equippedItem.name} · ${equippedItem.description}` : '')
    this.preview.applyCosmetics(this.save.cosmetics)
  }

  private turnPage(direction: number): void {
    const pages = Math.ceil(this.items().length / 10)
    const next = Phaser.Math.Clamp(this.page + direction, 0, pages - 1)
    if (next === this.page) return
    this.page = next
    audio.sfx(direction < 0 ? 'back' : 'click')
    this.drawPage()
  }

  private equip(item: CosmeticDefinition, unlocked: boolean): void {
    if (!unlocked) {
      audio.sfx('empty')
      this.detailText?.setText(`Earn ${item.unlockStars} stars to unlock ${item.name}. You have ${totalStars(this.save)}.`)
      return
    }
    audio.sfx('click')
    if (this.tab === 'outfit') this.save.cosmetics.outfit = item.id
    else this.save.cosmetics.boots = item.id
    saveCosmetics(this.save.cosmetics)
    this.drawPage()
  }

  update(_time: number, delta: number): void {
    this.clock += delta
    this.preview.update({
      x: GAME_WIDTH / 2 + Math.sin(this.clock * 0.0009) * 12,
      y: 253 + Math.sin(this.clock * 0.0022) * 5,
      velocityX: 0, velocityY: 0, onGround: false, jetting: true,
      ducking: false, sliding: false, facing: 1, invulnerable: false,
      shield: false, energyRatio: 0.64, reducedMotion: this.save.settings.reducedMotion,
    }, delta)
  }
}
