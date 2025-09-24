<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <span class="title-main">MedPix Explorer</span>
          <span class="title-sub">Medical Case Clustering Analysis</span>
        </h1>
        
        <nav class="main-nav">
          <RouterLink to="/clustering" class="nav-link primary">
            📊 Clustering Dashboard
          </RouterLink>
          <RouterLink to="/" class="nav-link">
            🏠 Home
          </RouterLink>
          <RouterLink to="/about" class="nav-link">
            ℹ️ About
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.app-title {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.title-main {
  font-size: 2.5em;
  font-weight: 300;
  letter-spacing: -1px;
}

.title-sub {
  font-size: 1.1em;
  opacity: 0.9;
  font-weight: 400;
}

.main-nav {
  display: flex;
  gap: 15px;
  align-items: center;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.nav-link.primary {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: 600;
}

.nav-link.router-link-exact-active {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.main-content {
  min-height: calc(100vh - 120px);
  padding: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .title-main {
    font-size: 2em;
  }
  
  .title-sub {
    font-size: 1em;
  }
  
  .main-nav {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .nav-link {
    padding: 10px 16px;
    font-size: 0.9em;
  }
}

@media (max-width: 480px) {
  .title-main {
    font-size: 1.8em;
  }
  
  .nav-link {
    padding: 8px 12px;
    font-size: 0.85em;
  }
}
</style>
