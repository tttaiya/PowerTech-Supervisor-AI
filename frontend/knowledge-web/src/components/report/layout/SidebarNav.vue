<template>
  <aside class="sidebar-nav">
    <div class="sidebar-brand">
      <span class="brand-mark" aria-hidden="true"></span>
      <div class="brand-copy">
        <strong>报告生成工作台</strong>
        <span>Report Automation Studio</span>
      </div>
    </div>

    <nav class="sidebar-menu" aria-label="主导航">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="sidebar-item"
        :class="{ active: item.key === activeKey }"
        @click="emit('select', item.key)"
      >
        <span class="item-icon">{{ item.icon }}</span>
        <span class="item-copy">
          <span class="item-label">{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </span>
      </button>
    </nav>

    <div class="sidebar-status">
      <span class="live-dot"></span>
      <div>
        <strong>报告链路在线</strong>
        <p>模板、草稿、大纲、正文、编辑、导出统一接入</p>
      </div>
    </div>

    <button type="button" class="brand-back" @click="emit('go-chat')">
      <span class="brand-back-icon">‹</span>
      <span class="brand-back-text">返回智能问答</span>
    </button>
  </aside>
</template>

<script setup>
defineProps({
  activeKey: {
    type: String,
    default: 'dashboard'
  }
});

const emit = defineEmits(['select', 'go-chat']);

const items = [
  { key: 'dashboard', label: '工作台', hint: '资产概览', icon: '⌂' },
  { key: 'create', label: '报告创建', hint: '主题草稿', icon: '＋' },
  { key: 'outline', label: '大纲管理', hint: '章节编排', icon: '☰' },
  { key: 'generation', label: '正文生成', hint: 'AI 生成', icon: '✦' },
  { key: 'editor', label: '报告编辑', hint: '人工校订', icon: '✎' },
  { key: 'records', label: '报告记录', hint: '成果沉淀', icon: '⌁' },
  { key: 'templates', label: '模板管理', hint: '复用资产', icon: '▦' }
];
</script>

<style scoped>
.sidebar-nav {
  width: 264px;
  min-height: calc(100vh - 32px);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--km-border-light);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)),
    rgba(5, 10, 8, 0.78);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 8px 8px 24px;
}

.brand-mark {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(114, 239, 182, 0.34);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(114, 239, 182, 0.95), rgba(79, 214, 154, 0.18)),
    #07110d;
  box-shadow: 0 14px 38px rgba(79, 214, 154, 0.18);
}

.brand-copy {
  min-width: 0;
}

.brand-copy strong,
.brand-copy span {
  display: block;
}

.brand-copy strong {
  color: var(--km-ink);
  font-size: 17px;
  font-weight: 720;
  line-height: 1.1;
}

.brand-copy span {
  margin-top: 4px;
  color: var(--km-muted);
  font-size: 11px;
  font-weight: 560;
  text-transform: uppercase;
}

.sidebar-menu {
  display: grid;
  gap: 6px;
  flex: 1;
  min-height: 0;
}

.sidebar-item {
  position: relative;
  width: 100%;
  min-height: 58px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 18px;
  color: var(--km-muted);
  text-align: left;
  background: transparent;
  cursor: pointer;
  transition:
    transform 160ms var(--km-ease-out),
    color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease;
}

.sidebar-item:hover {
  color: var(--km-text);
  border-color: var(--km-border-light);
  box-shadow: inset 0 0 0 1px rgba(114, 239, 182, 0.16), 0 12px 34px rgba(79, 214, 154, 0.08);
  transform: translateY(-1px);
}

.sidebar-item.active {
  color: var(--km-green-strong);
  border-color: rgba(114, 239, 182, 0.28);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.16), rgba(255, 255, 255, 0.045)),
    rgba(79, 214, 154, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: sidebar-soft-pulse 2.2s ease-in-out infinite;
}

.sidebar-item.active::after {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  content: "";
  background: var(--km-green-strong);
  box-shadow: 0 0 0 5px rgba(79, 214, 154, 0.1);
}

.item-icon {
  grid-row: 1 / 3;
  align-self: center;
  color: currentColor;
  font-size: 18px;
  font-weight: 700;
  transition: transform 180ms var(--km-ease-out);
}

.sidebar-item:hover .item-icon {
  transform: translateX(2px) rotate(-6deg);
}

.item-copy {
  display: grid;
  min-width: 0;
}

.item-label {
  color: currentColor;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.15;
}

.item-copy small {
  margin-top: 4px;
  color: #9db0a8;
  font-size: 11px;
  font-weight: 640;
}

.sidebar-status {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--km-border-light);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.045);
}

.live-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: 999px;
  background: var(--km-green-strong);
  box-shadow: 0 0 0 6px rgba(79, 214, 154, 0.1);
  animation: sidebar-soft-pulse 1.8s ease-in-out infinite;
}

.sidebar-status strong {
  color: var(--km-ink);
  font-size: 13px;
}

.sidebar-status p {
  margin: 4px 0 0;
  color: var(--km-muted);
  font-size: 12px;
  line-height: 1.5;
}

.brand-back {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  margin-top: 12px;
  padding: 0 14px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
  cursor: pointer;
  font-size: 13px;
  font-weight: 680;
}

.brand-back:hover {
  color: var(--km-green-strong);
  border-color: rgba(79, 214, 154, 0.34);
  background: rgba(79, 214, 154, 0.1);
  transform: translateY(-1px);
}

.brand-back-icon {
  font-size: 22px;
  line-height: 1;
}

@keyframes sidebar-soft-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(114, 239, 182, 0.2);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(114, 239, 182, 0.02);
  }
}
</style>
