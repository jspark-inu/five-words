import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { STATEMENTS } from '../../src/content/statements'
import { WORDS } from '../../src/content/words'
import { BOTTOM, BOTTOM_STRONG, RUN_KEY, SAVED, TOP, TOP_STRONG, answerAll, count, finishFinal, ids, next, pickIds, rows, runUntilFunnel, runWordQuiz, seed } from './helpers'

async function fillBirth(page: Page) {
  await page.locator('[name=year]').fill('2005')
  await page.locator('[name=month]').fill('3')
  await page.locator('[name=day]').fill('14')
  await page.locator('[name=hour]').fill('14')
  await page.locator('[name=minute]').fill('30')
  await page.getByLabel('여', { exact: true }).check()
  await page.getByRole('button', { name: '보고서 보기' }).click()
}

const STUB_SHARE = `
  navigator.canShare = () => true
  navigator.share = async (data) => { window.__shared = data }
`


test('시작 화면에는 탭이 없고 소개와 시작하기만 있으며, 시작하면 단어 고르기가 나온다', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(page.getByText('문장으로 고르기')).toHaveCount(0)
  await expect(page.getByText('단어로 고르기')).toHaveCount(0)
  await expect(page.locator('.intro .meta')).toContainText('5분 안팎')
  await page.getByRole('button', { name: '시작하기' }).click()
  await expect(page.getByRole('heading', { name: '나와 닮은 단어를 8~15개 고르세요' })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
})

test('문장 방식 때 저장된 값(문장 결과, 마지막 탭, 예전 결과)이 있어도 오류 없이 시작 화면이 열리고 그 값은 조용히 지워진다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.addInitScript(([top, birth]) => {
    if (localStorage.getItem('seeded')) return
    localStorage.setItem('seeded', '1')
    localStorage.setItem('five-words:sentence:v2', JSON.stringify({ top: JSON.parse(top!), lowSignal: true }))
    localStorage.setItem('five-words:tab:v1', 'sentence')
    localStorage.setItem('five-words:result:v1', JSON.stringify({ top: JSON.parse(top!), birth: JSON.parse(birth!) }))
    localStorage.setItem('five-words:birth:v2', birth!)
  }, [JSON.stringify(SAVED.top), JSON.stringify(SAVED.birth)])
  await page.goto('./')
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
  await expect(page.locator('.words li')).toHaveCount(0)
  expect(errors).toEqual([])
  const keys = await page.evaluate(() => Object.keys(localStorage).sort())
  expect(keys).toEqual(['five-words:birth:v2', 'seeded'])
})

test('결과는 하나뿐이다: 끝내면 저장은 결과와 생년월일 두 키, 새로고침해도 같고, 지우면 모두 지워진다', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '시작하기' }).click()
  await runWordQuiz(page)
  await fillBirth(page)
  await expect(page.locator('.words li')).toHaveCount(5)
  await expect(page.locator('.card.far')).toHaveCount(3)
  await expect(page.locator('.overlap')).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveText(['전체 요약', '5가지 강점 단어', '사주·자미두수']) // 결과 화면의 세 탭뿐이다(검사 방식을 고르는 탭은 없다)
  const words = await page.locator('.words .w').allTextContents()
  expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(['five-words:birth:v2', 'five-words:word:v2'])
  await page.reload()
  expect(await page.locator('.words .w').allTextContents()).toEqual(words)
  await page.getByRole('button', { name: '결과 지우기' }).click()
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})

test('태어난 정보를 고치면 보고서가 새 값을 쓰고 단어는 그대로다', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '시작하기' }).click()
  await runWordQuiz(page)
  await fillBirth(page)
  const words = await page.locator('.words').innerText()
  const before = await page.locator('.pillars:not(.three)').textContent()
  await page.getByRole('button', { name: '태어난 정보만 다시 입력' }).click()
  await page.locator('[name=year]').fill('2004')
  await page.getByRole('button', { name: '보고서 보기' }).click()
  await expect(page.locator('.card.far')).toHaveCount(3)
  expect(await page.locator('.words').innerText()).toBe(words)
  expect(await page.locator('.pillars:not(.three)').textContent()).not.toBe(before)
})

test('단어 방식 검사 전체와 이어하기, 카드 경로까지 네트워크 요청이 문서뿐이고 입력값이 나가지 않는다', async ({ page, context, baseURL }) => {
  await page.addInitScript(STUB_SHARE)
  const reqs = record(context)
  await page.goto('./')
  await page.getByRole('button', { name: '시작하기' }).click()
  await runUntilFunnel(page, 9)
  await page.waitForTimeout(210)
  await page.locator(TOP).click()
  await page.waitForTimeout(210)
  await page.locator(TOP).click()
  await page.reload() // 중간에 나갔다가 이어서 한다
  await page.getByRole('button', { name: '이어서 하기' }).click()
  await answerAll(page)
  await fillBirth(page)
  await expect(page.locator('.words li')).toHaveCount(5)
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  await page.waitForFunction(() => (window as any).__shared)
  await page.waitForTimeout(800)
  await page.reload()
  await expect(page.locator('.words li')).toHaveCount(5)
  const net = reqs.filter(r => !isLocal(r.url))
  const doc = new URL('./', baseURL!).href
  expect(net.map(r => `${r.method} ${r.url}`)).toEqual([`GET ${doc}`, `GET ${doc}`, `GET ${doc}`])
  for (const r of reqs) { expect(r.body).toBeNull(); expect(r.url).not.toMatch(/[?&#]/) }
})

test('단어 방식 검사도 오프라인에서 이어하기를 포함해 끝까지 되고 카드 이미지가 나온다', async ({ page, context }) => {
  await page.addInitScript(STUB_SHARE)
  const reqs = record(context)
  await page.goto('./')
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible()
  const before = reqs.length
  await context.setOffline(true)
  await page.getByRole('button', { name: '시작하기' }).click()
  await runUntilFunnel(page, 12)
  await page.waitForTimeout(210)
  await page.locator(TOP).click()
  await answerAll(page)
  await fillBirth(page)
  await expect(page.locator('.card.far')).toHaveCount(3)
  await page.getByRole('button', { name: '이미지로 보내기' }).click()
  await page.waitForFunction(() => (window as any).__shared)
  const info = await page.evaluate(async () => {
    const f: File = (window as any).__shared.files[0]
    const bmp = await createImageBitmap(f)
    return { type: f.type, w: bmp.width, h: bmp.height }
  })
  expect(info).toEqual({ type: 'image/png', w: 1080, h: 1350 })
  await page.waitForTimeout(500)
  expect(reqs.slice(before).filter(r => !isLocal(r.url))).toEqual([])
})

test('단어 줄에는 담백한 한 줄 뜻풀이가 보이고 예전 뜻 문장은 보이지 않는다', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '시작하기' }).click()
  const glosses = await page.locator('.word-meaning').allTextContents()
  expect(glosses).toHaveLength(34)
  expect(new Set(glosses).size).toBe(34)
  expect(glosses.join('\n')).not.toContain('잠이 온다')
  for (const g of glosses) expect(g.length).toBeLessThanOrEqual(20)
  const details = await page.locator('.word-detail').allTextContents()
  expect(details).toHaveLength(34)
  expect(new Set(details).size).toBe(34)
})

test('제목 글꼴이 단어 고르기 제목과 먼 단어 제목에도 쓰이고 글자가 모두 들어 있다', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '시작하기' }).click()
  const fam = await page.locator('.pick .question').evaluate(e => getComputedStyle(e).fontFamily)
  expect(fam).toContain('Black Han Sans')
  const ok = await page.evaluate(async () => {
    const titles = ['나와 닮은 단어를 8~15개 고르세요', '나와 가장 먼 단어 3개를 고르세요', '둘 중 어느 쪽이 더 나 같나요?', '답을 보고 다섯 단어를 정했어요', '나와 가장 먼 단어']
    await document.fonts.load('28px "Black Han Sans"', titles.join(''))
    return titles.every(t => document.fonts.check('28px "Black Han Sans"', t))
  })
  expect(ok).toBe(true)
})


async function openWordTab(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: '시작하기' }).click()
}
const RUN = RUN_KEY
const readRun = (page: Page) => page.evaluate(k => { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null }, RUN)

test('1단계: 8~15개를 고르게 하고 개수와 한 줄 안내를 보여 주며, 15개 뒤에는 눌러도 아무 일이 없다', async ({ page }) => {
  await openWordTab(page)
  await expect(page.locator('.step-text')).toContainText('1단계 / 2단계')
  await expect(page.locator('.sub')).toContainText('되고 싶은 나 말고 실제 나')
  await expect(rows(page)).toHaveCount(34)
  await expect(next(page)).toBeDisabled()
  for (let i = 0; i < 7; i++) await rows(page).nth(i).click()
  await expect(count(page)).toHaveText('7개 (8~15개)')
  await expect(page.locator('.nudge')).toHaveText('1개만 더 골라 주세요.')
  await expect(next(page)).toBeDisabled()
  await rows(page).nth(7).click()
  await expect(next(page)).toBeEnabled()
  await expect(page.locator('.nudge')).toHaveText('')
  for (let i = 8; i < 15; i++) await rows(page).nth(i).click()
  await expect(count(page)).toHaveText('15개 (8~15개)')
  await expect(page.locator('.nudge')).toHaveText('최대 15개까지 고를 수 있어요.')
  await expect(next(page)).toBeEnabled()
  await rows(page).nth(15).click()
  await expect(count(page)).toHaveText('15개 (8~15개)')
  await expect(rows(page).nth(15)).toHaveAttribute('aria-pressed', 'false')
  await rows(page).nth(0).click()
  await expect(count(page)).toHaveText('14개 (8~15개)')
})

test('목록 순서는 열 때마다 달라지고, 줄은 56px 이상이며 아래 막대에 개수와 다음이 고정돼 있다', async ({ page }) => {
  await openWordTab(page)
  const first = await ids(page)
  await page.reload()
  await page.getByRole('button', { name: '시작하기' }).click()
  expect(await ids(page)).not.toEqual(first)
  const heights = await rows(page).evaluateAll(els => els.map(e => e.getBoundingClientRect().height))
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(56)
  await page.evaluate(() => window.scrollTo(0, 600))
  const bar = await page.locator('.pickbar').boundingBox()
  expect(Math.abs(bar!.y + bar!.height - page.viewportSize()!.height)).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})

test('먼 단어 3개는 고르지 않은 단어 중에서 고르고, 이전으로 돌아가도 선택이 남는다', async ({ page }) => {
  await openWordTab(page)
  const first = (await ids(page)).slice(0, 8)
  await pickIds(page, first)
  await next(page).click()
  await expect(page.getByRole('heading', { name: '나와 가장 먼 단어 3개를 고르세요' })).toBeVisible()
  await expect(page.locator('.sub')).toContainText('약점을 고르는 게 아니에요')
  const second = await ids(page)
  expect(second).toHaveLength(26)
  for (const id of first) expect(second).not.toContain(id)
  for (let i = 0; i < 4; i++) await rows(page).nth(i).click()
  await expect(count(page)).toHaveText('3 / 3')
  await page.getByRole('button', { name: '이전', exact: true }).click()
  await expect(count(page)).toHaveText('8개 (8~15개)')
  await next(page).click()
  await expect(count(page)).toHaveText('3 / 3') // 먼 단어 선택도 그대로
})

const WORD_OF = new Map(Object.entries(STATEMENTS).flatMap(([id, list]) => list.map(t => [t, id] as const)))
/** 지금 문항의 카드 두 장(위, 아래)의 행동 문장과 그 문장의 단어. */
const cardWords = async (page: Page) => {
  const texts = await page.locator('.pair-card .stmt').allTextContents()
  return texts.map(t => ({ text: t, id: WORD_OF.get(t)! }))
}

test('둘 중 고르기는 행동 문장 카드 두 장이 위아래로 놓이고 단어 이름은 보이지 않으며 둘 다 맞아요·둘 다 아니에요가 있다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page)
  await expect(page.locator('.step-text')).toHaveText('2단계 / 2단계 · 둘 중 고르기 1 / 30')
  await expect(page.getByRole('heading', { name: '둘 중 어느 쪽이 더 나 같나요?' })).toBeVisible()
  await expect(page.locator('.sub')).toHaveText('둘 다 맞아도 더 맞는 쪽을 고르세요. 되고 싶은 나 말고 평소 실제로 하는 쪽으로요.')
  const cards = page.locator('.pair-card')
  await expect(cards).toHaveCount(2)
  const [a, b] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()])
  expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 1) // 좌우가 아니라 위아래
  expect(Math.abs(a!.x - b!.x)).toBeLessThanOrEqual(1)
  const words = await cardWords(page)
  expect(words).toHaveLength(2)
  for (const w of words) expect(w.id, w.text).toBeTruthy() // 카드 글은 행동 문장 사전에 있는 문장이다
  const cardText = await cards.allInnerTexts()
  for (const w of WORDS) for (const t of cardText) expect(t).not.toContain(w.ko) // 카드에는 단어 이름이 없다
  await expect(page.locator('[data-choice="both"]')).toHaveText('둘 다 맞아요')
  await expect(page.locator('[data-choice="none"]')).toHaveText('둘 다 아니에요')
  expect((await page.locator('[data-choice="none"]').boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await expect(page.locator('.pair-card[data-key="a"]')).toHaveCount(1)
  await expect(page.locator('.pair-card[data-key="b"]')).toHaveCount(1)
  // 카드마다 "훨씬 더 / 조금 더" 버튼 두 개가 그 카드 안에 있다
  for (const card of [cards.nth(0), cards.nth(1)]) {
    await expect(card.locator('.grade')).toHaveText(['훨씬 더 나 같아요', '조금 더 나 같아요'])
    for (const b of await card.locator('.grade').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})

test('카드 위아래는 문항마다 번갈아 바뀌고, 눌린 쪽 기호(조금 더 a·b, 훨씬 더 a2·b2)가 저장된다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page)
  const firstKeys: string[] = []
  for (let q = 0; q < 4; q++) {
    await page.waitForTimeout(210)
    firstKeys.push((await page.locator('.pair-card').first().getAttribute('data-key'))!)
    await page.locator(TOP).click()
  }
  expect(firstKeys).toEqual(['a', 'b', 'a', 'b'])
  expect((await readRun(page)).answers).toEqual(['a', 'b', 'a', 'b'])
  await page.waitForTimeout(210)
  await page.locator('[data-choice="both"]').click()
  await page.waitForTimeout(210)
  await page.locator('[data-choice="none"]').click()
  expect((await readRun(page)).answers).toEqual(['a', 'b', 'a', 'b', 'both', 'none'])
  // 7번째 문항은 a가 위, 8번째는 b가 위다. 위 카드의 "훨씬 더", 아래 카드의 "훨씬 더", 아래 카드의 "조금 더"
  for (const sel of [TOP_STRONG, BOTTOM_STRONG, BOTTOM]) { await page.waitForTimeout(210); await page.locator(sel).click() }
  expect((await readRun(page)).answers).toEqual(['a', 'b', 'a', 'b', 'both', 'none', 'a2', 'a2', 'b'])
})

test('끝까지: 보고서에 다섯 단어, 다음 두 단어, 먼 단어 3개가 나오고 진행 상태는 지워진다', async ({ page }) => {
  await openWordTab(page)
  const taps = await runWordQuiz(page, 10)
  console.log(`검사 전체 탭 수(10개 고름): ${taps}`)
  // 근거: 단어 10개 + 다음 1 + 먼 단어 3개 + 다음 1 + 30문항(문항마다 한 번) + 마지막 확인은 미리 눌려 있어 다음 1 = 46.
  // 문항 수가 고정이라 탭 수도 고정이다. 고른 단어 수 8~15에 따라 8~15가 달라져 범위는 44~51이다.
  expect(taps).toBe(46)
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
  expect(await readRun(page)).not.toBeNull() // 결과를 저장하기 전(생년월일 입력 중)에는 이어하기 상태가 남는다
  await page.reload()
  await page.getByRole('button', { name: '이어서 하기' }).click() // 마지막 확인 화면으로 돌아오고, 눌러 둔 순서가 그대로다
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  await expect(count(page)).toHaveText('5 / 5')
  await page.waitForTimeout(210)
  await next(page).click()
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
  await fillBirth(page)
  await expect(page.locator('.words li')).toHaveCount(5)
  await expect(page.locator('.support')).toContainText('다음으로 가까운 두 단어')
  await expect(page.locator('.support b')).toHaveCount(2)
  await expect(page.locator('.card.far')).toHaveCount(3)
  const heads = await page.locator('main h2').allTextContents()
  expect(heads[0]).toBe('한 줄로 말하면') // 전체 요약 탭이 먼저
  expect(heads.slice(heads.indexOf('강점 리포트'), heads.indexOf('강점 리포트') + 2)).toEqual(['강점 리포트', '다섯 단어 하나씩'])
  expect(heads).toContain('나와 가장 먼 단어')
  expect(await readRun(page)).toBeNull()
  const kos = await page.locator('.words .w').allTextContents()
  const far = await page.locator('.card.far .bigword').evaluateAll(els => els.map(e => e.firstChild!.textContent!.trim()))
  const support = await page.locator('.support b').allTextContents()
  expect(new Set([...kos, ...far, ...support]).size).toBe(10)
  const share = await page.locator('#friend-card-mount .share').innerText()
  for (const w of [...far, ...support]) expect(share).not.toContain(w)
})

test('진행 중에 새로고침하면 시작 화면에 이어서 하기와 처음부터가 나오고, 이어서 하면 같은 질문에서 계속된다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page, 9)
  await page.waitForTimeout(210)
  await page.locator(TOP).click()
  await page.waitForTimeout(210)
  await page.locator(TOP).click()
  const heading = await page.locator('.step-text').innerText()
  const body = await page.locator('main').innerText()
  const run = await readRun(page)
  expect(run.stage).toBe('funnel')
  expect(run.answers).toHaveLength(2)
  // 저장 상태에는 단어 id와 답변 기호만 있다
  const idRe = /^[a-z]+$/
  for (const id of [...run.order, ...run.picked, ...run.far]) expect(id).toMatch(idRe)
  for (const a of run.answers) expect(a).toMatch(/^(a2|a|b|b2|both|none)$/)
  expect(Object.keys(run).sort()).toEqual(['answers', 'far', 'order', 'picked', 'stage', 'total'])
  await page.reload()
  await expect(page.getByRole('button', { name: '이어서 하기' })).toBeVisible()
  await expect(page.getByRole('button', { name: '처음부터' })).toBeVisible()
  await expect(page.getByRole('button', { name: '시작하기' })).toHaveCount(0)
  await page.getByRole('button', { name: '이어서 하기' }).click()
  expect(await page.locator('.step-text').innerText()).toBe(heading)
  expect(await page.locator('main').innerText()).toBe(body) // 같은 질문, 같은 순서
  // 끝까지 가서 보고서를 받는다
  await answerAll(page)
  await fillBirth(page)
  await expect(page.locator('.words li')).toHaveCount(5)
  expect(await readRun(page)).toBeNull()
})

test('처음부터를 누르면 진행 상태를 버리고 1단계 처음으로 간다, 1단계 중간 선택도 이어진다', async ({ page }) => {
  await openWordTab(page)
  for (let i = 0; i < 4; i++) await rows(page).nth(i).click()
  const picked = (await readRun(page)).picked
  expect(picked).toHaveLength(4)
  await page.reload()
  await page.getByRole('button', { name: '이어서 하기' }).click()
  await expect(count(page)).toHaveText('4개 (8~15개)')
  expect((await readRun(page)).picked).toEqual(picked)
  await page.reload()
  await page.getByRole('button', { name: '처음부터' }).click()
  await expect(count(page)).toHaveText('0개 (8~15개)')
  expect(await readRun(page)).toBeNull()
})

test('이전은 직전 답변을 취소하고 같은 질문으로 돌아가며, 첫 질문에서는 먼 단어 고르기로 돌아간다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page)
  const q1 = await page.locator('main').innerText()
  await page.waitForTimeout(210)
  await page.locator(TOP).click()
  const q2 = await page.locator('main').innerText()
  expect(q2).not.toBe(q1)
  await page.getByRole('button', { name: '이전', exact: true }).click()
  expect(await page.locator('main').innerText()).toBe(q1)
  expect((await readRun(page)).answers).toHaveLength(0)
  await page.getByRole('button', { name: '이전', exact: true }).click()
  await expect(page.getByRole('heading', { name: '나와 가장 먼 단어 3개를 고르세요' })).toBeVisible()
  await expect(count(page)).toHaveText('3 / 3')
})

test('1단계에서 놓친 단어도 답에서 계속 이기면 다섯 단어에 들어오고, 마지막 확인이 그 사실을 알려 준다', async ({ page }) => {
  await openWordTab(page)
  await pickIds(page, ['rivalry', 'future', 'repair', 'inclusion', 'excellence', 'learning', 'optimism', 'concord'])
  await next(page).click()
  await pickIds(page, ['coaching', 'collecting', 'tailoring'])
  await next(page).click()
  // 성취는 1단계에서 고르지 않았다. 성취 문장이 나오면 늘 그쪽을 누른다.
  let n = 0
  for (let g = 0; g < 80 && (await page.locator('.pair-card').count()) > 0; g++) {
    await page.waitForTimeout(210)
    const words = await cardWords(page)
    const at = words.findIndex(w => w.id === 'achievement')
    await page.locator(at === 1 ? BOTTOM : TOP).click()
    n++
  }
  expect(n).toBe(30)
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  await expect(page.locator('.narrowing')).toContainText('처음엔 안 골랐지만 답에서 나온 단어: ')
  expect(await page.locator('.narrowing').innerText()).toContain('성취')
  await expect(page.locator('.word-row[data-id="achievement"] .word-tag')).toHaveText('처음엔 고르지 않았어요')
  // 늘 이겼으니 다섯 안에 눌려 있다. 한 단어는 8번까지만 물어서(문장 8개) 1위를 장담하지는 않는다. 다른 단어도 첫 카드로 눌려 이기기 때문이다.
  await expect(page.locator('.word-row[data-id="achievement"] .badge')).toHaveText(/^[1-5]$/)
  await page.waitForTimeout(210)
  await next(page).click()
  await fillBirth(page)
  expect(await page.locator('.words .w').allTextContents()).toContain('성취')
})

const isLocal = (u: string) => u.startsWith('data:') || u.startsWith('blob:')
function record(context: BrowserContext) {
  const reqs: { url: string; method: string; body: string | null }[] = []
  context.on('request', r => reqs.push({ url: r.url(), method: r.method(), body: r.postData() }))
  return reqs
}

test('60문항 때 하던 학생: 이어서 하면 앞 17개 답은 남고 18 / 30번부터 묻는다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page)
  await page.waitForTimeout(260)
  await page.locator(TOP).click()
  await page.waitForTimeout(300)
  // 예전(60문항) 저장값처럼 만든다: 문항 수 표시(total)가 없고 답이 40개
  await page.evaluate(k => { const r = JSON.parse(localStorage.getItem(k)!); delete r.total; r.answers = Array(40).fill('a'); localStorage.setItem(k, JSON.stringify(r)) }, RUN_KEY)
  await page.reload()
  await page.getByRole('button', { name: '이어서 하기' }).click()
  await expect(page.locator('.step-text')).toHaveText('2단계 / 2단계 · 둘 중 고르기 18 / 30')
  await page.waitForTimeout(260)
  await page.locator(TOP).click()
  await page.waitForTimeout(300)
  const run = JSON.parse((await page.evaluate(k => localStorage.getItem(k), RUN_KEY))!)
  expect(run.answers).toHaveLength(18)
  expect(run.total).toBe(30)
})

test('질문 화면의 더블탭은 한 질문만 답한 것으로 센다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page)
  await page.waitForTimeout(260)
  await page.locator(TOP).dblclick()
  await page.waitForTimeout(300)
  expect((await readRun(page)).answers).toHaveLength(1)
  // 막 나타난 질문에 곧바로 누른 탭은 무시된다
  await page.locator(TOP).click({ delay: 0 })
  expect((await readRun(page)).answers.length).toBeLessThanOrEqual(2)
})

test('320x568 작은 화면에서도 카드 두 장, 카드마다 훨씬 더·조금 더, 둘 다 맞아요·둘 다 아니에요가 첫 화면 안에 보인다 (앞 20문항)', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await openWordTab(page)
  await pickIds(page, ['achievement', 'coordination', 'conviction', 'fairness', 'caution', 'order', 'concentration', 'accountability', 'repair', 'initiative', 'leadership', 'expression', 'rivalry', 'excellence', 'confidence'])
  await next(page).click()
  await pickIds(page, (await ids(page)).slice(0, 3))
  await next(page).click()
  for (let g = 0; g < 20; g++) {
    if ((await page.locator('.pair-card').count()) !== 2) break
    await expect(page.locator('.sub')).toBeVisible() // "둘 다 맞아도 더 맞는 쪽을 고르세요" 안내는 작은 화면에서도 보인다
    for (const sel of ['.sub', '.pair-card[data-key="a"]', '.pair-card[data-key="b"]', TOP_STRONG, TOP, BOTTOM_STRONG, BOTTOM, '[data-choice="both"]', '[data-choice="none"]']) {
      const box = await page.locator(sel).boundingBox()
      expect(box!.y + box!.height, `${sel} 아래쪽`).toBeLessThanOrEqual(568)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    await page.waitForTimeout(210)
    await page.locator(TOP).click()
  }
})

/** 근거가 얇아지게 답한다: 30문항 모두 "둘 다 아니에요". */
async function answerThin(page: Page) {
  for (let guard = 0; guard < 80; guard++) {
    await page.waitForTimeout(210)
    if ((await page.locator('.pair-card').count()) === 0) return
    await page.locator('[data-choice="none"]').click()
  }
  throw new Error('문항이 끝나지 않았다')
}

test('근거가 얇은 단어 결과에는 가벼운 참고 안내가 나온다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page, 8)
  await answerThin(page)
  await finishFinal(page)
  await fillBirth(page)
  await expect(page.locator('.low-signal')).toContainText('분명하게 확인된 단어가 많지 않았어요')
  await page.reload()
  await expect(page.locator('.low-signal')).toBeVisible()
})

async function reachFinal(page: Page, picks = 9) {
  await openWordTab(page)
  await runUntilFunnel(page, picks)
  for (let g = 0; g < 80 && (await page.locator('.pair-card').count()) > 0; g++) {
    await page.waitForTimeout(210)
    await page.locator(TOP).click()
  }
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  await page.waitForTimeout(210)
}

test('마지막 확인: 점수로 정한 다섯이 순서대로 미리 눌려 있고, 그대로 다음을 누르면 그 순서가 다섯 단어가 된다', async ({ page }) => {
  await reachFinal(page)
  await expect(page.getByRole('heading', { name: '답을 보고 다섯 단어를 정했어요' })).toBeVisible()
  await expect(rows(page)).toHaveCount(8)
  await expect(count(page)).toHaveText('5 / 5')
  await expect(next(page)).toBeEnabled()
  expect(await page.locator('main').innerText()).not.toMatch(/\d+점/) // 점수는 보이지 않는다
  const all = await ids(page)
  for (let i = 0; i < 5; i++) await expect(page.locator(`.word-row[data-id="${all[i]}"] .badge`)).toHaveText(String(i + 1)) // 위 다섯이 1~5위
  for (let i = 5; i < 8; i++) await expect(page.locator(`.word-row[data-id="${all[i]}"]`)).toHaveAttribute('aria-pressed', 'false')
  const kos = await Promise.all(all.slice(0, 5).map(id => page.locator(`.word-row[data-id="${id}"] .ko`).innerText()))
  const leftKos = await Promise.all(all.slice(5).map(id => page.locator(`.word-row[data-id="${id}"] .ko`).innerText()))
  await next(page).click()
  await fillBirth(page)
  expect(await page.locator('.words .w').allTextContents()).toEqual(kos)
  const support = await page.locator('.support b').allTextContents()
  expect(support).toHaveLength(2)
  for (const s of support) expect(leftKos).toContain(s)
  expect(await readRun(page)).toBeNull()
})

test('마지막 확인: 아닌 단어를 빼고 남은 후보를 누르면 바뀐 단어가 맨 뒤 순위로 들어간다', async ({ page }) => {
  await reachFinal(page)
  const all = await ids(page)
  await page.locator(`.word-row[data-id="${all[1]}"]`).click() // 2위를 뺀다
  await expect(count(page)).toHaveText('4 / 5')
  await expect(next(page)).toBeDisabled()
  await page.locator(`.word-row[data-id="${all[6]}"]`).click()
  await expect(count(page)).toHaveText('5 / 5')
  const order = [all[0]!, all[2]!, all[3]!, all[4]!, all[6]!]
  for (let i = 0; i < 5; i++) await expect(page.locator(`.word-row[data-id="${order[i]}"] .badge`)).toHaveText(String(i + 1))
  await rows(page).locator(`xpath=self::*[@data-id="${all[7]}"]`).click() // 여섯 번째는 눌러도 아무 일이 없다
  await expect(count(page)).toHaveText('5 / 5')
  const kos = await Promise.all(order.map(id => page.locator(`.word-row[data-id="${id}"] .ko`).innerText()))
  await next(page).click()
  await fillBirth(page)
  expect(await page.locator('.words .w').allTextContents()).toEqual(kos)
})

test('마지막 확인: 1단계와 답이 어긋난 곳을 알려 준다 (놓친 단어 표시, 약하게 나온 단어)', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page, 12)
  // 문항 화면에는 후보 수 안내가 없다
  for (let g = 0; g < 80 && (await page.locator('.pair-card').count()) > 0; g++) {
    await page.waitForTimeout(210)
    expect(await page.locator('.narrowing').count()).toBe(0)
    await page.locator('[data-choice="none"]').click() // 모두 "둘 다 아니에요": 고른 단어가 모두 기준점 아래로 내려간다
  }
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  const note = await page.locator('.narrowing').innerText()
  expect(note).toContain('처음엔 골랐지만 답에서는 약하게 나온 단어: ')
  expect(note).not.toContain('잘 맞았어요')
  const weak = note.split('약하게 나온 단어: ')[1]!.split('.')[0]!.split(', ')
  expect(weak.length).toBeGreaterThan(0)
  // 고르지 않았던 단어가 후보에 있으면 표시가 붙는다
  const tagged = await page.locator('.word-tag').count()
  const tagText = tagged > 0 ? await page.locator('.word-tag').first().innerText() : '처음엔 고르지 않았어요'
  expect(tagText).toBe('처음엔 고르지 않았어요')
})

test('마지막 확인: 고른 단어가 답에서도 이기면 "잘 맞았어요"가 나온다', async ({ page }) => {
  await openWordTab(page)
  const mine = ['achievement', 'coordination', 'conviction', 'fairness', 'caution', 'order', 'concentration', 'accountability']
  await pickIds(page, mine)
  await next(page).click()
  await pickIds(page, ['coaching', 'collecting', 'inclusion'])
  await next(page).click()
  // 고른 단어는 늘 이기고, 둘 다 고른 단어이면 둘 다 맞아요, 둘 다 안 고른 단어이면 둘 다 아니에요를 누른다.
  for (let g = 0; g < 80 && (await page.locator('.pair-card').count()) > 0; g++) {
    await page.waitForTimeout(210)
    const w = await cardWords(page)
    const inMine = w.map(x => mine.includes(x.id))
    if (inMine[0] && inMine[1]) await page.locator('[data-choice="both"]').click()
    else if (!inMine[0] && !inMine[1]) await page.locator('[data-choice="none"]').click()
    else await page.locator(inMine[0] ? TOP : BOTTOM).click()
  }
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  await expect(page.locator('.narrowing')).toHaveText('1단계에서 고른 단어와 답이 잘 맞았어요.')
})

test('마지막 확인: 다시 누르면 빠지며 번호가 당겨지고, 이전은 직전 질문으로 돌아가고 바꾼 선택은 새로고침 뒤에도 남는다', async ({ page }) => {
  await reachFinal(page)
  const all = await ids(page)
  const badge = (id: string) => page.locator(`.word-row[data-id="${id}"] .badge`)
  await page.locator(`.word-row[data-id="${all[0]}"]`).click() // 1위를 뺀다
  await expect(badge(all[0]!)).toHaveText('')
  await expect(badge(all[1]!)).toHaveText('1')
  await expect(badge(all[2]!)).toHaveText('2')
  expect((await readRun(page)).stage).toBe('final')
  expect((await readRun(page)).final).toEqual(all.slice(1, 5))
  await page.reload()
  await page.getByRole('button', { name: '이어서 하기' }).click()
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  expect(await ids(page)).toEqual(all) // 같은 순서
  await expect(badge(all[1]!)).toHaveText('1')
  await expect(count(page)).toHaveText('4 / 5')
  await page.getByRole('button', { name: '이전', exact: true }).click()
  await expect(page.locator('.step-text')).toHaveText('2단계 / 2단계 · 둘 중 고르기 30 / 30')
  expect((await readRun(page)).answers).toHaveLength(29) // 직전 답 하나만 지워진다
})

test('마지막 확인 첫 화면에 곧바로 누른 탭은 무시된다 (더블탭 방지)', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page, 8)
  for (let g = 0; g < 80; g++) {
    const c = page.locator('.pair-card')
    if ((await c.count()) === 0) break
    await page.waitForTimeout(210)
    const last = (await page.locator('.step-text').innerText()).endsWith('30 / 30')
    if (last) { await page.locator(TOP).dblclick(); break }
    await page.locator(TOP).click()
  }
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  await expect(count(page)).toHaveText('5 / 5') // 더블탭의 두 번째 탭이 미리 눌린 단어를 빼지 않았다
  await expect(page.locator('.step-text')).toContainText('마지막 확인') // 다음도 눌리지 않았다
})

test('분명한 후보가 얇은 결과는 마지막 확인 뒤에도 가벼운 참고 안내가 남는다', async ({ page }) => {
  await openWordTab(page)
  await runUntilFunnel(page, 8)
  await answerThin(page)
  // 마지막 확인에서 미리 눌린 다섯을 모두 바꿔 고르고, 그 순서가 다섯 단어가 된 뒤에도 안내가 그대로인지 본다.
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  const chosen = (await ids(page)).reverse().slice(0, 5)
  await finishFinal(page, () => chosen)
  await fillBirth(page)
  await expect(page.locator('.words li')).toHaveCount(5)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('five-words:word:v2')!).top as string[])
  expect(saved).toEqual(chosen.slice(0, 5))
  await expect(page.locator('.low-signal')).toContainText('분명하게 확인된 단어가 많지 않았어요')
})

test('1단계를 다시 하면 예전 마지막 확인 선택은 버려지고, 먼 단어 3개 선택은 남는다', async ({ page }) => {
  await reachFinal(page)
  const all = await ids(page)
  await page.locator(`.word-row[data-id="${all[0]}"]`).click() // 하나를 빼 둔다
  expect((await readRun(page)).final).toHaveLength(4)
  // 이전을 눌러 1단계까지 돌아간다
  for (let g = 0; g < 70 && (await page.locator('.step-text', { hasText: '1단계 / 2단계 · 단어 고르기' }).count()) === 0; g++) {
    await page.getByRole('button', { name: '이전', exact: true }).click()
  }
  await expect(page.locator('.step-text')).toContainText('1단계 / 2단계 · 단어 고르기')
  expect((await readRun(page)).final).toHaveLength(4) // 아직 다시 하지 않았으니 남아 있다
  await rows(page).locator('xpath=self::*[@aria-pressed="true"]').first().click() // 선택 하나를 바꾼다
  await rows(page).locator('xpath=self::*[@aria-pressed="false"]').first().click()
  await next(page).click()
  expect((await readRun(page)).final).toBeUndefined()
  await next(page).click() // 먼 단어 3개는 그대로
  await page.waitForTimeout(210)
  for (let g = 0; g < 80 && (await page.locator('.pair-card').count()) > 0; g++) { await page.waitForTimeout(210); await page.locator(TOP).click() }
  await expect(page.locator('.step-text')).toContainText('마지막 확인')
  await expect(count(page)).toHaveText('5 / 5') // 예전 선택(4개)이 아니라 새 점수로 정한 다섯이 눌려 있다
})

test('먼 단어 고르기와 마지막 확인에는 "최대 …개까지" 안내가 없고, 1단계에는 있다', async ({ page }) => {
  await openWordTab(page)
  for (let i = 0; i < 15; i++) await rows(page).nth(i).click()
  await expect(page.locator('.nudge')).toHaveText('최대 15개까지 고를 수 있어요.')
  await rows(page).nth(0).click()
  await next(page).click()
  for (let i = 0; i < 3; i++) await rows(page).nth(i).click()
  await expect(count(page)).toHaveText('3 / 3')
  await expect(page.locator('.nudge')).toHaveText('')
})
