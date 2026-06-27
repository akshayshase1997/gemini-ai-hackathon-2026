# API Contract

## Current version

`v1`

Current supported workflow:

1. `design_review`

Planned later workflow:

1. `review_existing`

## Endpoint summary

### `GET /api/health`

Returns service health and basic runtime readiness.

Example response:

```json
{
  "status": "healthy",
  "service": "infraoracle",
  "mode": "design_review",
  "model": "gemini-3.5-flash",
  "api_key_configured": true
}
```

### `POST /api/analyze`

Runs Phase 1 end to end:

1. design architecture
2. review generated architecture

## Request body

```json
{
  "input": "Design a GCP architecture for a small e-commerce application with admin panel, PostgreSQL, and background jobs.",
  "image": {
    "mime_type": "image/png",
    "data": "BASE64_STRING"
  }
}
```

## Request fields

### `input`

- Type: `string`
- Required: no, if `image` is provided
- Meaning: architecture prompt from the user

### `image`

- Type: `object`
- Required: no, if `input` is provided
- Meaning: optional whiteboard or sketch input

`image.mime_type`

- Type: `string`
- Required: yes when `image` is provided
- Example: `image/png`

`image.data`

- Type: `string`
- Required: yes when `image` is provided
- Meaning: base64 encoded image payload

## Success response

Status code: `200`

```json
{
  "mode": "design_review",
  "design": {
    "status": "success",
    "data": {
      "title": "Fintech Dashboard on Google Cloud",
      "summary": "A concise architecture summary.",
      "mermaid_diagram": "graph TD\\nA[Cloud Load Balancing] --> B[Cloud Run]",
      "components": [
        {
          "name": "Frontend API",
          "gcp_service": "Cloud Run",
          "purpose": "Serves the app and backend API",
          "tier": "Standard"
        }
      ],
      "terraform_snippet": "resource \"google_cloud_run_v2_service\" \"app\" {}",
      "estimated_monthly_cost": {
        "low": "$40",
        "medium": "$180",
        "high": "$750"
      },
      "design_decisions": [
        "Use Cloud Run for fast deployment.",
        "Use Cloud SQL for transactional persistence."
      ]
    }
  },
  "review": {
    "status": "success",
    "data": {
      "overall_score": 7.8,
      "overall_verdict": "Good baseline with a few production gaps.",
      "security": {
        "score": 7,
        "findings": []
      },
      "cost": {
        "score": 8,
        "findings": []
      },
      "reliability": {
        "score": 8,
        "findings": []
      },
      "top_3_actions": [
        {
          "priority": 1,
          "action": "Add Cloud Armor in front of public ingress.",
          "category": "Security",
          "reason": "Reduces exposure at the internet edge."
        }
      ]
    }
  }
}
```

## Error response

Status code: `400` or `502`

```json
{
  "status": "error",
  "message": "Invalid request.",
  "details": "Provide either a text prompt or an image sketch."
}
```

Possible error sources:

1. empty input
2. malformed image payload
3. missing `GEMINI_API_KEY`
4. Gemini API failure
5. invalid JSON returned by the model

## Planned extension contract

Not implemented yet.

Recommended future endpoint:

### `POST /api/review-existing`

Request body:

```json
{
  "input": "Current setup: Cloud Load Balancer -> GKE -> Cloud SQL, single region, no WAF, secrets in env vars."
}
```

Response body:

1. reuse the existing review schema
2. omit the `design` object
