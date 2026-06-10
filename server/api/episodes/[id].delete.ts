import { Client } from 'basic-ftp'

/**
 * Exclui um episódio: move o post pra lixeira do WordPress (recuperável)
 * e apaga o mp3 do FTP (irreversível — por isso o modal exige o nome).
 */
export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID inválido.' })

  // busca o post antes de excluir pra saber qual mp3 apagar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await wpFetch<any>(`/wp/v2/posts/${id}`, { query: EPISODE_QUERY })
  const post = mapEpisodeFull(res._data)

  // 1) lixeira primeiro: se falhar, nada foi apagado do FTP
  await wpFetch(`/wp/v2/posts/${id}`, { method: 'DELETE' })

  // 2) mp3 no FTP — só se a URL do enclosure pertence à nossa pasta pública
  const config = useRuntimeConfig()
  let ftp: 'deleted' | 'skipped' | 'failed' = 'skipped'
  const base = config.mp3PublicBaseUrl?.replace(/\/$/, '').replace(/^http:/, 'https:')
  const enclosureUrl = (post.enclosure?.url ?? '').replace(/^http:/, 'https:')

  if (base && enclosureUrl.startsWith(`${base}/`)) {
    const filename = decodeURIComponent(enclosureUrl.slice(base.length + 1))
    if (filename && !filename.includes('/') && !filename.includes('..')) {
      const client = new Client(60_000)
      try {
        await client.access({
          host: config.ftp.host,
          port: Number(config.ftp.port) || 21,
          user: config.ftp.user,
          password: config.ftp.password,
          secure: config.ftp.secure === 'true'
        })
        await client.cd(config.ftp.remoteDir || '/')
        await client.remove(filename)
        ftp = 'deleted'
      } catch {
        // post já está na lixeira; o arquivo pode ser removido à mão depois
        ftp = 'failed'
      } finally {
        client.close()
      }
    }
  }

  return { trashed: true, ftp, title: post.title }
})
