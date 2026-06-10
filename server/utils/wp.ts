/**
 * Cliente da REST API do WordPress autenticado via Application Password.
 *
 * O campo `bibotalk_powerpress` e o meta `bibotalk_video_pending` são
 * expostos pelo plugin auxiliar (wordpress-plugin/bibotalk-portal-helper.php),
 * que grava o enclosure no formato que o PowerPress espera.
 */

export interface PowerPressData {
  url: string
  file_size: number
  mime_type: string
  duration: string
  image: string
}

export interface EpisodePayload {
  title: string
  content: string
  status: 'draft' | 'publish' | 'future'
  date?: string
  categories: number[]
  tagNames: string[]
  featuredMediaId?: number | null
  enclosure?: {
    url: string
    fileSize: number
    mimeType: string
    duration: string
  } | null
  artworkUrl?: string
  videoPending: boolean
}

function wpConfig() {
  const { wp } = useRuntimeConfig()
  if (!wp.url || !wp.user || !wp.appPassword) {
    throw createError({
      statusCode: 500,
      statusMessage: 'WordPress não configurado. Defina NUXT_WP_URL, NUXT_WP_USER e NUXT_WP_APP_PASSWORD.'
    })
  }
  return {
    base: wp.url.replace(/\/$/, ''),
    auth: 'Basic ' + Buffer.from(`${wp.user}:${wp.appPassword}`).toString('base64')
  }
}

export function wpFetch<T>(path: string, options: Parameters<typeof $fetch.raw>[1] = {}) {
  const { base, auth } = wpConfig()
  return $fetch.raw<T>(`${base}/wp-json${path}`, {
    ...options,
    headers: { Authorization: auth, ...(options.headers as Record<string, string> | undefined) }
  })
}

/* ── mapeamento WP → portal ── */

export interface EpisodeSummary {
  id: number
  title: string
  status: string
  date: string
  link: string
  featuredImage: string | null
  artwork: string | null
  enclosureUrl: string | null
  duration: string | null
  videoPending: boolean
  categories: { id: number, name: string }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapEpisodeSummary(post: any): EpisodeSummary {
  const embedded = post._embedded ?? {}
  const featured = embedded['wp:featuredmedia']?.[0]
  const terms: { id: number, name: string, taxonomy: string }[] = (embedded['wp:term'] ?? []).flat()
  const pp = post.bibotalk_powerpress ?? null
  return {
    id: post.id,
    title: post.title?.raw ?? post.title?.rendered ?? '',
    status: post.status,
    date: post.date,
    link: post.link,
    featuredImage: featured?.media_details?.sizes?.medium?.source_url ?? featured?.source_url ?? null,
    artwork: pp?.image || null,
    enclosureUrl: pp?.url || null,
    duration: pp?.duration || null,
    videoPending: Boolean(post.meta?.bibotalk_video_pending),
    categories: terms.filter(t => t.taxonomy === 'category').map(t => ({ id: t.id, name: t.name }))
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapEpisodeFull(post: any) {
  const embedded = post._embedded ?? {}
  const featured = embedded['wp:featuredmedia']?.[0]
  const terms: { id: number, name: string, taxonomy: string }[] = (embedded['wp:term'] ?? []).flat()
  const pp = post.bibotalk_powerpress ?? null
  return {
    ...mapEpisodeSummary(post),
    content: post.content?.raw ?? '',
    featuredMediaId: post.featured_media || null,
    tags: terms.filter(t => t.taxonomy === 'post_tag').map(t => t.name),
    enclosure: pp?.url
      ? {
          url: pp.url as string,
          fileSize: Number(pp.file_size) || 0,
          mimeType: (pp.mime_type as string) || 'audio/mpeg',
          duration: (pp.duration as string) || ''
        }
      : null
  }
}

/* ── tags: nome → id (cria se não existir) ── */

export async function ensureTagIds(names: string[]): Promise<number[]> {
  const ids: number[] = []
  for (const name of names.map(n => n.trim()).filter(Boolean)) {
    try {
      const res = await wpFetch<{ id: number }>('/wp/v2/tags', { method: 'POST', body: { name } })
      ids.push(res._data!.id)
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = error as any
      const termId = e?.data?.data?.term_id ?? e?.data?.additional_data?.[0]
      if (e?.data?.code === 'term_exists' && termId) {
        ids.push(Number(termId))
      } else {
        throw error
      }
    }
  }
  return ids
}

/* ── corpo do post a partir do payload do portal ── */

export async function buildPostBody(payload: EpisodePayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {
    title: payload.title,
    content: payload.content,
    status: payload.status,
    categories: payload.categories,
    tags: await ensureTagIds(payload.tagNames ?? []),
    meta: { bibotalk_video_pending: payload.videoPending }
  }
  if (payload.date) body.date = payload.date
  if (payload.featuredMediaId != null) body.featured_media = payload.featuredMediaId
  if (payload.enclosure?.url) {
    body.bibotalk_powerpress = {
      url: payload.enclosure.url,
      file_size: payload.enclosure.fileSize,
      mime_type: payload.enclosure.mimeType || 'audio/mpeg',
      duration: payload.enclosure.duration,
      image: payload.artworkUrl ?? ''
    } satisfies PowerPressData
  }
  return body
}

export const EPISODE_QUERY = {
  context: 'edit',
  _embed: 'wp:featuredmedia,wp:term'
} as const
