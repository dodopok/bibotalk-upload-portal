<script setup lang="ts">
const route = useRoute()

const errorMessage = computed(() => {
  if (route.query.error === 'unauthorized') {
    return 'Esse e-mail não está autorizado a acessar o portal.'
  }
  if (route.query.error === 'oauth') {
    return 'Falha no login com o Google. Tente de novo.'
  }
  return null
})
</script>

<template>
  <main class="login">
    <!-- waveform decorativa -->
    <div class="login__wave" aria-hidden="true">
      <span v-for="n in 48" :key="n" :style="{ '--i': n }" />
    </div>

    <div class="login__card rise">
      <div class="login__onair mono">
        <span class="login__dot" /> ON AIR
      </div>
      <h1 class="login__brand">BIBOTALK</h1>
      <p class="login__sub">Portal de episódios</p>

      <p v-if="errorMessage" class="login__error">{{ errorMessage }}</p>

      <a class="btn login__google" href="/auth/google">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.92l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.99-3.1Z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.99 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
        </svg>
        Entrar com Google
      </a>

      <p class="login__hint mono">Acesso restrito à equipe</p>
    </div>
  </main>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.login__card {
  position: relative;
  z-index: 2;
  width: min(400px, 100%);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 48px 40px 36px;
  text-align: center;
}

.login__onair {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: var(--rec);
  border: 1px solid rgba(255, 61, 46, 0.4);
  background: var(--rec-soft);
  border-radius: 999px;
  padding: 6px 14px 6px 11px;
  margin-bottom: 28px;
}

.login__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--rec);
  box-shadow: 0 0 10px var(--rec);
  animation: blink 1.6s ease-in-out infinite;
}

.login__brand {
  font-size: clamp(40px, 9vw, 52px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.login__sub {
  color: var(--text-dim);
  margin: 10px 0 32px;
  font-size: 15px;
}

.login__error {
  background: var(--rec-soft);
  border: 1px solid rgba(255, 61, 46, 0.35);
  color: #ffb3ac;
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 13.5px;
  margin: 0 0 20px;
}

.login__google {
  width: 100%;
  justify-content: center;
  padding: 13px 18px;
  font-size: 15px;
}

.login__hint {
  margin: 26px 0 0;
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
}

/* waveform animada no fundo */
.login__wave {
  position: absolute;
  inset: auto 0 0 0;
  height: 40vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  opacity: 0.35;
  mask-image: linear-gradient(to top, black 30%, transparent);
}

.login__wave span {
  width: 5px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(to top, var(--rec), var(--amber));
  height: 12%;
  animation: vu 2.6s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.17s);
}

@keyframes vu {
  0%, 100% { height: 8%; opacity: 0.5; }
  35% { height: calc(20% + (var(--i) - 24) * (var(--i) - 24) * -0.025% + 40%); opacity: 1; }
  70% { height: 16%; opacity: 0.7; }
}
</style>
