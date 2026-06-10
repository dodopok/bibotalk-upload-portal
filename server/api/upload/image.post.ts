export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === 'file' && f.filename)
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Nenhum arquivo enviado.' })
  }

  const mime = file.type || 'image/jpeg'
  if (!mime.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'O arquivo precisa ser uma imagem.' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await wpFetch<any>('/wp/v2/media', {
    method: 'POST',
    body: file.data,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename!)}"`
    }
  })

  const media = res._data
  return {
    id: media.id as number,
    url: (media.source_url as string) ?? '',
    thumbnail: media.media_details?.sizes?.medium?.source_url ?? media.source_url ?? ''
  }
})
