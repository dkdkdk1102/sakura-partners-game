/* ssongs.js — chiptune patterns for the shooter (same Audio2 step-sequencer).
   Faster tempos and driving basslines for a shmup feel. */

const SSONGS = {
  title: {
    bpm: 112, leadType: 'square', bassType: 'triangle', leadLen: 1.8,
    lead: [76, 0, 0, 79, 83, 0, 0, 0, 81, 0, 79, 0, 76, 0, 0, 0,
           74, 0, 0, 76, 79, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0],
    bass: [40, 0, 47, 0, 45, 0, 47, 0, 43, 0, 50, 0, 47, 0, 43, 0],
    arp: [64, 67, 71, 76],
  },
  sky: { // stage 1-2 — fast and bright
    bpm: 156, leadType: 'square', bassType: 'square', leadLen: 1.4,
    lead: [76, 0, 76, 79, 81, 0, 79, 0, 83, 0, 81, 79, 76, 0, 74, 0,
           72, 0, 72, 76, 79, 0, 76, 0, 81, 79, 76, 74, 72, 0, 0, 0],
    bass: [40, 40, 0, 40, 43, 43, 0, 43, 45, 45, 0, 45, 47, 0, 43, 0],
    arp: [64, 67, 72, 76],
  },
  night: { // stage 3 — driving but moodier
    bpm: 148, leadType: 'sawtooth', bassType: 'triangle', leadLen: 1.4,
    lead: [74, 0, 74, 77, 81, 0, 77, 0, 79, 0, 76, 0, 74, 0, 72, 0,
           70, 0, 70, 74, 77, 0, 74, 0, 76, 0, 72, 0, 70, 0, 0, 0],
    bass: [38, 38, 0, 38, 41, 41, 0, 41, 43, 43, 0, 43, 36, 0, 41, 0],
    arp: [62, 65, 69, 74],
  },
  boss: {
    bpm: 168, leadType: 'sawtooth', bassType: 'square', leadLen: 1.2,
    lead: [67, 0, 67, 68, 67, 0, 63, 0, 65, 0, 65, 66, 65, 0, 62, 0,
           67, 0, 70, 0, 73, 0, 70, 67, 68, 0, 66, 0, 63, 0, 0, 0],
    bass: [43, 43, 0, 43, 43, 0, 41, 41, 44, 44, 0, 44, 39, 39, 0, 39],
    arp: [55, 58, 61, 63],
  },
  clear: {
    bpm: 120, leadType: 'triangle', bassType: 'sine', leadLen: 2.0,
    lead: [72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 0, 0,
           77, 0, 81, 0, 84, 0, 81, 0, 79, 0, 0, 0, 0, 0, 0, 0],
    bass: [48, 0, 0, 0, 53, 0, 0, 0, 50, 0, 0, 0, 43, 0, 0, 0],
    arp: [60, 64, 67, 72],
  },
};

window.SSONGS = SSONGS;
