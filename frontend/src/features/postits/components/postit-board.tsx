import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { usePostits, postitsQueryKey } from '@/features/postits/hooks/use-postits'
import { postitRepository } from '@/features/postits/services/postit-repository'
import { POSTIT_COLORS, type Postit, type PostitColor } from '@/features/postits/schemas/postit.schema'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const NOTE_COLOR_CLASSES: Record<PostitColor, string> = {
  yellow: 'bg-yellow-200/90 dark:bg-yellow-300/20',
  pink: 'bg-pink-200/90 dark:bg-pink-300/20',
  sky: 'bg-sky-200/90 dark:bg-sky-300/20',
  lime: 'bg-lime-200/90 dark:bg-lime-300/20',
  orange: 'bg-orange-200/90 dark:bg-orange-300/20',
  violet: 'bg-violet-200/90 dark:bg-violet-300/20',
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
  const rotation = (hash % 9) - 4

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
        'flex h-40 w-40 cursor-grab flex-col rounded-sm p-3 shadow-md transition-opacity active:cursor-grabbing',
        NOTE_COLOR_CLASSES[postit.color],
        dragging && 'opacity-30',
      )}
    >
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        className="h-full w-full resize-none border-none bg-transparent p-0 text-sm font-medium text-neutral-800 shadow-none focus-visible:ring-0 dark:text-neutral-100"
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

  const invalidatePostits = () => queryClient.invalidateQueries({ queryKey: postitsQueryKey })

  const handleAdd = async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    try {
      await postitRepository.createPostit({ content: trimmed, color: randomColor() })
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
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Write a new note and press Enter…"
          className="h-10 min-h-0 resize-none py-2"
        />
        <Button onClick={handleAdd} className="shrink-0 gap-2">
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {postits && postits.length === 0 ? (
        <EmptyState icon="🗒️" title="No sticky notes" description="Add a note above to get started." />
      ) : (
        <div className="flex min-h-[420px] flex-wrap content-start gap-5 rounded-lg border border-dashed p-5">
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

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setTrashActive(true)
        }}
        onDragLeave={() => setTrashActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors',
          trashActive ? 'border-destructive bg-destructive/10' : 'border-muted-foreground/30',
        )}
      >
        <Trash2
          className={cn('size-8 transition-colors', trashActive ? 'text-destructive' : 'text-muted-foreground')}
        />
        <p className={cn('text-sm', trashActive ? 'text-destructive' : 'text-muted-foreground')}>
          Drag a note here to delete it
        </p>
      </div>
    </div>
  )
}
