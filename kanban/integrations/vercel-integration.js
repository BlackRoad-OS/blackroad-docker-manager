/**
 * Vercel Integration
 *
 * Manages deployments and preview environments.
 * Integrates with kanban for deployment tracking.
 */

class VercelIntegration {
  constructor(config = {}) {
    this.token = config.token || process.env.VERCEL_TOKEN;
    this.teamId = config.teamId || process.env.VERCEL_TEAM_ID;
    this.baseUrl = 'https://api.vercel.com';
  }

  async request(endpoint, options = {}) {
    const url = new URL(endpoint, this.baseUrl);
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }

    const response = await this.fetchWithRetry(url.toString(), {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response.json();
  }

  async fetchWithRetry(url, options, retries = 4) {
    const backoff = [2000, 4000, 8000, 16000];

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status >= 500 && i < retries - 1) {
          await new Promise(r => setTimeout(r, backoff[i]));
          continue;
        }
        throw new Error(`Vercel API error: ${response.status}`);
      } catch (error) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, backoff[i]));
          continue;
        }
        throw error;
      }
    }
  }

  // Get all deployments
  async getDeployments(limit = 20) {
    return this.request(`/v6/deployments?limit=${limit}`);
  }

  // Get deployment by ID
  async getDeployment(deploymentId) {
    return this.request(`/v13/deployments/${deploymentId}`);
  }

  // Create new deployment
  async createDeployment(projectId, files, options = {}) {
    return this.request('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectId,
        files,
        target: options.target || 'preview',
        ...options
      })
    });
  }

  // Get projects
  async getProjects() {
    return this.request('/v9/projects');
  }

  // Get project by name or ID
  async getProject(projectId) {
    return this.request(`/v9/projects/${projectId}`);
  }

  // Get deployment logs
  async getDeploymentLogs(deploymentId) {
    return this.request(`/v2/deployments/${deploymentId}/events`);
  }

  // Promote deployment to production
  async promoteToProduction(deploymentId) {
    const deployment = await this.getDeployment(deploymentId);
    return this.request(`/v10/projects/${deployment.projectId}/alias`, {
      method: 'POST',
      body: JSON.stringify({
        target: 'production',
        deploymentId
      })
    });
  }

  // Health check
  async healthCheck() {
    try {
      const user = await this.request('/v2/user');
      return {
        healthy: true,
        user: user.user?.username,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Map deployment to kanban task status
  mapDeploymentToTaskStatus(deployment) {
    const statusMap = {
      'QUEUED': 'in_progress',
      'BUILDING': 'in_progress',
      'READY': 'testing',
      'ERROR': 'blocked',
      'CANCELED': 'backlog'
    };
    return statusMap[deployment.readyState] || 'in_progress';
  }

  // Create webhook for deployment events
  async createWebhook(projectId, url, events = ['deployment.created', 'deployment.ready', 'deployment.error']) {
    return this.request(`/v1/webhooks`, {
      method: 'POST',
      body: JSON.stringify({
        url,
        events,
        projectIds: [projectId]
      })
    });
  }
}

// Deployment tracker for kanban integration
class DeploymentTracker {
  constructor(vercel, stateManager) {
    this.vercel = vercel;
    this.stateManager = stateManager;
  }

  async trackDeployment(deploymentId, taskId) {
    const deployment = await this.vercel.getDeployment(deploymentId);

    const trackingData = {
      deploymentId,
      taskId,
      projectId: deployment.projectId,
      url: deployment.url,
      status: deployment.readyState,
      createdAt: deployment.createdAt,
      buildTime: deployment.buildingAt ? Date.now() - deployment.buildingAt : null
    };

    await this.stateManager.updateTaskDeployment(taskId, trackingData);
    return trackingData;
  }

  async getDeploymentStatus(taskId) {
    const task = await this.stateManager.getTask(taskId);
    if (!task?.deploymentId) return null;

    const deployment = await this.vercel.getDeployment(task.deploymentId);
    return {
      taskId,
      deployment: {
        id: deployment.id,
        url: deployment.url,
        status: deployment.readyState,
        ready: deployment.readyState === 'READY'
      }
    };
  }
}

module.exports = { VercelIntegration, DeploymentTracker };
