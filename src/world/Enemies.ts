import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { EnemySpec, LevelData, PowerModifiers } from '../types'
import { ENEMY_NAMES } from '../generator/level'

interface EnemyInstance {
  spec: EnemySpec
  sprite: Phaser.Physics.Arcade.Image
  baseX: number
  baseY: number
  phase: number
  cooldown: number
  defeated: boolean
}

export class EnemySystem {
  readonly group: Phaser.Physics.Arcade.Group
  readonly shots: Phaser.Physics.Arcade.Group
  readonly instances: EnemyInstance[] = []
  private readonly scene: Phaser.Scene
  private time = 0
  private shotLifetime = new Map<Phaser.Physics.Arcade.Image, number>()

  constructor(scene: Phaser.Scene, level: LevelData) {
    this.scene = scene
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.shots = scene.physics.add.group({ allowGravity: false, immovable: true })
    level.enemies.forEach((spec) => this.create(spec))
  }

  private create(spec: EnemySpec): void {
    const image = this.group.create(spec.x, spec.y, `enemy-${spec.variant}`) as Phaser.Physics.Arcade.Image
    image.setDisplaySize(45, 45)
    image.setCircle(20)
    image.setDepth(9)
    image.setData('enemyIndex', this.instances.length)
    image.setData('name', ENEMY_NAMES[spec.variant % ENEMY_NAMES.length])
    image.setData('behaviour', spec.kind)
    if (spec.shielded) image.setTint(0x9beeff)
    this.instances.push({
      spec, sprite: image, baseX: spec.x, baseY: spec.y, phase: Math.random() * Math.PI * 2, cooldown: 700 + Math.random() * 1000, defeated: false,
    })
  }

  update(time: number, deltaMs: number, player: { x: number; y: number }, mods: PowerModifiers): void {
    this.time += deltaMs
    const dt = Math.min(deltaMs, 34) / 1000
    const frozen = mods.enemyFreeze
    this.instances.forEach((enemy) => {
      if (enemy.defeated) return
      const { spec, sprite } = enemy
      if (frozen) {
        sprite.setTint(0x9beeff)
        return
      }
      if (spec.shielded) sprite.setTint(0x9beeff)
      else sprite.clearTint()
      const t = time + enemy.phase * 1000
      let x = enemy.baseX
      let y = enemy.baseY
      const dx = player.x - sprite.x
      const dy = player.y - sprite.y
      const distance = Math.hypot(dx, dy)
      switch (spec.kind) {
        case 'patrol':
          x += Math.sin(t * 0.0012 * (spec.speed / 32)) * spec.range
          break
        case 'vertical':
          y += Math.sin(t * 0.0015 * (spec.speed / 32)) * spec.range * 0.65
          break
        case 'hover':
          x += Math.sin(t * 0.0009) * spec.range * 0.55
          y += Math.sin(t * 0.0021) * 20
          break
        case 'chase':
          if (distance < 300) {
            x += Math.sign(dx) * Math.min(Math.abs(dx), spec.speed * dt * 1.4)
            y += Math.sign(dy) * Math.min(Math.abs(dy), spec.speed * dt * 0.4)
          }
          break
        case 'turret':
          enemy.cooldown -= deltaMs
          if (enemy.cooldown <= 0 && distance < 430) {
            enemy.cooldown = 1750
            this.shoot(sprite.x, sprite.y, player.x, player.y)
          }
          break
        case 'hopper':
          x += Math.sin(t * 0.0008) * spec.range * 0.7
          y -= Math.abs(Math.sin(t * 0.003)) * 58
          break
        case 'shield':
          x += Math.sin(t * 0.00075) * spec.range * 0.8
          break
        case 'orbit':
          x += Math.cos(t * 0.0017) * spec.range * 0.45
          y += Math.sin(t * 0.0017) * spec.range * 0.32
          break
        case 'charger': {
          const cycle = Math.sin(t * 0.0014)
          if (cycle > 0.4 && distance < 310) x += Math.sign(dx) * spec.speed * dt * 3.2
          else y += Math.sin(t * 0.004) * 12
          break
        }
        case 'drifter':
          x += Math.sin(t * 0.00055) * spec.range
          y += Math.cos(t * 0.0021) * 26
          break
      }
      x = Phaser.Math.Clamp(x, 20, 880)
      y = Phaser.Math.Clamp(y, 100, 4300)
      sprite.setPosition(x, y)
      sprite.flipX = dx < 0
      sprite.body?.updateFromGameObject()
    })
    this.updateShots(deltaMs, player)
  }

  private shoot(x: number, y: number, targetX: number, targetY: number): void {
    const shot = this.shots.create(x, y, 'power-orb') as Phaser.Physics.Arcade.Image
    shot.setDisplaySize(17, 17)
    shot.setTint(0xff7ec4)
    shot.setDepth(8)
    shot.setBlendMode(Phaser.BlendModes.ADD)
    const angle = Math.atan2(targetY - y, targetX - x)
    const body = shot.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setCircle(9)
    body.setVelocity(Math.cos(angle) * 210, Math.sin(angle) * 210)
    this.shotLifetime.set(shot, 3800)
  }

  private updateShots(deltaMs: number, player: { x: number; y: number }): void {
    this.shots.getChildren().forEach((child) => {
      const shot = child as Phaser.Physics.Arcade.Image
      if (!shot.active) return
      const remaining = (this.shotLifetime.get(shot) ?? 0) - deltaMs
      if (remaining <= 0 || shot.x < 0 || shot.x > GAME_WIDTH || shot.y < 0 || shot.y > 5000) {
        this.shotLifetime.delete(shot)
        shot.destroy()
        return
      }
      this.shotLifetime.set(shot, remaining)
      shot.rotation += 0.06
      void player
    })
  }

  stomp(sprite: Phaser.GameObjects.GameObject): { defeated: boolean; shielded: boolean; x: number; y: number } {
    const index = sprite.getData('enemyIndex') as number | undefined
    if (index === undefined) return { defeated: false, shielded: false, x: 0, y: 0 }
    const enemy = this.instances[index]
    if (!enemy || enemy.defeated) return { defeated: false, shielded: false, x: 0, y: 0 }
    if (enemy.spec.kind === 'shield') return { defeated: false, shielded: true, x: enemy.sprite.x, y: enemy.sprite.y }
    enemy.defeated = true
    const x = enemy.sprite.x
    const y = enemy.sprite.y
    this.scene.tweens.add({
      targets: enemy.sprite,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      angle: 120,
      duration: 180,
      onComplete: () => enemy.sprite.destroy(),
    })
    return { defeated: true, shielded: false, x, y }
  }

  pulse(x: number, y: number, radius: number): { x: number; y: number }[] {
    const removed: { x: number; y: number }[] = []
    this.instances.forEach((enemy) => {
      if (enemy.defeated) return
      if (Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) > radius) return
      if (enemy.spec.kind === 'shield') return
      const result = this.stomp(enemy.sprite)
      if (result.defeated) removed.push({ x: result.x, y: result.y })
    })
    this.shots.clear(true, true)
    return removed
  }

  damageZoneActive(): boolean {
    return this.instances.some((enemy) => !enemy.defeated)
  }

  destroy(): void {
    this.group.destroy(true)
    this.shots.destroy(true)
    this.shotLifetime.clear()
  }
}
