import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText, BookOpen, Stethoscope, Users2,
  ShieldCheck, Tag, ArrowRight, CheckCircle2,
  Quote, TrendingUp, Sparkles,
} from 'lucide-react'

// ── Static content ────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FileText,
    title: 'Clinical Notes',
    description:
      'Capture structured clinical observations in a rich text editor. Never lose a critical insight again.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: BookOpen,
    title: 'Treatment Guidelines',
    description:
      'Write, store, and update evidence-based protocols your whole team can access instantly.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Stethoscope,
    title: 'Case Studies',
    description:
      'Document complex patient journeys, add context, and build a shared clinical knowledge base.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Users2,
    title: 'Team Workspaces',
    description:
      'Invite colleagues, collaborate across departments, and keep everything organized by specialty.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description:
      'Admins, editors, contributors, and viewers — control exactly who can see or edit what.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    icon: Tag,
    title: 'Specialty Tagging',
    description:
      'Organize content by medical specialty so the right team finds the right information fast.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Create your workspace',
    description: 'Set up a workspace for your hospital, clinic, or department in under a minute.',
    icon: Sparkles,
  },
  {
    number: '02',
    title: 'Invite your team',
    description: 'Send invitation links to colleagues. Assign roles to control editing and viewing access.',
    icon: Users2,
  },
  {
    number: '03',
    title: 'Start documenting',
    description: 'Add notes, guidelines, and case studies in a familiar rich-text editor — no training required.',
    icon: FileText,
  },
]

const STATS = [
  { value: '30+', label: 'Medical Specialties', icon: Stethoscope },
  { value: '5', label: 'Permission Tiers', icon: ShieldCheck },
  { value: '∞', label: 'Cases & Notes', icon: TrendingUp },
]

// ── Page ──────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="Clinical Ledger" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-base tracking-tight">Clinical Ledger</span>
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
      <section className="relative overflow-hidden pt-20 pb-0 lg:pt-28">
        {/* Layered background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.13),transparent)]" />
          <div className="absolute -top-40 -right-32 h-[700px] w-[700px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-10 -left-24 h-[400px] w-[400px] rounded-full bg-primary/4 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Purpose-built for Healthcare Professionals
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl lg:text-7xl">
            Clinical Knowledge,{' '}
            <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
              Organised for Your Team
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            A collaborative workspace for clinical notes, treatment guidelines, and case studies
            — designed so healthcare teams spend less time searching and more time healing.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthenticated ? (
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                <Link href="/home">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                  <Link href="/register">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}
          </div>

          {/* Trust chips */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {['Structured Documentation', 'Team Collaboration', 'Evidence-Based Protocols'].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Dashboard Mockup ── */}
        <div className="mt-16 max-w-5xl mx-auto px-6">
          <div className="relative rounded-t-2xl border border-border border-b-0 bg-card shadow-[0_-8px_60px_-12px_hsl(var(--primary)/0.15)] overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50 shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <div className="ml-3 h-5 rounded-md bg-background/70 border border-border max-w-[200px] w-full" />
            </div>

            {/* App layout */}
            <div className="flex h-72 sm:h-[340px]">
              {/* Sidebar */}
              <div className="w-44 shrink-0 border-r border-border bg-card p-3 hidden sm:flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="h-5 w-5 rounded-md bg-primary/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-sm bg-primary/50" />
                  </div>
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
                {[
                  { label: 'Cases', active: true },
                  { label: 'Notes', active: false },
                  { label: 'Guidelines', active: false },
                  { label: 'Journal', active: false },
                ].map(({ label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 ${active ? 'bg-primary/10' : ''}`}
                  >
                    <div className={`h-3.5 w-3.5 rounded-sm ${active ? 'bg-primary/40' : 'bg-muted'}`} />
                    <div className={`h-2.5 rounded ${active ? 'bg-primary/40 w-10' : 'bg-muted w-14'}`} />
                  </div>
                ))}
                <div className="mt-auto flex items-center gap-2 p-1">
                  <div className="h-6 w-6 rounded-full bg-primary/20" />
                  <div className="h-2.5 w-16 rounded bg-muted" />
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                {/* Page header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="h-4 w-16 rounded bg-foreground/15 mb-1.5" />
                    <div className="h-3 w-28 rounded bg-muted/70" />
                  </div>
                  <div className="h-8 w-24 rounded-lg bg-primary/20" />
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  {[
                    { w: 'w-12', color: 'bg-blue-500/20' },
                    { w: 'w-8', color: 'bg-violet-500/20' },
                    { w: 'w-16', color: 'bg-emerald-500/20' },
                  ].map(({ w, color }, i) => (
                    <div key={i} className="rounded-xl border border-border p-3 bg-muted/20">
                      <div className="h-2.5 w-14 rounded bg-muted mb-2" />
                      <div className={`h-7 ${w} rounded-lg ${color} mb-1`} />
                      <div className="h-1.5 w-full rounded-full bg-muted/60" />
                    </div>
                  ))}
                </div>

                {/* Case list rows */}
                <div className="space-y-2">
                  {[
                    { title: 'w-40', tag: 'Cardiology', color: 'bg-rose-500/20 text-rose-600' },
                    { title: 'w-56', tag: 'Neurology', color: 'bg-violet-500/20 text-violet-600' },
                    { title: 'w-48', tag: 'Paediatrics', color: 'bg-blue-500/20 text-blue-600' },
                  ].map(({ title, tag, color }, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background/50">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 shrink-0 flex items-center justify-center">
                        <div className="h-3.5 w-3.5 rounded-sm bg-primary/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`h-3 ${title} rounded bg-foreground/12 mb-1.5`} />
                        <div className="h-2 w-20 rounded bg-muted" />
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color} shrink-0`}>
                        {tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <section className="py-12 border-y border-border bg-muted/20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <Icon className="h-5 w-5 text-primary/50 mb-0.5" />
                <span className="text-3xl font-extrabold tracking-tight">{value}</span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-4 text-xs">Features</Badge>
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your clinical team needs
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              One platform to capture, organise, and share clinical knowledge across your
              entire organisation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className={`group rounded-2xl border ${feature.border} bg-card p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}>
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="mb-2 font-semibold text-base">{feature.title}</h3>
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
      <section className="py-24 bg-muted/20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-4 text-xs">Getting Started</Badge>
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="text-muted-foreground">
              No lengthy onboarding. No IT department required.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* Gradient connector */}
            <div className="absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] hidden md:block h-px bg-gradient-to-r from-border via-primary/40 to-border" />

            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-primary/30 text-[10px] font-bold text-foreground leading-none">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground max-w-[200px]">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── About the Founder ──────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4 text-xs">Our Story</Badge>
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              About the Founder
            </h2>
            <p className="text-muted-foreground">
              Clinical Ledger was born from a problem experienced firsthand on the wards.
            </p>
          </div>

          <div className="relative rounded-2xl border border-border bg-card p-8 md:p-10 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

            <div className="relative flex flex-col items-center gap-8 md:flex-row">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="relative">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <span className="text-2xl font-bold">AT</span>
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>

              {/* Quote + bio */}
              <div className="flex-1 text-center md:text-left">
                <Quote className="mb-3 h-6 w-6 text-primary/25" />
                <blockquote className="mb-5 text-base italic leading-relaxed text-muted-foreground">
                  &ldquo;As a Paeds resident in Bahawalpur, I noticed that exposure to rare and
                  complex cases was limited by where you happened to be posted. The hard-won
                  experience of seniors never made it beyond the ward round. Clinical Ledger is my
                  attempt to change that — a place where clinical knowledge flows freely between
                  colleagues, regardless of seniority or location.&rdquo;
                </blockquote>
                <p className="text-sm font-semibold">Dr. Ali Tahir</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paediatrics Resident · Bahawalpur, Pakistan · Founder, Clinical Ledger
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 bg-primary">
        {/* Dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl text-primary-foreground">
            Ready to modernise your clinical documentation?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-primary-foreground/75">
            Join healthcare teams already using Clinical Ledger to build a living knowledge base
            their whole organisation can rely on.
          </p>

          {isAuthenticated ? (
            <Button asChild size="lg" variant="secondary" className="h-12 px-10 text-base">
              <Link href="/home">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="h-12 px-10 text-base">
                <Link href="/register">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white hover:border-white/40"
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 bg-muted/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Clinical Ledger" width={20} height={20} className="rounded-lg" />
            <span className="text-sm font-medium text-muted-foreground">Clinical Ledger</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Clinical Ledger. Built for healthcare professionals.
          </p>
        </div>
      </footer>

    </div>
  )
}
