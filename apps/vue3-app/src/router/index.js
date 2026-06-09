import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import HelloWorld from '../components/HelloWorld.vue'
import DialTabsLayout from '../pages/DialTabsLayout.vue'

const DemoPanel = () => import('../components/DemoPanel.vue')
const Hong = () => import('../components/Hong.vue')
const DialPoolManage = () => import('../pages/DialPoolManage/DialPoolManage.vue')
const DialSourceManage = () => import('../pages/DialSourceManage/index.vue')
const DialRuleManage = () => import('../pages/DialRuleManage/index.vue')
const DialVisualize = () => import('../pages/DialVisualize/index.vue')
const DialProbeGroupManage = () => import('../view/probeGroup/index.vue')
const ProbeGroupCollectionStrategy = () => import('../view/probeGroup/collectionStrategy/index.vue')
const TrafficForwardingManage = () =>
  import('../view/trafficForwarding/TrafficForwardingManage.vue')
const TrafficForwardingDetail = () =>
  import('../view/trafficForwarding/TrafficForwardingDetail.vue')
const TrafficWarning = () => import('../view/warnboce/index.vue')
const TrafficForwardingAlert = () => import('../view/warnboce/TrafficForwardingAlertTab.vue')
const NextPage = () => import('../view/nextPage/index.vue')

// 路由按业务域组织：
// - /dial：拨测池、拨测源、拨测规则和拨测可视化
// - /trafficForwarding：流量转发采集器管理
// - /probeGroup：探针分组和采集策略
// - /nextPage、/trafficWarning：告警规则和告警历史
// 大多数业务页面使用动态 import，访问对应路由时才加载页面代码。
export const routes = [
  { path: '/', name: 'home', component: HelloWorld },
  { path: '/demo', name: 'demo', component: DemoPanel },
  { path: '/hong', name: 'hong', component: Hong },
  {
    path: '/dial',
    component: DialTabsLayout,
    children: [
      { path: '', redirect: '/dial/pool' },
      { path: 'pool', name: 'dial-pool', component: DialPoolManage },
      { path: 'source', name: 'dial-source', component: DialSourceManage },
      { path: 'rule', name: 'dial-rule', component: DialRuleManage },
      { path: 'viz', name: 'dial-viz', component: DialVisualize }
    ]
  },
  { path: '/dial-pool', redirect: '/dial/pool' },
  { path: '/dial-source', redirect: '/dial/source' },
  { path: '/dial-rule', redirect: '/dial/rule' },
  { path: '/dial-viz', redirect: '/dial/viz' },
  { path: '/trafficForwarding', name: 'trafficForwarding', component: TrafficForwardingManage },
  { path: '/trafficWarning', name: 'trafficWarning', component: TrafficWarning },
  {
    path: '/trafficForwardingAlert',
    name: 'trafficForwardingAlert',
    component: TrafficForwardingAlert
  },
  { path: '/probeGroup', name: 'dial-probeGroup', component: DialProbeGroupManage },
  {
    path: '/probeGroup/collectionStrategy',
    name: 'probe-group-collection-strategy',
    component: ProbeGroupCollectionStrategy
  },
  {
    path: '/trafficForwarding/detail/:id',
    name: 'trafficForwardingDetail',
    component: TrafficForwardingDetail
  },
  { path: '/nextPage', name: 'nextPage', component: NextPage }
]

export function createAppRouter({ base = '/', useHash = false } = {}) {
  // qiankun 模式下使用 hash history，独立运行时仍使用 history，兼顾隔离和开发体验。
  // hash 模式会把 Vue 内部路由放到 /vue3-app#/xxx，避免影响主应用 pathname 匹配。
  return createRouter({
    history: useHash ? createWebHashHistory(base) : createWebHistory(base),
    routes
  })
}

export default createAppRouter()
