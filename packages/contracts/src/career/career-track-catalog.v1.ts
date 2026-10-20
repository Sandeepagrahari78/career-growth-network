export type CareerTrackSkillRequirementV1 = "required" | "optional";

/**
 * Version-pinned public documentation used to justify a proposed skill
 * requirement. This metadata does not claim accreditation or endorsement.
 */
export interface CareerTrackSourceV1 {
  id: string;
  kind: "official_documentation";
  publisher: string;
  title: string;
  url: string;
  version: string;
  accessedOn: string;
}

export interface CareerTrackSkillV1 {
  skillId: string;
  requirement: CareerTrackSkillRequirementV1;
  prerequisites: string[];
  sourceIds: string[];
}

export interface CareerTrackDefinitionV1 {
  id: string;
  displayName: string;
  skills: CareerTrackSkillV1[];
  sources: CareerTrackSourceV1[];
}

/** Career-owned, versioned content. It does not define an API or event. */
export interface CareerTrackCatalogV1 {
  schemaVersion: 1;
  catalogVersion: string;
  skillCatalogVersion: string;
  tracks: CareerTrackDefinitionV1[];
}
