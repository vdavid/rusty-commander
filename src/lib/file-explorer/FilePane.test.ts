import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from 'svelte'
import { tick } from 'svelte'
import FilePane from './FilePane.svelte'
import { MockFileService } from '$lib/file-service'
import type { FileEntry } from './types'

describe('FilePane', () => {
    let mockService: MockFileService
    let mockFiles: FileEntry[]

    beforeEach(() => {
        mockService = new MockFileService()
        mockFiles = [
            {
                name: 'Documents',
                path: '/home/user/Documents',
                isDirectory: true,
            },
            {
                name: 'file.txt',
                path: '/home/user/file.txt',
                isDirectory: false,
            },
        ]
    })

    it('renders without crashing', () => {
        mockService.setMockData('/test', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { path: '/test', fileService: mockService } })
        expect(target.querySelector('.file-pane')).toBeTruthy()
    })

    it('displays loading state initially', () => {
        mockService.setMockData('/test', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { path: '/test', fileService: mockService } })
        expect(target.textContent).toContain('Loading')
    })

    it('displays file list after loading', async () => {
        mockService.setMockData('/test', mockFiles)
        const target = document.createElement('div')
        mount(FilePane, { target, props: { path: '/test', fileService: mockService } })

        await tick()
        await tick() // Wait for async operations

        expect(target.textContent).toContain('Documents')
        expect(target.textContent).toContain('file.txt')
    })

    it('displays error message when directory cannot be read', async () => {
        const target = document.createElement('div')
        mount(FilePane, { target, props: { path: '/nonexistent', fileService: mockService } })

        await tick()
        await tick()

        expect(target.querySelector('.error-message')).toBeTruthy()
        expect(target.textContent).toContain('Mock data not configured')
    })
})
