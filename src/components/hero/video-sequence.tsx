"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useCutSound } from "./use-cut-sound";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const CUT_MIN_MS = 3000;
const CUT_MAX_MS = 3500;

// AbortError: a pause() interrupted play(). NotAllowedError: the browser blocked autoplay.
// NotSupportedError: the clip file is missing or unsupported. All three leave the dark background visible.
const EXPECTED_PLAY_ERRORS = new Set(["AbortError", "NotAllowedError", "NotSupportedError"]);

function randomCutDelay(): number {
  return CUT_MIN_MS + Math.random() * (CUT_MAX_MS - CUT_MIN_MS);
}

function handlePlayError(error: unknown): void {
  if (error instanceof DOMException && EXPECTED_PLAY_ERRORS.has(error.name)) {
    return;
  }
  throw error;
}

type VideoSequenceProps = {
  clips: readonly string[];
};

export function VideoSequence({ clips }: VideoSequenceProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const playCutSound = useCutSound();
  const nextIndex = (activeIndex + 1) % clips.length;

  useEffect(() => {
    if (!hasStarted || prefersReducedMotion || clips.length < 2) {
      return;
    }

    let waitingVideo: HTMLVideoElement | null = null;

    function advance() {
      setActiveIndex(nextIndex);
      playCutSound();
    }

    // Cut only once the next clip can play, so a slow network never shows a black frame.
    const timeoutId = window.setTimeout(() => {
      const nextVideo = videoRefs.current[nextIndex];
      if (!nextVideo || nextVideo.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        advance();
        return;
      }
      waitingVideo = nextVideo;
      nextVideo.addEventListener("canplay", advance, { once: true });
    }, randomCutDelay());

    return () => {
      window.clearTimeout(timeoutId);
      waitingVideo?.removeEventListener("canplay", advance);
    };
  }, [hasStarted, nextIndex, prefersReducedMotion, clips.length, playCutSound]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) {
        return;
      }

      if (index === activeIndex && !prefersReducedMotion) {
        video.play().catch(handlePlayError);
      } else {
        video.pause();
      }
    });
  }, [activeIndex, prefersReducedMotion]);

  const isVisible = hasStarted || prefersReducedMotion;

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
        isVisible ? "opacity-100" : "opacity-0",
      )}
    >
      {clips.map((src, index) => (
        <video
          key={src}
          ref={(element) => {
            videoRefs.current[index] = element;
          }}
          src={src}
          muted
          loop
          playsInline
          preload={index === activeIndex || index === nextIndex ? "auto" : "metadata"}
          tabIndex={-1}
          onPlaying={() => setHasStarted(true)}
          className={clsx(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-[120ms] ease-linear motion-reduce:transition-none",
            index === activeIndex ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  );
}
