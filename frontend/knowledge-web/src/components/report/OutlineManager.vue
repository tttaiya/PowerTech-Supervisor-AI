<template>
  <GlassCard class="outline-manager" variant="panel">
    <template #header>
      <PowerSectionTitle
        :icon="OutlineIcon"
        title="大纲管理"
        subtitle="支持查看、增删改、重新生成和保存整份大纲"
      >
        <template #actions>
          <div class="toolbar">
            <ReportIdSelect v-model="localReportId" @change="load" />
            <GlowButton @click="load">加载</GlowButton>
            <GlowButton @click="addItem">新增章节</GlowButton>
            <GlowButton @click="regenerate">重新生成</GlowButton>
            <GlowButton @click="$emit('go-generation')">去生成正文</GlowButton>
          </div>
        </template>
      </PowerSectionTitle>
    </template>

    <div class="outline-body">
      <el-table :data="items" border row-key="id" class="glass-table">
        <el-table-column prop="chapterNo" label="编号" width="110">
          <template #default="{ row }">
            <el-input v-model="row.chapterNo" class="thin-input" />
          </template>
        </el-table-column>
        <el-table-column prop="chapterTitle" label="章节标题" min-width="220">
          <template #default="{ row }">
            <el-input v-model="row.chapterTitle" class="thin-input" />
          </template>
        </el-table-column>
        <el-table-column label="层级" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.level" :min="1" :max="4" class="thin-input" />
          </template>
        </el-table-column>
        <el-table-column label="排序" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.sort" :min="0" class="thin-input" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag class="status-tag">{{ row.status || 'DRAFT' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <div class="outline-actions">
              <GlowButton class="outline-action" @click="saveItem(row)">保存</GlowButton>
              <GlowButton class="outline-action" @click="moveItem(row, -1)">上移</GlowButton>
              <GlowButton class="outline-action" @click="moveItem(row, 1)">下移</GlowButton>
              <GlowButton class="outline-action outline-action--danger" @click="removeItem(row)">
                删除
              </GlowButton>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <div class="actions">
        <GlowButton :loading="saving" @click="saveAll">保存整份大纲</GlowButton>
      </div>
    </template>
  </GlassCard>
</template>

<script setup>
import { h, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { reportApi } from '@/api/modules/report';
import GlassCard from './common/GlassCard.vue';
import GlowButton from './common/GlowButton.vue';
import PowerSectionTitle from './common/PowerSectionTitle.vue';
import ReportIdSelect from './common/ReportIdSelect.vue';

const props = defineProps({ reportId: Number });
const emit = defineEmits(['update:reportId', 'go-generation']);
const localReportId = ref(props.reportId || 1);
const items = ref([]);
const saving = ref(false);
const OutlineIcon = {
  render() {
    return h('i', { class: 'ri-file-list-3-line' });
  },
};

watch(
  () => props.reportId,
  (value) => {
    if (value) {
      localReportId.value = value;
      load();
    }
  },
  { immediate: true }
);

watch(localReportId, (value) => emit('update:reportId', value));

async function load() {
  if (!localReportId.value) {
    ElMessage.warning('请先输入报告 ID');
    return;
  }
  try {
    items.value = await reportApi.getOutline(localReportId.value);
  } catch (error) {
    ElMessage.error(`大纲加载失败：${error.message}`);
  }
}

function addItem() {
  items.value.push({
    reportId: localReportId.value,
    parentId: 0,
    chapterNo: String(items.value.length + 1),
    chapterTitle: '新增章节',
    level: 1,
    sort: items.value.length + 1,
    editable: 1,
    aiGenerated: 0,
    status: 'DRAFT'
  });
}

async function saveItem(row) {
  if (!validateItem(row)) return;
  try {
    if (row.id) {
      await reportApi.updateOutlineItem(row.id, row);
    } else {
      await reportApi.addOutlineItem(localReportId.value, row);
    }
    // 保存后重新加载以获取后端重编号的最新数据
    await load();
    ElMessage.success('章节已保存');
  } catch (error) {
    ElMessage.error(`保存失败：${error.message}`);
  }
}

async function saveAll() {
  if (!items.value.every(validateItem)) return;
  saving.value = true;
  try {
    // 只传递需要保存的字段，避免将前端操作中的临时字段发送给后端
    const normalized = items.value
      .map((item, index) => ({
        id: item.id,
        reportId: localReportId.value,
        parentId: item.parentId ?? 0,
        chapterNo: item.chapterNo,
        chapterTitle: item.chapterTitle,
        level: item.level ?? 1,
        sort: item.sort ?? index + 1,
        editable: item.editable ?? 1,
        aiGenerated: item.aiGenerated ?? 0,
        status: item.status || 'DRAFT',
        remark: item.remark,
        generationPrompt: item.generationPrompt
      }))
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));
    items.value = await reportApi.updateOutline(localReportId.value, normalized);
    ElMessage.success('整份大纲已保存');
  } catch (error) {
    ElMessage.error(`保存失败：${error.message}`);
  } finally {
    saving.value = false;
  }
}

async function regenerate() {
  try {
    await ElMessageBox.confirm('重新生成会覆盖当前大纲，确定继续？', '确认重新生成');
    items.value = await reportApi.regenerateOutline(localReportId.value);
    ElMessage.success('大纲已重新生成');
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(`重新生成失败：${error.message}`);
  }
}

async function removeItem(row) {
  try {
    if (row.id) {
      await reportApi.deleteOutlineItem(row.id);
    }
    // 删除后重新加载以刷新编号
    await load();
    ElMessage.success('章节已删除');
  } catch (error) {
    ElMessage.error(`删除失败：${error.message}`);
  }
}

async function moveItem(row, step) {
  if (!row.id) {
    ElMessage.warning('请先保存该章节后再移动');
    return;
  }
  const targetSort = row.sort + step;
  if (targetSort < 1) {
    ElMessage.warning('已是第一个章节');
    return;
  }
  try {
    await reportApi.moveOutlineItem(localReportId.value, row.id, {
      sort: targetSort,
      parentId: row.parentId ?? 0
    });
    await load();
  } catch (error) {
    ElMessage.error(`移动失败：${error.message}`);
    await load();
  }
}

function validateItem(row) {
  if (!String(row.chapterTitle || '').trim()) {
    ElMessage.warning('章节标题不能为空');
    return false;
  }
  if (!String(row.chapterNo || '').trim()) {
    ElMessage.warning('章节编号不能为空');
    return false;
  }
  return true;
}
</script>

<style scoped>
.outline-manager {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.outline-body {
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.report-id-input {
  width: 130px;
}

.thin-input {
  width: 100%;
}

.thin-input :deep(.el-input__wrapper),
.thin-input :deep(.el-input-number__decrease),
.thin-input :deep(.el-input-number__increase) {
  background: rgba(4, 11, 22, 0.7);
  border-color: rgba(80, 187, 255, 0.22);
  box-shadow: none;
}

.thin-input :deep(.el-input__inner) {
  color: var(--pt-text-primary);
}

.glass-table :deep(.el-table__inner-wrapper),
.glass-table :deep(.el-table),
.glass-table :deep(.el-table__header-wrapper),
.glass-table :deep(.el-table__body-wrapper) {
  background: rgba(4, 11, 22, 0.45);
}

.glass-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.glass-table :deep(.el-table__header th) {
  background: rgba(12, 24, 42, 0.92);
  color: var(--pt-text-primary);
  border-bottom: 1px solid rgba(80, 187, 255, 0.14);
}

.glass-table :deep(.el-table__row td) {
  background: rgba(4, 11, 22, 0.28);
  border-bottom: 1px solid rgba(80, 187, 255, 0.1);
}

.glass-table :deep(.el-table__row:hover > td) {
  background: rgba(26, 58, 92, 0.42) !important;
}

.status-tag {
  background: rgba(55, 242, 177, 0.12);
  border-color: rgba(55, 242, 177, 0.3);
  color: #8cf7d0;
}

.outline-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
}

.outline-action :deep(.el-button) {
  padding: 6px 10px;
  border-radius: 10px;
  text-transform: none;
  letter-spacing: 0;
  font-size: 12px;
}

.outline-action--danger :deep(.el-button) {
  background: linear-gradient(135deg, #ff6d7a 0%, #ff3d55 100%);
  color: #fff;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .toolbar {
    width: 100%;
  }

  .report-id-input {
    width: 100%;
  }
}
</style>



