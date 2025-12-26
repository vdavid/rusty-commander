<script lang="ts">
    import { onMount } from 'svelte'
    import DualPaneExplorer from '$lib/file-explorer/DualPaneExplorer.svelte'

    onMount(() => {
        // Suppress Cmd+A (select all) - always
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.key === 'a') {
                e.preventDefault()
            }
            // Suppress Cmd+Opt+I (devtools) in production only
            if (!import.meta.env.DEV && e.metaKey && e.altKey && e.key === 'i') {
                e.preventDefault()
            }
        }

        // Suppress right-click context menu
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('contextmenu', handleContextMenu)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('contextmenu', handleContextMenu)
        }
    })
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
        /* Disable text selection globally */
        user-select: none;
        -webkit-user-select: none;
        /* Force default cursor everywhere */
        cursor: default;
    }

    :global(#app) {
        width: 100%;
        height: 100%;
    }

    /* Disable scroll bounce on all scrollable elements */
    :global(*) {
        overscroll-behavior: none;
    }
</style>
