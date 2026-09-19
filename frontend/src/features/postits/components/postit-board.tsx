import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Pin } from 'lucide-react'
import { usePostits, postitsQueryKey } from '@/features/postits/hooks/use-postits'
import { postitRepository } from '@/features/postits/services/postit-repository'
import { POSTIT_COLORS, type Postit, type PostitColor } from '@/features/postits/schemas/postit.schema'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const NOTE_COLOR_CLASSES: Record<PostitColor, { bg: string; border: string; tape: string }> = {
  yellow: {
    bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100',
    border: 'border-amber-300/70 dark:border-amber-700/50',
    tape: 'bg-amber-200/80 dark:bg-amber-800/60',
  },
  pink: {
    bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100',
    border: 'border-rose-300/70 dark:border-rose-700/50',
    tape: 'bg-rose-200/80 dark:bg-rose-800/60',
  },
  sky: {
    bg: 'bg-sky-100 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100',
    border: 'border-sky-300/70 dark:border-sky-700/50',
    tape: 'bg-sky-200/80 dark:bg-sky-800/60',
  },
  lime: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100',
    border: 'border-emerald-300/70 dark:border-emerald-700/50',
    tape: 'bg-emerald-200/80 dark:bg-emerald-800/60',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100',
    border: 'border-orange-300/70 dark:border-orange-700/50',
    tape: 'bg-orange-200/80 dark:bg-orange-800/60',
  },
  violet: {
    bg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100',
    border: 'border-purple-300/70 dark:border-purple-700/50',
    tape: 'bg-purple-200/80 dark:bg-purple-800/60',
  },
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function randomColor(): PostitColor {
  const index = Math.floor(Math.random() * POSTIT_COLORS.length)
  return POSTIT_COLORS[index] as PostitColor
}

interface NoteCardProps {
  postit: Postit
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

function NoteCard({ postit, dragging, onDragStart, onDragEnd }: NoteCardProps) {
  const [content, setContent] = useState(postit.content)
  const queryClient = useQueryClient()

  const handleBlur = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      setContent(postit.content)
      return
    }
    if (trimmed === postit.content) return
    try {
      await postitRepository.updatePostit(postit.id, { content: trimmed })
      queryClient.invalidateQueries({ queryKey: postitsQueryKey })
    } catch {
      toast.error('Unable to save note. Please try again.')
      setContent(postit.content)
    }
  }

  const hash = hashString(postit.id)
  const rotation = (hash % 7) - 3 // -3deg to +3deg for subtle tilt
  const colorStyle = NOTE_COLOR_CLASSES[postit.color] ?? NOTE_COLOR_CLASSES.yellow

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', postit.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      style={{ transform: `rotate(${rotation}deg)` }}
      className={cn(
        'group relative flex h-44 w-44 cursor-grab flex-col rounded-xl border p-3.5 shadow-md backdrop-blur-xs transition-all duration-200 active:cursor-grabbing hover:scale-102 hover:shadow-lg',
        colorStyle.bg,
        colorStyle.border,
        dragging && 'opacity-25 scale-95 shadow-none',
      )}
    >
      {/* Tape decoration at top */}
      <div
        className={cn(
          'absolute -top-2 left-1/2 h-3.5 w-12 -translate-x-1/2 rounded-xs shadow-2xs backdrop-blur-xs',
          colorStyle.tape,
        )}
      />

      <div className="flex items-center justify-between pb-1.5 opacity-50 transition-opacity group-hover:opacity-100">
        <Pin className="size-3 -rotate-45" />
        <span className="text-[9px] font-mono uppercase tracking-widest">Note</span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        className="h-full w-full resize-none border-none bg-transparent p-0 text-xs font-medium leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-inherit placeholder:opacity-50"
      />
    </div>
  )
}

export function PostitBoard() {
  const postits = usePostits()
  const queryClient = useQueryClient()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [trashActive, setTrashActive] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedColor, setSelectedColor] = useState<PostitColor | null>(null)

  const invalidatePostits = () => queryClient.invalidateQueries({ queryKey: postitsQueryKey })

  const handleAdd = async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    try {
      await postitRepository.createPostit({
        content: trimmed,
        color: selectedColor ?? randomColor(),
      })
      setDraft('')
      invalidatePostits()
    } catch {
      toast.error('Unable to add note. Please try again.')
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setTrashActive(false)
    const id = e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    if (!id) return
    try {
      await postitRepository.deletePostit(id)
      invalidatePostits()
      toast.success('Note deleted')
    } catch {
      toast.error('Unable to delete note. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Creation Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/75 p-4 shadow-xs backdrop-blur-xs sm:flex-row sm:items-center">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Write a quick sticky note and press Enter…"
          className="h-10 min-h-0 flex-1 resize-none rounded-lg border-border/70 py-2 text-xs"
        />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {POSTIT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color === selectedColor ? null : color)}
              className={cn(
                'size-6 rounded-full border border-border/60 transition-transform active:scale-95',
                color === 'yellow' && 'bg-amber-300',
                color === 'pink' && 'bg-rose-300',
                color === 'sky' && 'bg-sky-300',
                color === 'lime' && 'bg-emerald-300',
                color === 'orange' && 'bg-orange-300',
                color === 'violet' && 'bg-purple-300',
                selectedColor === color && 'scale-120 ring-2 ring-primary ring-offset-1',
              )}
              aria-label={`Select ${color} color`}
            />
          ))}

          <Button onClick={handleAdd} className="ml-2 shrink-0 gap-1.5 rounded-xl shadow-xs">
            <Plus className="size-4" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Board */}
      {postits && postits.length === 0 ? (
        <EmptyState icon="🗒️" title="No sticky notes" description="Add a note above to pin your ideas here." />
      ) : (
        <div className="flex min-h-[460px] flex-wrap content-start gap-6 rounded-2xl border border-dashed border-border/80 bg-accent/15 p-6 backdrop-blur-xs">
          {postits?.map((postit) => (
            <NoteCard
              key={postit.id}
              postit={postit}
              dragging={draggingId === postit.id}
              onDragStart={() => setDraggingId(postit.id)}
              onDragEnd={() => setDraggingId(null)}
            />
          ))}
        </div>
      )}

      {/* Trash Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setTrashActive(true)
        }}
        onDragLeave={() => setTrashActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-7 transition-all duration-200',
          trashActive
            ? 'border-destructive bg-destructive/10 scale-101'
            : 'border-border/60 hover:border-border',
        )}
      >
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-xl transition-colors',
            trashActive ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground',
          )}
        >
          <Trash2 className="size-5" />
        </div>
        <p className={cn('text-xs font-medium', trashActive ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
          Drag any note here to remove it
        </p>
      </div>
    </div>
  )
}
