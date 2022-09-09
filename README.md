# DrBarnabus/pullrequest-automation Action
#### GitHub Pull Request process and task automation

A GitHub Action to automate a number of common pull request processes/tasks in a GitHub Repository.

## Example Configuration

`.github/pullrequest-automation.yml'
```yaml
modules:
  approvalLabeller:
    enabled: true
    requiredApprovals: 1
    labelsToApply:
      approved: approved
      rejected: rejected
      needsReview: needs-review
      draft: still-in-progress # optional
  branchLabeller:
    enabled: true
    rules:
    - baseRef: main
      headRef: development # optional
      labelToApply: development-to-main
    - baseRef: release/.* # Regular Expression Supported
      headRef: feature/.* # Regular Expression Supported
  reviewerExpander:
    enabled: true
commands:
  mergeSafety:
    enabled: true
    triggers: # single or list
    - Safe to merge? # default if no specified
    branchesToProtect:
    - baseRef: development
      comparisonBaseRef: main
      comparisonHeadRef: development
```

## Recommended Workflow Setup

`.github/workflows/pullrequest-automation.yml`
```yaml
name: Pull Request Automation
on:
  pull_request_target:
    types: [labelled, unlabelled, opened, edited, reopened, synchronize, converted_to_draft, ready_for_review, review_requested]
  pull_request_review:
    types: [submitted, edited, dismissed]
  issue_comment:
    types: [created]

jobs:
  process:
    name: Process
    runs-on: ubuntu-latest
    steps:
    - uses: DrBarnabus/pullrequest-automation@v3 # latest matching major version 'v3' or specific version 'v2.4.1' or branch 'main'
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        config-ref: main
    
```

### Workflow Parameters

__github-token__ - The GitHub API Token, for example `${{ secrets.GITHUB_TOKEN }}`
__config-path__ - Optional override for the path to the config file. Defaults to `.github/pullrequest-automation.yml`
__config-ref__ - Optional override for the branch/tag/commit to load the config from. Recommended to set to `main` but defaults to the commit in the PR if not set.

## v3 Breaking Changes

See [v3-CHANGES](./v3-CHANGES.md)

# License

Licensed under [MIT](./LICENSE)

Copyright (c) 2022 DrBarnabus
