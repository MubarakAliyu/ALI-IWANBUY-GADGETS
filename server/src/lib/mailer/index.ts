/**
 * Outgoing email behind one interface (overview §6.7).
 *
 * Development has no SMTP server, so the default transport writes each message to
 * `server/.local/outbox/<timestamp>-<template>.html` with its attachments beside it, and logs the path. That
 * makes every email the shop sends readable, and testable, without an inbox. Setting `SMTP_HOST` switches to
 * nodemailer with no other change.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { logger } from "../logger.js";

export type MailAttachment = { filename: string; content: Buffer; contentType?: string };

export type Mail = {
  to: string;
  subject: string;
  html: string;
  /** Names the file in the dev outbox and appears in the logs: `welcome`, `order-placed`, … */
  template: string;
  /** Where a reply goes — the shop's own address, so a customer can simply hit reply. */
  replyTo?: string;
  attachments?: MailAttachment[];
};

export type Mailer = {
  send: (mail: Mail) => Promise<void>;
  /** Where a sent message can be read back, for tests and for the dev log. */
  readonly kind: "file" | "smtp";
};

export const OUTBOX_DIR = path.resolve(process.cwd(), ".local", "outbox");

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const fileMailer: Mailer = {
  kind: "file",
  async send(mail) {
    await mkdir(OUTBOX_DIR, { recursive: true });
    const base = `${stamp()}-${mail.template}`;
    const file = path.join(OUTBOX_DIR, `${base}.html`);

    const header = `<!-- to: ${mail.to} | subject: ${mail.subject} -->\n`;
    await writeFile(file, header + mail.html, "utf8");

    for (const attachment of mail.attachments ?? []) {
      await writeFile(path.join(OUTBOX_DIR, `${base}-${attachment.filename}`), attachment.content);
    }

    logger.info({ to: mail.to, subject: mail.subject, file }, "Email written to the outbox");
  },
};

function createSmtpMailer(): Mailer {
  let transporter: Transporter | undefined;

  return {
    kind: "smtp",
    async send(mail) {
      transporter ??= nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        ...(env.SMTP_USER && env.SMTP_PASSWORD
          ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
          : {}),
      });

      await transporter.sendMail({
        from: env.MAIL_FROM,
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        attachments: mail.attachments,
      });
      logger.info({ to: mail.to, subject: mail.subject }, "Email sent");
    },
  };
}

export const mailer: Mailer = env.SMTP_HOST ? createSmtpMailer() : fileMailer;

/**
 * Sending an email must never fail the thing it reports on — an order is placed whether or not the
 * confirmation leaves the building. Failures are logged, loudly, and the request still succeeds.
 */
export async function sendMailSafely(mail: Mail): Promise<void> {
  try {
    await mailer.send(mail);
  } catch (error) {
    logger.error({ err: error, template: mail.template, to: mail.to }, "Could not send an email");
  }
}
