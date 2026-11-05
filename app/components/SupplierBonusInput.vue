<script setup lang="ts">
// Prim girişi: düz oran ya da ciro baremleri (gerçekleşen ciro ≥ eşik → oran). Net karlılıkta
// baremlinin en üst oranı alınır (supplierContractTerms.bonusRate).
import { Plus, X } from "lucide-vue-next";
import type { Bonus } from "~/utils/supplierContractTerms";

const bonus = defineModel<Bonus>({ required: true });
defineProps<{ label: string; disabled?: boolean; idPrefix: string }>();

// Ortak ayrıştırıcı: ciro eşiği "1.000.000" yazılınca NaN değil bir milyon okunur.
const numberOrNull = (value: string | number | null | undefined) => parseDecimal(value);
const addTier = () => {
  bonus.value.tiers.push({ threshold: null, rate: null });
};
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-3">
      <span class="min-w-32 text-[13px] font-medium text-ink">{{ label }}</span>
      <label class="flex items-center gap-1.5 text-[12px] text-ink-muted">
        <Checkbox v-model="bonus.tiered" :disabled="disabled" :aria-label="`${label} baremli`" />
        Baremli
      </label>
      <Input
        v-if="!bonus.tiered"
        :id="`${idPrefix}-rate`"
        :model-value="bonus.rate ?? ''"
        class="h-8 w-28 text-right font-mono"
        inputmode="decimal"
        placeholder="Oran %"
        :disabled="disabled"
        :aria-label="`${label} oranı`"
        @update:model-value="bonus.rate = numberOrNull($event)"
      />
      <!-- İsteğe bağlı ek alan (ör. prim dönemi): oranın yanında durur. -->
      <slot />
    </div>
    <div v-if="bonus.tiered" class="space-y-1.5 border-l-2 border-tier-highest pl-3">
      <div v-for="(tier, index) in bonus.tiers" :key="index" class="flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
        <span>Gerçekleşen ciro ≥</span>
        <Input
          :model-value="tier.threshold ?? ''"
          class="h-8 w-36 text-right font-mono"
          inputmode="decimal"
          placeholder="₺"
          :disabled="disabled"
          :aria-label="`${label} barem ${index + 1} eşik`"
          @update:model-value="tier.threshold = numberOrNull($event)"
        />
        <span>ise</span>
        <Input
          :model-value="tier.rate ?? ''"
          class="h-8 w-20 text-right font-mono"
          inputmode="decimal"
          placeholder="%"
          :disabled="disabled"
          :aria-label="`${label} barem ${index + 1} oran`"
          @update:model-value="tier.rate = numberOrNull($event)"
        />
        <Button v-if="!disabled" type="button" variant="ghost" size="sm" :aria-label="`Barem ${index + 1} sil`" @click="bonus.tiers.splice(index, 1)">
          <X class="size-3.5" />
        </Button>
      </div>
      <Button v-if="!disabled" type="button" variant="secondary" size="sm" @click="addTier"><Plus class="size-3.5" />Barem ekle</Button>
    </div>
  </div>
</template>
