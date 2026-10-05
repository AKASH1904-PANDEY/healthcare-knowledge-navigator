import { AuthArt } from "./Illustrations";
import { Logo } from "./Logo";

// Split layout: brand panel (hidden on small screens) + form.
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden lg:block">
        <AuthArt className="absolute inset-0 h-full w-full" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <div className="max-w-md pb-48">
            <h2 className="font-serif text-4xl font-semibold leading-tight">
              Clinical answers you can trace to the source.
            </h2>
            <p className="mt-4 text-white/75">
              Every answer is drawn only from guidelines and research that
              doctors have reviewed and approved.
            </p>
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="rise w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="mb-1 font-serif text-3xl font-semibold text-ink">{title}</h1>
          <p className="mb-8 text-sm text-slate">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
