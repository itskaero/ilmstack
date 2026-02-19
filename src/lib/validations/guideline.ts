// ============================================================
// ILMSTACK HEALTH — Guideline Validation Schemas
// ============================================================

import { z } from 'zod'

export const createGuidelineSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(300, 'Title too long'),
  content: z.string().default(''),
  category: z.string().default('general'),
  specialty: z.string().max(100).optional().nullable(),
  min_edit_clinical_role: z
    .enum(['any_editor', 'r3_resident_plus', 'senior_registrar', 'consultant_only'])
    .default('any_editor'),
})

export const updateGuidelineSchema = createGuidelineSchema.partial().extend({
  change_note: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
})

export const updateGuidelineStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'archived']),
})

export type CreateGuidelineInput = z.infer<typeof createGuidelineSchema>
export type UpdateGuidelineInput = z.infer<typeof updateGuidelineSchema>
