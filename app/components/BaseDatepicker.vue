<script setup lang="ts">
import type { DateValue } from "@internationalized/date"
import type { HTMLAttributes } from "vue"
import { parseDate } from "@internationalized/date"
import { Calendar as CalendarIcon, X } from "lucide-vue-next"
import { computed } from "vue"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/utils"

interface Props {
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  min?: string
  max?: string
  class?: HTMLAttributes["class"]
  contentClass?: HTMLAttributes["class"]
  size?: "sm" | "default"
  /** When true the trigger renders just an icon + value (no input chrome). */
  ghost?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "gg.aa.yyyy",
  disabled: false,
  clearable: true,
  size: "default",
  ghost: false,
})

const emits = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const isoToDateValue = (iso?: string | null): DateValue | undefined => {
  if (!iso) return undefined
  const trimmed = iso.length >= 10 ? iso.slice(0, 10) : iso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined
  try {
    return parseDate(trimmed)
  } catch {
    return undefined
  }
}

const dateValueToIso = (date?: DateValue) => {
  if (!date) return ""
  const y = String(date.year).padStart(4, "0")
  const m = String(date.month).padStart(2, "0")
  const d = String(date.day).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const internal = computed<DateValue | undefined>({
  get: () => isoToDateValue(props.modelValue),
  set: (value) => emits("update:modelValue", dateValueToIso(value)),
})

const minDate = computed(() => isoToDateValue(props.min))
const maxDate = computed(() => isoToDateValue(props.max))

const displayValue = computed(() => {
  const dv = internal.value
  if (!dv) return ""
  const d = String(dv.day).padStart(2, "0")
  const m = String(dv.month).padStart(2, "0")
  return `${d}.${m}.${dv.year}`
})

const clear = (event: Event) => {
  event.stopPropagation()
  emits("update:modelValue", "")
}

const triggerClass = computed(() =>
  props.ghost
    ? "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-700 hover:bg-ink-50"
    : cn(
        "group inline-flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm",
        "ring-offset-background transition-colors duration-150",
        "hover:border-ring/40",
        "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        props.size === "sm" ? "h-9" : "h-10",
      ),
)
</script>

<template>
  <Popover>
    <PopoverTrigger as-child :disabled="disabled">
      <button
        type="button"
        :disabled="disabled"
        :class="cn(triggerClass, props.class)"
        :aria-label="placeholder"
      >
        <span :class="cn('flex items-center gap-2 truncate text-left', displayValue ? 'text-ink-800' : 'text-muted-foreground')">
          <CalendarIcon class="h-4 w-4 shrink-0 text-ink-400" />
          <span class="truncate">{{ displayValue || placeholder }}</span>
        </span>
        <span
          v-if="clearable && displayValue && !disabled"
          class="ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-hidden="true"
          @click="clear"
          @mousedown.prevent
        >
          <X class="h-3.5 w-3.5" />
        </span>
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" :class="cn('w-auto p-0', props.contentClass)">
      <Calendar
        v-model="internal"
        :min-value="minDate"
        :max-value="maxDate"
        :weekday-format="'short'"
        :fixed-weeks="true"
        :locale="'tr-TR'"
      />
    </PopoverContent>
  </Popover>
</template>
