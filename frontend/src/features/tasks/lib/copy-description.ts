function screenshotAsPng(source: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Unable to prepare screenshot')
        context.drawImage(image, 0, 0)
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Unable to encode screenshot')),
          'image/png',
        )
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('Unable to load screenshot'))
    image.src = source
  })
}

export async function copyDescription(text: string, screenshot: string | null): Promise<void> {
  if (!screenshot) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser does not support copying text and images together.')
  }

  const content = document.createElement('div')
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (content.childNodes.length) content.append(document.createElement('br'))
    content.append(document.createTextNode(line))
  }
  if (text) content.append(document.createElement('br'))
  const image = document.createElement('img')
  image.src = screenshot
  image.alt = 'Task screenshot'
  content.append(image)

  // Start the clipboard write during the click, before image conversion finishes.
  await navigator.clipboard.write([new ClipboardItem({
    'text/plain': new Blob([text], { type: 'text/plain' }),
    'text/html': new Blob([content.outerHTML], { type: 'text/html' }),
    'image/png': screenshotAsPng(screenshot),
  })])
}
