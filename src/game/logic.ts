import {
  CLASS_IDS,
  CLASSES,
  EPITAPHS,
  FIRST_NAMES,
  ITEMS,
  LAST_NAMES,
  LEVEL_OFFERS,
  MONSTERS,
  ROOM_COPY,
  VICTORIES,
  XP_STEP,
  type MonsterId,
} from "@/game/content";
import { normalizeSeed, stream, xmur3 } from "@/game/rng";
import type {
  Action,
  ClassId,
  Enemy,
  EventState,
  Fx,
  Hero,
  Intent,
  Item,
  LevelOffer,
  Phase,
  Room,
  RoomKind,
  Run,
  Stats,
  Step,
} from "@/game/types";

function pick<T>(list: readonly T[], n: number): T {
  return list[Math.min(list.length - 1, Math.floor(n * list.length))]!;
}

function withLog(run: Run, line: string): Run {
  const chronicle = [...run.chronicle, line].slice(-48);
  if (!run.combat) return { ...run, chronicle };
  return {
    ...run,
    chronicle,
    combat: { ...run.combat, log: [...run.combat.log, line].slice(-6) },
  };
}

export function derived(hero: Hero, atkBuff = 0) {
  let maxHp = hero.stats.maxHp;
  let maxVigor = hero.stats.maxVigor;
  let atk = hero.stats.atk + (atkBuff > 0 ? 3 : 0);
  let def = hero.stats.def;
  let spd = hero.stats.spd;
  let luck = hero.stats.luck;
  for (const item of [hero.gear.weapon, hero.gear.armor, hero.gear.trinket]) {
    if (!item) continue;
    maxHp += item.mods.maxHp ?? 0;
    maxVigor += item.mods.maxVigor ?? 0;
    atk += item.mods.atk ?? 0;
    def += item.mods.def ?? 0;
    spd += item.mods.spd ?? 0;
    luck += item.mods.luck ?? 0;
  }
  return {
    maxHp,
    maxVigor,
    atk,
    def,
    spd,
    luck,
    hp: Math.min(hero.stats.hp, maxHp),
    vigor: Math.min(hero.stats.vigor, maxVigor),
  };
}

export function epitaphFor(run: Run): string {
  const lines = run.phase === "won" ? VICTORIES : EPITAPHS;
  return lines[run.seedNum % lines.length]!;
}

function take(run: Run): [Run, number] {
  const roller = stream(run.seedNum, run.roll);
  const value = roller.next();
  return [{ ...run, roll: roller.count() }, value];
}

function emptyGear(): Hero["gear"] {
  return { weapon: null, armor: null, trinket: null };
}

export function createRun(seedRaw: string): Run {
  const seed = normalizeSeed(seedRaw);
  const seedNum = xmur3(seed);
  const roller = stream(seedNum, 0);
  const classId = pick(CLASS_IDS, roller.next());
  const name = `${pick(FIRST_NAMES, roller.next())} ${pick(LAST_NAMES, roller.next())}`;
  const mid: RoomKind[] = ["fight", "shrine", "chest", "fight", "rest", "elite", "merchant"];
  if (roller.next() < 0.45) {
    const trapAt = 1 + Math.floor(roller.next() * 4);
    mid[trapAt] = "trap";
  } else {
    roller.next();
  }
  for (let i = mid.length - 1; i > 0; i--) {
    const j = Math.floor(roller.next() * (i + 1));
    const a = mid[i]!;
    mid[i] = mid[j]!;
    mid[j] = a;
  }
  const kinds: RoomKind[] = ["fight", ...mid, "boss"];
  const rooms: Room[] = kinds.map((kind, index) => {
    const copy = ROOM_COPY[kind];
    return {
      id: `sala-${index}`,
      kind,
      title: pick(copy.titles, roller.next()),
      blurb: pick(copy.blurbs, roller.next()),
      resolved: false,
    };
  });
  const hero: Hero = {
    name,
    classId,
    level: 1,
    xp: 0,
    gold: 12,
    potions: 2,
    stats: { ...CLASSES[classId].stats },
    gear: emptyGear(),
  };
  const cls = CLASSES[classId];
  return {
    version: 1,
    seed,
    seedNum,
    roll: roller.count(),
    hero,
    rooms,
    index: 0,
    phase: "intro",
    banner: "",
    chronicle: [`${name}, ${cls.label.toLowerCase()}, desce com a semente ${seed}.`],
    combat: null,
    reward: null,
    levelOffers: null,
    queued: null,
    event: null,
  };
}

export function continueIntro(run: Run): Step {
  if (run.phase !== "intro") return { run, fx: [] };
  return { run: { ...run, phase: "map" }, fx: [{ sfx: "ui", delay: 0 }] };
}

function monsterIdFor(kind: RoomKind, depth: number, n: number): MonsterId {
  if (kind === "boss") return "hydra";
  if (kind === "elite") return n < 0.5 ? "skeleton" : "cultist";
  if (depth < 3) return n < 0.55 ? "goblin" : "hound";
  const pool: MonsterId[] = ["goblin", "hound", "skeleton", "cultist"];
  return pick(pool, n);
}

function makeEnemy(run: Run, kind: RoomKind, mimic: boolean): [Run, Enemy] {
  let n = 0;
  [run, n] = take(run);
  const id = mimic ? "cultist" : monsterIdFor(kind, run.index, n);
  const base = MONSTERS[id];
  const elite = kind === "elite";
  const boss = kind === "boss";
  const hp = Math.round((base.hp + run.index * (boss ? 2.2 : 3.1)) * (elite ? 1.18 : 1) * (mimic ? 1.08 : 1));
  const atk = Math.round(base.atk + run.index * (boss ? 0.45 : 0.55) + (elite ? 1 : 0) + (mimic ? 1 : 0));
  const def = base.def + Math.floor(run.index / 3) + (elite ? 1 : 0);
  let intentRoll = 0;
  [run, intentRoll] = take(run);
  const enemy: Enemy = {
    id: mimic ? "mimic" : id,
    name: mimic ? "Mímese do baú" : elite ? `${base.name} de elite` : base.name,
    art: base.art,
    flavor: mimic ? "Madeira, e depois dentes." : base.flavor,
    hp,
    maxHp: hp,
    atk,
    def,
    spd: base.spd,
    guarding: false,
    intent: rollIntentValue(intentRoll, boss),
    elite,
    boss,
  };
  return [run, enemy];
}

function rollIntentValue(n: number, boss: boolean): Intent {
  if (boss) {
    if (n < 0.34) return "golpe";
    if (n < 0.74) return "investida";
    return "guarda";
  }
  if (n < 0.48) return "golpe";
  if (n < 0.78) return "investida";
  return "guarda";
}

function nextIntent(run: Run, boss: boolean): [Run, Intent] {
  let n = 0;
  [run, n] = take(run);
  return [run, rollIntentValue(n, boss)];
}

function startCombat(run: Run, kind: RoomKind, mimic = false): Run {
  let enemy: Enemy;
  [run, enemy] = makeEnemy(run, kind, mimic);
  const line = mimic ? "O baú tinha dentes." : `${enemy.name} bloqueia o caminho.`;
  run = {
    ...run,
    phase: "combat",
    event: null,
    banner: "",
    combat: {
      enemy,
      playerGuarding: false,
      atkBuff: 0,
      log: [],
      outcome: null,
      turn: 1,
    },
  };
  return withLog(run, line);
}

export function computeDamage(
  atk: number,
  def: number,
  varianceRoll: number,
  opts: { guard: boolean; heavy: boolean; pierce: boolean; crit: boolean; power: number },
): number {
  const variance = 0.92 + varianceRoll * 0.16;
  let raw = atk * variance * opts.power - def * (opts.pierce ? 0.12 : 0.4);
  if (opts.guard) raw *= opts.heavy ? 0.32 : 0.55;
  if (opts.crit) raw *= 1.65;
  return Math.max(1, Math.round(raw));
}

function rollOffers(run: Run, count: number): [Run, Item[]] {
  const pool = ITEMS.slice();
  const picked: Item[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    let n = 0;
    [run, n] = take(run);
    const index = Math.min(pool.length - 1, Math.floor(n * pool.length));
    picked.push(pool.splice(index, 1)[0]!);
  }
  return [run, picked];
}

function rollLevelOffers(run: Run): [Run, LevelOffer[]] {
  const pool = LEVEL_OFFERS.slice();
  const picked: LevelOffer[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    let n = 0;
    [run, n] = take(run);
    const index = Math.min(pool.length - 1, Math.floor(n * pool.length));
    picked.push(pool.splice(index, 1)[0]!);
  }
  return [run, picked];
}

function finishRoom(run: Run, banner: string): Run {
  const rooms = run.rooms.map((room, index) =>
    index === run.index ? { ...room, resolved: true } : room,
  );
  const cleared = run.index + 1;
  const done = cleared >= rooms.length;
  const queued: Phase = done ? "won" : "map";
  const leveled = run.hero.xp >= run.hero.level * XP_STEP;
  if (leveled) {
    let offers: LevelOffer[];
    [run, offers] = rollLevelOffers(run);
    return {
      ...run,
      rooms,
      banner,
      index: done ? run.index : cleared,
      phase: "levelup",
      queued,
      event: null,
      combat: null,
      reward: null,
      levelOffers: offers,
    };
  }
  return {
    ...run,
    rooms,
    banner,
    index: done ? run.index : cleared,
    phase: queued,
    queued: null,
    event: null,
    combat: null,
    reward: null,
    levelOffers: null,
  };
}

function winCombat(run: Run, fx: Fx[]): Step {
  const enemy = run.combat?.enemy;
  if (!enemy) return { run, fx };
  let goldRoll = 0;
  let xpRoll = 0;
  [run, goldRoll] = take(run);
  [run, xpRoll] = take(run);
  const gold =
    (enemy.boss ? 36 : enemy.elite ? 20 : 11) + Math.floor(goldRoll * (enemy.boss ? 14 : 9)) + run.index;
  const xp = (enemy.boss ? 28 : enemy.elite ? 18 : 12) + Math.floor(xpRoll * 4);
  const hero = { ...run.hero, gold: run.hero.gold + gold, xp: run.hero.xp + xp };
  let offers: Item[];
  [run, offers] = rollOffers({ ...run, hero }, 3);
  run = withLog(
    {
      ...run,
      hero,
      phase: "reward",
      reward: offers,
      combat: run.combat ? { ...run.combat, outcome: "win", enemy: { ...enemy, hp: 0 } } : null,
    },
    `${enemy.name} cai. +${gold} ouro, +${xp} exp.`,
  );
  fx.push({ sfx: enemy.boss ? "win" : "coin", delay: 280 });
  return { run, fx };
}

function enemyTurn(run: Run, fx: Fx[]): Step {
  const combat = run.combat;
  if (!combat) return { run, fx };
  const openedGuarding = combat.playerGuarding;
  const enemy = combat.enemy;
  const stats = derived(run.hero, combat.atkBuff);
  if (enemy.intent === "guarda") {
    const healed = Math.max(2, Math.round(enemy.maxHp * 0.08));
    const hp = Math.min(enemy.maxHp, enemy.hp + healed);
    const gained = hp - enemy.hp;
    run = {
      ...run,
      combat: { ...combat, enemy: { ...enemy, hp, guarding: true } },
    };
    run = withLog(run, `${enemy.name} se guarda e recupera ${gained}.`);
    fx.push({
      sfx: "guard",
      swing: "enemy",
      float: { text: `+${gained}`, kind: "heal", side: "enemy" },
      delay: 360,
    });
  } else {
    let variance = 0;
    [run, variance] = take(run);
    const heavy = enemy.intent === "investida";
    let dmg = computeDamage(enemy.atk, stats.def, variance, {
      guard: combat.playerGuarding,
      heavy,
      pierce: false,
      crit: false,
      power: heavy ? 1.42 : 1,
    });
    dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.22, stats.spd * 0.015))));
    const hp = run.hero.stats.hp - dmg;
    run = {
      ...run,
      hero: { ...run.hero, stats: { ...run.hero.stats, hp: Math.max(0, hp) } },
      combat: { ...run.combat!, playerGuarding: false },
    };
    run = withLog(run, `${enemy.name} ${heavy ? "investe" : "golpeia"} e tira ${dmg}.`);
    fx.push({
      sfx: "hurt",
      shake: heavy ? 2 : 1,
      flash: "player",
      swing: "enemy",
      float: { text: `${dmg}`, kind: "dmg", side: "player" },
      delay: 360,
    });
    if (hp <= 0) {
      run = withLog(run, "A masmorra fecha.");
      run = { ...run, phase: "dead", combat: { ...run.combat!, outcome: "lose" } };
      fx.push({ sfx: "lose", delay: 640 });
      return { run, fx };
    }
  }
  const after = derived(run.hero, 0);
  const regen = openedGuarding ? 4 : 2;
  const vigor = Math.min(after.maxVigor, run.hero.stats.vigor + regen);
  let intent: Intent;
  [run, intent] = nextIntent(run, enemy.boss);
  run = {
    ...run,
    hero: { ...run.hero, stats: { ...run.hero.stats, vigor } },
    combat: {
      ...run.combat!,
      playerGuarding: false,
      turn: run.combat!.turn + 1,
      enemy: { ...run.combat!.enemy, intent },
    },
  };
  return { run, fx };
}

export function playerAction(run: Run, action: Action): Step {
  if (run.phase !== "combat" || !run.combat || run.combat.outcome) return { run, fx: [] };
  const fx: Fx[] = [];
  const cls = CLASSES[run.hero.classId];
  const stats = derived(run.hero, run.combat.atkBuff);

  if (action === "potion") {
    if (run.hero.potions <= 0) return { run, fx: [] };
    const heal = Math.max(8, Math.round(stats.maxHp * 0.38));
    const hp = Math.min(stats.maxHp, run.hero.stats.hp + heal);
    const gained = hp - run.hero.stats.hp;
    run = {
      ...run,
      hero: {
        ...run.hero,
        potions: run.hero.potions - 1,
        stats: { ...run.hero.stats, hp },
      },
    };
    run = withLog(run, `A poção devolve ${gained} de vida.`);
    fx.push({ sfx: "heal", float: { text: `+${gained}`, kind: "heal", side: "player" }, delay: 0 });
    return enemyTurn(run, fx);
  }

  if (action === "guard") {
    run = {
      ...run,
      combat: { ...run.combat, playerGuarding: true },
    };
    run = withLog(run, "Você fecha a guarda.");
    fx.push({ sfx: "guard", swing: "player", delay: 0 });
    return enemyTurn(run, fx);
  }

  if (action === "skill" && run.hero.stats.vigor < cls.cost) return { run, fx: [] };

  if (action === "skill" && run.hero.classId === "devoto") {
    const heal = Math.max(6, Math.round(stats.maxHp * 0.28));
    const hp = Math.min(stats.maxHp, run.hero.stats.hp + heal);
    const gained = hp - run.hero.stats.hp;
    run = {
      ...run,
      hero: {
        ...run.hero,
        stats: { ...run.hero.stats, hp, vigor: run.hero.stats.vigor - cls.cost },
      },
      combat: { ...run.combat, atkBuff: 2 },
    };
    run = withLog(run, `A vela acende. +${gained} de vida, e o próximo golpe pesa mais.`);
    fx.push({
      sfx: "skill",
      swing: "player",
      float: { text: `+${gained}`, kind: "heal", side: "player" },
      delay: 0,
    });
    return enemyTurn(run, fx);
  }

  const skill = action === "skill";
  const combatNow = run.combat;
  if (!combatNow) return { run, fx: [] };
  let power = 1;
  let pierce = false;
  let critBonus = 0;
  if (skill && run.hero.classId === "espadachim") power = 1.28;
  if (skill && run.hero.classId === "arcanista") {
    power = 1.38;
    pierce = true;
  }
  if (skill && run.hero.classId === "sombra") {
    if (!combatNow.enemy.guarding) {
      power = 1.18;
      critBonus = 0.45;
    } else {
      power = 0.72;
    }
  }
  let variance = 0;
  let critRoll = 0;
  [run, variance] = take(run);
  [run, critRoll] = take(run);
  const crit = critRoll < 0.05 + stats.luck * 0.012 + critBonus;
  const dmg = computeDamage(stats.atk, combatNow.enemy.def, variance, {
    guard: combatNow.enemy.guarding,
    heavy: false,
    pierce,
    crit,
    power,
  });
  const enemyHp = combatNow.enemy.hp - dmg;
  const atkBuff = combatNow.atkBuff > 0 ? combatNow.atkBuff - 1 : 0;
  const guarding = skill && run.hero.classId === "espadachim" ? true : combatNow.playerGuarding;
  run = {
    ...run,
    hero: {
      ...run.hero,
      stats: {
        ...run.hero.stats,
        vigor: run.hero.stats.vigor - (skill ? cls.cost : 0),
      },
    },
    combat: {
      ...combatNow,
      atkBuff,
      playerGuarding: guarding,
      enemy: { ...combatNow.enemy, hp: Math.max(0, enemyHp), guarding: false },
    },
  };
  const verb = skill ? cls.skill : "Golpe";
  run = withLog(run, crit ? `${verb} crítico: ${dmg}.` : `${verb} acerta ${dmg}.`);
  fx.push({
    sfx: crit ? "crit" : skill ? "skill" : "hit",
    shake: crit ? 2 : 1,
    flash: "enemy",
    swing: "player",
    float: { text: crit ? `${dmg}!` : `${dmg}`, kind: crit ? "crit" : "dmg", side: "enemy" },
    delay: 0,
  });
  if (enemyHp <= 0) return winCombat(run, fx);
  return enemyTurn(run, fx);
}

export function equip(hero: Hero, item: Item): Hero {
  const before = derived(hero, 0);
  const prev = hero.gear[item.slot];
  const gear = { ...hero.gear, [item.slot]: item };
  const next: Hero = { ...hero, gear, gold: hero.gold + (prev ? 8 : 0) };
  const after = derived(next, 0);
  const hp = Math.min(after.maxHp, hero.stats.hp + Math.max(0, after.maxHp - before.maxHp));
  const vigor = Math.min(
    after.maxVigor,
    hero.stats.vigor + Math.max(0, after.maxVigor - before.maxVigor),
  );
  return { ...next, stats: { ...hero.stats, hp, vigor } };
}

export function pickReward(run: Run, itemId: string): Step {
  if (run.phase !== "reward" || !run.reward) return { run, fx: [] };
  const item = run.reward.find((entry) => entry.id === itemId);
  if (!item) return { run, fx: [] };
  const hero = equip(run.hero, item);
  const next = finishRoom(
    { ...run, hero, reward: null },
    `${item.name} fica com você.${hero.gold > run.hero.gold ? " O equipamento velho virou 8 de ouro." : ""}`,
  );
  return { run: next, fx: [{ sfx: "coin", delay: 0 }] };
}

export function pickLevel(run: Run, offerId: string): Step {
  if (run.phase !== "levelup" || !run.levelOffers) return { run, fx: [] };
  const offer = run.levelOffers.find((entry) => entry.id === offerId);
  if (!offer) return { run, fx: [] };
  const need = run.hero.level * XP_STEP;
  const stats: Stats = { ...run.hero.stats };
  if (offer.stat === "hp") {
    stats.maxHp += 10;
    stats.hp += 10;
  } else if (offer.stat === "atk") stats.atk += 2;
  else if (offer.stat === "def") stats.def += 2;
  else if (offer.stat === "luck") stats.luck += 2;
  else if (offer.stat === "vigor") {
    stats.maxVigor += 4;
    stats.vigor += 4;
  } else stats.spd += 2;
  const level = run.hero.level + 1;
  const xp = run.hero.xp - need;
  let hero: Hero = { ...run.hero, level, xp, stats };
  run = withLog({ ...run, hero }, `${offer.title}. Agora você é nível ${level}.`);
  if (hero.xp >= level * XP_STEP) {
    let offers: LevelOffer[];
    [run, offers] = rollLevelOffers(run);
    return {
      run: { ...run, hero, phase: "levelup", levelOffers: offers },
      fx: [{ sfx: "skill", delay: 0 }],
    };
  }
  const queued = run.queued ?? "map";
  return {
    run: { ...run, hero, phase: queued, queued: null, levelOffers: null },
    fx: [{ sfx: "skill", delay: 0 }],
  };
}

function hurt(run: Run, amount: number, line: string, spare: boolean): { run: Run; died: boolean } {
  let hp = run.hero.stats.hp - amount;
  if (spare) hp = Math.max(1, hp);
  run = {
    ...run,
    hero: { ...run.hero, stats: { ...run.hero.stats, hp: Math.max(0, hp) } },
  };
  run = withLog(run, line);
  if (hp <= 0) return { run: { ...run, phase: "dead" }, died: true };
  return { run, died: false };
}

function openChest(run: Run): Step {
  let n = 0;
  [run, n] = take(run);
  if (n < 0.2) {
    run = startCombat(run, "fight", true);
    return { run, fx: [{ sfx: "hurt", shake: 1, delay: 0 }] };
  }
  let goldRoll = 0;
  [run, goldRoll] = take(run);
  let found: Item[] = [];
  [run, found] = rollOffers(run, 1);
  const item = found[0];
  if (!item) return { run, fx: [] };
  const gold = 14 + Math.floor(goldRoll * 18);
  const hero = equip({ ...run.hero, gold: run.hero.gold + gold }, item);
  run = withLog({ ...run, hero }, `No baú: ${item.name} e ${gold} de ouro.`);
  return {
    run: finishRoom(run, `${item.name} e ${gold} de ouro saem do baú.`),
    fx: [{ sfx: "coin", delay: 0 }],
  };
}

function makeEvent(run: Run, kind: EventState["kind"]): [Run, EventState] {
  const room = run.rooms[run.index];
  if (kind === "trap") {
    let n = 0;
    [run, n] = take(run);
    const luck = derived(run.hero, 0).luck;
    const chance = Math.min(0.88, 0.4 + luck * 0.04);
    return [
      run,
      {
        kind,
        title: room?.title ?? "Armadilha",
        text: room?.blurb ?? "O chão sabe o seu peso.",
        disarmOk: n < chance,
      },
    ];
  }
  if (kind === "merchant") {
    let n = 0;
    let priceRoll = 0;
    [run, n] = take(run);
    [run, priceRoll] = take(run);
    const item = pick(ITEMS, n);
    const itemPrice = 16 + Math.floor(priceRoll * 12) + Math.abs(item.mods.atk ?? 0) * 3 + Math.abs(item.mods.def ?? 0) * 3;
    return [
      run,
      {
        kind,
        title: room?.title ?? "Mercador",
        text: "Ele não pergunta o seu nome. Só olha para a bolsa.",
        merchant: { potionPrice: 18, item, itemPrice, bought: false },
      },
    ];
  }
  return [
    run,
    {
      kind,
      title: room?.title ?? "Sala",
      text: room?.blurb ?? "",
    },
  ];
}

export function enterRoom(run: Run): Step {
  if (run.phase !== "map") return { run, fx: [] };
  const room = run.rooms[run.index];
  if (!room || room.resolved) return { run, fx: [] };
  if (room.kind === "fight" || room.kind === "elite" || room.kind === "boss") {
    return { run: startCombat(run, room.kind), fx: [{ sfx: "ui", delay: 0 }] };
  }
  if (room.kind === "chest") return openChest(run);
  if (room.kind === "shrine" || room.kind === "rest" || room.kind === "trap" || room.kind === "merchant") {
    let event: EventState;
    [run, event] = makeEvent(run, room.kind);
    return { run: { ...run, phase: "event", event, banner: "" }, fx: [{ sfx: "ui", delay: 0 }] };
  }
  return { run, fx: [] };
}

export function shrineChoice(run: Run, id: "blood" | "pray" | "well"): Step {
  if (run.phase !== "event" || run.event?.kind !== "shrine") return { run, fx: [] };
  const stats = derived(run.hero, 0);
  if (id === "blood") {
    const nextStats: Stats = {
      ...run.hero.stats,
      atk: run.hero.stats.atk + 2,
      maxHp: Math.max(16, run.hero.stats.maxHp - 6),
    };
    nextStats.hp = Math.max(1, Math.min(run.hero.stats.hp, nextStats.maxHp) - 4);
    run = withLog(
      { ...run, hero: { ...run.hero, stats: nextStats } },
      "O pacto aceita: +2 de ataque, e a vida máxima encolhe.",
    );
    return { run: finishRoom(run, "O altar bebeu um pouco e devolveu força."), fx: [{ sfx: "skill", delay: 0 }] };
  }
  if (id === "pray") {
    const heal = Math.round(stats.maxHp * 0.5);
    const hp = Math.min(stats.maxHp, run.hero.stats.hp + heal);
    const gained = hp - run.hero.stats.hp;
    run = withLog(
      { ...run, hero: { ...run.hero, stats: { ...run.hero.stats, hp } } },
      `A prece devolve ${gained} de vida.`,
    );
    return { run: finishRoom(run, `A vela segura. +${gained} de vida.`), fx: [{ sfx: "heal", delay: 0 }] };
  }
  if (run.hero.gold < 8) return { run, fx: [] };
  const paid = Math.min(15, run.hero.gold);
  run = withLog(
    {
      ...run,
      hero: {
        ...run.hero,
        gold: run.hero.gold - paid,
        stats: { ...run.hero.stats, luck: run.hero.stats.luck + 3 },
      },
    },
    `Você deixa ${paid} de ouro no poço. A sorte sobe.`,
  );
  return { run: finishRoom(run, "A moeda não faz barulho ao cair."), fx: [{ sfx: "coin", delay: 0 }] };
}

export function restChoice(run: Run, id: "sleep" | "meditate" | "whet"): Step {
  if (run.phase !== "event" || run.event?.kind !== "rest") return { run, fx: [] };
  const stats = derived(run.hero, 0);
  if (id === "sleep") {
    const heal = Math.round(stats.maxHp * 0.45);
    const hp = Math.min(stats.maxHp, run.hero.stats.hp + heal);
    const gained = hp - run.hero.stats.hp;
    run = withLog(
      { ...run, hero: { ...run.hero, stats: { ...run.hero.stats, hp } } },
      `O nicho devolve ${gained} de vida.`,
    );
    return { run: finishRoom(run, `Você dorme mal e acorda inteiro. +${gained}.`), fx: [{ sfx: "heal", delay: 0 }] };
  }
  if (id === "meditate") {
    run = withLog(
      {
        ...run,
        hero: {
          ...run.hero,
          stats: {
            ...run.hero.stats,
            maxVigor: run.hero.stats.maxVigor + 3,
            vigor: run.hero.stats.vigor + 3,
          },
        },
      },
      "A meditação abre mais vigor.",
    );
    return { run: finishRoom(run, "+3 de vigor máximo."), fx: [{ sfx: "skill", delay: 0 }] };
  }
  run = withLog(
    { ...run, hero: { ...run.hero, stats: { ...run.hero.stats, atk: run.hero.stats.atk + 1 } } },
    "Você afia o que tem. +1 de ataque.",
  );
  return { run: finishRoom(run, "O fio fica um pouco mais honesto."), fx: [{ sfx: "ui", delay: 0 }] };
}

export function trapChoice(run: Run, id: "disarm" | "cross" | "back"): Step {
  if (run.phase !== "event" || run.event?.kind !== "trap") return { run, fx: [] };
  if (id === "disarm") {
    if (run.event.disarmOk) {
      run = withLog(run, "O mecanismo cede. Você passa ileso.");
      return { run: finishRoom(run, "Armadilha desarmada."), fx: [{ sfx: "ui", delay: 0 }] };
    }
    const hit = hurt(run, 9, "O mecanismo dispara. 9 de dano.", false);
    if (hit.died) return { run: hit.run, fx: [{ sfx: "lose", shake: 2, delay: 0 }] };
    return { run: finishRoom(hit.run, "Doeu, mas o corredor acabou."), fx: [{ sfx: "hurt", shake: 1, delay: 0 }] };
  }
  if (id === "cross") {
    const hit = hurt(run, 7, "Você atravessa no meio do clique. 7 de dano.", false);
    if (hit.died) return { run: hit.run, fx: [{ sfx: "lose", shake: 2, delay: 0 }] };
    return { run: finishRoom(hit.run, "Você passa sangrando um pouco."), fx: [{ sfx: "hurt", shake: 1, delay: 0 }] };
  }
  if (run.hero.gold >= 10) {
    run = withLog(
      { ...run, hero: { ...run.hero, gold: run.hero.gold - 10 } },
      "Você recua e deixa 10 de ouro no mecanismo, como quem suborna uma porta.",
    );
    return { run: finishRoom(run, "A armadilha fica com o ouro."), fx: [{ sfx: "coin", delay: 0 }] };
  }
  const hit = hurt(run, 5, "Sem ouro para recuar limpo. 5 de dano, e você segue.", true);
  if (hit.died) return { run: hit.run, fx: [{ sfx: "lose", delay: 0 }] };
  return { run: finishRoom(hit.run, "A retirada sai cara no corpo, não na bolsa."), fx: [{ sfx: "hurt", delay: 0 }] };
}

export function buyPotion(run: Run): Step {
  const shop = run.event?.merchant;
  if (run.phase !== "event" || !shop) return { run, fx: [] };
  const stats = derived(run.hero, 0);
  if (run.hero.gold < shop.potionPrice || run.hero.potions >= 5) return { run, fx: [] };
  const hero = {
    ...run.hero,
    gold: run.hero.gold - shop.potionPrice,
    potions: run.hero.potions + 1,
    stats: { ...run.hero.stats, hp: Math.min(stats.maxHp, run.hero.stats.hp) },
  };
  run = withLog({ ...run, hero }, "Uma poção a mais no cinto.");
  return { run, fx: [{ sfx: "coin", delay: 0 }] };
}

export function buyGear(run: Run): Step {
  const shop = run.event?.merchant;
  if (run.phase !== "event" || !shop || shop.bought) return { run, fx: [] };
  if (run.hero.gold < shop.itemPrice) return { run, fx: [] };
  const hero = equip({ ...run.hero, gold: run.hero.gold - shop.itemPrice }, shop.item);
  run = withLog(
    {
      ...run,
      hero,
      event: { ...run.event!, merchant: { ...shop, bought: true } },
    },
    `${shop.item.name} troca de mão.`,
  );
  return { run, fx: [{ sfx: "coin", delay: 0 }] };
}

export function leaveShop(run: Run): Step {
  if (run.phase !== "event" || run.event?.kind !== "merchant") return { run, fx: [] };
  return { run: finishRoom(run, "O mercador já não está olhando."), fx: [{ sfx: "ui", delay: 0 }] };
}

export function isRun(value: unknown): value is Run {
  if (!value || typeof value !== "object") return false;
  const run = value as Run;
  return run.version === 1 && !!run.hero && !!run.rooms && typeof run.phase === "string";
}

export function classArt(id: ClassId): string {
  return CLASSES[id].art;
}
