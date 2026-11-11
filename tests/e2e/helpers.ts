import { expect, type Page } from '@playwright/test'

export const WORD_KEY = 'five-words:word:v2'
export const BIRTH_KEY = 'five-words:birth:v2'
export const RUN_KEY = 'five-words:wordrun:v4'
/** 둘 중 고르기 버튼: 위 카드·아래 카드의 "조금 더 나 같아요"와 "훨씬 더 나 같아요". */
export const TOP = '.grade[data-pos="top"][data-strength="slight"]'
export const BOTTOM = '.grade[data-pos="bottom"][data-strength="slight"]'
export const TOP_STRONG = '.grade[data-pos="top"][data-strength="strong"]'
export const BOTTOM_STRONG = '.grade[data-pos="bottom"][data-strength="strong"]'

export const SAVED = {
  top: ['achievement', 'coordination', 'conviction', 'fairness', 'caution'],
  far: ['coaching', 'collecting', 'inclusion'],
  birth: { year: 2005, month: 3, day: 14, time: { hour: 14, minute: 30 }, gender: 'F' },
}

/** 저장된 결과로 연다(이미 있으면 덮어쓰지 않는다). 결과와 생년월일시는 각자 키에 들어간다. */
export async function seed(page: Page, o: { top?: string[]; far?: string[]; birth?: object; lowSignal?: boolean } = {}, always = false) {
  const picks = { top: o.top ?? SAVED.top, far: o.far ?? SAVED.far, ...(o.lowSignal === undefined ? {} : { lowSignal: o.lowSignal }) }
  await page.addInitScript(([w, wv, b, bv, force]) => {
    if (force || !localStorage.getItem(w!)) { localStorage.setItem(w!, wv!); localStorage.setItem(b!, bv!) }
  }, [WORD_KEY, JSON.stringify(picks), BIRTH_KEY, JSON.stringify(o.birth ?? SAVED.birth), always ? '1' : ''])
}

export const rows = (page: Page) => page.locator('.word-row')
export const ids = (page: Page) => rows(page).evaluateAll(els => els.map(e => e.getAttribute('data-id')!))
export const next = (page: Page) => page.getByRole('button', { name: '다음', exact: true })
export const count = (page: Page) => page.locator('.pickcount')
export const pickIds = async (page: Page, wanted: string[]) => { for (const id of wanted) await page.locator(`.word-row[data-id="${id}"]`).click() }

/** 마지막 확인 화면이 떠 있으면: picker가 없으면 미리 눌린 다섯을 그대로 두고 다음을 누른다. picker가 있으면 눌린 것을 모두 빼고 picker가 고른 순서대로 누른다. 누른 횟수를 돌려준다. */
export async function finishFinal(page: Page, picker?: (rowIds: string[]) => string[]) {
  if ((await page.locator('.step-text', { hasText: '마지막 확인' }).count()) === 0) return 0
  await page.waitForTimeout(210)
  if (!picker) { await next(page).click(); return 1 }
  const on = await page.locator('.word-row[aria-pressed="true"]').evaluateAll(els => els.map(e => e.getAttribute('data-id')!))
  for (const id of on) await page.locator(`.word-row[data-id="${id}"]`).click()
  const chosen = picker(await ids(page))
  for (const id of chosen) await page.locator(`.word-row[data-id="${id}"]`).click()
  await next(page).click()
  return on.length + chosen.length + 1
}

/** 60개의 둘 중 고르기에 위 카드의 "조금 더"를 누르며 끝까지 간다(choose가 true를 돌려주면 그 문항은 직접 답한 것이다). 누른 횟수를 돌려준다. */
export async function answerAll(page: Page, choose?: (text: string) => Promise<boolean>, picker?: (rowIds: string[]) => string[]) {
  let n = 0
  for (let guard = 0; guard < 80; guard++) {
    const c = page.locator('.pair-card')
    if ((await c.count()) === 0) break
    await page.waitForTimeout(210) // 더블탭 방지 시간(200ms)이 지난 뒤에 누른다
    if (choose && (await choose(await page.locator('main').innerText()))) { n++; continue }
    await page.locator(TOP).click()
    n++
  }
  return n + (await finishFinal(page, picker))
}

/** 시작하기를 누르고 단어 picks개(목록 앞에서부터)와 먼 단어 3개를 골라 2단계 첫 문항 앞까지 간다. */
export async function runUntilFunnel(page: Page, picks = 8) {
  for (let i = 0; i < picks; i++) await rows(page).nth(i).click()
  await next(page).click()
  for (let i = 0; i < 3; i++) await rows(page).nth(i).click()
  await next(page).click()
}

/** 1단계부터 마지막 확인까지 전체. 탭 횟수를 돌려준다. 시작 화면에서 시작하기를 이미 누른 뒤에 부른다. */
export async function runWordQuiz(page: Page, picks = 8, choose?: (text: string) => Promise<boolean>, picker?: (rowIds: string[]) => string[]) {
  await runUntilFunnel(page, picks)
  return picks + 1 + 3 + 1 + (await answerAll(page, choose, picker))
}

/** 시작하기(또는 다시 검사하기)를 눌러 검사를 끝내고 생년월일 입력 화면까지 간다. */
/** 결과 화면 탭(전체 요약 / 5가지 강점 단어 / 사주·자미두수)을 누르고 열렸는지 확인한다. */
export async function openTab(page: Page, name: string | RegExp) {
  const tab = page.getByRole('tab', { name })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

export async function runQuiz(page: Page, picks = 8) {
  await page.getByRole('button', { name: /^(시작하기|다시 검사하기)$/ }).click()
  await runWordQuiz(page, picks)
  await expect(page.getByRole('heading', { name: '태어난 날을 알려 주세요' })).toBeVisible()
}
