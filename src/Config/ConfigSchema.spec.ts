import { Config, ConfigSchema } from './ConfigSchema';
import merge from 'lodash/merge';

const baseConfig: Config = {
  modules: {
    approvalLabeller: {
      enabled: true,
      requiredApprovals: 'smart',
      labelsToApply: {
        approved: 'approved',
        rejected: 'rejected',
        needsReview: 'needs-review',
      },
    },
    branchLabeller: {
      enabled: true,
      rules: [
        {
          baseRef: 'development',
          headRef: 'main',
          labelToApply: 'to-main',
        },
      ],
    },
    reviewerExpander: {
      enabled: true,
    },
  },
  commands: [
    {
      trigger: 'Test Command',
      actions: [
        {
          action: 'check-for-merge-conflict',
          with: {
            baseRef: 'development',
            comparisonBaseRef: 'main',
          },
        },
        {
          action: 'merge-pull-request',
          name: 'Merge Pull Request',
        },
        {
          action: 'create-pull-request',
          name: 'Create Pull Request',
          with: {
            baseRef: 'development',
            headRef: 'main',
          },
        },
      ],
    },
  ],
};

describe('ConfigSchema', () => {
  it.each([
    {
      modules: {
        approvalLabeller: { enabled: 'false' },
      },
    },
    {
      modules: {
        approvalLabeller: { requiredApprovals: 0 },
      },
    },
    {
      modules: {
        approvalLabeller: { requiredApprovals: 'invalid' },
      },
    },
    {
      modules: {
        approvalLabeller: { requiredApprovals: {} },
      },
    },
    {
      modules: {
        approvalLabeller: { requiredApprovals: [] },
      },
    },
    {
      modules: {
        approvalLabeller: { requiredApprovals: [{ baseRef: null, requiredApprovals: 0 }] },
      },
    },
    {
      modules: {
        approvalLabeller: { useLegacyMethod: 'false' },
      },
    },
    {
      modules: {
        approvalLabeller: { labelsToApply: null },
      },
    },
    {
      modules: {
        approvalLabeller: {
          labelsToApply: {
            approved: null,
            rejected: null,
            needsReview: null,
          },
        },
      },
    },
    {
      modules: {
        approvalLabeller: {
          labelsToApply: {
            approved: 1,
            rejected: 1,
            needsReview: 1,
            draft: 1,
          },
        },
      },
    },
    {
      modules: {
        branchLabeller: {
          enabled: 'false',
        },
      },
    },
    {
      modules: {
        branchLabeller: {
          rules: null,
        },
      },
    },
    {
      modules: {
        branchLabeller: {
          rules: [],
        },
      },
    },
    {
      modules: {
        branchLabeller: {
          rules: [{ baseRef: 1, headRef: 1, labelToApply: 2 }],
        },
      },
    },
    {
      modules: {
        reviewerExpander: { enabled: 'false' },
      },
    },
    {
      modules: {
        approvalLabeller: 'invalid',
        branchLabeller: 'invalid',
        reviewerExpander: 'invalid',
      },
    },
    {
      commands: {},
    },
    {
      commands: [],
    },
    {
      commands: [
        {
          trigger: 1,
        },
      ],
    },
    {
      commands: [
        {
          actions: {},
        },
      ],
    },
    {
      commands: [
        {
          actions: [],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'invalid' }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'check-for-merge-conflict', name: 1 }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'check-for-merge-conflict', with: null }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'check-for-merge-conflict', with: { baseRef: 1, comparisonBaseRef: 1 } }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'merge-pull-request', name: 1 }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'create-pull-request', name: 1 }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'create-pull-request', with: null }],
        },
      ],
    },
    {
      commands: [
        {
          actions: [{ action: 'create-pull-request', with: { baseRef: 1, headRef: 1, label: 1 } }],
        },
      ],
    },
  ])('should correctly flag errors in the configuration %j', (baseAlterationsForTest: unknown) => {
    const objectToTest = merge(baseConfig, baseAlterationsForTest);

    expect(() => ConfigSchema.parse(objectToTest)).toThrowErrorMatchingSnapshot();
  });
});
