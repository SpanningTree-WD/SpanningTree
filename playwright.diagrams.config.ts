import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', timeout: 90000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4176', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: { command: 'npm run diagrams:assets && vite build --mode diagram-test && vite preview --outDir .diagram-test --host 127.0.0.1 --port 4176', url: 'http://127.0.0.1:4176', reuseExistingServer: false },
})
