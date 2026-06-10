<script setup lang="ts">
const props = defineProps<{
  open: boolean
  /** Título do episódio que precisa ser digitado pra confirmar */
  title: string
  deleting: boolean
}>()

const emit = defineEmits<{
  'confirm': []
  'cancel': []
}>()

const typed = ref('')
const copied = ref(false)

watch(() => props.open, (open) => {
  if (open) {
    typed.value = ''
    copied.value = false
  }
})

const matches = computed(() => typed.value.trim() === props.title.trim())

async function copyTitle() {
  await navigator.clipboard.writeText(props.title)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !props.deleting) emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dlg__overlay" @click.self="!deleting && emit('cancel')" @keydown="onKeydown">
      <div class="dlg rise" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title" class="dlg__title">Excluir episódio</h2>

        <p class="dlg__text">
          O post vai pra <strong>lixeira do WordPress</strong> (dá pra recuperar por lá),
          mas o <strong>mp3 é apagado do FTP em definitivo</strong>.
        </p>

        <button type="button" class="dlg__name mono" :title="copied ? 'Copiado!' : 'Clique pra copiar'" @click="copyTitle">
          {{ title }}
          <span class="dlg__copy">{{ copied ? '✓ copiado' : '⧉ copiar' }}</span>
        </button>

        <label class="label dlg__label" for="dlg-confirm">Digite o nome do episódio pra confirmar</label>
        <input
          id="dlg-confirm"
          v-model="typed"
          class="input"
          type="text"
          :placeholder="title"
          autocomplete="off"
          spellcheck="false"
        >

        <div class="dlg__actions">
          <button type="button" class="btn btn--ghost" :disabled="deleting" @click="emit('cancel')">
            Cancelar
          </button>
          <button
            type="button"
            class="btn dlg__danger"
            :disabled="!matches || deleting"
            @click="emit('confirm')"
          >
            {{ deleting ? 'Excluindo…' : 'Excluir de vez' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dlg__overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(8, 7, 5, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.dlg {
  width: min(480px, 100%);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 28px;
}

.dlg__title {
  font-size: 22px;
  color: var(--rec);
}

.dlg__text {
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.55;
  margin: 12px 0 18px;
}

.dlg__text strong {
  color: var(--text);
}

.dlg__name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  font-size: 13px;
  color: var(--text);
  background: var(--bg-raise);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 11px 14px;
  cursor: copy;
  margin-bottom: 18px;
  word-break: break-word;
}

.dlg__name:hover {
  border-color: var(--amber);
}

.dlg__copy {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-faint);
}

.dlg__label {
  margin-top: 0;
}

.dlg__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.dlg__danger {
  background: var(--rec);
  border-color: var(--rec);
  color: #fff;
}

.dlg__danger:hover:not(:disabled) {
  background: #ff5546;
}
</style>
