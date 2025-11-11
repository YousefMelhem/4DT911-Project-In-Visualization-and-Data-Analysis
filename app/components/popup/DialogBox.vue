<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="state.open" class="dialog-overlay" @click.self="handleCancel">
        <div :class="['dialog-box', `dialog-${state.type}`]">
          <button class="dialog-close" @click="handleCancel" aria-label="Close">×</button>

          <div class="dialog-icon">
            <div :class="['icon-circle', `icon-${state.type}`]">
              <span v-if="state.type === 'warning'">!</span>
              <span v-else-if="state.type === 'success'">✓</span>
              <span v-else-if="state.type === 'error'">✕</span>
            </div>
          </div>

          <h3 class="dialog-title">{{ state.title }}</h3>
          <p class="dialog-message">{{ state.message }}</p>

          <div class="dialog-actions">
            <button 
              v-if="state.type === 'warning'"
              @click="handleCancel"
              class="dialog-btn dialog-btn-cancel"
            >
              Cancel
            </button>
            <button 
              @click="handleConfirm"
              :class="['dialog-btn', `dialog-btn-${state.type}`]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useDialog } from '~/composables/useDialog'

const { state, close } = useDialog()

const handleConfirm = () => {
  close(true)
}

const handleCancel = () => {
  close(false)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.dialog-box {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}

.dialog-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 28px;
  color: #a0aec0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.dialog-close:hover {
  background: #f7fafc;
  color: #4a5568;
}

.dialog-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
}

.icon-warning {
  background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
}

.icon-success {
  background: linear-gradient(135deg, #68d391 0%, #38a169 100%);
}

.icon-error {
  background: linear-gradient(135deg, #fc8181 0%, #e53e3e 100%);
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  color: #2d3748;
}

.dialog-message {
  font-size: 1rem;
  text-align: center;
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.dialog-btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.dialog-btn-cancel {
  background: #e53e3e;
  color: white;
}

.dialog-btn-cancel:hover {
  background: #c53030;
  transform: translateY(-2px);
}

.dialog-btn-warning {
  background: #ed8936;
  color: white;
}

.dialog-btn-warning:hover {
  background: #dd6b20;
  transform: translateY(-2px);
}

.dialog-btn-success {
  background: #38a169;
  color: white;
}

.dialog-btn-success:hover {
  background: #2f855a;
  transform: translateY(-2px);
}

.dialog-btn-error {
  background: #e53e3e;
  color: white;
}

.dialog-btn-error:hover {
  background: #c53030;
  transform: translateY(-2px);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .dialog-box {
  animation: dialogSlideIn 0.3s ease-out;
}

@keyframes dialogSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .dialog-box {
    margin: 1rem;
    padding: 1.5rem;
  }

  .dialog-actions {
    flex-direction: column;
  }

  .dialog-btn {
    width: 100%;
  }
}
</style>