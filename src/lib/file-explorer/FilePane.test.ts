import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from 'svelte'
import FilePane from './FilePane.svelte'
import type { FileEntry } from './types'
import { createFileEntry } from './test-helpers'

// Mock icon-cache to avoid Tauri dependency
vi.mock('$lib/icon-cache', () => ({
    getCachedIcon: vi.fn().mockReturnValue(undefined),
    prefetchIcons: vi.fn().mockResolvedValue(undefined),
    refreshDirectoryIcons: vi.fn().mockResolvedValue(undefined),
    iconCacheVersion: {
        subscribe: vi.fn((fn: (value: number) => void) => {
            fn(0)
            return () => {}
        }),
    },
}))

// Use vi.hoisted to define mock data that vi.mock can access (hoisted to top during transformation)
const { mockSessionData, setMockData } = vi.hoisted(() => {
    const mockSessionData = new Map<string, FileEntry[]>()
    return {
        mockSessionData,
        setMockData: (path: string, entries: FileEntry[]) => mockSessionData.set(path, entries),
    }
})

// Mock tauri-commands session API
vi.mock('$lib/tauri-commands', () => ({
    listDirectoryStartSession: vi.fn((path: string, chunkSize: number) => {
        const entries = mockSessionData.get(path)
        if (!entries) {
            return Promise.reject(new Error(`Mock data not configured for path: ${path}`))
        }
        const firstChunk = entries.slice(0, chunkSize)
        return Promise.resolve({
            sessionId: 'mock-session-id',
            totalCount: entries.length,
            entries: firstChunk,
            hasMore: entries.length > chunkSize,
        })
    }),
    listDirectoryNextChunk: vi.fn(() =>
        Promise.resolve({
            entries: [],
            hasMore: false,
        }),
    ),
    listDirectoryEndSession: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
}))

describe('FilePane', () => {
    let mockFiles: FileEntry[]

    beforeEach(() => {
        mockSessionData.clear()
        mockFiles = [
            createFileEntry({
                name: 'Documents',
                path: '/home/user/Documents',
                isDirectory: true,
            }),
            createFileEntry({
                name: 'file.txt',
                path: '/home/user/file.txt',
                isDirectory: false,
            }),
        ]
    })

    it('renders without crashing', () => {
        setMockData('/test', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { initialPath: '/test' } })
        expect(target.querySelector('.file-pane')).toBeTruthy()
    })

    it('displays loading state initially', () => {
        setMockData('/test', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { initialPath: '/test' } })
        expect(target.textContent).toContain('Loading')
    })

    it('displays file list after loading', async () => {
        setMockData('/test', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { initialPath: '/test' } })

        // Use vi.waitFor to poll until content appears (handles async dynamic import chain)
        await vi.waitFor(() => {
            expect(target.textContent).toContain('Documents')
        })
        expect(target.textContent).toContain('file.txt')
    })

    it('displays error message when directory cannot be read', async () => {
        // Don't set mock data - this will cause the mock to reject
        const target = document.createElement('div')
        mount(FilePane, { target, props: { initialPath: '/nonexistent' } })

        await vi.waitFor(() => {
            expect(target.querySelector('.error-message')).toBeTruthy()
        })
        expect(target.textContent).toContain('Mock data not configured')
    })

    it('displays parent directory entry except at root', async () => {
        setMockData('/home/user', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { initialPath: '/home/user' } })

        await vi.waitFor(() => {
            expect(target.textContent).toContain('..')
        })
    })

    it('does not display parent entry at root', async () => {
        setMockData('/', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { initialPath: '/' } })

        await vi.waitFor(() => {
            expect(target.textContent).toContain('Documents')
        })
        expect(target.textContent).not.toMatch(/📁\s*\.\./)
    })

    it('hides hidden files when showHiddenFiles is false', async () => {
        const filesWithHidden: FileEntry[] = [
            createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
            createFileEntry({ name: '.config', path: '/test/.config', isDirectory: true }),
            createFileEntry({ name: 'visible.txt', path: '/test/visible.txt', isDirectory: false }),
        ]
        setMockData('/test', filesWithHidden)
        const target = document.createElement('div')
        mount(FilePane, {
            target,
            props: { initialPath: '/test', showHiddenFiles: false },
        })

        await vi.waitFor(() => {
            expect(target.textContent).toContain('visible.txt')
        })
        expect(target.textContent).not.toContain('.hidden')
        expect(target.textContent).not.toContain('.config')
    })

    it('shows hidden files when showHiddenFiles is true', async () => {
        const filesWithHidden: FileEntry[] = [
            createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
            createFileEntry({ name: 'visible.txt', path: '/test/visible.txt', isDirectory: false }),
        ]
        setMockData('/test', filesWithHidden)
        const target = document.createElement('div')
        mount(FilePane, {
            target,
            props: { initialPath: '/test', showHiddenFiles: true },
        })

        await vi.waitFor(() => {
            expect(target.textContent).toContain('visible.txt')
        })
        expect(target.textContent).toContain('.hidden')
    })

    it('always shows .. entry even when showHiddenFiles is false', async () => {
        const filesWithHidden: FileEntry[] = [
            createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
        ]
        setMockData('/test', filesWithHidden)
        const target = document.createElement('div')
        mount(FilePane, {
            target,
            props: { initialPath: '/test', showHiddenFiles: false },
        })

        await vi.waitFor(() => {
            expect(target.textContent).toContain('..')
        })
    })
})
