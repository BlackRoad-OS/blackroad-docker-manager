/**
 * Claude API Integration
 *
 * Manages AI agent interactions for code review, task analysis, and automation.
 * Integrates with kanban for AI-assisted task processing.
 */

class ClaudeIntegration {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.baseUrl = 'https://api.anthropic.com';
    this.model = config.model || 'claude-opus-4-5-20251101';
    this.maxTokens = config.maxTokens || 4096;
  }

  async request(endpoint, options = {}) {
    const response = await this.fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2024-01-01',
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
        if (response.status === 429) {
          // Rate limited - wait longer
          await new Promise(r => setTimeout(r, backoff[i] * 2));
          continue;
        }
        throw new Error(`Claude API error: ${response.status}`);
      } catch (error) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, backoff[i]));
          continue;
        }
        throw error;
      }
    }
  }

  // Send message to Claude
  async message(content, options = {}) {
    return this.request('/v1/messages', {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        messages: Array.isArray(content) ? content : [{ role: 'user', content }],
        system: options.system,
        temperature: options.temperature || 0.7
      })
    });
  }

  // Analyze task for complexity and requirements
  async analyzeTask(task) {
    const prompt = `Analyze this development task and provide structured output:

Task: ${task.title}
Description: ${task.description || 'No description provided'}
Files: ${task.files?.join(', ') || 'Not specified'}

Provide analysis in this JSON format:
{
  "complexity": "low|medium|high",
  "estimatedEffort": "XS|S|M|L|XL",
  "requiredSkills": ["skill1", "skill2"],
  "risks": ["risk1", "risk2"],
  "suggestedApproach": "description",
  "integrations": ["integration1", "integration2"],
  "prChecklist": ["item1", "item2"]
}`;

    const response = await this.message(prompt, {
      system: 'You are a senior software engineer analyzing tasks for a kanban board. Respond only with valid JSON.'
    });

    try {
      const text = response.content[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return { error: 'Failed to parse analysis' };
    }
  }

  // Review code changes
  async reviewCode(diff, context = {}) {
    const prompt = `Review this code change:

${diff}

Context:
- Repository: ${context.repo || 'Unknown'}
- Task: ${context.taskId || 'Unknown'}
- Author: ${context.author || 'Unknown'}

Provide a code review with:
1. Summary of changes
2. Potential issues or bugs
3. Security concerns
4. Performance considerations
5. Suggestions for improvement
6. Approval status (approve/request_changes/comment)`;

    return this.message(prompt, {
      system: 'You are a senior code reviewer. Be thorough but constructive.'
    });
  }

  // Generate commit message
  async generateCommitMessage(diff) {
    const prompt = `Generate a concise, conventional commit message for this diff:

${diff}

Format: <type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Keep the description under 72 characters.`;

    const response = await this.message(prompt, {
      system: 'You are a git commit message generator. Output only the commit message, nothing else.',
      temperature: 0.3
    });

    return response.content[0]?.text?.trim() || 'chore: update files';
  }

  // Validate PR before merge
  async validatePR(prData) {
    const prompt = `Validate this pull request for merge readiness:

Title: ${prData.title}
Description: ${prData.description}
Changed Files: ${prData.files?.length || 0}
Additions: ${prData.additions || 0}
Deletions: ${prData.deletions || 0}
Tests: ${prData.testsPass ? 'Passing' : 'Failing or unknown'}
Reviews: ${prData.approvals || 0} approvals

Checklist items:
${prData.checklist?.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n') || 'None'}

Determine if this PR is ready to merge. Respond with JSON:
{
  "ready": true/false,
  "blockers": ["blocker1", "blocker2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": 0-100
}`;

    const response = await this.message(prompt, {
      system: 'You are a PR validation assistant. Be strict but fair.',
      temperature: 0.2
    });

    try {
      const text = response.content[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { ready: false, blockers: ['Parse error'] };
    } catch {
      return { ready: false, blockers: ['Failed to parse validation'] };
    }
  }

  // Generate task breakdown
  async breakdownTask(task) {
    const prompt = `Break down this development task into subtasks:

Task: ${task.title}
Description: ${task.description || 'No description'}

Create 3-7 specific, actionable subtasks. Respond with JSON:
{
  "subtasks": [
    {"title": "Subtask 1", "description": "Details", "effort": "XS|S|M|L|XL"},
    ...
  ],
  "dependencies": ["subtask pairs that depend on each other"],
  "parallelizable": ["subtasks that can be done in parallel"]
}`;

    const response = await this.message(prompt, {
      system: 'You are a project manager breaking down tasks. Be specific and practical.'
    });

    try {
      const text = response.content[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { subtasks: [] };
    } catch {
      return { subtasks: [], error: 'Failed to parse breakdown' };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.message('Respond with: OK', {
        maxTokens: 10,
        temperature: 0
      });
      return {
        healthy: true,
        model: this.model,
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
}

// AI Agent for kanban automation
class KanbanAgent {
  constructor(claude, stateManager) {
    this.claude = claude;
    this.stateManager = stateManager;
    this.agentId = `claude-${Date.now().toString(36)}`;
  }

  async processTask(taskId) {
    const task = await this.stateManager.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    // Analyze the task
    const analysis = await this.claude.analyzeTask(task);

    // Update task with analysis
    await this.stateManager.updateTask(taskId, {
      analysis,
      agentId: this.agentId,
      processedAt: new Date().toISOString()
    });

    // If complex, break it down
    if (analysis.complexity === 'high') {
      const breakdown = await this.claude.breakdownTask(task);
      await this.stateManager.createSubtasks(taskId, breakdown.subtasks);
    }

    return { taskId, analysis, agentId: this.agentId };
  }

  async reviewPR(prNumber) {
    const prData = await this.stateManager.getPRData(prNumber);
    const validation = await this.claude.validatePR(prData);

    await this.stateManager.updatePRValidation(prNumber, {
      validation,
      agentId: this.agentId,
      reviewedAt: new Date().toISOString()
    });

    return validation;
  }
}

module.exports = { ClaudeIntegration, KanbanAgent };
