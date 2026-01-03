import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the per-volume path saving logic.
 * These tests verify that volume switching correctly saves and restores paths.
 */

// We'll test the logic by creating mock versions of the volume switch functions
// that mirror the actual implementation in DualPaneExplorer.svelte

// Types matching the app
type VolumePathMap = Record<string, string>

interface MockState {
    leftVolumeId: string
    leftPath: string
    lastUsedPaths: VolumePathMap
}

// Helper to simulate the determineNavigationPath logic
async function determineNavigationPath(
    volumeId: string,
    volumePath: string,
    targetPath: string,
    lastUsedPaths: VolumePathMap,
    pathExists: (p: string) => Promise<boolean>,
    defaultVolumeId: string,
): Promise<string> {
    // User selected a favorite - go to the favorite's path directly
    if (targetPath !== volumePath) {
        return targetPath
    }

    // Look up the last used path for this volume
    const lastUsedPath = lastUsedPaths[volumeId]
    if (lastUsedPath && (await pathExists(lastUsedPath))) {
        return lastUsedPath
    }

    // Default: ~ for main volume (root), volume path for others
    if (volumeId === defaultVolumeId) {
        return '~'
    }
    return volumePath
}

// Simulates handleLeftVolumeChange logic
async function handleVolumeChange(
    state: MockState,
    volumeId: string,
    volumePath: string,
    targetPath: string,
    pathExists: (p: string) => Promise<boolean>,
    defaultVolumeId: string,
): Promise<{ savedVolumeId: string; savedPath: string; newVolumeId: string; newPath: string }> {
    // First, save the current path for the old volume (before switching)
    const savedVolumeId = state.leftVolumeId
    const savedPath = state.leftPath
    state.lastUsedPaths[savedVolumeId] = savedPath

    // Determine where to navigate
    const pathToNavigate = await determineNavigationPath(
        volumeId,
        volumePath,
        targetPath,
        state.lastUsedPaths,
        pathExists,
        defaultVolumeId,
    )

    // Update state
    state.leftVolumeId = volumeId
    state.leftPath = pathToNavigate

    return {
        savedVolumeId,
        savedPath,
        newVolumeId: volumeId,
        newPath: pathToNavigate,
    }
}

describe('Volume path saving logic', () => {
    const DEFAULT_VOLUME_ID = 'root'
    const pathExists = vi.fn().mockResolvedValue(true)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('when switching volumes', () => {
        it('saves the old path under the OLD volume ID', async () => {
            const state: MockState = {
                leftVolumeId: 'installer-vol',
                leftPath: '/Volumes/InstallerDisk/SomeApp',
                lastUsedPaths: {},
            }

            const result = await handleVolumeChange(state, 'root', '/', '/', pathExists, DEFAULT_VOLUME_ID)

            expect(result.savedVolumeId).toBe('installer-vol')
            expect(result.savedPath).toBe('/Volumes/InstallerDisk/SomeApp')
            expect(state.lastUsedPaths['installer-vol']).toBe('/Volumes/InstallerDisk/SomeApp')
        })

        it('does NOT save new path under old volume ID (the reported bug)', async () => {
            const state: MockState = {
                leftVolumeId: 'root',
                leftPath: '~',
                lastUsedPaths: {},
            }

            // Switch from Mac HD (~) to Dropbox
            await handleVolumeChange(
                state,
                'dropbox',
                '/Users/test/Library/CloudStorage/Dropbox',
                '/Users/test/Library/CloudStorage/Dropbox',
                pathExists,
                DEFAULT_VOLUME_ID,
            )

            // The bug was: root would get the Dropbox path
            // Correct behavior: root should have ~ (the path BEFORE switching)
            expect(state.lastUsedPaths['root']).toBe('~')
            expect(state.lastUsedPaths['dropbox']).toBeUndefined() // Not yet saved for new volume
        })

        it('defaults to ~ for main volume when no lastUsedPath exists', async () => {
            const state: MockState = {
                leftVolumeId: 'installer-vol',
                leftPath: '/Volumes/InstallerDisk',
                lastUsedPaths: {},
            }

            const result = await handleVolumeChange(state, 'root', '/', '/', pathExists, DEFAULT_VOLUME_ID)

            expect(result.newPath).toBe('~')
        })

        it('defaults to volume root for non-main volumes when no lastUsedPath exists', async () => {
            const state: MockState = {
                leftVolumeId: 'root',
                leftPath: '~',
                lastUsedPaths: {},
            }

            const result = await handleVolumeChange(
                state,
                'dropbox',
                '/Users/test/Library/CloudStorage/Dropbox',
                '/Users/test/Library/CloudStorage/Dropbox',
                pathExists,
                DEFAULT_VOLUME_ID,
            )

            expect(result.newPath).toBe('/Users/test/Library/CloudStorage/Dropbox')
        })

        it('restores lastUsedPath when switching back to a volume', async () => {
            const state: MockState = {
                leftVolumeId: 'dropbox',
                leftPath: '/Users/test/Library/CloudStorage/Dropbox/WorkFolder',
                lastUsedPaths: {
                    root: '/Users/test/Documents',
                },
            }

            const result = await handleVolumeChange(state, 'root', '/', '/', pathExists, DEFAULT_VOLUME_ID)

            expect(result.newPath).toBe('/Users/test/Documents')
        })

        it('navigates directly to favorite path without looking up lastUsedPath', async () => {
            const state: MockState = {
                leftVolumeId: 'root',
                leftPath: '/Users/test/Documents',
                lastUsedPaths: {
                    root: '/some/other/path',
                },
            }

            // Selecting a favorite: targetPath !== volumePath
            const result = await handleVolumeChange(
                state,
                'root', // Favorites resolve to their containing volume
                '/',
                '/Users/test/Downloads', // Favorite's path
                pathExists,
                DEFAULT_VOLUME_ID,
            )

            // Should go to the favorite's path, not the lastUsedPath
            expect(result.newPath).toBe('/Users/test/Downloads')
        })
    })

    describe('full user flow', () => {
        it('correctly tracks paths through multiple volume switches', async () => {
            const state: MockState = {
                leftVolumeId: 'installer-vol',
                leftPath: '/Volumes/qBittorrent/App',
                lastUsedPaths: {},
            }

            // Step 1: Start on installer volume, switch to Mac HD
            await handleVolumeChange(state, 'root', '/', '/', pathExists, DEFAULT_VOLUME_ID)

            expect(state.lastUsedPaths).toEqual({
                'installer-vol': '/Volumes/qBittorrent/App',
            })
            expect(state.leftVolumeId).toBe('root')
            expect(state.leftPath).toBe('~')

            // Step 2: Switch from Mac HD to Dropbox
            await handleVolumeChange(
                state,
                'dropbox',
                '/Users/test/Library/CloudStorage/Dropbox',
                '/Users/test/Library/CloudStorage/Dropbox',
                pathExists,
                DEFAULT_VOLUME_ID,
            )

            expect(state.lastUsedPaths).toEqual({
                'installer-vol': '/Volumes/qBittorrent/App',
                root: '~',
            })
            expect(state.leftVolumeId).toBe('dropbox')
            expect(state.leftPath).toBe('/Users/test/Library/CloudStorage/Dropbox')

            // Step 3: Simulate navigation within Dropbox
            state.leftPath = '/Users/test/Library/CloudStorage/Dropbox/Work'

            // Step 4: Switch back to Mac HD
            await handleVolumeChange(state, 'root', '/', '/', pathExists, DEFAULT_VOLUME_ID)

            expect(state.lastUsedPaths).toEqual({
                'installer-vol': '/Volumes/qBittorrent/App',
                root: '~',
                dropbox: '/Users/test/Library/CloudStorage/Dropbox/Work',
            })
            expect(state.leftVolumeId).toBe('root')
            expect(state.leftPath).toBe('~') // Restored from lastUsedPaths
        })
    })
})
