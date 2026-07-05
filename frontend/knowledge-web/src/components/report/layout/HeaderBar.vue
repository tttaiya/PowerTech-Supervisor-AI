<template>
  <header class="header-bar">
    <button type="button" class="header-back" @click="emit('logout')">
      <span>‹</span>
      <strong>返回门户</strong>
    </button>
    <div class="header-copy">
      <span>Report Workspace</span>
      <strong>{{ title }}</strong>
    </div>

    <div class="header-actions">
      <el-tag :type="online ? 'success' : 'info'" effect="dark" class="status-tag">
        {{ backendLabel }}
      </el-tag>
      <el-tag effect="dark" class="status-tag">{{ userLabel }}</el-tag>
      <el-button size="small" :loading="loading" @click="emit('refresh-backend')">刷新后端</el-button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  online: {
    type: Boolean,
    default: false
  },
  backendLabel: {
    type: String,
    required: true
  },
  userLabel: {
    type: String,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['refresh-backend', 'logout']);
</script>

<style scoped>
.header-bar {
  min-height: 72px;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--km-border-light);
  background: rgba(5, 10, 8, 0.62);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.header-copy strong,
.header-copy span {
  display: block;
}

.header-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 14px 0 11px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
  cursor: pointer;
  transition:
    transform 160ms var(--km-ease-out),
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.header-back span {
  font-size: 21px;
  line-height: 1;
}

.header-back strong {
  font-size: 13px;
  font-weight: 680;
}

.header-back:hover {
  color: var(--km-green-strong);
  border-color: rgba(79, 214, 154, 0.34);
  background: rgba(79, 214, 154, 0.1);
  transform: translateY(-1px);
}

.header-copy strong {
  margin-top: 2px;
  color: var(--km-ink);
  font-size: 17px;
  font-weight: 700;
}

.header-copy span {
  color: var(--km-faint);
  font-size: 11px;
  font-weight: 680;
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-tag {
  border-color: rgba(193, 227, 212, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
}
</style>

