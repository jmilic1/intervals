
<script lang="ts">
    import { scale } from 'svelte/transition';
    import { prefersReducedMotion } from 'svelte/motion';
    import {
        FAMILIES,
        PAIRS,
        RARE_CHANCE,
        answerName,
        type AnswerId,
        type FamilyId,
        type PairId,
    } from './intervals';

    interface Props {
        enabled: Record<FamilyId, boolean>;
        pair: PairId | null; // compare mode: the active pair, or null when it's off
        rare: AnswerId; // compare mode: which interval of the pair is the rare one
        ontoggle: (id: FamilyId) => void;
        onsetall: (on: boolean) => void;
        // Clicked one side of a pair's switch: make `rare` the rare one of `pair`.
        oncompare: (pair: PairId, rare: AnswerId) => void;
    }

    let { enabled, pair, rare, ontoggle, oncompare }: Props = $props();

    // "1 in 6", from RARE_CHANCE, for the tooltips
    const rareOdds = `1 in ${Math.round(1 / RARE_CHANCE)}`;

    let open = $state(false);
    let menu: HTMLDivElement; // wraps the Filter button and the panel
    let trigger: HTMLButtonElement; // the Filter button

    // Animation lengths in milliseconds. 0 when the user has asked
    // their system for less motion.
    const openMs = $derived(prefersReducedMotion.current ? 0 : 220);
    const closeMs = $derived(prefersReducedMotion.current ? 0 : 160);

    // Is this element inside the Filter button or its panel?
    function isInside(target: EventTarget | null): boolean {
        return target instanceof Node && menu.contains(target);
    }

    // Clicking or tapping anywhere else closes the panel.
    function handlePointerDown(event: PointerEvent) {
        if (open && !isInside(event.target)) open = false;
    }

    // Tabbing to something outside the panel closes it too.
    function handleFocusIn(event: FocusEvent) {
        if (open && !isInside(event.target)) open = false;
    }

    // Escape closes it and puts focus back on the Filter button.
    function handleKeydown(event: KeyboardEvent) {
        if (open && event.key === 'Escape') {
            open = false;
            trigger.focus();
        }
    }
</script>

<svelte:window
        onpointerdown={handlePointerDown}
        onfocusin={handleFocusIn}
        onkeydown={handleKeydown}
/>

<div class="filter-menu" bind:this={menu}>
    <button
            bind:this={trigger}
            type="button"
            class="trigger"
            aria-expanded={open}
            aria-controls="filter-panel"
            aria-label="Filter intervals"
            title="Filter intervals"
            onclick={() => (open = !open)}
    >
        <!-- Icon only. aria-label gives screen readers the name, and
             title shows it as a tooltip on hover. -->
        <svg class="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 4h12M4.5 8h7M7 12h2" />
        </svg>
    </button>

    {#if open}
        <div
                id="filter-panel"
                class="panel"
                role="group"
                aria-label="Intervals to practice"
                in:scale={{ start: 0.35, duration: openMs }}
                out:scale={{ start: 0.35, duration: closeMs }}
        >
            <!-- Regular filters: any mix of intervals. -->
            <div class="group">
                <p class="group-label" id="families-label">Intervals</p>
                <div class="chips" role="group" aria-labelledby="families-label">
                    {#each FAMILIES as family (family.id)}
                        <button
                                type="button"
                                class="chip"
                                aria-pressed={enabled[family.id]}
                                onclick={() => ontoggle(family.id)}
                        >
                            <span class="dot" aria-hidden="true"></span>
                            {family.label}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Compare mode: a two-way switch per pair. The highlighted side
                 is the rare interval. Only one switch can be on at a time. -->
            <div class="group">
                <p class="group-label" id="pairs-label">Find odd one out (highlighted is less frequent)</p>
                <div class="switches" role="group" aria-labelledby="pairs-label">
                    {#each PAIRS as p (p.id)}
                        <div class="segmented" role="group" aria-label={p.label}>
                            {#each p.answers as id (id)}
                                <button
                                        type="button"
                                        aria-pressed={pair === p.id && rare === id}
                                        title="{answerName(id)} plays {rareOdds} times"
                                        onclick={() => oncompare(p.id, id)}
                                >
                                    {answerName(id)}
                                </button>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* The panel is positioned against this wrapper. */
    .filter-menu {
        position: relative;
    }

    /* The Filter button, styled as an item: a square with just the icon,
       37px to match the height of the re(Play) button. */
    .trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 37px;
        height: 37px;
        padding: 0;
        background: var(--key);
        color: var(--ink);
        border: 1px solid var(--item-border);
        border-radius: 5px;
        user-select: none;
        cursor: pointer;
        transition:
                background-color 150ms linear,
                border-color 150ms linear;
    }

    /* Hovered, or open: the light blue item highlight. */
    .trigger:hover,
    .trigger[aria-expanded='true'] {
        background: var(--item-hover);
        border-color: var(--item-hover-border);
    }

    .icon path {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.75;
        stroke-linecap: round;
    }

    /* The pop-out window. transform-origin is a point just above the
       panel, under the middle of the Filter button, so the panel grows
       out of the button and shrinks back into it. */
    .panel {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        z-index: 20;
        display: grid;
        gap: 14px;
        width: max-content;
        max-width: min(34rem, calc(100vw - 32px));
        padding: 12px;
        background: var(--key);
        border: 1px solid var(--item-border);
        border-radius: 8px;
        box-shadow:
                0 10px 30px rgb(0 0 0 / 0.1),
                0 2px 6px rgb(0 0 0 / 0.06);
        transform-origin: 18px -0.5rem;
    }

    /* The two sections of the panel, with a line between them. */
    .group {
        display: grid;
        gap: 8px;
    }

    .group + .group {
        padding-top: 14px;
        border-top: 1px solid var(--line);
    }

    .group-label {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    /* On: a normal item with a filled dot.
       Off: faded, dashed border, empty dot. */
    .chip {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 8px 10px 7px;
        background: var(--key);
        color: var(--ink);
        border: 1px solid var(--item-border);
        border-radius: 5px;
        font: inherit;
        font-size: 0.9375rem;
        line-height: 1;
        user-select: none;
        cursor: pointer;
        transition:
                background-color 150ms linear,
                border-color 150ms linear,
                color 150ms linear;
    }

    .chip[aria-pressed='false'] {
        background: transparent;
        border-style: dashed;
        color: var(--ink-soft);
    }

    .chip:hover {
        background: var(--item-hover);
        border-color: var(--item-hover-border);
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--ink);
    }

    .chip[aria-pressed='false'] .dot {
        background: transparent;
        box-shadow: inset 0 0 0 1.5px var(--line-strong);
    }

    /* The five two-way switches, one per row. Every switch shares the same
       two columns (subgrid), so all left halves are the same width and all
       right halves are the same width. */
    .switches {
        display: grid;
        grid-template-columns: auto auto;
        justify-content: start;
        row-gap: 8px;
    }

    .segmented {
        display: grid;
        grid-template-columns: subgrid;
        grid-column: span 2;
    }

    /* Off: white with grey text. The highlighted side (the rare interval)
       is filled with ink. */
    .segmented button {
        padding: 8px 12px 7px;
        background: var(--key);
        color: var(--ink-soft);
        border: 1px solid var(--item-border);
        font: inherit;
        font-size: 0.9375rem;
        line-height: 1;
        white-space: nowrap;
        user-select: none;
        cursor: pointer;
    }

    .segmented button:first-child {
        border-radius: 5px 0 0 5px;
    }

    .segmented button:last-child {
        margin-left: -1px; /* share the border in the middle */
        border-radius: 0 5px 5px 0;
    }

    .segmented button:hover {
        background: var(--item-hover);
    }

    .segmented button[aria-pressed='true'] {
        position: relative; /* keeps its border on top of the shared one */
        background: var(--ink);
        border-color: var(--ink);
        color: var(--on-ink);
    }

    .trigger:focus-visible,
    .chip:focus-visible,
    .segmented button:focus-visible {
        position: relative;
        outline: 2px solid var(--focus);
        outline-offset: 2px;
    }
</style>
 