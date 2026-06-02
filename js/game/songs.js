/* songs.js — tiny chiptune patterns for the step-sequencer in audio.js. Each is
   a loop of 16th-note MIDI numbers (0 = rest) for lead and bass. Cheerful, light,
   suitable for a waiting room. Themes map to a song; plus title and victory. */

const SONGS = {
  // bright & bouncy — used for spring/grassy stages & default
  field: {
    bpm: 132, leadType: 'square', bassType: 'triangle', leadLen: 1.6,
    lead: [76, 0, 79, 0, 81, 0, 79, 76, 74, 0, 76, 0, 72, 0, 0, 0,
           77, 0, 81, 0, 84, 0, 81, 77, 79, 0, 76, 0, 74, 0, 0, 0],
    bass: [40, 0, 47, 0, 45, 0, 47, 0, 43, 0, 50, 0, 41, 0, 48, 0],
    arp: [64, 67, 72, 76],
  },
  // breezy seaside
  coast: {
    bpm: 120, leadType: 'triangle', bassType: 'sine', leadLen: 1.8,
    lead: [72, 0, 0, 74, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 69, 0,
           71, 0, 0, 74, 76, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0],
    bass: [36, 0, 43, 0, 41, 0, 43, 0, 38, 0, 45, 0, 40, 0, 47, 0],
    arp: [60, 64, 67, 72],
  },
  // calm mountain
  mountain: {
    bpm: 108, leadType: 'triangle', bassType: 'triangle', leadLen: 2.0,
    lead: [69, 0, 0, 0, 72, 0, 74, 0, 76, 0, 0, 74, 72, 0, 69, 0,
           71, 0, 0, 0, 74, 0, 72, 0, 69, 0, 0, 0, 67, 0, 0, 0],
    bass: [45, 0, 52, 0, 50, 0, 45, 0, 43, 0, 50, 0, 47, 0, 43, 0],
    arp: [57, 60, 64, 69],
  },
  // lively festive town (evening onsen)
  town: {
    bpm: 126, leadType: 'square', bassType: 'triangle', leadLen: 1.5,
    lead: [81, 0, 79, 76, 79, 0, 81, 0, 84, 0, 81, 79, 76, 0, 0, 0,
           77, 0, 79, 81, 83, 0, 81, 0, 79, 0, 76, 0, 79, 0, 0, 0],
    bass: [41, 0, 48, 0, 43, 0, 50, 0, 45, 0, 52, 0, 40, 0, 47, 0],
    arp: [65, 69, 72, 77],
  },
  // tense boss
  boss: {
    bpm: 150, leadType: 'sawtooth', bassType: 'square', leadLen: 1.2,
    lead: [64, 0, 64, 65, 64, 0, 60, 0, 62, 0, 62, 63, 62, 0, 59, 0,
           64, 0, 67, 0, 70, 0, 67, 64, 65, 0, 63, 0, 60, 0, 0, 0],
    bass: [40, 40, 0, 40, 40, 0, 38, 38, 41, 41, 0, 41, 36, 36, 0, 36],
    arp: [52, 55, 58, 60],
  },
  // gentle title
  title: {
    bpm: 100, leadType: 'triangle', bassType: 'sine', leadLen: 2.2,
    lead: [72, 0, 0, 0, 76, 0, 0, 0, 79, 0, 76, 0, 74, 0, 0, 0,
           71, 0, 0, 0, 74, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0],
    bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 50, 0, 0, 0],
    arp: [60, 64, 67, 72],
  },
};

const THEME_SONG = { spring: 'field', mountain: 'mountain', coast: 'coast', volcano: 'field', town: 'town' };

window.SONGS = SONGS; window.THEME_SONG = THEME_SONG;
