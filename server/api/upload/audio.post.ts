import { Readable } from 'node:stream'
import { Client } from 'basic-ftp'
import { parseBuffer } from 'music-metadata'

function sanitizeFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, '')
  const clean = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${clean || 'episodio'}.mp3`
}

function formatDuration(totalSeconds: number) {
  const s = Math.round(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':')
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const config = useRuntimeConfig()
  if (!config.ftp.host || !config.mp3PublicBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'FTP não configurado. Defina NUXT_FTP_* e NUXT_MP3_PUBLIC_BASE_URL.'
    })
  }

  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === 'file' && f.filename)
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Nenhum arquivo enviado.' })
  }

  // Duração do mp3 (vai pro enclosure do PowerPress)
  let durationSeconds = 0
  try {
    const meta = await parseBuffer(file.data, { mimeType: 'audio/mpeg' }, { duration: true })
    durationSeconds = meta.format.duration ?? 0
  } catch {
    // arquivo sem header legível: segue sem duração, o campo fica editável no form
  }

  const client = new Client(60_000)
  let filename = sanitizeFilename(file.filename!)
  try {
    await client.access({
      host: config.ftp.host,
      port: Number(config.ftp.port) || 21,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure === 'true'
    })

    const dir = config.ftp.remoteDir || '/'
    await client.ensureDir(dir)

    // evita sobrescrever episódio existente com o mesmo nome
    const existing = await client.list()
    if (existing.some(f => f.name === filename)) {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
      filename = filename.replace(/\.mp3$/, `-${stamp}.mp3`)
    }

    await client.uploadFrom(Readable.from(file.data), filename)
  } catch (error: unknown) {
    throw createError({
      statusCode: 502,
      statusMessage: `Falha no upload FTP: ${(error as Error).message}`
    })
  } finally {
    client.close()
  }

  return {
    url: `${config.mp3PublicBaseUrl.replace(/\/$/, '')}/${filename}`,
    filename,
    fileSize: file.data.length,
    mimeType: 'audio/mpeg',
    duration: formatDuration(durationSeconds)
  }
})
