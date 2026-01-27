/**
 * BlackRoad Kanban State Manager - Cloudflare Worker
 *
 * This worker manages kanban state across all integrations.
 * It acts as the central state store, syncing with:
 * - GitHub Projects
 * - Salesforce CRM
 * - All connected services
 */

// KV Namespace bindings (configured in wrangler.toml)
// - KANBAN_STATE: Main state store
// - TASK_HASHES: Hash verification store
// - INTEGRATION_CACHE: API response cache

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-ID',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path === '/api/health') {
        return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() }, corsHeaders);
      }

      if (path === '/api/state') {
        return await handleState(request, env, corsHeaders);
      }

      if (path === '/api/tasks') {
        return await handleTasks(request, env, corsHeaders);
      }

      if (path === '/api/hash/verify') {
        return await handleHashVerification(request, env, corsHeaders);
      }

      if (path.startsWith('/webhooks/')) {
        return await handleWebhook(request, env, path, corsHeaders);
      }

      if (path === '/api/sync') {
        return await handleSync(request, env, corsHeaders);
      }

      return jsonResponse({ error: 'Not found' }, corsHeaders, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, corsHeaders, 500);
    }
  },

  // Scheduled task for periodic sync
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncAllIntegrations(env));
  }
};

// State management
async function handleState(request, env, headers) {
  const method = request.method;

  if (method === 'GET') {
    const state = await env.KANBAN_STATE.get('current', 'json') || getDefaultState();
    return jsonResponse(state, headers);
  }

  if (method === 'PUT') {
    const body = await request.json();
    await env.KANBAN_STATE.put('current', JSON.stringify(body));
    return jsonResponse({ success: true, updated: new Date().toISOString() }, headers);
  }

  return jsonResponse({ error: 'Method not allowed' }, headers, 405);
}

// Task CRUD operations
async function handleTasks(request, env, headers) {
  const method = request.method;
  const url = new URL(request.url);
  const taskId = url.searchParams.get('id');

  if (method === 'GET') {
    if (taskId) {
      const task = await env.KANBAN_STATE.get(`task:${taskId}`, 'json');
      return jsonResponse(task || { error: 'Task not found' }, headers, task ? 200 : 404);
    }
    const tasks = await getAllTasks(env);
    return jsonResponse(tasks, headers);
  }

  if (method === 'POST') {
    const task = await request.json();
    task.id = task.id || generateTaskId();
    task.createdAt = new Date().toISOString();
    task.hash = await generateTaskHash(task);

    await env.KANBAN_STATE.put(`task:${task.id}`, JSON.stringify(task));
    await env.TASK_HASHES.put(task.id, task.hash);

    return jsonResponse(task, headers, 201);
  }

  if (method === 'PUT' && taskId) {
    const updates = await request.json();
    const existing = await env.KANBAN_STATE.get(`task:${taskId}`, 'json');

    if (!existing) {
      return jsonResponse({ error: 'Task not found' }, headers, 404);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    updated.hash = await generateTaskHash(updated);

    await env.KANBAN_STATE.put(`task:${taskId}`, JSON.stringify(updated));
    await env.TASK_HASHES.put(taskId, updated.hash);

    return jsonResponse(updated, headers);
  }

  if (method === 'DELETE' && taskId) {
    await env.KANBAN_STATE.delete(`task:${taskId}`);
    await env.TASK_HASHES.delete(taskId);
    return jsonResponse({ success: true, deleted: taskId }, headers);
  }

  return jsonResponse({ error: 'Method not allowed' }, headers, 405);
}

// Hash verification
async function handleHashVerification(request, env, headers) {
  const body = await request.json();
  const { taskId, expectedHash, files } = body;

  const results = {
    taskId,
    verified: true,
    checks: []
  };

  // Verify task hash
  if (taskId) {
    const storedHash = await env.TASK_HASHES.get(taskId);
    const taskMatch = storedHash === expectedHash;
    results.checks.push({ type: 'task', match: taskMatch });
    results.verified = results.verified && taskMatch;
  }

  // Verify file hashes
  if (files && Array.isArray(files)) {
    for (const file of files) {
      const computedHash = await computeSHA256(file.content);
      const match = computedHash === file.expectedHash;
      results.checks.push({ type: 'file', path: file.path, match });
      results.verified = results.verified && match;
    }
  }

  return jsonResponse(results, headers);
}

// Webhook handlers
async function handleWebhook(request, env, path, headers) {
  const source = path.split('/')[2]; // /webhooks/github -> github
  const payload = await request.json();

  // Store webhook event
  const eventId = `webhook:${source}:${Date.now()}`;
  await env.KANBAN_STATE.put(eventId, JSON.stringify(payload), { expirationTtl: 86400 });

  // Process based on source
  switch (source) {
    case 'github':
      return await processGitHubWebhook(payload, env, headers);
    case 'salesforce':
      return await processSalesforceWebhook(payload, env, headers);
    case 'vercel':
      return await processVercelWebhook(payload, env, headers);
    default:
      return jsonResponse({ received: true, source }, headers);
  }
}

async function processGitHubWebhook(payload, env, headers) {
  const event = payload.action;

  if (payload.pull_request) {
    // Update kanban state based on PR status
    const prId = payload.pull_request.number;
    const state = await env.KANBAN_STATE.get('current', 'json') || getDefaultState();

    if (event === 'opened') {
      state.columns.review.push({ prId, title: payload.pull_request.title });
    } else if (event === 'closed' && payload.pull_request.merged) {
      state.columns.done.push({ prId, title: payload.pull_request.title, mergedAt: new Date().toISOString() });
    }

    await env.KANBAN_STATE.put('current', JSON.stringify(state));
  }

  return jsonResponse({ processed: true, event }, headers);
}

async function processSalesforceWebhook(payload, env, headers) {
  // Sync Salesforce updates to kanban
  const { type, record } = payload;

  if (type === 'opportunity_closed') {
    // Create task for delivery
    const task = {
      id: generateTaskId(),
      title: `Deliver: ${record.Name}`,
      source: 'salesforce',
      crmId: record.Id,
      status: 'backlog',
      priority: 'high'
    };
    await env.KANBAN_STATE.put(`task:${task.id}`, JSON.stringify(task));
  }

  return jsonResponse({ processed: true, type }, headers);
}

async function processVercelWebhook(payload, env, headers) {
  const { type, deployment } = payload;

  if (type === 'deployment_ready') {
    // Update task status to testing
    const state = await env.KANBAN_STATE.get('current', 'json') || getDefaultState();
    state.deployments = state.deployments || [];
    state.deployments.push({
      id: deployment.id,
      url: deployment.url,
      status: 'ready',
      timestamp: new Date().toISOString()
    });
    await env.KANBAN_STATE.put('current', JSON.stringify(state));
  }

  return jsonResponse({ processed: true, type }, headers);
}

// Sync all integrations
async function handleSync(request, env, headers) {
  const results = await syncAllIntegrations(env);
  return jsonResponse(results, headers);
}

async function syncAllIntegrations(env) {
  const results = {
    timestamp: new Date().toISOString(),
    synced: []
  };

  // Sync would happen here with actual API calls
  // For now, just mark as synced
  results.synced.push('github', 'salesforce', 'vercel');

  await env.KANBAN_STATE.put('lastSync', JSON.stringify(results));
  return results;
}

// Utility functions
function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

function generateTaskId() {
  return `TASK-${Date.now().toString(36).toUpperCase()}`;
}

async function generateTaskHash(task) {
  const content = JSON.stringify(task);
  return await computeSHA256(content);
}

async function computeSHA256(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getAllTasks(env) {
  const list = await env.KANBAN_STATE.list({ prefix: 'task:' });
  const tasks = [];
  for (const key of list.keys) {
    const task = await env.KANBAN_STATE.get(key.name, 'json');
    if (task) tasks.push(task);
  }
  return tasks;
}

function getDefaultState() {
  return {
    columns: {
      backlog: [],
      triage: [],
      ready: [],
      inProgress: [],
      review: [],
      testing: [],
      blocked: [],
      done: []
    },
    agents: [],
    lastUpdated: new Date().toISOString()
  };
}
