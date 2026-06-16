import Link from "next/link";

import { Footer } from "@/components/landing/footer";
import { Reveal } from "@/components/landing/reveal";
import { RiseWords } from "@/components/landing/rise-words";
import { Showcase } from "@/components/landing/showcase";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Logo } from "@/components/ui/logo";
import {
  closing,
  hero,
  pillars,
  steps,
  stepTypes,
} from "@/lib/landing-content";

export default function LandingPage() {
  return (
    <main className="flex flex-col">
      {/* Hero over a soft sky band */}
      <section className="sky-band relative overflow-hidden">
        <span aria-hidden className="cloud top-10 left-[8%] h-40 w-72" />
        <span aria-hidden className="cloud top-40 right-[6%] h-32 w-80" />
        <span aria-hidden className="cloud top-[60%] left-[20%] h-28 w-64" />

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-semibold tracking-tight">Opsline</span>
          </div>
          <Link href={hero.secondary.href}>
            <Button size="sm">{hero.secondary.label}</Button>
          </Link>
        </header>

        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-4 text-center sm:pt-28">
          <span className="inline-block rounded-full bg-butter px-3 py-1 text-xs font-medium text-ink">
            {hero.eyebrow}
          </span>

          <h1 className="mt-6 text-4xl font-medium tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            <RiseWords text={hero.headline.join(" ")} />
            <span className="rise-word">
              <span
                className="font-serif italic"
                style={{ animationDelay: "560ms" }}
              >
                {hero.accent}
              </span>
            </span>{" "}
            <RiseWords text={hero.tail} start={630} />
          </h1>

          <hr className="mx-auto mt-7 h-px w-80 max-w-full border-none bg-linear-to-r from-transparent via-ink/20 to-transparent" />

          <Reveal delay={450}>
            <p className="mx-auto mt-7 max-w-xl text-lg text-muted">
              {hero.intro}
            </p>
          </Reveal>

          <Reveal delay={600}>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href={hero.primary.href}>
                <Button>{hero.primary.label}</Button>
              </Link>
              <Link href={hero.secondary.href}>
                <Button variant="secondary">{hero.secondary.label}</Button>
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal
          delay={750}
          className="relative mx-auto max-w-[62rem] px-6 pt-14 pb-24"
        >
          <Showcase />
        </Reveal>
      </section>

      {/* Pillars */}
      <section id="why" className="mx-auto w-full max-w-5xl px-6 py-24">
        <Reveal className="text-center">
          <p className="mx-auto w-fit rounded-full border border-line bg-card px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-faint uppercase">
            Why teams trust it
          </p>
          <h2 className="gradient-ink mx-auto mt-4 max-w-2xl text-3xl font-medium tracking-[-0.02em] sm:text-5xl">
            Automation you can actually{" "}
            <em className="font-serif italic">audit.</em>
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 120}>
              <GlassCard
                tint={pillar.tint}
                className="flex h-full flex-col gap-2 p-6"
              >
                <span className="font-medium">{pillar.title}</span>
                <p className="text-sm text-muted">{pillar.body}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-5xl px-6 pb-24">
        <Reveal className="text-center">
          <h2 className="gradient-ink mx-auto max-w-2xl text-3xl font-medium tracking-[-0.02em] sm:text-5xl">
            Three steps, then it{" "}
            <em className="font-serif italic">runs itself.</em>
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal
              key={step.n}
              delay={i * 120}
              className="flex flex-col gap-2"
            >
              <span className="font-geist text-sm text-faint">{step.n}</span>
              <span className="text-lg font-medium">{step.title}</span>
              <p className="text-sm text-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal
          delay={200}
          className="mt-12 flex flex-wrap justify-center gap-2"
        >
          {stepTypes.map((type) => (
            <span
              key={type}
              className="rounded-full border border-line bg-card px-4 py-2 text-sm text-muted"
            >
              {type}
            </span>
          ))}
        </Reveal>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-peri px-6 py-16 text-center">
            <div
              aria-hidden
              className="absolute -top-16 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-blush-deep/30 blur-3xl"
            />
            <div className="relative flex flex-col items-center gap-5">
              <p className="rounded-full border border-line bg-card px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-faint uppercase">
                {closing.eyebrow}
              </p>
              <h2 className="gradient-ink max-w-2xl text-3xl font-medium tracking-[-0.02em] sm:text-5xl">
                {closing.title}{" "}
                <em className="font-serif italic">{closing.accent}</em>
              </h2>
              <p className="max-w-xl text-muted">{closing.body}</p>
              <Link href={closing.cta.href}>
                <Button>{closing.cta.label}</Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
