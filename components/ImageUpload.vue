<script setup lang="ts">
const props = defineProps<{
  label: string
  hint?: string
  /** URL atual da imagem (preview) */
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [url: string | null]
  /** id do attachment no WP, quando aplicável */
  'uploaded': [media: { id: number, url: string, thumbnail: string }]
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
  if (!file.type.startsWith('image/')) {
    error.value = 'Envie um arquivo de imagem.'
    return
  }
  error.value = null
  uploading.value = true
  progress.value = 0
  try {
    const media = await uploadWithProgress<{ id: number, url: string, thumbnail: string }>(
      '/api/upload/image',
      file,
      p => (progress.value = p)
    )
    emit('uploaded', media)
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    uploading.value = false
    if (inputRef.value) inputRef.value.value = ''
  }
}

function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) upload(file)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (uploading.value) return
  const file = e.dataTransfer?.files?.[0]
  if (file) upload(file)
}
</script>

<template>
  <div class="imgup">
    <span class="label">{{ label }}</span>

    <div
      class="imgup__box"
      :class="{ 'imgup__box--filled': modelValue, 'imgup__box--drag': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <img v-if="modelValue && !uploading" :src="modelValue" alt="" class="imgup__preview">

      <div v-if="uploading" class="imgup__progress mono">
        <span v-if="progress < 100">{{ progress }}%</span>
        <span v-else class="imgup__processing"><span class="imgup__spinner" aria-hidden="true" /> processando…</span>
      </div>

      <div v-else class="imgup__actions">
        <button type="button" class="btn" @click="inputRef?.click()">
          {{ modelValue ? 'Trocar' : 'Escolher imagem' }}
        </button>
        <button v-if="modelValue" type="button" class="btn btn--ghost" @click="emit('update:modelValue', null)">
          Remover
        </button>
      </div>

      <p v-if="!modelValue && !uploading" class="imgup__drop-hint mono">ou arraste a imagem aqui</p>
    </div>

    <p v-if="hint" class="imgup__hint">{{ hint }}</p>
    <p v-if="error" class="imgup__error">{{ error }}</p>

    <input ref="inputRef" type="file" accept="image/*" hidden @change="onPick">
  </div>
</template>

<style scoped>
.imgup__box {
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  background: var(--bg-raise);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  transition: border-color 0.15s;
}

.imgup__box--filled {
  border-style: solid;
}

.imgup__box--drag {
  border-color: var(--amber);
  background: var(--amber-soft);
}

.imgup__drop-hint {
  margin: 0;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--text-faint);
}

.imgup__preview {
  max-width: 100%;
  max-height: 180px;
  border-radius: 6px;
  object-fit: contain;
}

.imgup__actions {
  display: flex;
  gap: 8px;
}

.imgup__progress {
  font-size: 13px;
  color: var(--amber);
}

.imgup__processing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.imgup__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--amber-soft);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: imgspin 0.7s linear infinite;
}

@keyframes imgspin {
  to { transform: rotate(360deg); }
}

.imgup__hint {
  font-size: 12px;
  color: var(--text-faint);
  margin: 8px 0 0;
}

.imgup__error {
  font-size: 13px;
  color: var(--danger);
  margin: 8px 0 0;
}
</style>
