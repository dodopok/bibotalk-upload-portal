<script setup lang="ts">
export interface EnclosureValue {
  url: string
  fileSize: number
  mimeType: string
  duration: string
}

const props = defineProps<{ modelValue: EnclosureValue | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: EnclosureValue | null]
  /** true enquanto envia/processa — o form bloqueia o salvar */
  'busy': [busy: boolean]
}>()

const inputRef = ref<HTMLInputElement>()
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

watch(uploading, b => emit('busy', b))

async function upload(file: File) {
  if (!file.name.toLowerCase().endsWith('.mp3')) {
    error.value = 'Envie um arquivo .mp3'
    return
  }
  error.value = null
  uploading.value = true
  progress.value = 0
  try {
    const result = await uploadWithProgress<EnclosureValue & { filename: string }>(
      '/api/upload/audio',
      file,
      p => (progress.value = p)
    )
    emit('update:modelValue', {
      url: result.url,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      duration: result.duration
    })
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    uploading.value = false
    if (inputRef.value) inputRef.value.value = ''
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) upload(file)
}

function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) upload(file)
}

function updateDuration(e: Event) {
  if (!props.modelValue) return
  emit('update:modelValue', { ...props.modelValue, duration: (e.target as HTMLInputElement).value })
}
</script>

<template>
  <div>
    <span class="label">Áudio do episódio (.mp3)</span>

    <div
      v-if="!modelValue"
      class="drop"
      :class="{ 'drop--active': dragging, 'drop--uploading': uploading }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
      @click="!uploading && inputRef?.click()"
    >
      <template v-if="uploading">
        <div class="drop__bar">
          <div class="drop__fill" :class="{ 'drop__fill--processing': progress === 100 }" :style="{ width: progress + '%' }" />
        </div>
        <p v-if="progress < 100" class="drop__status mono">Enviando… {{ progress }}%</p>
        <p v-else class="drop__status mono">Processando: gravando no FTP e calculando duração…</p>
      </template>
      <template v-else>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="drop__icon" aria-hidden="true">
          <path d="M12 3v12m0-12 4 4m-4-4-4 4" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round" />
        </svg>
        <p class="drop__text">Arraste o .mp3 aqui ou <strong>clique para escolher</strong></p>
        <p class="drop__hint mono">o arquivo vai direto pro servidor FTP</p>
      </template>
    </div>

    <div v-else class="done">
      <div class="done__row">
        <span class="done__check" aria-hidden="true">✓</span>
        <a :href="modelValue.url" target="_blank" rel="noopener" class="done__url mono">{{ modelValue.url }}</a>
      </div>
      <div class="done__meta">
        <span class="mono done__stat">{{ formatBytes(modelValue.fileSize) }}</span>
        <label class="done__duration">
          <span class="mono done__stat">duração</span>
          <input
            class="input done__duration-input mono"
            :value="modelValue.duration"
            placeholder="HH:MM:SS"
            @change="updateDuration"
          >
        </label>
        <button type="button" class="btn btn--ghost done__swap" @click="emit('update:modelValue', null)">
          Trocar arquivo
        </button>
      </div>
    </div>

    <p v-if="error" class="drop__error">{{ error }}</p>
    <input ref="inputRef" type="file" accept=".mp3,audio/mpeg" hidden @change="onPick">
  </div>
</template>

<style scoped>
.drop {
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--radius);
  background: var(--bg-raise);
  padding: 36px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.drop:hover,
.drop--active {
  border-color: var(--amber);
  background: var(--amber-soft);
}

.drop--uploading {
  cursor: default;
}

.drop__icon {
  color: var(--text-dim);
  margin-bottom: 10px;
}

.drop__text {
  margin: 0;
  font-size: 14.5px;
  color: var(--text-dim);
}

.drop__text strong {
  color: var(--amber);
  font-weight: 600;
}

.drop__hint {
  margin: 8px 0 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

.drop__bar {
  height: 8px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
  margin: 8px auto 14px;
  max-width: 420px;
}

.drop__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--brand), var(--amber));
  transition: width 0.2s ease;
}

.drop__fill--processing {
  animation: pulse-fill 1.2s ease-in-out infinite;
}

@keyframes pulse-fill {
  50% { opacity: 0.45; }
}

.drop__status {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--amber);
}

.drop__error {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--danger);
}

.done {
  border: 1px solid rgba(88, 201, 143, 0.35);
  background: var(--ok-soft);
  border-radius: var(--radius);
  padding: 14px 16px;
}

.done__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.done__check {
  color: var(--ok);
  font-weight: 700;
  flex-shrink: 0;
}

.done__url {
  font-size: 12.5px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.done__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.done__stat {
  font-size: 12px;
  color: var(--text-dim);
}

.done__duration {
  display: flex;
  align-items: center;
  gap: 8px;
}

.done__duration-input {
  width: 110px;
  padding: 6px 10px;
  font-size: 13px;
}

.done__swap {
  margin-left: auto;
  padding: 6px 10px;
  font-size: 13px;
}
</style>
