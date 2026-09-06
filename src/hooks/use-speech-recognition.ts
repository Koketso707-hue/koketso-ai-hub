import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/**
 * Browser voice dictation. Returns interim + final transcript while listening.
 */
export function useSpeechRecognition({
  onFinalText,
  onError,
}: {
  onFinalText: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const ref = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => ref.current?.abort();
  }, []);

  const stop = useCallback(() => {
    ref.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      onError?.("Voice input isn't supported in this browser.");
      return;
    }
    const rec = new Ctor();
    ref.current = rec;
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let live = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else live += text;
      }
      setInterim(live);
      if (final.trim()) onFinalText(final.trim());
    };
    rec.onerror = (event: any) => {
      setListening(false);
      setInterim("");
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        onError?.("Microphone access was blocked. Allow it in your browser to talk.");
      } else if (code !== "aborted" && code !== "no-speech") {
        onError?.("Voice input stopped unexpectedly. Try again.");
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      onError?.("Couldn't start voice input. Try again.");
    }
  }, [onError, onFinalText]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, start, stop, toggle };
}
