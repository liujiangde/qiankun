// 流量转发相关 mock 数据集中维护，页面只保留交互、筛选和展示逻辑。
export const trafficForwardingAlertMockRecords = [
  {
    id: 101,
    alarmContent: '转发链路 A→B 丢包率超阈值',
    ruleName: '核心链路转发监控',
    hostIp: '10.12.0.21',
    hostName: 'fwd-core-01',
    abnormalStatus: 'ALERTING',
    abnormalTime: '2026-05-12 09:15:00',
    alarmTime: '2026-05-12 09:18:22'
  },
  {
    id: 102,
    alarmContent: '会话表项增长异常',
    ruleName: '会话容量告警',
    hostIp: '10.12.0.22',
    hostName: 'fwd-edge-sz',
    abnormalStatus: 'UNACK',
    abnormalTime: '2026-05-11 14:02:00',
    alarmTime: '2026-05-11 14:05:10'
  },
  {
    id: 103,
    alarmContent: '南北向转发延迟升高',
    ruleName: '时延类转发规则',
    hostIp: '172.16.8.5',
    hostName: 'gw-north-03',
    abnormalStatus: 'RECOVERED',
    abnormalTime: '2026-05-10 22:40:00',
    alarmTime: '2026-05-10 22:42:00'
  },
  {
    id: 104,
    alarmContent: 'VXLAN 隧道 down',
    ruleName: '隧道可用性',
    hostIp: '10.20.1.1',
    hostName: 'fwd-vxlan-01',
    abnormalStatus: 'ALERTING',
    abnormalTime: '2026-05-10 08:00:00',
    alarmTime: '2026-05-10 08:01:30'
  },
  {
    id: 105,
    alarmContent: '策略路由切换失败',
    ruleName: '策略路由监控',
    hostIp: '10.20.1.2',
    hostName: 'fwd-policy-02',
    abnormalStatus: 'RECOVERED',
    abnormalTime: '2026-05-09 16:20:00',
    alarmTime: '2026-05-09 16:25:00'
  },
  {
    id: 106,
    alarmContent: 'NAT 端口耗尽预警',
    ruleName: 'NAT 资源',
    hostIp: '192.168.1.1',
    hostName: 'nat-gw-home',
    abnormalStatus: 'UNACK',
    abnormalTime: '2026-05-09 11:00:00',
    alarmTime: '2026-05-09 11:02:00'
  },
  {
    id: 107,
    alarmContent: '跨机房转发中断',
    ruleName: '双活转发',
    hostIp: '10.8.0.10',
    hostName: 'fwd-dc-a',
    abnormalStatus: 'ALERTING',
    abnormalTime: '2026-05-08 19:30:00',
    alarmTime: '2026-05-08 19:31:00'
  },
  {
    id: 108,
    alarmContent: 'QoS 队列溢出',
    ruleName: 'QoS 监控',
    hostIp: '10.8.0.11',
    hostName: 'fwd-dc-b',
    abnormalStatus: 'RECOVERED',
    abnormalTime: '2026-05-07 10:10:00',
    alarmTime: '2026-05-07 10:12:00'
  }
]

export const trafficForwardingNodeMockRecords = [
  {
    id: 1,
    host: 'collector-node-01',
    ip: '192.168.1.100',
    group: '生产环境组',
    category: '物理机',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '无'
  },
  {
    id: 2,
    host: 'collector-node-02',
    ip: '192.168.1.101',
    group: '测试环境组',
    category: '容器',
    connectStatus: '未连接',
    collectStatus: '未采集',
    opStatus: '待执行'
  },
  {
    id: 3,
    host: 'collector-node-03',
    ip: '192.168.1.102',
    group: '生产环境组',
    category: '虚拟机',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '执行中'
  },
  {
    id: 4,
    host: 'collector-node-04',
    ip: '192.168.1.103',
    group: '开发环境组',
    category: '物理机',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '卸载失败'
  },
  {
    id: 5,
    host: 'collector-node-05',
    ip: '192.168.1.104',
    group: '测试环境组',
    category: '物理机',
    connectStatus: '未连接',
    collectStatus: '错误',
    opStatus: '启动失败'
  },
  {
    id: 6,
    host: 'collector-node-06',
    ip: '192.168.1.105',
    group: '开发环境组',
    category: '容器',
    connectStatus: '已连接',
    collectStatus: '未采集',
    opStatus: '停止失败'
  },
  {
    id: 7,
    host: 'collector-node-07',
    ip: '192.168.1.106',
    group: '生产环境组',
    category: '容器',
    connectStatus: '已连接',
    collectStatus: '正在采集',
    opStatus: '执行成功'
  },
  {
    id: 8,
    host: 'collector-node-08',
    ip: '192.168.1.107',
    group: '测试环境组',
    category: '虚拟机',
    connectStatus: '未连接',
    collectStatus: '错误',
    opStatus: '超时'
  },
  {
    id: 9,
    host: 'collector-node-09',
    ip: '192.168.1.108',
    group: '开发环境组',
    category: '物理机',
    connectStatus: '已连接',
    collectStatus: '未采集',
    opStatus: '参数错误'
  }
]

export const tfAlarmRuleImportResult = {
  total: 10,
  created: 0,
  updated: 0,
  failed: 3,
  reasons: [
    '第3行,拨测池[拨测池1]不存在',
    '第4行,拨测方式不能为空',
    '第4行,规则名称不能为空',
    '第4行,规则名称不能为空',
    '第4行,规则名称不能为空',
    '第4行,规则名称不能为空',
    '第4行,规则名称不能为空',
    '第4行,规则名称不能为空',
    '第4行,规则名称不能为空'
  ]
}

export const tfAlarmRuleMockRecords = [
  {
    id: 101,
    ruleName: '生产组核心机房告警',
    alarmContent: '生产分组核心物理机异常，请立即排查',
    alertCondition:
      '{"ruleGroup":[{"groupId":"1","agentId":"1,2,3"},{"groupId":"2","agentId":"7"}],"relation":"OR"}',
    abnormalDuration: 10,
    compressTime: 30,
    status: 1,
    lastAlarmTime: '2026-05-06 14:20:00',
    createTime: '2026-04-30 09:00:00',
    createUser: 'admin',
    updateTime: '2026-05-06 14:21:00',
    updateUser: 'admin'
  },
  {
    id: 102,
    ruleName: '测试组单机告警',
    alarmContent: '测试环境单机异常持续，请关注',
    alertCondition: '{"ruleGroup":[{"groupId":"3","agentId":"5"}],"relation":"OR"}',
    abnormalDuration: 5,
    compressTime: 15,
    status: 0,
    lastAlarmTime: '2026-05-05 11:42:00',
    createTime: '2026-04-28 16:12:00',
    createUser: 'ops',
    updateTime: '2026-05-05 11:50:00',
    updateUser: 'ops'
  },
  {
    id: 103,
    ruleName: '混合分组兜底告警',
    alarmContent: '多个分组任一命中即触发告警',
    alertCondition:
      '{"ruleGroup":[{"groupId":"10","agentId":"11,12"},{"groupId":"20"},{"groupId":"30","agentId":"31"}],"relation":"OR"}',
    abnormalDuration: 8,
    compressTime: 20,
    status: 1,
    lastAlarmTime: '2026-05-04 09:18:00',
    createTime: '2026-04-27 10:30:00',
    createUser: 'admin',
    updateTime: '2026-05-04 09:19:00',
    updateUser: 'admin'
  }
]

export const tfAlarmRuleScopeGroups = [
  { label: '生产环境分组', value: 'g-prod' },
  { label: '测试环境分组', value: 'g-test' }
]

export const tfAlarmRulePhysicalMachinesByGroup = {
  'g-prod': [
    { label: 'PM-机房A-001', value: 'pm-a-001' },
    { label: 'PM-机房A-002', value: 'pm-a-002' }
  ],
  'g-test': [{ label: 'PM-测试-101', value: 'pm-test-101' }]
}

export const tfAlarmRuleAlertContentTagsRaw = [
  '所属分组名称',
  '物理机名称',
  '物理机ip',
  '异常状态持续时间',
  '告警压缩时间',
  '所在区域',
  '物理机所属室',
  '物理机所属环境',
  { label: '拨测源名称', placeholder: '{{拨测源名称}}' },
  { label: '超时时间(毫秒)', token: '{{timeoutMs}}' }
]
