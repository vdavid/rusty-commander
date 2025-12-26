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
