import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { runQuiz } from './helpers'

const STUB_NONE = `
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
`
const STUB_SHARE = `
  navigator.canShare = () => true
  navigator.share = async (data) => { window.__shared = data }
`

async function submitBirth(page: Page) {
  await page.locator('[name=year]').fill('2005')
  await page.locator('[name=month]').fill('3')
  await page.locator('[name=day]').fill('14')
  await page.locator('[name=hour]').fill('14')
  await page.locator('[name=minute]').fill('30')
  await page.getByLabel('여', { exact: true }).check()
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
}

const isLocal = (u: string) => u.startsWith('data:') || u.startsWith('blob:')

// context 단위로 기록해 새 창·워커·카드 저장 경로의 요청까지 잡는다.
function record(context: BrowserContext) {
  const reqs: { url: string; method: string; body: string | null }[] = []
  context.on('request', r => reqs.push({ url: r.url(), method: r.method(), body: r.postData() }))
  return reqs
}

for (const [label, stub] of [['공유 시트', STUB_SHARE], ['저장(내려받기)', STUB_NONE]] as const) {
  test(`보고서와 카드 ${label} 경로까지 네트워크 요청이 문서뿐이고 입력값이 나가지 않는다`, async ({ page, context, baseURL }) => {
    await page.addInitScript(stub)
    const reqs = record(context)
    await page.goto('./')
    await runQuiz(page)
    await submitBirth(page)
    await page.getByRole('button', { name: '이미지로 보내기' }).click()
    if (stub === STUB_SHARE) await page.waitForFunction(() => (window as any).__shared)
    await page.waitForTimeout(800)
    await page.reload()
    await expect(page.locator('.words li')).toHaveCount(5)
    await page.waitForTimeout(300)

    const net = reqs.filter(r => !isLocal(r.url))
    // goto 한 번과 reload 한 번 = 앱 문서 요청 두 번. 그 밖의 요청(파비콘 포함)은 결함이다.
    const doc = new URL('./', baseURL!).href
    expect(net.map(r => `${r.method} ${r.url}`)).toEqual([`GET ${doc}`, `GET ${doc}`])
    for (const r of reqs) {
      expect(r.body).toBeNull()
      expect(r.url).not.toMatch(/[?&#]/) // 쿼리·해시로 값이 실려 나가지 않는다
    }
  })
}

test('페이지를 연 뒤 오프라인으로 전환해도 보고서와 카드 이미지까지 나온다', async ({ page, context }) => {
  await page.addInitScript(STUB_SHARE)
  const reqs = record(context)
  await page.goto('./')
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
  const before = reqs.length
  await context.setOffline(true)
  expect(await page.evaluate(() => fetch(location.href, { cache: 'no-store' }).then(() => 'online', () => 'offline'))).toBe('offline')
  await runQuiz(page)
  await submitBirth(page)
  const heads = await page.locator('main h2').allTextContents()
  expect(heads).toContain('사주로 본 나')
  expect(heads).toContain('자미두수로 본 나')
  expect(heads).toContain('이번 달에 해볼 세 가지')
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  await page.waitForFunction(() => (window as any).__shared)
  const info = await page.evaluate(async () => {
    const f: File = (window as any).__shared.files[0]
    const bmp = await createImageBitmap(f)
    return { type: f.type, w: bmp.width, h: bmp.height }
  })
  expect(info).toEqual({ type: 'image/png', w: 1080, h: 1350 })
  await page.waitForTimeout(500)
  // 오프라인 전환 뒤에는 시도된 요청도 data:/blob: 외에 하나도 없다. (fetch 탐지용 한 건은 제외)
  expect(reqs.slice(before).filter(r => !isLocal(r.url) && r.url !== new URL('./', page.url()).href)).toEqual([])
})

test('저장되는 값은 단어 결과(top, far, support 등), 생년월일시 두 키뿐이고 진행 상태와 답변 원본은 남지 않는다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await submitBirth(page)
  const stored = await page.evaluate(() => {
    const all: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; all[k] = localStorage.getItem(k)! }
    return { all, session: sessionStorage.length }
  })
  expect(Object.keys(stored.all).sort()).toEqual(['five-words:birth:v2', 'five-words:word:v2'])
  const saved = JSON.parse(stored.all['five-words:word:v2']!)
  // 무작위 답에 따라 근거가 얇다는 표시(참·거짓)와 영역 메모가 함께 저장될 수 있다. 진행 상태와 답변 원본은 저장하지 않는다.
  expect(Object.keys(saved).filter(k => !['far', 'support', 'top', 'lowSignal', 'contexts'].includes(k))).toEqual([])
  expect(Object.keys(saved)).toEqual(expect.arrayContaining(['far', 'support', 'top']))
  if ('lowSignal' in saved) expect(typeof saved.lowSignal).toBe('boolean')
  expect(Object.keys(JSON.parse(stored.all['five-words:birth:v2']!)).sort()).toEqual(['day', 'gender', 'month', 'time', 'year'])
  expect(stored.session).toBe(0)
})

test('질문을 빠른 사람 기준(허용되는 가장 짧은 간격)으로 눌러도 화면이 막히지 않는다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page, 12)
  await submitBirth(page)
})
