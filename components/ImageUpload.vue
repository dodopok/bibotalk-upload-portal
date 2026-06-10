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
}>()

const inputRef = ref<HTMLInputElement>()
const uploading = ref(false)
const progress = ref(0)
const error = ref<string | null>(null)

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = null
  uploading.value = true
  progress.value = 0
  try {
    const media = await uploadWithProgress<{ id: number, url: string, thumbnail: string }>(
      '/api/upload/image',
      file,
      p => (progress.value = p)
    )
    emit('update:modelValue', media.url)
    emit('uploaded', media)
  } catch (e: unknown) {
    error.value = (e as Error).message
  } finally {
    uploading.value = false
    if (inputRef.value) inputRef.value.value = ''
  }
}

function clearImage() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="imgup">
    <span class="label">{{ label }}</span>

    <div class="imgup__box" :class="{ 'imgup__box--filled': modelValue }">
      <img v-if="modelValue" :src="modelValue" alt="" class="imgup__preview">

      <div v-if="uploading" class="imgup__progress mono">{{ progress }}%</div>

      <div v-else class="imgup__actions">
        <button type="button" class="btn" @click="inputRef?.click()">
          {{ modelValue ? 'Trocar' : 'Escolher imagem' }}
        </button>
        <button v-if="modelValue" type="button" class="btn btn--ghost" @click="clearImage">
          Remover
        </button>
      </div>
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

.imgup__hint {
  font-size: 12px;
  color: var(--text-faint);
  margin: 8px 0 0;
}

.imgup__error {
  font-size: 13px;
  color: var(--rec);
  margin: 8px 0 0;
}
</style>
