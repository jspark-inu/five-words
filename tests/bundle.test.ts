import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const DIST = new URL('../dist/', import.meta.url)
const FILE = new URL('index.html', DIST)

// 결과물에 들어 있어도 되는 주소. 하나씩 이유를 적는다.
const ALLOWED_URLS = [
  'https://github.com/jspark-inu/five-words', // 소스 공개 저장소 링크
  'https://github.com/rath/orrery', // 사주·자미두수 계산 라이브러리 출처 링크
  'https://github.com/jspark-inu/five-words/blob/main/NOTICE.md', // 푸터의 구성요소·저작권 안내 링크
  'http://www.w3.org/2000/svg', // SVG 네임스페이스 문자열(요청 주소 아님)
  'http://www.w3.org/1999/xhtml', // XHTML 네임스페이스 문자열
  'http://www.w3.org/1999/xlink', // xlink 네임스페이스 문자열
  'http://www.w3.org/XML/1998/namespace', // XML 네임스페이스 문자열
  'http://www.w3.org/2000/xmlns/', // xmlns 네임스페이스 문자열
]

function html(): string {
  if (!existsSync(FILE)) throw new Error('dist/index.html 이 없습니다. 먼저 `npm run build` 를 실행하세요.')
  return readFileSync(FILE, 'utf8')
}

describe('빌드 결과물', () => {
  it('파일 하나뿐이다', () => {
    html()
    expect(readdirSync(DIST)).toEqual(['index.html'])
  })

  it('3MB 이내다', () => {
    html()
    expect(statSync(FILE).size).toBeLessThanOrEqual(3 * 1024 * 1024)
  })

  it('허용 목록 밖의 http 주소가 없다', () => {
    const found = new Set(html().match(/https?:\/\/[^\s"'`<>)\\,;]+/g) ?? [])
    const stray = [...found].filter(u => !ALLOWED_URLS.some(a => u === a || u.replace(/[.\/]+$/, '') === a))
    expect(stray).toEqual([])
  })

  it('외부 스크립트·스타일·글꼴·이미지를 부르는 태그가 없다', () => {
    const h = html()
    expect(h).not.toMatch(/<script[^>]*\ssrc\s*=/i)
    expect(h).not.toMatch(/<link[^>]*rel\s*=\s*["']?(stylesheet|preload|prefetch|modulepreload)/i)
    expect(h).not.toMatch(/@import\s/i)
    const css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n')
    expect(css.length).toBeGreaterThan(0)
    expect(css.match(/url\(\s*["']?(?!data:|#)[^)]*\)/gi) ?? []).toEqual([])
  })

  it('og:title·og:description만 있고 이미지나 주소 태그는 없다', () => {
    const h = html()
    expect(h).toMatch(/<meta property="og:title" content="[^"]+"/)
    expect(h).toMatch(/<meta property="og:description" content="[^"]+"/)
    expect(h).not.toMatch(/property="og:(image|url|video|audio)/i)
    expect(h).not.toMatch(/name="twitter:/i)
  })

  it('Swiss Ephemeris 저작권 문구가 번들에 들어 있다', () => {
    expect(html()).toContain('Swiss Ephemeris')
  })
})
