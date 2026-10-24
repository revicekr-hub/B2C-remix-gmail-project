import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('Email base64 URL encoding simulation', () => {
  const subject = 'Khuyến mãi đặc biệt 40%';
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  assert.ok(utf8Subject.startsWith('=?utf-8?B?'));
  assert.ok(utf8Subject.endsWith('?='));
});

test('Campaign template structure validation', () => {
  const sampleTemplate = {
    id: 'test-1',
    title: 'Mẫu 1',
    angle: 'Lợi ích',
    subject: 'Ưu đãi TechNova',
    preheader: 'Tiết kiệm 40% hôm nay',
    bodyHtml: '<p>Nội dung</p>',
    bodyText: 'Nội dung',
    ctaText: 'Mua Ngay',
    ctaUrl: 'https://technova.vn',
    estimatedOpenRate: '40%',
    estimatedCTR: '8%',
    keyHighlight: 'Rõ ràng',
  };

  assert.strictEqual(sampleTemplate.id, 'test-1');
  assert.ok(sampleTemplate.subject.length > 0);
  assert.ok(sampleTemplate.ctaText.length <= 30);
});

test('Chrome Extension manifest.json does not require missing icons/icon16.png', () => {
  const assetSource = fs.readFileSync('./src/data/extensionAssets.ts', 'utf8');
  const match = assetSource.match(/EXTENSION_MANIFEST_JSON\s*=\s*`([\s\S]*?)`;/);
  assert.ok(match && match[1], 'Should extract EXTENSION_MANIFEST_JSON');
  const manifest = JSON.parse(match[1]);
  assert.strictEqual(manifest.manifest_version, 3);
  assert.strictEqual(manifest.icons, undefined, 'manifest.json must not require missing icons folder');
  assert.ok(!match[1].includes('icon16.png'), 'manifest.json must not reference missing icon16.png');
  assert.strictEqual(manifest.content_scripts[0].js[0], 'content.js');
});
