import { MEALS, PEOPLE, type Meal, type Option, type Person, type Slot } from "./data";

/**
 * pick: escolha compartilhada por slot (id da opção).
 * irysPick: quando existe para um slot, a Irys come diferente naquele item.
 */
export type MealPlan = { on: Record<Person, boolean>; pick: Record<string, string>; irysPick: Record<string, string> };
export type DayPlan = Record<string, MealPlan>;
export type WeekPlan = DayPlan[];

export const has = (o: Option, p: Person) => Boolean(o[p]);
export const optionsFor = (s: Slot, p: Person) => s.options.filter((o) => has(o, p));
export const slotPeople = (s: Slot): Person[] => PEOPLE.map((x) => x.id).filter((p) => optionsFor(s, p).length > 0);

/** opções que todo mundo que tem esse item na dieta pode comer */
export const sharedOptions = (s: Slot) => {
  const ps = slotPeople(s);
  return s.options.filter((o) => ps.every((p) => has(o, p)));
};

/** dá pra Irys escolher diferente nesse item? */
export const canSplit = (s: Slot) => slotPeople(s).length > 1 && optionsFor(s, "irys").length > 1;
export const isSplit = (mp: MealPlan, s: Slot) => canSplit(s) && mp.irysPick[s.id] !== undefined;

export function chosen(s: Slot, p: Person, mp: MealPlan): Option | undefined {
  const own = optionsFor(s, p);
  if (own.length === 0) return undefined;
  if (p === "irys" && isSplit(mp, s)) {
    const o = own.find((x) => x.id === mp.irysPick[s.id]);
    if (o) return o;
  }
  const shared = sharedOptions(s);
  return shared.find((x) => x.id === mp.pick[s.id]) ?? shared[0] ?? own[0];
}

export const defaultMeal = (): MealPlan => ({ on: { davi: true, irys: true }, pick: {}, irysPick: {} });
export const defaultDay = (): DayPlan => Object.fromEntries(MEALS.map((m) => [m.id, defaultMeal()]));
export const defaultWeek = (): WeekPlan => Array.from({ length: 7 }, defaultDay);

/** quantas coisas fogem do padrão (opção principal, os dois em casa) */
export function changesInMeal(m: Meal, mp: MealPlan) {
  let n = 0;
  for (const p of PEOPLE) if (!mp.on[p.id]) n++;
  for (const s of m.slots) {
    const shared = sharedOptions(s);
    const pick = mp.pick[s.id];
    if (pick !== undefined && shared.length > 1 && pick !== shared[0].id) n++;
    if (isSplit(mp, s)) n++;
  }
  return n;
}
export const changesInDay = (d: DayPlan) => MEALS.reduce((acc, m) => acc + changesInMeal(m, d[m.id]), 0);

/** Valida dados salvos (localStorage/Firestore), inclusive no formato antigo só do Davi. */
export function normalizeWeek(raw: unknown): WeekPlan | null {
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  return raw.map((d: any) => {
    const day = defaultDay();
    for (const m of MEALS) {
      const src = d?.[m.id];
      if (!src) continue;
      const mp = day[m.id];
      if (typeof src.on === "boolean") {
        mp.on.davi = src.on; // formato antigo: só valia pro Davi
      } else if (src.on && typeof src.on === "object") {
        for (const p of PEOPLE) if (typeof src.on[p.id] === "boolean") mp.on[p.id] = src.on[p.id];
      }
      for (const s of m.slots) {
        const v = src.pick?.[s.id];
        const shared = sharedOptions(s);
        if (typeof v === "number") {
          // formato antigo guardava o índice entre as opções do Davi
          const o = optionsFor(s, "davi")[v];
          if (o && shared.includes(o)) mp.pick[s.id] = o.id;
        } else if (typeof v === "string" && shared.some((o) => o.id === v)) {
          mp.pick[s.id] = v;
        }
        const ip = src.irysPick?.[s.id];
        if (typeof ip === "string" && canSplit(s) && optionsFor(s, "irys").some((o) => o.id === ip)) {
          mp.irysPick[s.id] = ip;
        }
      }
    }
    return day;
  });
}
