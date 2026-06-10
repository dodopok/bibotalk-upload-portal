<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  suggestions?: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [tags: string[]] }>()

const draft = ref('')

const filtered = computed(() => {
  const q = draft.value.trim().toLowerCase()
  if (!q) return []
  return (props.suggestions ?? [])
    .filter(s => s.toLowerCase().includes(q) && !props.modelValue.includes(s))
    .slice(0, 6)
})

// mais usadas (a API já retorna ordenado por contagem), fora as já escolhidas
const quickPicks = computed(() => {
  const chosen = new Set(props.modelValue.map(t => t.toLowerCase()))
  return (props.suggestions ?? [])
    .filter(s => !chosen.has(s.toLowerCase()))
    .slice(0, 16)
})

function add(tag: string) {
  const clean = tag.trim()
  if (!clean) return
  if (!props.modelValue.some(t => t.toLowerCase() === clean.toLowerCase())) {
    emit('update:modelValue', [...props.modelValue, clean])
  }
  draft.value = ''
}

function remove(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    add(draft.value)
  } else if (e.key === 'Backspace' && !draft.value && props.modelValue.length) {
    remove(props.modelValue.length - 1)
  }
}
</script>

<template>
  <div class="tags">
    <div class="tags__field input">
      <span v-for="(tag, i) in modelValue" :key="tag" class="tags__chip mono">
        {{ tag }}
        <button type="button" class="tags__x" :aria-label="`Remover ${tag}`" @click="remove(i)">×</button>
      </span>
      <input
        v-model="draft"
        class="tags__input"
        type="text"
        placeholder="Digite e aperte Enter"
        @keydown="onKeydown"
        @blur="add(draft)"
      >
    </div>
    <div v-if="filtered.length" class="tags__suggestions">
      <button
        v-for="s in filtered"
        :key="s"
        type="button"
        class="tags__suggestion mono"
        @mousedown.prevent="add(s)"
      >
        {{ s }}
      </button>
    </div>

    <div v-else-if="quickPicks.length" class="tags__quick">
      <span class="tags__quick-label mono">mais usadas — clique pra adicionar</span>
      <div class="tags__suggestions">
        <button
          v-for="s in quickPicks"
          :key="s"
          type="button"
          class="tags__suggestion mono"
          @mousedown.prevent="add(s)"
        >
          + {{ s }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tags__field {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  cursor: text;
  padding: 8px 10px;
}

.tags__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  padding: 4px 6px 4px 10px;
}

.tags__x {
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  padding: 0 3px;
}

.tags__x:hover {
  color: var(--danger);
}

.tags__input {
  flex: 1;
  min-width: 140px;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  padding: 5px 4px;
}

.tags__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tags__quick {
  margin-top: 12px;
}

.tags__quick-label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.tags__suggestion {
  font-size: 12px;
  background: none;
  border: 1px dashed var(--line-strong);
  border-radius: 6px;
  color: var(--text-dim);
  padding: 4px 10px;
  cursor: pointer;
}

.tags__suggestion:hover {
  color: var(--amber);
  border-color: var(--amber);
}
</style>
