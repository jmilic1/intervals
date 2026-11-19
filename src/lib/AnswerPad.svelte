
<script lang="ts">
    import { ANSWERS, type AnswerId, type Feedback } from './intervals';

    interface Props {
        // The answers that can come up right now. The rest are disabled.
        allowed: AnswerId[];
        phase: 'idle' | 'asking' | 'answered';
        feedback: Feedback | null;
        onpick: (id: AnswerId) => void;
        // Called when the flash on the picked button has finished.
        onflashend: () => void;
    }

    let { allowed, phase, feedback, onpick, onflashend }: Props = $props();

    // Laid out 5 / 3 / 5. The middle row holds the fourth, tritone and fifth,
    // and the tritone (6 semitones) lands in the exact center, just like it
    // sits in the exact middle of the octave.
    const rows = [ANSWERS.slice(0, 5), ANSWERS.slice(5, 8), ANSWERS.slice(8)];

    // Which flash animation (if any) a button should play.
    function flashClass(id: AnswerId): string {
        if (!feedback) return '';
        const { picked, correct } = feedback;
        if (id === picked && picked === correct) return 'flash-correct';
        if (id === picked) return 'flash-wrong';
        if (id === correct) return 'flash-reveal';
        return '';
    }
</script>

<div class="pad" class:asking={phase === 'asking'} role="group" aria-label="Answers">
    {#each rows as row, i (i)}
        <div class="row">
            {#each row as answer (answer.id)}
                <button
                        type="button"
                        class="item {flashClass(answer.id)}"
                        disabled={phase === 'idle' || !allowed.includes(answer.id)}
                        aria-disabled={phase === 'answered'}
                        onclick={() => onpick(answer.id)}
                        onanimationend={() => {
                            // Only the picked button reports, so a wrong answer
                            // (two buttons flashing) still counts once.
                            if (answer.id === feedback?.picked) onflashend();
                        }}
                >
                    <span class="name">{answer.name}</span>
                    <!-- Shown above the button on hover (or keyboard focus). -->
                    <span class="tip">
                        {answer.semitones} {answer.semitones === 1 ? 'semitone' : 'semitones'}
                    </span>
                </button>
            {/each}
        </div>
    {/each}
</div>

<style>
    .pad {
        display: grid;
        gap: 10px;
    }

    /* Items are as wide as their text, centered in each row, and wrap
       onto another line when the screen is too narrow. */
    .row {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
    }

    /* An "item": white, thin grey border, small radius, the symbol where
       Infinite Craft puts its emoji, then the name. */
    .item {
        position: relative; /* the tip is positioned against the button */
        display: inline-flex;
        align-items: baseline;
        gap: 7px;
        padding: 12px 14px 11px;
        background: var(--key);
        color: var(--ink);
        border: 1px solid var(--item-border);
        border-radius: 5px;
        font: inherit;
        font-size: 1rem;
        line-height: 1;
        white-space: nowrap;
        user-select: none;
        cursor: default;
        transition:
                background-color 150ms linear,
                border-color 150ms linear;
    }

    .symbol {
        font-size: 0.875rem;
        font-weight: 700;
        opacity: 0.5;
    }

    /* Only clickable-looking while waiting for an answer. */
    .asking .item:not(:disabled) {
        cursor: pointer;
    }

    .asking .item:not(:disabled):hover {
        background: var(--item-hover);
        border-color: var(--item-hover-border);
    }

    /* Fade the label and border rather than the whole button, so the
       semitone tip stays readable on disabled buttons too. */
    .item:disabled .name {
        opacity: 0.4;
    }

    .item:disabled {
        background: transparent;
        border-color: var(--line);
    }

    .item:focus-visible {
        outline: 2px solid var(--focus);
        outline-offset: 2px;
    }

    /* Semitone tip: a small dark label centered above the button,
       hidden until hover. No delay and no fade, so it shows immediately.
       pointer-events: none lets the mouse pass through it to the
       buttons in the row above. */
    .tip {
        position: absolute;
        bottom: calc(100% + 7px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 5;
        padding: 5px 8px;
        background: var(--ink);
        color: var(--on-ink);
        border-radius: 5px;
        font-size: 0.8125rem;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
        pointer-events: none;
        visibility: hidden;
    }

    /* The little arrow under the tip, pointing at the button. */
    .tip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border: 5px solid transparent;
        border-top-color: var(--ink);
    }

    /* Only on devices with a real mouse, so it doesn't get stuck on
       after tapping on a phone. Keyboard focus shows it everywhere. */
    @media (hover: hover) {
        .item:hover .tip {
            visibility: visible;
        }
    }

    .item:focus-visible .tip {
        visibility: visible;
    }

    /* Feedback: each flash starts in its color and fades back to the normal item. */
    .flash-correct {
        --signal: var(--correct);
        animation: flash 1.4s ease-out;
    }

    .flash-wrong {
        --signal: var(--wrong);
        animation: flash 1.4s ease-out;
    }

    .flash-reveal {
        --signal: var(--reveal);
        animation: flash 1.4s ease-out;
    }

    @keyframes flash {
        0%,
        25% {
            background-color: var(--signal);
            border-color: var(--signal);
            color: var(--on-signal);
        }
        100% {
            background-color: var(--key);
            border-color: var(--item-border);
            color: var(--ink);
        }
    }

    @media (max-width: 480px) {
        .pad,
        .row {
            gap: 8px;
        }
        .item {
            padding: 11px 11px 10px;
            font-size: 0.9375rem;
        }
    }
</style>
 