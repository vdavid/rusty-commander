// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
    output: 'static',
    server: {
        port: parseInt(process.env.PORT || '4321'),
    },
    vite: {
        server: {
            strictPort: true,
        },
        // @ts-expect-error Vite version mismatch between Astro and Tailwind - doesn't affect build
        plugins: [tailwindcss()],
    },
})
