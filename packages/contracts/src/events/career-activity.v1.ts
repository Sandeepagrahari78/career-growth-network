export type CareerActivityKind =
  | 'learned'
  | 'built'
  | 'milestone'
  | 'proof_added'
  | 'proof_validated'
  | 'mission_completed'
  | 'expert_validated'
  | 'opportunity_action';

export interface CareerActivityV1 {
  activityId: string;
  userId: string;
  kind: CareerActivityKind;
  occurredAt: string;
  sourceDomain: string;
  sourceEntityId: string;
  visibility: 'private' | 'connections' | 'public';
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}
