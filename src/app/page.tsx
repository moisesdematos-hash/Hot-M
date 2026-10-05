export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-600 bg-orange-100 dark:bg-orange-950 dark:text-orange-400 rounded-full">
          HOT-M Core v0.1.0 • Phase 0 Foundation
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          HOT-M Digital Commerce
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Plataforma transacional, auditável e segura para criadores, compradores e afiliados.
        </p>
      </div>
    </main>
  );
}
