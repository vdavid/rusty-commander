<script lang="ts">
    import type { FileEntry } from './types'

    interface Props {
        files: FileEntry[]
    }

    const { files }: Props = $props()
</script>

<ul class="file-list">
    {#each files as file (file.path)}
        <li class="file-entry" class:is-directory={file.isDirectory}>
            {#if file.isDirectory}
                <span class="icon">📁</span>
            {:else}
                <span class="icon">📄</span>
            {/if}
            <span class="name">{file.name}</span>
        </li>
    {/each}
</ul>

<style>
    .file-list {
        list-style: none;
        margin: 0;
        padding: 0;
        overflow-y: auto;
        font-family: var(--font-mono) monospace;
        font-size: var(--font-size-sm);
    }

    .file-entry {
        padding: var(--spacing-xs) var(--spacing-sm);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        user-select: none;
    }

    .file-entry:hover {
        background-color: var(--color-hover-bg);
    }

    .icon {
        font-size: var(--font-size-base);
        flex-shrink: 0;
    }

    .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .is-directory .name {
        font-weight: 600;
    }
</style>
