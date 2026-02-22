import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-col lg:w-[480px] bg-primary relative overflow-hidden">
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        />
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Clinical Ledger"
              width={36}
              height={36}
              className="rounded-lg"
              priority
            />
            <span className="text-white font-semibold text-lg">Clinical Ledger</span>
          </div>

          {/* Center tagline */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-white text-3xl font-bold leading-tight mb-4">
              Clinical knowledge,<br />
              structured and shared.
            </h2>
            <p className="text-white/70 text-base leading-relaxed max-w-xs">
              A collaborative platform for hospitals to store clinical notes,
              review insights, and publish department journals.
            </p>
          </div>

          {/* Bottom feature list */}
          <div className="space-y-3">
            {[
              'Version-controlled clinical notes',
              'Structured medical case library',
              'Automated monthly journals',
              'Role-based access control',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Clinical Ledger"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="font-semibold text-lg">Clinical Ledger</span>
        </div>

        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
