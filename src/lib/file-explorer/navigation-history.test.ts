import { describe, it, expect } from 'vitest'
import {
    createHistory,
    push,
    back,
    forward,
    getCurrentPath,
    canGoBack,
    canGoForward,
    setCurrentIndex,
    getPathAt,
} from './navigation-history'

describe('NavigationHistory', () => {
    describe('createHistory', () => {
        it('creates history with initial path at index 0', () => {
            const history = createHistory('/home')
            expect(history.stack).toEqual(['/home'])
            expect(history.currentIndex).toBe(0)
        })
    })

    describe('push', () => {
        it('adds path to stack and updates index', () => {
            const h1 = createHistory('/a')
            const h2 = push(h1, '/b')
            expect(h2.stack).toEqual(['/a', '/b'])
            expect(h2.currentIndex).toBe(1)
        })

        it('does not duplicate if pushing current path', () => {
            const h1 = createHistory('/a')
            const h2 = push(h1, '/a')
            expect(h2).toBe(h1)
        })

        it('truncates forward history when pushing after back', () => {
            // Navigate: /a -> /b -> /c, then back, then push /d
            let history = createHistory('/a')
            history = push(history, '/b')
            history = push(history, '/c')
            history = back(history) // now at /b
            history = push(history, '/d')

            expect(history.stack).toEqual(['/a', '/b', '/d'])
            expect(history.currentIndex).toBe(2)
            expect(getCurrentPath(history)).toBe('/d')
        })
    })

    describe('back', () => {
        it('decrements index', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            history = back(history)
            expect(history.currentIndex).toBe(0)
            expect(getCurrentPath(history)).toBe('/a')
        })

        it('returns unchanged when at oldest entry', () => {
            const history = createHistory('/a')
            const result = back(history)
            expect(result).toBe(history)
            expect(result.currentIndex).toBe(0)
        })
    })

    describe('forward', () => {
        it('increments index', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            history = back(history) // at /a
            history = forward(history) // at /b
            expect(history.currentIndex).toBe(1)
            expect(getCurrentPath(history)).toBe('/b')
        })

        it('returns unchanged when at newest entry', () => {
            const history = createHistory('/a')
            const result = forward(history)
            expect(result).toBe(history)
            expect(result.currentIndex).toBe(0)
        })
    })

    describe('canGoBack', () => {
        it('returns false at oldest entry', () => {
            const history = createHistory('/a')
            expect(canGoBack(history)).toBe(false)
        })

        it('returns true when history exists', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            expect(canGoBack(history)).toBe(true)
        })
    })

    describe('canGoForward', () => {
        it('returns false at newest entry', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            expect(canGoForward(history)).toBe(false)
        })

        it('returns true after going back', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            history = back(history)
            expect(canGoForward(history)).toBe(true)
        })
    })

    describe('getCurrentPath', () => {
        it('returns the path at currentIndex', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            history = push(history, '/c')
            expect(getCurrentPath(history)).toBe('/c')
            history = back(history)
            expect(getCurrentPath(history)).toBe('/b')
        })
    })

    describe('getPathAt', () => {
        it('returns path at specified index', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            expect(getPathAt(history, 0)).toBe('/a')
            expect(getPathAt(history, 1)).toBe('/b')
        })

        it('returns undefined for out-of-bounds index', () => {
            const history = createHistory('/a')
            expect(getPathAt(history, 5)).toBeUndefined()
            expect(getPathAt(history, -1)).toBeUndefined()
        })
    })

    describe('setCurrentIndex', () => {
        it('sets the current index', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            history = push(history, '/c')
            history = setCurrentIndex(history, 0)
            expect(history.currentIndex).toBe(0)
            expect(getCurrentPath(history)).toBe('/a')
        })

        it('clamps to valid range', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            expect(setCurrentIndex(history, 100).currentIndex).toBe(1)
            expect(setCurrentIndex(history, -5).currentIndex).toBe(0)
        })

        it('returns unchanged if index is the same', () => {
            let history = createHistory('/a')
            history = push(history, '/b')
            const result = setCurrentIndex(history, 1)
            expect(result).toBe(history)
        })
    })

    describe('complex navigation sequences', () => {
        it('handles navigation-after-back correctly', () => {
            // Start at /a, go to /b, /c, /d
            // Go back twice (to /b)
            // Navigate to /e - should clear /c, /d from forward history
            let h = createHistory('/a')
            h = push(h, '/b')
            h = push(h, '/c')
            h = push(h, '/d')
            expect(h.stack).toEqual(['/a', '/b', '/c', '/d'])

            h = back(h) // /c
            h = back(h) // /b
            expect(getCurrentPath(h)).toBe('/b')

            h = push(h, '/e')
            expect(h.stack).toEqual(['/a', '/b', '/e'])
            expect(getCurrentPath(h)).toBe('/e')
            expect(canGoForward(h)).toBe(false)
        })

        it('handles multiple back-forward cycles', () => {
            let h = createHistory('/a')
            h = push(h, '/b')

            // Cycle multiple times
            h = back(h)
            expect(getCurrentPath(h)).toBe('/a')
            h = forward(h)
            expect(getCurrentPath(h)).toBe('/b')
            h = back(h)
            expect(getCurrentPath(h)).toBe('/a')

            // Stack should be unchanged
            expect(h.stack).toEqual(['/a', '/b'])
        })
    })
})
