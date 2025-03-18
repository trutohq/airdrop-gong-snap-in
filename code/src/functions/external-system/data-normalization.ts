import { NormalizedItem } from '@devrev/ts-adaas';

export function normalizeUser(item: any): NormalizedItem {
  // Safely get the primary email or first email
  const primaryEmail = item.emails?.find((email: any) => email.is_primary)?.email;
  const firstEmail = item.emails?.[0]?.email;
  const email = primaryEmail || firstEmail || '';
  return {
    id: item.id,
    created_date: item.created_at,
    modified_date: item.modified_date,
    data: {
      email: email,
      name: item.name || '',
    },
  };
}
