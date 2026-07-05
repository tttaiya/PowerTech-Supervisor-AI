<template>
  <a class="ks-neon-button" :class="variantClass" :href="href" @click="handleClick">
    <span class="ks-neon-button__glow" aria-hidden="true"></span>
    <span class="ks-neon-button__content">
      <slot>{{ label }}</slot>
    </span>
  </a>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    href: string
    label?: string
    variant?: 'primary' | 'ghost' | 'danger'
  }>(),
  {
    label: '',
    variant: 'primary',
  },
)

const variantClass = `ks-neon-button--${props.variant}`

function handleClick(event: MouseEvent) {
  if (!props.href.startsWith('#')) return
  const target = document.querySelector(props.href)
  if (!target) return
  event.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
