// Sunum prototipi verisi (backend yok). Tedarikçi adı, cari kodu, temsilci, marka, ürün, alış iskontosu,
// ödeme planı (→ alış vadesi) ve sözleşme tarihi MikroDesktop_TIMON'daki gerçek kayıtlardan alındı
// (SATINALMA_SARTLARI, CARI_HESAPLAR, STOKLAR). Satış iskontosu, satış vadesi, primler, nakliye, iskonto
// grubu ve satış şartı sunum içindir; veritabanında karşılığı yoktur.

import type { ErpSupplierContractListItem, ErpUncontractedSupplier } from "~/utils/supplierContractTypes";
import {
  DISCOUNT_GROUPS,
  emptyTerms,
  newFreight,
  newScope,
  type ScopeKind,
  type SupplierContractTerms,
} from "~/utils/supplierContractTerms";

/** Fiyat Yönetimi şartında olup sözleşmede eksik olan alanlar (sözleşmeye eklenenler). */
export interface Extra {
  campaignDiscount: number | null;
  shippingDiscount: number | null;
  defectiveBudget: number | null;
  hasReturnRight: boolean;
  /** Satış şartı: liste + iskonto kodu açılışta seçilir, sonra değişmez. */
  salesListNo: string;
  salesDiscountCode: string;
  pricingMode: "manual" | "equal" | "markup";
  markup: number | null;
  isFair: boolean;
  depotNo: string;
  projectCode: string;
  bonusPeriods: { turnover: string; staff: string };
}

export const newExtra = (): Extra => ({
  campaignDiscount: null,
  shippingDiscount: null,
  defectiveBudget: null,
  hasReturnRight: false,
  salesListNo: "",
  salesDiscountCode: "",
  pricingMode: "manual",
  markup: null,
  isFair: false,
  depotNo: "",
  projectCode: "",
  bonusPeriods: { turnover: "Quarterly", staff: "Monthly" },
});

export interface ProtoContract {
  terms: SupplierContractTerms;
  extra: Extra;
}

export interface ProtoSupplier {
  code: string;
  title: string;
  representative: string;
  planNo: number;
  planName: string;
  contractDate: string;
  brands: { code: string; name: string; discounts: [number | null, number | null] }[];
  productGroups: { code: string; name: string }[];
  contracts: ProtoContract[];
}

type Raw = Omit<ProtoSupplier, "planName" | "contracts">;

// Gerçek kayıtlar (MikroDesktop_TIMON). Marka iskontoları, aktif şart satırlarının ortalamasıdır.
const RAW: Raw[] = [
  {
    code: "320.34.0011", title: "DİLMAN KIRTASİYE MATBAACILIK TİC. İTH. İHR. LTD. ŞTİ.", representative: "AHMET ERİŞ",
    planNo: 8, contractDate: "2021-11-24",
    brands: [{ code: "DİLMAN", name: "Dilman Kırtasiye", discounts: [10.18, 0.09] }],
    productGroups: [{ code: "DEFTER", name: "Defter" }, { code: "FON KARTONU", name: "Fon Kartonu" }],
  },
  {
    code: "320.00.001546", title: "ABKA KIRTASİYE VE AMB. SAN. TİC. A.Ş.", representative: "AHMET ERİŞ",
    planNo: 1, contractDate: "2026-05-04",
    brands: [{ code: "ABKA", name: "Abka Kırtasiye ve Ambalaj", discounts: [5, null] }],
    productGroups: [{ code: "KITAP KABI", name: "Kitap Kabı" }, { code: "PROJE ÇANTASI", name: "Proje Çantası" }],
  },
  {
    code: "320.00.001353", title: "ÇALKAN PLASTİK SAN. VE TİC. LTD. ŞTİ.", representative: "İBRAHİM YILDIZ",
    planNo: 1, contractDate: "2026-04-07",
    brands: [{ code: "ÇALKAN", name: "Çalkan Plastik", discounts: [0.88, null] }],
    productGroups: [{ code: "STAND OYUNCAK", name: "Stand Oyuncak" }, { code: "ARABA OYUNCAK", name: "Araba Oyuncak" }],
  },
  {
    code: "320.00.001622", title: "BERRA KAYA - MAKS İLETİŞİM HİZMETLERİ", representative: "MUHAMMET ÖZDEMİR",
    planNo: 1, contractDate: "2026-04-08",
    brands: [{ code: "AURiS", name: "Auris Subzero", discounts: [8.33, null] }],
    productGroups: [{ code: "KLAVYE", name: "Klavye" }, { code: "TELEFON TUTUCU", name: "Telefon Tutucu" }],
  },
  {
    code: "320.34.0430", title: "MEHTAP MUTFAK EŞYALARI A.Ş.", representative: "ALİ CEYHUN ARDUÇ",
    planNo: 8, contractDate: "2025-09-27",
    brands: [{ code: "MEHTAP", name: "Mehtap Mutfak Eşyaları", discounts: [0.09, null] }],
    productGroups: [{ code: "TENCERE", name: "Tencere" }, { code: "TAVA", name: "Tava" }],
  },
  {
    code: "320.63.18", title: "PRESTİJ İMA. OY. İTH. İHR. SAN. TİC. LTD. ŞTİ.", representative: "İBRAHİM YILDIZ",
    planNo: 1, contractDate: "2023-12-25",
    brands: [{ code: "PRESTİJ", name: "Prestij Oyuncak", discounts: [20, null] }],
    productGroups: [{ code: "PILLI OYUNCAK", name: "Pilli Oyuncak" }, { code: "KARTELALI OYUNCAK", name: "Kartelalı Oyuncak" }],
  },
  {
    code: "320.00.000088", title: "AVRASYA KIRT. VE OYUNCAK SAN. TİC. A.Ş", representative: "AHMET ERİŞ",
    planNo: 8, contractDate: "2026-01-06",
    brands: [{ code: "LETS", name: "Lets Have Fun / Avrasya Kırtasiye", discounts: [8, null] }],
    productGroups: [{ code: "PARMAK BOYASI", name: "Parmak Boyası" }, { code: "BOYA SETI", name: "Boya Seti" }],
  },
  {
    code: "320.34.0048", title: "MAHMUTOĞLU ELEKTRONİK SAN. VE TİC. LTD. ŞTİ.", representative: "MUHAMMET ÖZDEMİR",
    planNo: 8, contractDate: "2026-03-31",
    brands: [
      { code: "AVEC", name: "Avec Teknoloji", discounts: [12.5, null] },
      { code: "PANTHER", name: "Panther / Mahmutoğlu Elektronik", discounts: [12.5, null] },
      { code: "ALMERA", name: "Almera", discounts: [11.11, null] },
    ],
    productGroups: [{ code: "SINEK ÖLDÜRÜCÜ", name: "Sinek Öldürücü" }, { code: "IŞIKLI ÜRÜNLER", name: "Işıklı Ürünler" }],
  },
  {
    code: "320.00.000153", title: "SİNBO ELEK. EV ALET. PAZ. VE TİC. A. Ş.", representative: "MUHAMMET ÖZDEMİR",
    planNo: 8, contractDate: "2026-04-07",
    brands: [{ code: "SİNBO", name: "Sinbo Küçük Ev Aletleri", discounts: [4.05, 0.24] }],
    productGroups: [{ code: "VANTILATÖR", name: "Vantilatör" }, { code: "ISITICI", name: "Isıtıcı" }],
  },
  {
    code: "320.00.000185", title: "CEREN İTHALAT VE DAĞ. A.Ş", representative: "AHMET ERİŞ",
    planNo: 8, contractDate: "2026-01-29",
    brands: [
      { code: "B&D", name: "Bear & Dear / Ceren Kırtasiye", discounts: [7, null] },
      { code: "CEO", name: "Ceo Plus / Ceren Kırtasiye", discounts: [7, null] },
      { code: "CEOART", name: "Ceo Art / Ceren Kırtasiye", discounts: [7, null] },
    ],
    productGroups: [{ code: "KALEM ÇANTASI", name: "Kalem Çantası" }, { code: "KALEMKUTU", name: "Kalemkutu" }],
  },
];

// ── Sunum için kurgulanan şartlar (veritabanında yok) ─────────────────────────────────
const SALES_DISCOUNT = [3, 0, 0, 2, 0, 8, 2, 5, 0, 3];
const SALES_DAYS = [30, 45, 60, 30, 45, 60, 30, 45, 60, 30];
const YEAR_END = [2, null, 1, null, 1.5, null, 2, 1, null, 2];
const PLAN_NAMES: Record<number, string> = { 1: "PEŞİN", 8: "180 GÜN" };

const buildContract = (index: number, raw: Raw, kind: ScopeKind, brandIndex: number): ProtoContract => {
  const terms = emptyTerms();
  const scope = newScope(kind);
  const brand = raw.brands[brandIndex]!;
  if (kind === "brand") {
    scope.brandCode = brand.code;
    scope.brandName = brand.name;
  }
  scope.discounts = [brand.discounts[0] || null, brand.discounts[1] || null, null, null];
  scope.salesDiscount = SALES_DISCOUNT[index]!;
  scope.yearEndBonus = { tiered: false, rate: YEAR_END[index] ?? null, tiers: [] };
  scope.turnoverBonus = index % 2 === 0
    ? { tiered: true, rate: null, tiers: [{ threshold: 2_000_000, rate: 1 }, { threshold: 5_000_000, rate: 1.5 }] }
    : { tiered: false, rate: null, tiers: [] };
  terms.scopes = [scope];
  terms.discountGroup = DISCOUNT_GROUPS[index % DISCOUNT_GROUPS.length]!;
  terms.purchaseDue = { kind: "days", days: raw.planNo === 8 ? 180 : 0, date: null };
  terms.salesDue = { kind: "days", days: SALES_DAYS[index]!, date: null };
  terms.freights = [{ ...newFreight("all"), delivery: index % 2 ? "warehouse" : "dropship", freight: index % 2 ? "excluded" : "included" }];

  const extra = newExtra();
  extra.salesListNo = "2";
  extra.salesDiscountCode = "NET";
  extra.pricingMode = index % 3 === 0 ? "manual" : index % 3 === 1 ? "equal" : "markup";
  extra.markup = extra.pricingMode === "markup" ? 12 : null;
  extra.campaignDiscount = index % 4 === 0 ? 2 : null;
  extra.defectiveBudget = index % 2 === 0 ? 1 : null;
  extra.hasReturnRight = index % 2 === 0;
  if (index % 2) extra.shippingDiscount = 3;
  return { terms, extra };
};

export const PROTO_SUPPLIERS: ProtoSupplier[] = RAW.map((raw, index) => ({
  ...raw,
  planName: PLAN_NAMES[raw.planNo] ?? String(raw.planNo),
  // İlk marka "Diğer ürünler" (genel) sözleşmesidir; diğer markalar kendi sözleşmesini alır.
  contracts: [
    buildContract(index, raw, "all", 0),
    ...raw.brands.slice(1).map((_, brandIndex) => buildContract(index, raw, "brand", brandIndex + 1)),
  ],
}));

/** Sözleşmesi olmayan tedarikçiler: son 12 ay alış faturası var, aktif şartı yok (gerçek kayıt). */
export const PROTO_UNCONTRACTED: ErpUncontractedSupplier[] = [
  { code: "320.00.001473", title: "RSS LAV METAL MUTFAK SAN. TİC. LTD. ŞTİ.", representativeName: "ALİ CEYHUN ARDUÇ", turnover: 3537243, invoiceCount: 18, lastPurchaseDate: "2026-01-28" },
  { code: "320.00.001317", title: "İNTERLİFE PLASTİK SAN. TİC. LTD. ŞTİ.", representativeName: "ALİ CEYHUN ARDUÇ", turnover: 920400, invoiceCount: 1, lastPurchaseDate: "2026-03-02" },
  { code: "320.00.001602", title: "HİCH DIŞ TİCARET İTH.VE İHR. LTD.ŞTİ.", representativeName: "MUHAMMET ÖZDEMİR", turnover: 424950, invoiceCount: 2, lastPurchaseDate: "2026-04-15" },
  { code: "320.00.001544", title: "BARONESS İÇ VE DIŞ TİC.LTD.ŞTİ.", representativeName: "EYÜP ÖMER YILMAZ", turnover: 76123, invoiceCount: 1, lastPurchaseDate: "2025-12-02" },
  { code: "320.00.001549", title: "AKKAN AYDINLATMA VE KAUÇUK SAN. VE TİC. LTD. ŞTİ.", representativeName: "EYÜP ÖMER YILMAZ", turnover: 53000, invoiceCount: 1, lastPurchaseDate: "2025-12-08" },
];

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

// ── Kaydedilen sözleşmeler (yalnız bu tarayıcıda, localStorage) ───────────────────────
// Anahtar: "cari|fuar" (fuarsız genel sözleşmeler için "cari|"). Böylece her fuarın ve her
// kapsamın şartları birbirinden farklı kalır; sayfa değişince örnek veriye dönmez.
const STORAGE_KEY = "supplier-contract-prototype:v1";
type SavedMap = Record<string, ProtoContract[]>;
const readSaved = (): SavedMap => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SavedMap;
  } catch {
    return {};
  }
};
export const getSavedContracts = (supplier: string, fair: string): ProtoContract[] | undefined =>
  readSaved()[`${supplier}|${fair}`];
export const saveContracts = (supplier: string, fair: string, contracts: ProtoContract[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), [`${supplier}|${fair}`]: contracts }));
  } catch {
    // Tarayıcı depolamayı engelliyorsa kayıt bu oturumla sınırlı kalır.
  }
};
export const resetSavedContracts = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // yok say
  }
};

/**
 * Liste satırları: bir tedarikçinin tüm kapsam sözleşmeleri tek `terms` altında toplanır
 * (ilk sözleşmenin vade/nakliye şartlarıyla; kapsamlar sırayla).
 */
export const protoListItems = (): ErpSupplierContractListItem[] =>
  PROTO_SUPPLIERS.map((supplier, index) => {
    const contracts = getSavedContracts(supplier.code, "") ?? supplier.contracts;
    const terms = copy(contracts[0]!.terms);
    terms.scopes = contracts.flatMap((contract) => copy(contract.terms.scopes));
    return {
      id: supplier.code,
      legacyId: index + 1,
      supplierCode: supplier.code,
      supplierTitle: supplier.title,
      supplierName: supplier.title,
      representativeCode: null,
      representativeName: supplier.representative,
      contractDate: supplier.contractDate,
      paymentPlanNo: supplier.planNo,
      paymentPlanName: supplier.planName,
      leadTimeDays: null,
      paymentBonusRate: null,
      freightIncluded: terms.freights[0]?.freight === "included",
      bonusTierCount: 0,
      marketingSupportCount: 0,
      createdAt: supplier.contractDate,
      version: null,
      terms,
    };
  });
