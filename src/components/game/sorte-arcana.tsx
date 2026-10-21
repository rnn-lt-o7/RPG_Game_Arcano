import { useEffect, useState } from "react";
import {
  Coins,
  Crown,
  Dices,
  Flame,
  Gem,
  Lock,
  Moon,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Sword,
  Swords,
  Volume2,
  VolumeX,
} from "lucide-react";
import { bindAudioLifecycle, playSfx, unlockAudio } from "@/game/audio";
import { CLASSES, INTENT_META, ROOM_COPY, XP_STEP, formatMods, slotLabel } from "@/game/content";
import { derived, epitaphFor } from "@/game/logic";
import { randomSeed } from "@/game/rng";
import { loadSave, useGame } from "@/game/store";
import type { Action, Item, RoomKind, Run } from "@/game/types";

function pct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "ember" | "gold";
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-mute">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={tone === "ember" ? "h-full bg-ember transition-all" : "h-full bg-gold transition-all"}
          style={{ width: `${pct(value, max)}%` }}
        />
      </div>
    </div>
  );
}

function RoomIcon({ kind }: { kind: RoomKind }) {
  const className = "size-5";
  if (kind === "fight") return <Swords className={className} />;
  if (kind === "elite") return <Skull className={className} />;
  if (kind === "boss") return <Crown className={className} />;
  if (kind === "shrine") return <Sun className={className} />;
  if (kind === "chest") return <Gem className={className} />;
  if (kind === "merchant") return <Coins className={className} />;
  if (kind === "trap") return <Lock className={className} />;
  return <Moon className={className} />;
}

function Stage() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <img src="/art/hall.jpg" alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/85 to-ink" />
    </div>
  );
}

function TopBar({ seed, note }: { seed: string; note?: string }) {
  const muted = useGame((s) => s.muted);
  const shakeOn = useGame((s) => s.shakeOn);
  const toggleMute = useGame((s) => s.toggleMute);
  const toggleShake = useGame((s) => s.toggleShake);
  const [copied, setCopied] = useState(false);

  async function copySeed() {
    try {
      await navigator.clipboard.writeText(seed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-display text-xl text-gold">Sorte Arcana</p>
        <button type="button" onClick={copySeed} className="truncate text-xs tracking-widest text-mute">
          {copied ? "Semente copiada" : seed}
          {note ? ` · ${note}` : ""}
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className={shakeOn ? "icon-btn text-gold" : "icon-btn"}
          onClick={toggleShake}
          aria-pressed={shakeOn}
          aria-label={shakeOn ? "Desligar tremor" : "Ligar tremor"}
        >
          <Sparkles className="size-4" />
        </button>
        <button type="button" className="icon-btn" onClick={toggleMute} aria-label={muted ? "Ativar som" : "Silenciar"}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </header>
  );
}

function StatGrid({ atk, def, spd, luck }: { atk: number; def: number; spd: number; luck: number }) {
  const cells = [
    ["Ataque", atk],
    ["Defesa", def],
    ["Iniciativa", spd],
    ["Sorte", luck],
  ] as const;
  return (
    <dl className="grid grid-cols-4 gap-2 text-center">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-ink/50 px-1 py-2">
          <dt className="text-xs text-mute">{label}</dt>
          <dd className="font-display text-lg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function GearLine({ item, empty }: { item: Item | null; empty: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-mute">{item ? slotLabel(item.slot) : empty}</p>
      <p className="truncate text-sm">{item ? item.name : "Vazio"}</p>
      {item && <p className="truncate text-xs text-gold">{formatMods(item.mods)}</p>}
    </div>
  );
}

function HeroCard({ run }: { run: Run }) {
  const abandon = useGame((s) => s.abandon);
  const swing = useGame((s) => s.fx.swing);
  const flash = useGame((s) => s.fx.flash);
  const [armed, setArmed] = useState(false);
  const cls = CLASSES[run.hero.classId];
  const stats = derived(run.hero, run.combat?.atkBuff ?? 0);
  const fxSwing = swing === "player" ? "fx-lunge-player" : "";
  return (
    <aside className="panel flex gap-3 lg:flex-col">
      <div className="relative shrink-0 overflow-hidden rounded-xl lg:w-full">
        <img
          src={cls.art}
          alt={run.hero.name}
          className={`h-28 w-24 object-cover object-top lg:aspect-[3/4] lg:h-auto lg:w-full ${fxSwing}`}
        />
        {flash === "player" && <span className="fx-flash" />}
        <Floaters side="player" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="text-xs tracking-widest text-gold">{cls.label}</p>
          <h2 className="truncate text-2xl">{run.hero.name}</h2>
          <p className="text-sm text-mute">
            Nível {run.hero.level} · {run.hero.gold} ouro · {run.hero.potions} poções
          </p>
        </div>
        <Bar label="Vida" value={stats.hp} max={stats.maxHp} tone="ember" />
        <Bar label="Vigor" value={stats.vigor} max={stats.maxVigor} tone="gold" />
        <Bar label="Experiência" value={run.hero.xp} max={run.hero.level * XP_STEP} tone="gold" />
        <StatGrid atk={stats.atk} def={stats.def} spd={stats.spd} luck={stats.luck} />
        <div className="grid grid-cols-3 gap-2">
          <GearLine item={run.hero.gear.weapon} empty="Arma" />
          <GearLine item={run.hero.gear.armor} empty="Armadura" />
          <GearLine item={run.hero.gear.trinket} empty="Relíquia" />
        </div>
        <button type="button" className="btn btn-ghost mt-auto" onClick={() => (armed ? abandon() : setArmed(true))}>
          {armed ? "Confirmar saída" : "Abandonar"}
        </button>
      </div>
    </aside>
  );
}

function Floaters({ side }: { side: "player" | "enemy" }) {
  const floaters = useGame((s) => s.fx.floaters.filter((item) => item.side === side));
  return (
    <>
      {floaters.map((item) => (
        <span
          key={item.id}
          className={
            item.kind === "heal" ? "fx-float text-parchment" : item.kind === "crit" ? "fx-float text-gold" : "fx-float text-ember"
          }
        >
          {item.text}
        </span>
      ))}
    </>
  );
}

function CombatView({ run }: { run: Run }) {
  const act = useGame((s) => s.act);
  const fx = useGame((s) => s.fx);
  const combat = run.combat;
  if (!combat) return null;
  const cls = CLASSES[run.hero.classId];
  const stats = derived(run.hero, combat.atkBuff);
  const intent = INTENT_META[combat.enemy.intent];
  const IntentIcon = combat.enemy.intent === "investida" ? Flame : combat.enemy.intent === "guarda" ? Shield : Sword;
  const canSkill = stats.vigor >= cls.cost && !combat.outcome;
  const canPotion = run.hero.potions > 0 && !combat.outcome;

  function press(action: Action) {
    act(action);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel relative overflow-hidden">
        <div className="relative mx-auto aspect-[3/4] max-h-80 w-full max-w-sm">
          <img
            src={combat.enemy.art}
            alt={combat.enemy.name}
            className={`h-full w-full object-contain ${fx.swing === "enemy" ? "fx-lunge" : ""} ${fx.flash === "enemy" ? "" : ""}`}
          />
          {fx.flash === "enemy" && <span className="fx-flash" />}
          <Floaters side="enemy" />
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl">{combat.enemy.name}</h2>
            <p className="text-sm text-mute">{combat.enemy.flavor}</p>
          </div>
        </div>
        <div className="mt-3">
          <Bar label="Vida do inimigo" value={combat.enemy.hp} max={combat.enemy.maxHp} tone="ember" />
        </div>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-line bg-ink/50 p-3">
          <IntentIcon className="mt-0.5 size-5 shrink-0 text-gold" />
          <div>
            <p className="font-semibold text-gold">{intent.label}</p>
            <p className="text-sm text-mute">{intent.hint}</p>
          </div>
        </div>
      </div>
      <div className="panel">
        <ul className="flex flex-col gap-1 text-sm" aria-live="polite">
          {combat.log.map((line, index) => (
            <li key={`${combat.turn}-${index}`}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={() => press("strike")} disabled={!!combat.outcome}>
          <Sword className="size-4" /> Golpear
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => press("skill")} disabled={!canSkill}>
          <Flame className="size-4" /> {cls.skill}
          <span className="text-mute">{cls.cost}</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => press("guard")} disabled={!!combat.outcome}>
          <Shield className="size-4" /> Guardar
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => press("potion")} disabled={!canPotion}>
          Poção · {run.hero.potions}
        </button>
      </div>
      <p className="text-center text-xs text-mute">Teclas 1 a 4. Você age primeiro. Guardar contra investida.</p>
    </div>
  );
}

function ChoiceButton({
  title,
  detail,
  onClick,
  disabled,
}: {
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="panel w-full text-left hover:border-gold disabled:opacity-40" onClick={onClick} disabled={disabled}>
      <span className="block font-display text-xl">{title}</span>
      <span className="mt-1 block text-sm text-mute">{detail}</span>
    </button>
  );
}

function EventView({ run }: { run: Run }) {
  const shrine = useGame((s) => s.shrine);
  const rest = useGame((s) => s.rest);
  const trap = useGame((s) => s.trap);
  const buyPotion = useGame((s) => s.buyPotion);
  const buyGear = useGame((s) => s.buyGear);
  const leave = useGame((s) => s.leave);
  const event = run.event;
  if (!event) return null;
  const stats = derived(run.hero, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="panel">
        <p className="text-xs tracking-widest text-gold">{ROOM_COPY[event.kind].label}</p>
        <h2 className="text-3xl">{event.title}</h2>
        <p className="mt-2 text-mute">{event.text}</p>
      </div>
      {event.kind === "shrine" && (
        <>
          <ChoiceButton title="Pacto de sangue" detail="+2 de ataque. A vida máxima encolhe." onClick={() => shrine("blood")} />
          <ChoiceButton title="Prece curta" detail={`Recupera metade da vida. Agora ${stats.hp}/${stats.maxHp}.`} onClick={() => shrine("pray")} />
          <ChoiceButton
            title="Moeda no poço"
            detail="Gasta até 15 de ouro. +3 de sorte."
            onClick={() => shrine("well")}
            disabled={run.hero.gold < 8}
          />
        </>
      )}
      {event.kind === "rest" && (
        <>
          <ChoiceButton title="Dormir" detail="Cura boa parte da vida. O sonho é ruim." onClick={() => rest("sleep")} />
          <ChoiceButton title="Meditar" detail="+3 de vigor máximo." onClick={() => rest("meditate")} />
          <ChoiceButton title="Afiar" detail="+1 de ataque permanente." onClick={() => rest("whet")} />
        </>
      )}
      {event.kind === "trap" && (
        <>
          <ChoiceButton
            title="Desarmar"
            detail="Se a sorte falhar, são 9 de dano."
            onClick={() => trap("disarm")}
          />
          <ChoiceButton title="Atravessar" detail="7 de dano, sem conversa." onClick={() => trap("cross")} />
          <ChoiceButton
            title="Recuar"
            detail={run.hero.gold >= 10 ? "Deixa 10 de ouro e segue." : "Sem ouro bastante. Dói pouco e não mata."}
            onClick={() => trap("back")}
          />
        </>
      )}
      {event.kind === "merchant" && event.merchant && (
        <>
          <ChoiceButton
            title={`Poção · ${event.merchant.potionPrice} ouro`}
            detail={run.hero.potions >= 5 ? "O cinto já está cheio." : "Cabe mais uma. Máximo cinco."}
            onClick={buyPotion}
            disabled={run.hero.gold < event.merchant.potionPrice || run.hero.potions >= 5}
          />
          <ChoiceButton
            title={`${event.merchant.item.name} · ${event.merchant.itemPrice} ouro`}
            detail={
              event.merchant.bought
                ? "Já foi."
                : `${event.merchant.item.blurb} ${formatMods(event.merchant.item.mods)}`
            }
            onClick={buyGear}
            disabled={event.merchant.bought || run.hero.gold < event.merchant.itemPrice}
          />
          <ChoiceButton title="Seguir" detail="O mercador não insiste." onClick={leave} />
        </>
      )}
    </div>
  );
}

function LootView({ run, mode }: { run: Run; mode: "reward" | "level" }) {
  const reward = useGame((s) => s.reward);
  const level = useGame((s) => s.level);
  const items = mode === "reward" ? run.reward : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="panel">
        <p className="text-xs tracking-widest text-gold">{mode === "reward" ? "Espólio" : "Nível"}</p>
        <h2 className="text-3xl">{mode === "reward" ? "Escolha um." : "O corpo aprende uma coisa."}</h2>
        {mode === "reward" && <p className="mt-2 text-sm text-mute">O ouro e a experiência já estão com você. O item substitui o do mesmo tipo.</p>}
      </div>
      {mode === "reward" &&
        items?.map((item) => (
          <ChoiceButton
            key={item.id}
            title={item.name}
            detail={`${slotLabel(item.slot)} · ${formatMods(item.mods)} · ${item.blurb}`}
            onClick={() => reward(item.id)}
          />
        ))}
      {mode === "level" &&
        run.levelOffers?.map((offer) => (
          <ChoiceButton key={offer.id} title={offer.title} detail={offer.detail} onClick={() => level(offer.id)} />
        ))}
    </div>
  );
}

function MapView({ run }: { run: Run }) {
  const enter = useGame((s) => s.enter);
  const room = run.rooms[run.index];
  return (
    <div className="flex flex-col gap-3">
      {run.banner && <p className="panel text-sm text-gold">{run.banner}</p>}
      <ol className="flex flex-col gap-2">
        {run.rooms.map((item, index) => {
          const current = index === run.index;
          return (
            <li
              key={item.id}
              aria-current={current ? "step" : undefined}
              className={
                item.resolved
                  ? "flex items-start gap-3 rounded-2xl border border-line/80 px-3 py-3 opacity-60"
                  : current
                    ? "flex items-start gap-3 rounded-2xl border border-gold bg-bark/80 px-3 py-3"
                    : "flex items-start gap-3 rounded-2xl border border-line bg-bark/40 px-3 py-3"
              }
            >
              <span className="mt-1 text-gold">
                <RoomIcon kind={item.kind} />
              </span>
              <div className="min-w-0">
                <p className="text-xs tracking-widest text-mute">
                  {ROOM_COPY[item.kind].label}
                  {item.resolved ? " · feita" : current ? " · agora" : ""}
                </p>
                <p className="font-display text-xl">{item.title}</p>
                <p className="text-sm text-mute">{item.blurb}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {room && !room.resolved && (
        <button type="button" className="btn btn-primary" onClick={enter}>
          {ROOM_COPY[room.kind].verb}
        </button>
      )}
      <details className="panel">
        <summary className="cursor-pointer font-semibold">Crônica</summary>
        <ul className="mt-3 flex flex-col gap-1 text-sm text-mute">
          {run.chronicle.slice(-8).map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function PlayScreen({ run }: { run: Run }) {
  const fx = useGame((s) => s.fx);
  const cleared = run.rooms.filter((room) => room.resolved).length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const current = useGame.getState().run;
      if (!current || current.phase !== "combat") return;
      const action = { "1": "strike", "2": "skill", "3": "guard", "4": "potion" }[event.key] as Action | undefined;
      if (!action) return;
      event.preventDefault();
      useGame.getState().act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shake = fx.shake === 2 ? "fx-shake-hard" : fx.shake === 1 ? "fx-shake" : "";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 px-4 py-4">
      <TopBar seed={run.seed} note={`sala ${Math.min(run.rooms.length, cleared + (run.phase === "won" ? 0 : 1))} de ${run.rooms.length}`} />
      <div className={`grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] ${shake}`}>
        <HeroCard run={run} />
        <section className="min-w-0">
          {run.phase === "map" && <MapView run={run} />}
          {run.phase === "combat" && <CombatView run={run} />}
          {run.phase === "event" && <EventView run={run} />}
          {run.phase === "reward" && <LootView run={run} mode="reward" />}
          {run.phase === "levelup" && <LootView run={run} mode="level" />}
        </section>
      </div>
    </main>
  );
}

function IntroScreen({ run }: { run: Run }) {
  const intro = useGame((s) => s.intro);
  const start = useGame((s) => s.start);
  const cls = CLASSES[run.hero.classId];
  const stats = derived(run.hero, 0);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <TopBar seed={run.seed} />
      <section className="grid items-center gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <img src={cls.art} alt={run.hero.name} className="aspect-[3/4] w-full rounded-2xl object-cover object-top" />
        <div className="panel flex flex-col gap-3">
          <p className="text-xs tracking-widest text-gold">Sorteado · {cls.label}</p>
          <h1 className="text-4xl">{run.hero.name}</h1>
          <p className="text-mute">{cls.blurb}</p>
          <p className="text-sm">
            <span className="text-gold">{cls.skill}.</span> {cls.skillDetail} Custa {cls.cost} de vigor.
          </p>
          <StatGrid atk={stats.atk} def={stats.def} spd={stats.spd} luck={stats.luck} />
          <p className="text-sm text-mute">
            Vida {stats.maxHp} · vigor {stats.maxVigor} · {run.hero.potions} poções · {run.hero.gold} ouro
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn btn-primary" onClick={intro}>
              Descer
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                unlockAudio();
                start(randomSeed());
              }}
            >
              <Dices className="size-4" /> Outra semente
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ChronicleScreen({ run }: { run: Run }) {
  const start = useGame((s) => s.start);
  const abandon = useGame((s) => s.abandon);
  const cls = CLASSES[run.hero.classId];
  const won = run.phase === "won";
  const cleared = run.rooms.filter((room) => room.resolved).length;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4 py-8">
      <img
        src={cls.art}
        alt=""
        className={`mx-auto aspect-[3/4] w-52 rounded-2xl object-cover object-top ${won ? "" : "opacity-80 grayscale"}`}
      />
      <div className="panel text-center">
        <p className="text-xs tracking-widest text-gold">{won ? "O poço cedeu" : "Fim da descida"}</p>
        <h1 className="mt-2 text-4xl">{run.hero.name}</h1>
        <p className="mt-3 text-mute">{epitaphFor(run)}</p>
        <p className="mt-4 text-sm">
          {cls.label} · nível {run.hero.level} · {cleared} salas · {run.hero.gold} ouro
        </p>
        <p className="mt-1 text-xs tracking-widest text-gold">{run.seed}</p>
      </div>
      <div className="grid gap-2">
        <button type="button" className="btn btn-primary" onClick={() => start(run.seed)}>
          Mesma semente
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => start(randomSeed())}>
          Nova semente
        </button>
        <button type="button" className="btn btn-ghost" onClick={abandon}>
          Voltar
        </button>
      </div>
    </main>
  );
}

function TitleScreen() {
  const best = useGame((s) => s.best);
  const start = useGame((s) => s.start);
  const [seed, setSeed] = useState(randomSeed);
  const [spinning, setSpinning] = useState(false);

  function roll() {
    unlockAudio();
    playSfx("ui");
    setSpinning(true);
    let step = 0;
    const id = window.setInterval(() => {
      setSeed(randomSeed());
      step += 1;
      if (step > 7) {
        window.clearInterval(id);
        setSpinning(false);
      }
    }, 45);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <p className="text-xs tracking-widest text-gold">Masmorra de semente</p>
      <div>
        <h1 className="text-5xl text-parchment sm:text-6xl">Sorte Arcana</h1>
        <p className="mt-3 max-w-md text-mute">
          Cada semente sorteia o herói, as salas e o loot. A mesma semente desce a mesma masmorra. O inimigo mostra a intenção antes de agir.
        </p>
      </div>
      <form
        className="panel flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          unlockAudio();
          start(seed);
        }}
      >
        <label className="text-sm text-mute" htmlFor="seed">
          Semente
        </label>
        <input
          id="seed"
          className="seed-input"
          value={seed}
          maxLength={12}
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(event) => setSeed(event.target.value.toUpperCase())}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn btn-ghost" onClick={roll} disabled={spinning}>
            <Dices className="size-4" /> Sortear de novo
          </button>
          <button type="submit" className="btn btn-primary">
            Entrar na masmorra
          </button>
        </div>
      </form>
      <ul className="grid gap-2 text-sm text-mute">
        <li>Você age primeiro. Guarde quando a intenção for investida.</li>
        <li>Poção, altar e nicho existem para você não morrer burro.</li>
        <li>O chefe espera na última sala, com três cabeças.</li>
      </ul>
      <p className="text-sm text-mute">
        Mais fundo: {best.deepest} salas · vitórias {best.wins}
        {best.lastSeed ? ` · última ${best.lastSeed}` : ""}
      </p>
    </main>
  );
}

export function SorteArcana() {
  const [hydrated, setHydrated] = useState(false);
  const run = useGame((s) => s.run);

  useEffect(() => {
    loadSave();
    setHydrated(true);
    return bindAudioLifecycle();
  }, []);

  return (
    <div className="relative min-h-dvh">
      <Stage />
      {!hydrated ? (
        <main className="grid min-h-dvh place-items-center">
          <p className="font-display text-3xl text-gold">Sorte Arcana</p>
        </main>
      ) : !run ? (
        <TitleScreen />
      ) : run.phase === "intro" ? (
        <IntroScreen run={run} />
      ) : run.phase === "dead" || run.phase === "won" ? (
        <ChronicleScreen run={run} />
      ) : (
        <PlayScreen run={run} />
      )}
    </div>
  );
}
