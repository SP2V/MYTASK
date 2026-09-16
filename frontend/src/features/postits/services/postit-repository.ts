import { supabase } from '@/lib/supabase-client'
import { generateId } from '@/lib/id'
import { nowISO } from '@/lib/date'
import {
  postitSchema,
  postitFormSchema,
  type Postit,
  type PostitFormValues,
} from '@/features/postits/schemas/postit.schema'
import { rowToPostit, postitToRow, type PostitRow } from '@/features/postits/services/postit-mapper'

const TABLE = 'postits'

export class PostitRepository {
  async getPostits(): Promise<Postit[]> {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as PostitRow[]).map(rowToPostit).map((p) => postitSchema.parse(p))
  }

  async createPostit(input: PostitFormValues): Promise<Postit> {
    const parsedInput = postitFormSchema.parse(input)
    const timestamp = nowISO()
    const postit = postitSchema.parse({
      id: generateId(),
      ...parsedInput,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    const { data, error } = await supabase.from(TABLE).insert(postitToRow(postit)).select().single()
    if (error) throw new Error(error.message)
    return postitSchema.parse(rowToPostit(data as PostitRow))
  }

  async updatePostit(id: string, input: Partial<PostitFormValues>): Promise<Postit> {
    const { data: existingRow, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) throw new Error(fetchError.message)
    if (!existingRow) throw new Error('Postit not found')
    const existing = postitSchema.parse(rowToPostit(existingRow as PostitRow))

    const parsedInput = postitFormSchema.partial().parse(input)
    const updated = postitSchema.parse({
      ...existing,
      ...parsedInput,
      updatedAt: nowISO(),
    })
    const { data, error } = await supabase
      .from(TABLE)
      .update(postitToRow(updated))
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return postitSchema.parse(rowToPostit(data as PostitRow))
  }

  async deletePostit(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}

export const postitRepository = new PostitRepository()
