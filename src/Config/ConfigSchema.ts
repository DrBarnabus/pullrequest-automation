import { z } from 'zod';

export type RequiredApprovals = z.infer<typeof RequiredApprovalsSchema>;
export const RequiredApprovalsSchema = z.union([
  z.number().gte(1),
  z.literal('smart'),
  z
    .object({ baseRef: z.string(), requiredApprovals: z.number().gte(1) })
    .array()
    .nonempty(),
]);

export type LabelsToApply = z.infer<typeof LabelsToApplySchema>;
export const LabelsToApplySchema = z.object({
  approved: z.string(),
  rejected: z.string(),
  needsReview: z.string(),
  draft: z.string().optional(),
});

export type ApprovalLabeller = z.infer<typeof ApprovalLabellerSchema>;
const ApprovalLabellerSchema = z.object({
  enabled: z.literal(true),
  requiredApprovals: RequiredApprovalsSchema,
  useLegacyMethod: z.boolean().optional(),
  labelsToApply: LabelsToApplySchema,
});

export type ApprovalLabellerModule = z.infer<typeof ApprovalLabellerModuleSchema>;
export const ApprovalLabellerModuleSchema = z.discriminatedUnion('enabled', [
  z.object({ enabled: z.literal(false) }),
  ApprovalLabellerSchema,
]);

export type BranchLabeller = z.infer<typeof BranchLabellerSchema>;
export const BranchLabellerSchema = z.discriminatedUnion('enabled', [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    rules: z
      .object({
        baseRef: z.string(),
        headRef: z.string().optional(),
        labelToApply: z.string(),
      })
      .array()
      .nonempty(),
  }),
]);

export type ReviewerExpander = z.infer<typeof ReviewerExpanderSchema>;
export const ReviewerExpanderSchema = z.object({
  enabled: z.boolean(),
});

export type Modules = z.infer<typeof ModulesSchema>;
export const ModulesSchema = z.object({
  approvalLabeller: ApprovalLabellerModuleSchema.optional(),
  branchLabeller: BranchLabellerSchema.optional(),
  reviewerExpander: ReviewerExpanderSchema.optional(),
});

export type CheckForMergeConflictAction = z.infer<typeof CheckForMergeConflictActionSchema>;
export const CheckForMergeConflictActionSchema = z.object({
  action: z.literal('check-for-merge-conflict'),
  name: z.string().optional(),
  with: z.object({
    baseRef: z.string(),
    comparisonBaseRef: z.string(),
  }),
});

export type MergePullRequestAction = z.infer<typeof MergePullRequestActionSchema>;
export const MergePullRequestActionSchema = z.object({
  action: z.literal('merge-pull-request'),
  name: z.string().optional(),
});

export type CreatePullRequestAction = z.infer<typeof CreatePullRequestActionSchema>;
export const CreatePullRequestActionSchema = z.object({
  action: z.literal('create-pull-request'),
  name: z.string().optional(),
  with: z.object({
    baseRef: z.string(),
    headRef: z.string(),
    label: z.string().optional(),
  }),
});

export type Action = z.infer<typeof ActionSchema>;
export const ActionSchema = z.discriminatedUnion('action', [
  CheckForMergeConflictActionSchema,
  MergePullRequestActionSchema,
  CreatePullRequestActionSchema,
]);

export type Command = z.infer<typeof CommandSchema>;
export const CommandSchema = z.object({
  trigger: z.string(),
  actions: ActionSchema.array().nonempty(),
});

export type Config = z.infer<typeof ConfigSchema>;
export const ConfigSchema = z.object({
  modules: ModulesSchema.optional(),
  commands: CommandSchema.array().optional(),
});
