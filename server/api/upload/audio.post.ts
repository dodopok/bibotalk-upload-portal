import { PassThrough } from 'node:stream'
import Busboy from 'busboy'
import { Client } from 'basic-ftp'
import { parseStream } from 'music-metadata'

function sanitizeFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, '')
  const clean = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

interface AudioUploadResult {
  url: string
  filename: string
  fileSize: number
  mimeType: string
  duration: string
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

  const req = event.node.req
  const contentType = req.headers['content-type']
  if (!contentType?.startsWith('multipart/form-data')) {
    throw createError({ statusCode: 400, statusMessage: 'Esperado multipart/form-data.' })
  }

  const client = new Client(60_000)
  let clientClosed = false
  const closeClient = () => {
    if (clientClosed) return
    clientClosed = true
    try { client.close() } catch { /* noop */ }
  }

  try {
    await client.access({
      host: config.ftp.host,
      port: Number(config.ftp.port) || 21,
      user: config.ftp.user,
      password: config.ftp.password,
      secure: config.ftp.secure === 'true'
    })
    await client.ensureDir(config.ftp.remoteDir || '/')
  } catch (error: unknown) {
    closeClient()
    throw createError({
      statusCode: 502,
      statusMessage: `Falha ao conectar no FTP: ${(error as Error).message}`
    })
  }

  try {
    return await new Promise<AudioUploadResult>((resolve, reject) => {
      const bb = Busboy({ headers: req.headers, limits: { files: 1, fields: 0 } })
      let currentFileStream: NodeJS.ReadableStream | null = null
      let gotFile = false
      let handled = false
      const finish = (err: Error | null, value?: AudioUploadResult) => {
        if (handled) return
        handled = true
        if (err) {
          currentFileStream?.removeAllListeners('data')
          currentFileStream?.resume?.()
          reject(err)
        } else {
          resolve(value!)
        }
      }

      bb.on('file', async (name, fileStream, info) => {
        currentFileStream = fileStream
        if (name !== 'file' || !info.filename) {
          fileStream.resume()
          return
        }
        gotFile = true

        let filename = sanitizeFilename(info.filename)
        try {
          const existing = await client.list()
          if (existing.some(f => f.name === filename)) {
            const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
            filename = filename.replace(/\.mp3$/, `-${stamp}.mp3`)
          }
        } catch (error: unknown) {
          fileStream.resume()
          return finish(createError({
            statusCode: 502,
            statusMessage: `Falha ao listar diretório FTP: ${(error as Error).message}`
          }))
        }

        const ftpStream = new PassThrough({ highWaterMark: 1024 * 1024 })
        const metaStream = new PassThrough({ highWaterMark: 1024 * 1024 })
        let fileSize = 0
        let metaDone = false

        fileStream.on('data', (chunk: Buffer) => {
          fileSize += chunk.length
          if (!ftpStream.write(chunk)) fileStream.pause()
          if (!metaDone && !metaStream.destroyed) {
            metaStream.write(chunk)
          }
        })
        ftpStream.on('drain', () => fileStream.resume())
        fileStream.on('end', () => {
          ftpStream.end()
          if (!metaStream.writableEnded && !metaStream.destroyed) metaStream.end()
        })
        fileStream.on('error', (err) => {
          ftpStream.destroy(err)
          metaStream.destroy(err)
          finish(err)
        })

        // music-metadata consome em paralelo: pra mp3 com Xing/LAME resolve nos
        // primeiros frames; pra CBR sem header, varre o arquivo todo.
        let durationSeconds = 0
        const metaPromise = parseStream(metaStream, { mimeType: 'audio/mpeg' }, { duration: true })
          .then((meta) => {
            durationSeconds = meta.format.duration ?? 0
          })
          .catch(() => {
            // mp3 sem header de duração legível: campo fica editável no form
          })
          .finally(() => {
            metaDone = true
            if (!metaStream.destroyed) metaStream.destroy()
          })

        try {
          await client.uploadFrom(ftpStream, filename)
        } catch (error: unknown) {
          metaStream.destroy()
          return finish(createError({
            statusCode: 502,
            statusMessage: `Falha no upload FTP: ${(error as Error).message}`
          }))
        }

        // Espera o parse de duração terminar (com teto de 10s caso pareie estranho)
        await Promise.race([
          metaPromise,
          new Promise<void>(r => setTimeout(r, 10_000))
        ])

        finish(null, {
          url: `${config.mp3PublicBaseUrl.replace(/\/$/, '')}/${filename}`,
          filename,
          fileSize,
          mimeType: 'audio/mpeg',
          duration: formatDuration(durationSeconds)
        })
      })

      bb.on('error', err => finish(err as Error))
      bb.on('finish', () => {
        if (!gotFile) {
          finish(createError({ statusCode: 400, statusMessage: 'Nenhum arquivo enviado.' }))
        }
      })

      req.on('aborted', () => finish(createError({ statusCode: 499, statusMessage: 'Upload cancelado pelo cliente.' })))
      req.on('error', err => finish(err))

      req.pipe(bb)
    })
  } finally {
    closeClient()
  }
})
