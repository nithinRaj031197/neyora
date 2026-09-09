import { Wordmark } from '@/components/ui/Wordmark'

/**
 * Shown when NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are absent.
 *
 * A fresh clone should explain itself rather than crash with a stack trace —
 * this is the difference between "the repo is broken" and "I have one step
 * left". Once the keys are present this component is never rendered.
 */
export function SetupNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-6 py-20">
      <div className="w-full max-w-2xl">
        <Wordmark className="text-3xl" showTagline />

        <p className="eyebrow mt-12">Setup required</p>
        <h1 className="mt-4 text-(length:--text-display-md)">Connect your Supabase project</h1>
        <p className="mt-5 max-w-[60ch] text-earth-soft">
          The site is running, but it has no database to read content from yet. Two environment
          variables are all that is missing.
        </p>

        <ol className="mt-10 flex flex-col gap-6">
          {[
            {
              title: 'Create a Supabase project',
              body: 'A free project at supabase.com is enough for this site.',
            },
            {
              title: 'Copy the environment file',
              body: 'cp .env.example .env.local',
              code: true,
            },
            {
              title: 'Fill in your project URL and anon key',
              body: 'Both are under Project Settings → Data API in the Supabase dashboard.',
            },
            {
              title: 'Run the migrations',
              body: 'supabase link --project-ref <ref> && supabase db push',
              code: true,
            },
            {
              title: 'Restart the dev server',
              body: 'npm run dev',
              code: true,
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-5 border-b border-beige pb-6 last:border-b-0">
              <span className="mt-0.5 font-display text-2xl leading-none text-leaf">
                {index + 1}
              </span>
              <div>
                <h2 className="font-sans text-[0.9375rem] font-semibold text-forest">
                  {step.title}
                </h2>
                {step.code ? (
                  <code className="mt-2 block overflow-x-auto rounded-xs bg-earth px-3 py-2 font-mono text-[0.8125rem] text-ivory">
                    {step.body}
                  </code>
                ) : (
                  <p className="mt-1.5 text-[0.9375rem] text-earth-soft">{step.body}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-[0.875rem] text-earth-muted">
          Full instructions are in <code className="font-mono">README.md</code>.
        </p>
      </div>
    </main>
  )
}
