# Integration Task Template

## Task Information

- **Task ID**: TASK-XXX
- **Type**: Integration
- **Priority**: [Critical/High/Medium/Low]
- **Effort**: [XS/S/M/L/XL]
- **Assignee**: [Agent ID or Username]
- **Created**: YYYY-MM-DD

## Integration Overview

### Service to Integrate
- **Name**: [Service Name]
- **Type**: [API/Webhook/SDK/OAuth]
- **Documentation**: [Link to docs]

### Purpose
[Why this integration is needed]

### Expected Outcome
[What should work after integration]

## Technical Requirements

### Authentication
- **Type**: [API Key/OAuth2/Bearer Token/HMAC]
- **Credentials Needed**:
  - `SERVICE_API_KEY`
  - `SERVICE_SECRET`

### Endpoints to Use
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/resource` | GET | Fetch data |
| `/api/v1/resource` | POST | Create item |

### Rate Limits
- Requests per minute: [X]
- Daily quota: [Y]

### Data Flow
```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   BlackRoad  │────►│   Service   │────►│   Response   │
└──────────────┘     └─────────────┘     └──────────────┘
```

## Implementation

### Files to Create/Modify
- [ ] `kanban/integrations/service-name.js`
- [ ] `kanban/integrations/endpoints.json`
- [ ] Environment configuration

### Configuration
```json
{
  "serviceName": {
    "baseUrl": "https://api.service.com",
    "authType": "bearer",
    "authEnvVar": "SERVICE_API_KEY"
  }
}
```

### Error Handling
- 400: [Handle validation errors]
- 401: [Refresh auth token]
- 429: [Implement backoff]
- 500: [Retry with exponential backoff]

### Retry Policy
```javascript
retryPolicy: {
  maxRetries: 4,
  backoffMs: [2000, 4000, 8000, 16000]
}
```

## Testing

### Unit Tests
- [ ] Mock API responses
- [ ] Test authentication flow
- [ ] Test error handling
- [ ] Test retry logic

### Integration Tests
- [ ] Live API connectivity
- [ ] Data sync verification
- [ ] Webhook receipt

### Health Check
```javascript
async healthCheck() {
  // Implementation
}
```

## Webhook Configuration

### Outgoing Webhooks
- Endpoint: [URL]
- Events: [event1, event2]
- Secret: `WEBHOOK_SECRET`

### Incoming Webhooks
- Endpoint: `/webhooks/service-name`
- Validation: [HMAC signature verification]

## Checklist

### Before Starting
- [ ] Review service API documentation
- [ ] Obtain API credentials
- [ ] Check rate limits and quotas
- [ ] Claim task in kanban

### During Implementation
- [ ] Follow existing integration patterns
- [ ] Implement proper error handling
- [ ] Add comprehensive logging
- [ ] Handle edge cases

### Before Submitting PR
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Health check verified
- [ ] Credentials documented (not committed!)
- [ ] Hash verification complete

### Hash Verification
```
Task Hash: [sha256:...]
Config Hash: [sha256:...]
Integration Files:
  - service-name.js: [sha256:...]
Cross-Reference: [sha-infinity:...]
```

## Kanban State Integration

### State Updates
- Task moved to In Progress: Sync to Cloudflare
- PR opened: Update GitHub Projects
- Merged: Sync completion to Salesforce

### Webhook Events
```javascript
webhooks: {
  "service_to_cloudflare": {
    source: "service",
    target: "cloudflare",
    events: ["update", "create"]
  }
}
```

## Rollback Plan

1. Disable webhook endpoints
2. Remove from endpoints.json
3. Delete integration files
4. Update state

## Security Considerations

- [ ] Credentials stored in environment variables only
- [ ] HTTPS enforced for all calls
- [ ] Input validation on all external data
- [ ] Rate limiting implemented
- [ ] Audit logging enabled

## Notes

[Any additional notes or context]

---

**Agent Instructions**: Integration tasks require careful attention to security. Never commit credentials. Test thoroughly before submitting PR.
