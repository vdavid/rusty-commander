// Unit tests for FileDataStore

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFileDataStore } from './FileDataStore'
import { createFileEntry } from './test-helpers'
import type { ExtendedMetadata } from './types'

// Mock canvas for measureText (Node.js doesn't have canvas)
beforeEach(() => {
    // Mock document.createElement to return a fake canvas
    const mockCanvas = {
        getContext: () => ({
            measureText: (text: string) => ({ width: text.length * 8 }), // ~8px per char
            font: '',
        }),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement)
})

describe('FileDataStore', () => {
    describe('basic operations', () => {
        it('should start empty', () => {
            const store = createFileDataStore()
            expect(store.totalCount).toBe(0)
            expect(store.getAllFiltered()).toEqual([])
        })

        it('should set files and update totalCount', () => {
            const store = createFileDataStore()
            const files = [
                createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false }),
                createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }),
            ]

            store.setFiles(files)

            expect(store.totalCount).toBe(2)
            expect(store.getAllFiltered()).toHaveLength(2)
        })

        it('should append files', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])
            store.appendFiles([createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false })])

            expect(store.totalCount).toBe(2)
        })

        it('should clear all files', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            store.clear()

            expect(store.totalCount).toBe(0)
            expect(store.getAllFiltered()).toEqual([])
        })
    })

    describe('getRange and getAt', () => {
        it('should return a slice of files', () => {
            const store = createFileDataStore()
            const files = Array.from({ length: 10 }, (_, i) =>
                createFileEntry({
                    name: `file${String(i)}.txt`,
                    path: `/test/file${String(i)}.txt`,
                    isDirectory: false,
                }),
            )
            store.setFiles(files)

            const range = store.getRange(2, 5)

            expect(range).toHaveLength(3)
            expect(range[0].name).toBe('file2.txt')
            expect(range[2].name).toBe('file4.txt')
        })

        it('should clamp range to available files', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            const range = store.getRange(0, 100)

            expect(range).toHaveLength(1)
        })

        it('should get file at index', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false }),
                createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }),
            ])

            expect(store.getAt(0)?.name).toBe('a.txt')
            expect(store.getAt(1)?.name).toBe('b.txt')
            expect(store.getAt(99)).toBeUndefined()
        })
    })

    describe('findIndex', () => {
        it('should find file by name', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false }),
                createFileEntry({ name: 'target.txt', path: '/test/target.txt', isDirectory: false }),
                createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }),
            ])

            expect(store.findIndex('target.txt')).toBe(1)
        })

        it('should return -1 if not found', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            expect(store.findIndex('nonexistent.txt')).toBe(-1)
        })
    })

    describe('hidden files filtering', () => {
        it('should show hidden files by default', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
                createFileEntry({ name: 'visible.txt', path: '/test/visible.txt', isDirectory: false }),
            ])

            expect(store.totalCount).toBe(2)
        })

        it('should hide hidden files when setShowHiddenFiles(false)', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
                createFileEntry({ name: 'visible.txt', path: '/test/visible.txt', isDirectory: false }),
            ])

            store.setShowHiddenFiles(false)

            expect(store.totalCount).toBe(1)
            expect(store.getAllFiltered()[0].name).toBe('visible.txt')
        })

        it('should always show parent entry (..) even when hidden files are off', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: '..', path: '/parent', isDirectory: true }),
                createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
                createFileEntry({ name: 'visible.txt', path: '/test/visible.txt', isDirectory: false }),
            ])

            store.setShowHiddenFiles(false)

            expect(store.totalCount).toBe(2) // .. and visible.txt
            expect(store.getAllFiltered().map((f) => f.name)).toEqual(['..', 'visible.txt'])
        })

        it('should toggle hidden files visibility', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: '.hidden', path: '/test/.hidden', isDirectory: false }),
                createFileEntry({ name: 'visible.txt', path: '/test/visible.txt', isDirectory: false }),
            ])

            store.setShowHiddenFiles(false)
            expect(store.totalCount).toBe(1)

            store.setShowHiddenFiles(true)
            expect(store.totalCount).toBe(2)
        })
    })

    describe('applyDiff', () => {
        it('should add new files', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            const newIndex = store.applyDiff(
                [{ type: 'add', entry: createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }) }],
                0,
            )

            expect(store.totalCount).toBe(2)
            expect(newIndex).toBe(0) // Selection unchanged
        })

        it('should remove files and adjust selection', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false }),
                createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }),
                createFileEntry({ name: 'c.txt', path: '/test/c.txt', isDirectory: false }),
            ])

            // Select c.txt (index 2), remove a.txt (index 0)
            const newIndex = store.applyDiff(
                [
                    {
                        type: 'remove',
                        entry: createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false }),
                    },
                ],
                2,
            )

            expect(store.totalCount).toBe(2)
            expect(newIndex).toBe(1) // Selection moved down because item before was removed
        })

        it('should modify files in place', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false, size: 100 })])

            store.applyDiff(
                [
                    {
                        type: 'modify',
                        entry: createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false, size: 200 }),
                    },
                ],
                0,
            )

            expect(store.getAt(0)?.size).toBe(200)
        })

        it('should handle removal of selected item', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false }),
                createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }),
            ])

            // Select b.txt (index 1), remove b.txt
            const newIndex = store.applyDiff(
                [
                    {
                        type: 'remove',
                        entry: createFileEntry({ name: 'b.txt', path: '/test/b.txt', isDirectory: false }),
                    },
                ],
                1,
            )

            expect(store.totalCount).toBe(1)
            expect(newIndex).toBe(0) // Selection clamped to valid range
        })
    })

    describe('mergeExtendedData', () => {
        it('should merge extended metadata by path', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({
                    name: 'a.txt',
                    path: '/test/a.txt',
                    isDirectory: false,
                    extendedMetadataLoaded: false,
                }),
                createFileEntry({
                    name: 'b.txt',
                    path: '/test/b.txt',
                    isDirectory: false,
                    extendedMetadataLoaded: false,
                }),
            ])

            const extendedData: ExtendedMetadata[] = [{ path: '/test/a.txt', addedAt: 1000, openedAt: 2000 }]

            store.mergeExtendedData(extendedData)

            const fileA = store.getAt(0)
            expect(fileA?.addedAt).toBe(1000)
            expect(fileA?.openedAt).toBe(2000)
            expect(fileA?.extendedMetadataLoaded).toBe(true)

            // b.txt should be unchanged
            const fileB = store.getAt(1)
            expect(fileB?.addedAt).toBeUndefined()
            expect(fileB?.extendedMetadataLoaded).toBe(false)
        })

        it('should do nothing with empty data', () => {
            const store = createFileDataStore()
            const callback = vi.fn()
            store.onUpdate(callback)

            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])
            callback.mockClear()

            store.mergeExtendedData([])

            expect(callback).not.toHaveBeenCalled()
        })
    })

    describe('onUpdate callback', () => {
        it('should notify on setFiles', () => {
            const store = createFileDataStore()
            const callback = vi.fn()
            store.onUpdate(callback)

            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            expect(callback).toHaveBeenCalledTimes(1)
        })

        it('should notify on appendFiles', () => {
            const store = createFileDataStore()
            const callback = vi.fn()
            store.setFiles([])
            store.onUpdate(callback)

            store.appendFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            expect(callback).toHaveBeenCalledTimes(1)
        })

        it('should notify on clear', () => {
            const store = createFileDataStore()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])
            const callback = vi.fn()
            store.onUpdate(callback)

            store.clear()

            expect(callback).toHaveBeenCalledTimes(1)
        })

        it('should allow unsubscribing', () => {
            const store = createFileDataStore()
            const callback = vi.fn()
            const unsubscribe = store.onUpdate(callback)

            unsubscribe()
            store.setFiles([createFileEntry({ name: 'a.txt', path: '/test/a.txt', isDirectory: false })])

            expect(callback).not.toHaveBeenCalled()
        })
    })

    describe('syncStatusMap', () => {
        it('should set and get sync status map', () => {
            const store = createFileDataStore()

            store.setSyncStatusMap({ '/test/a.txt': 'synced' })

            expect(store.syncStatusMap['/test/a.txt']).toBe('synced')
        })
    })

    describe('maxFilenameWidth', () => {
        it('should calculate width based on filenames', () => {
            const store = createFileDataStore()
            store.setFiles([
                createFileEntry({ name: 'short.txt', path: '/test/short.txt', isDirectory: false }),
                createFileEntry({
                    name: 'this-is-a-very-long-filename.txt',
                    path: '/test/long.txt',
                    isDirectory: false,
                }),
            ])

            // Width should be based on longest filename
            expect(store.maxFilenameWidth).toBeGreaterThan(100) // More than minColumnWidth
        })
    })
})
