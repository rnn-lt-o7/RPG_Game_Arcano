import type { SfxKind } from "@/game/types";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setMuted(next: boolean) {
  muted = next;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(next ? 0 : 0.7, ctx.currentTime, 0.02);
}

export function unlockAudio() {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function bindAudioLifecycle() {
  const onVis = () => {
    if (document.visibilityState === "visible") unlockAudio();
  };
  document.addEventListener("visibilitychange", onVis);
  return () => document.removeEventListener("visibilitychange", onVis);
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp);
  amp.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.03);
  osc.onended = () => {
    osc.disconnect();
    amp.disconnect();
  };
}

function noise(dur: number, gain: number) {
  if (!ctx || !master) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;
  src.buffer = buffer;
  amp.gain.value = gain;
  src.connect(filter);
  filter.connect(amp);
  amp.connect(master);
  src.start();
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    amp.disconnect();
  };
}

export function playSfx(kind: SfxKind) {
  if (!ctx || !master || muted) return;
  const j = 0.94 + Math.random() * 0.12;
  if (kind === "hit") {
    noise(0.08, 0.18);
    beep(160 * j, 0.09, "square", 0.08, -70);
  } else if (kind === "crit") {
    noise(0.12, 0.22);
    beep(140 * j, 0.12, "square", 0.1, 80);
    beep(320 * j, 0.16, "triangle", 0.06);
  } else if (kind === "hurt") {
    beep(110 * j, 0.18, "sawtooth", 0.07, -60);
  } else if (kind === "heal") {
    beep(523, 0.12, "sine", 0.06);
    beep(659, 0.14, "sine", 0.05);
    beep(784, 0.18, "sine", 0.05);
  } else if (kind === "guard") {
    beep(196 * j, 0.14, "triangle", 0.07);
  } else if (kind === "skill") {
    beep(220 * j, 0.16, "square", 0.05);
    beep(440 * j, 0.18, "sine", 0.05);
  } else if (kind === "coin") {
    beep(880 * j, 0.08, "sine", 0.05);
    beep(1174 * j, 0.12, "sine", 0.04);
  } else if (kind === "win") {
    beep(392, 0.14, "triangle", 0.06);
    beep(523, 0.16, "triangle", 0.06);
    beep(659, 0.2, "triangle", 0.06);
    beep(784, 0.28, "sine", 0.05);
  } else if (kind === "lose") {
    beep(220, 0.28, "sawtooth", 0.06, -140);
  } else {
    beep(660 * j, 0.05, "triangle", 0.04);
  }
}
