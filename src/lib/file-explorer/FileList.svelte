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
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 13px;
    }

    .file-entry {
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        user-select: none;
    }

    .file-entry:hover {
        background-color: rgba(0, 120, 215, 0.1);
    }

    .icon {
        font-size: 14px;
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
