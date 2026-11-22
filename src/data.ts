// Dietas da nutricionista (pesos do alimento pronto) + conversão para o que comprar.

export type Person = "davi" | "irys";
export const PEOPLE: { id: Person; name: string }[] = [
  { id: "davi", name: "Davi" },
  { id: "irys", name: "Irys" },
];

export type IngId =
  | "ovos" | "frango" | "carneMoida" | "carneAssar" | "peixe" | "bisteca"
  | "sardinha" | "atum"
  | "paoFrances" | "paoForma" | "goma" | "flocao" | "inhame" | "batataDoce" | "macaxeira"
  | "requeijao" | "leite" | "arroz" | "batata" | "feijaoVerde" | "feijaoCarioca" | "maracuja"
  | "mamao" | "sementes" | "castanha" | "chocolate" | "whey" | "banana" | "pastaAmendoim" | "kiwi";

export type Section = "Açougue e peixaria" | "Hortifrúti e feira" | "Padaria" | "Frios e laticínios" | "Mercearia";

export interface Ingredient {
  id: IngId;
  name: string;
  section: Section;
  /** quantidade total (unidade base) → texto principal + detalhe de embalagem */
  format: (q: number) => { main: string; detail?: string };
  copy: (q: number) => string;
}

const kgText = (g: number) => {
  const v = Math.ceil(g / 100) / 10; // arredonda pra cima em 100 g
  return v < 1 ? `${Math.round(v * 1000)} g` : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
};
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** ingrediente vendido a peso (g → kg) */
const byWeight = (id: IngId, name: string, section: Section, detail?: string): Ingredient => ({
  id, name, section,
  format: (g) => ({ main: kgText(g), detail }),
  copy: (g) => `${name}: ${kgText(g)}`,
});
/** ingrediente contado em unidades */
const byUnit = (id: IngId, name: string, section: Section, s: string, p: string, detail?: string): Ingredient => ({
  id, name, section,
  format: (n) => ({ main: plural(Math.ceil(n), s, p), detail }),
  copy: (n) => `${name}: ${plural(Math.ceil(n), s, p)}`,
});
/** ingrediente em embalagem: qty em g/ml, pack = tamanho da embalagem */
const byPack = (id: IngId, name: string, section: Section, pack: number, unit: string, packS: string, packP: string, extra = ""): Ingredient => ({
  id, name, section,
  format: (q) => ({
    main: plural(Math.ceil(q / pack), packS, packP),
    detail: `${Math.round(q)} ${unit} (${packS} de ${pack} ${unit})${extra}`,
  }),
  copy: (q) => `${name}: ${plural(Math.ceil(q / pack), packS, packP)} de ${pack} ${unit}`,
});

export const INGREDIENTS: Record<IngId, Ingredient> = {
  frango: byWeight("frango", "Peito de frango (sem osso)", "Açougue e peixaria", "peso cru; cozido perde uns 25%"),
  carneAssar: byWeight("carneAssar", "Carne bovina para assar", "Açougue e peixaria", "peso cru; assada perde uns 30%"),
  carneMoida: byWeight("carneMoida", "Carne moída", "Açougue e peixaria", "peso cru"),
  peixe: byWeight("peixe", "Filé de peixe", "Açougue e peixaria", "peso cru"),
  bisteca: byWeight("bisteca", "Bisteca de porco", "Açougue e peixaria", "peso cru, com osso"),

  batata: byWeight("batata", "Batata inglesa", "Hortifrúti e feira", "pro purê"),
  feijaoVerde: byWeight("feijaoVerde", "Feijão verde debulhado", "Hortifrúti e feira", "dá pra congelar em porções"),
  inhame: byWeight("inhame", "Inhame", "Hortifrúti e feira", "com casca"),
  batataDoce: byWeight("batataDoce", "Batata doce", "Hortifrúti e feira", "com casca"),
  macaxeira: byWeight("macaxeira", "Macaxeira", "Hortifrúti e feira", "com casca"),
  mamao: byWeight("mamao", "Mamão", "Hortifrúti e feira", "1 fatia média (170 g) por café"),
  maracuja: {
    id: "maracuja", name: "Maracujá", section: "Hortifrúti e feira",
    format: (n) => {
      const u = Math.ceil(n);
      return { main: plural(u, "unidade", "unidades"), detail: `ou ${plural(u, "polpa", "polpas")} congeladas de 100 g` };
    },
    copy: (n) => `Maracujá: ${Math.ceil(n)} un (ou ${Math.ceil(n)} polpas de 100 g)`,
  },
  banana: byUnit("banana", "Banana", "Hortifrúti e feira", "unidade", "unidades", "média"),
  kiwi: byUnit("kiwi", "Kiwi", "Hortifrúti e feira", "unidade", "unidades", "médio"),

  paoFrances: byUnit("paoFrances", "Pão francês", "Padaria", "unidade", "unidades", "compre a cada 2–3 dias ou congele"),
  paoForma: {
    id: "paoForma", name: "Pão de forma integral", section: "Padaria",
    format: (f) => {
      const fatias = Math.ceil(f);
      return { main: plural(Math.ceil(fatias / 20), "pacote", "pacotes"), detail: `${fatias} fatias (pacote de ~20)` };
    },
    copy: (f) => `Pão de forma integral: ${Math.ceil(Math.ceil(f) / 20)} pct (${Math.ceil(f)} fatias)`,
  },

  requeijao: byPack("requeijao", "Requeijão", "Frios e laticínios", 200, "g", "copo", "copos"),
  leite: byPack("leite", "Leite desnatado UHT", "Frios e laticínios", 1000, "ml", "caixa", "caixas"),

  ovos: {
    id: "ovos", name: "Ovos", section: "Mercearia",
    format: (n) => {
      const u = Math.ceil(n);
      const bandejas = Math.ceil(u / 30);
      return { main: plural(u, "ovo", "ovos"), detail: u > 12 ? plural(bandejas, "bandeja de 30", "bandejas de 30") : `${Math.ceil(u / 12)} dúzia` };
    },
    copy: (n) => `Ovos: ${Math.ceil(n)} un`,
  },
  goma: byPack("goma", "Goma de tapioca", "Mercearia", 500, "g", "pacote", "pacotes"),
  flocao: byPack("flocao", "Flocão de milho", "Mercearia", 500, "g", "pacote", "pacotes", ", peso seco"),
  arroz: {
    id: "arroz", name: "Arroz", section: "Mercearia",
    format: (g) => ({ main: `${Math.round(g)} g cru`, detail: plural(Math.ceil(g / 1000), "pacote de 1 kg", "pacotes de 1 kg") }),
    copy: (g) => `Arroz: ${Math.round(g)} g cru (pct de 1 kg)`,
  },
  feijaoCarioca: {
    id: "feijaoCarioca", name: "Feijão carioca", section: "Mercearia",
    format: (g) => ({ main: `${Math.round(g)} g cru`, detail: "pacote de 1 kg dura bastante" }),
    copy: (g) => `Feijão carioca: ${Math.round(g)} g cru`,
  },
  sardinha: {
    id: "sardinha", name: "Sardinha em conserva (óleo)", section: "Mercearia",
    format: (latas) => ({ main: plural(Math.ceil(latas), "lata pequena", "latas pequenas"), detail: "½ lata por café" }),
    copy: (latas) => `Sardinha em conserva: ${plural(Math.ceil(latas), "lata pequena", "latas pequenas")}`,
  },
  atum: byPack("atum", "Atum em conserva (óleo)", "Mercearia", 120, "g", "lata", "latas", " — lata de 170 g rende ~120 g drenado"),
  castanha: {
    id: "castanha", name: "Castanha de caju", section: "Mercearia",
    format: (g) => ({ main: `${Math.round(g)} g`, detail: "8 unidades por café" }),
    copy: (g) => `Castanha de caju: ${Math.round(g)} g`,
  },
  sementes: {
    id: "sementes", name: "Mix de sementes", section: "Mercearia",
    format: (n) => ({ main: "a gosto", detail: `pra ${Math.ceil(n)} cafés · chia, gergelim, linhaça, abóbora ou girassol` }),
    copy: () => "Mix de sementes (chia, gergelim, linhaça, abóbora, girassol): a gosto",
  },
  chocolate: byPack("chocolate", "Chocolate amargo 70%", "Mercearia", 100, "g", "barra", "barras", ", 3 quadrados por almoço"),
  whey: {
    id: "whey", name: "Whey protein", section: "Mercearia",
    format: (g) => ({ main: `${Math.round(g)} g`, detail: "1 medidor por lanche; confira o pote" }),
    copy: (g) => `Whey protein: ${Math.round(g)} g`,
  },
  pastaAmendoim: {
    id: "pastaAmendoim", name: "Pasta de amendoim", section: "Mercearia",
    format: (g) => ({ main: `${Math.round(g)} g`, detail: "1 colher de sopa por lanche; confira o pote" }),
    copy: (g) => `Pasta de amendoim: ${Math.round(g)} g`,
  },
};

export const SECTIONS: Section[] = ["Açougue e peixaria", "Hortifrúti e feira", "Padaria", "Frios e laticínios", "Mercearia"];

// Fatores pronto → cru (aproximados)
export const FACTORS = {
  frango: 1.35, carneAssada: 1.45, carneMoida: 1.35, peixe: 1.25, bisteca: 1.5,
  inhame: 1.15, batataDoce: 1.1, macaxeira: 1.15, cuscuz: 0.5, arroz: 0.4, feijaoCarioca: 0.4,
};
const F = FACTORS;

type Use = { ing: IngId; qty: number };
export interface Portion {
  portion: string;
  uses: Use[];
}
export interface Option {
  id: string;
  name: string;
  davi?: Portion;
  irys?: Portion;
}
export interface Slot {
  id: string;
  label: string;
  /** opções na ordem da dieta; a primeira que a pessoa tem é a principal dela */
  options: Option[];
}
export interface Meal {
  id: string;
  name: string;
  short: string;
  slots: Slot[];
  freeText?: string; // itens "à vontade" sem quantidade
}

const p = (portion: string, ...uses: Use[]): Portion => ({ portion, uses });
const u = (ing: IngId, qty: number): Use => ({ ing, qty });

export const MEALS: Meal[] = [
  {
    id: "cafe", name: "Café da manhã", short: "Café",
    slots: [
      {
        id: "prot", label: "Proteína", options: [
          { id: "ovos", name: "Ovos mexidos", davi: p("4 médios · 180 g", u("ovos", 4)), irys: p("2 médios · 90 g", u("ovos", 2)) },
          { id: "frangoDesf", name: "Frango desfiado", davi: p("60 g", u("frango", 60 * F.frango)), irys: p("30 g", u("frango", 30 * F.frango)) },
          { id: "carneMoida", name: "Carne moída refogada", davi: p("80 g", u("carneMoida", 80 * F.carneMoida)), irys: p("40 g", u("carneMoida", 40 * F.carneMoida)) },
          { id: "sardinha", name: "Sardinha em conserva", irys: p("½ lata pequena · 50 g", u("sardinha", 0.5)) },
          { id: "atum", name: "Atum em conserva", irys: p("3 col. sopa cheias · 48 g", u("atum", 48)) },
        ],
      },
      {
        id: "carb", label: "Carboidrato", options: [
          { id: "paoFrances", name: "Pão francês", davi: p("2 un · 100 g", u("paoFrances", 2)), irys: p("1 un · 50 g", u("paoFrances", 1)) },
          { id: "goma", name: "Goma de tapioca", davi: p("5,3 col. sopa rasas · 80 g", u("goma", 80)), irys: p("2,7 col. sopa rasas · 40 g", u("goma", 40)) },
          { id: "inhame", name: "Inhame", davi: p("280 g", u("inhame", 280 * F.inhame)), irys: p("140 g", u("inhame", 140 * F.inhame)) },
          { id: "paoForma", name: "Pão de forma integral", davi: p("4,7 fatias · 116,7 g", u("paoForma", 4.7)), irys: p("2,3 fatias · 58,3 g", u("paoForma", 2.3)) },
          { id: "cuscuz", name: "Cuscuz", davi: p("226,7 g", u("flocao", 226.7 * F.cuscuz)), irys: p("113,3 g", u("flocao", 113.3 * F.cuscuz)) },
          { id: "batataDoce", name: "Batata doce", irys: p("100 g", u("batataDoce", 100 * F.batataDoce)) },
          { id: "macaxeira", name: "Macaxeira", irys: p("100 g", u("macaxeira", 100 * F.macaxeira)) },
        ],
      },
      {
        id: "req", label: "Requeijão", options: [
          { id: "requeijao", name: "Requeijão", davi: p("1 col. sopa cheia · 30 g", u("requeijao", 30)), irys: p("1 col. sopa cheia · 30 g", u("requeijao", 30)) },
        ],
      },
      {
        id: "mamao", label: "Fruta", options: [
          { id: "mamao", name: "Mamão + mix de sementes", irys: p("1 fatia média · 170 g", u("mamao", 170), u("sementes", 1)) },
        ],
      },
      {
        id: "castanha", label: "Castanha", options: [
          { id: "castanha", name: "Castanha de caju", irys: p("8 un · 20 g", u("castanha", 20)) },
        ],
      },
    ],
  },
  {
    id: "almoco", name: "Almoço", short: "Almoço",
    freeText: "Salada crua e/ou legumes no vapor à vontade",
    slots: [
      {
        id: "prot", label: "Proteína", options: [
          { id: "frango", name: "Peito de frango", davi: p("2 filés médios · 200 g", u("frango", 200 * F.frango)), irys: p("2 filés pequenos · 140 g", u("frango", 140 * F.frango)) },
          { id: "peixe", name: "Filé de peixe", davi: p("2 filés grandes · 310 g", u("peixe", 310 * F.peixe)), irys: p("1,4 filé grande · 217 g", u("peixe", 217 * F.peixe)) },
          { id: "carne", name: "Carne assada", davi: p("2 filés pequenos · 190 g", u("carneAssar", 190 * F.carneAssada)), irys: p("1,4 filé pequeno · 133 g", u("carneAssar", 133 * F.carneAssada)) },
          { id: "bisteca", name: "Bisteca de porco", irys: p("1,4 pedaço grande · 154 g", u("bisteca", 154 * F.bisteca)) },
        ],
      },
      {
        id: "arroz", label: "Arroz", options: [
          { id: "arroz", name: "Arroz", davi: p("200 g", u("arroz", 200 * F.arroz)), irys: p("120 g", u("arroz", 120 * F.arroz)) },
        ],
      },
      {
        id: "pure", label: "Purê", options: [
          { id: "pure", name: "Purê de batata inglesa", davi: p("5 col. sopa cheias · 175 g", u("batata", 175)), irys: p("2 col. sopa cheias · 70 g", u("batata", 70)) },
        ],
      },
      {
        id: "feijao", label: "Feijão", options: [
          { id: "feijaoVerde", name: "Feijão verde", davi: p("4 col. de servir · 192 g", u("feijaoVerde", 192)), irys: p("5 col. sopa · 125 g", u("feijaoVerde", 125)) },
          { id: "feijaoCarioca", name: "Feijão carioca", irys: p("1 col. de servir cheia · 35 g", u("feijaoCarioca", 35 * F.feijaoCarioca)) },
        ],
      },
      {
        id: "suco", label: "Suco", options: [
          { id: "suco", name: "Suco natural de maracujá", davi: p("1 copo duplo · 240 ml", u("maracuja", 1)), irys: p("1 copo duplo · 240 ml", u("maracuja", 1)) },
        ],
      },
      {
        id: "chocolate", label: "Sobremesa", options: [
          { id: "chocolate", name: "Chocolate amargo 70%", irys: p("3 quadrados · 25 g", u("chocolate", 25)) },
        ],
      },
    ],
  },
  {
    id: "lanche", name: "Lanche da tarde", short: "Lanche",
    slots: [
      {
        id: "lanche", label: "Lanche", options: [
          { id: "tapioca", name: "Tapioca de frango", davi: p("1 porção · 100 g", u("goma", 60), u("frango", 40 * F.frango)) },
          { id: "sanduiche", name: "Sanduíche de frango", davi: p("1 unidade M · 100 g", u("paoForma", 2), u("frango", 50 * F.frango)) },
        ],
      },
      { id: "whey", label: "Whey", options: [{ id: "whey", name: "Whey protein", irys: p("1 medidor · 30 g", u("whey", 30)) }] },
      { id: "banana", label: "Banana", options: [{ id: "banana", name: "Banana", irys: p("2 médias · 130 g", u("banana", 2)) }] },
      { id: "pasta", label: "Pasta de amendoim", options: [{ id: "pasta", name: "Pasta de amendoim", irys: p("1 col. sopa · 15 g", u("pastaAmendoim", 15)) }] },
      { id: "leite", label: "Leite", options: [{ id: "leite", name: "Leite desnatado", irys: p("1 xícara · 200 ml", u("leite", 200)) }] },
    ],
  },
  {
    id: "jantar", name: "Jantar", short: "Jantar",
    slots: [
      {
        id: "carb", label: "Carboidrato", options: [
          { id: "cuscuz", name: "Cuscuz", davi: p("220 g", u("flocao", 220 * F.cuscuz)), irys: p("100 g", u("flocao", 100 * F.cuscuz)) },
          { id: "goma", name: "Goma de tapioca", davi: p("4,7 col. sopa rasas · 70,7 g", u("goma", 70.7)), irys: p("2,1 col. sopa rasas · 32,1 g", u("goma", 32.1)) },
          { id: "inhame", name: "Inhame", davi: p("267,1 g", u("inhame", 267.1 * F.inhame)), irys: p("121,4 g", u("inhame", 121.4 * F.inhame)) },
          { id: "paoForma", name: "Pão de forma integral", davi: p("4,7 fatias · 117,9 g", u("paoForma", 4.7)), irys: p("2,1 fatias · 53,6 g", u("paoForma", 2.1)) },
          { id: "paoFrances", name: "Pão francês", davi: p("1,6 un · 78,6 g", u("paoFrances", 1.6)), irys: p("0,7 un · 35,7 g", u("paoFrances", 0.7)) },
          { id: "batataDoce", name: "Batata doce", irys: p("78,6 g", u("batataDoce", 78.6 * F.batataDoce)) },
          { id: "macaxeira", name: "Macaxeira", irys: p("85,7 g", u("macaxeira", 85.7 * F.macaxeira)) },
        ],
      },
      {
        id: "prot", label: "Proteína", options: [
          { id: "frango", name: "Peito de frango", davi: p("2 filés médios · 200 g", u("frango", 200 * F.frango)), irys: p("120 g", u("frango", 120 * F.frango)) },
          { id: "carne", name: "Carne assada", davi: p("166,7 g", u("carneAssar", 166.7 * F.carneAssada)), irys: p("100 g", u("carneAssar", 100 * F.carneAssada)) },
          { id: "peixe", name: "Filé de peixe", davi: p("283,3 g", u("peixe", 283.3 * F.peixe)), irys: p("170 g", u("peixe", 170 * F.peixe)) },
        ],
      },
      { id: "kiwi", label: "Fruta", options: [{ id: "kiwi", name: "Kiwi", irys: p("1 médio · 76 g", u("kiwi", 1)) }] },
    ],
  },
];

export const DAYS = [
  { short: "Seg", long: "Segunda" },
  { short: "Ter", long: "Terça" },
  { short: "Qua", long: "Quarta" },
  { short: "Qui", long: "Quinta" },
  { short: "Sex", long: "Sexta" },
  { short: "Sáb", long: "Sábado" },
  { short: "Dom", long: "Domingo" },
];

export const SALAD_SUGGESTIONS = ["Alface", "Tomate", "Pepino", "Cebola", "Cenoura", "Brócolis", "Chuchu", "Abobrinha"];
export const BASICS = ["Alho", "Cebola", "Cheiro-verde", "Limão", "Sal", "Azeite ou óleo", "Leite ou manteiga (purê)"];
