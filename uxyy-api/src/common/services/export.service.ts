import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';

export type ExportFormat = 'excel' | 'csv' | 'pdf';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown) => string;
}

@Injectable()
export class ExportService {
  /**
   * 导出 Excel 文件
   */
  exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[],
    sheetName = 'Sheet1',
  ): Buffer {
    // 格式化数据
    const formattedData = data.map((row) => {
      const formatted: Record<string, unknown> = {};
      for (const col of columns) {
        const value = row[col.key];
        formatted[col.header] = col.formatter ? col.formatter(value) : value;
      }
      return formatted;
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // 设置列宽
    const colWidths = columns.map((col) => ({ wch: col.width || 15 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 生成 Buffer
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 多工作表 Excel（用于资产负债表、应收应付等多段报表）
   */
  exportExcelWorkbook(
    sheets: {
      name: string;
      data: Record<string, unknown>[];
      columns: ExportColumn[];
    }[],
  ): Buffer {
    const wb = XLSX.utils.book_new();
    for (const sh of sheets) {
      const formattedData = sh.data.map((row) => {
        const formatted: Record<string, unknown> = {};
        for (const col of sh.columns) {
          const value = row[col.key];
          formatted[col.header] = col.formatter ? col.formatter(value) : value;
        }
        return formatted;
      });
      const safeName = sh.name.replace(/[\\/*?:\[\]]/g, '_').slice(0, 31);
      const ws = XLSX.utils.json_to_sheet(
        formattedData.length
          ? formattedData
          : [Object.fromEntries(sh.columns.map((c) => [c.header, '']))],
      );
      ws['!cols'] = sh.columns.map((c) => ({ wch: c.width || 15 }));
      XLSX.utils.book_append_sheet(wb, ws, safeName || 'Sheet1');
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * 导出 CSV 文件
   */
  exportToCsv<T extends Record<string, unknown>>(
    data: T[],
    columns: ExportColumn[],
  ): string {
    // 格式化数据
    const formattedData = data.map((row) => {
      const formatted: Record<string, unknown> = {};
      for (const col of columns) {
        const value = row[col.key];
        formatted[col.header] = col.formatter ? col.formatter(value) : value;
      }
      return formatted;
    });

    // 如果没有数据，返回空字符串
    if (formattedData.length === 0) {
      return columns.map((c) => c.header).join(',');
    }

    const parser = new Parser({
      fields: columns.map((c) => c.header),
    });

    return parser.parse(formattedData);
  }

  /**
   * 通用导出方法
   */
  export<T extends Record<string, unknown>>(
    format: ExportFormat,
    data: T[],
    columns: ExportColumn[],
    sheetName?: string,
  ): Buffer | string {
    switch (format) {
      case 'excel':
        return this.exportToExcel(data, columns, sheetName);
      case 'csv':
        return this.exportToCsv(data, columns);
      case 'pdf':
        throw new Error('PDF 导出功能待实现');
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 获取导出文件的 MIME 类型
   */
  getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv; charset=utf-8';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * 获取导出文件的扩展名
   */
  getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'excel':
        return 'xlsx';
      case 'csv':
        return 'csv';
      case 'pdf':
        return 'pdf';
      default:
        return 'bin';
    }
  }
}
