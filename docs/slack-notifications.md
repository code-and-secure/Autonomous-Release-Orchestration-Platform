# Slack Notifications

## 1) Create Slack webhook

- Create a Slack App.
- Enable Incoming Webhooks.
- Add webhook to the target channel.

## 2) Add GitHub secret

- Repository Settings -> Secrets and variables -> Actions
- Add secret: `SLACK_WEBHOOK_URL`

## 3) Validate

- Trigger a CI run.
- Verify success/failure messages in your Slack channel.

## Optional: richer message payload

Use this shape in the GitHub Action payload:

```json
{
  "text": "Release status update",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Pipeline:* ci\n*Status:* success\n*Commit:* abc123"
      }
    }
  ]
}
```
