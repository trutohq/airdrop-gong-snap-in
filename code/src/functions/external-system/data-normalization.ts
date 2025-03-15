import { NormalizedAttachment, NormalizedItem } from '@devrev/ts-adaas';

export function normalizeIssue(item: any): NormalizedItem {
  return {
    id: item.id,
    created_date: item.created_date,
    modified_date: item.modified_date,
    data: {
      body: item.body,
      creator: item.creator,
      owner: item.owner,
      title: item.title,
    },
  };
}

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
      email,
      name: item.name || '',
    },
  };
}

export function normalizeAttachment(item: any): NormalizedAttachment {
  return {
    url: item.url,
    id: item.id,
    file_name: item.file_name,
    author_id: item.author_id,
    parent_id: item.parent_id,
  };
}
