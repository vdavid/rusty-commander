import { describe, it, expect } from 'vitest'
import { mount } from 'svelte'
import DualPaneExplorer from './DualPaneExplorer.svelte'

describe('DualPaneExplorer', () => {
    it('renders two file panes', () => {
        const target = document.createElement('div')
        mount(DualPaneExplorer, { target })

        const panes = target.querySelectorAll('.file-pane')
        expect(panes).toHaveLength(2)
    })

    it('renders dual pane container', () => {
        const target = document.createElement('div')
        mount(DualPaneExplorer, { target })

        expect(target.querySelector('.dual-pane-explorer')).toBeTruthy()
    })
})
