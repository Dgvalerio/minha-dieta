// Dieta da nutricionista (pesos do alimento pronto) + conversão para o que comprar.

export type IngId =
  | "ovos" | "frango" | "carneMoida" | "carneAssar" | "peixe"
  | "paoFrances" | "paoForma" | "goma" | "flocao" | "inhame"
  | "requeijao" | "arroz" | "batata" | "feijaoVerde" | "maracuja";

export type Section = "Açougue e peixaria" | "Hortifrúti e feira" | "Padaria" | "Frios e laticínios" | "Mercearia";

export interface Ingredient {
  id: IngId;
  name: string;
  section: Section;
  /** quantidade total (unidade base) → texto principal + detalhe de embalagem */
  format: (q: number) => { main: string; detail?: string };
  copy: (q: number) => string;
}

const kg = (g: number) => {
  const v = Math.ceil(g / 100) / 10; // arredonda pra cima em 100 g
  return v < 1 ? `${Math.round(v * 1000)} g` : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
};
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export const INGREDIENTS: Record<IngId, Ingredient> = {
  frango: {
    id: "frango", name: "Peito de frango (sem osso)", section: "Açougue e peixaria",
    format: (g) => ({ main: kg(g), detail: "peso cru; cozido perde uns 25%" }),
    copy: (g) => `Peito de frango sem osso: ${kg(g)}`,
  },
  carneAssar: {
    id: "carneAssar", name: "Carne bovina para assar", section: "Açougue e peixaria",
    format: (g) => ({ main: kg(g), detail: "peso cru; assada perde uns 30%" }),
    copy: (g) => `Carne para assar: ${kg(g)}`,
  },
  carneMoida: {
    id: "carneMoida", name: "Carne moída", section: "Açougue e peixaria",
    format: (g) => ({ main: kg(g), detail: "peso cru" }),
    copy: (g) => `Carne moída: ${kg(g)}`,
  },
  peixe: {
    id: "peixe", name: "Filé de peixe", section: "Açougue e peixaria",
    format: (g) => ({ main: kg(g), detail: "peso cru" }),
    copy: (g) => `Filé de peixe: ${kg(g)}`,
  },
  batata: {
    id: "batata", name: "Batata inglesa", section: "Hortifrúti e feira",
    format: (g) => ({ main: kg(g), detail: "pro purê" }),
    copy: (g) => `Batata inglesa: ${kg(g)}`,
  },
  feijaoVerde: {
    id: "feijaoVerde", name: "Feijão verde debulhado", section: "Hortifrúti e feira",
    format: (g) => ({ main: kg(g), detail: "dá pra congelar em porções" }),
    copy: (g) => `Feijão verde debulhado: ${kg(g)}`,
  },
  inhame: {
    id: "inhame", name: "Inhame", section: "Hortifrúti e feira",
    format: (g) => ({ main: kg(g), detail: "com casca" }),
    copy: (g) => `Inhame: ${kg(g)}`,
  },
  maracuja: {
    id: "maracuja", name: "Maracujá", section: "Hortifrúti e feira",
    format: (n) => {
      const u = Math.ceil(n);
      return { main: plural(u, "unidade", "unidades"), detail: `ou ${plural(u, "polpa", "polpas")} congeladas de 100 g` };
    },
    copy: (n) => `Maracujá: ${Math.ceil(n)} un (ou ${Math.ceil(n)} polpas de 100 g)`,
  },
  paoFrances: {
    id: "paoFrances", name: "Pão francês", section: "Padaria",
    format: (n) => ({ main: plural(Math.ceil(n), "unidade", "unidades"), detail: "compre a cada 2–3 dias ou congele" }),
    copy: (n) => `Pão francês: ${Math.ceil(n)} un`,
  },
  paoForma: {
    id: "paoForma", name: "Pão de forma integral", section: "Padaria",
    format: (f) => {
      const fatias = Math.ceil(f);
      const pacotes = Math.ceil(fatias / 20);
      return { main: plural(pacotes, "pacote", "pacotes"), detail: `${fatias} fatias (pacote de ~20)` };
    },
    copy: (f) => `Pão de forma integral: ${Math.ceil(Math.ceil(f) / 20)} pct (${Math.ceil(f)} fatias)`,
  },
  requeijao: {
    id: "requeijao", name: "Requeijão", section: "Frios e laticínios",
    format: (g) => ({ main: plural(Math.ceil(g / 200), "copo", "copos"), detail: `${Math.round(g)} g (copo de 200 g)` }),
    copy: (g) => `Requeijão: ${Math.ceil(g / 200)} copo(s) de 200 g`,
  },
  ovos: {
    id: "ovos", name: "Ovos", section: "Mercearia",
    format: (n) => {
      const u = Math.ceil(n);
      const bandejas = Math.ceil(u / 30);
      return { main: plural(u, "ovo", "ovos"), detail: bandejas === 1 && u > 12 ? "1 bandeja de 30" : `${Math.ceil(u / 12)} dúzia(s)` };
    },
    copy: (n) => `Ovos: ${Math.ceil(n)} un`,
  },
  goma: {
    id: "goma", name: "Goma de tapioca", section: "Mercearia",
    format: (g) => ({ main: plural(Math.ceil(g / 500), "pacote", "pacotes"), detail: `${Math.round(g)} g (pacote de 500 g)` }),
    copy: (g) => `Goma de tapioca: ${Math.ceil(g / 500)} pct de 500 g`,
  },
  flocao: {
    id: "flocao", name: "Flocão de milho", section: "Mercearia",
    format: (g) => ({ main: plural(Math.ceil(g / 500), "pacote", "pacotes"), detail: `${Math.round(g)} g seco (pacote de 500 g)` }),
    copy: (g) => `Flocão de milho: ${Math.ceil(g / 500)} pct de 500 g`,
  },
  arroz: {
    id: "arroz", name: "Arroz", section: "Mercearia",
    format: (g) => ({ main: `${Math.round(g)} g cru`, detail: `${Math.ceil(g / 1000)} pacote de 1 kg` }),
    copy: (g) => `Arroz: ${Math.round(g)} g cru (pct de 1 kg)`,
  },
};

export const SECTIONS: Section[] = ["Açougue e peixaria", "Hortifrúti e feira", "Padaria", "Frios e laticínios", "Mercearia"];

// Fatores pronto → cru (aproximados)
const FRANGO = 1.35, CARNE_ASSADA = 1.45, CARNE_MOIDA = 1.35, PEIXE = 1.25, INHAME = 1.15, CUSCUZ = 0.5, ARROZ = 0.4;

export interface Option {
  id: string;
  name: string;
  portion: string;
  uses: { ing: IngId; qty: number }[];
}
export interface Slot {
  id: string;
  label: string;
  options: Option[]; // options[0] = principal
}
export interface Meal {
  id: string;
  name: string;
  slots: Slot[];
  freeText?: string; // itens "à vontade" sem quantidade
}

export const MEALS: Meal[] = [
  {
    id: "cafe", name: "Café da manhã",
    slots: [
      {
        id: "prot", label: "Proteína", options: [
          { id: "ovos", name: "Ovos mexidos", portion: "4 médios · 180 g", uses: [{ ing: "ovos", qty: 4 }] },
          { id: "frangoDesf", name: "Frango desfiado", portion: "60 g", uses: [{ ing: "frango", qty: 60 * FRANGO }] },
          { id: "carneMoida", name: "Carne moída refogada", portion: "80 g", uses: [{ ing: "carneMoida", qty: 80 * CARNE_MOIDA }] },
        ],
      },
      {
        id: "carb", label: "Carboidrato", options: [
          { id: "paoFrances", name: "Pão francês", portion: "2 un · 100 g", uses: [{ ing: "paoFrances", qty: 2 }] },
          { id: "goma", name: "Goma de tapioca", portion: "5,3 col. sopa rasas · 80 g", uses: [{ ing: "goma", qty: 80 }] },
          { id: "inhame", name: "Inhame", portion: "280 g", uses: [{ ing: "inhame", qty: 280 * INHAME }] },
          { id: "paoForma", name: "Pão de forma integral", portion: "4,7 fatias · 116,7 g", uses: [{ ing: "paoForma", qty: 4.7 }] },
          { id: "cuscuz", name: "Cuscuz", portion: "226,7 g", uses: [{ ing: "flocao", qty: 226.7 * CUSCUZ }] },
        ],
      },
      {
        id: "req", label: "Acompanhamento", options: [
          { id: "requeijao", name: "Requeijão", portion: "1 col. sopa cheia · 30 g", uses: [{ ing: "requeijao", qty: 30 }] },
        ],
      },
    ],
  },
  {
    id: "almoco", name: "Almoço",
    freeText: "Salada crua e/ou legumes no vapor à vontade",
    slots: [
      {
        id: "prot", label: "Proteína", options: [
          { id: "frango", name: "Peito de frango", portion: "2 filés médios · 200 g", uses: [{ ing: "frango", qty: 200 * FRANGO }] },
          { id: "peixe", name: "Filé de peixe", portion: "2 filés grandes · 310 g", uses: [{ ing: "peixe", qty: 310 * PEIXE }] },
          { id: "carne", name: "Carne assada", portion: "2 filés pequenos · 190 g", uses: [{ ing: "carneAssar", qty: 190 * CARNE_ASSADA }] },
        ],
      },
      {
        id: "fixos", label: "Acompanhamentos", options: [
          {
            id: "pratoBase", name: "Arroz, purê, feijão verde e suco",
            portion: "arroz 200 g · purê 175 g · feijão 192 g · suco de maracujá 240 ml",
            uses: [
              { ing: "arroz", qty: 200 * ARROZ },
              { ing: "batata", qty: 175 },
              { ing: "feijaoVerde", qty: 192 },
              { ing: "maracuja", qty: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "lanche", name: "Lanche da tarde",
    slots: [
      {
        id: "lanche", label: "Lanche", options: [
          { id: "tapioca", name: "Tapioca de frango", portion: "1 porção · 100 g", uses: [{ ing: "goma", qty: 60 }, { ing: "frango", qty: 40 * FRANGO }] },
          { id: "sanduiche", name: "Sanduíche de frango", portion: "1 unidade M · 100 g", uses: [{ ing: "paoForma", qty: 2 }, { ing: "frango", qty: 50 * FRANGO }] },
        ],
      },
    ],
  },
  {
    id: "jantar", name: "Jantar",
    slots: [
      {
        id: "carb", label: "Carboidrato", options: [
          { id: "cuscuz", name: "Cuscuz", portion: "220 g", uses: [{ ing: "flocao", qty: 220 * CUSCUZ }] },
          { id: "goma", name: "Goma de tapioca", portion: "4,7 col. sopa rasas · 70,7 g", uses: [{ ing: "goma", qty: 70.7 }] },
          { id: "inhame", name: "Inhame", portion: "267,1 g", uses: [{ ing: "inhame", qty: 267.1 * INHAME }] },
          { id: "paoForma", name: "Pão de forma integral", portion: "4,7 fatias · 117,9 g", uses: [{ ing: "paoForma", qty: 4.7 }] },
          { id: "paoFrances", name: "Pão francês", portion: "1,6 un · 78,6 g", uses: [{ ing: "paoFrances", qty: 1.6 }] },
        ],
      },
      {
        id: "prot", label: "Proteína", options: [
          { id: "frango", name: "Peito de frango", portion: "2 filés médios · 200 g", uses: [{ ing: "frango", qty: 200 * FRANGO }] },
          { id: "carne", name: "Carne assada", portion: "166,7 g", uses: [{ ing: "carneAssar", qty: 166.7 * CARNE_ASSADA }] },
          { id: "peixe", name: "Filé de peixe", portion: "283,3 g", uses: [{ ing: "peixe", qty: 283.3 * PEIXE }] },
        ],
      },
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
