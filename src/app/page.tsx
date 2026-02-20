import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText, BookOpen, Stethoscope, Users2,
  ShieldCheck, Tag, ArrowRight, CheckCircle2,
  Quote,
} from 'lucide-react'

// ── Static content ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FileText,
    title: 'Clinical Notes',
    description:
      'Capture structured clinical observations in a rich text editor. Never lose a critical insight again.',
  },
  {
    icon: BookOpen,
    title: 'Treatment Guidelines',
    description:
      'Write, store, and update evidence-based protocols your whole team can access instantly.',
  },
  {
    icon: Stethoscope,
    title: 'Case Studies',
    description:
      'Document complex patient journeys, add context, and build a shared clinical knowledge base.',
  },
  {
    icon: Users2,
    title: 'Team Workspaces',
    description:
      'Invite colleagues, collaborate across departments, and keep everything organized by specialty.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description:
      'Admins, editors, contributors, and viewers — control exactly who can see or edit what.',
  },
  {
    icon: Tag,
    title: 'Specialty Tagging',
    description:
      'Organize content by medical specialty so the right team finds the right information fast.',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Create your workspace',
    description:
      'Set up a workspace for your hospital, clinic, or department in under a minute.',
  },
  {
    number: '02',
    title: 'Invite your team',
    description:
      'Send invitation links to colleagues. Assign roles to control editing and viewing access.',
  },
  {
    number: '03',
    title: 'Start documenting',
    description:
      'Add notes, guidelines, and case studies in a familiar rich-text editor — no training required.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image
              src="/logo.png"
              alt="IlmStack"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-base tracking-tight">IlmStack Health</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link href="/home">
                  Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 lg:py-36">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-bl from-primary/8 to-transparent" />
          <div className="absolute -bottom-16 -left-16 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium">
            Purpose-built for Healthcare Professionals
          </Badge>

          <h1 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Clinical Knowledge,{' '}
            <span className="text-primary">Organised for Your Team</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            IlmStack is a collaborative workspace for clinical notes, treatment
            guidelines, and case studies — designed so healthcare teams spend less
            time searching and more time healing.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthenticated ? (
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="/home">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 px-8 text-base">
                  <Link href="/register">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>

          {/* Trust chips */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              'Structured Documentation',
              'Team Collaboration',
              'Evidence-Based Protocols',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">
              Everything your clinical team needs
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              One platform to capture, organise, and share clinical knowledge across
              your entire organisation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">
              Up and running in minutes
            </h2>
            <p className="text-muted-foreground">
              No lengthy onboarding. No IT department required.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {/* Connector line between steps */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-5 hidden h-px w-full bg-border md:block" />
                )}
                <div className="relative z-10 mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.number}
                </div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About the Founder ──────────────────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">About the Founder</h2>
            <p className="text-muted-foreground">
              IlmStack was born from a problem experienced firsthand on the wards.
            </p>
          </div>

          <div className="flex flex-col items-start gap-8 rounded-2xl border border-border bg-card p-8 md:flex-row md:p-10">
            {/* Avatar initials */}
            <div className="mx-auto shrink-0 md:mx-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
                <span className="text-2xl font-bold text-primary">AT</span>
              </div>
            </div>

            {/* Quote + bio */}
            <div className="flex-1 text-center md:text-left">
              <Quote className="mb-3 h-5 w-5 text-primary/40" />
              <blockquote className="mb-5 text-base italic leading-relaxed text-muted-foreground">
                &ldquo;As a Paeds resident in Bahawalpur, I noticed that exposure to
                rare and complex cases was limited by where you happened to be
                posted. The hard-won experience of seniors never made it beyond the
                ward round. IlmStack is my attempt to change that — a place where
                clinical knowledge flows freely between colleagues, regardless of
                seniority or location.&rdquo;
              </blockquote>
              <p className="text-sm font-semibold">Dr. Ali Tahir</p>
              <p className="text-xs text-muted-foreground">
                Paediatrics Resident · Bahawalpur, Pakistan · Founder, IlmStack Health
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to modernise your clinical documentation?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
            Join healthcare teams already using IlmStack to build a living knowledge
            base their whole organisation can rely on.
          </p>

          {isAuthenticated ? (
            <Button asChild size="lg" className="h-12 px-10 text-base">
              <Link href="/home">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-10 text-base">
                <Link href="/register">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="IlmStack" width={20} height={20} className="rounded" />
            <span className="text-sm font-medium text-muted-foreground">IlmStack Health</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} IlmStack Health. Built for healthcare professionals.
          </p>
        </div>
      </footer>
    </div>
  )
}
