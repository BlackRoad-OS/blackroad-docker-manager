/**
 * Raspberry Pi Fleet Integration
 *
 * Manages edge devices including Raspberry Pis for deployment and monitoring.
 * Integrates with kanban for edge deployment tracking.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class RaspberryPiIntegration {
  constructor(config = {}) {
    this.managerUrl = config.managerUrl || process.env.RPI_MANAGER_URL;
    this.apiKey = config.apiKey || process.env.RPI_API_KEY;
    this.sshKeyPath = config.sshKeyPath || process.env.RPI_SSH_KEY_PATH;
    this.defaultUser = config.defaultUser || 'pi';
    this.devices = new Map();
  }

  // Device management
  async registerDevice(device) {
    const deviceInfo = {
      id: device.id || `rpi-${Date.now().toString(36)}`,
      name: device.name,
      ip: device.ip,
      port: device.port || 22,
      user: device.user || this.defaultUser,
      model: device.model || 'Raspberry Pi',
      status: 'unknown',
      lastSeen: null,
      tags: device.tags || []
    };

    this.devices.set(deviceInfo.id, deviceInfo);

    // Check connectivity
    await this.checkDevice(deviceInfo.id);

    return deviceInfo;
  }

  async checkDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device ${deviceId} not found`);

    try {
      const result = await this.executeSSH(device, 'echo "connected" && hostname');
      device.status = 'online';
      device.hostname = result.stdout.split('\n')[1]?.trim();
      device.lastSeen = new Date().toISOString();
    } catch (error) {
      device.status = 'offline';
      device.lastError = error.message;
    }

    this.devices.set(deviceId, device);
    return device;
  }

  async executeSSH(device, command) {
    const sshCommand = [
      'ssh',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      this.sshKeyPath ? `-i ${this.sshKeyPath}` : '',
      `${device.user}@${device.ip}`,
      `-p ${device.port}`,
      `"${command.replace(/"/g, '\\"')}"`
    ].filter(Boolean).join(' ');

    return execAsync(sshCommand);
  }

  // Get device info
  async getDeviceInfo(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device ${deviceId} not found`);

    try {
      const [osInfo, cpuInfo, memInfo, diskInfo, tempInfo] = await Promise.all([
        this.executeSSH(device, 'cat /etc/os-release | grep PRETTY_NAME'),
        this.executeSSH(device, 'nproc'),
        this.executeSSH(device, 'free -m | grep Mem'),
        this.executeSSH(device, 'df -h / | tail -1'),
        this.executeSSH(device, 'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0"')
      ]);

      const memParts = memInfo.stdout.trim().split(/\s+/);
      const diskParts = diskInfo.stdout.trim().split(/\s+/);

      return {
        id: deviceId,
        name: device.name,
        hostname: device.hostname,
        os: osInfo.stdout.match(/PRETTY_NAME="(.+)"/)?.[1] || 'Unknown',
        cpu: {
          cores: parseInt(cpuInfo.stdout.trim())
        },
        memory: {
          total: parseInt(memParts[1]),
          used: parseInt(memParts[2]),
          free: parseInt(memParts[3])
        },
        disk: {
          size: diskParts[1],
          used: diskParts[2],
          available: diskParts[3],
          usePercent: diskParts[4]
        },
        temperature: parseInt(tempInfo.stdout.trim()) / 1000,
        status: device.status,
        lastSeen: device.lastSeen
      };
    } catch (error) {
      return {
        id: deviceId,
        name: device.name,
        status: 'error',
        error: error.message
      };
    }
  }

  // Deploy to device
  async deploy(deviceId, deployment) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device ${deviceId} not found`);

    const deployLog = [];
    const log = (msg) => deployLog.push({ time: new Date().toISOString(), msg });

    try {
      log('Starting deployment');

      // Create deployment directory
      const deployDir = `/home/${device.user}/deployments/${deployment.name}`;
      await this.executeSSH(device, `mkdir -p ${deployDir}`);
      log(`Created directory: ${deployDir}`);

      // Transfer files if provided
      if (deployment.files) {
        for (const file of deployment.files) {
          const scpCommand = [
            'scp',
            '-o', 'StrictHostKeyChecking=no',
            this.sshKeyPath ? `-i ${this.sshKeyPath}` : '',
            `-P ${device.port}`,
            file.local,
            `${device.user}@${device.ip}:${deployDir}/${file.remote}`
          ].filter(Boolean).join(' ');

          await execAsync(scpCommand);
          log(`Transferred: ${file.local} -> ${file.remote}`);
        }
      }

      // Run deployment commands
      if (deployment.commands) {
        for (const cmd of deployment.commands) {
          const result = await this.executeSSH(device, `cd ${deployDir} && ${cmd}`);
          log(`Executed: ${cmd}`);
          if (result.stdout) log(`Output: ${result.stdout.trim()}`);
        }
      }

      // Start service if specified
      if (deployment.service) {
        await this.executeSSH(device, `sudo systemctl restart ${deployment.service}`);
        log(`Restarted service: ${deployment.service}`);
      }

      log('Deployment completed successfully');

      return {
        success: true,
        deviceId,
        deployment: deployment.name,
        log: deployLog
      };

    } catch (error) {
      log(`Error: ${error.message}`);
      return {
        success: false,
        deviceId,
        deployment: deployment.name,
        error: error.message,
        log: deployLog
      };
    }
  }

  // Docker operations on Pi
  async dockerCommand(deviceId, command) {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device ${deviceId} not found`);

    return this.executeSSH(device, `docker ${command}`);
  }

  async listContainers(deviceId) {
    const result = await this.dockerCommand(deviceId, 'ps --format "{{json .}}"');
    return result.stdout
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  }

  async deployContainer(deviceId, containerConfig) {
    const { image, name, ports, volumes, env } = containerConfig;

    const args = [
      'run', '-d',
      `--name ${name}`,
      ...Object.entries(ports || {}).map(([h, c]) => `-p ${h}:${c}`),
      ...Object.entries(volumes || {}).map(([h, c]) => `-v ${h}:${c}`),
      ...Object.entries(env || {}).map(([k, v]) => `-e ${k}=${v}`),
      image
    ].join(' ');

    return this.dockerCommand(deviceId, args);
  }

  // Health check all devices
  async healthCheckAll() {
    const results = [];
    for (const [id, device] of this.devices) {
      const info = await this.getDeviceInfo(id);
      results.push(info);
    }
    return {
      timestamp: new Date().toISOString(),
      devices: results,
      summary: {
        total: results.length,
        online: results.filter(d => d.status === 'online').length,
        offline: results.filter(d => d.status === 'offline').length
      }
    };
  }

  // List all registered devices
  listDevices() {
    return Array.from(this.devices.values());
  }
}

// Edge deployment tracker for kanban
class EdgeDeploymentTracker {
  constructor(rpiIntegration, stateManager) {
    this.rpi = rpiIntegration;
    this.stateManager = stateManager;
  }

  async trackDeployment(taskId, deviceId, deployment) {
    const task = await this.stateManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const result = await this.rpi.deploy(deviceId, deployment);

    await this.stateManager.updateTask(taskId, {
      edgeDeployment: {
        deviceId,
        deploymentName: deployment.name,
        success: result.success,
        timestamp: new Date().toISOString(),
        log: result.log
      }
    });

    return result;
  }

  async getEdgeStatus(taskId) {
    const task = await this.stateManager.getTask(taskId);
    if (!task?.edgeDeployment) return null;

    const deviceInfo = await this.rpi.getDeviceInfo(task.edgeDeployment.deviceId);
    return {
      taskId,
      deployment: task.edgeDeployment,
      device: deviceInfo
    };
  }
}

module.exports = { RaspberryPiIntegration, EdgeDeploymentTracker };
