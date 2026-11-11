import type { Content } from './types'
import { loadDeep } from './deep'
import { DEEP_PARTS } from './deep-data'
import { FAR_LINES } from './far-copy'
import { READINGS } from './readings'
import { EXECUTE, INFLUENCE, RELATION, STRATEGY } from './word-copy'
import { BORROWED_LEAD, DAY_STEMS, ELEMENT_EXCESS, ELEMENT_MISSING, EMPTY_BOTH, EMPTY_PALACE, MING_EXPLAIN, BOUNDARY_RETRY, MONTH_BOUNDARY, YEAR_BOUNDARY, FOOTER, NO_BIRTH_TIME, NO_GENDER, REMEDY, SIPSIN, STARS } from './chart-copy'

export const CONTENT: Content = {
  words: { ...EXECUTE, ...INFLUENCE, ...RELATION, ...STRATEGY },
  dayStems: DAY_STEMS,
  elementMissing: ELEMENT_MISSING,
  elementExcess: ELEMENT_EXCESS,
  sipsin: SIPSIN,
  stars: STARS,
  farLines: FAR_LINES,
  readings: READINGS,
  mingExplain: MING_EXPLAIN,
  emptyPalace: EMPTY_PALACE,
  borrowedLead: BORROWED_LEAD,
  emptyBoth: EMPTY_BOTH,
  monthBoundary: MONTH_BOUNDARY,
  yearBoundary: YEAR_BOUNDARY,
  boundaryRetry: BOUNDARY_RETRY,
  noBirthTime: NO_BIRTH_TIME,
  noGender: NO_GENDER,
  remedy: REMEDY,
  footer: FOOTER,
}

export const DEEP = loadDeep(DEEP_PARTS)
