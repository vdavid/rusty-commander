// Typed wrapper functions for Tauri commands

import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'
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

/**
 * Checks if a path exists.
 * @param path - Path to check.
 * @returns True if the path exists.
 */
export async function pathExists(path: string): Promise<boolean> {
    return invoke<boolean>('path_exists', { path })
}

/**
 * Opens a file with the system's default application.
 * @param path - Path to the file to open.
 */
export async function openFile(path: string): Promise<void> {
    await openPath(path)
}
