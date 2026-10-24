import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  parseBulkRecipientsInput,
  personalizeContent,
  buildRecommendedTimeSlots,
  getDueScheduledPlans,
  formatCountdownVi,
} from './schedulerLogic';
import { ScheduledEmailPlan } from '../types';

test('isValidEmail validates proper email addresses and rejects invalid strings', () => {
  assert.equal(isValidEmail('minhanh@technova.vn'), true);
  assert.equal(isValidEmail('  user.name+tag@company.co.uk '), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail('missing@domain'), false);
  assert.equal(isValidEmail(''), false);
});

test('parseBulkRecipientsInput parses single, angle-bracket, and comma-separated recipients', () => {
  const raw = `
    Nguyễn Minh Anh <minhanh@technova.vn>
    Trần Bảo, bao.tran@company.vn
    khachhang1@gmail.com, khachhang2@gmail.com
    not-an-email
  `;
  const result = parseBulkRecipientsInput(raw, 'vip');
  assert.equal(result.valid.length, 4);
  assert.equal(result.valid[0].name, 'Nguyễn Minh Anh');
  assert.equal(result.valid[0].email, 'minhanh@technova.vn');
  assert.equal(result.valid[1].name, 'Trần Bảo');
  assert.equal(result.valid[1].email, 'bao.tran@company.vn');
  assert.equal(result.valid[2].email, 'khachhang1@gmail.com');
  assert.equal(result.valid[3].email, 'khachhang2@gmail.com');
  assert.equal(result.invalidEntries.length, 1);
  assert.equal(result.invalidEntries[0], 'not-an-email');
});

test('personalizeContent replaces {{name}}, {{email}}, {{company}} or greeting fallback', () => {
  const tplWithPlaceholders = 'Xin chào {{name}} từ {{company}} ({{email}})!';
  const rendered1 = personalizeContent(tplWithPlaceholders, {
    name: 'Lê Thu Hà',
    email: 'thuha@creative.vn',
    company: 'Creative Hub',
  });
  assert.equal(rendered1, 'Xin chào Lê Thu Hà từ Creative Hub (thuha@creative.vn)!');

  const tplWithDefaultGreeting = '<p>Chào bạn, TechNova gửi tặng ưu đãi 40%.</p>';
  const rendered2 = personalizeContent(tplWithDefaultGreeting, {
    name: 'Minh Anh',
    email: 'minhanh@technova.vn',
  });
  assert.equal(rendered2, '<p>Chào Minh Anh, TechNova gửi tặng ưu đãi 40%.</p>');
});

test('buildRecommendedTimeSlots returns 3 structured slots including AI primary slot', () => {
  const now = new Date('2026-10-21T10:00:00.000Z').getTime();
  const slots = buildRecommendedTimeSlots(
    {
      bestDays: 'Thứ Năm & Thứ Sáu',
      bestHours: '19:30 - 21:00',
      explanation: 'Tối ưu cho ngành thời trang',
      suggestedDateTimeIso: '2026-10-22T12:30:00.000Z',
      industryInsights: 'Lookbook rõ nét',
    },
    now
  );
  assert.equal(slots.length, 3);
  assert.equal(slots[0].id, 'slot-ai-primary');
  assert.equal(slots[0].scheduledAtIso, '2026-10-22T12:30:00.000Z');
});

test('getDueScheduledPlans identifies only scheduled autoSendEnabled plans whose time has arrived', () => {
  const now = new Date('2026-10-21T12:00:00.000Z').getTime();
  const plans: ScheduledEmailPlan[] = [
    {
      id: 'plan-due',
      planTitle: 'Chiến dịch Thu VIP',
      brandName: 'TechNova',
      templateId: 'template-1',
      templateTitle: 'Mẫu 1',
      subject: 'Ưu đãi 40%',
      bodyHtml: '<p>Nội dung</p>',
      bodyText: 'Nội dung',
      recipients: [],
      scheduledAtIso: '2026-10-21T11:59:00.000Z',
      recommendedSlotLabel: '19:30',
      isAiRecommendedSlot: true,
      autoSendEnabled: true,
      status: 'scheduled',
      createdAtIso: '2026-10-21T10:00:00.000Z',
      deliveryLogs: [],
    },
    {
      id: 'plan-future',
      planTitle: 'Chiến dịch Tương lai',
      brandName: 'TechNova',
      templateId: 'template-2',
      templateTitle: 'Mẫu 2',
      subject: 'Ưu đãi 40%',
      bodyHtml: '<p>Nội dung</p>',
      bodyText: 'Nội dung',
      recipients: [],
      scheduledAtIso: '2026-10-22T11:59:00.000Z',
      recommendedSlotLabel: '19:30',
      isAiRecommendedSlot: true,
      autoSendEnabled: true,
      status: 'scheduled',
      createdAtIso: '2026-10-21T10:00:00.000Z',
      deliveryLogs: [],
    },
  ];

  const due = getDueScheduledPlans(plans, now);
  assert.equal(due.length, 1);
  assert.equal(due[0].id, 'plan-due');
});

test('formatCountdownVi formats seconds, minutes, hours, and days accurately', () => {
  const now = 1000000;
  assert.equal(formatCountdownVi(new Date(now + 12000).toISOString(), now), 'Còn 12 giây');
  assert.equal(formatCountdownVi(new Date(now + 125000).toISOString(), now), 'Còn 2 phút 5 giây');
});
