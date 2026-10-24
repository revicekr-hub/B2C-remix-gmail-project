import {
  EnterpriseCampaignRecord,
  ReceivedInboxMessage,
  SavedRecipient,
} from '../types';
import {
  classifyReceivedMessage,
  reconcileCampaignsWithReceivedMessages,
  shouldIncludeInReceivedInbox,
} from '../utils/campaignAndInboxLogic';

const IDB_NAME = 'b2cmail_enterprise_idb_v2';
const IDB_VERSION = 1;
const STORE_CAMPAIGNS = 'campaigns';
const STORE_RECEIVED = 'received_emails';

const LS_CAMPAIGNS_FALLBACK = 'b2cmail_idb_campaigns_backup_v2';
const LS_RECEIVED_FALLBACK = 'b2cmail_idb_received_backup_v2';

function openEnterpriseIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CAMPAIGNS)) {
          db.createObjectStore(STORE_CAMPAIGNS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RECEIVED)) {
          db.createObjectStore(STORE_RECEIVED, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openEnterpriseIdb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function writeAllToStore<T extends { id: string }>(
  storeName: string,
  items: T[]
): Promise<void> {
  const db = await openEnterpriseIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Load Campaigns & Received Emails from IndexedDB (starts empty without pre-existing demo emails)
 */
export async function loadEnterpriseWorkspaceData(): Promise<{
  campaigns: EnterpriseCampaignRecord[];
  receivedMessages: ReceivedInboxMessage[];
  storageEngine: 'IndexedDB' | 'LocalStorage';
}> {
  const db = await openEnterpriseIdb();

  let campaigns = await readAllFromStore<EnterpriseCampaignRecord>(STORE_CAMPAIGNS);
  let receivedMessages = await readAllFromStore<ReceivedInboxMessage>(STORE_RECEIVED);

  if (campaigns.length === 0) {
    try {
      const raw = localStorage.getItem(LS_CAMPAIGNS_FALLBACK);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) campaigns = parsed;
      }
    } catch {
      // ignore
    }
  }

  if (receivedMessages.length === 0) {
    try {
      const raw = localStorage.getItem(LS_RECEIVED_FALLBACK);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) receivedMessages = parsed;
      }
    } catch {
      // ignore
    }
  }

  const reconciledCampaigns = reconcileCampaignsWithReceivedMessages(
    campaigns,
    receivedMessages
  );

  return {
    campaigns: reconciledCampaigns,
    receivedMessages,
    storageEngine: db ? 'IndexedDB' : 'LocalStorage',
  };
}

export async function saveCampaignsToIndexedDb(
  campaigns: EnterpriseCampaignRecord[]
): Promise<void> {
  try {
    localStorage.setItem(LS_CAMPAIGNS_FALLBACK, JSON.stringify(campaigns));
  } catch {
    // ignore
  }
  await writeAllToStore(STORE_CAMPAIGNS, campaigns);
}

export async function saveReceivedMessagesToIndexedDb(
  messages: ReceivedInboxMessage[]
): Promise<void> {
  try {
    localStorage.setItem(LS_RECEIVED_FALLBACK, JSON.stringify(messages));
  } catch {
    // ignore
  }
  await writeAllToStore(STORE_RECEIVED, messages);
}

/**
 * Sync from Gmail REST API (if user has granted read access or fallback to existing local IndexedDB + simulated sync)
 * Automatically filters by label:INBOX and excludes CATEGORY_PROMOTIONS, CATEGORY_SOCIAL, SPAM
 */
export async function syncReceivedInboxFromGmailApi(
  accessToken: string | null,
  currentMessages: ReceivedInboxMessage[],
  campaigns: EnterpriseCampaignRecord[],
  crmRecipients: SavedRecipient[]
): Promise<{
  messages: ReceivedInboxMessage[];
  syncedFromLiveApi: boolean;
  newCount: number;
}> {
  if (accessToken) {
    try {
      const query = encodeURIComponent(
        'label:INBOX -category:promotions -category:social -label:SPAM'
      );
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${query}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (listRes.ok) {
        const listData = await listRes.json();
        const messageRefs: { id: string; threadId: string }[] =
          listData.messages || [];
        const fetchedMsgs: ReceivedInboxMessage[] = [];

        for (const ref of messageRefs.slice(0, 6)) {
          if (currentMessages.some((m) => m.gmailMessageId === ref.id)) continue;
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (!detailRes.ok) continue;
          const detail = await detailRes.json();
          const labels: string[] = detail.labelIds || ['INBOX'];
          if (!shouldIncludeInReceivedInbox(labels)) continue;

          const headers: { name: string; value: string }[] =
            detail.payload?.headers || [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
              ?.value || '';

          const rawFrom = getHeader('From') || 'Khách hàng Đối tác <contact@partner.vn>';
          const emailMatch = rawFrom.match(/<([^>]+)>/);
          const fromEmail = emailMatch ? emailMatch[1] : rawFrom.trim();
          const fromName = rawFrom.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail;
          const subject = getHeader('Subject') || '(Không có tiêu đề)';
          const snippet = detail.snippet || '';

          const classification = classifyReceivedMessage(
            {
              fromEmail,
              subject,
              threadId: detail.threadId || ref.threadId,
              bodyText: snippet,
              snippet,
            },
            campaigns,
            crmRecipients
          );

          fetchedMsgs.push({
            id: `rx-gmail-${ref.id}`,
            gmailMessageId: ref.id,
            threadId: detail.threadId || ref.threadId,
            fromName,
            fromEmail,
            company: classification.company,
            toEmail: getHeader('To') || 'me',
            subject,
            snippet,
            bodyHtml: `<div style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; line-height: 1.6; color: #1e293b;"><p>${snippet}</p></div>`,
            bodyText: snippet,
            receivedAtIso: detail.internalDate
              ? new Date(Number(detail.internalDate)).toISOString()
              : new Date().toISOString(),
            isUnread: labels.includes('UNREAD'),
            isStarred: labels.includes('STARRED'),
            gmailLabels: labels,
            matchedCampaignId: classification.matchedCampaignId,
            matchedCampaignName: classification.matchedCampaignName,
            autoTags:
              classification.autoTags.length > 0
                ? classification.autoTags
                : [{ type: 'client', label: '[Khách hàng]' }],
            attachments: [],
            threadHistory: [
              {
                id: `th-${ref.id}`,
                senderName: fromName,
                senderEmail: fromEmail,
                recipientEmail: 'me',
                direction: 'inbound_reply',
                sentAtIso: new Date().toISOString(),
                subject,
                bodyHtml: `<p>${snippet}</p>`,
                bodyText: snippet,
              },
            ],
          });
        }

        if (fetchedMsgs.length > 0) {
          const merged = [...fetchedMsgs, ...currentMessages];
          await saveReceivedMessagesToIndexedDb(merged);
          return {
            messages: merged,
            syncedFromLiveApi: true,
            newCount: fetchedMsgs.length,
          };
        }
      }
    } catch {
      // Fallback to local classification refresh
    }
  }

  // Re-run classification on all stored messages against latest campaigns & CRM recipients
  const refreshed = currentMessages.map((msg) => {
    const classification = classifyReceivedMessage(msg, campaigns, crmRecipients);
    return {
      ...msg,
      company: msg.company || classification.company,
      matchedCampaignId: classification.matchedCampaignId || msg.matchedCampaignId,
      matchedCampaignName:
        classification.matchedCampaignName || msg.matchedCampaignName,
      autoTags:
        classification.autoTags.length > 0 ? classification.autoTags : msg.autoTags,
    };
  });

  await saveReceivedMessagesToIndexedDb(refreshed);
  return {
    messages: refreshed,
    syncedFromLiveApi: false,
    newCount: 0,
  };
}
