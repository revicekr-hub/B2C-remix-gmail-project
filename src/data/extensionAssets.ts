export const EXTENSION_MANIFEST_JSON = `{
  "manifest_version": 3,
  "name": "Gmail AI Campaign Assistant",
  "version": "1.2.0",
  "description": "Tự động tạo và điền 3 mẫu email chiến dịch kèm nút CTA & giờ gửi vàng trực tiếp vào khung soạn thư Gmail.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://mail.google.com/*"],
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}`;

export const EXTENSION_CONTENT_JS = `/**
 * Gmail AI Campaign Assistant - Content Script (v1.2.0)
 * Tự động tích hợp Sidebar Trợ Lý AI & điền ô input[name="subjectbox"] + div[role="textbox"] trong Gmail thật
 */

console.log('[Gmail AI Assistant] Tiện ích mở rộng v1.2.0 đã kích hoạt trên Gmail!');

// 1. Hàm tự động tìm ô Subject và Body của Gmail để điền nội dung
function injectCampaignIntoGmail(subjectText, htmlContent) {
  const subjectInput = document.querySelector('input[name="subjectbox"]');
  if (subjectInput) {
    subjectInput.focus();
    subjectInput.value = subjectText;
    subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
    subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    showGmailToast('⚠️ Hãy bấm nút "Soạn thư (Compose)" của Gmail trước khi chèn!');
    return false;
  }

  const editor = document.querySelector(
    'div[role="textbox"][aria-label*="Nội dung"], div[role="textbox"][aria-label*="Message Body"], div[role="textbox"][g_editable="true"], div.Am.Al.editable'
  );
  if (editor) {
    editor.focus();
    editor.innerHTML = htmlContent;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    showGmailToast('✨ Đã tự động điền Tiêu đề & Nội dung HTML vào thư Gmail!');
    return true;
  } else {
    showGmailToast('⚠️ Không tìm thấy vùng nhập nội dung thư. Hãy mở cửa sổ Soạn thư!');
    return false;
  }
}

// 2. Tạo mẫu email theo thông tin nhập trực tiếp trên Gmail
function buildTemplates(brand, industry, offer, tone) {
  const cleanBrand = brand || 'TechNova';
  const cleanOffer = offer || 'Giảm 40% toàn bộ sản phẩm + Quà tặng trị giá 350K';
  const cleanInd = industry || 'Thời trang & Bán lẻ';

  const tonePrefix =
    tone === 'urgent' ? '⏳ [CHỈ 24H] ' : tone === 'witty' ? '😎 Bí mật nhỏ từ ' : '🍂 ';

  return [
    {
      title: 'Mẫu 1: Trực diện & Giá trị',
      subject: \`\${tonePrefix}[\${cleanBrand}] Ưu đãi đặc quyền: \${cleanOffer.slice(0, 48)}\`,
      html: \`<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px;">
          <strong style="color: #1e3a8a; font-size: 16px; text-transform: uppercase;">\${cleanBrand}</strong>
        </div>
        <p>Chào bạn,</p>
        <p>Chúng tôi gửi tặng bạn chương trình ưu đãi đặc biệt nhất dành cho khách hàng ngành <strong>\${cleanInd}</strong>:</p>
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; margin: 14px 0; border-radius: 4px;">
          <strong>🎁 Chi tiết ưu đãi:</strong><br/>\${cleanOffer}
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://example.com" style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Nhận Ưu Đãi Ngay →</a>
        </div>
        <p style="font-size: 12px; color: #6b7280;">Trân trọng,<br/>Đội ngũ \${cleanBrand}</p>
      </div>\`
    },
    {
      title: 'Mẫu 2: Kể chuyện & Cảm xúc',
      subject: \`✨ Món quà đặc biệt \${cleanBrand} dành riêng cho bạn hôm nay\`,
      html: \`<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff;">
        <h3 style="color: #059669; margin-top: 0;">Gửi người bạn đồng hành của \${cleanBrand},</h3>
        <p>Mỗi hành trình đều đáng nhớ hơn khi có sự tin tưởng của bạn. Để tri ân, chúng tôi dành tặng bạn:</p>
        <blockquote style="background: #f0fdf4; border-left: 4px solid #059669; padding: 12px; margin: 14px 0; color: #166534; font-weight: bold;">
          "\${cleanOffer}"
        </blockquote>
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://example.com" style="background: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 99px; display: inline-block;">Khám Phá Quà Tặng →</a>
        </div>
      </div>\`
    },
    {
      title: 'Mẫu 3: Khẩn cấp FOMO 24H',
      subject: \`🔥 [Cơ hội cuối] Sắp hết suất ưu đãi từ \${cleanBrand}!\`,
      html: \`<div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 560px; padding: 16px; border: 1px solid #fecaca; border-radius: 10px; background: #ffffff;">
        <div style="background: #fef2f2; color: #991b1b; padding: 10px; border-radius: 6px; text-align: center; font-weight: bold; margin-bottom: 12px;">
          ⚡ THÔNG BÁO KHẨN: CHỈ CÒN 24 GIỜ CUỐI CÙNG
        </div>
        <p>Chào bạn, ưu đãi <strong>\${cleanOffer}</strong> tại \${cleanBrand} đang được đăng ký rất nhanh và sắp chạm mốc giới hạn.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="https://example.com" style="background: #dc2626; color: #ffffff; padding: 13px 30px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Giữ Suất Ưu Đãi Của Tôi →</a>
        </div>
      </div>\`
    }
  ];
}

// 3. Tạo bảng điều khiển nổi ngay trong Gmail thật
function toggleAiDrawer() {
  let drawer = document.getElementById('gmail-ai-campaign-drawer');
  if (drawer) {
    drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
    return;
  }

  drawer = document.createElement('div');
  drawer.id = 'gmail-ai-campaign-drawer';
  drawer.style.cssText = \`
    position: fixed;
    top: 64px;
    right: 16px;
    width: 360px;
    max-height: calc(100vh - 88px);
    background: #ffffff;
    border: 1px solid #dadce0;
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
    z-index: 999998;
    display: flex;
    flex-direction: column;
    font-family: Roboto, Arial, sans-serif;
    overflow: hidden;
  \`;

  drawer.innerHTML = \`
    <div style="background: linear-gradient(135deg, #1a73e8, #4f46e5); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: bold; font-size: 14px;">✨ Gmail AI Campaign Assistant</div>
        <div style="font-size: 11px; opacity: 0.9;">Tự động điền thư chiến dịch vào Gmail</div>
      </div>
      <button id="ai-drawer-close" style="background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer;">✕</button>
    </div>
    <div style="padding: 14px; overflow-y: auto; font-size: 12px; color: #374151; display: flex; flex-direction: column; gap: 10px;">
      <div>
        <label style="font-weight: bold; display: block; margin-bottom: 4px;">Tên thương hiệu:</label>
        <input id="ai-brand" value="TechNova Lifestyle" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;" />
      </div>
      <div>
        <label style="font-weight: bold; display: block; margin-bottom: 4px;">Ngành hàng:</label>
        <input id="ai-industry" value="Thời trang & Phụ kiện" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;" />
      </div>
      <div>
        <label style="font-weight: bold; display: block; margin-bottom: 4px;">Nội dung ưu đãi:</label>
        <textarea id="ai-offer" rows="2" style="width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;">Giảm 40% BST Mùa Thu + Tặng quà 350K cho đơn từ 990K (Mã: AUTUMN40)</textarea>
      </div>
      <div>
        <label style="font-weight: bold; display: block; margin-bottom: 4px;">Tông giọng:</label>
        <select id="ai-tone" style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;">
          <option value="professional">💼 Chuẩn mực & Chuyên nghiệp</option>
          <option value="formal">🎩 Trang trọng & Lịch thiệp</option>
          <option value="witty">😄 Hài hước & Thân mật</option>
          <option value="urgent">🔥 Khẩn cấp (FOMO 24H)</option>
        </select>
      </div>
      <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 8px 10px; border-radius: 8px; color: #312e81; font-size: 11px;">
        <strong>⏰ Giờ gửi tốt nhất:</strong> Thứ Năm & Thứ Sáu (19:30 - 21:00) — Tỷ lệ mở cao hơn 32%.
      </div>
      <div id="ai-templates-container" style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;"></div>
    </div>
  \`;

  document.body.appendChild(drawer);

  document.getElementById('ai-drawer-close').onclick = () => {
    drawer.style.display = 'none';
  };

  function renderButtons() {
    const brand = document.getElementById('ai-brand').value;
    const industry = document.getElementById('ai-industry').value;
    const offer = document.getElementById('ai-offer').value;
    const tone = document.getElementById('ai-tone').value;
    const list = buildTemplates(brand, industry, offer, tone);
    const container = document.getElementById('ai-templates-container');
    container.innerHTML = '';

    list.forEach((tpl) => {
      const card = document.createElement('div');
      card.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #f9fafb;';
      card.innerHTML = \`
        <div style="font-weight: bold; color: #111827; margin-bottom: 4px;">\${tpl.title}</div>
        <div style="font-size: 11px; color: #4b5563; margin-bottom: 8px;">\${tpl.subject}</div>
        <button style="width: 100%; background: #1a73e8; color: #fff; border: none; padding: 7px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px;">
          📥 Chèn mẫu này vào thư Gmail
        </button>
      \`;
      card.querySelector('button').onclick = () => {
        injectCampaignIntoGmail(tpl.subject, tpl.html);
      };
      container.appendChild(card);
    });
  }

  ['ai-brand', 'ai-industry', 'ai-offer', 'ai-tone'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderButtons);
    document.getElementById(id).addEventListener('change', renderButtons);
  });

  renderButtons();
}

// 4. Gắn nút "✨ AI Campaign" vào thanh công cụ Soạn thư của Gmail
function attachAiAssistantButton() {
  const toolbars = document.querySelectorAll('tr.btC, td.gU.Up');
  toolbars.forEach(bar => {
    if (bar.querySelector('.gmail-ai-campaign-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gmail-ai-campaign-btn';
    btn.innerHTML = '✨ AI Campaign';
    btn.title = 'Mở trợ lý viết email chiến dịch AI';
    btn.style.cssText = \`
      background: linear-gradient(135deg, #1a73e8, #7c3aed);
      color: white;
      border: none;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 18px;
      cursor: pointer;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 2px 5px rgba(26,115,232,0.3);
    \`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAiDrawer();
    });

    bar.appendChild(btn);
  });
}

function showGmailToast(message) {
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.cssText = \`
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: #202124;
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: Roboto, Arial, sans-serif;
  \`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

const observer = new MutationObserver(() => {
  attachAiAssistantButton();
});
observer.observe(document.body, { childList: true, subtree: true });
attachAiAssistantButton();
`;

export const APPS_SCRIPT_CODE_GS = `/**
 * Google Workspace Add-on for Gmail
 * File: Code.gs
 * Chạy trực tiếp trong Google Workspace / Gmail Side Panel
 */

function onGmailCompose(e) {
  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Gmail AI Campaign Assistant')
    .setSubtitle('Trợ lý soạn email chiến dịch chuẩn chuyển đổi')
    .setImageUrl('https://ssl.gstatic.com/images/branding/product/2x/gmail_48dp.png'));

  var section = CardService.newCardSection()
    .setHeader('Tạo chiến dịch mới');

  var goalInput = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('Mục tiêu chiến dịch')
    .setFieldName('campaignGoal')
    .addItem('Ra mắt sản phẩm', 'launch', true)
    .addItem('Khuyến mãi / Giảm giá', 'promo', false)
    .addItem('Chăm sóc khách hàng', 'care', false);

  var brandInput = CardService.newTextInput()
    .setFieldName('brandName')
    .setTitle('Tên thương hiệu')
    .setHint('Ví dụ: TechNova, Lumière Spa');

  var industryInput = CardService.newTextInput()
    .setFieldName('industry')
    .setTitle('Ngành hàng')
    .setHint('Thời trang, F&B, B2B SaaS, Giáo dục...');

  var offerInput = CardService.newTextInput()
    .setFieldName('offerDetails')
    .setTitle('Nội dung ưu đãi')
    .setMultiline(true)
    .setHint('Giảm 30% cho 100 khách đầu tiên, tặng voucher...');

  var generateAction = CardService.newAction()
    .setFunctionName('handleGenerateCampaign');
  var generateButton = CardService.newTextButton()
    .setText('⚡ Sinh 03 Mẫu Email & Lịch Gửi')
    .setOnClickAction(generateAction)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED);

  section.addWidget(goalInput);
  section.addWidget(brandInput);
  section.addWidget(industryInput);
  section.addWidget(offerInput);
  section.addWidget(generateButton);

  card.addSection(section);
  return [card.build()];
}

function handleGenerateCampaign(e) {
  var formValues = e.formInput;
  var brand = formValues.brandName || 'Thương hiệu của bạn';
  var offer = formValues.offerDetails || 'Ưu đãi hấp dẫn';
  
  var response = CardService.newUpdateDraftActionResponseBuilder()
    .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
      .addUpdateContent(
        '<div style="font-family: Arial; padding: 15px;">' +
        '<h2>Đặc quyền dành riêng từ ' + brand + '</h2>' +
        '<p>' + offer + '</p>' +
        '<p style="text-align:center;"><a href="#" style="background:#1a73e8;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:bold;">Nhận Ưu Đãi Ngay</a></p>' +
        '</div>',
        CardService.ContentType.MUTABLE_HTML
      )
      .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT)
    )
    .build();

  return response;
}
`;
