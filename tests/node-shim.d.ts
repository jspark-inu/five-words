// 빌드 결과물을 읽는 시험에서만 쓰는 최소 선언(@types/node를 새로 들이지 않기 위해).
declare module 'node:fs' {
  export function existsSync(p: URL): boolean
  export function readdirSync(p: URL): string[]
  export function readFileSync(p: URL, enc: 'utf8'): string
  export function statSync(p: URL): { size: number }
}
