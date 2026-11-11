/** 마지막 글자에 받침이 있으면 true. 한글이 아니면 false. */
export function hasFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}
