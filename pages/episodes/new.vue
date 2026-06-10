<script setup lang="ts">
import type { EpisodeFormModel } from '~/components/EpisodeForm.vue'

const form = ref<EpisodeFormModel>({
  title: '',
  content: '',
  status: 'draft',
  date: '',
  categories: [],
  tagNames: [],
  featuredMediaId: null,
  featuredImage: null,
  enclosure: null,
  artworkUrl: null,
  videoPending: true
})

// Podcast = feed do PowerPress; BTCast = programa principal
const DEFAULT_CATEGORY_NAMES = ['podcast', 'btcast']

const { data: taxonomies } = await useFetch('/api/taxonomies', { lazy: true })

watch(taxonomies, (t) => {
  if (!t || form.value.categories.length) return
  form.value.categories = t.categories
    .filter(c => DEFAULT_CATEGORY_NAMES.includes(c.name.toLowerCase()))
    .map(c => c.id)
}, { immediate: true })

const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function save() {
  saving.value = true
  errorMessage.value = null
  try {
    const created = await $fetch('/api/episodes', {
      method: 'POST',
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
        videoPending: form.value.videoPending
      }
    })
    await navigateTo(`/episodes/${created.id}?created=1`)
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

    <div class="head rise">
      <NuxtLink to="/" class="head__back mono">← episódios</NuxtLink>
      <h1 class="head__title">Novo episódio</h1>
    </div>

    <p v-if="errorMessage" class="error rise">{{ errorMessage }}</p>

    <EpisodeForm
      v-model="form"
      :saving="saving"
      submit-label="Salvar episódio"
      @submit="save"
    />
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

.head__title {
  font-size: 32px;
  font-weight: 700;
  margin-top: 8px;
}

.error {
  background: var(--rec-soft);
  border: 1px solid rgba(255, 61, 46, 0.35);
  color: #ffb3ac;
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 14px;
  margin-bottom: 20px;
}
</style>
