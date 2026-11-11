import { defineConfig } from 'vitest/config'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [viteSingleFile()],
  base: './',
  build: { target: 'es2020' },
  // 수천 명을 돌려 보는 시험이 있어 일꾼끼리 CPU를 나눠 쓰면 기본 5초를 넘길 때가 있다.
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30_000 },
})
