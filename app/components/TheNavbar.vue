<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <NuxtLink to="/" class="brand-link">
          <span class="brand-icon">🏥</span>
          <span class="brand-text">MedPix Explorer</span>
        </NuxtLink>
      </div>
      
      <div class="navbar-menu">
        <NuxtLink to="/" class="nav-link" active-class="active">
          <span class="nav-icon">🏠</span>
          <span>Home</span>
        </NuxtLink>
        
        <NuxtLink to="/cases" class="nav-link" active-class="active">
          <span class="nav-icon">📋</span>
          <span>Cases</span>
        </NuxtLink>
        
        <NuxtLink to="/analytics" class="nav-link" active-class="active">
          <span class="nav-icon">📊</span>
          <span>Analytics</span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
// Navigation component for MedPix Explorer
</script>

<style scoped>
.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-brand .brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  transition: opacity 0.3s ease;
}

.navbar-brand .brand-link:hover {
  opacity: 0.9;
}

.brand-icon {
  font-size: 2rem;
}

.brand-text {
  letter-spacing: -0.5px;
}

.navbar-menu {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.nav-link.active {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: white;
  border-radius: 2px 2px 0 0;
}

.nav-icon {
  font-size: 1.2rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .navbar-container {
    padding: 1rem;
  }
  
  .brand-text {
    display: none;
  }
  
  .navbar-menu {
    gap: 0.25rem;
  }
  
  .nav-link {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .nav-link span:not(.nav-icon) {
    display: none;
  }
  
  .nav-icon {
    font-size: 1.5rem;
  }
}
</style>
