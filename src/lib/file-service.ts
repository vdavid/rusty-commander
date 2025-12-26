// File service interface for dependency injection and testing

import type { FileEntry } from './file-explorer/types'
import { listDirectoryContents as tauriListDirectory } from './tauri-commands'

/**
 * Interface for file system operations.
 * Can be implemented by real Tauri commands or mock implementations for testing.
 */
export interface FileService {
    listDirectory(path: string): Promise<FileEntry[]>
}

/**
 * Real file service that uses Tauri commands.
 */
class TauriFileService implements FileService {
    listDirectory(path: string): Promise<FileEntry[]> {
        return tauriListDirectory(path)
    }
}

/**
 * Mock file service for testing.
 */
export class MockFileService implements FileService {
    private mockData: Map<string, FileEntry[]> = new Map()

    setMockData(path: string, entries: FileEntry[]): void {
        this.mockData.set(path, entries)
    }

    listDirectory(path: string): Promise<FileEntry[]> {
        const entries = this.mockData.get(path)
        if (!entries) {
            return Promise.reject(new Error(`Mock data not configured for path: ${path}`))
        }
        return Promise.resolve(entries)
    }
}

/**
 * Default file service instance using Tauri commands.
 */
export const defaultFileService = new TauriFileService()
