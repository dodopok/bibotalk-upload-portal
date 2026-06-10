import type { EpisodePayload } from '../../utils/wp'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })

  const payload = await readBody<EpisodePayload>(event)
  const body = await buildPostBody(payload)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await wpFetch<any>(`/wp/v2/posts/${id}`, {
    method: 'POST',
    body,
    query: EPISODE_QUERY
  })

  return mapEpisodeFull(res._data)
})
