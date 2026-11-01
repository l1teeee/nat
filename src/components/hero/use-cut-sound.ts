import { useCallback, useEffect, useRef } from "react";

// Only these events count as a user activation that lets an AudioContext start in Chrome and Safari.
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown"] as const;

const TOCK_START_HZ = 520;
const TOCK_END_HZ = 260;
const TOCK_PITCH_DROP_S = 0.08;
const TOCK_ATTACK_S = 0.005;
const TOCK_DURATION_S = 0.16;
const TOCK_PEAK_GAIN = 0.08;
const SILENT_GAIN = 0.0001;

function playTock(context: AudioContext): void {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(TOCK_START_HZ, now);
  oscillator.frequency.exponentialRampToValueAtTime(TOCK_END_HZ, now + TOCK_PITCH_DROP_S);

  envelope.gain.setValueAtTime(SILENT_GAIN, now);
  envelope.gain.exponentialRampToValueAtTime(TOCK_PEAK_GAIN, now + TOCK_ATTACK_S);
  envelope.gain.exponentialRampToValueAtTime(SILENT_GAIN, now + TOCK_DURATION_S);

  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + TOCK_DURATION_S);
}

export function useCutSound(): () => void {
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let context: AudioContext | null = null;

    function removeUnlockListeners() {
      for (const eventName of UNLOCK_EVENTS) {
        window.removeEventListener(eventName, unlock);
      }
    }

    function unlock() {
      context ??= new AudioContext();
      contextRef.current = context;
      void context.resume();
      if (context.state === "running") {
        removeUnlockListeners();
      }
    }

    for (const eventName of UNLOCK_EVENTS) {
      window.addEventListener(eventName, unlock);
    }

    return () => {
      removeUnlockListeners();
      contextRef.current = null;
      if (context) {
        void context.close();
      }
    };
  }, []);

  return useCallback(() => {
    const context = contextRef.current;
    if (context?.state === "running") {
      playTock(context);
    }
  }, []);
}
