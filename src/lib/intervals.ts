
// The interval data the UI is built from.
// Families are what the filter buttons turn on and off.
// Answers are the buttons the user picks from after hearing an interval.

export type FamilyId =
    | 'unison'
    | 'seconds'
    | 'thirds'
    | 'fourth'
    | 'tritone'
    | 'fifth'
    | 'sixths'
    | 'sevenths'
    | 'octave';

export interface Family {
    id: FamilyId;
    label: string;
}

export const FAMILIES: Family[] = [
    { id: 'unison', label: 'Unison' },
    { id: 'seconds', label: 'Seconds' },
    { id: 'thirds', label: 'Thirds' },
    { id: 'fourth', label: 'Perfect fourth' },
    { id: 'tritone', label: 'Tritone' },
    { id: 'fifth', label: 'Perfect fifth' },
    { id: 'sixths', label: 'Sixths' },
    { id: 'sevenths', label: 'Sevenths' },
    { id: 'octave', label: 'Octave' },
];

// The id doubles as the short symbol shown on each answer button.
export type AnswerId =
    | 'P1' | 'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'TT'
    | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'P8';

export interface Answer {
    id: AnswerId;
    name: string;
    semitones: number;
    family: FamilyId;
}

// Ordered by size, from unison (0 semitones) to octave (12).
export const ANSWERS: Answer[] = [
    { id: 'P1', name: 'Unison', semitones: 0, family: 'unison' },
    { id: 'm2', name: 'Minor second', semitones: 1, family: 'seconds' },
    { id: 'M2', name: 'Major second', semitones: 2, family: 'seconds' },
    { id: 'm3', name: 'Minor third', semitones: 3, family: 'thirds' },
    { id: 'M3', name: 'Major third', semitones: 4, family: 'thirds' },
    { id: 'P4', name: 'Perfect fourth', semitones: 5, family: 'fourth' },
    { id: 'TT', name: 'Tritone', semitones: 6, family: 'tritone' },
    { id: 'P5', name: 'Perfect fifth', semitones: 7, family: 'fifth' },
    { id: 'm6', name: 'Minor sixth', semitones: 8, family: 'sixths' },
    { id: 'M6', name: 'Major sixth', semitones: 9, family: 'sixths' },
    { id: 'm7', name: 'Minor seventh', semitones: 10, family: 'sevenths' },
    { id: 'M7', name: 'Major seventh', semitones: 11, family: 'sevenths' },
    { id: 'P8', name: 'Octave', semitones: 12, family: 'octave' },
];

// How the two notes of an interval are played.
// Melodic: one after the other, going up (ascending) or down (descending).
// Harmonic: both at the same time.
export type Category = 'ascending' | 'descending' | 'harmonic';

export const CATEGORIES: { id: Category; label: string }[] = [
    { id: 'ascending', label: 'Ascending' },
    { id: 'descending', label: 'Descending' },
    { id: 'harmonic', label: 'Harmonic' },
];

// What the user picked and what the right answer was.
// The answer buttons use this to decide which ones flash and in which color.
export interface Feedback {
    picked: AnswerId;
    correct: AnswerId;
}

export function answerName(id: AnswerId): string {
    return ANSWERS.find((a) => a.id === id)?.name ?? id;
}

// ---------- Compare two ----------
// Pairs of intervals that sound alike. In compare mode only the pair is
// played: one interval most of the time, and the "rare" one now and then,
// so you learn to hear when the interval changes.

export type PairId = 'seconds' | 'thirds' | 'fourth-fifth' | 'sixths' | 'sevenths';

export interface Pair {
    id: PairId;
    label: string;
    answers: [AnswerId, AnswerId];
}

export const PAIRS: Pair[] = [
    { id: 'seconds', label: 'Minor / major second', answers: ['m2', 'M2'] },
    { id: 'thirds', label: 'Minor / major third', answers: ['m3', 'M3'] },
    { id: 'fourth-fifth', label: 'Perfect fourth / fifth', answers: ['P4', 'P5'] },
    { id: 'sixths', label: 'Minor / major sixth', answers: ['m6', 'M6'] },
    { id: 'sevenths', label: 'Minor / major seventh', answers: ['m7', 'M7'] },
];

/** The rare interval comes up 1 time for every 5 times of the other one,
 *  so 1 in 6 questions. */
export const RARE_CHANCE = 1 / 6;

/** Picks the interval for one question in compare mode. */
export function pickFromPair(pair: Pair, rare: AnswerId, random: () => number = Math.random): AnswerId {
    const common = pair.answers[0] === rare ? pair.answers[1] : pair.answers[0];
    return random() < RARE_CHANCE ? rare : common;
}
 