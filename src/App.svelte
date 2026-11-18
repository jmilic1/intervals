
<script lang="ts">
  import IntervalFilters from './lib/IntervalFilters.svelte';
  import AnswerPad from './lib/AnswerPad.svelte';
  import SoundDebug from './lib/SoundDebug.svelte';
  import {
    ANSWERS,
    FAMILIES,
    PAIRS,
    pickFromPair,
    type AnswerId,
    type FamilyId,
    type Feedback,
    type PairId,
  } from './lib/intervals';
  import { ROOT_NOTES, playInterval, preload, stopAll } from './lib/piano';

  type Phase = 'idle' | 'asking' | 'answered';

  // The interval currently being asked. Notes are MIDI numbers (C4 = 60).
  interface Question {
    answer: AnswerId;
    bottom: number;
    top: number;
    // Compare mode only: whether this is the rare interval of the pair.
    rare?: boolean;
  }

  // Every family starts switched on.
  let enabled = $state(
          Object.fromEntries(FAMILIES.map((f) => [f.id, true])) as Record<FamilyId, boolean>,
  );
  let phase = $state<Phase>('idle');
  let question = $state<Question | null>(null);
  let feedback = $state<Feedback | null>(null);

  // Compare mode: which pair is on (null = off), and which of its two
  // intervals is the rare one.
  let pair = $state<PairId | null>(null);
  let rare = $state<AnswerId>('m2');
  // The family filters from before compare mode, brought back when it's turned off.
  let savedEnabled: Record<FamilyId, boolean> | null = null;

  const activePair = $derived(PAIRS.find((p) => p.id === pair));

  // The intervals that can come up (and be answered) right now.
  const allowed = $derived<AnswerId[]>(
          activePair ? activePair.answers : ANSWERS.filter((a) => enabled[a.family]).map((a) => a.id),
  );
  const anyEnabled = $derived(allowed.length > 0);

  // The sound debug panel only shows when the address ends in ?debug,
  // e.g. http://localhost:5173/?debug
  const debug = new URLSearchParams(location.search).has('debug');

  // What happened the last time we tried to play, for the debug panel.
  let soundStatus = $state('Nothing played yet');
  let playCount = 0;

  async function play(bottom: number, top: number) {
    const id = ++playCount;
    soundStatus = 'Loading recordings…';
    try {
      const played = await playInterval(bottom, top);
      if (id === playCount) soundStatus = played ? 'Played' : 'Stopped before it started';
    } catch (error) {
      console.error(error);
      if (id === playCount) soundStatus = `Error: ${error instanceof Error ? error.message : error}`;
    }
  }

  // Back to the start: no question, no feedback, sound stopped. The answer
  // buttons stay disabled until re(Play) asks a new question.
  function forgetQuestion() {
    stopAll();
    question = null;
    feedback = null;
    phase = 'idle';
  }

  // Turning on a regular filter leaves compare mode. Its filters are all
  // off at that point, so only the one you clicked ends up on.
  function toggleFamily(id: FamilyId) {
    pair = null;
    savedEnabled = null;
    enabled[id] = !enabled[id];
    forgetQuestion();
  }

  function setAll(on: boolean) {
    pair = null;
    savedEnabled = null;
    for (const f of FAMILIES) enabled[f.id] = on;
    forgetQuestion();
  }

  // Clicking one side of a pair's two-way switch makes that interval the
  // rare one and turns compare mode on for that pair, turning the other
  // switches and all regular filters off. Clicking the highlighted side
  // again turns compare mode off and brings the regular filters back.
  function chooseCompare(pairId: PairId, rareId: AnswerId) {
    if (pair === pairId && rare === rareId) {
      pair = null;
      if (savedEnabled) Object.assign(enabled, savedEnabled);
      savedEnabled = null;
    } else {
      if (pair === null) savedEnabled = { ...enabled };
      pair = pairId;
      rare = rareId;
      for (const f of FAMILIES) enabled[f.id] = false;
    }
    forgetQuestion();
  }

  function randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  // The last interval and bottom note that were asked. Kept even when a
  // filter change forgets the question, so the very next one still differs.
  let previous: { answer: AnswerId; bottom: number } | null = null;

  // Picks the interval (in compare mode: the rare one 1 in 6 times, otherwise
  // any allowed interval) and a random bottom note from the root octave
  // (see ROOT_OCTAVE in piano.ts), then plays them going up.
  function nextQuestion() {
    const id = activePair ? pickFromPair(activePair, rare) : randomItem(allowed);
    const answer = ANSWERS.find((a) => a.id === id)!;

    // Never the same interval on the same note twice in a row: if the
    // interval is the same as last time, start it on a different note.
    // The interval itself is still picked freely, so the 1-in-6 odds in
    // compare mode don't change.
    const notes =
            previous?.answer === id && ROOT_NOTES.length > 1
                    ? ROOT_NOTES.filter((note) => note !== previous!.bottom)
                    : ROOT_NOTES;
    const bottom = randomItem(notes);
    previous = { answer: id, bottom };

    question = {
      answer: answer.id,
      bottom,
      top: bottom + answer.semitones,
      rare: activePair ? answer.id === rare : undefined,
    };
    feedback = null;
    phase = 'asking';

    play(question.bottom, question.top);
    // Fetch the rest of the recordings in the background (up to an octave
    // above the highest bottom note), so the next questions play right away.
    preload(ROOT_NOTES[0], ROOT_NOTES[ROOT_NOTES.length - 1] + 12);
  }

  function replay() {
    if (question) play(question.bottom, question.top);
  }

  function pick(id: AnswerId) {
    if (phase !== 'asking' || question === null) return;
    feedback = { picked: id, correct: question.answer };
    phase = 'answered';
  }

</script>

<main class="app">

  <!-- Filter on the left, then Start (or Replay / Next interval) beside it. -->
  <div class="toolbar">
    <IntervalFilters
            {enabled}
            {pair}
            {rare}
            ontoggle={toggleFamily}
            onsetall={setAll}
            oncompare={chooseCompare}
    />

    <div class="actions">
      <button
              type="button"
              class="action"
              disabled={!anyEnabled}
              aria-describedby={anyEnabled ? undefined : 'start-hint'}
              onclick={phase === 'asking' ? replay : nextQuestion}
      >
        <svg class="icon" viewBox="0 0 16 16" aria-hidden="true">
          <path class="fill" d="M4.5 2.75v10.5L13 8z" />
        </svg>
        {'re(Play)'}
      </button>
    </div>

    {#if !anyEnabled}
      <p id="start-hint" class="hint">Turn on at least one interval to start.</p>
    {/if}
  </div>

  <section class="trainer" aria-label="Practice">
    <p class="status" aria-live="polite">{status}</p>

    <AnswerPad {allowed} {phase} {feedback} onpick={pick} />
  </section>

  {#if debug}
    <SoundDebug {question} status={soundStatus} />
  {/if}
</main>

<style>
  .app {
    max-width: 760px;
    margin: 0 auto;
    padding-block: 40px 56px;
    display: grid;
    gap: 28px;
  }

  header {
    display: grid;
    gap: 6px;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 6vw, 2.75rem);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.025em;
    text-wrap: balance;
  }

  .lede {
    margin: 0;
    color: var(--ink-soft);
    font-size: 1.0625rem;
  }

  .trainer {
    display: grid;
    gap: 18px;
  }

  /* One row: Filter, Start, and the hint when nothing is turned on.
     Wraps onto a second line on narrow screens. */
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 12px;
  }

  .status {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .actions {
    display: flex;
    gap: 10px;
  }

  /* Start / Replay / Next interval, styled as items like everything else.
     Same height as the Filter button. */
  .action {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 14px 9px 12px;
    background: var(--key);
    color: var(--ink);
    border: 1px solid var(--item-border);
    border-radius: 5px;
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1;
    user-select: none;
    cursor: pointer;
    transition:
            background-color 150ms linear,
            border-color 150ms linear;
  }

  .action:not(:disabled):hover {
    background: var(--item-hover);
    border-color: var(--item-hover-border);
  }

  .action:disabled {
    background: transparent;
    border-style: dashed;
    color: var(--ink-soft);
    cursor: not-allowed;
  }

  .action:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .icon {
    width: 14px;
    height: 14px;
    flex: none;
  }

  .icon .fill {
    fill: currentColor;
  }

  .icon .stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .hint {
    margin: 0;
    color: var(--wrong-text);
    font-size: 0.9375rem;
    font-weight: 500;
  }
</style>
 