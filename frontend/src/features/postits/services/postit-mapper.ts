import type { Postit } from '@/features/postits/schemas/postit.schema'

export interface PostitRow {
  id: string
  content: string
  color: Postit['color']
  created_at: string
  updated_at: string
}

export function rowToPostit(row: PostitRow): Postit {
  return {
    id: row.id,
    content: row.content,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function postitToRow(postit: Postit): PostitRow {
  return {
    id: postit.id,
    content: postit.content,
    color: postit.color,
    created_at: postit.createdAt,
    updated_at: postit.updatedAt,
  }
}
