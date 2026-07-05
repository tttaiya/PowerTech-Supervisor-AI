<template>
  <article class="metric-tile">
    <span class="metric-tile__label">{{ label }}</span>
    <strong class="metric-tile__value">{{ value }}</strong>
    <p v-if="hint" class="metric-tile__hint">{{ hint }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  hint: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.metric-tile {
  position: relative;
  overflow: hidden;
  min-height: 128px;
  padding: 18px 20px;
  border-radius: 18px;
  background:
    linear-gradient(150deg, rgba(79, 214, 154, 0.13), rgba(255, 255, 255, 0.035) 42%, rgba(255, 255, 255, 0.02)),
    rgba(15, 28, 24, 0.78);
  border: 1px solid var(--km-border-light);
  box-shadow: var(--km-shadow-soft);
}

.metric-tile::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(114, 239, 182, 0.18), rgba(113, 215, 255, 0.08), transparent 65%);
  pointer-events: none;
}

.metric-tile__label,
.metric-tile__value,
.metric-tile__hint {
  position: relative;
  z-index: 1;
}

.metric-tile__label {
  display: block;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pt-text-secondary);
}

.metric-tile__value {
  display: block;
  margin-top: 12px;
  font-size: 34px;
  line-height: 1;
  color: var(--km-ink);
  text-shadow: 0 0 14px rgba(79, 214, 154, 0.18);
}

.metric-tile__hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--pt-text-secondary);
}
</style>
