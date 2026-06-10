import type { EpisodePayload } from '../../utils/wp'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const payload = await readBody<EpisodePayload>(event)
  if (!payload?.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Título é obrigatório.' })
  }

  const body = await buildPostBody(payload)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await wpFetch<any>('/wp/v2/posts', {
    method: 'POST',
    body,
    query: EPISODE_QUERY
  })

  return mapEpisodeFull(res._data)
})
