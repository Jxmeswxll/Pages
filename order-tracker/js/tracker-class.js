import { STAGES } from './stages.js';

export class OrderTracker {
  constructor(containerId, currentStatus) {
    this.container = document.getElementById(containerId);
    this.currentStatus = currentStatus;
    this.render();
    this.updateProgress();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  getCurrentStageIndex() {
    return STAGES.findIndex(stage => stage.id === this.currentStatus);
  }

  getStageStatus(index) {
    const currentIndex = this.getCurrentStageIndex();
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  }

  render() {
    this.container.innerHTML = '';
    STAGES.forEach((stage, index) => {
      const status = this.getStageStatus(index);
      const stageElement = document.createElement('div');
      stageElement.className = `stage ${status}`;
      stageElement.innerHTML = `
        <div class="stage-icon">
          ${stage.icon}
        </div>
        <div class="stage-label">${stage.label}</div>
      `;
      this.container.appendChild(stageElement);
    });
  }

  handleResize() {
    this.updateProgress();
  }

  updateProgress() {
    const currentIndex = this.getCurrentStageIndex();
    const progressFill = document.querySelector('.progress-line-fill');
    const progress = (currentIndex / (STAGES.length - 1)) * 100;
    
    if (window.innerWidth <= 640) {
      progressFill.style.width = '100%';
      progressFill.style.height = `${progress}%`;
    } else {
      progressFill.style.height = '100%';
      progressFill.style.width = `${progress}%`;
    }
  }

  updateStatus(newStatus) {
    this.currentStatus = newStatus;
    this.render();
    this.updateProgress();
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
