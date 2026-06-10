/**
 * Conversão entre o texto editável (URLs puras, como o usuário escreve)
 * e o HTML do post no WordPress (URLs viram <a> clicáveis).
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g

/** Texto do form → HTML do post: URLs soltas viram links clicáveis. */
export function editableToHtml(text: string): string {
  // split com grupo de captura: índices ímpares são tags/anchors existentes — não mexe neles
  return text
    .split(/(<a\b[\s\S]*?<\/a>|<[^>]+>)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part
      return part.replace(URL_RE, (match) => {
        // pontuação no fim da frase não faz parte da URL
        const url = match.replace(/[.,;!?]+$/, '')
        const rest = match.slice(url.length)
        return `<a href="${url}">${url}</a>${rest}`
      })
    })
    .join('')
}

/** HTML do post → texto do form: anchors cujo texto é a própria URL viram URL pura. */
export function htmlToEditable(html: string): string {
  return html.replace(
    /<a\b[^>]*href="([^"]+)"[^>]*>\s*([^<]*?)\s*<\/a>/gi,
    (match, href: string, text: string) => {
      const stripSlash = (s: string) => s.replace(/\/$/, '')
      return stripSlash(text) === stripSlash(href) ? text : match
    }
  )
}
