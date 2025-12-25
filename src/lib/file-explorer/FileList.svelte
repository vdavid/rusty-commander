<script lang="ts">
    import type { FileEntry } from '$lib/types'

    interface Props {
        files: FileEntry[]
    }

    const { files }: Props = $props()
</script>

<ul class="file-list">
    {#each files as file (file.path)}
        <li class="file-entry" class:is-directory={file.isDirectory}>
            {file.name}
        </li>
    {/each}
</ul>

<style>
    .file-list {
        list-style: none;
        margin: 0;
        padding: 0;
        overflow-y: auto;
    }

    .file-entry {
        padding: 0.25rem 0.5rem;
        cursor: pointer;
    }

    .file-entry:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .is-directory {
        font-weight: bold;
    }
</style>
