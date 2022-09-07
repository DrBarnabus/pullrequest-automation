# pullrequest-automation

GitHub Action to automate a number of common pull request tasks in a GitHub Repository.

## Example Configuration

`.github/pullrequest-automation.yml'
```yaml
approvalLabels:
  requiredApprovals: 1
  labelsToApply:
    approved: approved
    rejected: rejected
    needsReview: needs-review
    draft: still-in-progress
branchLabels:
  disable: false # Able to disable specific features
  rules:
  - baseRef: main
    headRef: development
    labelToApply: main-to-development
  - baseRef: development
    headRef: feature/.* # Regular Expression Supported

```

## Recommended Workflow Setup

`.github/workflows/pullrequest-automation.yml`
```yaml
name: Pull Request Automation
on:
  pull_request_target:
    types: [opened, edited, reopened, synchronize]
  pull_request_review:
    types: [submitted, edited, dismissed]

jobs:
  process:
    name: Process
    runs-on: ubuntu-latest
    steps:
    - uses: DrBarnabus/pullrequest-automation@v2 # latest matching major version 'v2' or specific version 'v2.3.1' or branch 'main'
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        config-ref: main
    
```

### Workflow Parameters

__github-token__ - The GitHub API Token, for example `${{ secrets.GITHUB_TOKEN }}`
__config-path__ - Optional override for the path to the config file. Defaults to `.github/pullrequest-automation.yml`
__config-ref__ - Optional override for the branch/tag/commit to load the config from. Recommended to set to `main` but defaults to the commit in the PR if not set.
