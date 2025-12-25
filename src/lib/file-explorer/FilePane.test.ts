import { describe, it, expect } from 'vitest'
import { mount } from 'svelte'
import FilePane from './FilePane.svelte'

describe('FilePane', () => {
    it('renders without crashing', () => {
        const target = document.createElement('div')
        mount(FilePane, { target })
        expect(target.querySelector('.file-pane')).toBeTruthy()
    })
})
