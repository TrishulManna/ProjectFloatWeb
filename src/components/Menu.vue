<script setup lang="ts">
  const props = defineProps({
    showMenu: Boolean,
    isPaused: Boolean,
  })
  const emit = defineEmits(['start', 'resume', 'reset', 'destroy'])
</script>

<template>
  <div class="menu-container" v-if="props.showMenu">
    <span class="title">Project Float</span>
    <div class="menu">
      <button @click="emit('start')">Play</button>
    </div>
  </div>
  <div class="menu-container paused" v-if="props.isPaused">
    <span class="title">Paused</span>
    <div class="menu">
      <button @click="emit('resume')">Resume</button>
      <button @click="emit('reset')">Reset</button>
      <button @click="emit('destroy')">Quit</button>
    </div>
  </div>
</template>

<style scoped>
.menu-container{
  position: absolute;
  background-color: rgb(0 0 0 / 100%);
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: min-content 1fr;
}

.menu-container.paused{
  background-color: rgb(0 0 0 / 70%);
}

.menu{
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 15vh;
}

.title{
  color: white;
  font-size: 4rem;
  height: fit-content;
  place-self: center;
  margin-top: 10vh;
}

button{
  font-size: 1.5rem;
  height: 3rem;
  width: 8rem;
}
</style>