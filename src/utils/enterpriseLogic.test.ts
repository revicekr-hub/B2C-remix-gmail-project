import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BRAND_KITS,
  applyBrandKitToTemplates,
  evaluateDeliverabilityAudit,
  extractMergeTags,
  getNextApprovalStatus,
  injectTrackingAndUnsubscribe,
} from './enterpriseLogic';
import { personalizeContent } from './schedulerLogic';
import { BrandKit, EmailTemplate } from '../types';

const sampleTemplates: EmailTemplate[] = [
  {
    id: 'template-1',
    title: 'Mẫu 1: Trực diện',
    angle: 'Giá trị cốt lõi',
    subject: '🍂 [TechNova Lifestyle] Ưu đãi dành cho {{Ten_Khach_Hang}} tại {{Ten_Cong_Ty}}',
    preheader: 'Nhận ngay mã {{Ma_Uu_Dai}} độc quyền.',
    bodyHtml: `<div style="border-bottom: 2px solid #2563eb;"><p>Chào {{Ten_Khach_Hang}} ({{Ten_Cong_Ty}}), mã ưu đãi: {{Ma_Uu_Dai}}</p><a href="https://technova.vn/offer" style="background: #2563eb; color: #ffffff;">Nhận Ưu Đãi</a><p><a href="#">Hủy nhận thư</a></p></div>`,
    bodyText: 'Chào {{Ten_Khach_Hang}} ({{Ten_Cong_Ty}}), mã: {{Ma_Uu_Dai}}',
    ctaText: 'Nhận Ưu Đãi',
    ctaUrl: 'https://technova.vn/offer',
    estimatedOpenRate: '42%',
    estimatedCTR: '9.1%',
    keyHighlight: 'Trực diện',
  },
];

test('applyBrandKitToTemplates updates brand color, signature, brandName, and CTA URL', () => {
  assert.equal(DEFAULT_BRAND_KITS.length, 0);
  const lumiereKit: BrandKit = {
    id: 'brand-lumiere',
    brandName: 'Lumière Luxury Spa',
    industry: 'Mỹ phẩm & Chăm sóc sắc đẹp',
    defaultTone: 'formal',
    primaryColor: '#059669',
    websiteUrl: 'https://lumierespa.vn',
    discountCode: 'LUMIERE50',
    signatureHtml:
      'Lumière Luxury Spa & Clinic • 88 Đồng Khởi, Q.1, TP.HCM • Booking: 028 3822 9999',
  };
  const updated = applyBrandKitToTemplates(
    sampleTemplates,
    lumiereKit,
    'TechNova Lifestyle'
  );

  assert.equal(updated.length, 1);
  assert.ok(updated[0].subject.includes('Lumière Luxury Spa'));
  assert.ok(updated[0].bodyHtml.includes('#059669'));
  assert.ok(updated[0].bodyHtml.includes('Lumière Luxury Spa & Clinic'));
  assert.equal(updated[0].ctaUrl, 'https://lumierespa.vn/offer');
});

test('extractMergeTags and personalizeContent handle {{Ten_Khach_Hang}}, {{Ten_Cong_Ty}}, and {{Ma_Uu_Dai}}', () => {
  const tags = extractMergeTags(sampleTemplates[0].bodyHtml);
  assert.deepEqual(tags, ['{{Ten_Khach_Hang}}', '{{Ten_Cong_Ty}}', '{{Ma_Uu_Dai}}']);

  const personalized = personalizeContent(
    sampleTemplates[0].bodyHtml,
    {
      name: 'Trần Hoàng Nam',
      email: 'hoangnam@luxfashion.vn',
      company: 'LuxFashion Retail',
      voucherCode: 'VIP-LUX99',
    },
    'AUTUMN40'
  );

  assert.ok(personalized.includes('Trần Hoàng Nam'));
  assert.ok(personalized.includes('LuxFashion Retail'));
  assert.ok(personalized.includes('VIP-LUX99'));
  assert.ok(!personalized.includes('{{Ten_Khach_Hang}}'));
});

test('evaluateDeliverabilityAudit calculates spamScore, spamWarnings, and mergeTagsUsed', () => {
  const cleanAudit = evaluateDeliverabilityAudit(sampleTemplates);
  assert.ok(cleanAudit.spamScore >= 5 && cleanAudit.spamScore <= 40);
  assert.ok(cleanAudit.mergeTagsUsed.includes('{{Ten_Khach_Hang}}'));

  const spammyAudit = evaluateDeliverabilityAudit(
    sampleTemplates,
    'MIỄN PHÍ 100% KHẨN CẤP TRÚNG THƯỞNG NGAY!!!',
    '<div>KIẾM TIỀN NHANH MIỄN PHÍ 100%!!!</div>'
  );
  assert.ok(spammyAudit.spamScore > cleanAudit.spamScore);
  assert.ok(spammyAudit.spamWarnings.length >= 2);
});

test('getNextApprovalStatus transitions through draft -> pending_approval -> approved -> scheduled', () => {
  const s1 = getNextApprovalStatus('draft', 'submit_review');
  assert.equal(s1, 'pending_approval');
  const s2 = getNextApprovalStatus(s1, 'approve');
  assert.equal(s2, 'approved');
  const s3 = getNextApprovalStatus(s2, 'schedule');
  assert.equal(s3, 'scheduled');
  const rejected = getNextApprovalStatus('pending_approval', 'reject');
  assert.equal(rejected, 'draft');
});

test('injectTrackingAndUnsubscribe embeds 1x1 open pixel, click tracking redirect, and unsubscribe URL', () => {
  const res = injectTrackingAndUnsubscribe(
    sampleTemplates[0].bodyHtml,
    'https://b2cmail.example.com',
    'camp-101',
    'rec-1',
    'minhanh@technova.vn',
    'https://technova.vn/offer'
  );

  assert.ok(
    res.trackingPixelUrl.includes(
      'https://b2cmail.example.com/api/track/open?cid=camp-101&rid=rec-1'
    )
  );
  assert.ok(
    res.unsubscribeUrl.includes(
      'https://b2cmail.example.com/api/unsubscribe?cid=camp-101&email=minhanh%40technova.vn'
    )
  );
  assert.ok(res.trackedHtml.includes(res.trackingPixelUrl));
  assert.ok(res.trackedHtml.includes(res.clickTrackUrl));
  assert.ok(res.trackedHtml.includes(res.unsubscribeUrl));
});
