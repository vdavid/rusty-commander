/**
 * Navigation history management for browser-style back/forward navigation.
 * Each pane maintains its own independent history stack.
 *
 * The history works like browser history:
 * - push(): navigating to a new path adds it to stack, truncates forward history
 * - back(): moves index backward in the stack
 * - forward(): moves index forward in the stack
 */

export interface NavigationHistory {
    /** Stack of all visited paths */
    stack: string[]
    /** Current position in the stack (0 = oldest entry) */
    currentIndex: number
}

/**
 * Creates a new history with the initial path.
 */
export function createHistory(initialPath: string): NavigationHistory {
    return {
        stack: [initialPath],
        currentIndex: 0,
    }
}

/**
 * Pushes a new path to the history stack.
 * Truncates any forward history (paths after currentIndex).
 * If the new path is the same as the current path, returns unchanged history.
 */
export function push(history: NavigationHistory, path: string): NavigationHistory {
    const currentPath = history.stack[history.currentIndex]
    if (path === currentPath) {
        return history
    }

    // Truncate forward history and add the new path
    const newStack = [...history.stack.slice(0, history.currentIndex + 1), path]
    return {
        stack: newStack,
        currentIndex: newStack.length - 1,
    }
}

/**
 * Moves back in history. Returns the new history state.
 * If already at the oldest entry, returns unchanged history.
 */
export function back(history: NavigationHistory): NavigationHistory {
    if (!canGoBack(history)) {
        return history
    }
    return {
        ...history,
        currentIndex: history.currentIndex - 1,
    }
}

/**
 * Moves forward in history. Returns the new history state.
 * If already at the newest entry, returns unchanged history.
 */
export function forward(history: NavigationHistory): NavigationHistory {
    if (!canGoForward(history)) {
        return history
    }
    return {
        ...history,
        currentIndex: history.currentIndex + 1,
    }
}

/**
 * Gets the current path in the history.
 */
export function getCurrentPath(history: NavigationHistory): string {
    return history.stack[history.currentIndex]
}

/**
 * Gets the path at a specific index in the history.
 * Returns undefined if index is out of bounds.
 */
export function getPathAt(history: NavigationHistory, index: number): string | undefined {
    return history.stack[index]
}

/**
 * Returns true if there's history to go back to.
 */
export function canGoBack(history: NavigationHistory): boolean {
    return history.currentIndex > 0
}

/**
 * Returns true if there's history to go forward to.
 */
export function canGoForward(history: NavigationHistory): boolean {
    return history.currentIndex < history.stack.length - 1
}

/**
 * Sets the current index in the history. Used after resolving a path.
 * Clamps to valid range.
 */
export function setCurrentIndex(history: NavigationHistory, index: number): NavigationHistory {
    const clampedIndex = Math.max(0, Math.min(index, history.stack.length - 1))
    if (clampedIndex === history.currentIndex) {
        return history
    }
    return {
        ...history,
        currentIndex: clampedIndex,
    }
}
