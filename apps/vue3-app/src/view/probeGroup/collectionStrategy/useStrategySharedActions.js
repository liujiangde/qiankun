import { ElMessage } from 'element-plus'

/**
 * 接收端列表通用操作（用于物理/虚机/容器）
 * - addReceiver: 最多 max 个
 * - removeReceiver: 至少保留 min 个
 */
export function useReceiverListActions({
  activePolicy,
  createEmptyReceiver,
  max = 3,
  min = 1,
  maxMsg = `接收端最多 ${max} 个`,
  minMsg = `至少保留 ${min} 个接收端`
}) {
  function addReceiver() {
    const p = activePolicy.value
    if (p.receivers.length >= max) {
      ElMessage.warning(maxMsg)
      return
    }
    p.receivers.push(createEmptyReceiver())
  }

  function removeReceiver(index) {
    const p = activePolicy.value
    if (p.receivers.length <= min) {
      ElMessage.warning(minMsg)
      return
    }
    p.receivers.splice(index, 1)
  }

  function updateVxlanField(field, value) {
    const p = activePolicy.value
    if (!p || !['vni', 'rateLimit'].includes(field)) return
    p[field] = value
  }

  function updateReceiverIp(index, value) {
    const receiver = activePolicy.value?.receivers?.[index]
    if (!receiver) return
    receiver.ip = value
  }

  return { addReceiver, removeReceiver, updateVxlanField, updateReceiverIp }
}

/**
 * 采集状态 switch 统一处理
 * - 调用 onToggleCollection(next)
 * - 失败时回滚开关 UI
 */
export function useCollectionSwitchAction({ activePolicy, onToggleCollection }) {
  function rollbackSwitchValue(target) {
    const p = activePolicy.value
    if (!p || typeof p !== 'object') return
    p.status = target ? 'disable' : 'enable'
  }

  async function onCollectionSwitchChange(next) {
    const target = typeof next === 'string' ? next.toLowerCase() === 'enable' : Boolean(next)
    const ok = await onToggleCollection(target)
    if (!ok) rollbackSwitchValue(target)
  }

  return { onCollectionSwitchChange }
}

/**
 * 列表删除通用操作
 * - 至少保留 min 条
 * - 下标越界时忽略
 */
export function useMinListRemoveAction({ getList, min = 1, minMsg = `至少保留 ${min} 条` }) {
  function removeAt(index) {
    // 用 getList 延迟读取，避免组合式函数创建时就绑定旧引用
    const list = getList?.()
    if (!Array.isArray(list)) return
    if (list.length <= min) {
      ElMessage.warning(minMsg)
      return
    }
    // 越界删除直接忽略，避免调用方重复写边界判断
    if (index < 0 || index >= list.length) return
    list.splice(index, 1)
  }

  return { removeAt }
}
