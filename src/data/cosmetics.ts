import type { CosmeticDefinition } from '../types'

export const OUTFITS: CosmeticDefinition[] = [
  { id: 'classic', name: 'Classic Inventor', description: 'The jacket that started the journey.', jacket: 0xffa94d, trousers: 0x355c8c, boots: 0x7dd3fc, visor: 0x9bffda, pack: 0x7c93ad, exhaust: 0x5cf2d6, unlockStars: 0 },
  { id: 'neon', name: 'Neon Explorer', description: 'A jacket tuned to the city grid.', jacket: 0xff5ca8, trousers: 0x24155c, boots: 0x63f5ff, visor: 0xfff36e, pack: 0x39419a, exhaust: 0x63f5ff, unlockStars: 0 },
  { id: 'crystal', name: 'Crystal Adventurer', description: 'Cut from a resonator cavern.', jacket: 0xb79cff, trousers: 0x2b2467, boots: 0x9bfffa, visor: 0x9bffda, pack: 0x584b9e, exhaust: 0xb79cff, unlockStars: 0 },
  { id: 'golden', name: 'Golden Rocket', description: 'For the pilot who never misses a beat.', jacket: 0xffe066, trousers: 0x6b3f1f, boots: 0xffc83d, visor: 0xffffff, pack: 0xb77928, exhaust: 0xffe066, unlockStars: 18 },
  { id: 'ice', name: 'Ice Pilot', description: 'A frost-lined flight suit.', jacket: 0x9beeff, trousers: 0x2e5d78, boots: 0xd7fbff, visor: 0x5cf2ff, pack: 0x4d7793, exhaust: 0xd7fbff, unlockStars: 35 },
  { id: 'steam', name: 'Steam Engineer', description: 'Brass buckles and a warm scarf.', jacket: 0xc47a3b, trousers: 0x4b3527, boots: 0xffcf6e, visor: 0xffe8b0, pack: 0x8d5d35, exhaust: 0xffa94d, unlockStars: 55 },
  { id: 'galactic', name: 'Galactic Traveler', description: 'A suit woven for low gravity.', jacket: 0x5b64d6, trousers: 0x171a3a, boots: 0xa6c8ff, visor: 0x63f5ff, pack: 0x3b469b, exhaust: 0x63f5ff, unlockStars: 80 },
  { id: 'rainbow', name: 'Rainbow Runner', description: 'Every world leaves a colour behind.', jacket: 0xff7ec4, trousers: 0x5b2158, boots: 0xffe066, visor: 0x9bffda, pack: 0xb14d8c, exhaust: 0xff8ed6, unlockStars: 110 },
  { id: 'clockwork', name: 'Clockwork Hero', description: 'A precise little machine.', jacket: 0xffb347, trousers: 0x3b2c1a, boots: 0xf5d58a, visor: 0xffe6a3, pack: 0x8b642d, exhaust: 0xffb347, unlockStars: 145 },
  { id: 'cosmic', name: 'Cosmic Conductor', description: 'A tailcoat stitched with starlight.', jacket: 0x7b62aa, trousers: 0x241d50, boots: 0xffd6a5, visor: 0xffffff, pack: 0x51418a, exhaust: 0xffd6a5, unlockStars: 185 },
  { id: 'jungle', name: 'Jungle Wayfinder', description: 'Leaf-green and ready for ruins.', jacket: 0x7ad06b, trousers: 0x28593b, boots: 0xb7f28a, visor: 0xffd166, pack: 0x4b7a3d, exhaust: 0xb7f28a, unlockStars: 230 },
  { id: 'royal', name: 'Royal Resonator', description: 'Velvet, gold and very serious boots.', jacket: 0xa53b86, trousers: 0x3e1a4b, boots: 0xffe066, visor: 0xffd1ea, pack: 0x6e275e, exhaust: 0xff8ed6, unlockStars: 280 },
  { id: 'ember', name: 'Ember Sprite', description: 'Heat-treated for volcanic vinyl.', jacket: 0xff6b4a, trousers: 0x5c241b, boots: 0xffb347, visor: 0xffd08a, pack: 0x8f3b26, exhaust: 0xff8a3d, unlockStars: 335 },
  { id: 'deepsea', name: 'Abyss Diver', description: 'Pressure-proof and quietly glowing.', jacket: 0x45d9ff, trousers: 0x0b465a, boots: 0x7af5d4, visor: 0xffffff, pack: 0x15617a, exhaust: 0x7af5d4, unlockStars: 395 },
  { id: 'storm', name: 'Storm Rider', description: 'A lightning rod in jacket form.', jacket: 0x7d8dff, trousers: 0x1e2554, boots: 0xfff36e, visor: 0xffffff, pack: 0x47519e, exhaust: 0xfff36e, unlockStars: 460 },
  { id: 'candy', name: 'Candy Cadet', description: 'Bubblegum armour with a sour streak.', jacket: 0xff9fd4, trousers: 0x713462, boots: 0xffe38a, visor: 0xffd1ea, pack: 0xb14d8c, exhaust: 0xffe38a, unlockStars: 530 },
  { id: 'prism', name: 'Prism Pilot', description: 'Catches every beam and throws it back.', jacket: 0x8affc1, trousers: 0x542260, boots: 0xffb7ea, visor: 0xff8ad8, pack: 0x8f3b82, exhaust: 0x8affc1, unlockStars: 605 },
  { id: 'glitch', name: 'Glitch Runner', description: 'The seams are supposed to do that.', jacket: 0x5dffb0, trousers: 0x2b1e3c, boots: 0xff5d8f, visor: 0xffffff, pack: 0x4d2a5c, exhaust: 0xff5d8f, unlockStars: 685 },
  { id: 'soundkeeper', name: 'Soundkeeper', description: 'The old uniform of the machine wardens.', jacket: 0xff7a59, trousers: 0x3d2418, boots: 0xffd58a, visor: 0xffe0a3, pack: 0x8d5d35, exhaust: 0xffb347, unlockStars: 770 },
  { id: 'infinity', name: 'Infinity Maestro', description: 'The final note, worn like a crown.', jacket: 0xffe08a, trousers: 0x30206d, boots: 0xffffff, visor: 0x9bffda, pack: 0x6b4eb5, exhaust: 0xffffff, unlockStars: 860 },
]

export const BOOTS: CosmeticDefinition[] = [
  { id: 'chrome', name: 'Chrome', description: 'Clean, bright and dependable.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xd9e6f2, visor: 0xffffff, pack: 0xffffff, exhaust: 0x9beeff, unlockStars: 0 },
  { id: 'gold', name: 'Gold', description: 'A warm brass shine.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xffd166, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffe066, unlockStars: 0 },
  { id: 'neon', name: 'Neon', description: 'Cyan light behind every rivet.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x5cf2ff, visor: 0xffffff, pack: 0xffffff, exhaust: 0x5cf2ff, unlockStars: 0 },
  { id: 'frost', name: 'Frost', description: 'Cold enough to crack a cymbal.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xd7fbff, visor: 0xffffff, pack: 0xffffff, exhaust: 0x9beeff, unlockStars: 12 },
  { id: 'fire', name: 'Fire', description: 'A furnace in boot form.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff8a3d, visor: 0xffffff, pack: 0xffffff, exhaust: 0xff4d3d, unlockStars: 25 },
  { id: 'rainbow', name: 'Rainbow', description: 'A different colour on every jump.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff7ec4, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffe066, unlockStars: 40 },
  { id: 'lightning', name: 'Lightning', description: 'A static snap with each landing.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xfff36e, visor: 0xffffff, pack: 0xffffff, exhaust: 0xb7a6ff, unlockStars: 60 },
  { id: 'crystal', name: 'Crystal', description: 'Resonant facets, very loud.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xb79cff, visor: 0xffffff, pack: 0xffffff, exhaust: 0xdfcfff, unlockStars: 85 },
  { id: 'space', name: 'Space', description: 'Built for long, quiet arcs.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x5b64d6, visor: 0xffffff, pack: 0xffffff, exhaust: 0xa6c8ff, unlockStars: 115 },
  { id: 'clockwork', name: 'Clockwork', description: 'A tiny escapement in each heel.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xf5d58a, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffb347, unlockStars: 150 },
  { id: 'plasma', name: 'Plasma', description: 'The exhaust hums at a higher pitch.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff5ca8, visor: 0xffffff, pack: 0xffffff, exhaust: 0xff8ed6, unlockStars: 190 },
  { id: 'bubble', name: 'Bubble', description: 'Surprisingly sturdy for soap.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x76e8ff, visor: 0xffffff, pack: 0xffffff, exhaust: 0x9beeff, unlockStars: 235 },
  { id: 'retro', name: 'Retro Pixel', description: 'A deliberate little throwback.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x7ad06b, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffe066, unlockStars: 285 },
  { id: 'royal', name: 'Royal', description: 'Velvet lining and gold toe caps.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xffd166, visor: 0xffffff, pack: 0xffffff, exhaust: 0xff7ec4, unlockStars: 340 },
  { id: 'harmony', name: 'Harmony', description: 'A perfect fifth in every stride.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x9bffda, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffffff, unlockStars: 400 },
  { id: 'emerald', name: 'Emerald', description: 'Green enough to hide in the jungle.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x7aff9a, visor: 0xffffff, pack: 0xffffff, exhaust: 0x5cf2d6, unlockStars: 460 },
  { id: 'sunset', name: 'Sunset', description: 'Orange fading into a soft pink.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff9f68, visor: 0xffffff, pack: 0xffffff, exhaust: 0xff6b9d, unlockStars: 525 },
  { id: 'midnight', name: 'Midnight', description: 'Quiet, dark and hard to see.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x2b1e3c, visor: 0xffffff, pack: 0xffffff, exhaust: 0x63f5ff, unlockStars: 590 },
  { id: 'candy', name: 'Candy', description: 'Glossy enough to stick to a beat.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff9fd4, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffe38a, unlockStars: 660 },
  { id: 'crimson', name: 'Crimson', description: 'A red-hot exhaust plume.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff6b6b, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffa94d, unlockStars: 730 },
  { id: 'teal', name: 'Teal', description: 'Cool, calm and collected.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x45d9c4, visor: 0xffffff, pack: 0xffffff, exhaust: 0x9bffda, unlockStars: 800 },
  { id: 'violet', name: 'Violet', description: 'A purple bloom behind the heel.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xb79cff, visor: 0xffffff, pack: 0xffffff, exhaust: 0xdfcfff, unlockStars: 870 },
  { id: 'copper', name: 'Copper', description: 'Warm metal and a steady thrum.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xc47a3b, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffb347, unlockStars: 940 },
  { id: 'starlight', name: 'Starlight', description: 'Speckled like a clear night sky.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xfff0c2, visor: 0xffffff, pack: 0xffffff, exhaust: 0xc4b5ff, unlockStars: 1010 },
  { id: 'coral', name: 'Coral', description: 'A bright reef-coloured boot.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xff8a80, visor: 0xffffff, pack: 0xffffff, exhaust: 0x9bffda, unlockStars: 1080 },
  { id: 'toxic', name: 'Toxic', description: 'A warning colour with a wink.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x8aff4d, visor: 0xffffff, pack: 0xffffff, exhaust: 0xd4ff6e, unlockStars: 1150 },
  { id: 'obsidian', name: 'Obsidian', description: 'Black glass with a green edge.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x221f2e, visor: 0xffffff, pack: 0xffffff, exhaust: 0x5dffb0, unlockStars: 1220 },
  { id: 'paper', name: 'Paper', description: 'Folded carefully, flown recklessly.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xfff4dc, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffd166, unlockStars: 1290 },
  { id: 'aurora', name: 'Aurora', description: 'A sky caught inside the metal.', jacket: 0xffffff, trousers: 0xffffff, boots: 0x63f5ff, visor: 0xffffff, pack: 0xffffff, exhaust: 0x8affc1, unlockStars: 1360 },
  { id: 'infinity', name: 'Infinity', description: 'The last boot skin. It hums.', jacket: 0xffffff, trousers: 0xffffff, boots: 0xffffff, visor: 0xffffff, pack: 0xffffff, exhaust: 0xffe08a, unlockStars: 1440 },
]

export const OUTFIT_BY_ID = new Map(OUTFITS.map((item) => [item.id, item]))
export const BOOT_BY_ID = new Map(BOOTS.map((item) => [item.id, item]))

export function unlockedOutfits(stars: number): string[] {
  return OUTFITS.filter((item) => item.unlockStars <= stars).map((item) => item.id)
}

export function unlockedBoots(stars: number): string[] {
  return BOOTS.filter((item) => item.unlockStars <= stars).map((item) => item.id)
}
