// 친구에게 보내는 이미지 카드. 입력은 다섯 단어뿐이다(이름·생년월일·주소는 받지 않는다).
// 글자는 canvas에만 그리고 외부 이미지를 쓰지 않아 캔버스가 오염되지 않는다.
const W = 1080
const H = 1350
const FLAME = '#ff9d2e'
const INK = '#2a2438'
const FONT = '"Black Han Sans", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
const TOP_LINE = '나를 설명하는 다섯 단어'
const BOTTOM_LINE = '넌 뭐 나왔어?'
const FILE_NAME = 'my-five-words.png'

export async function drawCard(words: string[]): Promise<Blob> {
  const text = TOP_LINE + BOTTOM_LINE + words.join('') + '0123456789'
  await Promise.all(['120px', '52px'].map(size => document.fonts.load(`${size} "Black Han Sans"`, text)))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.fillStyle = FLAME
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'

  ctx.textAlign = 'center'
  ctx.font = `52px ${FONT}`
  ctx.fillText(TOP_LINE, W / 2, 200)

  const rowH = 150
  const top = 330
  ctx.font = `120px ${FONT}`
  const maxW = Math.max(...words.map(w => ctx.measureText(w).width))
  const numW = 90
  const startX = (W - (numW + maxW)) / 2
  words.forEach((w, i) => {
    const y = top + i * rowH + 120
    ctx.textAlign = 'right'
    ctx.font = `56px ${FONT}`
    ctx.globalAlpha = 0.55
    ctx.fillText(String(i + 1), startX + numW - 24, y)
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
    ctx.font = `120px ${FONT}`
    ctx.fillText(w, startX + numW, y)
  })

  ctx.textAlign = 'center'
  ctx.font = `64px ${FONT}`
  ctx.fillText(BOTTOM_LINE, W / 2, 1180)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

function download(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = FILE_NAME
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function shareCard(blob: Blob): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], FILE_NAME, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // 그 밖의 공유 오류는 저장으로 넘어간다.
    }
  }
  download(blob)
  return 'saved'
}
