/**
 * DigitalOcean Integration
 *
 * Manages cloud infrastructure including droplets, Kubernetes, and App Platform.
 * Integrates with kanban for infrastructure task tracking.
 */

class DigitalOceanIntegration {
  constructor(config = {}) {
    this.token = config.token || process.env.DIGITALOCEAN_TOKEN;
    this.baseUrl = 'https://api.digitalocean.com/v2';
  }

  async request(endpoint, options = {}) {
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
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
        throw new Error(`DigitalOcean API error: ${response.status}`);
      } catch (error) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, backoff[i]));
          continue;
        }
        throw error;
      }
    }
  }

  // Account & Health
  async getAccount() {
    return this.request('/account');
  }

  async healthCheck() {
    try {
      const account = await this.getAccount();
      return {
        healthy: true,
        email: account.account?.email,
        dropletLimit: account.account?.droplet_limit,
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

  // Droplets
  async listDroplets() {
    return this.request('/droplets');
  }

  async getDroplet(dropletId) {
    return this.request(`/droplets/${dropletId}`);
  }

  async createDroplet(config) {
    return this.request('/droplets', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,
        region: config.region || 'nyc3',
        size: config.size || 's-1vcpu-1gb',
        image: config.image || 'ubuntu-22-04-x64',
        ssh_keys: config.sshKeys || [],
        backups: config.backups || false,
        monitoring: config.monitoring || true,
        tags: config.tags || ['blackroad', 'docker-manager']
      })
    });
  }

  async deleteDroplet(dropletId) {
    return this.request(`/droplets/${dropletId}`, { method: 'DELETE' });
  }

  async dropletAction(dropletId, action) {
    return this.request(`/droplets/${dropletId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ type: action })
    });
  }

  // Kubernetes
  async listKubernetesClusters() {
    return this.request('/kubernetes/clusters');
  }

  async getKubernetesCluster(clusterId) {
    return this.request(`/kubernetes/clusters/${clusterId}`);
  }

  async createKubernetesCluster(config) {
    return this.request('/kubernetes/clusters', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,
        region: config.region || 'nyc3',
        version: config.version || 'latest',
        node_pools: config.nodePools || [{
          size: 's-2vcpu-2gb',
          count: 3,
          name: 'default-pool'
        }],
        tags: config.tags || ['blackroad', 'docker-manager']
      })
    });
  }

  async getKubeconfig(clusterId) {
    return this.request(`/kubernetes/clusters/${clusterId}/kubeconfig`);
  }

  // App Platform
  async listApps() {
    return this.request('/apps');
  }

  async getApp(appId) {
    return this.request(`/apps/${appId}`);
  }

  async createApp(spec) {
    return this.request('/apps', {
      method: 'POST',
      body: JSON.stringify({ spec })
    });
  }

  async deployApp(appId) {
    return this.request(`/apps/${appId}/deployments`, {
      method: 'POST',
      body: JSON.stringify({ force_build: true })
    });
  }

  // Databases
  async listDatabases() {
    return this.request('/databases');
  }

  async getDatabase(dbId) {
    return this.request(`/databases/${dbId}`);
  }

  // Spaces (S3-compatible storage)
  async listSpaces(region = 'nyc3') {
    // Note: Spaces use a different endpoint
    return { message: 'Use AWS S3 SDK with DO Spaces endpoint' };
  }

  // Monitoring
  async getDropletMetrics(dropletId, metric = 'cpu') {
    const start = new Date(Date.now() - 3600000).toISOString();
    const end = new Date().toISOString();
    return this.request(`/monitoring/metrics/droplet/${metric}?host_id=${dropletId}&start=${start}&end=${end}`);
  }

  // Firewall
  async listFirewalls() {
    return this.request('/firewalls');
  }

  async createFirewall(config) {
    return this.request('/firewalls', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,
        inbound_rules: config.inboundRules || [
          { protocol: 'tcp', ports: '22', sources: { addresses: ['0.0.0.0/0'] } },
          { protocol: 'tcp', ports: '80', sources: { addresses: ['0.0.0.0/0'] } },
          { protocol: 'tcp', ports: '443', sources: { addresses: ['0.0.0.0/0'] } }
        ],
        outbound_rules: config.outboundRules || [
          { protocol: 'tcp', ports: 'all', destinations: { addresses: ['0.0.0.0/0'] } },
          { protocol: 'udp', ports: 'all', destinations: { addresses: ['0.0.0.0/0'] } }
        ],
        droplet_ids: config.dropletIds || [],
        tags: config.tags || ['blackroad']
      })
    });
  }

  // SSH Keys
  async listSSHKeys() {
    return this.request('/account/keys');
  }

  async addSSHKey(name, publicKey) {
    return this.request('/account/keys', {
      method: 'POST',
      body: JSON.stringify({ name, public_key: publicKey })
    });
  }
}

// Infrastructure task tracker for kanban
class InfrastructureTracker {
  constructor(digitalOcean, stateManager) {
    this.do = digitalOcean;
    this.stateManager = stateManager;
  }

  async trackDroplet(dropletId, taskId) {
    const droplet = await this.do.getDroplet(dropletId);

    await this.stateManager.updateTaskInfrastructure(taskId, {
      type: 'droplet',
      resourceId: dropletId,
      name: droplet.droplet?.name,
      status: droplet.droplet?.status,
      ip: droplet.droplet?.networks?.v4?.[0]?.ip_address,
      region: droplet.droplet?.region?.slug
    });

    return droplet;
  }

  async getInfrastructureStatus(taskId) {
    const task = await this.stateManager.getTask(taskId);
    if (!task?.infrastructure) return null;

    const { type, resourceId } = task.infrastructure;

    switch (type) {
      case 'droplet':
        return this.do.getDroplet(resourceId);
      case 'kubernetes':
        return this.do.getKubernetesCluster(resourceId);
      case 'app':
        return this.do.getApp(resourceId);
      default:
        return null;
    }
  }
}

module.exports = { DigitalOceanIntegration, InfrastructureTracker };
