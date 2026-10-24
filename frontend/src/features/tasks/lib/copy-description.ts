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

function descriptionHtml(text: string, screenshot: string): Blob {
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
  return new Blob([content.outerHTML], { type: 'text/html' })
}

/**
 * Copies description text and its screenshot. `screenshot` may be a promise so callers can
 * load the image after the click while the clipboard write still starts within the gesture.
 */
export async function copyDescription(text: string, screenshot: string | null | Promise<string>): Promise<void> {
  if (!screenshot) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser does not support copying text and images together.')
  }

  const source = Promise.resolve(screenshot)
  // Start the clipboard write during the click, before image loading and conversion finish.
  await navigator.clipboard.write([new ClipboardItem({
    'text/plain': new Blob([text], { type: 'text/plain' }),
    'text/html': source.then((image) => descriptionHtml(text, image)),
    'image/png': source.then(screenshotAsPng),
  })])
}
