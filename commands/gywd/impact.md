---
name: GYWD:impact
description: Reality integration - connect code to real-world outcomes
argument-hint: "[file/function/feature] [--metrics] [--cost] [--incidents]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task
  - Write
  - WebFetch
---

<objective>
Connect code to its real-world impact.

Current AI has no concept of production reality. It generates code in a vacuum.

Reality-Grounded Development links:
- Code → Production metrics
- Features → Business outcomes
- Architecture → Infrastructure costs
- Code paths → Incident history

Decisions become informed by reality, not just code aesthetics.
</objective>

<philosophy>
Code exists to produce outcomes.

A function that runs 1M times/day matters more than one that runs once/month.
A feature that drives 20% of revenue deserves more attention.
An endpoint that caused 3 outages needs more care.

Without this context, all code looks equally important.
With it, priorities become obvious.
</philosophy>

<reference>
See `.planning/config.json` for data source configuration and integration setup.
</reference>

<data_sources>
## Reality Data Sources

### Production Metrics
- Request volumes per endpoint
- Error rates per function
- Latency percentiles
- Resource consumption

Integration points:
- Datadog, New Relic, Prometheus
- Application logs
- APM traces

### Business Metrics
- Feature → Revenue correlation
- User engagement by feature
- Conversion impact
- Retention correlation

Integration points:
- Analytics platforms (Amplitude, Mixpanel)
- Business dashboards
- A/B test results

### Cost Data
- Compute costs by service
- Storage costs by table
- Network costs by endpoint
- Third-party API costs

Integration points:
- AWS Cost Explorer
- Cloud billing APIs
- Vendor invoices

### Incident History
- Outages linked to code changes
- Error spikes by file
- On-call pages by service
- Post-mortems by feature

Integration points:
- PagerDuty, Opsgenie
- Incident management systems
- Post-mortem databases
</data_sources>

<commands>
## Subcommands

### /gywd:impact <target>
Show impact profile for file, function, or feature.

```markdown
## Impact Profile: src/api/checkout.ts

### Production Metrics
| Metric | Value | Trend |
|--------|-------|-------|
| Requests/day | 47,000 | ↑ 12% |
| Error rate | 0.3% | → stable |
| P50 latency | 120ms | → stable |
| P99 latency | 890ms | ↓ improved |

### Business Impact
- **Revenue attribution**: 34% of daily revenue
- **Conversion impact**: Critical path for purchase
- **User sessions**: 23% of all sessions touch this

### Cost Profile
- **Compute**: $340/month (2.1% of total)
- **Database**: 12% of read queries
- **External APIs**: $89/month (Stripe calls)

### Incident History
| Date | Severity | Cause | Duration |
|------|----------|-------|----------|
| 2024-01-15 | P1 | Race condition | 45 min |
| 2023-11-03 | P2 | Timeout spike | 20 min |

### Risk Assessment
🔴 **High impact surface**: Outage here affects revenue
🟠 **Moderate stability**: 2 incidents in 6 months
🟢 **Good performance**: Latency within SLO

### Recommendations
1. Add circuit breaker (high impact, no protection)
2. Increase test coverage (currently 62%)
3. Consider caching (high volume, stable data)
```

### /gywd:impact --metrics
Show production metrics across codebase.

```markdown
## Production Metrics Overview

### Top Traffic (Requests/Day)
| Endpoint | Requests | Errors | P99 |
|----------|----------|--------|-----|
| GET /api/products | 892K | 0.1% | 45ms |
| POST /api/cart | 234K | 0.2% | 120ms |
| POST /api/checkout | 47K | 0.3% | 890ms |
| GET /api/user | 1.2M | 0.05% | 30ms |

### Error Hotspots
| File | Error Rate | Volume | Trend |
|------|------------|--------|-------|
| src/services/payment.ts | 1.2% | 12K/day | ↑ |
| src/api/orders.ts | 0.8% | 89K/day | → |
| src/utils/shipping.ts | 0.6% | 34K/day | ↓ |

### Performance Concerns
| Endpoint | P99 | SLO | Status |
|----------|-----|-----|--------|
| POST /api/search | 2.3s | 1s | 🔴 Violation |
| GET /api/recommendations | 1.8s | 2s | 🟡 Warning |
```

### /gywd:impact --cost
Show infrastructure costs by code area.

```markdown
## Cost Attribution

**Total Monthly**: $12,400

### By Service
| Service | Monthly | % | Trend |
|---------|---------|---|-------|
| API Server | $4,200 | 34% | ↑ |
| Database | $3,100 | 25% | → |
| Cache (Redis) | $890 | 7% | → |
| Storage (S3) | $2,100 | 17% | ↑ |
| CDN | $1,200 | 10% | → |
| External APIs | $910 | 7% | ↓ |

### Cost Drivers
1. **Image processing** (S3 + compute): $2,800/month
   - Opportunity: Optimize before upload, save ~40%

2. **Search indexing** (compute): $1,200/month
   - Opportunity: Batch updates, save ~30%

3. **Payment retries** (Stripe API): $340/month
   - Opportunity: Better retry logic, save ~50%

### Cost Anomalies
⚠️ Database reads up 45% but traffic up only 12%
   Likely cause: Missing index or N+1 query
```

### /gywd:impact --incidents
Show incident history and patterns.

```markdown
## Incident Analysis

### Last 6 Months
| Severity | Count | MTTR | Trend |
|----------|-------|------|-------|
| P1 (Critical) | 2 | 52 min | → |
| P2 (Major) | 7 | 23 min | ↓ |
| P3 (Minor) | 15 | 45 min | → |

### By Code Area
| Area | Incidents | Last | Risk |
|------|-----------|------|------|
| src/api/checkout/ | 4 | 2 weeks | 🔴 High |
| src/services/payment/ | 3 | 1 month | 🟠 Medium |
| src/api/orders/ | 2 | 3 months | 🟡 Low |

### Root Cause Patterns
| Pattern | Count | Example |
|---------|-------|---------|
| Race condition | 3 | Concurrent cart updates |
| External service timeout | 3 | Stripe API latency |
| Database deadlock | 2 | Order + inventory lock |
| Memory exhaustion | 1 | Large export without streaming |

### Recommendations
1. **Add timeout handling** to all external calls
2. **Implement optimistic locking** for cart operations
3. **Add circuit breakers** to payment service
```
</commands>

<integration>
## How Impact Integrates

### During Planning
```markdown
Planning Phase 4: Checkout Optimization

Impact context loaded:
- 47K requests/day (high impact changes)
- 2 P1 incidents in area (proceed carefully)
- $340/month in compute (optimization opportunity)

Recommendations:
- Add comprehensive tests before changes
- Implement feature flag for gradual rollout
- Have rollback plan ready
```

### During Review
```markdown
/gywd:challenge src/api/checkout.ts

Additional context from Impact:
- This file is in critical revenue path
- Last change caused P2 incident
- Suggest extra scrutiny on error paths
```

### During Decisions
```markdown
Decision: Add caching to product API

Impact analysis:
- Current: 892K requests/day at $0.0001/request
- With cache: ~70% cache hit expected
- Savings: ~$200/month
- Risk: Stale data, complexity

Recommendation: Proceed with 1-hour TTL
```
</integration>

<configuration>
## Setup

Configure data sources in `.planning/config.json`:

```json
{
  "impact": {
    "metrics": {
      "provider": "datadog",
      "api_key_env": "DD_API_KEY",
      "service_tag": "myapp"
    },
    "costs": {
      "provider": "aws",
      "profile": "production"
    },
    "incidents": {
      "provider": "pagerduty",
      "api_key_env": "PD_API_KEY"
    },
    "analytics": {
      "provider": "amplitude",
      "api_key_env": "AMPLITUDE_KEY"
    }
  }
}
```

If no integrations configured, falls back to:
- Git history analysis
- Manual annotations
- Estimated impact from code analysis
</configuration>

<success_criteria>
- [ ] Retrieves production metrics per endpoint/file
- [ ] Shows business impact attribution
- [ ] Displays cost breakdown by code area
- [ ] Surfaces incident history
- [ ] Identifies patterns and anomalies
- [ ] Integrates with planning and review
- [ ] Falls back gracefully without integrations
</success_criteria>
