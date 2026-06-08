// 拨测相关 mock 数据集中在这里，页面不再直接维护大段演示数据。
export const tbDetectionAlertMockRecords = [
  {
    id: 1,
    content: '测试告警',
    createTime: '2026-04-22T18:00:00',
    resultId: null,
    ruleId: 1,
    managementIP: '172.16.1.21',
    target: '147.95.205.11:22',
    ruleName: '测试规则',
    alertCondition: 'all'
  },
  {
    id: 2,
    content: '端口可达性波动',
    createTime: '2026-04-21T15:20:00',
    resultId: 12001,
    ruleId: 2,
    managementIP: '172.16.1.22',
    target: '10.20.0.8:443',
    ruleName: '链路拨测规则',
    alertCondition: 'any'
  },
  {
    id: 3,
    content: '响应延迟超阈值',
    createTime: '2026-04-20T08:40:00',
    resultId: null,
    ruleId: 3,
    managementIP: '172.16.1.23',
    target: '10.20.0.9:80',
    ruleName: 'HTTP 时延规则',
    alertCondition: 'all'
  },
  {
    id: 4,
    content: 'DNS 拨测失败',
    createTime: '2026-04-19T11:05:00',
    resultId: 12002,
    ruleId: 4,
    managementIP: '172.16.1.24',
    target: '8.8.8.8:53',
    ruleName: 'DNS 可用性规则',
    alertCondition: 'any'
  },
  {
    id: 5,
    content: 'SSH 连通性异常',
    createTime: '2026-04-18T22:12:00',
    resultId: null,
    ruleId: 5,
    managementIP: '172.16.1.25',
    target: '192.168.100.10:22',
    ruleName: '主机 SSH 规则',
    alertCondition: 'all'
  }
]

export const dialRuleMockRecords = [
  {
    id: 1,
    pool: '拨测池A1',
    method: 'ping',
    target: '192.168.1.1:8080',
    cron: '* /5 * * * *',
    timeout: '20秒',
    retry: 3,
    creator: '张三',
    updatedAt: '2026-02-15',
    status: '已停止'
  },
  {
    id: 2,
    pool: '拨测池B2',
    method: 'tcp',
    target: 'http://example.com',
    cron: '* /10 * * * *',
    timeout: '5秒',
    retry: 1,
    creator: '李四',
    updatedAt: '2026-02-26',
    status: '运行中'
  },
  {
    id: 3,
    pool: '拨测池C3',
    method: 'http/https',
    target: '192.168.1.2:3306',
    cron: '0 * * * *',
    timeout: '6秒',
    retry: 2,
    creator: '王五',
    updatedAt: '2026-02-09',
    status: '已停止'
  },
  {
    id: 4,
    pool: '拨测池D4',
    method: 'ping',
    target: 'http://test.com/api',
    cron: '0 0 * * *',
    timeout: '24秒',
    retry: 3,
    creator: '赵六',
    updatedAt: '2026-02-14',
    status: '运行中'
  },
  {
    id: 5,
    pool: '拨测池E5',
    method: 'tcp',
    target: '192.168.1.3:22',
    cron: '* /15 * * * *',
    timeout: '10秒',
    retry: 2,
    creator: '钱七',
    updatedAt: '2026-02-20',
    status: '已停止'
  },
  {
    id: 6,
    pool: '拨测池A1',
    method: 'http/https',
    target: '192.168.1.4:80',
    cron: '* /5 * * * *',
    timeout: '15秒',
    retry: 1,
    creator: '张三',
    updatedAt: '2026-02-16',
    status: '运行中'
  },
  {
    id: 7,
    pool: '拨测池B2',
    method: 'ping',
    target: 'https://api.example.com',
    cron: '0 */2 * * *',
    timeout: '8秒',
    retry: 3,
    creator: '李四',
    updatedAt: '2026-02-22',
    status: '已停止'
  },
  {
    id: 8,
    pool: '拨测池C3',
    method: 'tcp',
    target: '192.168.1.5:443',
    cron: '* /30 * * * *',
    timeout: '12秒',
    retry: 2,
    creator: '王五',
    updatedAt: '2026-02-18',
    status: '运行中'
  },
  {
    id: 9,
    pool: '拨测池D4',
    method: 'ping',
    target: '192.168.1.6:22',
    cron: '0 0 * * *',
    timeout: '5秒',
    retry: 1,
    creator: '赵六',
    updatedAt: '2026-02-24',
    status: '已停止'
  },
  {
    id: 10,
    pool: '拨测池E5',
    method: 'http/https',
    target: 'http://demo.com',
    cron: '* /10 * * * *',
    timeout: '20秒',
    retry: 2,
    creator: '钱七',
    updatedAt: '2026-02-28',
    status: '运行中'
  },
  {
    id: 11,
    pool: '拨测池A1',
    method: 'tcp',
    target: '192.168.1.7:3306',
    cron: '0 * * * *',
    timeout: '6秒',
    retry: 3,
    creator: '张三',
    updatedAt: '2026-03-01',
    status: '已停止'
  },
  {
    id: 12,
    pool: '拨测池B2',
    method: 'ping',
    target: '192.168.1.8:8080',
    cron: '* /5 * * * *',
    timeout: '10秒',
    retry: 1,
    creator: '李四',
    updatedAt: '2026-02-27',
    status: '运行中'
  },
  {
    id: 13,
    pool: '拨测池C3',
    method: 'http/https',
    target: 'https://test.org',
    cron: '* /15 * * * *',
    timeout: '18秒',
    retry: 2,
    creator: '王五',
    updatedAt: '2026-02-19',
    status: '已停止'
  },
  {
    id: 14,
    pool: '拨测池D4',
    method: 'ping',
    target: '192.168.1.9:80',
    cron: '0 0 * * *',
    timeout: '5秒',
    retry: 1,
    creator: '赵六',
    updatedAt: '2026-02-25',
    status: '运行中'
  },
  {
    id: 15,
    pool: '拨测池E5',
    method: 'tcp',
    target: '192.168.1.10:22',
    cron: '* /20 * * * *',
    timeout: '12秒',
    retry: 2,
    creator: '钱七',
    updatedAt: '2026-03-02',
    status: '已停止'
  }
]

export const dialRuleAlertTagOptions = [
  '所属规则',
  '所属拨测池',
  '拨测源ip',
  '拨测源名称',
  '超时时间',
  '重试次数',
  '目标对象类型',
  '目标对象',
  '告警压缩时间',
  '所在区域',
  '物理机所属室',
  '物理机所属环境'
]
