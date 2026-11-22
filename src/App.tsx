import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud, CloudOff, Copy, CopyCheck, Leaf, Link2, Loader2, RotateCcw, Repeat, ShoppingBasket, Split, Undo2, UtensilsCrossed,
} from "lucide-react";
import { onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { planDoc } from "@/lib/firebase";
import {
  BASICS, DAYS, FACTORS, INGREDIENTS, MEALS, PEOPLE, SALAD_SUGGESTIONS, SECTIONS,
  type IngId, type Meal, type Option, type Person, type Slot,
} from "./data";
import {
  canSplit, changesInDay, chosen, defaultDay, defaultWeek, isSplit, normalizeWeek, optionsFor, sharedOptions, slotPeople,
  type MealPlan, type WeekPlan,
} from "./plan";

const STORAGE_KEY = "cardapio-semana-v1";

type Saved = { plan: WeekPlan; checked: string[] };
type SyncState = "local" | "loading" | "saving" | "saved" | "offline" | "error";

const SYNC_LABEL: Record<SyncState, string> = {
  local: "Salvo só neste aparelho",
  loading: "Carregando da nuvem…",
  saving: "Salvando…",
  saved: "Salvo na nuvem",
  offline: "Sem conexão, salva quando voltar",
  error: "Erro ao salvar na nuvem",
};

const PERSON_STYLE: Record<Person, { text: string; on: string; dot: string }> = {
  davi: { text: "text-primary", on: "border-primary/40 bg-primary-soft text-primary", dot: "bg-primary" },
  irys: { text: "text-irys", on: "border-irys/40 bg-irys-soft text-irys", dot: "bg-irys" },
};
const personName = (p: Person) => PEOPLE.find((x) => x.id === p)!.name;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const serialize = (plan: WeekPlan, checked: Set<string>) => JSON.stringify({ plan, checked: [...checked].sort() });

function normalize(data: any): Saved | null {
  const plan = normalizeWeek(data?.plan);
  if (!plan) return null;
  return { plan, checked: Array.isArray(data.checked) ? data.checked.filter((x: unknown) => typeof x === "string") : [] };
}
function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function SyncStatus({ state }: { state: SyncState }) {
  const busy = state === "loading" || state === "saving";
  const Icon = busy ? Loader2 : state === "saved" ? Cloud : CloudOff;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        state === "saved" ? "border-primary/30 bg-primary-soft text-primary"
          : state === "error" ? "border-red-500/40 text-red-600 dark:text-red-400"
          : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      {SYNC_LABEL[state]}
    </span>
  );
}

function PersonTag({ p, className }: { p: Person; className?: string }) {
  return <span className={cn("font-semibold", PERSON_STYLE[p].text, className)}>{personName(p)}</span>;
}

/** Botão de opção. `show` diz de quem mostrar a porção. */
function OptionChip({ option, show, selected, principal, onClick }: {
  option: Option; show: Person[]; selected: boolean; principal: boolean; onClick: () => void;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary-soft" : "bg-card hover:bg-muted"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
          selected ? "border-primary bg-primary shadow-[inset_0_0_0_2px_hsl(var(--primary-soft))]" : "border-muted-foreground/50"
        )}
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
          {option.name}
          {principal && <Badge className="bg-accent-soft text-accent-foreground dark:text-accent">principal</Badge>}
        </span>
        {show.map((p) =>
          option[p] ? (
            <span key={p} className="block text-xs text-muted-foreground">
              {show.length > 1 && <PersonTag p={p} className="mr-1" />}
              {option[p]!.portion}
            </span>
          ) : null
        )}
      </span>
    </button>
  );
}

function SlotBlock({ slot, mp, onPick, onIrysPick, onSplit, onJoin }: {
  slot: Slot; mp: MealPlan;
  onPick: (id: string) => void; onIrysPick: (id: string) => void; onSplit: () => void; onJoin: () => void;
}) {
  const people = slotPeople(slot);
  const active = people.filter((p) => mp.on[p]);
  if (active.length === 0) return null;
  const onlyOne = people.length === 1;
  const split = isSplit(mp, slot);

  const heading = (
    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      {slot.label}
      {onlyOne && <span>· só <PersonTag p={people[0]} /></span>}
    </p>
  );

  // Item fixo (uma opção só pra todo mundo que está em casa)
  const shared = sharedOptions(slot);
  if (!split && shared.length === 1) {
    const o = shared[0];
    return (
      <div>
        {heading}
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-sm font-semibold">{o.name}</p>
          {active.map((p) => (
            <p key={p} className="text-xs text-muted-foreground">
              {!onlyOne && <PersonTag p={p} className="mr-1" />}
              {o[p]?.portion}
            </p>
          ))}
        </div>
        {canSplit(slot) && mp.on.irys && (
          <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-irys" onClick={onSplit}>
            <Split /> Irys diferente
          </Button>
        )}
      </div>
    );
  }

  if (split) {
    return (
      <div>
        {heading}
        <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
          {active.map((p) => {
            const own = optionsFor(slot, p);
            const cur = chosen(slot, p, mp);
            return (
              <div key={p} role="radiogroup" aria-label={`${slot.label} de ${personName(p)}`}>
                <p className="mb-1.5 text-xs"><PersonTag p={p} /></p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {own.map((o, i) => (
                    <OptionChip
                      key={o.id}
                      option={o}
                      show={[p]}
                      selected={cur?.id === o.id}
                      principal={i === 0}
                      onClick={() => (p === "irys" ? onIrysPick(o.id) : onPick(o.id))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 h-7 px-2" onClick={onJoin}>
          <Link2 /> Igual pros dois
        </Button>
      </div>
    );
  }

  const cur = chosen(slot, active[0], mp);
  return (
    <div role="radiogroup" aria-label={slot.label}>
      {heading}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shared.map((o, i) => (
          <OptionChip key={o.id} option={o} show={active} selected={cur?.id === o.id} principal={i === 0} onClick={() => onPick(o.id)} />
        ))}
      </div>
      {canSplit(slot) && mp.on.irys && (
        <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-irys" onClick={onSplit}>
          <Split /> Irys diferente
        </Button>
      )}
    </div>
  );
}

export default function App() {
  const saved = useMemo(load, []);
  const [plan, setPlan] = useState<WeekPlan>(saved?.plan ?? defaultWeek());
  const [checked, setChecked] = useState<Set<string>>(new Set(saved?.checked ?? []));
  const [day, setDay] = useState(() => {
    const js = new Date().getDay(); // 0 = domingo
    return js === 0 ? 6 : js - 1;
  });
  const [view, setView] = useState("cardapio");
  const [toast, setToast] = useState<{ msg: string; undo?: WeekPlan } | null>(null);
  const toastTimer = useRef<number>();
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ plan, checked: [...checked] }));
    } catch { /* sem armazenamento: segue funcionando */ }
  }, [plan, checked]);

  // ---------- sincronização com o Firestore ----------
  const [sync, setSync] = useState<SyncState>(planDoc ? "loading" : "local");
  const [cloudReady, setCloudReady] = useState(false);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (!planDoc) return;
    return onSnapshot(
      planDoc,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.metadata.hasPendingWrites) {
          setSync("saving");
          return;
        }
        if (snap.exists()) {
          const remote = normalize(snap.data());
          if (remote) {
            const checkedSet = new Set(remote.checked);
            const json = serialize(remote.plan, checkedSet);
            if (json !== lastSynced.current) {
              lastSynced.current = json;
              setPlan(remote.plan);
              setChecked(checkedSet);
            }
          }
        } else if (snap.metadata.fromCache) {
          // cache vazio ainda não diz se o documento existe no servidor: espera a resposta
          return;
        }
        setCloudReady(true);
        setSync(snap.metadata.fromCache ? "offline" : "saved");
      },
      (err) => {
        console.error("Firestore:", err);
        setSync("error");
      }
    );
  }, []);

  useEffect(() => {
    if (!planDoc || !cloudReady) return;
    const json = serialize(plan, checked);
    if (json === lastSynced.current) return;
    const t = window.setTimeout(() => {
      lastSynced.current = json;
      setDoc(planDoc!, { plan, checked: [...checked], updatedAt: serverTimestamp() }).catch((err) => {
        console.error("Firestore:", err);
        setSync("error");
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [plan, checked, cloudReady]);

  // ---------- ações ----------
  const showToast = (msg: string, undo?: WeekPlan) => {
    setToast({ msg, undo });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  };

  const updateMeal = (mealId: string, fn: (mp: MealPlan) => void) =>
    setPlan((p) => {
      const n = clone(p);
      fn(n[day][mealId]);
      return n;
    });

  const applyToWeek = () => {
    const before = clone(plan);
    setPlan((p) => p.map(() => clone(p[day])));
    showToast(`${DAYS[day].long} copiada para a semana toda`, before);
  };
  const resetDay = () => {
    const before = clone(plan);
    setPlan((p) => {
      const n = clone(p);
      n[day] = defaultDay();
      return n;
    });
    showToast(`${DAYS[day].long} voltou para as opções principais`, before);
  };
  const resetWeek = () => {
    const before = clone(plan);
    setPlan(defaultWeek());
    showToast("Semana toda voltou para as opções principais", before);
  };

  // ---------- totais ----------
  const totals = useMemo(() => {
    const map = new Map<IngId, { qty: number; by: Map<string, Record<Person, number>> }>();
    const mealsOn: Record<Person, number> = { davi: 0, irys: 0 };
    const mealsTotal: Record<Person, number> = { davi: 0, irys: 0 };
    let saladPlates = 0;
    plan.forEach((d) => {
      for (const m of MEALS) {
        const mp = d[m.id];
        for (const { id: p } of PEOPLE) {
          if (!m.slots.some((s) => optionsFor(s, p).length > 0)) continue;
          mealsTotal[p]++;
          if (!mp.on[p]) continue;
          mealsOn[p]++;
          if (m.freeText) saladPlates++;
          for (const s of m.slots) {
            const o = chosen(s, p, mp);
            const portion = o?.[p];
            if (!o || !portion) continue;
            for (const u of portion.uses) {
              const cur = map.get(u.ing) ?? { qty: 0, by: new Map() };
              cur.qty += u.qty;
              const key = `${m.short} · ${o.name.toLowerCase()}`;
              const counts = cur.by.get(key) ?? { davi: 0, irys: 0 };
              counts[p]++;
              cur.by.set(key, counts);
              map.set(u.ing, cur);
            }
          }
        }
      }
    });
    return { map, mealsOn, mealsTotal, saladPlates };
  }, [plan]);

  const grouped = SECTIONS.map((sec) => ({
    sec,
    items: [...totals.map.entries()]
      .filter(([id]) => INGREDIENTS[id].section === sec)
      .map(([id, v]) => ({ id, ...v, ing: INGREDIENTS[id] })),
  })).filter((g) => g.items.length > 0);

  const itemCount = totals.map.size;
  const doneCount = [...totals.map.keys()].filter((k) => checked.has(k)).length;

  const toggleCheck = (id: string) =>
    setChecked((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const listText = () => {
    const lines = ["Lista de compras da semana (Davi e Irys)", ""];
    for (const g of grouped) {
      lines.push(g.sec.toUpperCase());
      for (const it of g.items) lines.push(`- ${it.ing.copy(it.qty)}`);
      lines.push("");
    }
    if (totals.saladPlates > 0) {
      lines.push("SALADA E LEGUMES (à vontade)");
      lines.push(`- Para ${totals.saladPlates} pratos no almoço: ${SALAD_SUGGESTIONS.join(", ").toLowerCase()}`);
      lines.push("");
    }
    lines.push("BÁSICOS (se faltar em casa)");
    lines.push(`- ${BASICS.join(", ")}`);
    return lines.join("\n");
  };

  const copyList = async () => {
    const text = listText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setManualCopy(text);
    }
  };

  const dayPlan = plan[day];
  const dayChanges = changesInDay(dayPlan);

  const byText = (by: Map<string, Record<Person, number>>) =>
    [...by.entries()]
      .map(([k, c]) => {
        const parts = PEOPLE.filter((p) => c[p.id] > 0).map((p) => `${p.name} ${c[p.id]}`);
        return `${k} (${parts.join(", ")})`;
      })
      .join(" · ");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider">
            <PersonTag p="davi" /> <span className="text-muted-foreground">e</span> <PersonTag p="irys" />
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Cardápio da semana</h1>
          <p className="mt-2 text-muted-foreground">
            A escolha de cada refeição vale pros dois, cada um com a porção da sua dieta. A lista de compras soma a semana e converte o peso do prato pronto para o que se compra cru.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatus state={sync} />
          <Button variant="ghost" size="sm" onClick={resetWeek}>
            <RotateCcw /> Recomeçar a semana
          </Button>
        </div>
      </header>

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="mb-4 flex w-full lg:hidden">
          <TabsTrigger value="cardapio"><UtensilsCrossed className="h-4 w-4" /> Cardápio</TabsTrigger>
          <TabsTrigger value="lista">
            <ShoppingBasket className="h-4 w-4" /> Lista
            <Badge className="bg-primary text-primary-foreground tabular">{itemCount}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
          {/* ---------------- CARDÁPIO ---------------- */}
          <TabsContent value="cardapio" forceMount className="data-[state=inactive]:hidden lg:data-[state=inactive]:block">
            <div role="tablist" aria-label="Dia da semana" className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d, i) => {
                const ch = changesInDay(plan[i]);
                const activeDay = i === day;
                return (
                  <button
                    key={d.short}
                    role="tab"
                    aria-selected={activeDay}
                    onClick={() => setDay(i)}
                    className={cn(
                      "relative flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeDay ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                    )}
                  >
                    {d.short}
                    <span className={cn("mt-0.5 text-[10px] font-medium", activeDay ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {ch === 0 ? "principal" : `${ch} troca${ch > 1 ? "s" : ""}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">{DAYS[day].long}</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={applyToWeek}>
                  <Repeat /> Repetir na semana toda
                </Button>
                <Button variant="outline" size="sm" onClick={resetDay} disabled={dayChanges === 0}>
                  <RotateCcw /> Voltar ao principal
                </Button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Toque no nome de quem vai comer fora pra tirar a refeição da lista.</p>

            <div className="mt-4 flex flex-col gap-4">
              {MEALS.map((m: Meal) => {
                const mp = dayPlan[m.id];
                const anyOn = PEOPLE.some((p) => mp.on[p.id]);
                return (
                  <Card key={m.id} className={cn(!anyOn && "border-dashed bg-transparent")}>
                    <CardHeader className="flex-wrap">
                      <CardTitle className={cn(!anyOn && "text-muted-foreground")}>{m.name}</CardTitle>
                      <div className="flex items-center gap-1.5" role="group" aria-label={`Quem come ${m.name.toLowerCase()} em casa`}>
                        {PEOPLE.map(({ id: p, name }) => (
                          <button
                            key={p}
                            aria-pressed={mp.on[p]}
                            onClick={() => updateMeal(m.id, (x) => { x.on[p] = !x.on[p]; })}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              mp.on[p] ? PERSON_STYLE[p].on : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", mp.on[p] ? PERSON_STYLE[p].dot : "bg-muted-foreground/40")} />
                            {name}
                            {!mp.on[p] && <span className="font-normal">· fora</span>}
                          </button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!anyOn ? (
                        <p className="text-sm text-muted-foreground">Os dois comem fora: não entra na lista de compras.</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {m.freeText && (
                            <div className="flex items-start gap-2 rounded-md bg-primary-soft px-3 py-2 text-sm">
                              <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              {m.freeText}
                            </div>
                          )}
                          {m.slots.map((s) => (
                            <SlotBlock
                              key={s.id}
                              slot={s}
                              mp={mp}
                              onPick={(id) => updateMeal(m.id, (x) => { x.pick[s.id] = id; })}
                              onIrysPick={(id) => updateMeal(m.id, (x) => { x.irysPick[s.id] = id; })}
                              onSplit={() => updateMeal(m.id, (x) => { x.irysPick[s.id] = chosen(s, "irys", x)!.id; })}
                              onJoin={() => updateMeal(m.id, (x) => { delete x.irysPick[s.id]; })}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {day < 6 && (
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => { setDay(day + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  Próximo dia: {DAYS[day + 1].long}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ---------------- LISTA ---------------- */}
          <TabsContent value="lista" forceMount className="data-[state=inactive]:hidden lg:sticky lg:top-6 lg:data-[state=inactive]:block">
            <Card className="overflow-hidden">
              <div className="border-b bg-primary-soft px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Lista de compras</h2>
                    <p className="text-sm text-muted-foreground tabular">
                      Refeições em casa: <PersonTag p="davi" /> {totals.mealsOn.davi}/{totals.mealsTotal.davi} · <PersonTag p="irys" /> {totals.mealsOn.irys}/{totals.mealsTotal.irys}
                    </p>
                    <p className="text-sm text-muted-foreground tabular">{doneCount}/{itemCount} itens no carrinho</p>
                  </div>
                  <ShoppingBasket className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={copyList}>
                    {copied ? <CopyCheck /> : <Copy />} {copied ? "Copiada" : "Copiar lista"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setChecked(new Set())} disabled={doneCount === 0}>
                    Desmarcar tudo
                  </Button>
                </div>
              </div>

              <div className="divide-y lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
                {grouped.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma refeição em casa nesta semana.</p>
                )}
                {grouped.map((g) => (
                  <section key={g.sec} className="px-4 py-3">
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.sec}</h3>
                    <ul className="flex flex-col">
                      {g.items.map((it) => {
                        const f = it.ing.format(it.qty);
                        const done = checked.has(it.id);
                        return (
                          <li key={it.id}>
                            <label htmlFor={`chk-${it.id}`} className="flex cursor-pointer items-start gap-3 py-2">
                              <Checkbox id={`chk-${it.id}`} checked={done} onCheckedChange={() => toggleCheck(it.id)} className="mt-0.5" />
                              <span className={cn("min-w-0 flex-1", done && "opacity-50")}>
                                <span className="flex items-baseline justify-between gap-3">
                                  <span className={cn("text-sm font-semibold", done && "line-through")}>{it.ing.name}</span>
                                  <span className="shrink-0 text-sm font-bold tabular text-primary">{f.main}</span>
                                </span>
                                {f.detail && <span className="block text-xs text-muted-foreground">{f.detail}</span>}
                                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground/80">{byText(it.by)}</span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}

                {totals.saladPlates > 0 && (
                  <section className="px-4 py-3">
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salada e legumes · à vontade</h3>
                    <p className="mb-2 text-sm">Compre o bastante para <strong className="tabular">{totals.saladPlates} pratos</strong> no almoço, do que vocês gostarem:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SALAD_SUGGESTIONS.map((s) => (
                        <span key={s} className="rounded-full border px-2.5 py-0.5 text-xs">{s}</span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="px-4 py-3">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Básicos, se faltar em casa</h3>
                  <p className="text-sm text-muted-foreground">{BASICS.join(" · ")}</p>
                </section>

                <section className="px-4 py-3">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Os pesos das dietas são do alimento pronto. Para comprar, a conversão usa fatores aproximados: frango e carne moída ×{FACTORS.frango.toLocaleString("pt-BR")},
                    carne assada ×{FACTORS.carneAssada.toLocaleString("pt-BR")}, bisteca ×{FACTORS.bisteca.toLocaleString("pt-BR")}, peixe ×{FACTORS.peixe.toLocaleString("pt-BR")},
                    inhame e macaxeira com casca ×{FACTORS.inhame.toLocaleString("pt-BR")}, batata doce ×{FACTORS.batataDoce.toLocaleString("pt-BR")},
                    cuscuz ≈ metade do peso em flocão, arroz e feijão carioca crus ≈ 40% do cozido, 1 maracujá por copo de suco.
                    Tapioca de frango conta 60 g de goma + 40 g de frango; sanduíche, 2 fatias de pão de forma + 50 g de frango.
                  </p>
                </section>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {view === "cardapio" && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button className="w-full" onClick={() => { setView("lista"); window.scrollTo({ top: 0 }); }}>
            <ShoppingBasket /> Ver lista de compras ({itemCount} itens)
          </Button>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg lg:bottom-6">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              className="flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline"
              onClick={() => { setPlan(toast.undo!); setToast(null); }}
            >
              <Undo2 className="h-4 w-4" /> Desfazer
            </button>
          )}
        </div>
      )}

      {manualCopy && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setManualCopy(null)}>
          <div className="w-full max-w-md rounded-lg border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold">Copie a lista</h3>
            <p className="mb-2 text-sm text-muted-foreground">O navegador não deixou copiar direto. Selecione o texto abaixo e copie.</p>
            <label htmlFor="manual-copy" className="sr-only">Lista de compras em texto</label>
            <textarea
              id="manual-copy"
              readOnly
              value={manualCopy}
              onFocus={(e) => e.currentTarget.select()}
              className="h-64 w-full rounded-md border bg-background p-2 text-xs"
            />
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={() => setManualCopy(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
