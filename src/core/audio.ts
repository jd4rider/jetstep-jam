import type { GameplaySettings, WorldTheme } from '../types'
import { DEFAULT_SETTINGS } from './save'

export type SoundName =
  | 'jump' | 'land' | 'jet' | 'jet-stop' | 'slide' | 'spark' | 'optional' | 'energy'
  | 'power' | 'hurt' | 'shield' | 'switch' | 'checkpoint' | 'death' | 'victory'
  | 'click' | 'back' | 'star' | 'laser' | 'boss-hit' | 'boss-defeat' | 'portal' | 'empty' | 'hit'

type Mood = 'menu' | 'level' | 'boss' | 'results'

const MOOD_ROOTS: Record<Mood, number> = { menu: 220, level: 261.63, boss: 110, results: 329.63 }
const MOOD_SCALES: Record<Mood, number[]> = {
  menu: [0, 2, 4, 7, 9],
  level: [0, 2, 4, 7, 9],
  boss: [0, 1, 3, 5, 7],
  results: [0, 2, 4, 7, 11],
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private sfxBus: GainNode | null = null
  private ambienceBus: GainNode | null = null
  private ambience: AudioBufferSourceNode | null = null
  private ambienceFilter: BiquadFilterNode | null = null
  private pad: OscillatorNode[] = []
  private padGain: GainNode | null = null
  private timer: number | null = null
  private step = 0
  private mood: Mood = 'menu'
  private world: WorldTheme | null = null
  private settings: GameplaySettings = DEFAULT_SETTINGS
  private unlocked = false
  private noise: AudioBuffer | null = null
  private intensity = 0
  private suspended = false

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.musicBus = this.ctx.createGain()
      this.sfxBus = this.ctx.createGain()
      this.ambienceBus = this.ctx.createGain()
      this.musicBus.connect(this.master)
      this.sfxBus.connect(this.master)
      this.ambienceBus.connect(this.master)
      this.master.connect(this.ctx.destination)
      this.applyVolumes()
      this.makeNoise()
      this.unlocked = true
      this.buildPad()
      this.startSequencer()
      this.restartAmbience()
    } catch {
      // Without Web Audio the game remains fully playable and silent.
    }
  }

  setSettings(settings: GameplaySettings): void {
    this.settings = settings
    this.applyVolumes()
    if (!settings.muted) this.unlock()
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus || !this.ambienceBus) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.masterVolume, now, 0.03)
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.42, now, 0.05)
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.02)
    this.ambienceBus.gain.setTargetAtTime(this.settings.ambienceVolume * 0.2, now, 0.08)
  }

  setMood(mood: Mood, world?: WorldTheme): void {
    const changed = this.mood !== mood || this.world !== world
    this.mood = mood
    if (world) this.world = world
    if (!changed) return
    this.step = 0
    if (this.unlocked) {
      this.buildPad()
      this.restartAmbience()
    }
  }

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value))
  }

  private root(): number {
    return this.world && this.mood !== 'menu' ? this.world.music.root : MOOD_ROOTS[this.mood]
  }

  private scale(): number[] {
    return this.world && this.mood !== 'menu' ? this.world.music.scale : MOOD_SCALES[this.mood]
  }

  private tempo(): number {
    const base = this.world && this.mood !== 'menu' ? this.world.music.tempo : 86
    return this.mood === 'boss' ? Math.max(108, base + 22) : this.mood === 'results' ? 100 : base
  }

  private note(index: number, octave = 0): number {
    const scale = this.scale()
    const degree = scale[((index % scale.length) + scale.length) % scale.length]
    return this.root() * Math.pow(2, (degree + octave * 12) / 12)
  }

  private buildPad(): void {
    if (!this.ctx || !this.musicBus) return
    const now = this.ctx.currentTime
    this.pad.forEach((osc) => {
      try {
        osc.stop(now + 0.5)
      } catch {
        // already stopped
      }
    })
    this.pad = []
    this.padGain?.disconnect()
    this.padGain = this.ctx.createGain()
    this.padGain.gain.setValueAtTime(0.0001, now)
    this.padGain.gain.exponentialRampToValueAtTime(this.mood === 'boss' ? 0.06 : 0.045, now + 1.3)
    this.padGain.connect(this.musicBus)
    const chord = [0, 2, 4]
    chord.forEach((degree, index) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = index === 0 ? 'sine' : this.world?.music.wave === 'square' ? 'triangle' : 'sine'
      osc.frequency.value = this.note(degree, index === 0 ? -1 : 0)
      osc.detune.value = index === 1 ? -7 : index === 2 ? 7 : 0
      gain.gain.value = index === 0 ? 0.8 : 0.3
      osc.connect(gain)
      gain.connect(this.padGain!)
      osc.start(now)
      this.pad.push(osc)
    })
  }

  private startSequencer(): void {
    if (this.timer !== null) return
    const tick = (): void => {
      this.playStep()
      const beat = 60000 / this.tempo() / 2
      this.timer = window.setTimeout(tick, beat)
    }
    this.timer = window.setTimeout(tick, 450)
  }

  private playStep(): void {
    if (!this.ctx || !this.musicBus) return
    const pattern = this.mood === 'boss' ? [0, 0, 3, 2, 0, 4, 3, 1] : [0, 2, 4, 2, 3, 4, 1, 3]
    const index = pattern[this.step % pattern.length]
    const octave = this.step % 8 === 6 ? 1 : 0
    this.step += 1
    if (this.step % 2 === 1 && this.intensity < 0.3) return
    const frequency = this.note(index, octave)
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = this.mood === 'boss' ? 'sawtooth' : this.world?.music.wave ?? 'triangle'
    osc.frequency.value = frequency * 2
    const volume = this.mood === 'boss' ? 0.04 + this.intensity * 0.03 : 0.035
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    osc.connect(gain)
    gain.connect(this.musicBus)
    osc.start(now)
    osc.stop(now + 0.46)
  }

  private makeNoise(): void {
    if (!this.ctx) return
    const length = Math.floor(this.ctx.sampleRate * 1.2)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1
    this.noise = buffer
  }

  private restartAmbience(): void {
    if (!this.ctx || !this.ambienceBus || !this.noise) return
    this.ambience?.stop()
    const source = this.ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    const ambience = this.world?.music.ambient ?? 'gentle room tone'
    filter.frequency.value = ambience.includes('water') || ambience.includes('deep') ? 340 : 520
    filter.Q.value = 0.7
    const gain = this.ctx.createGain()
    gain.gain.value = this.settings.muted ? 0 : 0.18
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.ambienceBus)
    source.start()
    this.ambience = source
    this.ambienceFilter = filter
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.sfxBus) return
    const now = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, now)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(gain)
    gain.connect(this.sfxBus)
    osc.start(now)
    osc.stop(now + duration + 0.04)
  }

  private whoosh(volume: number, duration = 0.25, frequency = 1200): void {
    if (!this.ctx || !this.sfxBus || !this.noise) return
    const now = this.ctx.currentTime
    const source = this.ctx.createBufferSource()
    source.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(frequency, now)
    filter.frequency.exponentialRampToValueAtTime(220, now + duration)
    filter.Q.value = 1.2
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxBus)
    source.start(now)
    source.stop(now + duration)
  }

  sfx(name: SoundName): void {
    if (!this.unlocked) return
    switch (name) {
      case 'jump':
        this.tone(330, 0.13, 'triangle', 0.12, 660)
        break
      case 'land':
        this.tone(110, 0.08, 'sine', 0.08, 66)
        this.whoosh(0.035, 0.12, 600)
        break
      case 'jet':
        this.tone(185, 0.1, 'sawtooth', 0.028, 340)
        this.whoosh(0.02, 0.13, 900)
        break
      case 'jet-stop':
        this.tone(300, 0.1, 'sine', 0.025, 150)
        break
      case 'slide':
        this.whoosh(0.05, 0.18, 1800)
        break
      case 'spark':
        this.tone(this.note(4, 1), 0.18, 'sine', 0.06)
        this.tone(this.note(2, 1), 0.22, 'triangle', 0.035, undefined, 0.04)
        break
      case 'optional':
        this.tone(this.note(4, 1), 0.2, 'sine', 0.06)
        this.tone(this.note(6, 1), 0.3, 'sine', 0.045, undefined, 0.09)
        break
      case 'energy':
        this.tone(420, 0.14, 'square', 0.035, 840)
        break
      case 'power':
        [0, 2, 4, 7].forEach((degree, index) => this.tone(this.note(degree, 1), 0.28, 'sine', 0.045, undefined, index * 0.045))
        break
      case 'hurt':
        this.tone(120, 0.26, 'sawtooth', 0.1, 48)
        this.whoosh(0.09, 0.25, 800)
        break
      case 'shield':
        this.tone(880, 0.2, 'sine', 0.08, 440)
        break
      case 'switch':
        this.tone(280, 0.1, 'square', 0.05)
        this.tone(560, 0.16, 'sine', 0.05, undefined, 0.08)
        break
      case 'checkpoint':
        [0, 4, 7].forEach((degree, index) => this.tone(this.note(degree, 1), 0.2, 'triangle', 0.05, undefined, index * 0.07))
        break
      case 'death':
        this.tone(210, 0.5, 'sawtooth', 0.09, 40)
        this.whoosh(0.09, 0.5, 500)
        break
      case 'victory':
        [0, 2, 4, 6, 8].forEach((degree, index) => this.tone(this.note(degree, 1), 0.5, 'sine', 0.055, undefined, index * 0.08))
        break
      case 'click':
        this.tone(620, 0.045, 'sine', 0.035)
        break
      case 'back':
        this.tone(300, 0.06, 'sine', 0.03, 220)
        break
      case 'star':
        this.tone(rand(630, 740), 0.25, 'sine', 0.06)
        this.tone(rand(900, 1040), 0.3, 'sine', 0.04, undefined, 0.08)
        break
      case 'laser':
        this.tone(1300, 0.08, 'sawtooth', 0.02, 500)
        break
      case 'boss-hit':
        this.tone(90, 0.4, 'sawtooth', 0.13, 35)
        this.whoosh(0.1, 0.4, 300)
        break
      case 'hit':
        this.tone(210, 0.1, 'square', 0.05, 120)
        this.whoosh(0.03, 0.12, 900)
        break
      case 'boss-defeat':
        [0, 2, 4, 7, 9, 12].forEach((degree, index) => this.tone(this.note(degree, 1), 0.4, 'triangle', 0.05, undefined, index * 0.09))
        break
      case 'portal':
        this.tone(300, 0.5, 'sine', 0.05, 1200)
        break
      case 'empty':
        this.tone(140, 0.1, 'square', 0.03, 100)
        break
    }
  }

  suspend(): void {
    if (!this.ctx) return
    this.suspended = true
    void this.ctx.suspend()
  }

  resume(): void {
    if (!this.ctx || !this.suspended) return
    this.suspended = false
    void this.ctx.resume()
  }

  get isUnlocked(): boolean {
    return this.unlocked
  }
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export const audio = new AudioEngine()
