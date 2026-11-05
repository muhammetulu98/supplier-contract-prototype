# Tedarikçi Sözleşmesi Prototipi

Tedarikçi Sözleşmeleri ekranının sunum prototipi. Backend yoktur; tüm veri sayfaların içindedir ve **Kaydet hiçbir şey göndermez**.

## Çalıştırma

```bash
pnpm install
pnpm dev        # http://localhost:3007
```

Giriş: `/prototype/supplier-contracts` (liste). Bir satıra tıklayınca `/prototype/supplier-contract` açılır ve o tedarikçinin sözleşmeleri gelir.

## Sayfalar

| Yol | Dosya |
|---|---|
| `/prototype/supplier-contracts` | `app/pages/prototype/supplier-contracts.vue` (liste) |
| `/prototype/supplier-contract?supplier=<cari kodu>` | `app/pages/prototype/supplier-contract.vue` (sözleşme ekranı) |

## Veri

`app/utils/prototypeSupplierContracts.ts`

- **Gerçek (MikroDesktop_TIMON):** tedarikçi unvanı, cari kodu, temsilci, marka, örnek ürünler, alış iskontosu, ödeme planı (alış vadesi), sözleşme tarihi.
- **Kurgu (sunum için):** satış iskontosu, satış vadesi, primler, nakliye, iskonto grubu, satış şartı, fuar örneği.

Net karlılık `app/utils/supplierContractTerms.ts` içindeki fonksiyonla hesaplanır.
