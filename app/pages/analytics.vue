<template>
  <div class="analytics-page">
    <div class="coming-soon">
      <div class="icon">📊</div>
      <h1>Coming Soon</h1>
      <p>The Analytics Dashboard is under development</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Analytics page - Coming Soon
</script>

<style scoped>
.analytics-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.coming-soon {
  text-align: center;
  padding: 3rem;
}

.icon {
  font-size: 6rem;
  margin-bottom: 1.5rem;
}

.coming-soon h1 {
  font-size: 3rem;
  color: #2d3748;
  margin-bottom: 1rem;
}

.coming-soon p {
  font-size: 1.3rem;
  color: #718096;
}
</style>
