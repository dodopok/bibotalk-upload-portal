/**
 * Upload de arquivo com progresso (XHR, já que fetch não expõe progresso de envio).
 */
export function uploadWithProgress<T>(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file, file.name)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as T)
        } catch {
          reject(new Error('Resposta inválida do servidor.'))
        }
      } else {
        let message = `Erro ${xhr.status}`
        try {
          const body = JSON.parse(xhr.responseText)
          message = body.statusMessage || body.message || message
        } catch { /* mantém mensagem genérica */ }
        reject(new Error(message))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Falha de rede no upload.')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelado.')))

    xhr.open('POST', url)
    xhr.send(form)
  })
}

export function formatBytes(bytes: number) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}
