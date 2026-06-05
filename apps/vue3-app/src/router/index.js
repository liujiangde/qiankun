import { createRouter, createWebHistory } from 'vue-router'
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
const TrafficForwardingManage = () => import('../view/trafficForwarding/TrafficForwardingManage.vue')
const TrafficForwardingDetail = () => import('../view/trafficForwarding/TrafficForwardingDetail.vue')
const TrafficWarning = () => import('../view/warnboce/index.vue')
const TrafficForwardingAlert = () => import('../view/warnboce/TrafficForwardingAlertTab.vue')
const NextPage = () => import('../view/nextPage/index.vue')

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
      { path: 'viz', name: 'dial-viz', component: DialVisualize },
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
  { path: '/trafficForwarding/detail/:id', name: 'trafficForwardingDetail', component: TrafficForwardingDetail },
  { path: '/nextPage', name: 'nextPage', component: NextPage },
]

export function createAppRouter(base = '/') {
  return createRouter({
    history: createWebHistory(base),
    routes
  })
}

export default createAppRouter()
