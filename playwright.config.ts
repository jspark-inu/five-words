import { defineConfig } from '@playwright/test'

const raw = process.env.BASE_URL
// 끝에 /를 붙여 하위 경로 배포(…/five-words/)에서도 goto('./')가 앱 위치를 가리키게 한다.
const external = raw ? raw.replace(/\/?$/, '/') : undefined

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: external ?? 'http://127.0.0.1:4173/', viewport: { width: 375, height: 800 } },
  ...(external
    ? {}
    : { webServer: { command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 30_000 } }),
})
