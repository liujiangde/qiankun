<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, WarningFilled } from '@element-plus/icons-vue'
import MonitoringInformation from './monitoringInformation.vue'

const route = useRoute()
const router = useRouter()

// 与列表页一致的模拟数据，实际可改为接口按 id 拉取
const nodesMap = {
  1: {
    id: 1,
    host: 'collector-node-01',
    ip: '192.168.1.100',
    group: '生产环境组',
    category: '虚拟机',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '无',
    memoryLimit: '4GB',
    cpuLimit: '2核'
  },
  2: {
    id: 2,
    host: 'collector-node-02',
    ip: '192.168.1.101',
    group: '测试环境组',
    category: '容器',
    connectStatus: '未连接',
    collectStatus: '未采集',
    opStatus: '无',
    memoryLimit: '4GB',
    cpuLimit: '2核'
  },
  3: {
    id: 3,
    host: 'collector-node-03',
    ip: '192.168.1.102',
    group: '生产环境组',
    category: '虚拟机',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '无',
    memoryLimit: '4GB',
    cpuLimit: '2核'
  },
  4: {
    id: 4,
    host: 'collector-node-04',
    ip: '192.168.1.103',
    group: '开发环境组',
    category: '物理机',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '卸载失败',
    memoryLimit: '4GB',
    cpuLimit: '2核'
  },
  5: {
    id: 5,
    host: 'collector-node-05',
    ip: '192.168.1.104',
    group: '测试环境组',
    category: '物理机',
    connectStatus: '未连接',
    collectStatus: '错误',
    opStatus: '启动失败',
    memoryLimit: '4GB',
    cpuLimit: '2核'
  },
  6: {
    id: 6,
    host: 'collector-node-06',
    ip: '192.168.1.105',
    group: '开发环境组',
    category: '容器',
    connectStatus: '已连接',
    collectStatus: '未采集',
    opStatus: '停止失败',
    memoryLimit: '4GB',
    cpuLimit: '2核'
  }
}

const id = computed(() => route.params.id)

const detail = ref(null)
const networkIfaces = ref([])
const loading = ref(false)

/** 流量转发节点详情接口（mock）：接真实接口时替换此函数 */
function queryTrafficForwardingDetailApi(params) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rawId = params?.id
      const numId = rawId ? Number(rawId) : NaN
      const node = Number.isInteger(numId) ? nodesMap[numId] : null

      resolve({
        detail: node ? { ...node } : null,
        networkIfaces: [
          `eth0 (${node?.ip ?? '192.168.1.100'})`,
          'eth1 (10.0.0.11)',
          'docker0 (172.17.0.1)',
          'veth0 (172.17.0.2)',
          'veth1 (172.17.0.3)',
          'veth2 (172.17.0.4)',
          'br-1234567890ab (172.18.0.1)',
          'lo (127.0.0.1)'
        ]
      })
    }, 250)
  })
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await queryTrafficForwardingDetailApi({ id: id.value })
    detail.value = res?.detail ?? null
    networkIfaces.value = Array.isArray(res?.networkIfaces) ? res.networkIfaces : []
  } finally {
    loading.value = false
  }
}

const activeTab = ref('basic')

function opStatusText(opStatus) {
  if (opStatus === '无') return '无'
  const map = { 卸载失败: '卸载失败', 启动失败: '启动失败', 停止失败: '停止失败' }
  return map[opStatus] ?? opStatus
}

function goBack() {
  router.push({ name: 'trafficForwarding' })
}

onMounted(() => {
  fetchDetail()
})

watch(
  () => id.value,
  () => {
    fetchDetail()
  }
)
</script>

<template>
  <div class="traffic-forwarding-detail">
    <div class="detail-header">
      <el-button text type="primary" class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回列表
      </el-button>
    </div>

    <el-card shadow="never" class="detail-card" v-loading="loading">
      <div class="card-title">
        <div class="main-title">采集器详情</div>
        <div class="sub-title">查看采集器的详细信息和配置</div>
      </div>

      <template v-if="detail">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="基本信息" name="basic">
            <div class="section">
              <div class="section-title">基本信息</div>
              <el-row :gutter="32" class="section-body">
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">物理主机</div>
                  <div class="field-value strong">{{ detail.host }}</div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">物理IP</div>
                  <div class="field-value strong">{{ detail.ip }}</div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">分组</div>
                  <div class="field-value">{{ detail.group }}</div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">类别</div>
                  <div class="field-value">
                    <el-tag size="small" type="success" effect="light">{{ detail.category }}</el-tag>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">连通状态</div>
                  <div class="field-value">
                    <el-tag
                      size="small"
                      :type="detail.connectStatus === '已连接' ? 'success' : 'danger'"
                      effect="light"
                    >
                      {{ detail.connectStatus }}
                    </el-tag>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">采集状态</div>
                  <div class="field-value">
                    <el-tag
                      size="small"
                      :type="
                        detail.collectStatus === '正在采集'
                          ? 'primary'
                          : detail.collectStatus === '错误'
                            ? 'danger'
                            : 'info'
                      "
                      effect="light"
                    >
                      {{ detail.collectStatus }}
                    </el-tag>
                  </div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">内存限制</div>
                  <div class="field-value strong">{{ detail.memoryLimit }}</div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">CPU限制</div>
                  <div class="field-value strong">{{ detail.cpuLimit }}</div>
                </el-col>
                <el-col :xs="24" :sm="12" :md="6">
                  <div class="field-label">操作状态</div>
                  <div class="field-value">
                    <span v-if="detail.opStatus === '无'" class="op-status-none">无</span>
                    <span v-else class="op-status-fail">
                      <el-icon class="op-status-fail-icon"><WarningFilled /></el-icon>
                      {{ opStatusText(detail.opStatus) }}
                    </span>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <el-tab-pane label="监控信息" name="monitor" lazy>
            <MonitoringInformation :node-id="id" />
          </el-tab-pane>

          <el-tab-pane label="采集策略" name="collect">
            <div class="section empty-section">
              <el-empty description="采集策略配置暂未接入" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>

      <el-empty v-else description="未找到该节点或参数无效" />
    </el-card>
  </div>
</template>

<style scoped>

.traffic-forwarding-detail {
  padding: 0;
}

.detail-header {
  margin-bottom: 8px;
}

.back-btn {
  padding-left: 0;
}

.back-btn .el-icon {
  margin-right: 4px;
}

.detail-card {
  padding: 12px 16px 24px;
}

.card-title {
  margin-bottom: 16px;
}

.main-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sub-title {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.section {
  margin-top: 16px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.section-body {
  padding: 16px 20px;
  background: #fafafa;
  border-radius: 8px;
}

.field-label {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.field-value {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.field-value.strong {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.network-tags {
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.network-tag {
  border-radius: 999px;
}

.empty-section {
  padding: 40px 0;
}
</style>
