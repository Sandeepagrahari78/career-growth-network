export type SkillLifecycleV1 = 'active' | 'deprecated';

/**
 * A stable career-domain skill identity. Display names and aliases may change;
 * the canonical ID is never renamed, deleted, or reused.
 */
export interface SkillDefinitionV1 {
  id: string;
  displayName: string;
  aliases: string[];
  lifecycle: SkillLifecycleV1;
  replacementId?: string;
}

export interface SkillCatalogV1 {
  schemaVersion: 1;
  catalogVersion: string;
  skills: SkillDefinitionV1[];
}
