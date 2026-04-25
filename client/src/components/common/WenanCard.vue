<template>
  <div class="wenan-card">
    <p class="card-text">{{ wenan.text }}</p>
    <div class="card-footer">
      <div class="card-stats">
        <button
          class="stat-btn"
          :class="{ active: wenan.liked }"
          @click.stop="handleLike"
        >
          <span class="stat-icon">{{ wenan.liked ? '❤️' : '🤍' }}</span>
          <span class="stat-num">{{ wenan.likes || 0 }}</span>
        </button>

        <button
          class="stat-btn"
          :class="{ active: wenan.favorited }"
          @click.stop="handleFavorite"
        >
          <span class="stat-icon">{{ wenan.favorited ? '⭐' : '☆' }}</span>
          <span class="stat-num">{{ wenan.favorites || 0 }}</span>
        </button>
      </div>

      <div v-if="showEditDelete" class="card-actions">
        <button
          class="action-btn edit-btn"
          @click.stop="handleEditClick"
        >
          <el-icon><Edit /></el-icon>
        </button>
        <button
          class="action-btn delete-btn"
          @click.stop="handleDeleteClick"
        >
          <el-icon><Delete /></el-icon>
        </button>
        <button
          class="copy-btn"
          @click.stop="handleCopyClick"
        >
          <el-icon><Document /></el-icon> 复制
        </button>
      </div>
      <div v-else class="card-actions">
        <button
          class="copy-btn"
          @click.stop="handleCopyClick"
        >
          <el-icon><Document /></el-icon> 复制
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Edit, Delete, Document } from '@element-plus/icons-vue'

const props = defineProps({
  wenan: {
    type: Object,
    required: true
  },
  showEditDelete: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['like', 'favorite', 'copy', 'edit', 'delete'])

function handleLike() {
  emit('like', props.wenan.id)
}

function handleFavorite() {
  emit('favorite', props.wenan.id)
}

function handleCopyClick() {
  emit('copy', props.wenan.text)
}

function handleEditClick() {
  emit('edit', props.wenan)
}

function handleDeleteClick() {
  emit('delete', props.wenan.id)
}
</script>

<style scoped>
.wenan-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(14, 165, 233, 0.06);
  border: 1px solid rgba(14, 165, 233, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.wenan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.15);
}

.card-text {
  font-size: 1rem;
  line-height: 1.8;
  color: #334155;
  flex: 1;
  margin-bottom: 20px;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.card-stats {
  display: flex;
  gap: 12px;
}

.stat-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f1f5f9;
  border: none;
  border-radius: 16px;
  font-size: 0.85rem;
  color: #7A7A7A;
  cursor: pointer;
  transition: all 0.2s;
}

.stat-btn:hover {
  background: #F5F0E8;
}

.stat-btn.active {
  color: inherit;
}

.stat-icon {
  font-size: 0.9rem;
}

.stat-num {
  font-size: 0.85rem;
}

.copy-btn {
  padding: 6px 14px;
  background: #6B90AE;
  border: none;
  border-radius: 16px;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  padding: 6px 10px;
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: scale(1.05);
}

.edit-btn:hover {
  background: #fef3c7;
}

.delete-btn:hover {
  background: #fee2e2;
}
</style>