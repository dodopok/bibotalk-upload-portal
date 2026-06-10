/**
 * Lista de episódios. Sem `_embed`: a resposta do WP cai de ~4 MB pra ~7 KB
 * (a mídia embutida traz todos os tamanhos de imagem + yoast_head).
 * O artwork vem do enclosure do PowerPress e os nomes de categoria
 * de uma busca à parte, cacheada em memória.
 */

let categoryCache: { at: number, map: Map<number, string> } | null = null

async function categoryNames(): Promise<Map<number, string>> {
  if (categoryCache && Date.now() - categoryCache.at < 5 * 60_000) {
    return categoryCache.map
  }
  const res = await wpFetch<{ id: number, name: string }[]>('/wp/v2/categories', {
    query: { per_page: 100, hide_empty: false, _fields: 'id,name' }
  })
  categoryCache = {
    at: Date.now(),
    map: new Map((res._data ?? []).map(c => [c.id, c.name]))
  }
  return categoryCache.map
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [res, catMap] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wpFetch<any[]>('/wp/v2/posts', {
      query: {
        context: 'edit',
        page,
        per_page: 10,
        status: 'publish,future,draft,pending',
        orderby: 'date',
        order: 'desc',
        _fields: 'id,title,status,date,link,meta,categories,bibotalk_powerpress',
        ...(q.search ? { search: String(q.search) } : {})
      }
    }),
    categoryNames()
  ])

  const episodes = (res._data ?? []).map((post) => {
    const pp = post.bibotalk_powerpress ?? null
    return {
      id: post.id as number,
      title: (post.title?.raw ?? post.title?.rendered ?? '') as string,
      status: post.status as string,
      date: post.date as string,
      link: post.link as string,
      featuredImage: null,
      artwork: (pp?.image || null) as string | null,
      enclosureUrl: (pp?.url || null) as string | null,
      duration: (pp?.duration || null) as string | null,
      videoPending: Boolean(post.meta?.bibotalk_video_pending),
      categories: ((post.categories ?? []) as number[])
        .map(id => ({ id, name: catMap.get(id) ?? '' }))
        .filter(c => c.name)
    }
  })

  return {
    episodes,
    total: Number(res.headers.get('x-wp-total')) || 0,
    totalPages: Number(res.headers.get('x-wp-totalpages')) || 1,
    page
  }
})
