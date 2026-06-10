<script setup lang="ts">
import type { EnclosureValue } from './AudioUpload.vue'

export interface EpisodeFormModel {
  title: string
  content: string
  status: 'draft' | 'publish' | 'future'
  date: string
  categories: number[]
  tagNames: string[]
  featuredMediaId: number | null
  featuredImage: string | null
  enclosure: EnclosureValue | null
  artworkUrl: string | null
  videoPending: boolean
  videoUrl: string
}

const props = defineProps<{
  modelValue: EpisodeFormModel
  saving: boolean
  submitLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EpisodeFormModel]
  'submit': []
}>()

const form = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

// Patch por objeto: dois eventos no mesmo tick não se sobrescrevem
// (props.modelValue fica desatualizado entre emissões síncronas)
function patch(partial: Partial<EpisodeFormModel>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

// uploads em andamento bloqueiam o salvar
const busyCount = ref(0)
function onBusy(busy: boolean) {
  busyCount.value = Math.max(0, busyCount.value + (busy ? 1 : -1))
}
const uploadsBusy = computed(() => busyCount.value > 0)

const { data: taxonomies } = await useFetch('/api/taxonomies', { lazy: true })

const scheduled = computed(() => form.value.status === 'future')

function onStatusChange(e: Event) {
  const status = (e.target as HTMLSelectElement).value as EpisodeFormModel['status']
  const next = { ...props.modelValue, status }
  if (status === 'future' && !next.date) {
    // pré-preenche com amanhã às 12:00 (horário local)
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    d.setHours(12, 0, 0, 0)
    next.date = toLocalInputValue(d)
  }
  emit('update:modelValue', next)
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toggleCategory(id: number) {
  const has = form.value.categories.includes(id)
  patch({
    categories: has
      ? form.value.categories.filter(c => c !== id)
      : [...form.value.categories, id]
  })
}

const videoUrlCopied = ref(false)
async function copyVideoUrl() {
  if (!form.value.videoUrl) return
  await navigator.clipboard.writeText(form.value.videoUrl)
  videoUrlCopied.value = true
  setTimeout(() => (videoUrlCopied.value = false), 1500)
}

const canSubmit = computed(() =>
  form.value.title.trim().length > 0 &&
  form.value.categories.length > 0 &&
  !props.saving &&
  !uploadsBusy.value
)
</script>

<template>
  <form class="ef" @submit.prevent="canSubmit && emit('submit')">
    <div class="ef__main">
      <section class="ef__card rise">
        <label class="label" for="ep-title">Título</label>
        <input
          id="ep-title"
          class="input ef__title"
          :value="form.title"
          type="text"
          placeholder="Nome do episódio - BTCast 000"
          required
          @input="patch({ title: ($event.target as HTMLInputElement).value })"
        >

        <label class="label ef__gap" for="ep-desc">Descrição</label>
        <textarea
          id="ep-desc"
          class="textarea"
          :value="form.content"
          rows="10"
          placeholder="Descrição do episódio. Pode colar texto com URLs soltas — elas viram links clicáveis automaticamente ao salvar."
          @input="patch({ content: ($event.target as HTMLTextAreaElement).value })"
        />
      </section>

      <section class="ef__card rise" style="animation-delay: 0.05s">
        <AudioUpload
          :model-value="form.enclosure"
          @update:model-value="patch({ enclosure: $event })"
          @busy="onBusy"
        />
      </section>

      <section class="ef__card ef__card--split rise" style="animation-delay: 0.1s">
        <ImageUpload
          :model-value="form.featuredImage"
          label="Featured image (post)"
          hint="Imagem destacada do post no site."
          @update:model-value="$event === null && patch({ featuredImage: null, featuredMediaId: null })"
          @uploaded="patch({ featuredImage: $event.url, featuredMediaId: $event.id })"
          @busy="onBusy"
        />
        <ImageUpload
          :model-value="form.artworkUrl"
          label="Artwork do episódio (PowerPress)"
          hint="Capa que aparece no Spotify/players. Quadrada, mínimo 1400×1400."
          @update:model-value="$event === null && patch({ artworkUrl: null })"
          @uploaded="patch({ artworkUrl: $event.url })"
          @busy="onBusy"
        />
      </section>

      <section class="ef__card rise" style="animation-delay: 0.15s">
        <label class="label">Tags</label>
        <TagInput
          :model-value="form.tagNames"
          :suggestions="taxonomies?.tagSuggestions ?? []"
          @update:model-value="patch({ tagNames: $event })"
        />
      </section>
    </div>

    <aside class="ef__side">
      <section class="ef__card rise" style="animation-delay: 0.1s">
        <label class="label" for="ep-status">Publicação</label>
        <select id="ep-status" class="select" :value="form.status" @change="onStatusChange">
          <option value="draft">Rascunho</option>
          <option value="publish">Publicar agora</option>
          <option value="future">Agendar</option>
        </select>

        <template v-if="scheduled">
          <label class="label ef__gap" for="ep-date">Data e hora</label>
          <input
            id="ep-date"
            class="input"
            type="datetime-local"
            :value="form.date"
            required
            @input="patch({ date: ($event.target as HTMLInputElement).value })"
          >
        </template>
      </section>

      <section class="ef__card rise" style="animation-delay: 0.15s">
        <span class="label">Categorias (feed PowerPress)</span>
        <p v-if="!taxonomies" class="ef__loading mono">carregando…</p>
        <div v-else class="ef__cats">
          <label
            v-for="cat in taxonomies.categories"
            :key="cat.id"
            class="ef__cat"
            :class="{ 'ef__cat--on': form.categories.includes(cat.id) }"
          >
            <input
              type="checkbox"
              :checked="form.categories.includes(cat.id)"
              hidden
              @change="toggleCategory(cat.id)"
            >
            {{ cat.name }}
          </label>
        </div>
        <p v-if="!form.categories.length" class="ef__warn">
          Selecione ao menos a categoria do feed — sem ela o episódio não entra no PowerPress.
        </p>
      </section>

      <section class="ef__card rise" style="animation-delay: 0.2s">
        <span class="label">Spotify</span>
        <label class="ef__video">
          <input
            type="checkbox"
            :checked="form.videoPending"
            @change="patch({ videoPending: ($event.target as HTMLInputElement).checked })"
          >
          <span>Vídeo pendente no Spotify</span>
        </label>
        <p class="ef__video-hint">
          Marque para lembrar de subir o vídeo no Spotify for Creators depois que o episódio entrar no feed.
          Quando o vídeo estiver no ar, desmarque e salve.
        </p>

        <label class="label ef__gap" for="ep-video-url">URL de download do vídeo</label>
        <div class="ef__video-url">
          <input
            id="ep-video-url"
            class="input"
            type="url"
            :value="form.videoUrl"
            placeholder="https://drive.google.com/…"
            @input="patch({ videoUrl: ($event.target as HTMLInputElement).value })"
          >
          <button
            v-if="form.videoUrl"
            type="button"
            class="btn ef__video-copy mono"
            :title="videoUrlCopied ? 'Copiado!' : 'Copiar URL'"
            @click="copyVideoUrl"
          >
            {{ videoUrlCopied ? '✓' : '⧉' }}
          </button>
        </div>
        <p class="ef__video-hint">
          Link de onde baixar o vídeo (Drive, WeTransfer…) pra quem for subir no Spotify.
        </p>
      </section>

      <button class="btn btn--brand ef__submit" type="submit" :disabled="!canSubmit">
        <span v-if="saving || uploadsBusy" class="ef__spinner" aria-hidden="true" />
        {{ saving ? 'Salvando…' : uploadsBusy ? 'Aguarde os uploads…' : submitLabel }}
      </button>
    </aside>
  </form>
</template>

<style scoped>
.ef {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.ef__main,
.ef__side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ef__side {
  position: sticky;
  top: 20px;
}

.ef__card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px;
}

.ef__card--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.ef__title {
  font-size: 17px;
  font-weight: 600;
}

.ef__gap {
  margin-top: 20px;
}

.ef__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ef__cat {
  font-size: 13px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 6px 13px;
  cursor: pointer;
  color: var(--text-dim);
  transition: all 0.15s;
  user-select: none;
}

.ef__cat:hover {
  border-color: var(--text-faint);
  color: var(--text);
}

.ef__cat--on {
  background: var(--amber-soft);
  border-color: var(--amber);
  color: var(--amber);
  font-weight: 600;
}

.ef__warn {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--amber);
}

.ef__loading {
  font-size: 12px;
  color: var(--text-faint);
}

.ef__video {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  cursor: pointer;
}

.ef__video input {
  accent-color: var(--brand);
  width: 16px;
  height: 16px;
}

.ef__video-hint {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--text-faint);
  line-height: 1.5;
}

.ef__video-url {
  display: flex;
  gap: 8px;
}

.ef__video-copy {
  flex-shrink: 0;
  padding: 8px 12px;
  font-size: 14px;
}

.ef__submit {
  justify-content: center;
  padding: 14px;
  font-size: 15px;
}

.ef__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .ef {
    grid-template-columns: 1fr;
  }
  .ef__side {
    position: static;
  }
  .ef__card--split {
    grid-template-columns: 1fr;
  }
}
</style>
