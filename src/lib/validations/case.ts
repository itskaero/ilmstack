import { z } from 'zod'

export const managementTimelineEntrySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  action: z.string().min(1, 'Action is required').max(500),
  notes: z.string().max(1000).optional().nullable(),
})

export const createCaseSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(300, 'Title must be under 300 characters'),
  topic_id: z.string().uuid().optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional().default([]),
  presentation: z.string().max(10000).optional().nullable(),
  history: z.string().max(10000).optional().nullable(),
  examination: z.string().max(10000).optional().nullable(),
  investigations: z.string().max(10000).optional().nullable(),
  management_timeline: z
    .array(managementTimelineEntrySchema)
    .optional()
    .default([]),
  outcome: z.string().max(5000).optional().nullable(),
  learning_points: z.string().max(5000).optional().nullable(),
  patient_age_range: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .describe('Anonymized age range, e.g. "25-30"'),
  patient_gender: z
    .enum(['male', 'female', 'other', 'not_disclosed'])
    .optional()
    .nullable(),
  specialty: z.string().max(100).optional().nullable(),
  diagnosis: z.string().max(300).optional().nullable(),
  icd_codes: z.array(z.string().max(20)).optional().default([]),
  growth_data: z.any().optional().nullable(),
})

export const updateCaseSchema = createCaseSchema.partial().extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>
export type ManagementTimelineEntryInput = z.infer<
  typeof managementTimelineEntrySchema
>
