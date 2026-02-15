import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be under 100 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and a number'
      ),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const magicLinkSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  title: z.string().max(50).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type MagicLinkInput = z.infer<typeof magicLinkSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
