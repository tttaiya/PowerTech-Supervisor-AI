import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/**
 * 知识管理子应用路由（R18）。
 *
 * <p>所有路由以 /knowledge/ 为根，createWebHistory 用 import.meta.env.BASE_URL
 * 自动适配。直接访问 /knowledge/bases/1/documents 也能正确匹配子应用路由。
 *
 * <p>路由守卫：无 access_token 跳回根路径（由 super-biz-agent 处理登录）。
 * 后端 Gateway 仍是最终鉴权入口，前端守卫只负责用户体验。
 */
const isReportEntry = typeof window !== 'undefined' && window.location.pathname.startsWith('/reports')
const isShowcaseEntry =
  typeof window !== 'undefined' &&
  (window.location.pathname.startsWith('/showcase') || window.location.pathname.startsWith('/team-showcase'))

const knowledgeRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/bases',
  },
  {
    path: '/bases',
    name: 'KnowledgeBaseList',
    component: () => import('@/views/knowledge/KnowledgeBaseList.vue'),
  },
  {
    // F2 commit #30：知识库详情页（与 /bases/:kbId/documents 兄弟）
    path: '/bases/:kbId',
    name: 'KnowledgeBaseDetail',
    component: () => import('@/views/knowledge/KnowledgeBaseDetail.vue'),
    props: true,
  },
  {
    path: '/bases/:kbId/documents',
    name: 'DocumentList',
    component: () => import('@/views/knowledge/DocumentList.vue'),
    props: true,
  },
  {
    path: '/bases/:kbId/recycle-bin',
    name: 'RecycleBin',
    component: () => import('@/views/knowledge/RecycleBin.vue'),
    props: true,
  },
  {
    path: '/review',
    name: 'ReviewWorkbench',
    component: () => import('@/views/knowledge/ReviewWorkbench.vue'),
  },
  {
    path: '/search',
    name: 'RetrievalPage',
    component: () => import('@/views/knowledge/RetrievalPage.vue'),
  },
  {
    path: '/config',
    name: 'ConfigPage',
    component: () => import('@/views/knowledge/ConfigPage.vue'),
  },
  {
    path: '/statistics',
    name: 'StatisticsPage',
    component: () => import('@/views/knowledge/StatisticsPage.vue'),
  },
  {
    path: '/showcase',
    name: 'KnowledgeShowcaseInApp',
    component: () => import('@/views/showcase/KnowledgeShowcase.vue'),
    meta: { fullscreen: true, public: true },
  },
  {
    path: '/team-showcase',
    name: 'TeamShowcaseInApp',
    component: () => import('@/views/showcase/TeamShowcase.vue'),
    meta: { fullscreen: true, public: true },
  },
  {
    path: '/reports',
    name: 'ReportWorkspace',
    component: () => import('@/views/report/ReportWorkspace.vue'),
    meta: { fullscreen: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/knowledge/NotFound.vue'),
  },
]

const reportRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'ReportWorkspaceRoot',
    component: () => import('@/views/report/ReportWorkspace.vue'),
    meta: { fullscreen: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const showcaseRoutes: RouteRecordRaw[] = [
  {
    path: '/showcase',
    name: 'KnowledgeShowcase',
    component: () => import('@/views/showcase/KnowledgeShowcase.vue'),
    meta: { fullscreen: true, public: true },
  },
  {
    path: '/team-showcase',
    name: 'TeamShowcase',
    component: () => import('@/views/showcase/TeamShowcase.vue'),
    meta: { fullscreen: true, public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/team-showcase',
  },
]

const router = createRouter({
  history: createWebHistory(isReportEntry ? '/reports/' : isShowcaseEntry ? '/' : '/knowledge/'),
  routes: isReportEntry ? reportRoutes : isShowcaseEntry ? showcaseRoutes : knowledgeRoutes,
})

router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.public)) {
    next()
    return
  }

  // Do not redirect while auth or page data is still restoring. The gateway and
  // page-level error states handle authorization; keeping the route stable avoids
  // refresh blank screens and cross-module jump-backs during demos.
  next()
})

export default router
