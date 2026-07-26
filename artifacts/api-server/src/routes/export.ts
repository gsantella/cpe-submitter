import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import path from "path";
import ExcelJS from "exceljs";
import { db, eventsTable, eventAttendeesTable, membersTable, settingsTable } from "@workspace/db";

const router: IRouter = Router();

// Template is at artifacts/api-server/src/assets/isc2-template.xlsx
// In dev: __dirname = artifacts/api-server/dist, so we go up to src/assets
const TEMPLATE_PATH = path.join(
  path.dirname(path.dirname(new URL(import.meta.url).pathname)),
  "src",
  "assets",
  "isc2-template.xlsx",
);

function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD, convert to MM/DD/YY
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year.slice(2)}`;
}

router.get("/events/:id/export", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  // Load event and settings in parallel
  const [[event], [settings]] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.id, id)),
    db.select().from(settingsTable).where(eq(settingsTable.id, 1)),
  ]);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  // Load attendees
  const attendees = await db
    .select({
      memberId: membersTable.id,
      firstName: membersTable.firstName,
      lastName: membersTable.lastName,
      isc2Number: membersTable.isc2Number,
      checkedInAt: eventAttendeesTable.checkedInAt,
    })
    .from(eventAttendeesTable)
    .innerJoin(membersTable, eq(eventAttendeesTable.memberId, membersTable.id))
    .where(eq(eventAttendeesTable.eventId, id))
    .orderBy(membersTable.lastName, membersTable.firstName);

  // Load template workbook preserving all formatting
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  // Sheet 2 is "Chapter Attendance and CPE Sub" (index 1)
  const sheet = workbook.worksheets[1];
  if (!sheet) {
    res.status(500).json({ error: "Template sheet not found" });
    return;
  }

  // Set chapter name in cell B2
  const b2 = sheet.getCell("B2");
  b2.value = settings?.chapterName || "";

  // Set Group type in cell E2 using the full ISC2 label
  const groupTypeLabels: Record<string, string> = {
    "Group A": "Group A - Domain Related Meetings/Events",
    "Group B": "Group B - Management/Officer Meetings/No Domain",
  };
  const e2 = sheet.getCell("E2");
  e2.value = groupTypeLabels[event.groupType] ?? event.groupType;

  // Capture per-cell styles from the first data row (row 7) before clearing,
  // so we can reapply them to any overflow rows beyond the template's pre-formatted range.
  const TEMPLATE_DATA_COLS = 6;
  const templateRowStyles = Array.from({ length: TEMPLATE_DATA_COLS }, (_, i) => {
    const cell = sheet.getRow(7).getCell(i + 1);
    return JSON.parse(JSON.stringify(cell.style ?? {})) as ExcelJS.Style;
  });

  // Clear any existing attendee data rows (7+) from the template sample data
  for (let rowNum = 7; rowNum <= 20; rowNum++) {
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = null; // A - ISC2 Member ID
    row.getCell(2).value = null; // B - First Name
    row.getCell(3).value = null; // C - Last Name
    row.getCell(4).value = null; // D - Description
    row.getCell(5).value = null; // E - CPEs
    row.getCell(6).value = null; // F - Date
    row.commit();
  }

  // Write attendee rows starting at row 7
  const formattedDate = formatDate(event.date);
  attendees.forEach((attendee, idx) => {
    const rowNum = 7 + idx;
    const row = sheet.getRow(rowNum);

    // For rows beyond the pre-formatted template range, copy styles from row 7
    if (rowNum > 20) {
      for (let col = 1; col <= TEMPLATE_DATA_COLS; col++) {
        row.getCell(col).style = { ...templateRowStyles[col - 1] };
      }
    }

    // Column A: ISC2 Member ID — stored as a number with integer format to
    // prevent scientific notation for large IDs (e.g. 333211121221212).
    const numId = Number(attendee.isc2Number);
    const cellA = row.getCell(1);
    cellA.value = isNaN(numId) ? attendee.isc2Number : numId;
    if (!isNaN(numId)) cellA.numFmt = "0";

    row.getCell(2).value = attendee.firstName;   // B: First Name
    row.getCell(3).value = attendee.lastName;    // C: Last Name
    row.getCell(4).value = event.description;    // D: Description
    row.getCell(5).value = event.cpeCredits;     // E: CPEs
    row.getCell(6).value = formattedDate;        // F: Date

    row.commit();
  });

  // Generate safe filename
  const safeName = event.name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
  const filename = `ISC2_CPE_${safeName}_${event.date}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

export default router;
