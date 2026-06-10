<script setup lang="ts">
import type { EpisodeFormModel } from '~/components/EpisodeForm.vue'

const route = useRoute()
const config = useRuntimeConfig()
const id = Number(route.params.id)

const { data: episode, error: loadError } = await useFetch(`/api/episodes/${id}`)

const form = ref<EpisodeFormModel>(toFormModel(episode.value))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFormModel(ep: any): EpisodeFormModel {
  return {
    title: ep?.title ?? '',
    content: htmlToEditable(ep?.content ?? ''),
    status: (ep?.status === 'pending' ? 'draft' : ep?.status) ?? 'draft',
    date: ep?.date ? String(ep.date).slice(0, 16) : '',
    categories: (ep?.categories ?? []).map((c: { id: number }) => c.id),
    tagNames: ep?.tags ?? [],
    featuredMediaId: ep?.featuredMediaId ?? null,
    featuredImage: ep?.featuredImage ?? null,
    enclosure: ep?.enclosure ?? null,
    artworkUrl: ep?.artwork ?? null,
    videoPending: ep?.videoPending ?? false,
    videoUrl: ep?.videoUrl ?? ''
  }
}

const saving = ref(false)
const errorMessage = ref<string | null>(null)
const savedAt = ref<Date | null>(null)
const justCreated = ref(route.query.created === '1')

const deleteOpen = ref(false)
const deleting = ref(false)

async function destroy() {
  deleting.value = true
  errorMessage.value = null
  try {
    const result = await $fetch<{ trashed: boolean, ftp: string, title: string }>(`/api/episodes/${id}`, {
      method: 'DELETE'
    })
    await navigateTo({ path: '/', query: { deleted: result.title, ftp: result.ftp } })
  } catch (e: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Erro ao excluir.'
    deleteOpen.value = false
  } finally {
    deleting.value = false
  }
}

async function save() {
  saving.value = true
  errorMessage.value = null
  justCreated.value = false
  try {
    const updated = await $fetch(`/api/episodes/${id}`, {
      method: 'PUT',
      body: {
        title: form.value.title,
        content: editableToHtml(form.value.content),
        status: form.value.status,
        date: form.value.status === 'future' ? form.value.date : undefined,
        categories: form.value.categories,
        tagNames: form.value.tagNames,
        featuredMediaId: form.value.featuredMediaId,
        enclosure: form.value.enclosure,
        artworkUrl: form.value.artworkUrl,
        videoPending: form.value.videoPending,
        videoUrl: form.value.videoUrl
      }
    })
    form.value = toFormModel(updated)
    savedAt.value = new Date()
  } catch (e: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = e as any
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Erro ao salvar.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <AppHeader />

    <div v-if="loadError" class="error rise">
      Episódio não encontrado ou o WordPress não respondeu: {{ loadError.statusMessage || loadError.message }}
    </div>

    <template v-else>
      <div class="head rise">
        <NuxtLink to="/" class="head__back mono">← episódios</NuxtLink>
        <div class="head__row">
          <h1 class="head__title">Editar episódio</h1>
          <div class="head__actions">
            <StatusChip :status="form.status" />
            <a
              v-if="episode?.link && episode?.status === 'publish'"
              :href="episode.link"
              target="_blank"
              rel="noopener"
              class="btn btn--ghost head__view"
            >
              Ver no site ↗
            </a>
            <a
              v-if="form.videoPending"
              :href="config.public.spotifyCreatorsUrl"
              target="_blank"
              rel="noopener"
              class="btn head__spotify"
            >
              Subir vídeo no Spotify ↗
            </a>
            <button type="button" class="btn btn--ghost head__delete" @click="deleteOpen = true">
              Excluir
            </button>
          </div>
        </div>
      </div>

      <p v-if="justCreated" class="notice notice--ok rise">
        Episódio criado! Confira os dados e ajuste o que precisar.
      </p>
      <p v-if="savedAt" class="notice notice--ok rise">
        Salvo às {{ savedAt.toLocaleTimeString('pt-BR') }}.
      </p>
      <p v-if="errorMessage" class="notice notice--error rise">{{ errorMessage }}</p>

      <EpisodeForm
        v-model="form"
        :saving="saving"
        submit-label="Salvar alterações"
        @submit="save"
      />

      <DeleteEpisodeModal
        :open="deleteOpen"
        :title="form.title"
        :deleting="deleting"
        @confirm="destroy"
        @cancel="deleteOpen = false"
      />
    </template>
  </main>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

.head {
  margin-bottom: 26px;
}

.head__back {
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-faint);
  text-decoration: none;
}

.head__back:hover {
  color: var(--amber);
}

.head__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.head__title {
  font-size: 32px;
  font-weight: 700;
}

.head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.head__view,
.head__spotify {
  font-size: 13px;
  padding: 8px 13px;
}

.head__spotify {
  color: var(--ok);
  border-color: rgba(88, 201, 143, 0.4);
}

.head__delete {
  font-size: 13px;
  padding: 8px 13px;
  color: var(--danger);
}

.head__delete:hover {
  background: var(--danger-soft);
}

.notice {
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 14px;
  margin-bottom: 20px;
}

.notice--ok {
  background: var(--ok-soft);
  border: 1px solid rgba(88, 201, 143, 0.35);
  color: var(--ok);
}

.notice--error,
.error {
  background: var(--danger-soft);
  border: 1px solid rgba(255, 68, 56, 0.35);
  color: #ffb3ac;
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 14px;
}
</style>
