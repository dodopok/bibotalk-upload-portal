<script setup lang="ts">
const props = defineProps<{ status: string }>()

const map: Record<string, { label: string, cls: string }> = {
  publish: { label: 'Publicado', cls: 'ok' },
  future: { label: 'Agendado', cls: 'info' },
  draft: { label: 'Rascunho', cls: 'amber' },
  pending: { label: 'Revisão', cls: 'amber' }
}

const chip = computed(() => map[props.status] ?? { label: props.status, cls: 'amber' })
</script>

<template>
  <span class="chip mono" :class="`chip--${chip.cls}`">{{ chip.label }}</span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 4px 10px;
  border: 1px solid;
}

.chip--ok { color: var(--ok); background: var(--ok-soft); border-color: rgba(88, 201, 143, 0.35); }
.chip--info { color: var(--info); background: var(--info-soft); border-color: rgba(109, 179, 242, 0.35); }
.chip--amber { color: var(--amber); background: var(--amber-soft); border-color: rgba(255, 179, 71, 0.35); }
</style>
