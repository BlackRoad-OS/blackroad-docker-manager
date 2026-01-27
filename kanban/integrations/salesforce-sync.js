/**
 * Salesforce CRM Integration
 *
 * Syncs kanban tasks with Salesforce opportunities, cases, and custom objects.
 * Maintains bidirectional sync between GitHub and Salesforce.
 */

class SalesforceSync {
  constructor(config) {
    this.instanceUrl = config.instanceUrl || process.env.SALESFORCE_INSTANCE_URL;
    this.clientId = config.clientId || process.env.SALESFORCE_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.SALESFORCE_CLIENT_SECRET;
    this.refreshToken = config.refreshToken || process.env.SALESFORCE_REFRESH_TOKEN;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const response = await fetch(`${this.instanceUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error(`Salesforce auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
    return this.accessToken;
  }

  async query(soql) {
    const token = await this.authenticate();
    const response = await this.fetchWithRetry(
      `${this.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.json();
  }

  async fetchWithRetry(url, options, retries = 4) {
    const backoff = [2000, 4000, 8000, 16000];

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status >= 500 && i < retries - 1) {
          await this.sleep(backoff[i]);
          continue;
        }
        throw new Error(`Request failed: ${response.status}`);
      } catch (error) {
        if (i < retries - 1) {
          await this.sleep(backoff[i]);
          continue;
        }
        throw error;
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sync kanban tasks to Salesforce
  async syncTasksToSalesforce(tasks) {
    const token = await this.authenticate();
    const results = [];

    for (const task of tasks) {
      const sfObject = this.mapTaskToSalesforce(task);

      const response = await fetch(
        `${this.instanceUrl}/services/data/v58.0/sobjects/Kanban_Task__c`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sfObject)
        }
      );

      results.push({
        taskId: task.id,
        success: response.ok,
        sfId: response.ok ? (await response.json()).id : null
      });
    }

    return results;
  }

  // Sync Salesforce records to kanban
  async syncFromSalesforce() {
    const opportunities = await this.query(`
      SELECT Id, Name, StageName, Amount, CloseDate,
             Account.Name, Related_GitHub_Issue__c
      FROM Opportunity
      WHERE StageName = 'Closed Won'
        AND Delivered__c = false
      ORDER BY CloseDate DESC
      LIMIT 100
    `);

    const cases = await this.query(`
      SELECT Id, CaseNumber, Subject, Status, Priority,
             Account.Name, Related_GitHub_Issue__c
      FROM Case
      WHERE Status != 'Closed'
      ORDER BY Priority, CreatedDate
      LIMIT 100
    `);

    return {
      opportunities: opportunities.records.map(this.mapOpportunityToTask),
      cases: cases.records.map(this.mapCaseToTask)
    };
  }

  mapTaskToSalesforce(task) {
    return {
      Name: task.title,
      Task_ID__c: task.id,
      Status__c: this.mapStatusToSalesforce(task.status),
      Priority__c: task.priority || 'Medium',
      Description__c: task.description,
      GitHub_PR__c: task.prUrl,
      Hash__c: task.hash,
      Agent_ID__c: task.agentId
    };
  }

  mapOpportunityToTask(opp) {
    return {
      id: `SF-OPP-${opp.Id}`,
      title: `Deliver: ${opp.Name}`,
      source: 'salesforce',
      sourceType: 'opportunity',
      crmId: opp.Id,
      status: 'backlog',
      priority: opp.Amount > 100000 ? 'high' : 'medium',
      metadata: {
        accountName: opp.Account?.Name,
        closeDate: opp.CloseDate,
        amount: opp.Amount,
        githubIssue: opp.Related_GitHub_Issue__c
      }
    };
  }

  mapCaseToTask(caseRecord) {
    return {
      id: `SF-CASE-${caseRecord.Id}`,
      title: `Support: ${caseRecord.Subject}`,
      source: 'salesforce',
      sourceType: 'case',
      crmId: caseRecord.Id,
      caseNumber: caseRecord.CaseNumber,
      status: 'triage',
      priority: caseRecord.Priority?.toLowerCase() || 'medium',
      metadata: {
        accountName: caseRecord.Account?.Name,
        caseStatus: caseRecord.Status,
        githubIssue: caseRecord.Related_GitHub_Issue__c
      }
    };
  }

  mapStatusToSalesforce(status) {
    const mapping = {
      'backlog': 'New',
      'triage': 'Triaging',
      'ready': 'Ready',
      'in_progress': 'In Progress',
      'review': 'In Review',
      'testing': 'Testing',
      'blocked': 'Blocked',
      'done': 'Completed'
    };
    return mapping[status] || 'New';
  }

  // Create webhook for Salesforce Platform Events
  async setupWebhook(callbackUrl) {
    const token = await this.authenticate();

    // This would typically be done through Salesforce Setup UI
    // or through metadata API for production
    console.log(`Configure Salesforce Platform Event webhook to: ${callbackUrl}`);

    return {
      configured: true,
      callbackUrl,
      events: ['Opportunity_Update__e', 'Case_Update__e']
    };
  }
}

// GitHub to Salesforce sync
class GitHubSalesforceSync {
  constructor(salesforceSync, githubToken) {
    this.sf = salesforceSync;
    this.githubToken = githubToken || process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER || 'BlackRoad-OS';
    this.repo = process.env.GITHUB_REPO || 'blackroad-docker-manager';
  }

  async syncPRToSalesforce(prNumber) {
    // Fetch PR details from GitHub
    const pr = await this.fetchPR(prNumber);

    // Find related Salesforce records
    const sfRecords = await this.sf.query(`
      SELECT Id, Name FROM Kanban_Task__c
      WHERE GitHub_PR__c = '${pr.html_url}'
    `);

    if (sfRecords.totalSize > 0) {
      // Update existing record
      const recordId = sfRecords.records[0].Id;
      await this.sf.updateRecord(recordId, {
        PR_Status__c: pr.state,
        PR_Merged__c: pr.merged,
        Last_Sync__c: new Date().toISOString()
      });
    }

    return { synced: true, prNumber, sfRecords: sfRecords.totalSize };
  }

  async fetchPR(prNumber) {
    const response = await fetch(
      `https://api.github.com/repos/${this.owner}/${this.repo}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    return response.json();
  }
}

module.exports = { SalesforceSync, GitHubSalesforceSync };
