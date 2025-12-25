// Typed wrapper functions for Tauri commands

import { invoke } from '@tauri-apps/api/core'
import type { FileEntry } from './file-explorer/types'

/**
 * Lists the contents of a directory.
 * @param path - Directory path to list. Supports tilde expansion (~).
 * @returns Array of file entries, sorted with directories first.
 * @throws Error if directory cannot be read (permission denied, not found, etc.)
 */
export async function listDirectoryContents(path: string): Promise<FileEntry[]> {
    return invoke<FileEntry[]>('list_directory_contents', { path })
}
