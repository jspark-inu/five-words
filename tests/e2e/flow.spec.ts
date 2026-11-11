import { expect, test, type Page } from '@playwright/test'
import { SAVED, openTab, runQuiz, seed } from './helpers'

async function fillBirth(page: Page, o: { y?: string; m?: string; d?: string; time?: [string, string] | null; gender?: '남' | '여' | '입력 안 함' | null }) {
  await page.locator('[name=year]').fill(o.y ?? '2005')
  await page.locator('[name=month]').fill(o.m ?? '3')
  await page.locator('[name=day]').fill(o.d ?? '14')
  if (o.time === null) await page.getByLabel('태어난 시간을 몰라요').check()
  else {
    await page.locator('[name=hour]').fill((o.time ?? ['14', '30'])[0])
    await page.locator('[name=minute]').fill((o.time ?? ['14', '30'])[1])
  }
  if (o.gender !== null) await page.getByLabel(o.gender ?? '여', { exact: true }).check()
}

const h2s = (page: Page) => page.locator('main h2').allTextContents()

test('처음부터 끝까지: 단어 고르기, 질문, 입력, 보고서 구획이 순서대로 보인다', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '나의 다섯 단어' })).toBeVisible()
  await runQuiz(page)
  await fillBirth(page, {})
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  // 단어에 따라 "어떤 단어와 합이 좋을까" 구획은 있을 수도 없을 수도 있다(다섯 단어의 짝에 따라 정해진다). 나머지 순서는 항상 같다.
  const heads = (await h2s(page)).filter(h => h !== '어떤 단어와 합이 좋을까')
  const expected = [
    // 전체 요약 탭
    '한 줄로 말하면', '세 리포트가 만나는 곳', '나 사용 설명서', '이번 달에 해볼 세 가지', 'AI에게 더 물어보기',
    // 5가지 강점 단어 탭
    '강점 리포트', '다섯 단어 하나씩', '단어들은 같이 일합니다', '영역으로 보면', '핵심 자산 셋', '구조적 위험 셋', '손이 먼저 갈 만한 쪽', '나와 가장 먼 단어',
    // 사주·자미두수 탭
    '운세 리포트', '한눈에 보기',
    '사주 명식', '사주로 본 나', '합과 충, 신살', '대운', '자미두수 명식', '자미두수로 본 나', '열두 궁',
  ]
  expect(heads).toEqual(expected)
  await expect(page.locator('#friend-card-mount')).toBeAttached()
  await expect(page.locator('footer')).toContainText('검증된 도구가 아닙니다')
})

test('시간 모름 선택 시 시주와 자미두수 없이 끝난다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await fillBirth(page, { time: null })
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  await expect(page.locator('.pillar')).toHaveCount(3)
  await expect(page.locator('.pillar span', { hasText: '시주' })).toHaveCount(0)
  const heads = await h2s(page)
  expect(heads).toContain('자미두수는 건너뛰었어요')
  expect(heads).not.toContain('자미두수로 본 나')
})

test('성별 입력 안 함 시 자미두수 없이 끝난다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await fillBirth(page, { gender: '입력 안 함' })
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  await expect(page.locator('.pillar')).toHaveCount(4)
  expect(await h2s(page)).not.toContain('자미두수로 본 나')
  await expect(page.locator('.ziwei-note')).toContainText('성별')
})

test('2월 31일과 미래 날짜는 입력 화면에서 안내하고 넘어가지 않는다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await fillBirth(page, { m: '2', d: '31' })
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.form-error')).toContainText('없는 날짜')
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
  const nextYear = String(new Date().getFullYear() + 1)
  await page.locator('[name=year]').fill(nextYear)
  await page.locator('[name=month]').fill('1')
  await page.locator('[name=day]').fill('1')
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.form-error')).toBeVisible()
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
})

test('성별을 고르지 않으면 넘어가지 않는다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await fillBirth(page, { gender: null })
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.form-error')).toContainText('성별')
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
})

test('결과 후 새로고침하면 같은 보고서, 지우기를 누르면 처음 화면', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await fillBirth(page, {})
  await page.getByRole('button', { name: '보고서 보기' }).click()
  const before = await page.locator('.words').innerText()
  await page.reload()
  await expect(page.locator('.words li')).toHaveCount(5)
  expect(await page.locator('.words').innerText()).toBe(before)
  await page.getByRole('button', { name: '결과 지우기' }).click()
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
})

test('다시 검사하면 이전 결과를 덮어쓴다', async ({ page }) => {
  await seed(page)
  await page.goto('./')
  const before = await page.locator('.words').innerText()
  await runQuiz(page, 9)
  await fillBirth(page, {})
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  const after = await page.locator('.words').innerText()
  expect(after).not.toBe(before)
  await page.reload()
  expect(await page.locator('.words').innerText()).toBe(after)
})

for (const width of [320, 375, 1100]) {
  test(`${width}px 폭에서 가로 넘침이 없다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    await page.goto('./')
    expect(await overflow()).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: '시작하기' }).click()
    expect(await overflow()).toBeLessThanOrEqual(0)
    await seed(page)
    await page.goto('./')
    await expect(page.locator('.words li')).toHaveCount(5)
    expect(await overflow()).toBeLessThanOrEqual(0)
  })
}

async function openSaved(page: Page, birth: object = SAVED.birth, top: string[] = SAVED.top) {
  await seed(page, { top, birth })
  await page.goto('./')
  await expect(page.locator('.words li')).toHaveCount(5)
  await openRaw(page)
}

/** 명식(사주·자미두수 원자료)은 사주·자미두수 탭 안에 접혀 있다. 탭을 열고 펼쳐야 역할 이름으로 찾을 수 있다. */
async function openRaw(page: Page) {
  await openTab(page, /^사주/)
  await page.locator('#raw > summary').click()
  await expect(page.locator('#raw')).toHaveJSProperty('open', true)
}

test('단어는 우리말로만 보인다: 맨 위 다섯 단어, 다음 두 단어, 단어 풀이 카드에 영어 표기가 없다', async ({ page }) => {
  await openSaved(page)
  await expect(page.locator('.words .w')).toHaveText(['성취', '조율', '신념', '공정', '신중'])
  for (const sel of ['.words', '.support', '.card .bigword']) {
    for (const t of await page.locator(sel).allTextContents()) expect(t, sel).not.toMatch(/[A-Za-z]/)
  }
})

test('한자 용어는 한글 읽기와 함께 보이고, 기둥 아래에 읽기가 붙는다', async ({ page }) => {
  await openSaved(page)
  const text = await page.locator('main').innerText()
  for (const t of ['신(申)', '수이국(水二局)', '천기(天機)', '태음(太陰)']) expect(text, t).toContain(t)
  await expect(page.locator('.pillars:not(.three) .reading')).toHaveText(['정 · 미', '정 · 유', '기 · 묘', '을 · 유'])
  for (const who of await page.locator('.vsbody .who').allTextContents()) {
    if (who.includes('·')) expect(who.split('·')[1]!.trim(), who).toMatch(/^[가-힣]+\([一-鿿]+\)$/)
  }
})

test('자미두수 풀이는 문단으로 나뉘고, 명궁과 오행국을 한 문장으로 설명한다', async ({ page }) => {
  await openSaved(page)
  const sec = page.locator('section', { has: page.getByRole('heading', { name: '자미두수로 본 나' }) })
  const paras = sec.locator('p:not(.sub)')
  await expect(paras).toHaveCount(4) // 명궁 설명, 빈 궁 안내, 천기, 태음
  await expect(paras.nth(0)).toContainText('나를 나타내는 자리')
  await expect(paras.nth(1)).toContainText('빌려 온 별의 풀이는 아래와 같습니다')
  await expect(paras.nth(2)).toContainText('천기성')
  await expect(paras.nth(3)).toContainText('태음성')
})

test('겉에도 지장간에도 없는 오행과 크게 쌓인 오행의 풀이가 따로 나온다', async ({ page }) => {
  await openSaved(page, { year: 2003, month: 1, day: 15, time: { hour: 3, minute: 0 }, gender: 'M' })
  const sec = page.locator('section', { has: page.getByRole('heading', { name: '사주로 본 나' }) })
  const alerts = sec.locator('.alert')
  await expect(alerts).toHaveCount(2) // 목 없음(지장간에도), 수 크게 쌓임
  await expect(alerts.nth(0)).toContainText('목(木)이 천간·지지에도 지장간(숨은 글자)에도 없습니다')
  await expect(alerts.nth(1)).toContainText('수(水)가 크게 쌓여 있습니다')
})

test('태어난 정보만 다시 입력하면 같은 다섯 단어로 새 보고서가 나온다', async ({ page }) => {
  await openSaved(page)
  const words = await page.locator('.words').innerText()
  const pillars = await page.locator('.pillars:not(.three)').innerText()
  await page.getByRole('button', { name: '태어난 정보만 다시 입력' }).click()
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
  await expect(page.locator('.step-text')).toHaveCount(0) // 검사로 돌아가지 않는다
  await fillBirth(page, { y: '2004', m: '6', d: '20', time: ['10', ''], gender: '남' })
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  expect(await page.locator('.words').innerText()).toBe(words)
  expect(await page.locator('.pillars:not(.three)').innerText()).not.toBe(pillars)
  await page.reload()
  expect(await page.locator('.words').innerText()).toBe(words)
})

test('시만 적고 분을 비워 두면 0분으로 보고서가 나온다', async ({ page }) => {
  await page.goto('./')
  await runQuiz(page)
  await fillBirth(page, { time: ['14', ''] })
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  await expect(page.locator('.pillar')).toHaveCount(4 + 3)
})

test('시간 모름 + 절입일이면 월주 안내가 나오고, 아닌 날에는 나오지 않는다', async ({ page }) => {
  await openSaved(page, { year: 2005, month: 3, day: 5, time: null, gender: 'F' })
  await expect(page.locator('.month-note')).toContainText('월주가 달라질 수 있습니다')
  await expect(page.locator('.month-note')).not.toContainText('입춘')
  const p3 = await (await page.context().browser()!.newContext({ viewport: { width: 375, height: 800 } })).newPage()
  await seed(p3, { birth: { year: 2007, month: 2, day: 4, time: null, gender: 'M' } })
  await p3.goto('./')
  await expect(p3.locator('.month-note')).toContainText('입춘이 낀 날')
  await expect(p3.locator('.month-note')).toContainText('연주도 달라질 수')
  const other = await (await page.context().browser()!.newContext({ viewport: { width: 375, height: 800 } })).newPage()
  await seed(other, { birth: { ...SAVED.birth, time: null } })
  await other.goto('./')
  await expect(other.locator('.words li')).toHaveCount(5)
  await expect(other.locator('.month-note')).toHaveCount(0)
})

test('320px 입력 화면: 연도 안내가 잘리지 않고 "입력 안 함"이 줄바꿈되지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('./')
  await runQuiz(page)
  const year = page.locator('[name=year]')
  await expect(year).toHaveAttribute('placeholder', '연도')
  expect(await year.evaluate(i => i.scrollWidth <= i.clientWidth)).toBe(true)
  await expect(page.locator('[name=hour]')).not.toHaveAttribute('placeholder', /.+/)
  await expect(page.locator('[name=minute]')).not.toHaveAttribute('placeholder', /.+/)
  const none = page.locator('.choice span', { hasText: '입력 안 함' })
  expect(await none.evaluate(s => s.getBoundingClientRect().height)).toBeLessThanOrEqual(56)
  expect(await none.evaluate(s => s.scrollWidth <= s.clientWidth)).toBe(true)
})

test('사용 설명서 부제목은 화면 캡처를 말한다', async ({ page }) => {
  await openSaved(page)
  const sec = page.locator('#p5 + .wrap')
  await expect(sec.locator('.sub').first()).toContainText('캡처')
  await expect(sec.locator('.sub').first()).not.toContainText('그대로 보내도')
})

test('푸터에 저작권, 구성요소 안내 링크, 천문 계산 출처가 있고 시작 화면에는 라이선스 한 줄이 있다', async ({ page }) => {
  await openSaved(page)
  const footer = page.locator('footer')
  await expect(footer).toContainText('© 2026 five-words contributors')
  await expect(footer).toContainText('Swiss Ephemeris')
  await expect(footer.getByRole('link', { name: /구성요소/ })).toHaveAttribute('href', /NOTICE\.md$/)
})

test('시작 화면에 라이선스와 소스 링크 한 줄이 있다', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.intro .license')).toContainText('AGPL-3.0')
  await expect(page.locator('.intro .license a')).toHaveAttribute('href', 'https://github.com/jspark-inu/five-words')
})

test('태어난 정보 다시 입력 화면은 저장된 값으로 채워져 있고, 취소하면 같은 보고서로 돌아간다', async ({ page }) => {
  await openSaved(page)
  const before = await page.locator('.report').innerText()
  await page.getByRole('button', { name: '태어난 정보만 다시 입력' }).click()
  await expect(page.locator('[name=year]')).toHaveValue('2005')
  await expect(page.locator('[name=month]')).toHaveValue('3')
  await expect(page.locator('[name=day]')).toHaveValue('14')
  await expect(page.locator('[name=hour]')).toHaveValue('14')
  await expect(page.locator('[name=minute]')).toHaveValue('30')
  await expect(page.getByLabel('여', { exact: true })).toBeChecked()
  await page.getByRole('button', { name: '취소' }).click()
  await expect(page.locator('.words li')).toHaveCount(5)
  await openRaw(page) // 다시 그리면 명식은 접힌 채로 돌아온다
  expect(await page.locator('.report').innerText()).toBe(before)
  await page.reload()
  await openRaw(page)
  expect(await page.locator('.report').innerText()).toBe(before)
})

test('시간 모름으로 저장된 값은 다시 입력 화면에서도 시간 모름으로 채워진다', async ({ page }) => {
  await openSaved(page, { year: 2005, month: 3, day: 14, time: null, gender: null })
  await page.getByRole('button', { name: '태어난 정보만 다시 입력' }).click()
  await expect(page.getByLabel('태어난 시간을 몰라요')).toBeChecked()
  await expect(page.locator('[name=hour]')).toBeDisabled()
  await expect(page.getByLabel('입력 안 함', { exact: true })).toBeChecked()
})

test('구조적 위험 소제목에 어색한 조사 표기(이(가))가 없다', async ({ page }) => {
  await openSaved(page)
  await expect(page.locator('main')).not.toContainText('이(가)')
  await openTab(page, '5가지 강점 단어')
  await expect(page.getByRole('heading', { name: '구조적 위험 셋' })).toBeVisible()
})

test('시작 화면 라이선스 줄은 안내 문구와 같은 밝은 색이다', async ({ page }) => {
  await page.goto('./')
  const colors = await page.evaluate(() => [getComputedStyle(document.querySelector('.intro .meta')!).color, getComputedStyle(document.querySelector('.intro .license')!).color])
  expect(colors[1]).toBe(colors[0])
})

test('예전에 저장된 값(lowSignal 없음)도 그대로 열리고 안내는 없다', async ({ page }) => {
  await openSaved(page)
  await expect(page.locator('.low-signal')).toHaveCount(0)
})

test('근거가 얇은 결과(lowSignal)에는 가벼운 참고 안내가 다섯 단어 위에 나오고 공유 카드는 그대로 있다', async ({ page }) => {
  await seed(page, { lowSignal: true })
  await page.goto('./')
  await expect(page.locator('.low-signal')).toContainText('가벼운 참고')
  const order = await page.evaluate(() => { const l = document.querySelector('.low-signal')!, w = document.querySelector('.words')!; return !!(l.compareDocumentPosition(w) & Node.DOCUMENT_POSITION_FOLLOWING) })
  expect(order).toBe(true)
  await expect(page.locator('.share')).toBeVisible()
  await expect(page.locator('.low-signal')).not.toContainText('탭')
  await page.reload()
  await expect(page.locator('.low-signal')).toBeVisible()
  await page.getByRole('button', { name: '태어난 정보만 다시 입력' }).click()
  await page.getByRole('button', { name: '취소' }).click()
  await expect(page.locator('.low-signal')).toBeVisible()
})
