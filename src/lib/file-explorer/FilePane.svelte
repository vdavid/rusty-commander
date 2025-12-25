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
        border: 1px solid #ccc;
    }

    .header {
        padding: 0.5rem;
        background-color: #f5f5f5;
        border-bottom: 1px solid #ccc;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .path {
        font-family: 'SF Mono', Monaco, monospace;
        color: #666;
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
        color: #666;
        font-size: 14px;
    }

    .error-message {
        color: #d32f2f;
        text-align: center;
        padding: 1rem;
    }

    @media (prefers-color-scheme: dark) {
        .file-pane {
            border-color: #444;
        }

        .header {
            background-color: #2a2a2a;
            border-bottom-color: #444;
        }

        .path {
            color: #aaa;
        }

        .message {
            color: #aaa;
        }

        .error-message {
            color: #f44336;
        }
    }
</style>
