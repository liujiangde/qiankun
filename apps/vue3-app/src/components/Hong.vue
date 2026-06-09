<script setup>
import { ref, useAttrs, useSlots } from 'vue'

/*
宏与运行时 API 说明：
- defineOptions({ name }): 设置组件名，便于 DevTools 定位、<KeepAlive include> 匹配、递归组件引用
- defineProps(): 声明组件可接收的 props（类型/默认值）；在编译期注入，模板/逻辑均可使用
- defineEmits(): 声明并校验组件向外发出的事件；返回布尔表示是否通过校验
- defineModel(): 声明组件支持的 v-model；默认键为 modelValue，也可使用具名模型（如 open）
- useAttrs(): 访问未在 props 中声明的“透传属性”，可手动绑定到根元素以控制落点
- useSlots(): 访问插槽对象，便于判断插槽是否存在或获取插槽内容
- defineExpose(): 向父组件暴露实例方法/状态，父通过模板 ref 调用
*/

// defineOptions：设置组件名为 Hong，用于调试与缓存/递归场景
defineOptions({ name: 'Hong' })

// defineProps：声明输入属性，含类型与默认值
const props = defineProps({
  title: { type: String, default: 'Hong' },
  count: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false }
})

// defineEmits：声明输出事件及其校验函数
const emit = defineEmits({
  'update:count': (val) => typeof val === 'number',
  submit: (payload) => typeof payload === 'object' && payload !== null
})

// defineModel：支持双向绑定
// 默认模型：v-model → modelValue
const modelValue = defineModel({ type: String, default: '' })
// 具名模型：v-model:open → open
const open = defineModel('open', { type: Boolean, default: false })

// useAttrs：获取未声明为 props 的透传属性，绑定到根 el-card
const attrs = useAttrs()
// useSlots：获取插槽对象（默认与 header）
const slots = useSlots()

// 内部可变状态：以 props.count 为初始值
const internalCount = ref(props.count)
// 操作：在未禁用时自增，并通过 update:count 事件通知父级最新值
const inc = () => {
  if (!props.disabled) {
    internalCount.value++
    emit('update:count', internalCount.value)
  }
}
// 操作：提交当前模型与状态，触发 submit 事件
const submit = () => {
  emit('submit', { value: modelValue.value, open: open.value, count: internalCount.value })
}

// defineExpose：对父组件暴露可调用方法
defineExpose({
  setOpen: (val) => {
    open.value = !!val
  },
  reset: () => {
    modelValue.value = ''
    internalCount.value = 0
  }
})
</script>

<template>
  <!-- 根元素：绑定 attrs 以透传未声明属性（如 shadow、body-style 等） -->
  <el-card v-bind="attrs">
    <template #header>
      <!-- 具名插槽 header；未提供时显示 props.title -->
      <slot v-if="slots.header" name="header" />
      <span v-else>{{ props.title }}</span>
    </template>

    <el-form inline>
      <el-form-item label="值">
        <!-- 默认模型 v-model → modelValue -->
        <el-input v-model="modelValue" placeholder="输入值" clearable style="width: 220px" />
      </el-form-item>
      <el-form-item label="开关">
        <!-- 具名模型 v-model:open → open -->
        <el-switch v-model="open" />
      </el-form-item>
      <el-form-item label="计数">
        <el-tag type="info">{{ internalCount }}</el-tag>
        <!-- 点击触发 update:count 事件并自增内部计数 -->
        <el-button :disabled="props.disabled" @click="inc">+1</el-button>
      </el-form-item>
    </el-form>

    <div>
      <!-- 默认插槽：未提供时显示占位文案 -->
      <slot>默认插槽</slot>
    </div>

    <!-- 点击触发 submit 事件，携带当前模型与内部状态 -->
    <el-button type="primary" @click="submit">提交</el-button>
  </el-card>
</template>

<style scoped></style>
