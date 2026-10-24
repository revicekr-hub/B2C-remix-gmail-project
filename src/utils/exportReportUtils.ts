import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  CampaignAttachmentItem,
  EnterpriseCampaignRecord,
  ExportFormatType,
} from '../types';
import { computeCampaignKpis } from './campaignAndInboxLogic';

/**
 * Helper to trigger browser file download from Blob
 */
function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Remove Vietnamese diacritics for safe ASCII PDF rendering where custom font isn't embedded
 */
function toAsciiSafe(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');
}

/**
 * Download a locally stored Campaign / Received Email attachment
 */
export function downloadLocalAttachment(att: CampaignAttachmentItem): void {
  const blob = new Blob([att.contentPreview], {
    type: att.mimeType || 'text/plain;charset=utf-8',
  });
  triggerBlobDownload(blob, att.fileName);
}

/**
 * Export a single Campaign's full report & recipient list (CSV, XLSX, PDF with charts, JSON)
 */
export async function exportSingleCampaignReport(
  campaign: EnterpriseCampaignRecord,
  format: ExportFormatType
): Promise<string> {
  // Brief delay so UI Skeleton state renders smoothly for large files
  await new Promise((r) => setTimeout(r, 450));

  const kpis = computeCampaignKpis(campaign);
  const safeSlug = toAsciiSafe(campaign.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36) || campaign.id;

  const recipientRows = campaign.recipients.map((r, idx) => ({
    STT: idx + 1,
    Ten_Khach_Hang: r.name,
    Email: r.email,
    Cong_Ty_Doi_Tac: r.company,
    Phan_Loai: r.roleType === 'partner' ? 'Doi tac' : 'Khach hang',
    Trang_Thai_Gui:
      r.deliveryStatus === 'delivered'
        ? 'Gui thanh cong'
        : r.deliveryStatus === 'bounced'
        ? 'Bi tra lai (Bounced)'
        : 'Dang cho',
    Da_Phan_Hoi: r.hasReplied ? 'Da phan hoi' : 'Chua phan hoi',
    Thoi_Gian_Phan_Hoi: r.repliedAtIso
      ? new Date(r.repliedAtIso).toLocaleString('vi-VN')
      : '-',
    Thread_ID: r.threadId,
    Ghi_Chu_Phan_Hoi: r.replySnippet || r.bounceReason || '-',
  }));

  if (format === 'json') {
    const payload = {
      exportedAt: new Date().toISOString(),
      campaign: {
        id: campaign.id,
        name: campaign.name,
        brandName: campaign.brandName,
        launchedAtIso: campaign.launchedAtIso,
        status: campaign.status,
        subject: campaign.subject,
      },
      kpis,
      timelineSeries: campaign.timelineSeries,
      recipients: campaign.recipients,
    };
    const fileName = `bao-cao-${safeSlug}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload(blob, fileName);
    return fileName;
  }

  if (format === 'csv') {
    const headers = [
      'STT',
      'Tên Khách Hàng',
      'Email',
      'Công Ty / Đối Tác',
      'Phân Loại',
      'Trạng Thái Gửi',
      'Đã Phản Hồi',
      'Thời Gian Phản Hồi',
      'Thread ID',
    ];
    const lines = [
      `# BÁO CÁO CHIẾN DỊCH: ${campaign.name}`,
      `# Tổng gửi: ${kpis.totalSent} | Thành công: ${kpis.deliveredCount} | Bounced: ${kpis.bouncedCount} | Đã phản hồi: ${kpis.repliedCount} (${kpis.replyRatePercent}%)`,
      headers.join(','),
      ...campaign.recipients.map((r, idx) =>
        [
          idx + 1,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.email}"`,
          `"${r.company.replace(/"/g, '""')}"`,
          r.roleType === 'partner' ? 'Đối tác' : 'Khách hàng',
          r.deliveryStatus === 'delivered'
            ? 'Gửi thành công'
            : r.deliveryStatus === 'bounced'
            ? 'Bị trả lại (Bounced)'
            : 'Đang chờ',
          r.hasReplied ? 'Đã phản hồi' : 'Chưa phản hồi',
          `"${r.repliedAtIso ? new Date(r.repliedAtIso).toLocaleString('vi-VN') : '-'}"`,
          `"${r.threadId}"`,
        ].join(',')
      ),
    ];
    const fileName = `bao-cao-${safeSlug}.csv`;
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    triggerBlobDownload(blob, fileName);
    return fileName;
  }

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      { Chi_So: 'Ten chien dich', Gia_Tri: campaign.name },
      { Chi_So: 'Thuong hieu', Gia_Tri: campaign.brandName },
      {
        Chi_So: 'Ngay trien khai',
        Gia_Tri: new Date(campaign.launchedAtIso).toLocaleString('vi-VN'),
      },
      { Chi_So: 'Tong mail da gui', Gia_Tri: kpis.totalSent },
      { Chi_So: 'So mail gui thanh cong', Gia_Tri: kpis.deliveredCount },
      { Chi_So: 'So mail bi tra lai (Bounced)', Gia_Tri: kpis.bouncedCount },
      { Chi_So: 'So khach hang da phan hoi (Replied)', Gia_Tri: kpis.repliedCount },
      { Chi_So: 'Ty le phan hoi (%)', Gia_Tri: `${kpis.replyRatePercent}%` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsRecipients = XLSX.utils.json_to_sheet(recipientRows);
    const wsTimeline = XLSX.utils.json_to_sheet(campaign.timelineSeries);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Quan_KPI');
    XLSX.utils.book_append_sheet(wb, wsRecipients, 'Danh_Sach_Khach_Hang');
    XLSX.utils.book_append_sheet(wb, wsTimeline, 'Tuong_Tac_Thoi_Gian');

    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = `bao-cao-${safeSlug}.xlsx`;
    const blob = new Blob([wbOut], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerBlobDownload(blob, fileName);
    return fileName;
  }

  // PDF Report with visual Bar Chart & Conversion Summary
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('B2CMAIL ENTERPRISE - CAMPAIGN ANALYTICS REPORT', 14, 13);
  doc.setFontSize(9);
  doc.text(
    `Campaign: ${toAsciiSafe(campaign.name)} | Brand: ${toAsciiSafe(campaign.brandName)}`,
    14,
    21
  );

  // KPI Boxes
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text('1. Executive KPI Summary', 14, 38);

  const kpiCards = [
    { label: 'Total Sent', value: String(kpis.totalSent), color: [37, 99, 235] },
    { label: 'Delivered', value: String(kpis.deliveredCount), color: [5, 150, 105] },
    { label: 'Bounced', value: String(kpis.bouncedCount), color: [220, 38, 38] },
    {
      label: 'Replied',
      value: `${kpis.repliedCount} (${kpis.replyRatePercent}%)`,
      color: [79, 70, 229],
    },
  ];

  kpiCards.forEach((card, i) => {
    const x = 14 + i * 46;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, 42, 43, 22, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 4, 49);
    doc.setFontSize(13);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + 4, 59);
  });

  // Visual Bar Chart in PDF
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text('2. Engagement & Conversion Breakdown Chart', 14, 76);

  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 80, 182, 42);

  const bars = [
    { label: 'Total Sent', val: kpis.totalSent, r: 59, g: 130, b: 246 },
    { label: 'Delivered', val: kpis.deliveredCount, r: 16, g: 185, b: 129 },
    { label: 'Opened', val: campaign.openCount || kpis.deliveredCount, r: 99, g: 102, b: 241 },
    { label: 'Replied', val: kpis.repliedCount, r: 14, g: 165, b: 233 },
    { label: 'Bounced', val: kpis.bouncedCount, r: 239, g: 68, b: 68 },
  ];
  const maxVal = Math.max(1, kpis.totalSent);

  bars.forEach((b, idx) => {
    const y = 85 + idx * 7;
    const barW = Math.max(2, Math.round((b.val / maxVal) * 115));
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(b.label, 18, y + 4);
    doc.setFillColor(b.r, b.g, b.b);
    doc.rect(48, y, barW, 4.5, 'F');
    doc.text(String(b.val), 48 + barW + 3, y + 4);
  });

  // Recipient Table in PDF
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text('3. Recipient & Reply Tracking List', 14, 134);

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 138, 182, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Recipient Name', 16, 143);
  doc.text('Email', 58, 143);
  doc.text('Company', 112, 143);
  doc.text('Status', 152, 143);
  doc.text('Replied', 176, 143);

  let rowY = 151;
  campaign.recipients.slice(0, 18).forEach((r) => {
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(toAsciiSafe(r.name).slice(0, 22), 16, rowY);
    doc.text(r.email.slice(0, 28), 58, rowY);
    doc.text(toAsciiSafe(r.company).slice(0, 20), 112, rowY);
    doc.text(r.deliveryStatus.toUpperCase(), 152, rowY);
    doc.text(r.hasReplied ? 'YES' : 'NO', 176, rowY);
    rowY += 6.5;
  });

  const fileName = `bao-cao-${safeSlug}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Export Overview of All Campaigns (CSV, XLSX, PDF, JSON)
 */
export async function exportAllCampaignsOverview(
  campaigns: EnterpriseCampaignRecord[],
  format: ExportFormatType
): Promise<string> {
  await new Promise((r) => setTimeout(r, 450));

  const overviewRows = campaigns.map((c, idx) => {
    const kpi = computeCampaignKpis(c);
    return {
      STT: idx + 1,
      Ma_Chien_Dich: c.id,
      Ten_Chien_Dich: c.name,
      Thuong_Hieu: c.brandName,
      Ngay_Trien_Khai: new Date(c.launchedAtIso).toLocaleDateString('vi-VN'),
      Trang_Thai:
        c.status === 'completed'
          ? 'Đã hoàn thành'
          : c.status === 'running'
          ? 'Đang chạy'
          : 'Nháp',
      Tong_Khach_Hang: kpi.totalSent,
      Gui_Thanh_Cong: kpi.deliveredCount,
      Bi_Tra_Lai_Bounced: kpi.bouncedCount,
      Da_Phan_Hoi: kpi.repliedCount,
      Ty_Le_Phan_Hoi_Percent: `${kpi.replyRatePercent}%`,
    };
  });

  if (format === 'json') {
    const fileName = 'tong-hop-chien-dich-b2cmail.json';
    const blob = new Blob([JSON.stringify(overviewRows, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerBlobDownload(blob, fileName);
    return fileName;
  }

  if (format === 'csv') {
    const headers = [
      'STT',
      'Tên Chiến Dịch',
      'Thương Hiệu',
      'Ngày Triển Khai',
      'Trạng Thái',
      'Tổng Khách Hàng',
      'Gửi Thành Công',
      'Bị Trả Lại (Bounced)',
      'Đã Phản Hồi',
      'Tỷ Lệ Phản Hồi',
    ];
    const lines = [
      headers.join(','),
      ...overviewRows.map((r) =>
        [
          r.STT,
          `"${r.Ten_Chien_Dich.replace(/"/g, '""')}"`,
          `"${r.Thuong_Hieu}"`,
          `"${r.Ngay_Trien_Khai}"`,
          `"${r.Trang_Thai}"`,
          r.Tong_Khach_Hang,
          r.Gui_Thanh_Cong,
          r.Bi_Tra_Lai_Bounced,
          r.Da_Phan_Hoi,
          `"${r.Ty_Le_Phan_Hoi_Percent}"`,
        ].join(',')
      ),
    ];
    const fileName = 'tong-hop-chien-dich-b2cmail.csv';
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    triggerBlobDownload(blob, fileName);
    return fileName;
  }

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(overviewRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Chien_Dich');
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = 'tong-hop-chien-dich-b2cmail.xlsx';
    const blob = new Blob([wbOut], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerBlobDownload(blob, fileName);
    return fileName;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('B2CMAIL ENTERPRISE - ALL CAMPAIGNS SUMMARY REPORT', 14, 16);

  let y = 38;
  overviewRows.forEach((row) => {
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 22, 2, 2);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${row.STT}. ${toAsciiSafe(row.Ten_Chien_Dich)}`, 18, y + 8);
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Date: ${row.Ngay_Trien_Khai} | Sent: ${row.Tong_Khach_Hang} | Delivered: ${row.Gui_Thanh_Cong} | Bounced: ${row.Bi_Tra_Lai_Bounced} | Replied: ${row.Da_Phan_Hoi} (${row.Ty_Le_Phan_Hoi_Percent})`,
      18,
      y + 16
    );
    y += 27;
  });

  const fileName = 'tong-hop-chien-dich-b2cmail.pdf';
  doc.save(fileName);
  return fileName;
}
