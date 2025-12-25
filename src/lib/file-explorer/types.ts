export interface FileEntry {
    name: string
    path: string
    isDirectory: boolean
    size?: number
    modifiedAt?: Date
}
