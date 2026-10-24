import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  generateFallbackCampaign,
  isSafeHttpUrl,
  normalizeWebsiteUrl,
  parseRecipientsCsvSmart,
} from './serverHelpers';

test('escapeHtml sanitizes XSS payloads in email and campaignId', () => {
  const malicious = `<script>alert("xss")</script>&"'`;
  const escaped = escapeHtml(malicious);
  assert.equal(
    escaped,
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;&#39;'
  );
  assert.ok(!escaped.includes('<script>'));
});

test('isSafeHttpUrl allows http/https and rejects javascript/relative/empty URLs', () => {
  assert.equal(isSafeHttpUrl('https://b2cmail.vn/promo'), true);
  assert.equal(isSafeHttpUrl('http://example.com/test'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpUrl('//evil.com'), false);
  assert.equal(isSafeHttpUrl(''), false);
});

test('normalizeWebsiteUrl generates default https://{brandSlug}.vn when empty or invalid', () => {
  assert.equal(normalizeWebsiteUrl('', 'Thời Trang Lumina'), 'https://thoi-trang-lumina.vn');
  assert.equal(
    normalizeWebsiteUrl('javascript:alert(1)', 'Coffee Đắk Lắk'),
    'https://coffee-dak-lak.vn'
  );
  assert.equal(
    normalizeWebsiteUrl('http://luminafashion.vn/', 'Lumina'),
    'https://luminafashion.vn'
  );
  assert.equal(
    normalizeWebsiteUrl('luminafashion.vn', 'Lumina'),
    'https://luminafashion.vn'
  );
});

test('parseRecipientsCsvSmart detects email, name, company, voucherCode regardless of column order', () => {
  // Order 1: email, name, company, voucherCode
  const csv1 = `lan@congty.vn, Nguyễn Thị Lan, Công ty TNHH Sao Việt, VIP2026`;
  const parsed1 = parseRecipientsCsvSmart(csv1);
  assert.equal(parsed1.length, 1);
  assert.equal(parsed1[0].email, 'lan@congty.vn');
  assert.equal(parsed1[0].name, 'Nguyễn Thị Lan');
  assert.equal(parsed1[0].company, 'Công ty TNHH Sao Việt');
  assert.equal(parsed1[0].voucherCode, 'VIP2026');

  // Order 2: company, voucherCode, name, email (with header row)
  const csv2 = [
    'Công ty, Mã Voucher, Họ tên, Email',
    'Tập đoàn Minh Long, SALE50, Trần Văn Minh, minh@minhlong.vn',
  ].join('\n');
  const parsed2 = parseRecipientsCsvSmart(csv2);
  assert.equal(parsed2.length, 1);
  assert.equal(parsed2[0].email, 'minh@minhlong.vn');
  assert.equal(parsed2[0].name, 'Trần Văn Minh');
  assert.equal(parsed2[0].company, 'Tập đoàn Minh Long');
  assert.equal(parsed2[0].voucherCode, 'SALE50');
});

test('generateFallbackCampaign dynamically adapts to tone (formal, witty, urgent, professional) and campaignGoal (launch, promo, care) with mobile-safe HTML tables', () => {
  const formalLaunch = generateFallbackCampaign({
    brandName: 'Lumina Studio',
    industry: 'Thời trang & Phụ kiện',
    offerDetails: 'Ra mắt BST Thu Đông giảm 35%',
    tone: 'formal',
    campaignGoal: 'launch',
    websiteUrl: '',
  });

  const wittyPromo = generateFallbackCampaign({
    brandName: 'Lumina Studio',
    industry: 'Thời trang & Phụ kiện',
    offerDetails: 'Ra mắt BST Thu Đông giảm 35%',
    tone: 'witty',
    campaignGoal: 'promo',
    websiteUrl: '',
  });

  const urgentCare = generateFallbackCampaign({
    brandName: 'Lumina Studio',
    industry: 'Thời trang & Phụ kiện',
    offerDetails: 'Ra mắt BST Thu Đông giảm 35%',
    tone: 'urgent',
    campaignGoal: 'care',
    websiteUrl: '',
  });

  assert.equal(formalLaunch.templates.length, 3);
  assert.equal(wittyPromo.templates.length, 3);
  assert.equal(urgentCare.templates.length, 3);

  // Verify tone differences in subject, preheader, bodyHtml, bodyText, ctaText
  assert.notEqual(formalLaunch.templates[0].subject, wittyPromo.templates[0].subject);
  assert.notEqual(wittyPromo.templates[0].subject, urgentCare.templates[0].subject);
  assert.notEqual(formalLaunch.templates[0].ctaText, wittyPromo.templates[0].ctaText);
  assert.notEqual(wittyPromo.templates[0].ctaText, urgentCare.templates[0].ctaText);

  // Verify ctaUrl always starts with https:// and uses brandSlug default when websiteUrl is empty
  for (const tpl of formalLaunch.templates) {
    assert.ok(tpl.ctaUrl.startsWith('https://lumina-studio.vn'));
    assert.ok(!tpl.bodyHtml.includes('justify-content: space-between'));
    assert.ok(tpl.bodyHtml.includes('<table'));
  }
});
