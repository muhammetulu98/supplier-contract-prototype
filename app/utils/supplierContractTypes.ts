// Prototip tipleri — gerçek uygulamadaki useErpSupplierContracts'tan alınan iki arayüz.
import type { SupplierContractTerms } from "~/utils/supplierContractTerms";

export interface ErpSupplierContractListItem {
  id: string;
  legacyId: number;
  supplierCode: string | null;
  supplierTitle: string | null;
  supplierName: string | null;
  representativeCode: string | null;
  representativeName: string | null;
  contractDate: string | null;
  paymentPlanNo: number | null;
  paymentPlanName: string | null;
  leadTimeDays: number | null;
  paymentBonusRate: number | null;
  freightIncluded: boolean;
  bonusTierCount: number;
  marketingSupportCount: number;
  createdAt: string | null;
  version: string | null;
  /**
   * Ticari şartlar (kapsam/iskonto, vade, nakliye, prim) — BEKLEYEN_API madde 18. Uç henüz
   * döndürmüyor: `undefined`/`null` iken listede "Şart girilmedi" gösterilir.
   */
  terms?: SupplierContractTerms | null;
}

/** Sözleşmesi olmayan tedarikçi (320'li cari, son 12 ayda alış cirosu > 0). */
export interface ErpUncontractedSupplier {
  code: string;
  title: string | null;
  representativeName: string | null;
  /** Son 12 ay alış cirosu, ₺. */
  turnover: number;
  invoiceCount: number;
  lastPurchaseDate: string | null;
}
