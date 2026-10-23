// Reader-friendly PDF export for the HR Reports page.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const TEAL = [13, 148, 136];
const TEAL_DARK = [15, 118, 110];
const TEAL_LIGHT = [204, 251, 241];
const INK = [31, 41, 55];
const MUTED = [107, 114, 128];
const LINE = [229, 231, 235];
const ZEBRA = [247, 250, 250];

// jsPDF's built-in fonts only cover Latin characters – swap anything else so text never turns to garbage.
const clean = (v) =>
    String(v ?? "")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u00B7/g, "|")
        .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");

const group = (n, d) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const MONEY_HEAD = /pay|basic|allowance|deduction|\bnet\b|salary/i;

/** Formats a cell using its column heading as a hint (money / percent / counts). */
const fmtCell = (v, head) => {
    if (v == null || v === "") return "-";
    if (typeof v !== "number" || !isFinite(v)) return clean(v);
    const h = String(head || "");
    if (/%/.test(h)) return `${group(v, 1)}%`;
    if (/hours/i.test(h)) return group(v, 2);
    if (MONEY_HEAD.test(h) && !/employees|days|type|set up|requests/i.test(h)) return group(v, 2);
    return Number.isInteger(v) ? group(v, 0) : group(v, 2);
};

/**
 * spec = {
 *   title, subtitle, orgName?,
 *   kpis?:       [{ label, value, note? }]         (cover page cards)
 *   highlights?: [string]                           (plain-English key points)
 *   sheets:      [{ name, title?, subtitle?, headers, rows, totals?, note? }]
 * }
 */
export function buildReportPdf(spec) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 14; // page margin
    const sections = []; // { title, page }
    const hasCover = !!(spec.kpis?.length || spec.highlights?.length);

    const text = (s, x, y, o = {}) => {
        doc.setFont("helvetica", o.bold ? "bold" : "normal");
        doc.setFontSize(o.size || 10);
        doc.setTextColor(...(o.color || INK));
        doc.text(clean(s), x, y, o.opts);
    };

    // ── Cover / overview page ────────────────────────────────────────────────
    const drawBanner = (h) => {
        doc.setFillColor(...TEAL);
        doc.rect(0, 0, W, h, "F");
        doc.setFillColor(...TEAL_DARK);
        doc.rect(0, h - 2, W, 2, "F");
    };

    let tocY = 0;
    if (hasCover) {
        drawBanner(38);
        text(spec.orgName || "HR Management System", M, 13, { size: 10, color: [204, 251, 241], bold: true });
        text(spec.title, M, 25, { size: 22, bold: true, color: [255, 255, 255] });
        text(spec.subtitle || "", M, 33, { size: 10, color: [236, 253, 250] });

        let y = 48;
        if (spec.kpis?.length) {
            const n = Math.min(spec.kpis.length, 4);
            const gap = 6;
            const cw = (W - 2 * M - gap * (n - 1)) / n;
            spec.kpis.slice(0, n).forEach((k, i) => {
                const x = M + i * (cw + gap);
                doc.setFillColor(...ZEBRA);
                doc.setDrawColor(...LINE);
                doc.roundedRect(x, y, cw, 26, 3, 3, "FD");
                doc.setFillColor(...TEAL);
                doc.roundedRect(x, y, 2.2, 26, 1, 1, "F");
                text(k.label, x + 7, y + 8, { size: 9, color: MUTED });
                text(String(k.value), x + 7, y + 18, { size: 18, bold: true, color: TEAL_DARK });
                if (k.note) text(k.note, x + 7, y + 23.5, { size: 8, color: MUTED });
            });
            y += 36;
        }

        if (spec.highlights?.length) {
            text("Key points", M, y, { size: 13, bold: true, color: TEAL_DARK });
            y += 3;
            doc.setDrawColor(...TEAL);
            doc.setLineWidth(0.6);
            doc.line(M, y, M + 22, y);
            y += 7;
            spec.highlights.forEach((hl) => {
                doc.setFillColor(...TEAL);
                doc.circle(M + 1.5, y - 1.2, 0.9, "F");
                const lines = doc.setFont("helvetica", "normal").setFontSize(10.5).splitTextToSize(clean(hl), W - 2 * M - 8);
                text(lines, M + 6, y, { size: 10.5 });
                y += lines.length * 5.2 + 2.5;
            });
            y += 4;
        }

        text("What is inside this report", M, y, { size: 13, bold: true, color: TEAL_DARK });
        y += 3;
        doc.line(M, y, M + 22, y);
        tocY = y + 8;
    }

    // ── Sections (one table each) ────────────────────────────────────────────
    const sectionHeader = (sh, first) => {
        if (hasCover || !first) doc.addPage();
        let y = M + 4;
        text(sh.title || sh.name, M, y, { size: 16, bold: true, color: TEAL_DARK });
        y += 3;
        doc.setDrawColor(...TEAL);
        doc.setLineWidth(0.6);
        doc.line(M, y, M + 22, y);
        y += 6;
        const sub = [sh.subtitle, !hasCover && first ? spec.subtitle : null].filter(Boolean).join("  |  ");
        if (sub) {
            const lines = doc.setFont("helvetica", "normal").setFontSize(9).splitTextToSize(clean(sub), W - 2 * M);
            text(lines, M, y, { size: 9, color: MUTED });
            y += lines.length * 4.4 + 2;
        }
        return y + 1;
    };

    spec.sheets.forEach((sh, idx) => {
        const startY = sectionHeader(sh, idx === 0);
        sections.push({ title: sh.name, desc: sh.title || sh.name, page: doc.getNumberOfPages() });

        if (!sh.rows.length) {
            doc.setFillColor(...ZEBRA);
            doc.setDrawColor(...LINE);
            doc.roundedRect(M, startY, W - 2 * M, 16, 2, 2, "FD");
            text("No records for this period.", W / 2, startY + 10, { size: 11, color: MUTED, opts: { align: "center" } });
            return;
        }

        const isMetric = sh.headers.length === 2 && sh.headers[0] === "Metric";
        const numCols = new Set();
        sh.headers.forEach((h, c) => {
            if (!(sh.headers.length === 2 && sh.headers[0] === "Metric") && sh.rows.slice(0, 50).some((r) => typeof r[c] === "number")) numCols.add(c);
        });
        const colStyles = {};
        numCols.forEach((c) => { colStyles[c] = { halign: "right" }; });
        if (isMetric) {
            colStyles[0] = { cellWidth: 120, fontStyle: "normal" };
            colStyles[1] = { halign: "left", fontStyle: "bold" };
        }

        const body = sh.rows.map((r) => sh.headers.map((h, c) => (isMetric && c === 1 ? clean(typeof r[c] === "number" ? fmtCell(r[c], r[0]) : r[c]) : fmtCell(r[c], h))));
        if (sh.totals) body.push(sh.totals.map((v, c) => (v === "" || v == null ? "" : fmtCell(v, sh.headers[c]))));
        const lastIdx = body.length - 1;

        autoTable(doc, {
            startY,
            head: [sh.headers.map(clean)],
            body,
            margin: { left: M, right: M, top: M + 4, bottom: 16 },
            theme: "grid",
            styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: "linebreak", valign: "middle" },
            headStyles: { fillColor: TEAL, textColor: 255, fontStyle: "bold", halign: "left" },
            alternateRowStyles: { fillColor: ZEBRA },
            columnStyles: colStyles,
            showHead: "everyPage",
            rowPageBreak: "avoid",
            didParseCell: (d) => {
                if (d.section === "head" && numCols.has(d.column.index)) d.cell.styles.halign = "right";
                if (sh.totals && d.section === "body" && d.row.index === lastIdx) {
                    d.cell.styles.fillColor = TEAL_LIGHT;
                    d.cell.styles.fontStyle = "bold";
                }
            },
        });

        if (sh.note) {
            const y = doc.lastAutoTable.finalY + 6;
            text(doc.splitTextToSize(clean(sh.note), W - 2 * M), M, y, { size: 8.5, color: MUTED });
        }
    });

    // ── Contents list on the cover (now that page numbers are known) ─────────
    if (hasCover) {
        doc.setPage(1);
        sections.forEach((s, i) => {
            const y = tocY + i * 7.5;
            text(`${i + 1}.`, M, y, { size: 10.5, bold: true, color: TEAL_DARK });
            text(s.desc, M + 8, y, { size: 10.5 });
            const label = `Page ${s.page}`;
            const tw = doc.getTextWidth(label);
            text(label, W - M, y, { size: 10, color: MUTED, opts: { align: "right" } });
            doc.setDrawColor(...LINE);
            doc.setLineDashPattern([0.6, 1.2], 0);
            const titleEnd = M + 8 + doc.getTextWidth(clean(s.desc)) + 3;
            doc.line(titleEnd, y - 0.8, W - M - tw - 3, y - 0.8);
            doc.setLineDashPattern([], 0);
        });
    }

    // ── Footer on every page ─────────────────────────────────────────────────
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.line(M, H - 11, W - M, H - 11);
        text(`${spec.title}`, M, H - 6, { size: 8, color: MUTED });
        text(`Page ${p} of ${total}`, W - M, H - 6, { size: 8, color: MUTED, opts: { align: "right" } });
        text(`Generated ${new Date().toLocaleString()}`, W / 2, H - 6, { size: 8, color: MUTED, opts: { align: "center" } });
    }

    doc.setProperties({ title: clean(spec.title), subject: clean(spec.subtitle || ""), creator: "HR Management System" });
    return doc;
}

/** Builds the PDF and downloads it. */
export function downloadReportPdf(filename, spec) {
    buildReportPdf(spec).save(filename);
}
