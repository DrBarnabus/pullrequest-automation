# v3 Breaking Changes

## Config

- `approvalLabels` config section has been moved under `modules` and has been renamed `approvalLabeller`:<br>
  Before:
  ```yaml
  approvalLabels:
    requiredApprovals: 1
    labelsToApply:
      ...
  ```
  New:
  ```yaml
  modules:
    approvalLabeller:
      enabled: true
      requiredApprovals: 1
      labelsToApply:
        ...
  ```

- `branchLabels` config section has been moved under `modules` and has been renamed `branchLabeller`:<br>
  Before:
  ```yaml
  branchLabels:
    rules:
      ...
  ```
  New:
  ```yaml
  modules:
    branchLabeller:
      enabled: true
      rules:
        ...
  ```

- Modules and Commands must now be explicitly enabled via the `enabled` property under that Module or Commands configuration section.<br>
  Example:
  ```yaml
  modules:
    approvalLabeller:
      enabled: true # Must now be set, if not set then the module or command is skipped
  ```

- Config validation has been added, any existing unsupported configurations may have previously worked but now will receive an error when attempting to process an event.
