/**
 * Reads a File/Blob as text via FileReader rather than `Blob.prototype.text()` —
 * broader compatibility across browsers and test environments (jsdom's Blob
 * polyfill does not implement the newer async Blob body-reading methods).
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
