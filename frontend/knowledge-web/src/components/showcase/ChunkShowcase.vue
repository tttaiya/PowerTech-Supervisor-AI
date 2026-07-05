<template>
  <div class="ks-chunk-wall">
    <article v-for="chunk in chunks" :key="chunk.vectorId" class="ks-chunk-card" :title="chunk.more">
      <div class="ks-chunk-card__head">
        <span>#{{ chunk.chunkIndex }}</span>
        <strong>page {{ chunk.pageNo }}</strong>
      </div>
      <h3>{{ chunk.chapterPath }}</h3>
      <p>{{ chunk.preview }}</p>
      <dl>
        <div>
          <dt>charCount</dt>
          <dd>{{ chunk.charCount }}</dd>
        </div>
        <div>
          <dt>vectorStatus</dt>
          <dd>{{ chunk.vectorStatus }}</dd>
        </div>
      </dl>
      <code>{{ chunk.vectorId }}</code>
      <span class="ks-chunk-card__more">hover 查看切片追溯信息</span>
    </article>
  </div>
</template>

<script setup lang="ts">
const chunks = [
  {
    chunkIndex: 12,
    pageNo: 8,
    chapterPath: '锅炉运行规程 / 安全附件',
    preview: '锅炉一般至少应装设两个安全阀，其中一个按较低整定压力动作，保证超压时及时泄放。',
    charCount: 186,
    vectorStatus: 'READY',
    vectorId: 'vec_km_boiler_00012',
    more: '保留来源页码、章节路径、向量状态与审核记录，可回溯到原始文档。',
  },
  {
    chunkIndex: 27,
    pageNo: 15,
    chapterPath: '变压器检修 / 试验项目',
    preview: '绝缘电阻、吸收比、绕组直流电阻等试验结果应进入检修记录，并与历史曲线对比。',
    charCount: 214,
    vectorStatus: 'INDEXED',
    vectorId: 'vec_km_transformer_00027',
    more: '向量 ID 与业务元数据绑定，便于检索结果解释和问题定位。',
  },
  {
    chunkIndex: 43,
    pageNo: 22,
    chapterPath: '继电保护 / 定值核对',
    preview: '定值单变更后应执行双人复核，确认装置区号、版本号和保护压板状态一致。',
    charCount: 168,
    vectorStatus: 'READY',
    vectorId: 'vec_km_relay_00043',
    more: '疑似 OCR 异常可在审核工作台修正，避免错误知识直接入库。',
  },
  {
    chunkIndex: 58,
    pageNo: 31,
    chapterPath: '巡检标准 / 缺陷闭环',
    preview: '发现设备温升异常时，应记录测点位置、环境温度、负载电流并创建缺陷跟踪。',
    charCount: 201,
    vectorStatus: 'REVIEWED',
    vectorId: 'vec_km_inspection_00058',
    more: '切片支持搜索、预览和抽屉详情，服务人工审核闭环。',
  },
]
</script>
