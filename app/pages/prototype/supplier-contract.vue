<script setup lang="ts">
// Tedarikçi sözleşmeleri — yalnız ekran prototipi (frontend, sahte veri, menüsüz).
// Gerçek ekrandan farkları: "Ek Koşullar" (koşul metinleri, ciro primi dilimleri, pazarlama
// destekleri) ve "Genel Primler" kaldırıldı; "Kapsam ve Şartlar" kartı en üste alındı.
// Kaydet hiçbir şey göndermez. Hesap: ~/utils/supplierContractTerms (gerçek ekranla aynı).
import { Plus, Trash2 } from "lucide-vue-next";
import type { CodeLookupOption } from "~/components/CodeLookupField.vue";
import {
  DELIVERY_LABELS,
  DISCOUNT_GROUPS,
  FREIGHT_LABELS,
  dueDays,
  emptyBonus,
  emptyTerms,
  formatPercent,
  freightIssue,
  newFreight,
  newScope,
  scopeIssue,
  scopeLabel,
  scopeSummary,
  termsIssues,
  type Bonus,
  type FreightRule,
  type ScopeKind,
  type SupplierContractTerms,
  type TermScope,
} from "~/utils/supplierContractTerms";
import {
  PROTO_SUPPLIERS,
  PROTO_UNCONTRACTED,
  getSavedContracts,
  newExtra,
  saveContracts,
  type Extra,
} from "~/utils/prototypeSupplierContracts";
import { TURKEY_PROVINCES, TURKEY_REGIONS } from "~/utils/turkeyRegions";

definePageMeta({ layout: false, publicPage: true });
useHead({ title: "Tedarikçi Sözleşmesi (Prototip)" });

// ── Sahte sözlükler ───────────────────────────────────────────────────────────────────
// Cari, marka ve ürün listeleri MikroDesktop_TIMON'daki gerçek kayıtlardan (bkz. prototypeSupplierContracts).
const SUPPLIERS: CodeLookupOption[] = [
  ...PROTO_SUPPLIERS.map((item) => ({ code: item.code, name: item.title })),
  ...PROTO_UNCONTRACTED.map((item) => ({ code: item.code, name: item.title ?? item.code })),
];
const BRANDS: CodeLookupOption[] = PROTO_SUPPLIERS.flatMap((item) => item.brands.map((brand) => ({ code: brand.code, name: brand.name })));
const PRODUCTS: CodeLookupOption[] = PROTO_SUPPLIERS.flatMap((item) => item.products);

const SALES_LISTS: CodeLookupOption[] = [
  { code: "1", name: "Perakende Satış" },
  { code: "2", name: "Toptan Satış" },
  { code: "3", name: "Bayi" },
  { code: "4", name: "Fuar" },
];
const DISCOUNT_CODES: CodeLookupOption[] = [
  { code: "NET", name: "••NET•• (%0)" },
  { code: "D5", name: "%5 İskonto" },
  { code: "D10", name: "%10 İskonto" },
  { code: "D15", name: "%15 İskonto" },
];
const DEPOTS: CodeLookupOption[] = [
  { code: "3", name: "Depo 3" },
  { code: "83", name: "Depo 83" },
];
const PROJECTS: CodeLookupOption[] = [
  { code: "FUAR-2026", name: "Fuar 2026" },
  { code: "INSERT-Q4", name: "Insert Q4" },
];
const FAIRS = [
  { code: "FUAR-2026", name: "Fuar 2026", projectCode: "FUAR-2026" },
  { code: "INSERT-Q4", name: "Insert Q4", projectCode: "INSERT-Q4" },
];
const BONUS_PERIODS = [
  { value: "Monthly", label: "Aylık" },
  { value: "Quarterly", label: "3 Aylık" },
  { value: "Yearly", label: "Yıllık" },
] as const;

// ── Durum ─────────────────────────────────────────────────────────────────────────────
const today = localIsoDate();
const route = useRoute();
const router = useRouter();
const supplierCode = ref("");
const fairCode = ref("");
const contractDate = ref(today);
const showErrors = ref(false);
const savedAt = ref<string | null>(null);

// ── Kapsam = sözleşme ─────────────────────────────────────────────────────────────────
// Her kapsam (tüm ürünler / marka / ürün) AYRI bir sözleşmedir; Fiyat Yönetimi'nde de ayrı bir
// şart olarak açılacaktır. "+ Kapsam ekle" yeni sözleşme açar: "Tüm ürünler" sözleşmesinin
// şartları kopyalanır, kullanıcı yalnız farklı olanı düzeltir (değişen bölüm "Farklı" işaretlenir).
interface StoredContract {
  terms: SupplierContractTerms;
  extra: Extra;
}

// Cari → mevcut sözleşmeleri (kapsam başına bir sözleşme). Cari seçilince hepsi sekme olarak açılır.
const EXISTING: Record<string, StoredContract[]> = Object.fromEntries(
  PROTO_SUPPLIERS.map((item) => [item.code, item.contracts as StoredContract[]]),
);

// Fuara ait girilmiş örnek kayıt: "cari|fuar" → sözleşmeler (ilk tedarikçi için).
const demoFair = (): StoredContract => {
  const contract: StoredContract = JSON.parse(JSON.stringify(PROTO_SUPPLIERS[0]!.contracts[0]));
  contract.terms.scopes[0]!.discounts = [15, 5, null, null];
  contract.terms.scopes[0]!.salesDiscount = 22;
  contract.terms.purchaseDue = { kind: "days", days: 90, date: null };
  contract.extra.salesListNo = "4";
  contract.extra.pricingMode = "equal";
  contract.extra.markup = null;
  contract.extra.depotNo = "3";
  contract.extra.projectCode = "FUAR-2026";
  return contract;
};
const EXISTING_FAIR: Record<string, StoredContract[]> = {
  [`${PROTO_SUPPLIERS[0]!.code}|FUAR-2026`]: [demoFair()],
};

const sections = (t: SupplierContractTerms, yearEnd: Bonus, turnover: Bonus, x: Extra) => ({
  discounts: JSON.stringify([
    t.scopes[0]?.discounts, t.scopes[0]?.salesDiscount,
    x.campaignDiscount, x.defectiveBudget, x.hasReturnRight,
  ]),
  sales: JSON.stringify([x.salesListNo, x.salesDiscountCode, x.pricingMode, x.markup]),
  bonuses: JSON.stringify([yearEnd, turnover, t.staffBonus, x.bonusPeriods]),
  due: JSON.stringify([t.purchaseDue, t.salesDue, t.discountGroup, t.dueNote]),
  freight: JSON.stringify([t.freights.map(({ id: _id, ...rest }) => rest), x.shippingDiscount]),
  erp: JSON.stringify([x.isFair, x.depotNo, x.projectCode]),
});
type Sections = ReturnType<typeof sections>;
const SECTION_LABELS: Record<keyof Sections, string> = {
  discounts: "İskontolar",
  sales: "Satış şartı",
  bonuses: "Primler",
  due: "Vade",
  freight: "Nakliye",
  erp: "ERP hedefi",
};

interface Contract {
  id: string;
  terms: SupplierContractTerms;
  yearEndBonus: Bonus;
  turnoverBonus: Bonus;
  extra: Extra;
  mode: "new" | "inherit" | "edit";
  /** Fuar seçili ama o fuara ait kayıt yok; şartlar genel sözleşmeden getirildi. */
  fromGeneral?: boolean;
  /** Karşılaştırma noktası: mevcut sözleşmede kendisi, kopyada kaynağı; yeni boş sözleşmede yok. */
  baseline: Sections | null;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let contractSeq = 0;
const makeContract = (terms: SupplierContractTerms, mode: Contract["mode"], extra: Extra): Contract => {
  const scope = terms.scopes[0]!;
  terms.scopes = [scope];
  const contract: Contract = {
    id: `contract-${++contractSeq}`,
    terms,
    yearEndBonus: scope.yearEndBonus,
    turnoverBonus: scope.turnoverBonus,
    extra,
    mode,
    baseline: mode === "new" ? null : sections(terms, scope.yearEndBonus, scope.turnoverBonus, extra),
  };
  return contract;
};
const scopeKey = (scope: TermScope) =>
  scope.kind === "all" ? "all" : scope.kind === "brand" ? `brand:${scope.brandCode}` : `product:${scope.productCode}`;

const contracts = ref<Contract[]>([]);
const activeId = ref<string | null>(null);
const cur = computed(() => contracts.value.find((item) => item.id === activeId.value) ?? null);
const EMPTY_TERMS = emptyTerms();

// Aşağıdaki formlar aktif sözleşmeyi bu adlarla okur/yazar.
const terms = computed(() => cur.value?.terms ?? EMPTY_TERMS);
const activeScope = computed(() => terms.value.scopes[0]!);
const bindBonuses = () => {
  if (!cur.value) return;
  activeScope.value.yearEndBonus = cur.value.yearEndBonus;
  activeScope.value.turnoverBonus = cur.value.turnoverBonus;
};
const yearEndBonus = computed<Bonus>({
  get: () => cur.value?.yearEndBonus ?? emptyBonus(),
  set: (value) => { if (cur.value) { cur.value.yearEndBonus = value; bindBonuses(); } },
});
const turnoverBonus = computed<Bonus>({
  get: () => cur.value?.turnoverBonus ?? emptyBonus(),
  set: (value) => { if (cur.value) { cur.value.turnoverBonus = value; bindBonuses(); } },
});
const EMPTY_EXTRA = newExtra();
const extra = computed(() => cur.value?.extra ?? EMPTY_EXTRA);

const changedOf = (contract: Contract) => {
  const set = new Set<keyof Sections>();
  if (!contract.baseline) return set;
  const current = sections(contract.terms, contract.yearEndBonus, contract.turnoverBonus, contract.extra);
  for (const key of Object.keys(current) as (keyof Sections)[]) if (current[key] !== contract.baseline[key]) set.add(key);
  return set;
};
const changed = computed(() => (cur.value ? changedOf(cur.value) : new Set<keyof Sections>()));
const changedLabels = computed(() => [...changed.value].map((key) => SECTION_LABELS[key]));

const fair = computed(() => FAIRS.find((item) => item.code === fairCode.value) ?? null);

// Cari veya fuar değişince sözleşmeler yeniden yüklenir:
//   • fuar yoksa → carinin genel sözleşmeleri,
//   • fuar var ve ona ait kayıt varsa → o kayıt gelir,
//   • fuar var ama kayıt yoksa → genel sözleşmenin şartları getirilir, farklı olanı düzeltilir.
// Kaydedilen sözleşmeler tarayıcıda tutulur; cari veya fuar değişince örnek veriye değil, en son
// kaydedilene (yoksa örnek veriye) dönülür. Kaydedilmemiş değişiklik de cari/fuar değişirken saklanır.
const serialize = () => {
  for (const contract of contracts.value) {
    const scope = contract.terms.scopes[0]!;
    scope.yearEndBonus = contract.yearEndBonus;
    scope.turnoverBonus = contract.turnoverBonus;
  }
  return contracts.value.map((contract) => ({ terms: clone(contract.terms), extra: clone(contract.extra) }));
};
let loadedKey = "";
let loadedSignature = "";
const persist = () => {
  const [code, fairCodeKey] = loadedKey.split("|") as [string, string];
  if (!code || !contracts.value.length) return;
  const data = serialize();
  saveContracts(code, fairCodeKey ?? "", data);
  loadedSignature = JSON.stringify(data);
};
const isDirty = () => !!loadedKey && contracts.value.length > 0 && JSON.stringify(serialize()) !== loadedSignature;

watch([supplierCode, fairCode], () => {
  if (isDirty()) persist();
  showErrors.value = false;
  savedAt.value = null;
  adding.value = false;
  const code = supplierCode.value;
  if (!code) {
    contracts.value = [];
    activeId.value = null;
    loadedKey = "";
    return;
  }
  const info = fair.value;
  const general = getSavedContracts(code, "") ?? EXISTING[code] ?? [];
  const storedFair = info ? (getSavedContracts(code, info.code) ?? EXISTING_FAIR[`${code}|${info.code}`]) : undefined;
  const source = storedFair ?? general;
  const fromGeneral = !!info && !storedFair && general.length > 0;
  const withFair = (value: Extra): Extra => {
    value.isFair = !!info;
    if (info && !value.projectCode) value.projectCode = info.projectCode;
    return value;
  };
  const list = source.map((item) => {
    const contract = makeContract(clone(item.terms), fromGeneral ? "inherit" : "edit", withFair(clone(item.extra)));
    contract.fromGeneral = fromGeneral;
    return contract;
  });
  // "Tüm ürünler" sözleşmesi her zaman vardır ve en başta durur.
  if (!list.some((item) => item.terms.scopes[0]!.kind === "all")) list.unshift(makeContract(emptyTerms(), "new", withFair(newExtra())));
  contracts.value = list;
  activeId.value = list[0]!.id;
  loadedKey = `${code}|${info?.code ?? ""}`;
  loadedSignature = JSON.stringify(serialize());
});

// ── + Kapsam ekle ─────────────────────────────────────────────────────────────────────
const adding = ref(false);
const addKind = ref<"brand" | "product">("brand");
const addBrand = ref("");
const addProduct = ref("");
const canAdd = computed(() => (addKind.value === "brand" ? !!addBrand.value : !!addProduct.value));
const openAdd = () => {
  adding.value = !adding.value;
  addBrand.value = "";
  addProduct.value = "";
};
const addContract = () => {
  if (!canAdd.value) return;
  const kind = addKind.value;
  const key = kind === "brand" ? `brand:${addBrand.value}` : `product:${addProduct.value}`;
  const duplicate = contracts.value.find((item) => scopeKey(item.terms.scopes[0]!) === key);
  if (duplicate) {
    activeId.value = duplicate.id;
    adding.value = false;
    return;
  }
  const base = contracts.value.find((item) => item.terms.scopes[0]!.kind === "all") ?? null;
  const next = base ? clone(base.terms) : emptyTerms();
  const scope = next.scopes[0]!;
  scope.id = `scope-${Date.now().toString(36)}-${contractSeq}`;
  scope.kind = kind;
  scope.brandCode = kind === "brand" ? addBrand.value : null;
  scope.brandName = kind === "brand" ? (BRANDS.find((brand) => brand.code === addBrand.value)?.name ?? null) : null;
  scope.productCode = kind === "product" ? addProduct.value : null;
  scope.productName = kind === "product" ? (PRODUCTS.find((product) => product.code === addProduct.value)?.name ?? null) : null;
  const created = makeContract(next, base ? "inherit" : "new", base ? clone(base.extra) : newExtra());
  contracts.value.push(created);
  activeId.value = created.id;
  adding.value = false;
};
const removeContract = (id: string) => {
  const index = contracts.value.findIndex((item) => item.id === id);
  if (index <= 0) return; // "Tüm ürünler" silinemez
  contracts.value.splice(index, 1);
  if (activeId.value === id) activeId.value = contracts.value[Math.max(0, index - 1)]!.id;
};

// Kapsam eklendiğinde "Tüm ürünler" artık tüm ürünler değildir: marka/ürün kapsamlarında olmayanları kapsar.
const labelOf = (scope: TermScope) =>
  scope.kind === "all" && contracts.value.length > 1 ? "Diğer ürünler" : scopeLabel(scope);
const profitEntries = computed(() =>
  contracts.value.map((contract) => ({
    id: contract.id,
    label: labelOf(contract.terms.scopes[0]!),
    scope: contract.terms.scopes[0]!,
    terms: contract.terms,
  })),
);

// Listeden girince ?supplier=<cari kodu> ile gelir; o carinin sözleşmeleri açılır.
onMounted(() => {
  const requested = String(route.query.supplier ?? "");
  if (requested && SUPPLIERS.some((item) => item.code === requested)) supplierCode.value = requested;
});

const supplierName = computed(() => SUPPLIERS.find((item) => item.code === supplierCode.value)?.name ?? null);
const summaryFor = (scope: TermScope) => scopeSummary(scope, terms.value, today).net;
const purchaseDueMissing = computed(() => dueDays(terms.value.purchaseDue, today) === null);

// ── Nakliye ───────────────────────────────────────────────────────────────────────────
const usedElsewhere = (rule: FreightRule) =>
  new Set(terms.value.freights.filter((other) => other !== rule).flatMap((other) => other.provinces));
const freeProvinces = (rule: FreightRule) => {
  const used = usedElsewhere(rule);
  return TURKEY_PROVINCES.filter((province) => !rule.provinces.includes(province) && !used.has(province));
};
const addProvince = (rule: FreightRule, province: string) => {
  if (province && freeProvinces(rule).includes(province)) rule.provinces.push(province);
};
const addRegion = (rule: FreightRule, region: string) => {
  const free = freeProvinces(rule);
  for (const province of TURKEY_REGIONS[region] ?? []) if (free.includes(province)) rule.provinces.push(province);
};

const numberOrNull = (value: string | number | null | undefined) => parseDecimal(value);

// ── Kaydet (sahte) ────────────────────────────────────────────────────────────────────
const headerIssues = computed(() => (supplierCode.value ? [] : ["Cari seçilmedi."]));
// Her sözleşme tek kapsamlıdır; "Tüm ürünler satırı zorunlu" kuralı yalnız tüm-ürünler sözleşmesine ait.
const allIssues = computed(() => [
  ...headerIssues.value,
  ...contracts.value.flatMap((contract) => {
    const label = labelOf(contract.terms.scopes[0]!);
    const list = termsIssues(contract.terms, today).filter((issue) => !issue.includes("kapsamı silinemez"));
    if (!contract.extra.salesListNo) list.push("Satış fiyat listesi seçilmeli");
    if (contract.extra.pricingMode === "markup" && !(contract.extra.markup && contract.extra.markup > 0)) list.push("Alıştan satış oranı girilmeli");
    if (contract.extra.isFair && (!contract.extra.depotNo || !contract.extra.projectCode)) list.push("Fuar şartı için depo ve proje seçilmeli");
    return list.map((issue) => `${label}: ${issue}`);
  }),
]);

const save = () => {
  showErrors.value = true;
  if (allIssues.value.length) return;
  persist();
  // Kaydedilen sözleşmeler artık "mevcut" sayılır; karşılaştırma noktası kaydedilen hâl olur.
  for (const contract of contracts.value) {
    contract.mode = "edit";
    contract.fromGeneral = false;
    contract.baseline = sections(contract.terms, contract.yearEndBonus, contract.turnoverBonus, contract.extra);
  }
  savedAt.value = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
};

// Sayfadan çıkarken (listeye dön, tarayıcı geri) kaydedilmemiş değişiklik kaybolmasın.
onBeforeUnmount(() => {
  if (isDirty()) persist();
});
</script>

<template>
  <div class="min-h-screen bg-surface">
    <header class="flex h-14 items-center justify-between border-t-[3px] border-t-action bg-graphite px-6 text-white">
      <span class="text-sm font-semibold">{{ supplierCode ? "Tedarikçi Sözleşmesi" : "Yeni Tedarikçi Sözleşmesi" }}</span>
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-white/60">Prototip · kayıt yapılmaz</span>
    </header>

    <main class="mx-auto max-w-[1280px] px-6 py-6">
      <PageHeader :title="supplierCode ? 'Tedarikçi Sözleşmesi' : 'Yeni Tedarikçi Sözleşmesi'" description="Her kapsam ayrı bir sözleşmedir. Yeni kapsamı + ile ekleyin; genel şartlar gelir, yalnız farklı olanı düzeltin. Marka veya ürün kapsamı eklenince genel sözleşme yalnız kalan ürünleri kapsar.">
        <template #actions>
          <Button variant="secondary" type="button" @click="router.push('/prototype/supplier-contracts')">Liste</Button>
          <Button type="button" @click="save">Kaydet</Button>
        </template>
      </PageHeader>

      <div
        v-if="showErrors && allIssues.length"
        class="mb-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700"
        role="alert"
      >
        <strong>{{ allIssues.length }} eksik:</strong> {{ allIssues[0] }}
      </div>
      <div
        v-else-if="savedAt"
        class="mb-4 rounded border border-tier-highest bg-paper px-4 py-3 text-[13px] text-ink"
        role="status"
      >
        Kaydedildi ({{ savedAt }}). Prototipte kayıt yalnız bu tarayıcıda tutulur; cari ve fuar değiştirince bu şartlar geri gelir.
      </div>

      <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-4">
          <!-- Kapsamlar = sözleşmeler: en üstte -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-sm">Sözleşme Kapsamları</CardTitle>
              <CardDescription class="text-[12px]">
                Her kapsam ayrı bir sözleşmedir ve Fiyat Yönetimi'nde ayrı bir şart olarak açılır.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="space-y-1.5 sm:col-span-2">
                  <Label for="p-supplier">Cari</Label>
                  <CodeLookupField
                    id="p-supplier"
                    v-model="supplierCode"
                    :options="SUPPLIERS"
                    placeholder="Cari seçin"
                    search-placeholder="Cari kodu veya unvan ara..."
                  />
                  <p v-if="showErrors && !supplierCode" class="text-[12px] text-destructive">Cari seçilmedi.</p>
                </div>
                <div class="space-y-1.5">
                  <Label>Sözleşme Tarihi</Label>
                  <BaseDatepicker v-model="contractDate" :clearable="false" />
                </div>
                <div class="space-y-1.5">
                  <Label>Fuar</Label>
                  <Select :model-value="fairCode || 'none'" :disabled="!supplierCode" @update:model-value="fairCode = $event === 'none' ? '' : String($event)">
                    <SelectTrigger aria-label="Fuar"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Fuar yok (genel)</SelectItem>
                      <SelectItem v-for="item in FAIRS" :key="item.code" :value="item.code">{{ item.name }}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p v-if="!contracts.length" class="rounded border border-dashed border-tier-highest px-3 py-2 text-[12px] text-ink-muted">
                Önce cari seçin; sözleşmeleri burada kapsam kapsam görünür.
              </p>
              <template v-else>
                <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Sözleşme kapsamları">
                  <div
                    v-for="item in contracts"
                    :key="item.id"
                    class="inline-flex items-center rounded border"
                    :class="item.id === activeId ? 'border-action bg-tier-low' : 'border-tier-highest bg-paper'"
                  >
                    <button
                      type="button"
                      role="tab"
                      :aria-selected="item.id === activeId"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-ink"
                      @click="activeId = item.id"
                    >
                      {{ labelOf(item.terms.scopes[0]!) }}
                      <span v-if="changedOf(item).size" class="size-1.5 rounded-full bg-action" title="Farklı şart var" />
                    </button>
                    <button
                      v-if="item.terms.scopes[0]!.kind !== 'all'"
                      type="button"
                      class="px-2 text-ink-muted hover:text-ink"
                      :aria-label="`${labelOf(item.terms.scopes[0]!)} kapsamını sil`"
                      @click="removeContract(item.id)"
                    >×</button>
                  </div>
                  <Button type="button" variant="secondary" size="sm" @click="openAdd"><Plus class="size-3.5" />Kapsam ekle</Button>
                </div>

                <p v-if="contracts.length > 1" class="text-[12px] text-ink-muted">
                  <strong class="font-medium text-ink">Diğer ürünler:</strong> aşağıdaki marka ve ürün kapsamlarında olmayan tüm ürünler. Bir ürün için önce ürün, sonra marka, sonra diğer ürünler sözleşmesi geçerlidir.
                </p>

                <div v-if="adding" class="grid items-end gap-3 rounded border border-dashed border-tier-highest p-3 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <div class="space-y-1.5">
                    <Label>Kapsam tipi</Label>
                    <Select :model-value="addKind" @update:model-value="addKind = $event as 'brand' | 'product'">
                      <SelectTrigger aria-label="Kapsam tipi"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brand">Marka</SelectItem>
                        <SelectItem value="product">Ürün</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label>{{ addKind === "brand" ? "Marka" : "Ürün" }}</Label>
                    <CodeLookupField
                      v-if="addKind === 'brand'"
                      v-model="addBrand"
                      :options="BRANDS"
                      placeholder="Marka seçin"
                      search-placeholder="Marka kodu veya adı ara..."
                    />
                    <CodeLookupField
                      v-else
                      v-model="addProduct"
                      :options="PRODUCTS"
                      placeholder="Stok seçin"
                      search-placeholder="Stok kodu veya ürün adı..."
                    />
                  </div>
                  <div class="flex gap-2">
                    <Button type="button" size="sm" :disabled="!canAdd" @click="addContract">Ekle</Button>
                    <Button type="button" variant="ghost" size="sm" @click="adding = false">Vazgeç</Button>
                  </div>
                </div>

                <div
                  v-if="cur"
                  class="rounded border px-3 py-2 text-[12px]"
                  :class="cur.mode === 'inherit' ? 'border-action/40 bg-tier-low text-ink' : 'border-tier-highest text-ink'"
                  role="status"
                >
                  <template v-if="cur.mode === 'edit'">
                    <template v-if="fair"><strong>{{ fair.name }}</strong> için girilmiş şartlar getirildi; değişiklikler bu fuarın sözleşmesine yazılır.</template>
                    <template v-else>Mevcut sözleşme; değişiklikler bu kapsamın sözleşmesine yazılır.</template>
                  </template>
                  <template v-else-if="cur.fromGeneral">
                    <strong>{{ fair?.name }}</strong> için girilmiş şart yok — genel sözleşmenin şartları getirildi. Yalnız fuara özel olanı düzeltin.
                  </template>
                  <template v-else-if="cur.mode === 'inherit'">
                    Yeni kapsam — <strong>genel</strong> sözleşmenin şartları getirildi. Yalnız farklı olanı düzeltin.
                  </template>
                  <template v-else>Bu kapsam için sözleşme yok; boş başlıyor.</template>
                  <span v-if="changedLabels.length" class="ml-1 font-medium">· Farklı: {{ changedLabels.join(", ") }}</span>
                </div>
                <p v-if="cur" class="border-l-2 border-tier-highest pl-3 text-[12px] text-ink-muted">
                  Not: Stoklar Fiyat Yönetimi'ne hangi tarihte eklenirse, şartın başlangıç tarihi (sas_basla_tarih) olarak o tarih yazılır.
                </p>
              </template>
            </CardContent>
          </Card>

          <template v-if="cur">
          <!-- Vade -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-sm">Vade<span v-if="changed.has('due')" class="rounded bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">Farklı</span></CardTitle>
              <CardDescription class="text-[12px]">Seçili kapsamın sözleşmesine aittir; vade farkı net karlılığa girer.</CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SupplierDueInput id="p-purchase-due" v-model="terms.purchaseDue" label="Alış Vadesi" :invalid="showErrors && purchaseDueMissing" />
              <SupplierDueInput id="p-sales-due" v-model="terms.salesDue" label="Satış Vadesi" />
              <div class="space-y-1.5">
                <Label for="p-group">İskonto Grubu</Label>
                <Select :model-value="terms.discountGroup ?? ''" @update:model-value="terms.discountGroup = String($event) || null">
                  <SelectTrigger id="p-group"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="group in DISCOUNT_GROUPS" :key="group" :value="group">{{ group }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <Label for="p-due-note">Vade Açıklaması</Label>
                <Input id="p-due-note" :model-value="terms.dueNote ?? ''" maxlength="120" placeholder="En fazla 120 karakter" @update:model-value="terms.dueNote = String($event) || null" />
              </div>
              <p v-if="showErrors && purchaseDueMissing" class="text-[12px] text-destructive sm:col-span-2">Alış vadesi girilmeli.</p>
            </CardContent>
          </Card>

          <!-- İskontolar: seçilen kapsamın -->
          <Card :class="changed.has('discounts') ? 'border-action' : ''">
            <CardHeader class="pb-3">
              <div class="flex flex-wrap items-center gap-2">
                <CardTitle class="text-sm">İskontolar · {{ labelOf(activeScope) }}</CardTitle>
                <span v-if="changed.has('discounts')" class="rounded bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">Farklı</span>
                <span
                  class="ml-auto rounded px-2 py-0.5 font-mono text-[12px] font-semibold tabular-nums"
                  :class="summaryFor(activeScope) < 0 ? 'bg-rose-50 text-rose-700' : 'bg-tier-low text-ink'"
                >Net {{ formatPercent(summaryFor(activeScope)) }}</span>
              </div>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div v-for="(_, slot) in activeScope.discounts" :key="slot" class="space-y-1.5">
                  <Label :for="`scope-d${slot}`">Alış İsk. {{ slot + 1 }} (%)</Label>
                  <Input
                    :id="`scope-d${slot}`"
                    :model-value="activeScope.discounts[slot] ?? ''"
                    class="text-right font-mono"
                    inputmode="decimal"
                    @update:model-value="activeScope.discounts[slot] = numberOrNull($event)"
                  />
                </div>
                <div class="space-y-1.5">
                  <Label for="scope-sales">Satış İsk. (%)</Label>
                  <Input
                    id="scope-sales"
                    :model-value="activeScope.salesDiscount ?? ''"
                    class="text-right font-mono"
                    inputmode="decimal"
                    @update:model-value="activeScope.salesDiscount = numberOrNull($event)"
                  />
                </div>
              </div>
              <div class="grid gap-3 border-t border-tier-highest/60 pt-3 sm:grid-cols-3 lg:grid-cols-4">
                <div class="space-y-1.5">
                  <Label for="x-campaign">Kampanya İsk. (%)</Label>
                  <Input id="x-campaign" :model-value="extra.campaignDiscount ?? ''" class="text-right font-mono" inputmode="decimal" @update:model-value="extra.campaignDiscount = numberOrNull($event)" />
                </div>
                <div class="space-y-1.5">
                  <Label for="x-defective">Bozuk Ürün Bütçesi (%)</Label>
                  <Input id="x-defective" :model-value="extra.defectiveBudget ?? ''" class="text-right font-mono" inputmode="decimal" @update:model-value="extra.defectiveBudget = numberOrNull($event)" />
                </div>
                <label class="flex cursor-pointer items-center gap-2 text-[13px] sm:col-span-2">
                  <Checkbox v-model="extra.hasReturnRight" />İade etme hakkı var
                </label>
              </div>
              <p v-if="showErrors && scopeIssue(activeScope, terms)" class="text-[12px] text-destructive">{{ scopeIssue(activeScope, terms) }}</p>
            </CardContent>
          </Card>

          <!-- Satış şartı: Fiyat Yönetimi'nde satış fiyatının hangi listeye, hangi kodla yazılacağı -->
          <Card :class="changed.has('sales') ? 'border-action' : ''">
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-sm">Satış Şartı<span v-if="changed.has('sales')" class="rounded bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">Farklı</span></CardTitle>
              <CardDescription class="text-[12px]">
                Fiyat Yönetimi'nde bu kapsamın satış fiyatı, seçilen listeye ve iskonto koduyla yazılır. Sözleşme açıldıktan sonra liste değiştirilemez.
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="space-y-1.5">
                <Label>Satış Fiyat Listesi</Label>
                <Select :model-value="extra.salesListNo" @update:model-value="extra.salesListNo = String($event)">
                  <SelectTrigger aria-label="Satış fiyat listesi"><SelectValue placeholder="Liste seçin" /></SelectTrigger>
                  <SelectContent><SelectItem v-for="item in SALES_LISTS" :key="item.code" :value="item.code">{{ item.name }}</SelectItem></SelectContent>
                </Select>
                <p v-if="showErrors && !extra.salesListNo" class="text-[12px] text-destructive">Liste seçilmeli.</p>
              </div>
              <div class="space-y-1.5">
                <Label>İskonto Kodu</Label>
                <Select :model-value="extra.salesDiscountCode" @update:model-value="extra.salesDiscountCode = String($event)">
                  <SelectTrigger aria-label="İskonto kodu"><SelectValue placeholder="Kod seçin" /></SelectTrigger>
                  <SelectContent><SelectItem v-for="item in DISCOUNT_CODES" :key="item.code" :value="item.code">{{ item.name }}</SelectItem></SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>Satış Fiyatı Kuralı</Label>
                <Select
                  :model-value="extra.pricingMode"
                  @update:model-value="extra.pricingMode = $event as Extra['pricingMode']; if (extra.pricingMode !== 'markup') extra.markup = null"
                >
                  <SelectTrigger aria-label="Satış fiyatı kuralı"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Elle girilir</SelectItem>
                    <SelectItem value="equal">Alış = Satış</SelectItem>
                    <SelectItem value="markup">Alıştan %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div v-if="extra.pricingMode === 'markup'" class="space-y-1.5">
                <Label for="x-markup">Alıştan Satış (%)</Label>
                <Input id="x-markup" :model-value="extra.markup ?? ''" class="text-right font-mono" inputmode="decimal" @update:model-value="extra.markup = numberOrNull($event)" />
                <p v-if="showErrors && extra.pricingMode === 'markup' && !(extra.markup && extra.markup > 0)" class="text-[12px] text-destructive">Oran girilmeli.</p>
              </div>
              <p class="text-[12px] text-ink-muted sm:col-span-2 lg:col-span-4">
                {{ extra.pricingMode === "manual" ? "Satış fiyatı her stok satırında elle girilir."
                  : extra.pricingMode === "equal" ? "Satırda yalnız alış fiyatı girilir; satış fiyatı alışa eşit yazılır."
                  : "Satırda yalnız alış fiyatı girilir; satış fiyatı alıştan belirtilen oranda yüksek yazılır." }}
              </p>
            </CardContent>
          </Card>

          <!-- Primler: kapsamdan bağımsız -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-sm">Primler<span v-if="changed.has('bonuses')" class="rounded bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">Farklı</span></CardTitle>
              <CardDescription class="text-[12px]">
                Seçili kapsamın sözleşmesi için geçerlidir. Sene sonu ve ciro primi alış maliyetini düşürür (baremlide en üst barem alınır); personel primi net karlılığa dahil değildir.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <SupplierBonusInput v-model="yearEndBonus" label="Sene Sonu Primi" id-prefix="p-yearend">
                <span class="text-[12px] text-ink-muted">Dönem</span>
                <Select :model-value="extra.bonusPeriods.yearEnd" @update:model-value="extra.bonusPeriods.yearEnd = String($event)">
                  <SelectTrigger class="h-8 w-32" aria-label="Sene sonu primi dönemi"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem v-for="period in BONUS_PERIODS" :key="period.value" :value="period.value">{{ period.label }}</SelectItem></SelectContent>
                </Select>
              </SupplierBonusInput>
              <SupplierBonusInput v-model="turnoverBonus" label="Ciro Primi" id-prefix="p-turnover">
                <span class="text-[12px] text-ink-muted">Dönem</span>
                <Select :model-value="extra.bonusPeriods.turnover" @update:model-value="extra.bonusPeriods.turnover = String($event)">
                  <SelectTrigger class="h-8 w-32" aria-label="Ciro primi dönemi"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem v-for="period in BONUS_PERIODS" :key="period.value" :value="period.value">{{ period.label }}</SelectItem></SelectContent>
                </Select>
              </SupplierBonusInput>
              <SupplierBonusInput v-model="terms.staffBonus" label="Personel Primi" id-prefix="p-staff">
                <span class="text-[12px] text-ink-muted">Dönem</span>
                <Select :model-value="extra.bonusPeriods.staff" @update:model-value="extra.bonusPeriods.staff = String($event)">
                  <SelectTrigger class="h-8 w-32" aria-label="Personel primi dönemi"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem v-for="period in BONUS_PERIODS" :key="period.value" :value="period.value">{{ period.label }}</SelectItem></SelectContent>
                </Select>
              </SupplierBonusInput>
            </CardContent>
          </Card>

          <!-- Nakliye -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-sm">Nakliye Şartları<span v-if="changed.has('freight')" class="rounded bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">Farklı</span></CardTitle>
              <CardDescription class="text-[12px]">Bir il için önce o ilin satırı, yoksa "Tüm iller" satırı geçerlidir. Bir il yalnız bir satırda olabilir.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-for="(rule, index) in terms.freights"
                :key="rule.id"
                class="space-y-3 rounded border p-3"
                :class="showErrors && freightIssue(rule) ? 'border-rose-300' : 'border-tier-highest'"
              >
                <div class="flex items-center gap-2 text-[12px]">
                  <span class="rounded bg-tier px-2 py-0.5 font-medium text-ink">{{ rule.kind === "all" ? "Tüm iller" : "İller" }}</span>
                  <span class="text-ink-muted">{{ rule.kind === "all" ? "listede olmayan diğer tüm iller" : `${rule.provinces.length} il` }}</span>
                  <Button v-if="index > 0" type="button" variant="ghost" size="sm" class="ml-auto" aria-label="Nakliye satırını sil" @click="terms.freights.splice(index, 1)">
                    <Trash2 class="size-4" />
                  </Button>
                </div>
                <div v-if="rule.kind === 'provinces'" class="space-y-2">
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="province in rule.provinces" :key="province" class="inline-flex items-center gap-1 rounded border border-tier-highest bg-tier-low px-2 py-0.5 text-[12px]">
                      {{ province }}
                      <button type="button" class="text-ink-muted hover:text-ink" :aria-label="`${province} çıkar`" @click="rule.provinces.splice(rule.provinces.indexOf(province), 1)">×</button>
                    </span>
                    <span v-if="!rule.provinces.length" class="text-[12px] text-ink-muted">İl seçilmedi</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <select
                      class="h-8 rounded border border-input bg-paper px-2 text-[13px]"
                      aria-label="İl ekle"
                      @change="(event) => { const target = event.target as HTMLSelectElement; addProvince(rule, target.value); target.value = ''; }"
                    >
                      <option value="">İl ekle…</option>
                      <option v-for="province in freeProvinces(rule)" :key="province" :value="province">{{ province }}</option>
                    </select>
                    <Button v-for="(_, region) in TURKEY_REGIONS" :key="region" type="button" variant="secondary" size="sm" @click="addRegion(rule, String(region))">+ {{ region }}</Button>
                    <Button v-if="rule.provinces.length" type="button" variant="ghost" size="sm" @click="rule.provinces = []">Temizle</Button>
                  </div>
                </div>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div class="space-y-1.5">
                    <Label>Teslim</Label>
                    <Select v-model="rule.delivery">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem v-for="(label, key) in DELIVERY_LABELS" :key="key" :value="key">{{ label }}</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label>Nakliye</Label>
                    <Select v-model="rule.freight">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem v-for="(label, key) in FREIGHT_LABELS" :key="key" :value="key">{{ label }}</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label>Barem</Label>
                    <Select :model-value="rule.tiered ? 'tiered' : 'flat'" @update:model-value="rule.tiered = $event === 'tiered'; if (!rule.tiered) rule.minOrderAmount = null">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="flat">Baremsiz</SelectItem><SelectItem value="tiered">Baremli</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label :for="`freight-amount-${rule.id}`">Sipariş Tutarı (₺)</Label>
                    <Input
                      :id="`freight-amount-${rule.id}`"
                      :model-value="rule.minOrderAmount ?? ''"
                      class="text-right font-mono"
                      inputmode="decimal"
                      placeholder="₺"
                      :disabled="!rule.tiered"
                      @update:model-value="rule.minOrderAmount = numberOrNull($event)"
                    />
                  </div>
                </div>
                <p v-if="showErrors && freightIssue(rule)" class="text-[12px] text-destructive">{{ freightIssue(rule) }}</p>
              </div>
              <Button type="button" variant="secondary" size="sm" @click="terms.freights.push(newFreight('provinces'))"><Plus class="size-3.5" />İl bazlı nakliye</Button>
              <div v-if="terms.freights.some((rule) => rule.freight === 'excluded')" class="max-w-[220px] space-y-1.5 border-t border-tier-highest/60 pt-3">
                <Label for="x-shipping">Nakliye İskontosu (%)</Label>
                <Input id="x-shipping" :model-value="extra.shippingDiscount ?? ''" class="text-right font-mono" inputmode="decimal" @update:model-value="extra.shippingDiscount = numberOrNull($event)" />
                <p class="text-[12px] text-ink-muted">Nakliye hariç satırlar için geçerli.</p>
              </div>
            </CardContent>
          </Card>

          <!-- ERP hedefi -->
          <Card v-if="fair" :class="changed.has('erp') ? 'border-action' : ''">
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-sm">ERP Hedefi<span v-if="changed.has('erp')" class="rounded bg-action/10 px-2 py-0.5 text-[11px] font-medium text-action">Farklı</span></CardTitle>
              <CardDescription class="text-[12px]">Seçili fuarın Fiyat Yönetimi şartı Mikro'ya hangi depo ve proje ile yazılacak.</CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <p class="text-[13px] sm:col-span-2 lg:col-span-4">Fuar: <strong>{{ fair?.name }}</strong> — depo ve proje zorunludur.</p>
              <div class="space-y-1.5">
                <Label>Depo<span v-if="extra.isFair" class="text-destructive"> *</span></Label>
                <Select :model-value="extra.depotNo" @update:model-value="extra.depotNo = String($event)">
                  <SelectTrigger aria-label="Depo"><SelectValue placeholder="Depo seçin" /></SelectTrigger>
                  <SelectContent><SelectItem v-for="item in DEPOTS" :key="item.code" :value="item.code">{{ item.name }}</SelectItem></SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label>Proje<span v-if="extra.isFair" class="text-destructive"> *</span></Label>
                <Select :model-value="extra.projectCode" @update:model-value="extra.projectCode = String($event)">
                  <SelectTrigger aria-label="Proje"><SelectValue placeholder="Proje seçin" /></SelectTrigger>
                  <SelectContent><SelectItem v-for="item in PROJECTS" :key="item.code" :value="item.code">{{ item.name }}</SelectItem></SelectContent>
                </Select>
              </div>
              <p v-if="showErrors && extra.isFair && (!extra.depotNo || !extra.projectCode)" class="text-[12px] text-destructive sm:col-span-2">Fuar şartı için depo ve proje seçilmeli.</p>
            </CardContent>
          </Card>
          </template>
        </div>

        <SupplierContractProfitPanel class="xl:sticky xl:top-4" :terms="terms" :today="today" :entries="profitEntries" :active-id="activeId" />
      </div>
    </main>
  </div>
</template>
