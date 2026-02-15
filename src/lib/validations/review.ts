import { z } from 'zod'

export const createReviewRequestSchema = z.object({
  note_id: z.string().uuid(),
  reviewer_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  due_date: z.string().optional().nullable(),
})

export const reviewActionSchema = z.object({
  action: z.enum([
    'submitted',
    'assigned',
    'approved',
    'rejected',
    'changes_requested',
    'comment_added',
    'revision_submitted',
    'reopened',
  ]),
  note: z.string().max(2000).optional().nullable(),
})

export const assignReviewerSchema = z.object({
  reviewer_id: z.string().uuid(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  due_date: z.string().optional().nullable(),
})

export type CreateReviewRequestInput = z.infer<typeof createReviewRequestSchema>
export type ReviewActionInput = z.infer<typeof reviewActionSchema>
export type AssignReviewerInput = z.infer<typeof assignReviewerSchema>
