import { expect, test, type Page } from '@playwright/test'

import { SAVED, openTab, seed } from './helpers'

async function open(page: Page, birth: object = SAVED.birth) {
  await seed(page, { birth })
  await page.goto('./')
  await expect(page.locator('.words li')).toHaveCount(5)
}

test('결과는 세 탭이다: 처음엔 전체 요약이 열리고, 누른 탭만 보이며, 맨 아래 버튼과 안내는 늘 보인다', async ({ page }) => {
  await open(page)
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveText(['전체 요약', '5가지 강점 단어', '사주·자미두수'])
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
  // 전체 요약 탭 안의 순서: 한 줄 요약 → 사용 설명서 → 실험 → 카드 → AI
  const order = await page.evaluate(() => {
    const at = (sel: string) => { const n = document.querySelector(sel); return n ? n.getBoundingClientRect().top + window.scrollY : Infinity }
    return [at('.summary'), at('#p5'), at('.try'), at('#friend-card-mount'), at('pre.prompt'), at('footer')]
  })
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  expect(order.every(Number.isFinite)).toBe(true)
  const always = async () => {
    await expect(page.getByRole('button', { name: '다시 검사하기' })).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  }
  await expect(page.locator('#p1')).toBeHidden()
  await expect(page.locator('#raw')).toBeHidden()
  await always()

  await openTab(page, '5가지 강점 단어')
  await expect(page.locator('#p1')).toBeVisible()
  await expect(page.getByRole('heading', { name: '다섯 단어 하나씩' })).toBeVisible()
  await expect(page.locator('#p5')).toBeHidden()
  await expect(page.locator('#raw')).toBeHidden()
  await always()

  await openTab(page, '사주·자미두수')
  await expect(page.locator('#luck')).toBeVisible()
  await expect(page.locator('#raw')).toBeVisible()
  await expect(page.locator('#raw')).not.toHaveJSProperty('open', true)
  await expect(page.locator('#p1')).toBeHidden()
  await always()

  // 태어난 정보만 다시 입력하다 취소하면 보던 탭으로 돌아온다. 새로고침하면 전체 요약부터.
  await page.getByRole('button', { name: '태어난 정보만 다시 입력' }).click()
  await page.getByRole('button', { name: '취소' }).click()
  await expect(page.getByRole('tab', { name: '사주·자미두수' })).toHaveAttribute('aria-selected', 'true')
  await page.reload()
  await expect(page.getByRole('tab', { name: '전체 요약' })).toHaveAttribute('aria-selected', 'true')
})

test('탭 줄은 320px에서도 한 줄에 셋이 들어가고, 아래로 내려도 맨 위에 붙어 있으며, 탭을 누르면 그 탭의 처음으로 간다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await open(page)
  const boxes = await page.getByRole('tab').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(b => ({ top: b.top, h: b.height, right: b.right })))
  expect(new Set(boxes.map(b => Math.round(b.top))).size).toBe(1)
  for (const b of boxes) { expect(b.h).toBeGreaterThanOrEqual(44); expect(b.right).toBeLessThanOrEqual(320) }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.locator('pre.prompt').scrollIntoViewIfNeeded()
  const tabTop = () => page.getByRole('tab').first().evaluate(e => e.getBoundingClientRect().top)
  expect(await tabTop()).toBeLessThan(20)
  await openTab(page, '5가지 강점 단어')
  expect(await tabTop()).toBeLessThan(20)
  const p1 = await page.locator('#p1').evaluate(e => e.getBoundingClientRect().top)
  expect(p1).toBeGreaterThan(0)
  expect(p1).toBeLessThan(120)
})

test('운세 구획이 있고 빈 제목이나 빈 카드가 없다', async ({ page }) => {
  await open(page)
  await expect(page.locator('#luck')).toHaveCount(1)
  await expect(page.locator('.glance')).toHaveCount(1)
  const empty = await page.evaluate(() => [...document.querySelectorAll('main section')].filter(s => (s.textContent ?? '').trim().length === (s.querySelector('h2,h3')?.textContent ?? '').trim().length && s.querySelector('h2,h3')).length)
  expect(empty).toBe(0)
  const emptyHeads = await page.evaluate(() => [...document.querySelectorAll('main h2,main h3')].filter(h => !(h.textContent ?? '').trim()).length)
  expect(emptyHeads).toBe(0)
})

test('접힌 명식을 320px에서 열어도 가로 스크롤이 없다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await open(page)
  const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  expect(await noScroll()).toBe(true)
  await openTab(page, '사주·자미두수')
  await page.locator('#raw > summary').click()
  await expect(page.locator('#raw')).toHaveJSProperty('open', true)
  await expect(page.getByRole('heading', { name: '사주로 본 나' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '열두 궁' })).toBeVisible()
  await page.locator('.palace > summary').first().click()
  expect(await noScroll()).toBe(true)
  await page.locator('.palace > summary').nth(1).click()
  expect(await noScroll()).toBe(true)
  await openTab(page, '전체 요약')
  await page.locator('pre.prompt').scrollIntoViewIfNeeded()
  expect(await noScroll()).toBe(true)
})

test('결과 복사: 누르면 클립보드에 글이 들어가고 이름은 없다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  await page.getByRole('button', { name: '결과 복사' }).click()
  await expect(page.locator('.copy-note')).toContainText('복사했어요')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(await page.locator('pre.prompt').innerText())
  expect(clip).toContain('다섯 단어(순서대로): 성취, 조율, 신념, 공정, 신중')
  expect(clip).toContain('일주 丁酉')
  expect(clip).toMatch(/올해 \d{4} .+, 내년 \d{4} /)
  expect(clip).toMatch(/유년 \d{4}: 명궁 /)
  expect(clip).not.toMatch(/이름|김하늘/)
})

test('결과 복사가 막히면 글이 선택된 채로 짧은 안내가 나온다', async ({ page }) => {
  await open(page)
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }) })
  await page.getByRole('button', { name: '결과 복사' }).click()
  await expect(page.locator('.copy-note')).toContainText('자동 복사가 안 됐어요')
  const sel = await page.evaluate(() => window.getSelection()?.toString() ?? '')
  expect(sel.length).toBeGreaterThan(200)
  expect(sel).toBe(await page.evaluate(() => document.querySelector('pre.prompt')!.textContent ?? ''))
  await expect(page.getByText('보낼지 말지는 본인 선택입니다')).toBeVisible()
})

test('태어난 시간을 모르면 복사 글에 시주와 자미두수가 없다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page, { ...SAVED.birth, time: null })
  await page.getByRole('button', { name: '결과 복사' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).not.toContain('시주 ')
  expect(clip).not.toContain('[자미두수]')
  expect(clip).toContain('태어난 시간을 입력하지 않아')
})

test('올해는 기기 시계를 따른다: 2031년이면 辛亥 해가 올해', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.clock.setFixedTime(new Date('2031-06-15T12:00:00+09:00'))
  await open(page)
  await page.getByRole('button', { name: '결과 복사' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('올해 2031 辛亥')
  expect(clip).toContain('내년 2032 壬子')
})

test('올해는 입춘이 경계다: 1월 15일에 열면 전년도가 올해이고 안내 한 줄이 나온다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.clock.setFixedTime(new Date('2031-01-15T12:00:00+09:00'))
  await open(page)
  await openTab(page, '사주·자미두수')
  await expect(page.getByText(/아직 입춘\(2월 \d일\) 전이라 2030년을 올해로 봅니다/)).toBeVisible()
  await openTab(page, '전체 요약')
  await page.getByRole('button', { name: '결과 복사' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('올해 2030 庚戌')
  expect(clip).toContain('내년 2031 辛亥')
})

test('올해는 입춘이 경계다: 입춘이 지난 2월 5일에는 새해이고 안내가 없다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.clock.setFixedTime(new Date('2031-02-05T12:00:00+09:00'))
  await open(page)
  await expect(page.getByText(/아직 입춘/)).toHaveCount(0)
  await page.getByRole('button', { name: '결과 복사' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('올해 2031 辛亥')
})

test('운세 칸 글자에 같은 끝맺음이 바로 이어 두 번 나오지 않는다', async ({ page }) => {
  for (const [y, m, d, t] of [[2005, 3, 14, true], [2001, 1, 19, false], [2003, 11, 1, true]] as const) {
    await open(page, { ...SAVED.birth, year: y, month: m, day: d, time: t ? { hour: 10, minute: 0 } : null })
    const text = (await page.locator('section.luck').allInnerTexts()).join('\n')
    expect(text.length).toBeGreaterThan(500)
    expect(text).not.toMatch(/(\S{2,}[.!?])\s*\1/)
  }
})

test('5가지 강점 단어 탭: 단어 카드마다 펼치지 않아도 "일에서 이렇게 쓰여요"가 보이고, 직업을 정해 주는 말이 아니라는 안내가 한 번 있다', async ({ page }) => {
  await seed(page, { top: ['order', 'inclusion', 'recognition', 'reflection', 'achievement'] })
  await page.goto('./')
  await openTab(page, '5가지 강점 단어')
  const work = page.locator('.card .work')
  await expect(work).toHaveCount(5)
  for (let i = 0; i < 5; i++) {
    await expect(work.nth(i)).toBeVisible()
    await expect(work.nth(i)).toContainText('일에서 이렇게 쓰여요')
    await expect(work.nth(i)).toContainText('이런 일에서 힘을 씁니다:')
  }
  await expect(work.first()).toContainText('회계·정산') // 질서
  await expect(page.locator('.worknote')).toHaveCount(1)
  await expect(page.locator('.worknote')).toContainText('직업을 정해 주는 말이 아닙니다')
})
