import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Load files relative to the page instead of from the site root, so the
  // site works at any address, like https://<username>.github.io/<repo>/.
  base: './',
})
