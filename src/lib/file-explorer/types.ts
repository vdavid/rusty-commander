export interface FileEntry {
    name: string
    path: string
    isDirectory: boolean
    isSymlink: boolean
    size?: number
    modifiedAt?: number
    createdAt?: number
    permissions: number
    owner: string
    group: string
    iconId: string
}
