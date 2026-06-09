<script setup>
import { reactive, watch, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  regionOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const formRef = ref(null)
const form = reactive({
  name: '',
  region: ''
})

const rules = {
  name: [{ required: true, message: '请输入拨测池名称', trigger: 'blur' }],
  region: [{ required: true, message: '请选择所属区域', trigger: 'change' }]
}

function close() {
  emit('update:modelValue', false)
}

function reset() {
  form.name = ''
  form.region = ''
  formRef?.clearValidate?.()
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) reset()
  }
)

async function onConfirm() {
  const ok = await formRef.value?.validate?.().catch(() => false)
  if (!ok) return
  emit('submit', { name: form.name.trim(), region: form.region })
  close()
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="创建拨测池"
    width="980px"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="dlg-form">
      <el-form-item label="拨测池名称" prop="name" required>
        <el-input v-model="form.name" placeholder="请输入拨测池名称" size="large" clearable />
      </el-form-item>

      <el-form-item label="所属区域" prop="region" required>
        <el-select v-model="form.region" placeholder="选择所属区域" size="large" style="width: 100%">
          <el-option
            v-for="opt in regionOptions"
            :key="opt.value ?? opt"
            :label="opt.label ?? opt"
            :value="opt.value ?? opt"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dlg-footer">
        <el-button size="large" @click="close">取 消</el-button>
        <el-button size="large" type="primary" @click="onConfirm">确 定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dlg-form {
  padding: 6px 8px 0;
}

.dlg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dlg-form :deep(.el-form-item) {
  margin-bottom: 22px;
}
</style>
