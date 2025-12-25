import { describe, it, expect } from 'vitest'
import { mount } from 'svelte'
import FileList from './FileList.svelte'
import type { FileEntry } from './types'

describe('FileList', () => {
    it('renders file entries', () => {
        const files: FileEntry[] = [
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

        const target = document.createElement('div')
        mount(FileList, { target, props: { files } })

        expect(target.textContent).toContain('Documents')
        expect(target.textContent).toContain('file.txt')
    })

    it('distinguishes directories from files', () => {
        const files: FileEntry[] = [
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

        const target = document.createElement('div')
        mount(FileList, { target, props: { files } })

        const entries = target.querySelectorAll('.file-entry')
        expect(entries[0].classList.contains('is-directory')).toBe(true)
        expect(entries[1].classList.contains('is-directory')).toBe(false)
    })

    it('renders empty list', () => {
        const target = document.createElement('div')
        mount(FileList, { target, props: { files: [] } })

        expect(target.querySelector('.file-list')).toBeTruthy()
        expect(target.querySelectorAll('.file-entry')).toHaveLength(0)
    })

    it('displays icons for files and directories', () => {
        const files: FileEntry[] = [
            {
                name: 'Documents',
                path: '/home/user/Documents',
                isDirectory: true,
            },
        ]

        const target = document.createElement('div')
        mount(FileList, { target, props: { files } })

        const icons = target.querySelectorAll('.icon')
        expect(icons.length).toBeGreaterThan(0)
    })
})
