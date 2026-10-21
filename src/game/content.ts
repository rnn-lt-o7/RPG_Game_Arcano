import type { ClassId, Item, LevelOffer, ModKey, RoomKind, Stats } from "@/game/types";

export const XP_STEP = 24;

export type ClassDef = {
  id: ClassId;
  label: string;
  blurb: string;
  art: string;
  skill: string;
  skillDetail: string;
  cost: number;
  stats: Stats;
};

const stats = (
  maxHp: number,
  maxVigor: number,
  atk: number,
  def: number,
  spd: number,
  luck: number,
): Stats => ({
  hp: maxHp,
  maxHp,
  vigor: maxVigor,
  maxVigor,
  atk,
  def,
  spd,
  luck,
});

export const CLASSES: Record<ClassId, ClassDef> = {
  espadachim: {
    id: "espadachim",
    label: "Espadachim",
    blurb: "A lâmina chega antes da desculpa.",
    art: "/art/hero-espadachim.jpg",
    skill: "Égide Curta",
    skillDetail: "Golpe forte. Você já entra em guarda contra o revide.",
    cost: 3,
    stats: stats(46, 8, 9, 5, 4, 2),
  },
  arcanista: {
    id: "arcanista",
    label: "Arcanista",
    blurb: "O fogo obedece, mas cobra juros.",
    art: "/art/hero-arcanista.jpg",
    skill: "Brasa Viva",
    skillDetail: "Fogo que ignora quase toda a defesa.",
    cost: 4,
    stats: stats(36, 14, 11, 2, 5, 3),
  },
  sombra: {
    id: "sombra",
    label: "Sombra",
    blurb: "Ninguém lembra o segundo golpe.",
    art: "/art/hero-sombra.jpg",
    skill: "Costela Aberta",
    skillDetail: "Cruel se o alvo não estiver em guarda. Fraco se estiver.",
    cost: 3,
    stats: stats(36, 10, 8, 3, 8, 6),
  },
  devoto: {
    id: "devoto",
    label: "Devoto",
    blurb: "A luz aqui é emprestada. Use com parcimônia.",
    art: "/art/hero-devoto.jpg",
    skill: "Vela Acesa",
    skillDetail: "Cura e deixa seus próximos golpes mais pesados.",
    cost: 4,
    stats: stats(40, 12, 7, 4, 4, 4),
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export const FIRST_NAMES = [
  "Nara",
  "Ivo",
  "Seral",
  "Doma",
  "Kael",
  "Brune",
  "Ossian",
  "Vesna",
  "Tarin",
  "Helo",
  "Marek",
  "Ysolde",
  "Quill",
  "Alden",
  "Rook",
  "Sibila",
  "Noem",
  "Cira",
];

export const LAST_NAMES = [
  "das Cinzas",
  "do Poço",
  "Sem Casa",
  "da Lâmina Fria",
  "do Terceiro Sino",
  "Véu-Curto",
  "de Pedra Murcha",
  "Lanterna Baixa",
  "do Sal Negro",
  "Costela-de-Ouro",
  "do Arco Cego",
  "Pó-de-Altar",
];

export const ITEMS: Item[] = [
  { id: "lamina-brasa", name: "Lâmina de Brasa", slot: "weapon", blurb: "Ainda morna de um dono anterior.", mods: { atk: 3 } },
  { id: "faca-osso", name: "Faca de Osso", slot: "weapon", blurb: "Leve demais para parecer honesta.", mods: { atk: 2, luck: 1 } },
  { id: "montante", name: "Montante Rachada", slot: "weapon", blurb: "O peso discute com o pulso.", mods: { atk: 4, spd: -1 } },
  { id: "agulha", name: "Agulha de Véu", slot: "weapon", blurb: "Entra sem pedir licença.", mods: { atk: 2, spd: 2 } },
  { id: "manto", name: "Manto de Cinza", slot: "armor", blurb: "Cheira a templo fechado.", mods: { def: 3 } },
  { id: "couraca", name: "Couraça de Pregos", slot: "armor", blurb: "Quem abraça se arrepende.", mods: { def: 4, spd: -1 } },
  { id: "colete", name: "Colete Úmido", slot: "armor", blurb: "Desconfortável e teimoso.", mods: { def: 2, maxHp: 8 } },
  { id: "veu", name: "Véu de Coro", slot: "armor", blurb: "Os golpes erram um palmo.", mods: { def: 2, luck: 1 } },
  { id: "olho", name: "Olho de Corvo", slot: "trinket", blurb: "Pisca quando ninguém olha.", mods: { luck: 3 } },
  { id: "lanterna", name: "Lanterna Murcha", slot: "trinket", blurb: "Dá luz ruim e ideias boas.", mods: { maxVigor: 4 } },
  { id: "dedal", name: "Dedal de Santo", slot: "trinket", blurb: "Pequeno demais para o milagre.", mods: { def: 2, luck: 2 } },
  { id: "dentes", name: "Cordão de Dentes", slot: "trinket", blurb: "Cada dente tem um nome riscado.", mods: { atk: 2, luck: 1 } },
  { id: "ampulheta", name: "Ampulheta Quebrada", slot: "trinket", blurb: "O tempo vaza para o seu lado.", mods: { spd: 2, luck: 2 } },
  { id: "carvao", name: "Coração de Carvão", slot: "trinket", blurb: "Bate devagar e quente.", mods: { maxHp: 6, atk: 1 } },
  { id: "anel", name: "Anel de Sal", slot: "trinket", blurb: "Afasta o que é úmido e ruim.", mods: { def: 2, maxHp: 4 } },
  { id: "sinete", name: "Sinete Vazio", slot: "trinket", blurb: "Nenhuma casa responde por ele.", mods: { atk: 3 } },
];

export const LEVEL_OFFERS: LevelOffer[] = [
  { id: "hp", title: "Fôlego fundo", detail: "+10 de vida máxima, e cura o mesmo.", stat: "hp" },
  { id: "atk", title: "Pulso firme", detail: "+2 de ataque.", stat: "atk" },
  { id: "def", title: "Ombro fechado", detail: "+2 de defesa.", stat: "def" },
  { id: "luck", title: "Moeda ao ar", detail: "+2 de sorte.", stat: "luck" },
  { id: "vigor", title: "Segundo fôlego", detail: "+4 de vigor máximo.", stat: "vigor" },
  { id: "spd", title: "Passo curto", detail: "+2 de iniciativa.", stat: "spd" },
];

export const ROOM_COPY: Record<RoomKind, { titles: string[]; blurbs: string[]; verb: string; label: string }> = {
  fight: {
    label: "Combate",
    verb: "Enfrentar",
    titles: ["Emboscada", "Passo de garra", "Porta arranhada", "Corredor quente"],
    blurbs: ["Algo respira do lado de lá.", "Marcas novas no pó.", "A tocha abaixa sem vento."],
  },
  elite: {
    label: "Elite",
    verb: "Enfrentar",
    titles: ["Marca de elite", "Guardião de posto", "Nome riscado"],
    blurbs: ["Este não foi parar aqui por acaso.", "A porta tem um arranhão só, fundo."],
  },
  boss: {
    label: "Chefe",
    verb: "Descer ao poço",
    titles: ["Poço da hidra"],
    blurbs: ["Três sombras para uma coroa."],
  },
  shrine: {
    label: "Altar",
    verb: "Ajoelhar",
    titles: ["Altar sem santo", "Nicho de vela", "Pedra molhada"],
    blurbs: ["Alguém rezou aqui e foi embora no meio.", "A vela acende sozinha. Quase."],
  },
  chest: {
    label: "Baú",
    verb: "Abrir",
    titles: ["Baú entalado", "Cofre de poeira", "Fechadura paciente"],
    blurbs: ["Não está trancado. Isso preocupa.", "O metal está morno."],
  },
  merchant: {
    label: "Mercador",
    verb: "Negociar",
    titles: ["Mercador de cinza", "Banca sem nome"],
    blurbs: ["Ele cobra pouco e sorri demais.", "As moedas dele não fazem barulho."],
  },
  trap: {
    label: "Armadilha",
    verb: "Avançar",
    titles: ["Corredor armado", "Fio no escuro", "Laje solta"],
    blurbs: ["O chão sabe o seu peso.", "Um clique, ainda sem dono."],
  },
  rest: {
    label: "Descanso",
    verb: "Parar",
    titles: ["Nicho de poeira", "Banco quebrado", "Hora morta"],
    blurbs: ["Dá para sentar. Não dá para confiar.", "O ar aqui é menos ruim."],
  },
};

export const MONSTERS = {
  goblin: {
    art: "/art/enemy-goblin.jpg",
    name: "Goblin de cinza",
    flavor: "Pequeno, rápido, convencido de que o elmo ajuda.",
    hp: 18,
    atk: 5,
    def: 1,
    spd: 6,
  },
  hound: {
    art: "/art/enemy-hound.jpg",
    name: "Cão de brasa",
    flavor: "O pelo estala como lenha.",
    hp: 22,
    atk: 6,
    def: 1,
    spd: 8,
  },
  skeleton: {
    art: "/art/enemy-skeleton.jpg",
    name: "Sentinela de osso",
    flavor: "O bronze range. O osso não reclama.",
    hp: 26,
    atk: 7,
    def: 3,
    spd: 3,
  },
  cultist: {
    art: "/art/enemy-cultist.jpg",
    name: "Véu culto",
    flavor: "A máscara não pisca. A faca, sim.",
    hp: 24,
    atk: 8,
    def: 2,
    spd: 5,
  },
  hydra: {
    art: "/art/enemy-hydra.jpg",
    name: "Hidra das Cinzas",
    flavor: "Três cabeças, uma coroa, nenhuma pressa.",
    hp: 48,
    atk: 9,
    def: 3,
    spd: 4,
  },
} as const;

export type MonsterId = keyof typeof MONSTERS;

export const INTENT_META = {
  golpe: { label: "Golpe", hint: "Um ataque comum. Você age antes." },
  investida: { label: "Investida", hint: "Dói mais. Guardar corta quase tudo." },
  guarda: { label: "Guarda", hint: "O próximo golpe seu sai fraco. Ele recupera um pouco." },
} as const;

export const EPITAPHS = [
  "A masmorra guarda o nome por um tempo. Depois esquece.",
  "Nem toda semente germina.",
  "O chão ficou mais quieto.",
  "Faltou um passo, ou sobrou um inimigo.",
];

export const VICTORIES = [
  "A hidra caiu. A semente continua viva em quem contar a história.",
  "Nove salas, um nome, e o poço ficou sem dono.",
  "Você sobe com ouro no bolso e cinza no cabelo.",
];

const MOD_LABEL: Record<ModKey, string> = {
  maxHp: "Vida",
  maxVigor: "Vigor",
  atk: "Ataque",
  def: "Defesa",
  spd: "Iniciativa",
  luck: "Sorte",
};

export function formatMods(mods: Item["mods"]): string {
  return (Object.keys(MOD_LABEL) as ModKey[])
    .filter((key) => mods[key])
    .map((key) => {
      const value = mods[key] ?? 0;
      const sign = value > 0 ? "+" : "";
      return `${sign}${value} ${MOD_LABEL[key]}`;
    })
    .join(" · ");
}

export function slotLabel(slot: Item["slot"]): string {
  if (slot === "weapon") return "Arma";
  if (slot === "armor") return "Armadura";
  return "Relíquia";
}
