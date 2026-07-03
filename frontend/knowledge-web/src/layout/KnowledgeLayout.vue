<template>
  <el-container class="knowledge-layout">
    <el-header class="km-header">
      <button class="km-back" type="button" aria-label="返回智能问答" title="返回智能问答" @click="goBackToPortal">
        <el-icon class="km-back-icon">
          <ArrowLeft />
        </el-icon>
        <span class="km-back-text">返回</span>
      </button>
      <div class="km-brand">
        <span class="km-brand-mark" aria-hidden="true"></span>
        <div>
          <div class="km-title">知识管理</div>
          <div class="km-subtitle">Enterprise Knowledge Workspace</div>
        </div>
      </div>
      <div class="km-user">
        <span v-if="username" class="km-username">{{ username }}</span>
        <el-button text size="small" class="km-logout" @click="logout">退出</el-button>
      </div>
    </el-header>

    <el-container class="km-frame">
      <el-aside class="km-aside" width="232px">
        <el-menu
          :default-active="activeMenu"
          :router="true"
          class="km-menu"
        >
          <el-menu-item index="/bases">知识库</el-menu-item>
          <el-menu-item index="/review">审核工作台</el-menu-item>
          <el-menu-item index="/search">知识检索</el-menu-item>
          <el-menu-item index="/config">系统配置</el-menu-item>
          <el-menu-item index="/statistics">数据统计</el-menu-item>
        </el-menu>
      </el-aside>

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
import { ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => {
  // 选中最近的有菜单项的祖先路径
  const path = route.path
  if (path.startsWith('/bases')) return '/bases'
  if (path.startsWith('/review')) return '/review'
  if (path.startsWith('/search')) return '/search'
  if (path.startsWith('/config')) return '/config'
  if (path.startsWith('/statistics')) return '/statistics'
  if (path.startsWith('/reports')) return '/reports'
  return path
})

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
  // 跳回统一智慧问答门户首页。
  // 与 logout() 的区别：这里不清理 access_token / username，
  // 用户从门户切过来再切回去不需要重新登录。
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

// 让 router 不报未用警告
void router
</script>

<style scoped>
.knowledge-layout {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at 14% 16%, rgba(237, 252, 233, 0.72), transparent 28%),
    linear-gradient(135deg, var(--km-canvas) 0%, var(--km-surface-soft) 58%, var(--km-surface) 100%);
}
.knowledge-layout::before {
  position: absolute;
  inset: 90px auto auto 50%;
  width: 460px;
  height: 460px;
  border-radius: 999px;
  pointer-events: none;
  content: "";
  background: rgba(255, 119, 89, 0.08);
  filter: blur(60px);
  transform: translateX(-10%);
}
.km-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72px;
  padding: 0 clamp(20px, 3vw, 42px);
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.76);
  border-bottom: 1px solid rgba(217, 217, 221, 0.78);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.km-back {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  height: 34px;
  margin-right: 14px;
  padding: 0 12px 0 10px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(217, 217, 221, 0.78);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 560;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}
.km-back:hover {
  background: var(--km-green-soft);
  border-color: rgba(0, 60, 51, 0.22);
  color: var(--km-green);
  transform: translateY(-1px);
}
.km-back:active {
  transform: translateY(0);
}
.km-back-icon {
  font-size: 14px;
}
.km-back-text {
  line-height: 1;
}
/* 小屏：只保留图标，文字隐藏 */
@media (max-width: 768px) {
  .km-back-text {
    display: none;
  }
  .km-back {
    margin-right: 10px;
    padding: 0 9px;
  }
}
.km-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}
.km-brand-mark {
  display: inline-flex;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(0, 60, 51, 0.18);
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(0, 60, 51, 0.96), rgba(23, 23, 28, 0.94)),
    var(--km-green);
  box-shadow: 0 8px 24px rgba(0, 60, 51, 0.12);
}
.km-title {
  font-size: 17px;
  font-weight: 680;
  line-height: 1.1;
  letter-spacing: 0;
}
.km-subtitle {
  margin-top: 3px;
  color: var(--km-muted);
  font-size: 11px;
  font-weight: 520;
  letter-spacing: 0;
  text-transform: uppercase;
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
  color: var(--km-green);
}
.km-frame {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 72px);
  min-height: calc(100dvh - 72px);
}
.km-aside {
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-right: 1px solid rgba(217, 217, 221, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.km-menu {
  --el-menu-bg-color: transparent;
  --el-menu-text-color: var(--km-muted);
  --el-menu-hover-bg-color: rgba(237, 252, 233, 0.6);
  --el-menu-active-color: var(--km-green);
  border-right: none;
  background: transparent;
}
.km-menu :deep(.el-menu-item) {
  position: relative;
  height: 44px;
  margin: 4px 0;
  padding: 0 14px 0 18px !important;
  border-radius: 13px;
  color: var(--km-muted);
  font-size: 14px;
  font-weight: 560;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}
.km-menu :deep(.el-menu-item:hover) {
  color: var(--km-text);
  transform: translateY(-1px);
}
.km-menu :deep(.el-menu-item.is-active) {
  color: var(--km-green);
  background: var(--km-green-soft);
}
.km-menu :deep(.el-menu-item.is-active)::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 8px;
  width: 3px;
  border-radius: 999px;
  content: "";
  background: var(--km-green);
}
.km-main {
  min-width: 0;
  padding: clamp(24px, 3vw, 44px);
  background: transparent;
}
.km-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .km-aside.el-aside {
    width: 208px !important;
  }
  .km-main {
    padding: 28px;
  }
}

@media (max-width: 768px) {
  .km-header {
    height: auto;
    min-height: 66px;
    gap: 16px;
    padding: 14px 18px;
  }
  .km-subtitle {
    display: none;
  }
  .km-frame {
    flex-direction: column;
    min-height: calc(100vh - 66px);
    min-height: calc(100dvh - 66px);
  }
  .km-aside.el-aside {
    width: 100% !important;
    padding: 10px 14px;
    border-right: 0;
    border-bottom: 1px solid rgba(217, 217, 221, 0.72);
  }
  .km-menu {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .km-menu::-webkit-scrollbar {
    display: none;
  }
  .km-menu :deep(.el-menu-item) {
    flex: 0 0 auto;
    height: 38px;
    margin: 0;
    padding: 0 14px !important;
  }
  .km-menu :deep(.el-menu-item.is-active)::before {
    display: none;
  }
  .km-main {
    padding: 20px 16px 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .knowledge-layout::before {
    display: none;
  }
}
</style>
