import * as core from '../Core';
import { ParseAndValidateConfig } from './LoadConfig';

const basicYml = `
modules:
  approvalLabeller:
    enabled: false
  branchLabeller:
    enabled: true
    rules:
      - baseRef: base
        labelToApply: test
  reviewerExpander:
    enabled: true
commands:
  - trigger: test
    actions:
      - action: create-pull-request
        name: Create Pull Request
        with:
          baseRef: base
          headRef: head
`;

describe('ParseAndValidateConfig', () => {
  beforeEach(() => {
    jest.spyOn(core, 'LogInfo').mockImplementation(() => {});
  });

  test('correctly parses a basic configuration yaml', async () => {
    const config = await ParseAndValidateConfig('', basicYml);

    expect(config.modules?.approvalLabeller?.enabled).toBeFalsy();
    expect(config.modules?.branchLabeller?.enabled).toBeTruthy();

    if (config.modules?.branchLabeller?.enabled === false) {
      fail();
    }

    expect(config.modules?.branchLabeller?.rules[0].baseRef).toBe('base');
    expect(config.modules?.branchLabeller?.rules[0].labelToApply).toBe('test');

    if (!config.commands || config.commands[0].actions[0].action !== 'create-pull-request') {
      fail();
    }

    expect(config.commands[0].trigger).toBe('test');
    expect(config.commands[0].actions[0].action).toBe('create-pull-request');
    expect(config.commands[0].actions[0].name).toBe('Create Pull Request');
    expect(config.commands[0].actions[0].with.baseRef).toBe('base');
    expect(config.commands[0].actions[0].with.headRef).toBe('head');
  });
});
