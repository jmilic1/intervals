
<script lang="ts">
    import { ANSWERS, CATEGORIES, RARE_CHANCE, type AnswerId, type Category } from './intervals';
    import { RECORDED_NOTES, noteSource } from './piano';

    interface Props {
        // The current question, or null when there isn't one.
        // rare is only set in compare mode.
        question: {
            answer: AnswerId;
            bottom: number;
            top: number;
            category: Category;
            rare?: boolean;
        } | null;
        // What happened the last time a sound was played.
        status: string;
    }

    let { question, status }: Props = $props();

    const answer = $derived(question ? ANSWERS.find((a) => a.id === question.answer) : undefined);

    // noteSource() is the same function playback uses, so this always matches
    // what was actually played.
    const notes = $derived(
        question
            ? [
                { label: 'Lower note', source: noteSource(question.bottom) },
                { label: 'Higher note', source: noteSource(question.top) },
            ]
            : [],
    );

    // "Melodic descending: higher note first, then lower" etc.
    const order = $derived.by(() => {
        if (!question) return '';
        const label = CATEGORIES.find((c) => c.id === question.category)?.label;
        if (question.category === 'descending') return `${label}: higher note first, then lower`;
        if (question.category === 'harmonic') return `${label}: both notes at the same time`;
        return `${label}: lower note first, then higher`;
    });

    // In compare mode: "1 in 6" for the rare interval, "5 in 6" for the other.
    const odds = Math.round(1 / RARE_CHANCE);

    const hz = (f: number) => `${f.toFixed(2)} Hz`;
    const semitones = (n: number) => `${n} ${n === 1 ? 'semitone' : 'semitones'}`;
    // 1 -> "1", -2 -> "−2" (with a real minus sign)
    const signed = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
</script>

<section class="debug" aria-labelledby="debug-heading">
    <h2 id="debug-heading">Sound debug</h2>

    <dl>
        <dt>Interval</dt>
        <dd>
            {#if answer}
                <p><strong>{answer.name}</strong> ({answer.id}), {semitones(answer.semitones)}</p>
                <p>{order}</p>
                {#if question?.rare === true}
                    <p>Compare mode: the rare one, chosen 1 in {odds} times</p>
                {:else if question?.rare === false}
                    <p>Compare mode: the common one, chosen {odds - 1} in {odds} times</p>
                {/if}
            {:else}
                <p>None yet. Press re(Play).</p>
            {/if}
        </dd>

        {#each notes as { label, source } (label)}
            <dt>{label}</dt>
            <dd>
                {#if !source}
                    <p>No recordings found, so nothing can play.</p>
                {:else}
                    <p><strong>{source.name}</strong>, MIDI {source.note}, {hz(source.frequency)}</p>
                    {#if source.shift === 0}
                        <p>Played straight from <code>{source.file}</code> at normal speed</p>
                    {:else}
                        <p>
                            No recording of {source.name}. Made from <code>{source.file}</code>
                            ({source.recordedName}, {hz(source.recordedFrequency)})
                        </p>
                        <p>
                            Shifted {source.shift > 0 ? 'up' : 'down'} {semitones(Math.abs(source.shift))}:
                            played at 2^({signed(source.shift)}/12) = {source.rate.toFixed(4)}× speed
                        </p>
                        <p>{hz(source.recordedFrequency)} × {source.rate.toFixed(4)} ≈ {hz(source.frequency)}</p>
                    {/if}
                {/if}
            </dd>
        {/each}

        <dt>Sound</dt>
        <dd class:error={status.startsWith('Error')}><p>{status}</p></dd>

        <dt>Recordings</dt>
        <dd><p>{RECORDED_NOTES.length} vH files found in src/assets/piano</p></dd>
    </dl>

    <p class="note">
        Shown because the address ends in ?debug. Frequencies assume standard tuning (A4 = 440 Hz).
    </p>
</section>

<style>
    /* Dashed border: a developer tool, not part of the trainer itself. */
    .debug {
        display: grid;
        gap: 12px;
        padding: 16px 18px;
        background: var(--key);
        border: 1px dashed var(--line-strong);
        border-radius: 8px;
        font-size: 0.875rem;
        line-height: 1.45;
    }

    h2 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
    }

    /* Labels on the left, values on the right. */
    dl {
        display: grid;
        grid-template-columns: 7rem 1fr;
        gap: 12px 16px;
        margin: 0;
    }

    dt {
        color: var(--ink-soft);
    }

    dd {
        display: grid;
        gap: 2px;
        min-width: 0;
        margin: 0;
        font-variant-numeric: tabular-nums;
    }

    dd p {
        margin: 0;
    }

    strong {
        font-weight: 600;
    }

    code {
        padding: 1px 5px;
        background: var(--paper);
        border-radius: 4px;
        font-size: 0.8125rem;
        overflow-wrap: anywhere;
    }

    .error {
        color: var(--wrong-text);
        font-weight: 500;
    }

    .note {
        margin: 0;
        color: var(--ink-soft);
        font-size: 0.8125rem;
    }

    /* On phones, each label sits above its value. */
    @media (max-width: 480px) {
        dl {
            grid-template-columns: 1fr;
            gap: 2px;
        }
        dd + dt {
            margin-top: 10px;
        }
    }
</style>
