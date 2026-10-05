import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm } from './task-form'
import { copyDescription } from '../lib/copy-description'
import { toast } from 'sonner'

vi.mock('@/features/categories/hooks/use-categories', () => ({ useCategories: () => [] }))
vi.mock('../lib/copy-description', () => ({ copyDescription: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('TaskForm description copy', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(copyDescription).mockResolvedValue(undefined)
  })

  it('copies the current unsaved text in the create form without submitting', async () => {
    const onSubmit = vi.fn()
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} defaultAdvancedOpen />)
    const copy = screen.getByRole('button', { name: /copy description/i })
    expect(copy).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Description'), 'New detail')
    await userEvent.click(copy)
    expect(copyDescription).toHaveBeenCalledWith('New detail', null)
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('copies the edited description and saved screenshot', async () => {
    const screenshot = 'data:image/webp;base64,aQ=='
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} defaultAdvancedOpen
      defaultValues={{ description: 'Saved detail' }} defaultDescriptionImage={screenshot} />)
    await userEvent.type(screen.getByLabelText('Description'), ' updated')
    await userEvent.click(screen.getByRole('button', { name: /copy description/i }))
    expect(copyDescription).toHaveBeenCalledWith('Saved detail updated', screenshot)
  })

  it('allows image-only copying and reports clipboard failure', async () => {
    vi.mocked(copyDescription).mockRejectedValue(new Error('denied'))
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} defaultAdvancedOpen
      defaultDescriptionImage="data:image/webp;base64,aQ==" />)
    const copy = screen.getByRole('button', { name: /copy description/i })
    expect(copy).toBeEnabled()
    await userEvent.click(copy)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
    expect(copy).toBeEnabled()
  })

  it('pastes both text and an image, replacing the selected text', async () => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL() { return 'blob:screenshot' }
      static revokeObjectURL() {}
    })
    vi.stubGlobal('Image', class {
      naturalWidth = 80
      naturalHeight = 60
      onload?: () => void
      set src(_source: string) { queueMicrotask(() => this.onload?.()) }
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['image'], { type: 'image/webp' }))
    })
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} defaultAdvancedOpen
      defaultValues={{ description: 'Before old after' }} />)
    const field = screen.getByLabelText<HTMLTextAreaElement>('Description')
    field.setSelectionRange(7, 10)
    fireEvent.paste(field, { clipboardData: {
      items: [{ type: 'image/png', getAsFile: () => new File(['image'], 'screenshot.png', { type: 'image/png' }) }],
      getData: () => 'New detail',
    } })
    expect(field).toHaveValue('Before New detail after')
    expect(await screen.findByAltText('Pasted task screenshot')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /copy description/i }))
    expect(copyDescription).toHaveBeenCalledWith('Before New detail after', expect.stringMatching(/^data:image\/webp;base64,/))
  })
})
