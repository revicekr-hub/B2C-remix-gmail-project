import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_ENTERPRISE_CAMPAIGNS,
  INITIAL_RECEIVED_INBOX_MESSAGES,
  classifyReceivedMessage,
  computeCampaignKpis,
  filterCampaigns,
  filterReceivedMessages,
  isMailerDaemonBounce,
  normalizeSubjectForMatching,
  reconcileCampaignsWithReceivedMessages,
  shouldIncludeInReceivedInbox,
} from './campaignAndInboxLogic';

test('shouldIncludeInReceivedInbox keeps INBOX and rejects Promotions, Social, and Spam', () => {
  assert.equal(shouldIncludeInReceivedInbox(['INBOX', 'IMPORTANT']), true);
  assert.equal(
    shouldIncludeInReceivedInbox(['INBOX', 'CATEGORY_PROMOTIONS']),
    false
  );
  assert.equal(
    shouldIncludeInReceivedInbox(['INBOX', 'CATEGORY_SOCIAL']),
    false
  );
  assert.equal(shouldIncludeInReceivedInbox(['INBOX', 'SPAM']), false);
  assert.equal(shouldIncludeInReceivedInbox(['SENT']), false);
});

test('classifyReceivedMessage auto-tags Partner, Client, Campaign Reply, and Mailer-Daemon Bounce', () => {
  const partnerReply = classifyReceivedMessage(
    {
      fromEmail: 'hoangnam.ceo@luxfashion.vn',
      subject:
        'Re: 🍂 [TechNova Lifestyle] Ưu đãi 40% BST Thu dành riêng cho Quý Đối tác & Khách hàng VIP',
      threadId: 'thread-autumn-hoangnam-002',
      bodyText: 'Đồng ý đặt hàng 120 sản phẩm.',
      snippet: 'Đồng ý đặt hàng 120 sản phẩm.',
    },
    INITIAL_ENTERPRISE_CAMPAIGNS
  );

  assert.equal(partnerReply.matchedCampaignId, 'camp-autumn-vip-01');
  assert.equal(
    partnerReply.autoTags.some((t) => t.type === 'partner' && t.label === '[Đối tác]'),
    true
  );
  assert.equal(
    partnerReply.autoTags.some((t) => t.type === 'campaign_reply'),
    true
  );

  const bounceMsg = classifyReceivedMessage(
    {
      fromEmail: 'mailer-daemon@googlemail.com',
      subject: 'Delivery Status Notification (Failure)',
      threadId: 'thread-autumn-bounce-006',
      bodyText: 'Failed to deliver to tuankiet.old@invalid-domain-corp.vn',
      snippet: 'Failed to deliver',
    },
    INITIAL_ENTERPRISE_CAMPAIGNS
  );

  assert.equal(isMailerDaemonBounce('mailer-daemon@googlemail.com', 'Failure'), true);
  assert.equal(
    bounceMsg.autoTags.some((t) => t.type === 'bounce_daemon'),
    true
  );
});

test('computeCampaignKpis calculates accurate sent, delivered, bounced, and replied metrics', () => {
  const reconciled = reconcileCampaignsWithReceivedMessages(
    INITIAL_ENTERPRISE_CAMPAIGNS,
    INITIAL_RECEIVED_INBOX_MESSAGES
  );
  const kpis = computeCampaignKpis(reconciled[0]);

  assert.equal(kpis.totalSent, 6);
  assert.equal(kpis.deliveredCount, 5);
  assert.equal(kpis.bouncedCount, 1);
  assert.equal(kpis.repliedCount, 3);
  assert.equal(kpis.replyRatePercent, 50);
});

test('filterCampaigns and filterReceivedMessages support quick filters and campaign matching', () => {
  const completedOnly = filterCampaigns(
    INITIAL_ENTERPRISE_CAMPAIGNS,
    'TechNova',
    'completed',
    '30d'
  );
  assert.equal(completedOnly.length, 1);
  assert.equal(completedOnly[0].id, 'camp-autumn-vip-01');

  const unreadPartnerMsgs = filterReceivedMessages(
    INITIAL_RECEIVED_INBOX_MESSAGES,
    'from_partner',
    'all',
    ''
  );
  assert.equal(unreadPartnerMsgs.length >= 2, true);

  const withAttachments = filterReceivedMessages(
    INITIAL_RECEIVED_INBOX_MESSAGES,
    'has_attachment',
    'camp-autumn-vip-01',
    ''
  );
  assert.equal(withAttachments.length, 2);

  assert.equal(
    normalizeSubjectForMatching('Re: Fwd: [TechNova] Ưu đãi {{Ten_Khach_Hang}}'),
    'technova ưu đãi'
  );
});
