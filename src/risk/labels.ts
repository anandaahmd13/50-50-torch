import type { DecodedLaunch, LaunchEnrichment } from '../chain/types.js';

export interface RiskLabel {
  code: string;
  detail: string;
}

const unsafeText = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

/** Conservative observations retained for callers outside the alert path. */
export function labelRisks(_launch: DecodedLaunch, enrichment: LaunchEnrichment): readonly RiskLabel[] {
  const labels: RiskLabel[] = [];
  const { token, quote } = enrichment;
  if (token.unavailable.length || quote.unavailable.length) {
    labels.push({ code: 'DATA_UNAVAILABLE', detail: [...token.unavailable, ...quote.unavailable].join(', ') });
  }
  labels.push({ code: 'SOURCE_UNVERIFIED', detail: 'Token source verification was not established by this watcher.' });
  if ([token.name, token.symbol].some((value) => value && unsafeText.test(value))) {
    labels.push({ code: 'UNSAFE_METADATA_TEXT', detail: 'Name or symbol contains a control or bidirectional character.' });
  }
  return labels;
}
