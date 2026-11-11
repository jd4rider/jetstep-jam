import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave } from '../core/save'
import { ensureCoreTextures, ensureEnemyTextures, ensurePipTextures } from '../world/textures'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    ensureCoreTextures(this)
    ensurePipTextures(this)
    ensureEnemyTextures(this)
    const save = loadSave()
    audio.setSettings(save.settings)
    document.documentElement.dataset.game = 'jetstep-jam'
    document.documentElement.dataset.version = '1.0.0'
    this.scene.start('Menu')
  }
}
