import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), {
      name: 'preview-search-exclusion',
      transformIndexHtml() {
        const tags = []
        if (env.VITE_SEO_NOINDEX === 'true') tags.push({
          tag: 'meta', attrs: { name: 'robots', content: 'noindex, follow' }, injectTo: 'head' as const,
        })
        return tags
      },
    }],
    test: {
      // Preview tests need real raw CSS, not Vitest's default empty CSS stub.
      css: true,
      include: ['src/**/*.test.{ts,tsx}', 'scripts/uploads/**/*.test.ts', 'scripts/seo/**/*.test.ts', 'workers/**/*.test.ts'],
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  }
})
