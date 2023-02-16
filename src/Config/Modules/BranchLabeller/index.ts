import { BaseModuleConfig } from '../BaseModuleConfig';
import { Rule } from './Rule';

export interface BranchLabellerModuleConfig extends BaseModuleConfig {
  rules: Rule[];
}
