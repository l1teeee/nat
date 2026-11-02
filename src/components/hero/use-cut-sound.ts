import { useCallback, useEffect, useRef } from "react";

// Only these events count as a user activation that lets an AudioContext start in Chrome and Safari.
const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown"] as const;

const TOCK_START_HZ = 480;
const TOCK_END_HZ = 400;
const TOCK_PITCH_DROP_S = 0.02;
const TOCK_ATTACK_S = 0.004;
const TOCK_DURATION_S = 0.045;
const TOCK_PEAK_GAIN = 0.06;
const TOCK_LOWPASS_HZ = 1600;
const TOCK_LOWPASS_Q = 0.707;
const SILENT_GAIN = 0.0001;

function playTock(context: AudioContext): void {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const lowpass = context.createBiquadFilter();
  const envelope = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(TOCK_START_HZ, now);
  oscillator.frequency.exponentialRampToValueAtTime(TOCK_END_HZ, now + TOCK_PITCH_DROP_S);

  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(TOCK_LOWPASS_HZ, now);
  lowpass.Q.setValueAtTime(TOCK_LOWPASS_Q, now);

  envelope.gain.setValueAtTime(SILENT_GAIN, now);
  envelope.gain.exponentialRampToValueAtTime(TOCK_PEAK_GAIN, now + TOCK_ATTACK_S);
  envelope.gain.exponentialRampToValueAtTime(SILENT_GAIN, now + TOCK_DURATION_S);

  oscillator.connect(lowpass).connect(envelope).connect(context.destination);
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
