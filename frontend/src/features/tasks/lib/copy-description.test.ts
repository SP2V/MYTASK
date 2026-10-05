import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyDescription } from './copy-description'

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('copyDescription', () => {
  it('copies plain text without requiring rich clipboard support', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await copyDescription('First line\nรายละเอียด', null)
    expect(writeText).toHaveBeenCalledWith('First line\nรายละเอียด')
  })

  it.each(['Text <script>alert(1)</script> & detail\nNext line', ''])(
    'copies text, escaped HTML and a PNG together: %s', async (text) => {
      const png = new Blob(['png-data'], { type: 'image/png' })
      const drawImage = vi.fn()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(png))
      vi.stubGlobal('Image', class {
        naturalWidth = 80
        naturalHeight = 60
        onload?: () => void
        set src(_source: string) { queueMicrotask(() => this.onload?.()) }
      })
      let formats: Record<string, Blob | Promise<Blob>> = {}
      vi.stubGlobal('ClipboardItem', class {
        constructor(data: typeof formats) { formats = data }
      })
      const write = vi.fn().mockImplementation(async () => {
        await Promise.all(Object.values(formats))
      })
      vi.stubGlobal('navigator', { clipboard: { write } })
      const screenshot = 'data:image/webp;base64,c2NyZWVuc2hvdA=='

      const copying = copyDescription(text, screenshot)
      expect(write).toHaveBeenCalledTimes(1)
      await copying
      expect(await readBlob(await formats['text/plain']!)).toBe(text)
      const html = document.createElement('div')
      html.innerHTML = await readBlob(await formats['text/html']!)
      expect(html.querySelector('script')).toBeNull()
      expect(html.textContent).toBe(text.replace('\n', ''))
      expect(html.querySelector('img')?.getAttribute('src')).toBe(screenshot)
      expect(await formats['image/png']).toBe(png)
      expect(drawImage).toHaveBeenCalledTimes(1)
    },
  )

  it('rejects unsupported image copying without silently copying only text', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyDescription('Detail', 'data:image/png;base64,aQ==')).rejects.toThrow(/does not support/)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('propagates clipboard permission failures', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    await expect(copyDescription('Detail', null)).rejects.toThrow('denied')
  })
})
