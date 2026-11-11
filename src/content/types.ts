import type { Element } from '../chart/chart'

export type WordCopy = {
  heard: string
  explain: string
  overdo: string
  manual: string
  breakdown: { early: string; middle: string; late: string }
  goodWith: string
  carefulWith: string
  experiment: string
  sipsinMatch: string[]
  sipsinClash: string[]
  starMatch: string[]
  starClash: string[]
  matchLine: string
  clashQuestion: string
}

export type Content = {
  words: Record<string, WordCopy>
  dayStems: Record<string, string>
  elementMissing: Record<Element, string>
  elementExcess: Record<Element, string>
  sipsin: Record<string, string>
  stars: Record<string, string>
  farLines: Record<string, string>
  readings: Record<string, string>
  mingExplain: string
  emptyPalace: string
  borrowedLead: string
  emptyBoth: string
  monthBoundary: string
  yearBoundary: string
  boundaryRetry: string
  noBirthTime: string
  noGender: string
  remedy: string
  footer: string
}
