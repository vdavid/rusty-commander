<script lang="ts">
    import FilePane from './FilePane.svelte'

    // Both panes start at user's home directory
    const initialPath = '~'
</script>

<div class="dual-pane-explorer">
    <FilePane path={initialPath} />
    <FilePane path={initialPath} />
</div>

<style>
    .dual-pane-explorer {
        display: flex;
        width: 100%;
        height: 100%;
        gap: 0;
    }
</style>
