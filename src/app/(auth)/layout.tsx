import Image from "next/image";
import { Embers } from "@/components/home/embers";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Connexion et inscription : photo plein cadre et braises à gauche, formulaire en verre à droite (empilés sur mobile). */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-full flex-1 bg-[#0b0806]">
      <div className="absolute inset-0 lg:relative lg:w-1/2">
        <Image src="/hero/cover-grill-du-plateau.jpg" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,8,6,0.35),rgba(11,8,6,0.85))]" />
        <Embers count={45} />
        <div className="absolute inset-x-0 bottom-0 hidden p-12 text-white lg:block">
          <p className="max-w-md font-display text-5xl leading-[1.02]">
            Le goût d&apos;Abidjan, <span className="italic text-[#ffb35c]">à portée de clic.</span>
          </p>
          <p className="mt-4 max-w-sm text-white/70">Un seul compte pour commander, gérer votre restaurant ou livrer, sur le site et l&apos;application.</p>
        </div>
      </div>
      <div className="relative flex flex-1 flex-col">
        <header className="flex h-20 items-center justify-between px-5 sm:px-8">
          <span className="glass-nav rounded-full py-1.5 pl-2 pr-4">
            <Logo />
          </span>
          <span className="glass-nav rounded-full">
            <ThemeToggle />
          </span>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="glass-nav w-full max-w-md rounded-[32px] p-6 sm:p-9 lg:bg-surface lg:[background:var(--surface)]">{children}</div>
        </main>
      </div>
    </div>
  );
}
