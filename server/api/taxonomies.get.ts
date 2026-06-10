export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const [categories, tags] = await Promise.all([
    wpFetch<{ id: number, name: string, count: number }[]>('/wp/v2/categories', {
      query: { per_page: 100, orderby: 'count', order: 'desc', hide_empty: false }
    }),
    wpFetch<{ id: number, name: string }[]>('/wp/v2/tags', {
      query: { per_page: 100, orderby: 'count', order: 'desc' }
    })
  ])

  return {
    categories: (categories._data ?? []).map(c => ({ id: c.id, name: c.name, count: c.count })),
    tagSuggestions: (tags._data ?? []).map(t => t.name)
  }
})
