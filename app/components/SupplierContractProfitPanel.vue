<script setup lang="ts">
// Tedarikçi sözleşmesi formunun sağ paneli: girilen şartlara göre ANLIK net karlılık ve kapsam
// bazlı kırılım (marj + prim etkisi ± vade farkı). Saklanmaz, her zaman hesaplanır.
import {
  DUE_DAILY_RATE,
  formatPercent,
  scopeLabel,
  scopeSummary,
  type ScopeSummary,
  type SupplierContractTerms,
  type TermScope,
} from "~/utils/supplierContractTerms";

/**
 * `entries` verilirse panel, her biri kendi vade şartına sahip birden çok sözleşmeyi (kapsam başına
 * bir sözleşme) tek tabloda toplar; verilmezse eskisi gibi `terms.scopes` kullanılır.
 */
interface ProfitEntry {
  id: string;
  label: string;
  scope: TermScope;
  terms: Pick<SupplierContractTerms, "purchaseDue" | "salesDue">;
}
const props = defineProps<{ terms: SupplierContractTerms; today: string; entries?: ProfitEntry[]; activeId?: string | null }>();

const rows = computed<{ id: string; label: string; item: ScopeSummary }[]>(() =>
  props.entries
    ? props.entries.map((entry) => ({ id: entry.id, label: entry.label, item: scopeSummary(entry.scope, entry.terms, props.today) }))
    : props.terms.scopes.map((scope) => ({ id: scope.id, label: scopeLabel(scope), item: scopeSummary(scope, props.terms, props.today) })),
);
const average = (pick: (item: ScopeSummary) => number) =>
  rows.value.length ? rows.value.reduce((sum, row) => sum + pick(row.item), 0) / rows.value.length : 0;
const summary = computed(() => ({
  margin: average((item) => item.margin),
  bonusEffect: average((item) => item.bonusEffect),
  dueEffect: average((item) => item.dueEffect),
  net: average((item) => item.net),
  lowest: rows.value.length ? Math.min(...rows.value.map((row) => row.item.net)) : 0,
}));
const signed = (value: number) => `${value > 0 ? "+" : ""}${formatPercent(value)}`;
const tone = (value: number) => (value < 0 ? "text-rose-700" : value === 0 ? "text-ink-muted" : "");
</script>

<template>
  <section class="rounded border border-tier-highest bg-paper p-4" aria-label="Net karlılık">
    <h3 class="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">Net Karlılık</h3>
    <div class="mt-1 font-mono text-[32px] font-semibold tabular-nums" :class="summary.net < 0 ? 'text-rose-700' : 'text-ink'">
      {{ formatPercent(summary.net) }}
    </div>
    <p class="text-[12px] text-ink-muted">
      {{ rows.length }} kapsamın düz ortalaması<template v-if="rows.length > 1"> · en düşük {{ formatPercent(summary.lowest) }}</template>
    </p>
    <table class="mt-3 w-full text-[12px]">
      <thead class="text-left font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
        <tr>
          <th class="py-1 font-medium">Kapsam</th>
          <th class="py-1 text-right font-medium">Marj</th>
          <th class="py-1 text-right font-medium">Prim</th>
          <th class="py-1 text-right font-medium">Vade</th>
          <th class="py-1 text-right font-medium">Net</th>
        </tr>
      </thead>
      <tbody class="font-mono tabular-nums">
        <tr
          v-for="row in rows"
          :key="row.id"
          class="border-t border-tier-highest/60"
          :class="row.id === activeId ? 'bg-tier-low' : ''"
        >
          <td class="max-w-[110px] truncate py-1 font-sans" :class="row.id === activeId ? 'font-semibold' : ''" :title="row.label">{{ row.label }}</td>
          <td class="py-1 text-right">{{ formatPercent(row.item.margin, 1) }}</td>
          <td class="py-1 text-right" :class="tone(row.item.bonusEffect)">{{ signed(row.item.bonusEffect) }}</td>
          <td class="py-1 text-right" :class="tone(row.item.dueEffect)">{{ signed(row.item.dueEffect) }}</td>
          <td class="py-1 text-right font-semibold" :class="row.item.net < 0 ? 'text-rose-700' : ''">{{ formatPercent(row.item.net) }}</td>
        </tr>
        <tr class="border-t-2 border-tier-highest font-semibold">
          <td class="py-1 font-sans">Ortalama</td>
          <td class="py-1 text-right">{{ formatPercent(summary.margin, 1) }}</td>
          <td class="py-1 text-right">{{ signed(summary.bonusEffect) }}</td>
          <td class="py-1 text-right">{{ signed(summary.dueEffect) }}</td>
          <td class="py-1 text-right">{{ formatPercent(summary.net) }}</td>
        </tr>
      </tbody>
    </table>
    <p class="mt-3 text-[11px] leading-snug text-ink-muted">
      Net = kâr marjı (alış iskontosu / satış neti) + prim etkisi ± vade farkı (%{{ DUE_DAILY_RATE.toString().replace(".", ",") }}/gün).
    </p>
  </section>
</template>
