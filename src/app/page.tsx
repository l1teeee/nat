import { VideoSequence } from "@/components/hero/video-sequence";
import { HERO_CLIPS, HERO_PHRASE } from "@/content/hero";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <VideoSequence clips={HERO_CLIPS} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/20" />
      <div aria-hidden="true" className="film-grain pointer-events-none absolute -inset-[10%]" />
      <div className="relative flex h-full items-center justify-center px-6">
        <h1 className="flex w-full max-w-[420px] items-center justify-between font-sans text-[clamp(0.875rem,1.4vw,1.125rem)] font-medium lowercase leading-none tracking-normal text-foreground">
          {HERO_PHRASE.map((word, index) => (
            <span key={index}>{word}</span>
          ))}
        </h1>
      </div>
    </main>
  );
}
