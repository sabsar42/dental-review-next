import ExcelJS from "exceljs";
import type { ExportRow } from "./reviewTypes";

const COLUMNS: { header: string; key: keyof ExportRow; width: number }[] = [
  { header: "reviewer_name", key: "reviewer_name", width: 15 },
  { header: "image_id", key: "image_id", width: 15 },
  { header: "image_filename", key: "image_filename", width: 30 },
  { header: "tooth_number", key: "tooth_number", width: 15 },
  { header: "annotation_id", key: "annotation_id", width: 15 },
  { header: "tooth_type_assigned", key: "tooth_type_assigned", width: 25 },
  { header: "status", key: "status", width: 25 },
  { header: "suggested_type", key: "suggested_type", width: 25 },
  { header: "comment", key: "comment", width: 25 },
  { header: "missing_teeth", key: "missing_teeth", width: 25 },
  { header: "missing_description", key: "missing_description", width: 25 },
  { header: "phantom_marks", key: "phantom_marks", width: 25 },
  { header: "phantom_description", key: "phantom_description", width: 25 },
  { header: "reviewed_at", key: "reviewed_at", width: 25 },
];

export async function downloadResponsesAsExcel(rows: ExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dental Review");

  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dental_review.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
