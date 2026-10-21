export type ClassId = "espadachim" | "arcanista" | "sombra" | "devoto";

export type RoomKind =
  | "fight"
  | "elite"
  | "boss"
  | "shrine"
  | "chest"
  | "merchant"
  | "trap"
  | "rest";

export type Phase =
  | "intro"
  | "map"
  | "event"
  | "combat"
  | "reward"
  | "levelup"
  | "dead"
  | "won";

export type Intent = "golpe" | "investida" | "guarda";

export type ModKey = "maxHp" | "maxVigor" | "atk" | "def" | "spd" | "luck";

export type Stats = {
  hp: number;
  maxHp: number;
  vigor: number;
  maxVigor: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
};

export type Item = {
  id: string;
  name: string;
  slot: "weapon" | "armor" | "trinket";
  blurb: string;
  mods: Partial<Record<ModKey, number>>;
};

export type Gear = {
  weapon: Item | null;
  armor: Item | null;
  trinket: Item | null;
};

export type Hero = {
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  gold: number;
  potions: number;
  stats: Stats;
  gear: Gear;
};

export type Room = {
  id: string;
  kind: RoomKind;
  title: string;
  blurb: string;
  resolved: boolean;
};

export type Enemy = {
  id: string;
  name: string;
  art: string;
  flavor: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  guarding: boolean;
  intent: Intent;
  elite: boolean;
  boss: boolean;
};

export type Combat = {
  enemy: Enemy;
  playerGuarding: boolean;
  atkBuff: number;
  log: string[];
  outcome: null | "win" | "lose";
  turn: number;
};

export type MerchantState = {
  potionPrice: number;
  item: Item;
  itemPrice: number;
  bought: boolean;
};

export type EventState = {
  kind: "shrine" | "rest" | "trap" | "merchant";
  title: string;
  text: string;
  disarmOk?: boolean;
  merchant?: MerchantState;
};

export type LevelOffer = {
  id: string;
  title: string;
  detail: string;
  stat: "hp" | "atk" | "def" | "luck" | "vigor" | "spd";
};

export type Run = {
  version: 1;
  seed: string;
  seedNum: number;
  roll: number;
  hero: Hero;
  rooms: Room[];
  index: number;
  phase: Phase;
  banner: string;
  chronicle: string[];
  combat: Combat | null;
  reward: Item[] | null;
  levelOffers: LevelOffer[] | null;
  queued: Phase | null;
  event: EventState | null;
};

export type Action = "strike" | "skill" | "guard" | "potion";

export type SfxKind =
  | "hit"
  | "crit"
  | "heal"
  | "guard"
  | "ui"
  | "win"
  | "lose"
  | "coin"
  | "skill"
  | "hurt";

export type Fx = {
  sfx: SfxKind;
  shake?: 0 | 1 | 2;
  flash?: "player" | "enemy";
  swing?: "player" | "enemy";
  float?: { text: string; kind: "dmg" | "heal" | "crit"; side: "player" | "enemy" };
  delay: number;
};

export type Step = { run: Run; fx: Fx[] };
