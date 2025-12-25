<script lang="ts">
    import { onMount } from 'svelte'
    import type { FileEntry } from './types'
    import type { FileService } from '$lib/file-service'
    import { defaultFileService } from '$lib/file-service'
    import FileList from './FileList.svelte'

    interface Props {
        path: string
        fileService?: FileService
    }

    const { path, fileService = defaultFileService }: Props = $props()

    let files = $state<FileEntry[]>([])
    let loading = $state(true)
    let error = $state<string | null>(null)

    async function loadDirectory() {
        loading = true
        error = null
        try {
            files = await fileService.listDirectory(path)
        } catch (e) {
            error = e instanceof Error ? e.message : String(e)
            files = []
        } finally {
            loading = false
        }
    }

    onMount(() => {
        void loadDirectory()
    })

    $effect(() => {
        // Reload when path changes
        void loadDirectory()
    })
</script>

<div class="file-pane">
    <div class="header">
        <span class="path">{path}</span>
    </div>
    <div class="content">
        {#if loading}
            <div class="message">Loading...</div>
        {:else if error}
            <div class="error-message">{error}</div>
        {:else}
            <FileList {files} />
        {/if}
    </div>
</div>

<style>
    .file-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--color-border-primary);
    }

    .header {
        padding: var(--spacing-sm);
        background-color: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-border-primary);
        font-size: var(--font-size-xs);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .path {
        font-family: var(--font-mono) monospace;
        color: var(--color-text-secondary);
    }

    .content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .message,
    .error-message {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--color-text-secondary);
        font-size: var(--font-size-base);
    }

    .error-message {
        color: var(--color-error);
        text-align: center;
        padding: var(--spacing-md);
    }
</style>
