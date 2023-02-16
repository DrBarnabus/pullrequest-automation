import { z } from 'zod';

export type RequiredApprovals = z.infer<typeof RequiredApprovalsSchema>;
const RequiredApprovalsSchema = z.union([
  z.number(),
  z.string(),
  z.object({ baseRef: z.string(), requiredApprovals: z.number() }).array(),
]);

export type LabelsToApply = z.infer<typeof LabelsToApplySchema>;
const LabelsToApplySchema = z.object({
  approved: z.string(),
  rejected: z.string(),
  needsReview: z.string(),
  draft: z.string().optional(),
});

export type ApprovalLabeller = z.infer<typeof ApprovalLabellerSchema>;
const ApprovalLabellerSchema = z.object({
  enabled: z.boolean(),
  requiredApprovals: RequiredApprovalsSchema,
  useLegacyMethod: z.boolean().optional(),
  labelsToApply: LabelsToApplySchema,
});

export type BranchLabeller = z.infer<typeof BranchLabellerSchema>;
const BranchLabellerSchema = z.object({
  enabled: z.boolean(),
  rules: z
    .object({
      baseRef: z.string(),
      headRef: z.string().optional(),
      labelToApply: z.string(),
    })
    .array()
    .nonempty(),
});

export type ReviewerExpander = z.infer<typeof ReviewerExpanderSchema>;
const ReviewerExpanderSchema = z.object({
  enabled: z.boolean(),
});

export type Modules = z.infer<typeof ModulesSchema>;
const ModulesSchema = z.object({
  approvalLabeller: ApprovalLabellerSchema.optional(),
  branchLabeller: BranchLabellerSchema.optional(),
  reviewerExpander: ReviewerExpanderSchema.optional(),
});

export type CheckForMergeConflictAction = z.infer<typeof CheckForMergeConflictActionSchema>;
const CheckForMergeConflictActionSchema = z.object({
  action: z.literal('check-for-merge-conflict'),
  name: z.string().optional(),
  with: z.object({
    baseRef: z.string(),
    comparisonBaseRef: z.string(),
  }),
});

export type MergePullRequestAction = z.infer<typeof MergePullRequestActionSchema>;
const MergePullRequestActionSchema = z.object({
  action: z.literal('merge-pull-request'),
  name: z.string().optional(),
  with: z.object({
    baseRef: z.string(),
  }),
});

export type CreatePullRequestAction = z.infer<typeof CreatePullRequestActionSchema>;
const CreatePullRequestActionSchema = z.object({
  action: z.literal('create-pull-request'),
  name: z.string().optional(),
  with: z.object({
    baseRef: z.string(),
    headRef: z.string(),
    label: z.string().optional(),
  }),
});

export type Action = z.infer<typeof ActionSchema>;
const ActionSchema = z.discriminatedUnion('action', [
  CheckForMergeConflictActionSchema,
  MergePullRequestActionSchema,
  CreatePullRequestActionSchema,
]);

export type Commands = z.infer<typeof CommandsSchema>;
const CommandsSchema = z.object({
  trigger: z.string(),
  actions: ActionSchema.array().nonempty(),
});

export type Config = z.infer<typeof ConfigSchema>;
export const ConfigSchema = z.object({
  modules: ModulesSchema.optional(),
  commands: CommandsSchema.optional(),
});
