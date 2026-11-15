<script lang="ts">
  import IntervalFilters from './lib/IntervalFilters.svelte';
  import AnswerPad from './lib/AnswerPad.svelte';
  import {
    ANSWERS,
    FAMILIES,
    answerName,
    type AnswerId,
    type FamilyId,
    type Feedback,
  } from './lib/intervals';
  import { ROOT_NOTES, playInterval, preload, stopAll } from './lib/piano';

  type Phase = 'idle' | 'asking' | 'answered';

  // The interval currently being asked. Notes are MIDI numbers (C4 = 60).
  interface Question {
    answer: AnswerId;
    bottom: number;
    top: number;
  }

  // Every family starts switched on.
  let enabled = $state(
          Object.fromEntries(FAMILIES.map((f) => [f.id, true])) as Record<FamilyId, boolean>,
  );
  let phase = $state<Phase>('idle');
  let question = $state<Question | null>(null);
  let feedback = $state<Feedback | null>(null);

  const anyEnabled = $derived(FAMILIES.some((f) => enabled[f.id]));

  // Back to the start: no question, no feedback, sound stopped. The answer
  // buttons stay disabled until re(Play) asks a new question.
  function forgetQuestion() {
    stopAll();
    question = null;
    feedback = null;
    phase = 'idle';
  }

  function toggleFamily(id: FamilyId) {
    enabled[id] = !enabled[id];
    forgetQuestion();
  }

  function setAll(on: boolean) {
    for (const f of FAMILIES) enabled[f.id] = on;
    forgetQuestion();
  }

  function randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  // Picks a random interval from the enabled families and a random bottom
  // note from the octave-5 recordings, then plays them going up.
  function nextQuestion() {
    const answer = randomItem(ANSWERS.filter((a) => enabled[a.family]));
    const bottom = randomItem(ROOT_NOTES);
    question = { answer: answer.id, bottom, top: bottom + answer.semitones };
    feedback = null;
    phase = 'asking';

    playInterval(question.bottom, question.top);
    // Fetch the rest of the recordings in the background (up to an octave
    // above the highest bottom note), so the next questions play right away.
    preload(ROOT_NOTES[0], ROOT_NOTES[ROOT_NOTES.length - 1] + 12);
  }

  function replay() {
    if (question) playInterval(question.bottom, question.top);
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
    <IntervalFilters {enabled} ontoggle={toggleFamily} onsetall={setAll} />

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

    <AnswerPad {enabled} {phase} {feedback} onpick={pick} />
  </section>
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
