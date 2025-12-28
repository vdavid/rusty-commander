// Typed wrapper functions for Tauri commands

import { invoke } from '@tauri-apps/api/core'
import { openPath } from '@tauri-apps/plugin-opener'
import type { ChunkNextResult, SessionStartResult } from './file-explorer/types'

// ============================================================================
// Cursor-based pagination API (session-based)
// ============================================================================

/**
 * Starts a new paginated directory listing session.
 * Reads the directory once, caches on backend, returns first chunk immediately.
 * @param path - Directory path to list. Supports tilde expansion (~).
 * @param chunkSize - Number of entries in the first chunk.
 */
export async function listDirectoryStartSession(path: string, chunkSize: number): Promise<SessionStartResult> {
    return invoke<SessionStartResult>('list_directory_start_session', { path, chunkSize })
}

/**
 * Gets the next chunk of entries from a cached session.
 * @param sessionId - The session ID from listDirectoryStartSession.
 * @param chunkSize - Number of entries to return.
 */
export async function listDirectoryNextChunk(sessionId: string, chunkSize: number): Promise<ChunkNextResult> {
    return invoke<ChunkNextResult>('list_directory_next_chunk', { sessionId, chunkSize })
}

/**
 * Ends a directory listing session and cleans up the cache.
 * @param sessionId - The session ID to clean up.
 */
export async function listDirectoryEndSession(sessionId: string): Promise<void> {
    await invoke('list_directory_end_session', { sessionId })
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

/**
 * Gets icon data URLs for the requested icon IDs.
 * @param iconIds - Array of icon IDs like "ext:jpg", "dir", "symlink"
 * @returns Map of icon_id → base64 WebP data URL
 */
export async function getIcons(iconIds: string[]): Promise<Record<string, string>> {
    return invoke<Record<string, string>>('get_icons', { iconIds })
}

/**
 * Refreshes icons for a directory listing.
 * Fetches icons in parallel for directories (by path) and extensions.
 * @param directoryPaths - Array of directory paths to fetch icons for
 * @param extensions - Array of file extensions (without dot)
 * @returns Map of icon_id → base64 WebP data URL
 */
export async function refreshDirectoryIcons(
    directoryPaths: string[],
    extensions: string[],
): Promise<Record<string, string>> {
    return invoke<Record<string, string>>('refresh_directory_icons', {
        directoryPaths,
        extensions,
    })
}
