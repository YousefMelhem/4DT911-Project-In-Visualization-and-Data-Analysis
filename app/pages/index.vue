<template>
  <div class="home-page">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">MedPix Visual Analytics</span>
        </h1>
        <p class="hero-subtitle">
          Explore 7,432 medical diagnostic cases with 40,900+ images
        </p>
        <p class="hero-description">
          An interactive visual analytics system for medical students and practitioners
          to explore diagnostic cases using AI-powered similarity search and pattern discovery.
        </p>

        <div class="cta-buttons">
          <NuxtLink to="/cases" class="btn btn-primary">
            <span>Browse Cases</span>
            <span>→</span>
          </NuxtLink>
          <NuxtLink to="/analytics" class="btn btn-secondary">
            <span>View Analytics</span>
            <span>📊</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="features-section">
      <h2 class="section-title">Key Features</h2>
      <div class="features-grid">
        <NuxtLink to="/similarity" class="feature-card">
          <div class="feature-icon">🔍</div>
          <h3>Smart Search</h3>
          <p>Find similar cases using multimodal AI combining images and clinical text</p>
          <div class="feature-arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/analytics" class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Analytics Dashboard</h3>
          <p>Explore patterns across diagnoses, demographics, and body regions</p>
          <div class="feature-arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/analytics" class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>Pattern Discovery</h3>
          <p>Visualize case clusters and relationships in 2D embedding maps</p>
          <div class="feature-arrow">→</div>
        </NuxtLink>
        <NuxtLink to="/cases" class="feature-card">
          <div class="feature-icon">📋</div>
          <h3>Case Browser</h3>
          <p>Filter and explore cases by modality, region, age, and gender</p>
          <div class="feature-arrow">→</div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home page
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 80px);
  background: #f5f7fa;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 1rem  1rem;
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  }

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.gradient-text {
  background: linear-gradient(to right, #fff, #e0e7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.95;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.hero-description {
  font-size: 1.1rem;
  max-width: 800px;
  margin-bottom: 0.5rem;
  opacity: 0.9;
  line-height: 1.6;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.25s ease;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary {
  background: white;
  color: #667eea;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: white;
  transform: translateY(-2px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  opacity: 0.9;
}

.features-section {
  max-width: 1300px;
  margin: 0 auto;
  padding: 1.5rem 1rem 0.25rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  text-align: center;
  margin: 0 0 1.5rem;;
  color: #2d3748;
  letter-spacing: -0.02em;
}


.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.5rem;
  max-width: 1200px;
  margin-bottom: 0rem;
}

.feature-card {
  background: white;
  padding: 0.5rem 1rem 0.5rem;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 2px solid transparent;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.feature-card:hover .feature-arrow {
  opacity: 1;
  transform: translateX(0);
}

.feature-card:hover .feature-icon {
  transform: scale(1.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  transition: transform 0.3s ease;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #2d3748;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.feature-card p {
  color: #718096;
  line-height: 1.6;
  flex-grow: 1;
  margin-bottom: 0.2rem;
}

.feature-arrow {
  color: #667eea;
  font-size: 1rem;
  font-weight: 600;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
  align-self: flex-end;
  margin-top: auto;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 1rem .5rem 0.5rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }
  .hero-description {
    font-size: 0.98rem;
    margin-bottom: .5rem;
  }
  .cta-buttons {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .btn {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }

  .features-section {
    padding: 1rem .75rem 0rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .section-subtitle {
    font-size: 1rem;
    margin-bottom: .5rem;
  }

  .features-grid {
    gap: .5rem;
  }

  .feature-card {
    padding: 1rem 0.75rem .5rem;
  }

  .feature-icon {
    font-size: 3rem;
  }

  .feature-card h3 {
    font-size: 2rem;
  }
}
</style>
