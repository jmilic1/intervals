// Plays piano notes from the recordings in src/assets/piano.
//
// File names look like "Ds5vH.wav": the note (s = sharp, so Ds = D#), its
// octave, then which recording it is. vH = key played hard (loud, bright),
// vL = played softly. The files must use "s" rather than "#", because Vite
// can't import a file with "#" in its name.
//
// Only the vH recordings are used, so every note has the same loudness and
// tone. They only exist for some notes (C, D#, F#, A and B in most octaves).
// Any other note is made by playing the nearest vH recording a little faster
// or slower, which raises or lowers its pitch.

// ---------- Note names and MIDI numbers ----------
// Every piano key gets a number: middle C (C4) is 60, and each semitone
// up adds 1. That turns "go up a major third" into "add 4".

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** "D#5" -> 75 */
export function noteToMidi(note: string): number {
    const match = /^([A-G]#?)(\d)$/.exec(note);
    if (!match) throw new Error(`Not a note name: ${note}`);
    const [, pitch, octave] = match;
    return (Number(octave) + 1) * 12 + NOTE_NAMES.indexOf(pitch);
}

/** 75 -> "D#5" */
export function midiToNote(midi: number): string {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

/** Each semitone multiplies the frequency by the 12th root of 2, so
 *  playing a recording this much faster shifts it up by that many semitones. */
export function playbackRate(note: number, recorded: number): number {
    return 2 ** ((note - recorded) / 12);
}

// ---------- Settings ----------

const NOTE_LENGTH = 1.4; // seconds each note rings before fading out
const NOTE_GAP = 0.8; // seconds between the first and second note
const VOLUME = 0.7; // 0 to 1, leaves headroom when both notes overlap

// ---------- The recordings ----------

// Vite finds every .wav in the folder at build time and gives us a URL
// for each one, e.g. { "../assets/piano/Ds5vH.wav": "/assets/Ds5vH-1a2b3c.wav" }.
const files = import.meta.glob('../assets/piano/*.wav', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

// MIDI number -> URL of its vH recording. vL files are skipped.
const recordings = new Map<number, string>();
for (const [path, url] of Object.entries(files)) {
    // "Ds5vH.wav" -> letter D, sharp, octave 5
    const match = /([A-G])(s?)(\d)vH\.wav$/.exec(path);
    if (!match) continue;
    const [, letter, sharp, octave] = match;
    recordings.set(noteToMidi(letter + (sharp ? '#' : '') + octave), url);
}

/** MIDI numbers of every note with a vH recording, low to high. */
export const RECORDED_NOTES = [...recordings.keys()].sort((a, b) => a - b);

/** The vH recordings in octave 5 (C4, D#4, F#4, A4, B4), used as the
 *  bottom note of each interval. */
export const ROOT_NOTES = RECORDED_NOTES.filter((midi) => midiToNote(midi).endsWith('4'));

/** The vH recording closest to `note`. That's the one we pitch-shift.
 *  Notes that only have a vL recording (like C4) get a neighbor's vH
 *  recording, shifted. */
export function nearestRecording(note: number): number {
    let best = RECORDED_NOTES[0];
    for (const recorded of RECORDED_NOTES) {
        if (Math.abs(recorded - note) < Math.abs(best - note)) best = recorded;
    }
    return best;
}

// ---------- Web Audio ----------

let context: AudioContext | undefined;
let output: GainNode;

// Created on first use. Browsers only let a page make sound after the user
// clicks something, so this should first run inside a click handler.
function audio(): AudioContext {
    if (!context) {
        context = new AudioContext();
        output = context.createGain();
        output.gain.value = VOLUME;
        output.connect(context.destination);
    }
    return context;
}

// Decoded recordings, so each file is only downloaded once.
const buffers = new Map<number, Promise<AudioBuffer>>();

function load(recorded: number): Promise<AudioBuffer> {
    let buffer = buffers.get(recorded);
    if (!buffer) {
        buffer = fetch(recordings.get(recorded)!)
            .then((response) => response.arrayBuffer())
            .then((data) => audio().decodeAudioData(data))
            .catch((error) => {
                buffers.delete(recorded); // allow a retry next time
                throw error;
            });
        buffers.set(recorded, buffer);
    }
    return buffer;
}

/** Start downloading the recordings needed for notes `from` to `to`
 *  (MIDI numbers), so later questions play without waiting. */
export function preload(from: number, to: number): void {
    for (let note = from; note <= to; note++) {
        if (RECORDED_NOTES.length) load(nearestRecording(note)).catch(() => {});
    }
}

// Notes that are currently sounding, so a new interval can silence them.
let sounding: { source: AudioBufferSourceNode; gain: GainNode }[] = [];

function playNote(note: number, when: number, recorded: number, buffer: AudioBuffer) {
    const ctx = audio();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate(note, recorded);

    // Let the note ring, then fade it out smoothly. Cutting it off
    // abruptly would make a click.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, when + NOTE_LENGTH);
    gain.gain.setTargetAtTime(0, when + NOTE_LENGTH, 0.2);

    source.connect(gain).connect(output);
    source.start(when);
    source.stop(when + NOTE_LENGTH + 1.5);

    const voice = { source, gain };
    sounding.push(voice);
    source.onended = () => {
        sounding = sounding.filter((v) => v !== voice);
    };
}

let latest = 0; // which play request is the newest

/** Quickly fade out anything still playing, and cancel any interval
 *  that's still loading so it doesn't start playing afterwards. */
export function stopAll(): void {
    latest++;
    if (!context) return;
    const now = context.currentTime;
    for (const { source, gain } of sounding) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.setTargetAtTime(0, now, 0.03);
        source.stop(now + 0.2);
    }
    sounding = [];
}

/** Play `bottom`, then `top` (MIDI numbers), one after the other. */
export async function playInterval(bottom: number, top: number): Promise<void> {
    if (RECORDED_NOTES.length === 0) {
        console.warn('No piano recordings found in src/assets/piano');
        return;
    }
    const ctx = audio();
    const request = ++latest;
    if (ctx.state !== 'running') await ctx.resume();

    const bottomRecording = nearestRecording(bottom);
    const topRecording = nearestRecording(top);
    const [bottomBuffer, topBuffer] = await Promise.all([load(bottomRecording), load(topRecording)]);

    // If another interval was requested while these were loading, let that one play instead.
    if (request !== latest) return;

    stopAll();
    const start = ctx.currentTime + 0.05;
    playNote(bottom, start, bottomRecording, bottomBuffer);
    playNote(top, start + NOTE_GAP, topRecording, topBuffer);
}
