<script setup lang="ts">
const config = useRuntimeConfig()
const route = useRoute()

const deletedNotice = ref(
  route.query.deleted
    ? {
        title: String(route.query.deleted),
        ftpFailed: route.query.ftp === 'failed'
      }
    : null
)

const search = ref('')
const statusFilter = ref<'all' | 'publish' | 'future' | 'draft' | 'video'>('all')
const page = ref(1)

const debouncedSearch = refDebounced(search, 350)

const { data, pending, error, refresh } = await useFetch('/api/episodes', {
  query: computed(() => ({
    page: page.value,
    ...(debouncedSearch.value ? { search: debouncedSearch.value } : {})
  })),
  lazy: true
})

// acumula páginas para o "carregar mais"
const episodes = ref<NonNullable<typeof data.value>['episodes']>([])
watch(data, (val) => {
  if (!val) return
  episodes.value = val.page === 1 ? val.episodes : [...episodes.value, ...val.episodes]
}, { immediate: true })

watch(debouncedSearch, () => { page.value = 1 })

const filtered = computed(() => {
  if (statusFilter.value === 'all') return episodes.value
  if (statusFilter.value === 'video') return episodes.value.filter(e => e.videoPending)
  return episodes.value.filter(e => e.status === statusFilter.value)
})

const hasMore = computed(() => (data.value?.totalPages ?? 1) > page.value)

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'publish', label: 'Publicados' },
  { value: 'future', label: 'Agendados' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'video', label: 'Vídeo pendente' }
] as const

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

// fallback simples caso @vueuse não esteja presente
function refDebounced<T>(source: Ref<T>, ms: number) {
  const out = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout>
  watch(source, (v) => {
    clearTimeout(timer)
    timer = setTimeout(() => (out.value = v), ms)
  })
  return out
}
</script>

<template>
  <main class="page">
    <AppHeader />

    <div v-if="deletedNotice" class="deleted rise" :class="{ 'deleted--warn': deletedNotice.ftpFailed }">
      <p class="deleted__text">
        <strong>“{{ deletedNotice.title }}”</strong> foi pra lixeira do WordPress.
        <template v-if="deletedNotice.ftpFailed">
          Mas <strong>não consegui apagar o mp3 do FTP</strong> — remova manualmente se precisar.
        </template>
        <template v-else>O mp3 foi removido do FTP.</template>
      </p>
      <button type="button" class="btn btn--ghost deleted__close" @click="deletedNotice = null">✕</button>
    </div>

    <div class="toolbar rise">
      <div>
        <h1 class="toolbar__title">Episódios</h1>
        <p class="toolbar__count mono">{{ data?.total ?? '…' }} no total</p>
      </div>
      <NuxtLink to="/episodes/new" class="btn btn--brand">
        <span class="toolbar__plus" aria-hidden="true">+</span> Novo episódio
      </NuxtLink>
    </div>

    <div class="controls rise" style="animation-delay: 0.05s">
      <input
        v-model="search"
        class="input controls__search"
        type="search"
        placeholder="Buscar episódio…"
      >
      <div class="controls__filters">
        <button
          v-for="f in filters"
          :key="f.value"
          type="button"
          class="controls__filter mono"
          :class="{ 'controls__filter--on': statusFilter === f.value }"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <div v-if="error" class="state state--error">
      <p>Não consegui falar com o WordPress: {{ error.statusMessage || error.message }}</p>
      <button class="btn" @click="refresh()">Tentar de novo</button>
    </div>

    <div v-else-if="pending && !episodes.length" class="state mono">carregando episódios…</div>

    <div v-else-if="!filtered.length" class="state mono">nenhum episódio aqui.</div>

    <ul v-else class="list">
      <li
        v-for="(ep, i) in filtered"
        :key="ep.id"
        class="row rise"
        :style="{ animationDelay: `${Math.min(i, 10) * 0.04}s` }"
      >
        <NuxtLink :to="`/episodes/${ep.id}`" class="row__link">
          <div class="row__art">
            <img
              v-if="ep.artwork || ep.featuredImage"
              :src="ep.artwork || ep.featuredImage || ''"
              alt=""
              loading="lazy"
            >
            <span v-else class="row__art-empty" aria-hidden="true">♪</span>
          </div>

          <div class="row__body">
            <p class="row__title">{{ ep.title || '(sem título)' }}</p>
            <p class="row__meta mono">
              {{ formatDate(ep.date) }}
              <template v-if="ep.duration"> · {{ ep.duration }}</template>
              <template v-if="ep.categories.length"> · {{ ep.categories.map(c => c.name).join(', ') }}</template>
            </p>
          </div>

          <div class="row__chips">
            <span v-if="ep.videoPending" class="row__video mono">🎬 vídeo pendente</span>
            <StatusChip :status="ep.status" />
          </div>
        </NuxtLink>

        <a
          v-if="ep.videoPending"
          :href="config.public.spotifyCreatorsUrl"
          target="_blank"
          rel="noopener"
          class="btn btn--ghost row__spotify"
          title="Abrir Spotify for Creators para subir o vídeo"
        >
          Subir vídeo ↗
        </a>
      </li>
    </ul>

    <div v-if="hasMore && !pending" class="more">
      <button class="btn" @click="page++">Carregar mais</button>
    </div>
    <div v-if="pending && episodes.length" class="state mono">carregando…</div>
  </main>
</template>

<style scoped>
.page {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

.deleted {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--ok-soft);
  border: 1px solid rgba(88, 201, 143, 0.35);
  border-radius: var(--radius);
  padding: 10px 10px 10px 16px;
  margin-bottom: 20px;
}

.deleted--warn {
  background: var(--amber-soft);
  border-color: rgba(255, 179, 71, 0.4);
}

.deleted__text {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-dim);
}

.deleted__text strong {
  color: var(--text);
}

.deleted__close {
  padding: 4px 9px;
  font-size: 13px;
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.toolbar__title {
  font-size: 34px;
  font-weight: 700;
}

.toolbar__count {
  margin: 6px 0 0;
  font-size: 11.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.toolbar__plus {
  font-size: 17px;
  line-height: 1;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.controls__search {
  max-width: 280px;
}

.controls__filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.controls__filter {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: none;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-dim);
  padding: 7px 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.controls__filter:hover {
  border-color: var(--text-faint);
  color: var(--text);
}

.controls__filter--on {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand);
}

.state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-faint);
  font-size: 13px;
}

.state--error {
  color: var(--danger);
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  font-family: var(--font-body);
  font-size: 14.5px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding-right: 14px;
  transition: border-color 0.15s, transform 0.15s;
}

.row:hover {
  border-color: var(--line-strong);
  transform: translateX(3px);
}

.row__link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0 12px 12px;
  text-decoration: none;
  min-width: 0;
}

.row__art {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-2);
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.row__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row__art-empty {
  color: var(--text-faint);
  font-size: 20px;
}

.row__body {
  min-width: 0;
  flex: 1;
}

.row__title {
  margin: 0;
  font-weight: 600;
  font-size: 15.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__meta {
  margin: 5px 0 0;
  font-size: 11.5px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.row__video {
  font-size: 11px;
  color: var(--amber);
}

.row__spotify {
  flex-shrink: 0;
  font-size: 13px;
  padding: 7px 12px;
  color: var(--ok);
}

.more {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@media (max-width: 640px) {
  .row__chips .row__video { display: none; }
}
</style>
