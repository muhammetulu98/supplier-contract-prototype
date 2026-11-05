<script setup lang="ts">
// Vade girişi: gün sayısı ya da tarih (tarih → bugünden kalan gün; supplierContractTerms.dueDays).
import type { DueTerm } from "~/utils/supplierContractTerms";

const due = defineModel<DueTerm>({ required: true });
defineProps<{ label: string; disabled?: boolean; invalid?: boolean; id: string }>();

const setDays = (value: string | number | null | undefined) => {
  const parsed = parseDecimal(value);
  due.value.days = parsed === null ? null : Math.max(0, Math.round(parsed));
};
</script>

<template>
  <div class="space-y-1.5">
    <Label :for="id">{{ label }}</Label>
    <div class="flex gap-1.5">
      <Select v-model="due.kind" :disabled="disabled">
        <SelectTrigger class="w-24" :aria-label="`${label} tipi`"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="days">Gün</SelectItem>
          <SelectItem value="date">Tarih</SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-if="due.kind === 'days'"
        :id="id"
        :model-value="due.days ?? ''"
        class="flex-1 text-right font-mono"
        inputmode="numeric"
        placeholder="0"
        :disabled="disabled"
        :aria-invalid="invalid"
        @update:model-value="setDays"
      />
      <Input
        v-else
        :id="id"
        :model-value="due.date ?? ''"
        class="flex-1 font-mono"
        type="date"
        :disabled="disabled"
        :aria-invalid="invalid"
        @update:model-value="due.date = String($event) || null"
      />
    </div>
  </div>
</template>
