'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, KeyboardEvent, PointerEvent } from 'react'

const formats = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
const maxFileSize = 10 * 1024 * 1024
const maxImageSize = 1600

async function prepareImage(file: File) {
  if (file.size > maxFileSize) throw new Error('请选择 10 MB 以内的图片。')
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
  const webp = String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8)) === 'WEBP'
  if (!png && !jpeg && !webp) throw new Error('请选择 PNG、JPG 或 WebP 图片。')

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => { throw new Error('图片无法打开，请换一张。') })
    const { naturalWidth: width, naturalHeight: height } = image
    if (width * height > 32_000_000) throw new Error('图片尺寸过大，请缩小后再导入。')

    const scale = Math.min(1, maxImageSize / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法处理这张图片。')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const preview = canvas.toDataURL('image/webp', 0.9)
    if (!preview.startsWith('data:image/webp;')) throw new Error('当前浏览器无法导出 WebP 图片。')
    return preview
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function LightConeImport({ memberId, preview, onImport, onDiscard }: {
  memberId: string
  preview?: string
  onImport: (image: string) => void
  onDiscard: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setError('')
    setPending(true)
    try {
      onImport(await prepareImage(file))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '图片导入失败，请重试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="cone-import">
      <input ref={input} hidden type="file" accept={formats} aria-label="选择光锥图片" onChange={importImage} />
      <button type="button" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? '正在导入…' : '导入光锥图片'}
      </button>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <div className="cone-submission">
          <p role="status">本页预览。图片经 GitHub PR 审核合并后可供全员查看。</p>
          <a href={preview} download={`${memberId}.webp`}>下载投稿图片</a>
          <a href="https://github.com/fushuyiliu/group-portrait-archive/tree/main/public/light-cones" target="_blank" rel="noreferrer">GitHub 投稿目录</a>
          <button type="button" disabled={pending} onClick={() => { setError(''); onDiscard() }}>撤销预览</button>
        </div>
      )}
    </div>
  )
}

const limit = (angle: number) => Math.max(-25, Math.min(25, angle))
const directions = new Map([
  ['ArrowLeft', [0, -6]], ['ArrowRight', [0, 6]], ['ArrowUp', [6, 0]], ['ArrowDown', [-6, 0]],
])

export function LightConeImage({ src, name, number }: { src: string; name: string; number: string }) {
  const [back, setBack] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const drag = useRef<{ pointer: number; x: number; y: number } | null>(null)

  function turn(showBack: boolean) {
    setBack(showBack)
    setTilt({ x: 0, y: 0 })
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current) return
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function rotate(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (start?.pointer !== event.pointerId) return
    setTilt({ x: limit((start.y - event.clientY) * 0.25), y: limit((event.clientX - start.x) * 0.3) })
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer === event.pointerId) drag.current = null
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const direction = directions.get(event.key)
    if (direction) setTilt(({ x, y }) => ({ x: limit(x + direction[0]), y: limit(y + direction[1]) }))
    else if (event.key.toLowerCase() === 'f') turn(!back)
    else return
    event.preventDefault()
  }

  return (
    <div className="image-cone">
      <div className="image-cone-stage" role="group" aria-label={`${name}的可旋转光锥`} tabIndex={0}
        onPointerDown={startDrag} onPointerMove={rotate} onLostPointerCapture={finishDrag} onKeyDown={handleKey}>
        <div className="image-cone-tilt" style={{ '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg` } as CSSProperties}>
          <div className="image-cone-card" data-face={back ? 'back' : 'front'}>
            <div className="image-cone-face" aria-hidden={back}>
              <img src={src} alt={`${name}的光锥图片`} draggable={false} />
            </div>
            <div className="image-cone-face image-cone-back" aria-hidden={!back}>
              <span>LIGHT CONE</span><span aria-hidden="true">✦</span><span>NO. {number}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="image-cone-controls" role="group" aria-label="卡面朝向">
        <button type="button" aria-pressed={!back} onClick={() => turn(false)}>正面</button>
        <button type="button" aria-pressed={back} onClick={() => turn(true)}>背面</button>
      </div>
    </div>
  )
}
