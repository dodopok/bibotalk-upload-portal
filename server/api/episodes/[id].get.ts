export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await wpFetch<any>(`/wp/v2/posts/${id}`, { query: EPISODE_QUERY })
  return mapEpisodeFull(res._data)
})
