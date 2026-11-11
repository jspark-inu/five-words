// 재검토가 남긴 사소 두 건: 약한 돈 칸의 자리 수, 근거 목록의 같은 항목 반복.
import { describe, expect, test } from 'vitest'
import { computeChart, computeDetail, type BirthInput } from '../src/chart/chart'
import { extractFeatures } from '../src/chart/features'
import { DEEP } from '../src/content'
import { READINGS } from '../src/content/readings'
import { composeLuck } from '../src/report/luck'

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function pop(n: number, seed: number): BirthInput[] {
  const r = rng(seed)
  return Array.from({ length: n }, () => { const month = 1 + Math.floor(r() * 12); return { year: 1998 + Math.floor(r() * 11), month, day: 1 + Math.floor(r() * DIM[month - 1]!), time: { hour: Math.floor(r() * 24), minute: Math.floor(r() * 60) }, gender: r() < 0.5 ? 'M' : 'F' } as BirthInput })
}
const strip = (s: string) => s.replace(/\*\*/g, '')

describe('재검토 사소 두 건', () => {
  test('약한 돈 칸은 재성이 두 자리 이상이면 "하나 있을 뿐"이라고 하지 않는다', () => {
    let checked = 0
    for (const b of pop(1500, 11)) {
      const f = extractFeatures(computeChart(b), computeDetail(b, 2026))
      const l = composeLuck(f, DEEP.luckBlocks, READINGS, { restOpposed: false })
      const text = strip(JSON.stringify(l))
      const places = [...new Set(['偏財', '正財'].flatMap(h => f.strength.gods[h]?.places ?? []))]
      if (places.length >= 2 && text.includes('재성(財星)은')) { checked++; expect(text).not.toMatch(/재성\(財星\)은 [^.]*하나 있을 뿐/) }
    }
    expect(checked).toBeGreaterThan(0)
  })
  test('근거 목록에 같은 항목이 두 번 나오지 않는다', () => {
    for (const b of pop(1500, 12)) {
      const l = composeLuck(extractFeatures(computeChart(b), computeDetail(b, 2026)), DEEP.luckBlocks, READINGS, { restOpposed: false })
      for (const why of [l.total?.why, l.study?.why]) {
        if (!why) continue
        const list = strip(why).split(' 근거로 삼았습니다.')[0]!.split(', ').map(s => s.trim())
        expect(new Set(list).size, why).toBe(list.length)
        // 같은 궁의 같은 별(밝기·사화만 다른 항목)도 한 번만 적는다.
        const starKeys = list.map(x => x.match(/^(\S+궁 [가-힣·]+)/)?.[1]).filter((x): x is string => !!x)
        expect(new Set(starKeys).size, why).toBe(starKeys.length)
      }
    }
  })
})
