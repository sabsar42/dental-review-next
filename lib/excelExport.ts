import ExcelJS from "exceljs";
import type { ExportRow } from "./reviewTypes";

// Columns grouped by category, each group given a distinct header color so
// the sheet is easy to scan at a glance.
const GROUP_COLORS = {
  identity: "FFB4C7E7", // blue — who / which image
  tooth: "FFC6E0B4", // green — which tooth
  outcome: "FFFFD966", // amber — review outcome
  imageLevel: "FFD9C2E9", // purple — whole-image questions
  meta: "FFD9D9D9", // gray — timestamps etc.
} as const;

const COLUMNS: { header: string; key: keyof ExportRow; width: number; group: keyof typeof GROUP_COLORS }[] = [
  { header: "reviewer_name", key: "reviewer_name", width: 15, group: "identity" },
  { header: "image_id", key: "image_id", width: 15, group: "identity" },
  { header: "image_filename", key: "image_filename", width: 30, group: "identity" },
  { header: "tooth_number", key: "tooth_number", width: 15, group: "tooth" },
  { header: "annotation_id", key: "annotation_id", width: 15, group: "tooth" },
  { header: "tooth_type_assigned", key: "tooth_type_assigned", width: 25, group: "tooth" },
  { header: "status", key: "status", width: 25, group: "outcome" },
  { header: "suggested_type", key: "suggested_type", width: 25, group: "outcome" },
  { header: "comment", key: "comment", width: 25, group: "outcome" },
  { header: "missing_teeth", key: "missing_teeth", width: 25, group: "imageLevel" },
  { header: "missing_description", key: "missing_description", width: 25, group: "imageLevel" },
  { header: "phantom_marks", key: "phantom_marks", width: 25, group: "imageLevel" },
  { header: "phantom_description", key: "phantom_description", width: 25, group: "imageLevel" },
  { header: "reviewed_at", key: "reviewed_at", width: 25, group: "meta" },
];

const STATUS_COLORS: Record<string, string> = {
  Correct: "FFC6E0B4", // green
  "Not sure": "FFFFE699", // yellow
};
const FLAGGED_COLOR = "FFF4B7B2"; // red — anything else (wrong type / boundary off / combinations)

function statusFillColor(status: string): string {
  return STATUS_COLORS[status] ?? FLAGGED_COLOR;
}

// Light, readable row-band colors cycled by image_id, so every row belonging
// to the same X-ray shares one color and adjacent images are visually
// separated even with dark text on top.
const IMAGE_ROW_COLORS = [
  "FFE3F2FD", // light blue
  "FFE8F5E9", // light green
  "FFFFF3E0", // light orange
  "FFF3E5F5", // light purple
  "FFFCE4EC", // light pink
  "FFE0F7FA", // light cyan
  "FFFFFDE7", // light yellow
  "FFEFEBE9", // light brown
  "FFE8EAF6", // light indigo
  "FFF1F8E9", // light lime
];

function imageRowColor(imageId: number, order: Map<number, number>): string {
  let index = order.get(imageId);
  if (index === undefined) {
    index = order.size;
    order.set(imageId, index);
  }
  return IMAGE_ROW_COLORS[index % IMAGE_ROW_COLORS.length];
}

export async function downloadResponsesAsExcel(rows: ExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dental Review");

  sheet.columns = COLUMNS.map(({ header, key, width }) => ({ header, key, width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GROUP_COLORS[col.group] },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 22;

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const statusColIndex = COLUMNS.findIndex((c) => c.key === "status") + 1;
  const imageIdOrder = new Map<number, number>();

  for (const row of rows) {
    const excelRow = sheet.addRow(row);
    const rowColor = imageRowColor(row.image_id, imageIdOrder);

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowColor },
      };
    });

    if (statusColIndex > 0) {
      const statusCell = excelRow.getCell(statusColIndex);
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: statusFillColor(row.status) },
      };
      statusCell.font = { bold: true };
    }
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
