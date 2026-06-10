<script setup lang="ts">
const { user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <header class="hdr">
    <NuxtLink to="/" class="hdr__brand">
      <span class="hdr__dot" aria-hidden="true" />
      <span class="hdr__name">BIBOTALK</span>
      <span class="hdr__tag mono">portal</span>
    </NuxtLink>

    <div class="hdr__user">
      <img v-if="user?.picture" :src="user.picture" :alt="user?.name" class="hdr__avatar" referrerpolicy="no-referrer">
      <span class="hdr__email mono">{{ user?.email }}</span>
      <button class="btn btn--ghost hdr__logout" @click="logout">Sair</button>
    </div>
  </header>
</template>

<style scoped>
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
  margin-bottom: 32px;
}

.hdr__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.hdr__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--rec);
  box-shadow: 0 0 12px var(--rec);
}

.hdr__name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 19px;
  letter-spacing: -0.02em;
}

.hdr__tag {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-faint);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 9px;
  margin-top: 2px;
}

.hdr__user {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.hdr__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
}

.hdr__email {
  font-size: 12px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hdr__logout {
  padding: 7px 12px;
  font-size: 13px;
}

@media (max-width: 560px) {
  .hdr__email { display: none; }
}
</style>
