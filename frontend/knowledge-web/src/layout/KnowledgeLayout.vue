<template>
  <el-container class="knowledge-layout">
    <el-aside class="km-aside" width="264px">
      <div class="km-brand">
        <span class="km-brand-mark" aria-hidden="true"></span>
        <div>
          <div class="km-title">知识管理系统</div>
          <div class="km-subtitle">Enterprise Knowledge OS</div>
        </div>
      </div>

      <el-menu :default-active="activeMenu" :router="true" class="km-menu">
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <small>{{ item.hint }}</small>
        </el-menu-item>
      </el-menu>

      <div class="km-aside-card">
        <span class="km-live-dot"></span>
        <div>
          <strong>处理链路在线</strong>
          <p>上传、解析、切片、向量化、审核、检索统一接入</p>
        </div>
      </div>
    </el-aside>

    <el-container class="km-frame">
      <el-header class="km-header">
        <button class="km-back" type="button" aria-label="返回门户" title="返回门户" @click="goBackToPortal">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回门户</span>
        </button>

        <div class="km-header-center">
          <span class="km-header-kicker">Knowledge Workspace</span>
          <strong>{{ activeTitle }}</strong>
        </div>

        <div class="km-user">
          <span v-if="username" class="km-username">{{ username }}</span>
          <el-button text size="small" class="km-logout" @click="logout">退出</el-button>
        </div>
      </el-header>

      <el-main class="km-main">
        <div class="km-content">
          <slot />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Collection,
  Connection,
  DataAnalysis,
  Operation,
  Search,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { index: '/bases', label: '知识库', hint: '资产管理', icon: Collection },
  { index: '/review', label: '审核工作台', hint: '切片确认', icon: Operation },
  { index: '/search', label: '知识检索', hint: '语义命中', icon: Search },
  { index: '/config', label: '系统配置', hint: '模型调优', icon: Connection },
  { index: '/statistics', label: '数据统计', hint: '成果概览', icon: DataAnalysis },
]

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/bases')) return '/bases'
  if (path.startsWith('/review')) return '/review'
  if (path.startsWith('/search')) return '/search'
  if (path.startsWith('/config')) return '/config'
  if (path.startsWith('/statistics')) return '/statistics'
  if (path.startsWith('/reports')) return '/reports'
  return path
})

const activeTitle = computed(() => menuItems.find((item) => item.index === activeMenu.value)?.label || '知识工作台')

const username = computed(() => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('username') || ''
})

function logout() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('access_token')
    window.localStorage.removeItem('username')
    window.location.href = '/'
  }
}

function goBackToPortal() {
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

void router
</script>

<style scoped>
.knowledge-layout {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 0%, rgba(79, 214, 154, 0.14), transparent 30%),
    radial-gradient(circle at 92% 18%, rgba(255, 143, 112, 0.08), transparent 24%),
    linear-gradient(135deg, var(--km-bg) 0%, var(--km-bg-2) 54%, #020403 100%);
}

.knowledge-layout::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background-image:
    linear-gradient(rgba(193, 227, 212, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(193, 227, 212, 0.035) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent 78%);
}

.knowledge-layout::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background:
    linear-gradient(120deg, transparent 0 38%, rgba(113, 215, 255, 0.055) 39%, transparent 41%),
    linear-gradient(60deg, transparent 0 62%, rgba(180, 125, 255, 0.04) 63%, transparent 65%);
  background-size: 420px 420px, 520px 520px;
  animation: km-particle-drift 28s linear infinite;
}

.km-aside {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 22px 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)),
    rgba(5, 10, 8, 0.78);
  border-right: 1px solid var(--km-border-light);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.km-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 8px 8px 24px;
}

.km-brand-mark {
  display: inline-flex;
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

.km-title {
  color: var(--km-ink);
  font-size: 17px;
  font-weight: 720;
  line-height: 1.1;
  letter-spacing: 0;
}

.km-subtitle {
  margin-top: 4px;
  color: var(--km-muted);
  font-size: 11px;
  font-weight: 560;
  letter-spacing: 0;
  text-transform: uppercase;
}

.km-menu {
  --el-menu-bg-color: transparent;
  --el-menu-text-color: var(--km-muted);
  --el-menu-hover-bg-color: rgba(79, 214, 154, 0.08);
  --el-menu-active-color: var(--km-green-strong);
  flex: 1;
  border-right: none;
  background: transparent;
}

.km-menu :deep(.el-menu-item) {
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  grid-template-rows: 20px 16px;
  column-gap: 10px;
  height: 58px;
  margin: 6px 0;
  padding: 10px 12px !important;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 18px;
  color: var(--km-muted);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.1;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.km-menu :deep(.el-menu-item .el-icon) {
  grid-row: 1 / 3;
  align-self: center;
  margin: 0;
  color: currentColor;
  font-size: 18px;
  transition: transform 180ms var(--km-ease-out);
}

.km-menu :deep(.el-menu-item small) {
  color: #9db0a8;
  font-size: 11px;
  font-weight: 640;
}

.km-menu :deep(.el-menu-item:hover) {
  border-color: var(--km-border-light);
  color: var(--km-text);
  box-shadow: inset 0 0 0 1px rgba(114, 239, 182, 0.16), 0 12px 34px rgba(79, 214, 154, 0.08);
  transform: translateY(-1px);
}

.km-menu :deep(.el-menu-item:hover .el-icon) {
  transform: translateX(2px) rotate(-6deg);
}

.km-menu :deep(.el-menu-item.is-active) {
  border-color: rgba(114, 239, 182, 0.28);
  color: var(--km-green-strong);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.16), rgba(255, 255, 255, 0.045)),
    rgba(79, 214, 154, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: km-soft-pulse 2.2s ease-in-out infinite;
}

.km-menu :deep(.el-menu-item.is-active::after) {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  content: "";
  background: var(--km-green-strong);
  box-shadow: 0 0 0 5px rgba(79, 214, 154, 0.1);
  animation: km-soft-pulse 1.6s ease-in-out infinite;
}

.km-aside-card {
  display: flex;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--km-border-light);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.045);
}

.km-live-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: 999px;
  background: var(--km-green-strong);
  box-shadow: 0 0 0 6px rgba(79, 214, 154, 0.1);
  animation: km-soft-pulse 1.8s ease-in-out infinite;
}

.km-aside-card strong {
  color: var(--km-ink);
  font-size: 13px;
}

.km-aside-card p {
  margin: 4px 0 0;
  color: var(--km-muted);
  font-size: 12px;
  line-height: 1.5;
}

.km-frame {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 100vh;
}

.km-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  height: 76px;
  padding: 0 clamp(20px, 3vw, 42px);
  color: var(--km-text);
  background: rgba(5, 10, 8, 0.62);
  border-bottom: 1px solid var(--km-border-light);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.km-back {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  height: 38px;
  padding: 0 14px 0 12px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 620;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.km-back .el-icon {
  transition: transform 160ms var(--km-ease-out);
}

.km-back:hover {
  color: var(--km-green-strong);
  background: rgba(79, 214, 154, 0.1);
  border-color: rgba(79, 214, 154, 0.34);
  transform: translateY(-1px);
}

.km-back:hover .el-icon {
  transform: translateX(-3px);
}

.km-back:active {
  transform: translateY(0) scale(0.98);
}

.km-header-center {
  min-width: 0;
}

.km-header-kicker {
  display: block;
  color: var(--km-faint);
  font-size: 11px;
  font-weight: 680;
  letter-spacing: 0;
  text-transform: uppercase;
}

.km-header-center strong {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--km-ink);
  font-size: 17px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.km-user {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
  color: var(--km-muted);
}

.km-username {
  max-width: 180px;
  overflow: hidden;
  color: var(--km-text);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.km-logout {
  color: var(--km-green-strong);
}

.km-main {
  min-width: 0;
  padding: clamp(24px, 3vw, 42px);
  background: transparent;
}

.km-content {
  width: min(94vw, 1720px);
  max-width: none;
  margin: 0 auto;
}

@media (max-width: 1080px) {
  .km-aside.el-aside {
    width: 224px !important;
  }

  .km-main {
    padding: 28px;
  }
}

@media (max-width: 768px) {
  .knowledge-layout {
    flex-direction: column;
  }

  .km-aside.el-aside {
    width: 100% !important;
    min-height: auto;
    padding: 14px;
    border-right: 0;
    border-bottom: 1px solid var(--km-border-light);
  }

  .km-brand,
  .km-aside-card {
    display: none;
  }

  .km-menu {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .km-menu::-webkit-scrollbar {
    display: none;
  }

  .km-menu :deep(.el-menu-item) {
    flex: 0 0 auto;
    display: flex;
    gap: 8px;
    align-items: center;
    height: 42px;
    margin: 0;
    padding: 0 14px !important;
  }

  .km-menu :deep(.el-menu-item small) {
    display: none;
  }

  .km-header {
    height: auto;
    min-height: 66px;
    grid-template-columns: auto minmax(0, 1fr);
    padding: 12px 16px;
  }

  .km-user {
    grid-column: 1 / -1;
    justify-content: space-between;
  }

  .km-main {
    padding: 20px 16px 28px;
  }

  .km-content {
    width: 100%;
  }
}
</style>
