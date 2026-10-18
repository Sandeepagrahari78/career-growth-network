export type ProductAnalyticsConsentClassV1 = 'product_analytics_opt_in';

export type ProductAnalyticsPropertyTypeV1 =
  | 'boolean'
  | 'enum'
  | 'integer'
  | 'number'
  | 'string';

export interface ProductAnalyticsPropertyV1 {
  name: string;
  type: ProductAnalyticsPropertyTypeV1;
  required: boolean;
  allowedValues?: string[];
}

export interface ProductAnalyticsEventDefinitionV1 {
  eventName: string;
  producer: string;
  consentClass: ProductAnalyticsConsentClassV1;
  retentionOwner: 'analytics';
  properties: ProductAnalyticsPropertyV1[];
  sample: {
    eventId: string;
    eventType: string;
    eventVersion: 1;
    occurredAt: string;
    producer: string;
    payload: Record<string, string | number | boolean>;
  };
}

export interface ProductAnalyticsDictionaryV1 {
  schemaVersion: 1;
  dictionaryVersion: string;
  events: ProductAnalyticsEventDefinitionV1[];
}
