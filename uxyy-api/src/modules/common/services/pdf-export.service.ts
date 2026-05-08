import { Injectable, Logger } from '@nestjs/common';
import type {
  ArApResponseDto,
  BalanceSheetResponseDto,
  CashFlowResponseDto,
  IncomeStatementResponseDto,
} from '../../finance/dto/report.dto';

export interface PdfExportOptions {
  title: string;
  subtitle?: string;
  data: any[];
  columns: Array<{
    key: string;
    header: string;
    width?: number;
    format?: 'text' | 'number' | 'date' | 'currency';
  }>;
  footer?: {
    totalLabel?: string;
    totalValue?: string;
  };
}

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  /**
   * 生成HTML内容
   */
  generateHtml(options: PdfExportOptions): string {
    const { title, subtitle, data, columns, footer } = options;

    const now = new Date().toLocaleString('zh-CN');

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SimSun', 'Microsoft YaHei', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #1890ff;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
      color: #1890ff;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
    }
    .meta {
      text-align: right;
      font-size: 10px;
      color: #999;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #f0f5ff;
      color: #1890ff;
      font-weight: bold;
      padding: 10px 8px;
      text-align: left;
      border: 1px solid #d9d9d9;
    }
    td {
      padding: 8px;
      border: 1px solid #e8e8e8;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    tr:hover {
      background-color: #f0f5ff;
    }
    .number {
      text-align: right;
      font-family: 'Consolas', monospace;
    }
    .currency {
      text-align: right;
      font-family: 'Consolas', monospace;
      color: #52c41a;
    }
    .date {
      text-align: center;
      white-space: nowrap;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
    }
    .footer-total {
      font-weight: bold;
      font-size: 12px;
    }
    .page-break {
      page-break-after: always;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${title}</div>
    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  </div>
  <div class="meta">导出时间：${now}</div>
  <table>
    <thead>
      <tr>
        ${columns.map(col => `<th style="width: ${col.width || 'auto'}">${col.header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${columns.map(col => {
            const value = row[col.key];
            let formattedValue = value;
            let cssClass = '';
            
            if (col.format === 'number' && typeof value === 'number') {
              formattedValue = value.toLocaleString('zh-CN');
              cssClass = 'number';
            } else if (col.format === 'currency' && typeof value === 'number') {
              formattedValue = '¥' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              cssClass = 'currency';
            } else if (col.format === 'date' && value) {
              formattedValue = new Date(value).toLocaleDateString('zh-CN');
              cssClass = 'date';
            } else if (value === null || value === undefined) {
              formattedValue = '-';
            }
            
            return `<td class="${cssClass}">${formattedValue}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${footer ? `
    <div class="footer">
      <span>共 ${data.length} 条记录</span>
      <span class="footer-total">${footer.totalLabel || '合计'}：${footer.totalValue || ''}</span>
    </div>
  ` : ''}
</body>
</html>`;

    return html;
  }

  /**
   * 生成销售订单PDF HTML
   */
  generateSalesOrderHtml(order: any): string {
    const now = new Date().toLocaleString('zh-CN');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SimSun', 'Microsoft YaHei', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .doc-title {
      font-size: 18px;
      color: #666;
      border-bottom: 2px solid #1890ff;
      padding-bottom: 10px;
      display: inline-block;
    }
    .info-section {
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      width: 100px;
      font-weight: bold;
      color: #666;
    }
    .info-value {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #d9d9d9;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f0f5ff;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      margin-top: 20px;
      text-align: right;
    }
    .total-row {
      font-size: 14px;
      margin: 5px 0;
    }
    .grand-total {
      font-size: 16px;
      font-weight: bold;
      color: #1890ff;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
    }
    .signature {
      text-align: center;
      width: 150px;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 40px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">销售订单</div>
    <div class="doc-title">ORDER-${order.orderNo}</div>
  </div>
  
  <div class="info-section">
    <div class="info-row">
      <div class="info-label">客户名称：</div>
      <div class="info-value">${order.customerName || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">订单日期：</div>
      <div class="info-value">${order.createdAt ? new Date(order.createdAt).toLocaleDateString('zh-CN') : ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">订单状态：</div>
      <div class="info-value">${order.status || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">备注：</div>
      <div class="info-value">${order.remark || '无'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>商品名称</th>
        <th>规格</th>
        <th>单位</th>
        <th class="text-right">数量</th>
        <th class="text-right">单价</th>
        <th class="text-right">金额</th>
      </tr>
    </thead>
    <tbody>
      ${order.items?.map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.productName || ''}</td>
          <td>${item.spec || '-'}</td>
          <td>${item.unit || '件'}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">¥${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
          <td class="text-right">¥${parseFloat(item.amount || 0).toFixed(2)}</td>
        </tr>
      `).join('') || ''}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">商品金额：¥${parseFloat(order.totalAmount || 0).toFixed(2)}</div>
    <div class="total-row">优惠金额：¥${parseFloat(order.discountAmount || 0).toFixed(2)}</div>
    <div class="grand-total">应付金额：¥${parseFloat(order.payableAmount || order.totalAmount || 0).toFixed(2)}</div>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="signature-line"></div>
      <div>制单人</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>审核人</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>客户签字</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * 生成报价单PDF HTML
   */
  generateQuotationHtml(quotation: any): string {
    const now = new Date().toLocaleString('zh-CN');
    const validUntil = quotation.validUntil
      ? new Date(quotation.validUntil).toLocaleDateString('zh-CN')
      : '30天内';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SimSun', 'Microsoft YaHei', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .doc-title {
      font-size: 18px;
      color: #666;
      border-bottom: 2px solid #52c41a;
      padding-bottom: 10px;
      display: inline-block;
    }
    .valid-date {
      color: #ff4d4f;
      font-size: 11px;
      margin-top: 5px;
    }
    .info-section {
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      width: 100px;
      font-weight: bold;
      color: #666;
    }
    .info-value {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #d9d9d9;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f6ffed;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      margin-top: 20px;
      text-align: right;
    }
    .total-row {
      font-size: 14px;
      margin: 5px 0;
    }
    .grand-total {
      font-size: 16px;
      font-weight: bold;
      color: #52c41a;
    }
    .terms {
      margin-top: 30px;
      padding: 15px;
      background-color: #f6ffed;
      border-radius: 4px;
    }
    .terms-title {
      font-weight: bold;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
    }
    .signature {
      text-align: center;
      width: 150px;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 40px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">报价单</div>
    <div class="doc-title">QUOTATION-${quotation.quotationNo}</div>
    <div class="valid-date">有效期至：${validUntil}</div>
  </div>
  
  <div class="info-section">
    <div class="info-row">
      <div class="info-label">客户名称：</div>
      <div class="info-value">${quotation.customerName || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">报价日期：</div>
      <div class="info-value">${quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString('zh-CN') : ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">联系人：</div>
      <div class="info-value">${quotation.contactName || ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>商品名称</th>
        <th>规格</th>
        <th>单位</th>
        <th class="text-right">数量</th>
        <th class="text-right">单价</th>
        <th class="text-right">金额</th>
      </tr>
    </thead>
    <tbody>
      ${quotation.items?.map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.productName || ''}</td>
          <td>${item.spec || '-'}</td>
          <td>${item.unit || '件'}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">¥${parseFloat(item.unitPrice || 0).toFixed(2)}</td>
          <td class="text-right">¥${parseFloat(item.amount || 0).toFixed(2)}</td>
        </tr>
      `).join('') || ''}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">商品金额：¥${parseFloat(quotation.totalAmount || 0).toFixed(2)}</div>
    <div class="total-row">优惠金额：¥${parseFloat(quotation.discountAmount || 0).toFixed(2)}</div>
    <div class="grand-total">报价总额：¥${parseFloat(quotation.payableAmount || quotation.totalAmount || 0).toFixed(2)}</div>
  </div>

  <div class="terms">
    <div class="terms-title">报价条款</div>
    <div>1. 本报价有效期为30天，逾期请重新询价</div>
    <div>2. 付款方式：合同签订后预付30%，发货前付清余款</div>
    <div>3. 交货周期：收到预付款后7-15个工作日</div>
    <div>4. 以上价格含税，不含运费</div>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="signature-line"></div>
      <div>报价人</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>审核人</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>客户确认</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * 生成对账单PDF HTML
   */
  generateStatementHtml(customer: any, transactions: any[], period: string): string {
    const totalDebit = transactions.reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
    const balance = totalDebit - totalCredit;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SimSun', 'Microsoft YaHei', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .doc-title {
      font-size: 18px;
      color: #666;
      border-bottom: 2px solid #1890ff;
      padding-bottom: 10px;
      display: inline-block;
    }
    .info-section {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f0f5ff;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      width: 100px;
      font-weight: bold;
      color: #666;
    }
    .info-value {
      flex: 1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #d9d9d9;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f0f5ff;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-section {
      margin-top: 20px;
      padding: 15px;
      background-color: #f0f5ff;
      border-radius: 4px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 14px;
    }
    .grand-total {
      font-size: 16px;
      font-weight: bold;
      color: #1890ff;
      border-top: 2px solid #1890ff;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
    }
    .signature {
      text-align: center;
      width: 150px;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 40px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">客户对账单</div>
    <div class="doc-title">STATEMENT-${period}</div>
  </div>
  
  <div class="info-section">
    <div class="info-row">
      <div class="info-label">客户名称：</div>
      <div class="info-value">${customer.name || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">对账期间：</div>
      <div class="info-value">${period}</div>
    </div>
    <div class="info-row">
      <div class="info-label">联系电话：</div>
      <div class="info-value">${customer.phone || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">联系地址：</div>
      <div class="info-value">${customer.address || ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-center">日期</th>
        <th class="text-center">单据类型</th>
        <th class="text-center">单据编号</th>
        <th>摘要</th>
        <th class="text-right">借方</th>
        <th class="text-right">贷方</th>
        <th class="text-right">余额</th>
      </tr>
    </thead>
    <tbody>
      ${transactions.map((t, index) => {
        const runningBalance = transactions.slice(0, index + 1).reduce((sum, tr) => 
          sum + parseFloat(tr.debit || 0) - parseFloat(tr.credit || 0), 0);
        return `
        <tr>
          <td class="text-center">${t.date ? new Date(t.date).toLocaleDateString('zh-CN') : ''}</td>
          <td class="text-center">${t.type || ''}</td>
          <td class="text-center">${t.docNo || ''}</td>
          <td>${t.summary || ''}</td>
          <td class="text-right">${parseFloat(t.debit || 0) > 0 ? '¥' + parseFloat(t.debit).toFixed(2) : ''}</td>
          <td class="text-right">${parseFloat(t.credit || 0) > 0 ? '¥' + parseFloat(t.credit).toFixed(2) : ''}</td>
          <td class="text-right">¥${runningBalance.toFixed(2)}</td>
        </tr>
      `}).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">
      <span>本期借方合计：</span>
      <span>¥${totalDebit.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>本期贷方合计：</span>
      <span>¥${totalCredit.toFixed(2)}</span>
    </div>
    <div class="total-row grand-total">
      <span>期末余额：</span>
      <span>¥${balance.toFixed(2)} ${balance > 0 ? '(应收)' : balance < 0 ? '(预收)' : '(结平)'}</span>
    </div>
  </div>

  <div class="footer">
    <div class="signature">
      <div class="signature-line"></div>
      <div>制单人</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>审核人</div>
    </div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>客户确认</div>
    </div>
  </div>
</body>
</html>`;
  }

  private financeReportShell(title: string, subtitle: string, bodyInner: string): string {
    const now = new Date().toLocaleString('zh-CN');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'SimSun','Microsoft YaHei',sans-serif; font-size: 12px; color: #333; padding: 24px; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 8px; color: #1890ff; }
    .sub { text-align: center; color: #666; margin-bottom: 16px; }
    .meta { text-align: right; font-size: 10px; color: #999; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: left; }
    th { background: #f0f5ff; color: #1890ff; font-weight: bold; }
    .num { text-align: right; font-family: Consolas,monospace; }
    h2 { font-size: 14px; margin: 16px 0 8px; color: #333; }
    .foot { margin-top: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">${subtitle}</div>
  <div class="meta">导出时间：${now}</div>
  ${bodyInner}
</body>
</html>`;
  }

  /** 资产负债表 PDF（实为可打印 HTML） */
  generateBalanceSheetHtml(r: BalanceSheetResponseDto): string {
    const block = (
      h: string,
      rows: { code: string; name: string; amount: string }[],
      total: string,
      totalLabel: string,
    ) => `
      <h2>${h}</h2>
      <table>
        <thead><tr><th>科目编码</th><th>科目名称</th><th class="num">期末余额</th></tr></thead>
        <tbody>
          ${rows.map((x) => `<tr><td>${x.code}</td><td>${x.name}</td><td class="num">${x.amount}</td></tr>`).join('')}
          <tr><td colspan="2"><strong>${totalLabel}</strong></td><td class="num"><strong>${total}</strong></td></tr>
        </tbody>
      </table>`;
    const inner =
      block('资产', r.assets, r.totalAssets, '资产合计') +
      block('负债', r.liabilities, r.totalLiabilities, '负债合计') +
      block('所有者权益', r.equity, r.totalEquity, '权益合计');
    return this.financeReportShell('资产负债表', `截止日期：${r.period}`, inner);
  }

  generateIncomeStatementHtml(r: IncomeStatementResponseDto): string {
    const rows: string[] = [];
    const pushRows = (
      caption: string,
      items: { code: string; name: string; amount: string }[],
      sub: string,
      subLabel: string,
    ) => {
      rows.push(
        `<tr><td colspan="4"><strong>${caption}</strong></td></tr>`,
      );
      for (const x of items) {
        rows.push(
          `<tr><td></td><td>${x.code}</td><td>${x.name}</td><td class="num">${x.amount}</td></tr>`,
        );
      }
      rows.push(
        `<tr><td colspan="3" class="num"><strong>${subLabel}</strong></td><td class="num"><strong>${sub}</strong></td></tr>`,
      );
    };
    pushRows('营业收入', r.revenue, r.totalRevenue, '营业收入小计');
    pushRows('营业成本', r.costs, r.totalCosts, '营业成本小计');
    pushRows('期间费用', r.expenses, r.totalExpenses, '期间费用小计');
    rows.push(
      `<tr><td colspan="3"><strong>净利润</strong></td><td class="num"><strong>${r.netProfit}</strong></td></tr>`,
    );
    const inner = `
      <p>会计期间：<strong>${r.period}</strong></p>
      <table>
        <thead><tr><th width="12%">报表段落</th><th width="12%">科目编码</th><th width="40%">科目名称</th><th width="16%">本期金额</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
    return this.financeReportShell('利润表', `期间：${r.period}`, inner);
  }

  generateCashFlowHtml(r: CashFlowResponseDto): string {
    const rows: string[] = [];
    const pushLines = (
      caption: string,
      lines: { code: string; name: string; amount: string }[],
      net: string,
      netLabel: string,
    ) => {
      rows.push(`<tr><td colspan="4"><strong>${caption}</strong></td></tr>`);
      for (const x of lines) {
        rows.push(
          `<tr><td></td><td>${x.code}</td><td>${x.name}</td><td class="num">${x.amount}</td></tr>`,
        );
      }
      rows.push(
        `<tr><td colspan="3" class="num"><strong>${netLabel}</strong></td><td class="num"><strong>${net}</strong></td></tr>`,
      );
    };
    pushLines('经营活动', r.operatingActivities, r.netOperatingCashFlow, '经营活动现金流量净额');
    pushLines('投资活动', r.investingActivities, r.netInvestingCashFlow, '投资活动现金流量净额');
    pushLines('筹资活动', r.financingActivities, r.netFinancingCashFlow, '筹资活动现金流量净额');
    rows.push(
      `<tr><td colspan="3">现金及等价物净增加额</td><td class="num">${r.netCashFlow}</td></tr>`,
      `<tr><td colspan="3">期初现金及等价物余额</td><td class="num">${r.beginningCash}</td></tr>`,
      `<tr><td colspan="3">期末现金及等价物余额</td><td class="num">${r.endingCash}</td></tr>`,
    );
    const inner = `
      <p>会计期间：<strong>${r.period}</strong></p>
      <table>
        <thead><tr><th width="14%">报表段落</th><th width="12%">代码</th><th width="42%">项目</th><th width="16%">金额</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
    return this.financeReportShell('现金流量表', `期间：${r.period}`, inner);
  }

  generateArApHtml(r: ArApResponseDto): string {
    const tbl = (
      title: string,
      rows: ArApResponseDto['receivables'],
      total: string,
    ) => `
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>
            <th>发票ID</th><th>往来单位</th><th>发票号码</th>
            <th class="num">价税合计</th><th class="num">已收/已付</th><th class="num">余额</th>
            <th>开票日期</th><th class="num">逾期天数</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (x) =>
                `<tr><td>${x.id}</td><td>${x.name}</td><td>${x.invoiceNo}</td>
                <td class="num">${x.amount}</td><td class="num">${x.paidAmount}</td><td class="num">${x.balance}</td>
                <td>${x.issueDate ?? ''}</td><td class="num">${x.daysOverdue}</td></tr>`,
            )
            .join('')}
          <tr>
            <td colspan="7" class="foot"><strong>${title}余额合计</strong></td>
            <td class="num foot"><strong>${total}</strong></td>
          </tr>
        </tbody>
      </table>`;
    const inner = tbl('应收账款', r.receivables, r.totalReceivables) + tbl('应付账款', r.payables, r.totalPayables);
    return this.financeReportShell('应收应付明细', '已验证发票及回款勾稽（应付已付以凭证/后续模块为准）', inner);
  }
}
