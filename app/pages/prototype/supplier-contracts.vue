<script setup lang="ts">
// Tedarikçi Sözleşmeleri · liste — SUNUM PROTOTİPİ (gerçek ekranın birebir kopyası, backend yok).
// Veri: MikroDesktop_TIMON'dan alınan 10 tedarikçi (bkz. ~/utils/prototypeSupplierContracts).
// Bir satıra girince /prototype/supplier-contract açılır ve o carinin sözleşmeleri gelir.
import { ChevronDown, ChevronRight, Plus, RotateCw, Search } from "lucide-vue-next";
import type { ErpSupplierContractListItem, ErpUncontractedSupplier } from "~/utils/supplierContractTypes";
import { PROTO_UNCONTRACTED, protoListItems, resetSavedContracts } from "~/utils/prototypeSupplierContracts";
import {
  DELIVERY_LABELS,
  bonusText,
  discountText,
  dueText,
  formatPercent,
  freightLabel,
  freightText,
  scopeLabel,
  scopeSummary,
  termsSummary,
  type TermScope,
  type TermsSummary,
} from "~/utils/supplierContractTerms";

definePageMeta({ layout: false, publicPage: true });
useHead({ title: "Tedarikçi Sözleşmeleri (Prototip)" });

const router = useRouter();
const canCreate = true;
const today = localIsoDate();

const view = ref<"contracted" | "uncontracted">("contracted");
const searchQuery = ref("");
const representativeFilter = ref("__all__");

// ── Sözleşmeliler ─────────────────────────────────────────────────────────────────────
const loading = ref(false);
const rows = ref<ErpSupplierContractListItem[]>(protoListItems());
const totalCount = computed(() => rows.value.length);

// ── Sözleşmesi olmayanlar ─────────────────────────────────────────────────────────────
const uncontracted = ref<ErpUncontractedSupplier[]>([...PROTO_UNCONTRACTED].sort((a, b) => b.turnover - a.turnover));
const uncontractedState = ref<"loading" | "ready" | "pending" | "error">("ready");
const loadUncontracted = () => {};
const refresh = () => {
  rows.value = protoListItems();
};
// Sunumdan önce: kaydedilen tüm değişiklikleri silip örnek veriye döner.
const resetDemo = () => {
  resetSavedContracts();
  refresh();
};
onActivated(refresh);

// ── Satırlar ──────────────────────────────────────────────────────────────────────────
interface Row {
  contract: ErpSupplierContractListItem;
  summary: TermsSummary | null;
}
const summarized = computed<Row[]>(() =>
  rows.value.map((contract) => ({ contract, summary: contract.terms ? termsSummary(contract.terms, today) : null })),
);
const representatives = computed(() =>
  [...new Set(rows.value.map((row) => row.representativeName).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "tr")),
);

const sort = ref<{ key: string; dir: 1 | -1 } | null>(null);
const toggleSort = (key: string) => {
  sort.value = sort.value?.key === key ? (sort.value.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 };
};
const sortValue = (row: Row, key: string): string | number => {
  const terms = row.contract.terms;
  const first = terms?.scopes[0];
  const firstSummary = first && terms ? scopeSummary(first, terms, today) : null;
  switch (key) {
    case "title": return row.contract.supplierTitle ?? row.contract.supplierName ?? "";
    case "group": return terms?.discountGroup ?? "";
    case "purchase": return firstSummary?.purchaseDays ?? -1;
    case "sales": return firstSummary?.salesDays ?? -1;
    case "bonus": return firstSummary?.bonusTotal ?? -1;
    case "margin": return row.summary?.margin ?? Number.NEGATIVE_INFINITY;
    case "due": return row.summary?.dueEffect ?? Number.NEGATIVE_INFINITY;
    case "net": return row.summary?.net ?? Number.NEGATIVE_INFINITY;
    case "date": return row.contract.contractDate ?? "";
    default: return "";
  }
};
const searchText = (row: Row) =>
  [
    row.contract.supplierTitle, row.contract.supplierName, row.contract.supplierCode, row.contract.representativeName,
    ...(row.contract.terms?.scopes ?? []).flatMap((scope) => [scope.brandCode, scope.brandName, scope.productGroupCode, scope.productGroupName]),
  ].filter(Boolean).join(" ").toLocaleLowerCase("tr");
const visibleRows = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase("tr");
  let list = summarized.value.filter((row) =>
    (representativeFilter.value === "__all__" || row.contract.representativeName === representativeFilter.value)
    && (!query || query.split(/\s+/).every((word) => searchText(row).includes(word))),
  );
  const current = sort.value;
  if (current) {
    list = [...list].sort((a, b) => {
      const x = sortValue(a, current.key);
      const y = sortValue(b, current.key);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "tr")) * current.dir;
    });
  }
  return list;
});
const visibleUncontracted = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase("tr");
  return uncontracted.value.filter((item) => !query || `${item.code} ${item.title ?? ""}`.toLocaleLowerCase("tr").includes(query));
});

const expanded = ref<string[]>([]);
const toggleExpand = (id: string) => {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((value) => value !== id) : [...expanded.value, id];
};
const expandable = (row: Row) => (row.contract.terms?.scopes.length ?? 0) > 1 || (row.contract.terms?.freights.length ?? 0) > 1;

// ── Genel bakış ───────────────────────────────────────────────────────────────────────
const withTerms = computed(() => summarized.value.filter((row): row is Row & { summary: TermsSummary } => row.summary !== null));
const kpi = computed(() => {
  const list = withTerms.value;
  const average = (pick: (row: (typeof list)[number]) => number) => (list.length ? list.reduce((sum, row) => sum + pick(row), 0) / list.length : null);
  return {
    count: rows.value.length,
    withTerms: list.length,
    margin: average((row) => row.summary.margin),
    net: average((row) => row.summary.net),
    negative: list.filter((row) => row.summary.net < 0).length,
  };
});
const uncontractedTurnover = computed(() => uncontracted.value.reduce((sum, item) => sum + item.turnover, 0));
const compactMoney = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", notation: "compact", maximumFractionDigits: 1 }).format(value);

const signed = (value: number) => `${value > 0 ? "+" : ""}${formatPercent(value)}`;
const open = (row: ErpSupplierContractListItem) => router.push({ path: "/prototype/supplier-contract", query: { supplier: row.supplierCode ?? undefined } });
// Kapsam eklenince "Tüm ürünler" yalnız kalan ürünleri kapsar.
const scopeName = (scope: TermScope, count: number) => (scope.kind === "all" && count > 1 ? "Diğer ürünler" : scopeLabel(scope));
const addFor = (item: ErpUncontractedSupplier) =>
  router.push({ path: "/prototype/supplier-contract", query: { supplier: item.code } });

const COLUMNS = [
  { key: "title", label: "Tedarikçi", sub: "Cari kodu · Temsilci" },
  { key: "group", label: "İsk. Grubu" },
  { key: "purchase", label: "Alış", sub: "Vade · iskonto" },
  { key: "sales", label: "Satış", sub: "Vade · satış isk." },
  { key: "freight", label: "Sevkiyat", sub: "Nakliye", sortable: false },
  { key: "bonus", label: "Primler", sub: "Sene sonu · Ciro" },
  { key: "margin", label: "Kâr Marjı", sub: "İskonto bazlı", right: true },
  { key: "due", label: "Vade Farkı", sub: "Alış − satış", right: true },
  { key: "net", label: "Net Karlılık", sub: "Marj + prim ± vade", right: true },
  { key: "date", label: "Sözleşme", sub: "Tarih · ödeme planı" },
] as const;
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="flex h-14 items-center justify-between border-t-[3px] border-t-action bg-graphite px-6 text-white">
      <span class="text-sm font-semibold">Tedarikçi Sözleşmeleri</span>
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-white/60">Prototip · kayıt yapılmaz</span>
    </header>
    <main class="mx-auto flex max-w-[1560px] flex-col gap-4 px-6 py-6">
    <PageHeader title="Tedarikçi Sözleşmeleri" description="Tedarikçilerle anlaşılan alış şartları, satış iskontosu, primler ve net karlılık.">
      <template #actions>
        <Button variant="secondary" @click="resetDemo">Örnek veriye dön</Button>
        <Button variant="secondary" :disabled="loading" @click="refresh">
          <RotateCw class="mr-2 size-4" :class="loading ? 'animate-spin' : ''" />
          Yenile
        </Button>
        <Button v-if="canCreate" @click="router.push('/prototype/supplier-contract')">
          <Plus class="mr-2 size-4" />
          Yeni Sözleşme
        </Button>
      </template>
    </PageHeader>

    <!-- Genel bakış -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded border border-tier-highest bg-paper p-3">
        <div class="text-[12px] text-ink-muted">Toplam sözleşme</div>
        <div class="font-mono text-[22px] font-semibold tabular-nums">{{ kpi.count }}</div>
        <div class="text-[11px] text-ink-muted">{{ kpi.withTerms }} tanesinde ticari şart var</div>
      </div>
      <div class="rounded border border-tier-highest bg-paper p-3">
        <div class="text-[12px] text-ink-muted">Ortalama kâr marjı</div>
        <div class="font-mono text-[22px] font-semibold tabular-nums">{{ kpi.margin === null ? "—" : formatPercent(kpi.margin, 1) }}</div>
      </div>
      <div class="rounded border border-tier-highest bg-paper p-3">
        <div class="text-[12px] text-ink-muted">Ortalama net karlılık</div>
        <div class="font-mono text-[22px] font-semibold tabular-nums" :class="(kpi.net ?? 0) < 0 ? 'text-rose-700' : ''">{{ kpi.net === null ? "—" : formatPercent(kpi.net) }}</div>
      </div>
      <button type="button" class="rounded border border-tier-highest bg-paper p-3 text-left hover:bg-tier-low" @click="view = 'contracted'; sort = { key: 'net', dir: 1 }">
        <div class="text-[12px] text-ink-muted">Net karlılığı negatif</div>
        <div class="font-mono text-[22px] font-semibold tabular-nums" :class="kpi.negative ? 'text-rose-700' : ''">{{ kpi.negative }}</div>
        <div class="text-[11px] text-ink-muted">Tıklayınca en düşükten sıralanır</div>
      </button>
      <button
        type="button"
        class="rounded border bg-paper p-3 text-left hover:bg-tier-low"
        :class="uncontracted.length ? 'border-amber-300' : 'border-tier-highest'"
        @click="view = 'uncontracted'"
      >
        <div class="text-[12px] text-ink-muted">Sözleşmesi olmayan</div>
        <div class="font-mono text-[22px] font-semibold tabular-nums">{{ uncontractedState === "ready" ? uncontracted.length : "—" }}</div>
        <div class="text-[11px] text-ink-muted">{{ uncontractedState === "ready" ? `${compactMoney(uncontractedTurnover)} ciro · son 12 ay` : "Liste henüz devreye alınmadı" }}</div>
      </button>
    </div>

    <Card class="overflow-hidden">
      <div class="flex flex-wrap items-center gap-2 border-b border-tier-highest px-4 py-2.5">
        <div role="tablist" class="flex gap-1">
          <button
            v-for="tab in [{ key: 'contracted', label: 'Sözleşmeliler', count: rows.length }, { key: 'uncontracted', label: 'Sözleşmesi Olmayanlar', count: uncontractedState === 'ready' ? uncontracted.length : null }] as const"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="view === tab.key"
            class="rounded-md px-3 py-1.5 text-[13px] transition-colors"
            :class="view === tab.key ? 'bg-tier font-medium text-ink' : 'text-ink-muted hover:text-ink'"
            @click="view = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count !== null" class="ml-1 rounded bg-paper px-1.5 font-mono text-[11px] tabular-nums">{{ tab.count }}</span>
          </button>
        </div>
        <div class="relative ml-auto w-full max-w-sm">
          <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <Input
            v-model="searchQuery"
            class="h-8 pl-8"
            :placeholder="view === 'contracted' ? 'Cari kodu, unvan, marka veya stok kodu…' : 'Cari kodu veya unvan…'"
            aria-label="Ara"
          />
        </div>
        <Select v-if="view === 'contracted'" v-model="representativeFilter">
          <SelectTrigger class="h-8 w-48" aria-label="Temsilci"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tüm temsilciler</SelectItem>
            <SelectItem v-for="name in representatives" :key="name" :value="name">{{ name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Sözleşmeliler -->
      <div v-if="view === 'contracted'" class="overflow-x-auto">
        <table class="w-full min-w-[1280px] text-[13px]">
          <thead>
            <tr class="border-b border-tier-highest bg-tier-low text-left font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              <th
                v-for="column in COLUMNS"
                :key="column.key"
                class="whitespace-nowrap px-3 py-2 font-medium"
                :class="['right' in column ? 'text-right' : '', 'sortable' in column ? '' : 'cursor-pointer select-none hover:text-ink']"
                :aria-sort="sort?.key === column.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined"
                @click="'sortable' in column || toggleSort(column.key)"
              >
                {{ column.label }}<span v-if="sort?.key === column.key" class="ml-1">{{ sort.dir === 1 ? "▲" : "▼" }}</span>
                <div v-if="'sub' in column" class="font-sans text-[10px] normal-case tracking-normal text-ink-muted/80">{{ column.sub }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && !rows.length"><td :colspan="COLUMNS.length" class="py-8 text-center text-ink-muted">Yükleniyor...</td></tr>
            <template v-for="row in visibleRows" :key="row.contract.id">
              <tr class="cursor-pointer border-b border-tier-highest/60 align-top transition-colors hover:bg-tier" @click="open(row.contract)">
                <td class="px-3 py-2">
                  <div class="flex items-start gap-1.5">
                    <button
                      v-if="expandable(row)"
                      type="button"
                      class="mt-0.5 text-ink-muted hover:text-ink"
                      :aria-label="expanded.includes(row.contract.id) ? 'Kapsamları gizle' : 'Kapsamları göster'"
                      :aria-expanded="expanded.includes(row.contract.id)"
                      @click.stop="toggleExpand(row.contract.id)"
                    >
                      <ChevronDown v-if="expanded.includes(row.contract.id)" class="size-4" />
                      <ChevronRight v-else class="size-4" />
                    </button>
                    <span v-else class="w-4 shrink-0" />
                    <div class="min-w-0">
                      <div class="max-w-[300px] truncate font-medium text-ink">{{ row.contract.supplierTitle ?? row.contract.supplierName ?? "—" }}</div>
                      <div class="text-[12px] text-ink-muted">
                        <span class="font-mono">{{ row.contract.supplierCode }}</span>
                        <span v-if="(row.contract.terms?.scopes.length ?? 0) > 1" class="ml-1.5 rounded bg-tier px-1">{{ row.contract.terms!.scopes.length - 1 }} özel kapsam</span>
                      </div>
                      <div class="text-[12px] text-ink-muted">{{ row.contract.representativeName ?? "Temsilci yok" }}</div>
                    </div>
                  </div>
                </td>
                <template v-if="row.contract.terms && row.summary">
                  <td class="px-3 py-2">{{ row.contract.terms.discountGroup ?? "—" }}</td>
                  <td class="px-3 py-2">{{ dueText(row.contract.terms.purchaseDue) }}<div class="text-[12px] text-ink-muted">{{ discountText(row.contract.terms.scopes[0]?.discounts ?? []) }}</div></td>
                  <td class="px-3 py-2">{{ dueText(row.contract.terms.salesDue) }}<div class="text-[12px] text-ink-muted">{{ discountText([row.contract.terms.scopes[0]?.salesDiscount ?? null]) }}</div></td>
                  <td class="px-3 py-2">
                    <template v-if="row.contract.terms.freights[0]">
                      {{ DELIVERY_LABELS[row.contract.terms.freights[0].delivery] }}
                      <div class="text-[12px] text-ink-muted">{{ freightText(row.contract.terms.freights[0]) }}</div>
                      <div v-if="row.contract.terms.freights.length > 1" class="text-[12px] text-amber-700">
                        {{ row.contract.terms.freights.slice(1).reduce((sum, rule) => sum + rule.provinces.length, 0) }} ilde farklı şart
                      </div>
                    </template>
                  </td>
                  <td class="px-3 py-2">
                    {{ row.contract.terms.scopes[0] ? bonusText(row.contract.terms.scopes[0].yearEndBonus) : "—" }}
                    <div class="text-[12px] text-ink-muted">{{ row.contract.terms.scopes[0] ? bonusText(row.contract.terms.scopes[0].turnoverBonus) : "—" }}</div>
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-[15px] font-semibold tabular-nums">{{ formatPercent(row.summary.margin, 1) }}</td>
                  <td class="px-3 py-2 text-right font-mono tabular-nums" :class="row.summary.dueEffect < 0 ? 'text-rose-700' : row.summary.dueEffect ? 'text-emerald-700' : 'text-ink-muted'">
                    {{ signed(row.summary.dueEffect) }}
                  </td>
                  <td class="px-3 py-2 text-right">
                    <span class="font-mono text-[15px] font-semibold tabular-nums" :class="row.summary.net < 0 ? 'text-rose-700' : ''">{{ formatPercent(row.summary.net) }}</span>
                    <div v-if="row.contract.terms.scopes.length > 1" class="text-[12px] text-ink-muted">en düşük {{ formatPercent(row.summary.lowest) }}</div>
                  </td>
                </template>
                <td v-else colspan="8" class="px-3 py-2 text-[12px] text-ink-muted">Ticari şart girilmedi — kapsam, vade, nakliye ve prim için sözleşmeyi açın.</td>
                <td class="px-3 py-2">
                  <span class="font-mono tabular-nums">{{ formatDate(row.contract.contractDate) }}</span>
                  <div class="text-[12px] text-ink-muted">{{ row.contract.paymentPlanName ?? "—" }}</div>
                </td>
              </tr>
              <template v-if="expanded.includes(row.contract.id) && row.contract.terms">
                <tr v-for="scope in row.contract.terms.scopes" :key="scope.id" class="border-b border-tier-highest/40 bg-tier-low/50 text-[12px]">
                  <td class="py-1.5 pl-9 pr-3">
                    <span class="rounded bg-tier px-1.5 py-0.5">{{ scopeName(scope, row.contract.terms.scopes.length) }}</span>
                    <span v-if="scope.kind !== 'all'" class="ml-1 text-ink-muted">· {{ scope.kind === "brand" ? "Marka" : `Ürün Grubu${scope.productGroupName ? ` · ${scope.productGroupName}` : ""}` }}</span>
                  </td>
                  <td />
                  <td class="px-3 py-1.5 text-ink-muted">{{ discountText(scope.discounts) }}</td>
                  <td class="px-3 py-1.5 text-ink-muted">{{ discountText([scope.salesDiscount]) }}</td>
                  <td />
                  <td class="px-3 py-1.5">{{ bonusText(scope.yearEndBonus) }}<div class="text-ink-muted">{{ bonusText(scope.turnoverBonus) }}</div></td>
                  <td class="px-3 py-1.5 text-right font-mono tabular-nums">{{ formatPercent(scopeSummary(scope, row.contract.terms, today).margin, 1) }}</td>
                  <td class="px-3 py-1.5 text-right font-mono tabular-nums">{{ signed(scopeSummary(scope, row.contract.terms, today).dueEffect) }}</td>
                  <td class="px-3 py-1.5 text-right font-mono font-semibold tabular-nums" :class="scopeSummary(scope, row.contract.terms, today).net < 0 ? 'text-rose-700' : ''">
                    {{ formatPercent(scopeSummary(scope, row.contract.terms, today).net) }}
                  </td>
                  <td />
                </tr>
                <tr v-for="rule in row.contract.terms.freights.length > 1 ? row.contract.terms.freights : []" :key="rule.id" class="border-b border-tier-highest/40 bg-tier-low/50 text-[12px]">
                  <td class="py-1.5 pl-9 pr-3"><span class="rounded bg-tier px-1.5 py-0.5">Nakliye</span> <span class="text-ink-muted">· {{ freightLabel(rule) }}</span></td>
                  <td /><td /><td />
                  <td class="px-3 py-1.5">{{ DELIVERY_LABELS[rule.delivery] }}<div class="text-ink-muted">{{ freightText(rule) }}</div></td>
                  <td /><td /><td /><td /><td />
                </tr>
              </template>
            </template>
            <tr v-if="!loading && !visibleRows.length">
              <td :colspan="COLUMNS.length" class="py-8 text-center text-ink-muted">{{ rows.length ? "Aramayla eşleşen sözleşme yok." : "Henüz sözleşme kaydı yok." }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="totalCount > rows.length" class="border-t border-tier-highest px-4 py-2 text-[12px] text-ink-muted">
          İlk {{ rows.length }} / {{ totalCount }} sözleşme yüklendi.
        </p>
      </div>

      <!-- Sözleşmesi olmayanlar -->
      <div v-else>
        <p class="border-b border-tier-highest bg-tier-low px-4 py-2 text-[12px] text-ink-muted">
          Cari kodu <b class="font-mono">320</b> ile başlayan, son 12 ayda alış cirosu olan ama sözleşmesi bulunmayan tedarikçiler.
          <template v-if="uncontractedState === 'ready'"> <b>{{ uncontracted.length }}</b> tedarikçi · <b>{{ formatMoney(uncontractedTurnover) }}</b> ciro.</template>
        </p>
        <div v-if="uncontractedState === 'pending'" class="p-4">
          <PendingApiNotice message="Sözleşmesi olmayan tedarikçi listesi henüz devreye alınmadı (BEKLEYEN_API madde 18). Yeni Sözleşme ile tedarikçiyi elle seçebilirsiniz." />
        </div>
        <p v-else-if="uncontractedState === 'error'" class="p-6 text-center text-sm text-ink-muted">
          Liste yüklenemedi. <button type="button" class="underline" @click="loadUncontracted">Tekrar dene</button>
        </p>
        <p v-else-if="uncontractedState === 'loading'" class="p-6 text-center text-sm text-ink-muted">Yükleniyor...</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr class="border-b border-tier-highest bg-tier-low text-left font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                <th class="px-3 py-2 font-medium">Tedarikçi</th>
                <th class="px-3 py-2 text-right font-medium">Ciro · son 12 ay</th>
                <th class="px-3 py-2 text-right font-medium">Fatura</th>
                <th class="px-3 py-2 font-medium">Son Alış</th>
                <th class="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in visibleUncontracted" :key="item.code" class="border-b border-tier-highest/60">
                <td class="px-3 py-2">
                  <div class="font-medium text-ink">{{ item.title ?? "—" }}</div>
                  <div class="font-mono text-[12px] text-ink-muted">{{ item.code }}<template v-if="item.representativeName"> · <span class="font-sans">{{ item.representativeName }}</span></template></div>
                </td>
                <td class="px-3 py-2 text-right font-mono font-semibold tabular-nums">{{ formatMoney(item.turnover) }}</td>
                <td class="px-3 py-2 text-right font-mono tabular-nums">{{ item.invoiceCount }}</td>
                <td class="px-3 py-2 font-mono tabular-nums">{{ formatDate(item.lastPurchaseDate) }}</td>
                <td class="px-3 py-2 text-right">
                  <Button v-if="canCreate" size="sm" @click="addFor(item)"><Plus class="size-3.5" />Sözleşme Ekle</Button>
                </td>
              </tr>
              <tr v-if="!visibleUncontracted.length">
                <td colspan="5" class="py-8 text-center text-ink-muted">{{ uncontracted.length ? "Kayıt bulunamadı." : "Tüm tedarikçilerin sözleşmesi var." }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
    </main>
  </div>
</template>
