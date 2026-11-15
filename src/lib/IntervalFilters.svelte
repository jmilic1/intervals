<script lang="ts">
    import { scale } from 'svelte/transition';
    import { prefersReducedMotion } from 'svelte/motion';
    import { FAMILIES, type FamilyId } from './intervals';

    interface Props {
        enabled: Record<FamilyId, boolean>;
        ontoggle: (id: FamilyId) => void;
        onsetall: (on: boolean) => void;
    }

    let { enabled, ontoggle }: Props = $props();

    const onCount = $derived(FAMILIES.filter((f) => enabled[f.id]).length);

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
            onclick={() => (open = !open)}
    >
        <svg class="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 4h12M4.5 8h7M7 12h2" />
        </svg>
        Filter
        <span class="count" class:none={onCount === 0}>{onCount}/{FAMILIES.length}</span>
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
            <div class="chips">
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
    {/if}
</div>

<style>
    /* The panel is positioned against this wrapper. */
    .filter-menu {
        position: relative;
    }

    /* The Filter button, styled as an item. */
    .trigger {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 10px 12px 9px;
        background: var(--key);
        color: var(--ink);
        border: 1px solid var(--item-border);
        border-radius: 5px;
        font: inherit;
        font-size: 1rem;
        font-weight: 500;
        line-height: 1;
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

    /* How many interval families are on, e.g. 7/9. */
    .count {
        color: var(--ink-soft);
        font-size: 0.875rem;
        font-weight: 400;
        font-variant-numeric: tabular-nums;
    }

    .count.none {
        color: var(--wrong-text);
        font-weight: 600;
    }

    /* The pop-out window. transform-origin is a point just above the
       panel, under the Filter button, so the panel grows out of the
       button and shrinks back into it. */
    .panel {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        z-index: 20;
        width: max-content;
        max-width: min(34rem, calc(100vw - 32px));
        padding: 12px;
        background: var(--key);
        border: 1px solid var(--item-border);
        border-radius: 8px;
        box-shadow:
                0 10px 30px rgb(0 0 0 / 0.1),
                0 2px 6px rgb(0 0 0 / 0.06);
        transform-origin: 3rem -0.5rem;
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

    .trigger:focus-visible,
    .chip:focus-visible {
        outline: 2px solid var(--focus);
        outline-offset: 2px;
    }
</style>
