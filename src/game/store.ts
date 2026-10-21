import { playSfx, setMuted, unlockAudio } from "@/game/audio";
import {
  buyGear,
  buyPotion,
  continueIntro,
  createRun,
  enterRoom,
  isRun,
  leaveShop,
  pickLevel,
  pickReward,
  playerAction,
  restChoice,
  shrineChoice,
  trapChoice,
} from "@/game/logic";
import type { Action, Fx, Run } from "@/game/types";
import { create } from "zustand";

export type Floater = {
  id: number;
  text: string;
  kind: "dmg" | "heal" | "crit";
  side: "player" | "enemy";
};

export type Best = { wins: number; deepest: number; lastSeed: string };

type FxState = {
  shake: 0 | 1 | 2;
  flash: null | "player" | "enemy";
  swing: null | "player" | "enemy";
  floaters: Floater[];
};

type State = {
  run: Run | null;
  best: Best;
  muted: boolean;
  shakeOn: boolean;
  fx: FxState;
  start: (seed: string) => void;
  abandon: () => void;
  intro: () => void;
  enter: () => void;
  act: (action: Action) => void;
  reward: (id: string) => void;
  level: (id: string) => void;
  shrine: (id: "blood" | "pray" | "well") => void;
  rest: (id: "sleep" | "meditate" | "whet") => void;
  trap: (id: "disarm" | "cross" | "back") => void;
  buyPotion: () => void;
  buyGear: () => void;
  leave: () => void;
  toggleMute: () => void;
  toggleShake: () => void;
};

const SAVE_KEY = "sorte-arcana-v1";

const emptyFx = (): FxState => ({ shake: 0, flash: null, swing: null, floaters: [] });

let floaterId = 0;
let shakeToken = 0;
let flashToken = 0;
let hydrating = false;

function later(fn: () => void, ms: number) {
  window.setTimeout(fn, ms);
}

function present(list: Fx[]) {
  if (typeof window === "undefined") return;
  for (const effect of list) {
    const id = ++floaterId;
    later(() => {
      playSfx(effect.sfx);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const allowShake = useGame.getState().shakeOn && !reduce;
      useGame.setState((state) => ({
        fx: {
          shake: allowShake ? (effect.shake ?? state.fx.shake) : 0,
          flash: effect.flash ?? state.fx.flash,
          swing: effect.swing ?? state.fx.swing,
          floaters: effect.float
            ? [...state.fx.floaters, { ...effect.float, id }].slice(-6)
            : state.fx.floaters,
        },
      }));
      if (effect.shake && allowShake) {
        const token = ++shakeToken;
        later(() => {
          if (token !== shakeToken) return;
          useGame.setState((state) => ({ fx: { ...state.fx, shake: 0 } }));
        }, 340);
      }
      if (effect.flash || effect.swing) {
        const token = ++flashToken;
        later(() => {
          if (token !== flashToken) return;
          useGame.setState((state) => ({ fx: { ...state.fx, flash: null, swing: null } }));
        }, 280);
      }
      if (effect.float) {
        later(() => {
          useGame.setState((state) => ({
            fx: { ...state.fx, floaters: state.fx.floaters.filter((item) => item.id !== id) },
          }));
        }, 880);
      }
    }, effect.delay);
  }
}

function updateBest(best: Best, prev: Run | null, next: Run): Best {
  const cleared = next.rooms.filter((room) => room.resolved).length;
  return {
    wins: best.wins + (next.phase === "won" && prev?.phase !== "won" ? 1 : 0),
    deepest: Math.max(best.deepest, cleared),
    lastSeed: next.seed,
  };
}

function commit(run: Run, fx: Fx[]) {
  const prev = useGame.getState();
  useGame.setState({ run, best: updateBest(prev.best, prev.run, run) });
  present(fx);
}

function apply(fn: (run: Run) => { run: Run; fx: Fx[] }) {
  const run = useGame.getState().run;
  if (!run) return;
  const step = fn(run);
  commit(step.run, step.fx);
}

export const useGame = create<State>((set, get) => ({
  run: null,
  best: { wins: 0, deepest: 0, lastSeed: "" },
  muted: false,
  shakeOn: true,
  fx: emptyFx(),
  start: (seed) => {
    unlockAudio();
    commit(createRun(seed), [{ sfx: "ui", delay: 0 }]);
  },
  abandon: () => set({ run: null, fx: emptyFx() }),
  intro: () => apply(continueIntro),
  enter: () => apply(enterRoom),
  act: (action) => apply((run) => playerAction(run, action)),
  reward: (id) => apply((run) => pickReward(run, id)),
  level: (id) => apply((run) => pickLevel(run, id)),
  shrine: (id) => apply((run) => shrineChoice(run, id)),
  rest: (id) => apply((run) => restChoice(run, id)),
  trap: (id) => apply((run) => trapChoice(run, id)),
  buyPotion: () => apply(buyPotion),
  buyGear: () => apply(buyGear),
  leave: () => apply(leaveShop),
  toggleMute: () => {
    const muted = !get().muted;
    setMuted(muted);
    if (!muted) unlockAudio();
    set({ muted });
  },
  toggleShake: () => set({ shakeOn: !get().shakeOn }),
}));

export function loadSave() {
  if (typeof window === "undefined") return;
  hydrating = true;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as {
      version?: number;
      run?: unknown;
      best?: Best;
      muted?: boolean;
      shakeOn?: boolean;
    };
    if (data.version !== 1) return;
    const muted = !!data.muted;
    setMuted(muted);
    useGame.setState({
      run: isRun(data.run) ? data.run : null,
      best: data.best && typeof data.best.wins === "number" ? data.best : useGame.getState().best,
      muted,
      shakeOn: data.shakeOn !== false,
    });
  } catch {
    /* ignore broken saves */
  } finally {
    hydrating = false;
  }
}

useGame.subscribe((state) => {
  if (hydrating || typeof window === "undefined") return;
  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 1,
      run: state.run,
      best: state.best,
      muted: state.muted,
      shakeOn: state.shakeOn,
    }),
  );
});
