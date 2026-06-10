// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Bibotalk · Portal de Episódios',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0f0e0c' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    // Comma-separated list of Google account emails allowed to sign in
    authorizedEmails: '',
    oauth: {
      google: {
        clientId: '',
        clientSecret: '',
        redirectURL: ''
      }
    },
    wp: {
      url: '',
      user: '',
      appPassword: ''
    },
    ftp: {
      host: '',
      port: '21',
      user: '',
      password: '',
      secure: 'false',
      remoteDir: '/'
    },
    mp3PublicBaseUrl: '',
    public: {
      spotifyCreatorsUrl: 'https://creators.spotify.com'
    }
  },

  nitro: {
    routeRules: {
      '/api/**': { cors: false }
    }
  }
})
