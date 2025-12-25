<script lang="ts">
    // FilePane component - displays one side of the two-pane file explorer
</script>

<div class="file-pane">
    <slot />
</div>

<style>
    .file-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
</style>
