// Sözleşme değişiklik geçmişi — prototipte yalnız bu tarayıcıda (localStorage) tutulur.
// Gerçekte kayıt sunucuda, oturumdaki kullanıcı adıyla yazılır.
import {
  bonusText,
  dueText,
  freightLabel,
  freightText,
  type Bonus,
  type SupplierContractTerms,
} from "~/utils/supplierContractTerms";
import type { Extra } from "~/utils/prototypeSupplierContracts";

/** Prototipte oturum yok; gerçekte giriş yapmış kullanıcının adı yazılır. */
export const PROTOTYPE_USER = "Prototip Kullanıcı";

export interface HistoryChange {
  field: string;
  from: string;
  to: string;
}

export interface HistoryEntry {
  id: string;
  /** ISO zaman damgası. */
  at: string;
  user: string;
  /** Hangi kapsamın sözleşmesi (ör. "Tüm ürünler", "Marka · DİLMAN"). */
  scope: string;
  /** Yeni eklenen kapsamda alan alan fark yoktur. */
  created: boolean;
  changes: HistoryChange[];
}

const PERIODS: Record<string, string> = { Monthly: "Aylık", Quarterly: "3 Aylık", Yearly: "Yıllık" };
const PRICING: Record<Extra["pricingMode"], string> = { manual: "Elle girilir", equal: "Alışa eşit", markup: "Alıştan oranla" };
const text = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? "—" : String(value));
const percent = (value: number | null) => (value === null ? "—" : `%${value}`);

/** Karşılaştırılan alanlar: etiket → okunur değer. */
export const contractFields = (
  terms: SupplierContractTerms,
  yearEnd: Bonus,
  turnover: Bonus,
  extra: Extra,
): Record<string, string> => {
  const scope = terms.scopes[0]!;
  const fields: Record<string, string> = {};
  scope.discounts.forEach((value, index) => { fields[`Alış iskontosu ${index + 1}`] = percent(value); });
  fields["Satış iskontosu"] = percent(scope.salesDiscount);
  fields["Kampanya iskontosu"] = percent(extra.campaignDiscount);
  fields["Bozuk ürün bütçesi"] = percent(extra.defectiveBudget);
  fields["İade hakkı"] = extra.hasReturnRight ? "Var" : "Yok";
  fields["Satış fiyat listesi"] = text(extra.salesListNo);
  fields["Satış iskonto kodu"] = text(extra.salesDiscountCode);
  fields["Fiyatlama"] = PRICING[extra.pricingMode];
  fields["Alıştan satış oranı"] = percent(extra.markup);
  fields["Sene sonu primi"] = bonusText(yearEnd);
  fields["Ciro primi"] = bonusText(turnover);
  fields["Ciro primi dönemi"] = PERIODS[extra.bonusPeriods.turnover] ?? text(extra.bonusPeriods.turnover);
  fields["Personel primi"] = bonusText(terms.staffBonus);
  fields["Personel primi dönemi"] = PERIODS[extra.bonusPeriods.staff] ?? text(extra.bonusPeriods.staff);
  fields["Alış vadesi"] = dueText(terms.purchaseDue);
  fields["Satış vadesi"] = dueText(terms.salesDue);
  fields["İskonto grubu"] = text(terms.discountGroup);
  fields["Vade açıklaması"] = text(terms.dueNote);
  fields["Nakliye"] = terms.freights.map((rule) => `${freightLabel(rule)}: ${freightText(rule)}`).join(" · ") || "—";
  fields["Nakliye iskontosu"] = percent(extra.shippingDiscount);
  fields["Fuar deposu"] = extra.isFair ? text(extra.depotNo) : "—";
  fields["Fuar projesi"] = extra.isFair ? text(extra.projectCode) : "—";
  return fields;
};

export const diffFields = (before: Record<string, string>, after: Record<string, string>): HistoryChange[] =>
  Object.keys(after)
    .filter((field) => before[field] !== after[field])
    .map((field) => ({ field, from: before[field] ?? "—", to: after[field]! }));

// ── Depolama ──────────────────────────────────────────────────────────────────────────
const KEY = "supplier-contract-prototype:history:v1";
const MAX_ENTRIES = 50;
type HistoryMap = Record<string, HistoryEntry[]>;
const read = (): HistoryMap => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as HistoryMap;
  } catch {
    return {};
  }
};

/** En yeni başta. Anahtar: "cari|fuar" (genel sözleşme için "cari|"). */
export const getHistory = (supplier: string, fair: string): HistoryEntry[] => read()[`${supplier}|${fair}`] ?? [];

export const addHistory = (supplier: string, fair: string, entries: Omit<HistoryEntry, "id">[]) => {
  if (!entries.length) return;
  try {
    const all = read();
    const key = `${supplier}|${fair}`;
    const added = entries.map((entry, index) => ({ ...entry, id: `${Date.now().toString(36)}-${index}` }));
    all[key] = [...added.reverse(), ...(all[key] ?? [])].slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Depolama engelliyse geçmiş tutulmaz.
  }
};

export const resetHistory = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // yok say
  }
};
