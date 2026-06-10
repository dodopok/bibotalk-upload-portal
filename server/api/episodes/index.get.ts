export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await wpFetch<any[]>('/wp/v2/posts', {
    query: {
      ...EPISODE_QUERY,
      page,
      per_page: 20,
      status: 'publish,future,draft,pending',
      orderby: 'date',
      order: 'desc',
      ...(q.search ? { search: String(q.search) } : {})
    }
  })

  return {
    episodes: (res._data ?? []).map(mapEpisodeSummary),
    total: Number(res.headers.get('x-wp-total')) || 0,
    totalPages: Number(res.headers.get('x-wp-totalpages')) || 1,
    page
  }
})
