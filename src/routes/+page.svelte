<script lang="ts">
    import DualPaneExplorer from '$lib/file-explorer/DualPaneExplorer.svelte'
</script>

<DualPaneExplorer />

<style>
    :global(html, body) {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: var(--color-bg-primary);
        color: var(--color-text-primary);
    }

    :global(#app) {
        width: 100%;
        height: 100%;
    }
</style>
