<template>
  <el-dialog
    :model-value="modelValue"
    title="编辑分块"
    width="min(920px, 92vw)"
    class="review-chunk-dialog"
    @close="close"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="chunk" class="editor-shell">
      <section class="chunk-summary">
        <div>
          <span class="editor-kicker">Chunk Review Editor</span>
          <h3>切片 #{{ chunk.chunkIndex }}</h3>
          <p>保存后会创建重向量化任务，并在审核记录中留下编辑动作。</p>
        </div>
        <div class="summary-tags">
          <span>字符 {{ draft.length }}</span>
          <span v-if="chunk.pageNo">第 {{ chunk.pageNo }} 页</span>
          <span v-if="chunk.chunkType">{{ chunk.chunkType }}</span>
          <span v-if="chunk.vectorStatus">向量 {{ chunk.vectorStatus }}</span>
        </div>
      </section>
      <div v-if="chunk.chapterPath" class="chapter-path">{{ chunk.chapterPath }}</div>
    </div>
    <el-input v-model="draft" type="textarea" :rows="16" resize="vertical" class="chunk-textarea" />
    <template #footer>
      <div class="editor-footer">
        <span>请确认正文完整、边界清晰，再保存进入重向量化。</span>
        <div>
          <el-button @click="close">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="save">保存并重向量化</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ReviewChunk } from '@/api/modules/review'

const props = defineProps<{
  modelValue: boolean
  chunk: ReviewChunk | null
  submitting: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'save', content: string): void
}>()

const draft = ref('')

watch(
  () => props.chunk,
  (chunk) => {
    draft.value = chunk?.content || ''
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

function save() {
  if (!draft.value.trim()) {
    ElMessage.warning('分块正文不能为空')
    return
  }
  if (props.chunk && draft.value.trim() === props.chunk.content.trim()) {
    ElMessage.info('当前内容未发生变化，无需保存')
    return
  }
  emit('save', draft.value)
}
</script>

<style scoped>
.chunk-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.1), rgba(113, 215, 255, 0.045)),
    rgba(255, 255, 255, 0.035);
  transition:
    border-color 160ms var(--km-ease-out),
    box-shadow 160ms var(--km-ease-out);
}

.chunk-summary:hover {
  border-color: rgba(114, 239, 182, 0.32);
  box-shadow: 0 14px 40px rgba(79, 214, 154, 0.09);
}

.editor-kicker {
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 11px;
  font-weight: 760;
}

.chunk-summary h3 {
  margin: 6px 0 0;
  color: var(--km-ink);
  font-size: 20px;
}

.chunk-summary p {
  margin: 6px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.summary-tags span,
.chapter-path {
  display: inline-flex;
  padding: 5px 10px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.045);
  font-size: 12px;
}

.chapter-path {
  max-width: 100%;
  margin-bottom: 12px;
  border-radius: 12px;
  color: var(--km-muted);
  word-break: break-word;
}

.chunk-textarea :deep(.el-textarea__inner) {
  min-height: 360px !important;
  line-height: 1.7;
  transition:
    box-shadow 160ms var(--km-ease-out),
    background-color 160ms var(--km-ease-out);
}

.chunk-textarea :deep(.el-textarea__inner:focus) {
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 0 0 1px rgba(114, 239, 182, 0.78) inset, 0 0 0 4px rgba(79, 214, 154, 0.1);
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.editor-footer span {
  color: var(--km-muted);
  font-size: 12px;
}

@media (max-width: 680px) {
  .chunk-summary {
    grid-template-columns: 1fr;
  }

  .summary-tags {
    justify-content: flex-start;
  }

  .editor-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
