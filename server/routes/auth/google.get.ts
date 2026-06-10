export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile']
  },
  async onSuccess(event, { user }) {
    const allowed = (useRuntimeConfig().authorizedEmails as string)
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const email = (user.email as string | undefined)?.toLowerCase()
    if (!email || !allowed.includes(email)) {
      return sendRedirect(event, '/login?error=unauthorized')
    }

    await setUserSession(event, {
      user: {
        email,
        name: user.name as string,
        picture: user.picture as string
      }
    })
    return sendRedirect(event, '/')
  },
  onError(event) {
    return sendRedirect(event, '/login?error=oauth')
  }
})
