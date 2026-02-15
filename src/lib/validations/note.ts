import { z } from 'zod'

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(300, 'Title must be under 300 characters'),
  content: z.string().min(1, 'Content cannot be empty'),
  topic_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional().default([]),
  recommend_for_journal: z.boolean().optional().default(false),
})

export const updateNoteSchema = createNoteSchema.partial().extend({
  status: z
    .enum(['draft', 'under_review', 'approved', 'published', 'archived'])
    .optional(),
})

export const noteCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  comment_type: z.enum(['general', 'inline', 'review']).default('general'),
  parent_id: z.string().uuid().optional().nullable(),
  anchor_ref: z.string().max(100).optional().nullable(),
})

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type NoteCommentInput = z.infer<typeof noteCommentSchema>
