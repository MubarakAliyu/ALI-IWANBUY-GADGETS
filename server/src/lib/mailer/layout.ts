/**
 * One HTML layout for every email the shop sends (Batch 2 Part A): a navy header strip with the mark, a white
 * body, and a footer carrying the company block.
 *
 * Email clients are two decades behind browsers, so this is tables and inline styles on purpose — no external
 * stylesheet, no web font, no flexbox. The brand colours are the same hex values as `globals.css`; they are
 * written here because an email cannot read a CSS custom property.
 */

const NAVY = "#1E2A35";
const PRIMARY = "#156FBF";
const GREY_50 = "#F8FAFB";
const GREY_200 = "#DFE4E8";
const TEXT_MUTED = "#646F7A";
const FONT = "Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif";

export type CompanyBlock = {
  storeName: string;
  legalName: string;
  rcNumber: string;
  phone: string;
  email: string;
  address: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:10px;background:${PRIMARY};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

/** A key/value block — order totals, delivery details — as a table that survives any mail client. */
export function detailRows(rows: [string, string][]): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${TEXT_MUTED};">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${NAVY};text-align:right;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>`;
}

export function renderEmail(options: {
  title: string;
  preheader: string;
  body: string;
  company: CompanyBlock;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${GREY_50};">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GREY_50};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${GREY_200};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${NAVY};padding:20px 28px;">
                <span style="font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">${escapeHtml(options.company.storeName)}</span>
                <span style="display:block;font-family:${FONT};font-size:12px;color:#A2C7EB;margin-top:2px;">Clean. Modern. Reliable.</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-family:${FONT};font-size:15px;line-height:1.6;color:${NAVY};">
                <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;font-weight:700;color:${NAVY};">${escapeHtml(options.title)}</h1>
                ${options.body}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid ${GREY_200};background:${GREY_50};padding:20px 28px;font-family:${FONT};font-size:12px;line-height:1.6;color:${TEXT_MUTED};">
                <strong style="color:${NAVY};">${escapeHtml(options.company.legalName)}</strong> · RC ${escapeHtml(options.company.rcNumber)}<br />
                ${escapeHtml(options.company.address)}<br />
                ${escapeHtml(options.company.phone)} · ${escapeHtml(options.company.email)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
