// See docs/security.md#withglobaltauri for more info on why this script exists.

import { spawn } from 'child_process'

// Get arguments passed to the script
const args = process.argv.slice(2)

// Check if the command is 'dev'
const isDev = args.includes('dev')

// If dev, inject the dev configuration
if (isDev) {
    // Add -c src-tauri/tauri.dev.json to merge config
    args.push('-c', 'src-tauri/tauri.dev.json')
}

// Spawn the tauri process (relies on pnpm/npm adding node_modules/.bin to PATH)
const tauriProcess = spawn('tauri', args, {
    stdio: 'inherit',
    shell: true,
})

// Handle process exit
tauriProcess.on('exit', (code) => {
    process.exit(code ?? 0)
})
