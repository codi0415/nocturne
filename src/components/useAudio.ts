"use client";
import { useCallback, useRef } from "react";

export function useAudio() { const contextRef = useRef<AudioContext | null>(null); const nodes = useRef<AudioNode[]>([]);
  const stop = useCallback(() => { nodes.current.forEach(node => { try { node.disconnect(); } catch {} }); nodes.current=[]; }, []);
  const start = useCallback((kind: string) => { stop(); const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AudioCtor) return; const context = contextRef.current ?? new AudioCtor(); contextRef.current=context; void context.resume(); const gain=context.createGain();gain.gain.value=.035;gain.connect(context.destination);const oscillator=context.createOscillator();oscillator.type=kind==="tunnel"?"sawtooth":"sine";oscillator.frequency.value=kind==="rain"?92:kind==="moon"?61:48;oscillator.connect(gain);oscillator.start();nodes.current=[oscillator,gain]; }, [stop]);
  const effect = useCallback((type: "beep"|"chime"|"print") => { const context=contextRef.current;if(!context)return;const oscillator=context.createOscillator();const gain=context.createGain();oscillator.frequency.setValueAtTime(type==="beep"?880:type==="chime"?523:120,context.currentTime);gain.gain.setValueAtTime(.1,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.45);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.5); }, []);
  return { start, stop, effect };
}
