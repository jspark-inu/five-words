import { expect, test, type Page } from '@playwright/test'

import { seed } from './helpers'

const SHARE_TEXT = '이게 나를 설명하는 다섯 단어래. 넌 뭐 나왔어?'

async function openReport(page: Page, init?: string) {
  await seed(page)
  if (init) await page.addInitScript(init)
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('./')
  await expect(page.locator('.words li')).toHaveCount(5)
  return errors
}

const STUB_OK = `
  navigator.canShare = () => true
  navigator.share = async (data) => { window.__shared = data }
`
const STUB_ABORT = `
  navigator.canShare = () => true
  navigator.share = async () => { throw new DOMException('cancel', 'AbortError') }
`
const STUB_FAIL = `
  navigator.canShare = () => true
  navigator.share = async () => { throw new DOMException('nope', 'NotAllowedError') }
`
const STUB_NONE = `
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
`

test('카드 구획에 같은 모양의 다섯 단어와 전달 문구, 이미지 버튼이 있다', async ({ page }) => {
  await openReport(page, STUB_OK)
  const share = page.locator('#friend-card-mount .share')
  await expect(share).toContainText(SHARE_TEXT)
  const words = await page.locator('.words .w').allTextContents()
  for (const w of words) await expect(share).toContainText(w)
  await expect(page.getByRole('button', { name: '이미지로 보내기' })).toBeVisible()
})

test('카드는 1080x1350 PNG이고 배경이 불꽃색이며 오염되지 않았다', async ({ page }) => {
  const errors = await openReport(page, STUB_OK)
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  await page.waitForFunction(() => (window as any).__shared)
  const info = await page.evaluate(async () => {
    const f: File = (window as any).__shared.files[0]
    const bmp = await createImageBitmap(f)
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
    const ctx = c.getContext('2d')!; ctx.drawImage(bmp, 0, 0)
    const px = Array.from(ctx.getImageData(6, 6, 1, 1).data)
    // 글자가 그려졌는지: 가운데 영역에 배경이 아닌 픽셀이 있다
    const mid = ctx.getImageData(0, 300, 1080, 700).data
    let ink = 0
    for (let i = 0; i < mid.length; i += 4) if (mid[i]! < 100 && mid[i + 1]! < 100) ink++
    return { name: f.name, type: f.type, w: bmp.width, h: bmp.height, px, ink, fontOk: document.fonts.check('120px "Black Han Sans"', '성취') }
  })
  expect(info).toMatchObject({ name: 'my-five-words.png', type: 'image/png', w: 1080, h: 1350 })
  expect(info.px.slice(0, 3)).toEqual([255, 157, 46])
  expect(info.ink).toBeGreaterThan(3000)
  expect(info.fontOk).toBe(true)
  expect(errors).toEqual([])
})

test('공유 기능이 없으면 PNG를 내려받고 저장 안내가 뜬다', async ({ page }) => {
  const errors = await openReport(page, STUB_NONE)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  expect((await dl).suggestedFilename()).toBe('my-five-words.png')
  await expect(page.locator('#friend-card-mount')).toContainText('저장이 안 되면 아래 이미지를 길게 눌러 저장하세요.')
  await expect(page.locator('#friend-card-mount img')).toBeVisible()
  await expect(page.locator('#friend-card-mount')).not.toContainText('저장했어요')
  expect(errors).toEqual([])
})

test('공유 도중 다른 오류가 나면 저장으로 넘어간다', async ({ page }) => {
  await openReport(page, STUB_FAIL)
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  await dl
  await expect(page.locator('#friend-card-mount')).toContainText('길게 눌러 저장하세요')
})

test('공유 취소는 오류 없이 보고서로 돌아온다', async ({ page }) => {
  const errors = await openReport(page, STUB_ABORT)
  let downloaded = false
  page.on('download', () => { downloaded = true })
  const btn = page.getByRole('button', { name: '이미지로 보내기' })
  await btn.click()
  await page.waitForTimeout(500)
  await expect(btn).toBeEnabled()
  await expect(page.locator('#friend-card-mount')).not.toContainText('길게 눌러')
  await expect(page.locator('#friend-card-mount img')).toHaveCount(0)
  expect(downloaded).toBe(false)
  expect(errors).toEqual([])
})

test('저장 경로에서는 이미지가 화면에 보이고 크기가 1080x1350이다', async ({ page }) => {
  await openReport(page, STUB_NONE)
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  const img = page.locator('#friend-card-mount img')
  await expect(img).toBeVisible()
  expect(await img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([1080, 1350])
})

test('보고서 맨 아래에 AGPL-3.0, orrery 크레딧, 공개 저장소 링크가 있다', async ({ page }) => {
  await openReport(page)
  const foot = page.locator('footer')
  await expect(foot).toContainText('이 서비스는 AGPL-3.0 라이선스로 공개됩니다')
  await expect(foot).toContainText('사주·자미두수 계산: orrery (AGPL-3.0)')
  const src = foot.getByRole('link', { name: '소스 코드' })
  await expect(src).toHaveAttribute('href', 'https://github.com/jspark-inu/five-words')
  const orr = foot.getByRole('link', { name: 'orrery' })
  await expect(orr).toHaveAttribute('href', 'https://github.com/rath/orrery')
  await expect(src).toHaveAttribute('rel', /noopener/)
  await expect(orr).toHaveAttribute('rel', /noopener/)
  await expect(foot).toContainText('검증된 도구가 아닙니다')
})
