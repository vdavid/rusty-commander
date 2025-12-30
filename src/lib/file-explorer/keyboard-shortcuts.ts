/**
 * Keyboard shortcut handling for file lists
 *
 * Provides centralized logic for handling keyboard navigation shortcuts
 * across different view modes (Brief and Full).
 */

export interface NavigationResult {
    /** The new index to select */
    newIndex: number
    /** Whether the event was handled */
    handled: boolean
}

export interface NavigationContext {
    currentIndex: number
    totalCount: number
    /** For Brief mode: items per column */
    itemsPerColumn?: number
    /** For Brief mode: number of visible columns (for PageUp/PageDown) */
    visibleColumns?: number
    /** For Full mode: number of visible items (for PageUp/PageDown) */
    visibleItems?: number
}

/**
 * Handles keyboard navigation shortcuts for file lists.
 * Returns the new index and whether the event was handled.
 */
export function handleNavigationShortcut(event: KeyboardEvent, context: NavigationContext): NavigationResult | null {
    const { currentIndex, totalCount, itemsPerColumn, visibleColumns, visibleItems } = context

    // Home/End shortcuts (both Option+Arrow and Fn+Arrow)
    // Option+Up or Fn+Left = Home (go to first item)
    if ((event.altKey && event.key === 'ArrowUp') || (event.key === 'Home' && !event.metaKey)) {
        return { newIndex: 0, handled: true }
    }

    // Option+Down or Fn+Right = End (go to last item)
    if ((event.altKey && event.key === 'ArrowDown') || (event.key === 'End' && !event.metaKey)) {
        return { newIndex: Math.max(0, totalCount - 1), handled: true }
    }

    // Page Up/Down shortcuts (Fn+Up/Down)
    // In Brief mode: move horizontally by (visibleColumns - 1) and go to bottommost item
    //                if near edge, go to first/last item instead
    // In Full mode: move vertically by (visibleItems - 1)
    if (event.key === 'PageUp') {
        if (visibleColumns !== undefined && itemsPerColumn !== undefined) {
            // Brief mode: horizontal page navigation
            const columnsToMove = Math.max(1, visibleColumns - 1)
            const currentColumn = Math.floor(currentIndex / itemsPerColumn)
            const targetColumn = currentColumn - columnsToMove

            // If we'd go to or past the leftmost column, jump to first item
            if (targetColumn <= 0) {
                return { newIndex: 0, handled: true }
            }

            // Otherwise, go to the bottommost item in the target column
            const targetColumnStart = targetColumn * itemsPerColumn
            const targetColumnEnd = Math.min(totalCount - 1, targetColumnStart + itemsPerColumn - 1)
            return { newIndex: targetColumnEnd, handled: true }
        } else {
            // Full mode: vertical page navigation by (visible items - 1)
            const pageSize = visibleItems ? Math.max(1, visibleItems - 1) : 20
            const newIndex = Math.max(0, currentIndex - pageSize)
            return { newIndex, handled: true }
        }
    }

    if (event.key === 'PageDown') {
        if (visibleColumns !== undefined && itemsPerColumn !== undefined) {
            // Brief mode: horizontal page navigation
            const columnsToMove = Math.max(1, visibleColumns - 1)
            const currentColumn = Math.floor(currentIndex / itemsPerColumn)
            const totalColumns = Math.ceil(totalCount / itemsPerColumn)
            const targetColumn = currentColumn + columnsToMove

            // If we'd go to or past the rightmost column, jump to last item
            if (targetColumn >= totalColumns - 1) {
                return { newIndex: totalCount - 1, handled: true }
            }

            // Otherwise, go to the bottommost item in the target column
            const targetColumnStart = targetColumn * itemsPerColumn
            const targetColumnEnd = Math.min(totalCount - 1, targetColumnStart + itemsPerColumn - 1)
            return { newIndex: targetColumnEnd, handled: true }
        } else {
            // Full mode: vertical page navigation by (visible items - 1)
            const pageSize = visibleItems ? Math.max(1, visibleItems - 1) : 20
            const newIndex = Math.min(totalCount - 1, currentIndex + pageSize)
            return { newIndex, handled: true }
        }
    }

    // Not a handled shortcut
    return null
}
