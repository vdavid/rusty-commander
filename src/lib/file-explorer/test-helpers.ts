// Test helper for creating FileEntry objects with sensible defaults

import type { FileEntry } from './types'

/**
 * Creates a FileEntry with all required fields, using sensible defaults.
 * Only name, path, and isDirectory are required; all other fields have defaults.
 */
export function createFileEntry(partial: {
    name: string
    path: string
    isDirectory: boolean
    isSymlink?: boolean
    size?: number
    modifiedAt?: number
    createdAt?: number
    permissions?: number
    owner?: string
    group?: string
    iconId?: string
}): FileEntry {
    const isDir = partial.isDirectory
    return {
        name: partial.name,
        path: partial.path,
        isDirectory: isDir,
        isSymlink: partial.isSymlink ?? false,
        size: partial.size,
        modifiedAt: partial.modifiedAt,
        createdAt: partial.createdAt,
        permissions: partial.permissions ?? (isDir ? 0o755 : 0o644),
        owner: partial.owner ?? 'testuser',
        group: partial.group ?? 'staff',
        iconId: partial.iconId ?? (isDir ? 'dir' : 'file'),
    }
}
