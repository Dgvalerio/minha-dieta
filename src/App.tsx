import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, CopyCheck, Leaf, RotateCcw, Repeat, ShoppingBasket, UtensilsCrossed, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BASICS, DAYS, INGREDIENTS, MEALS, SALAD_SUGGESTIONS, SECTIONS, type IngId } from "./data";

type MealPlan = { on: boolean; pick: Record<string, number> };
type DayPlan = Record<string, MealPlan>;
type WeekPlan = DayPlan[];

const STORAGE_KEY = "cardapio-semana-v1";

const defaultDay = (): DayPlan =>
  Object.fromEntries(
    MEALS.map((m) => [m.id, { on: true, pick: Object.fromEntries(m.slots.map((s) => [s.id, 0])) }])
  );
const defaultWeek = (): WeekPlan => DAYS.map(() => defaultDay());
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function load(): { plan: WeekPlan; checked: string[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.plan) || data.plan.length !== 7) return null;
    // garante que refeições/slots novos existam
    const plan = data.plan.map((d: DayPlan) => {
      const base = defaultDay();
      for (const m of MEALS) {
        if (!d?.[m.id]) continue;
        base[m.id].on = d[m.id].on !== false;
        for (const s of m.slots) {
          const v = d[m.id].pick?.[s.id];
          if (typeof v === "number" && v >= 0 && v < s.options.length) base[m.id].pick[s.id] = v;
        }
      }
      return base;
    });
    return { plan, checked: Array.isArray(data.checked) ? data.checked : [] };
  } catch {
    return null;
  }
}

function changesInDay(d: DayPlan) {
  let n = 0;
  for (const m of MEALS) {
    if (!d[m.id].on) { n++; continue; }
    for (const s of m.slots) if (d[m.id].pick[s.id] !== 0) n++;
  }
  return n;
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

  const showToast = (msg: string, undo?: WeekPlan) => {
    setToast({ msg, undo });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  };

  const setPick = (mealId: string, slotId: string, idx: number) =>
    setPlan((p) => {
      const n = clone(p);
      n[day][mealId].pick[slotId] = idx;
      return n;
    });
  const setOn = (mealId: string, on: boolean) =>
    setPlan((p) => {
      const n = clone(p);
      n[day][mealId].on = on;
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
    const map = new Map<IngId, { qty: number; by: Map<string, number> }>();
    let mealsOn = 0;
    let lunches = 0;
    plan.forEach((d) => {
      for (const m of MEALS) {
        if (!d[m.id].on) continue;
        mealsOn++;
        if (m.id === "almoco") lunches++;
        for (const s of m.slots) {
          const opt = s.options[d[m.id].pick[s.id]];
          for (const u of opt.uses) {
            const cur = map.get(u.ing) ?? { qty: 0, by: new Map() };
            cur.qty += u.qty;
            const key = s.options.length > 1 ? `${m.name.split(" ")[0]} · ${opt.name.toLowerCase()}` : m.name;
            cur.by.set(key, (cur.by.get(key) ?? 0) + 1);
            map.set(u.ing, cur);
          }
        }
      }
    });
    return { map, mealsOn, lunches };
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
    const lines = ["Lista de compras da semana", ""];
    for (const g of grouped) {
      lines.push(g.sec.toUpperCase());
      for (const it of g.items) lines.push(`- ${it.ing.copy(it.qty)}`);
      lines.push("");
    }
    if (totals.lunches > 0) {
      lines.push("SALADA E LEGUMES (à vontade)");
      lines.push(`- Para ${totals.lunches} almoços: ${SALAD_SUGGESTIONS.join(", ").toLowerCase()}`);
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Dieta da nutricionista</p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Cardápio da semana</h1>
          <p className="mt-2 text-muted-foreground">
            Escolha o que vai comer em cada dia. A lista de compras soma a semana e converte os pesos do prato pronto para o que você compra cru.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetWeek}>
          <RotateCcw /> Recomeçar a semana
        </Button>
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
                const active = i === day;
                return (
                  <button
                    key={d.short}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setDay(i)}
                    className={cn(
                      "relative flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                    )}
                  >
                    {d.short}
                    <span className={cn("mt-0.5 text-[10px] font-medium", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
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

            <div className="mt-4 flex flex-col gap-4">
              {MEALS.map((m) => {
                const mp = dayPlan[m.id];
                return (
                  <Card key={m.id} className={cn(!mp.on && "border-dashed bg-transparent")}>
                    <CardHeader>
                      <CardTitle className={cn(!mp.on && "text-muted-foreground")}>{m.name}</CardTitle>
                      <label htmlFor={`on-${m.id}`} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                        {mp.on ? "Em casa" : "Fora / pular"}
                        <Switch id={`on-${m.id}`} checked={mp.on} onCheckedChange={(v) => setOn(m.id, v)} />
                      </label>
                    </CardHeader>
                    <CardContent>
                      {!mp.on ? (
                        <p className="text-sm text-muted-foreground">Não entra na lista de compras neste dia.</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {m.freeText && (
                            <div className="flex items-start gap-2 rounded-md bg-primary-soft px-3 py-2 text-sm">
                              <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              {m.freeText}
                            </div>
                          )}
                          {m.slots.map((s) =>
                            s.options.length === 1 ? (
                              <div key={s.id}>
                                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{s.label}</p>
                                <div className="rounded-md bg-muted px-3 py-2">
                                  <p className="text-sm font-semibold">{s.options[0].name}</p>
                                  <p className="text-xs text-muted-foreground">{s.options[0].portion}</p>
                                </div>
                              </div>
                            ) : (
                              <div key={s.id} role="radiogroup" aria-label={`${m.name}: ${s.label}`}>
                                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{s.label}</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                  {s.options.map((o, idx) => {
                                    const sel = mp.pick[s.id] === idx;
                                    return (
                                      <button
                                        key={o.id}
                                        role="radio"
                                        aria-checked={sel}
                                        onClick={() => setPick(m.id, s.id, idx)}
                                        className={cn(
                                          "flex items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                          sel ? "border-primary bg-primary-soft" : "bg-card hover:bg-muted"
                                        )}
                                      >
                                        <span
                                          aria-hidden
                                          className={cn(
                                            "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                                            sel ? "border-primary bg-primary shadow-[inset_0_0_0_2px_hsl(var(--primary-soft))]" : "border-muted-foreground/50"
                                          )}
                                        />
                                        <span className="min-w-0">
                                          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                                            {o.name}
                                            {idx === 0 && <Badge className="bg-accent-soft text-accent-foreground dark:text-accent">principal</Badge>}
                                          </span>
                                          <span className="block text-xs text-muted-foreground">{o.portion}</span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )
                          )}
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
                      {totals.mealsOn} de 28 refeições em casa · {doneCount}/{itemCount} no carrinho
                    </p>
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

              <div className="max-h-none divide-y lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
                {grouped.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma refeição marcada como “em casa” nesta semana.</p>
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
                                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground/80">
                                  {[...it.by.entries()].map(([k, n]) => `${k} ×${n}`).join(" · ")}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}

                {totals.lunches > 0 && (
                  <section className="px-4 py-3">
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salada e legumes · à vontade</h3>
                    <p className="mb-2 text-sm">Compre o bastante para <strong className="tabular">{totals.lunches} almoços</strong>, do que você gostar:</p>
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
                    Os pesos da dieta são do alimento pronto. Para comprar, a conversão usa fatores aproximados: frango e carne moída ×1,35, carne assada ×1,45,
                    peixe ×1,25, inhame com casca ×1,15, cuscuz ≈ metade do peso em flocão, arroz cru ≈ 40% do cozido, 1 maracujá por copo de suco.
                    Tapioca de frango conta 60 g de goma + 40 g de frango; sanduíche, 2 fatias de pão de forma + 50 g de frango.
                  </p>
                </section>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* lista: atalho flutuante no celular */}
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
