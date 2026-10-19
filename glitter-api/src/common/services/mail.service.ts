import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Outgoing email. Two transports, picked from env:
 *
 *   1. Your own Gmail via a Google Apps Script web app, over HTTPS — works on
 *      hosts like Render whose free plan blocks outbound SMTP ports:
 *      GMAIL_SCRIPT_URL + GMAIL_SCRIPT_SECRET (see docs/gmail-sender.gs)
 *   2. Any SMTP server (Gmail app password, cPanel, …):
 *      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly scriptUrl = process.env.GMAIL_SCRIPT_URL || null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.MAIL_FROM || (user ? `Glitter <${user}>` : '');

    if (this.scriptUrl) {
      this.logger.log('Email via Gmail (Apps Script) ready.');
    } else if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        // Fail fast instead of hanging when a host blocks SMTP ports.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
      });
      this.logger.log(`SMTP mailer ready (${host}:${port}).`);
    } else {
      this.logger.warn(
        'Email not configured (set GMAIL_SCRIPT_URL or SMTP_*) — emails will not be sent.',
      );
    }
  }

  /** Whether some email transport is configured. */
  get isConfigured(): boolean {
    return this.scriptUrl !== null || this.transporter !== null;
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (this.scriptUrl) {
      await this.sendViaGmailScript(params);
      return;
    }
    if (!this.transporter) {
      throw new Error('Email service is not configured');
    }
    await this.transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  }

  /** POST to the Apps Script web app, which sends from your Gmail. */
  private async sendViaGmailScript(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const res = await fetch(this.scriptUrl!, {
      method: 'POST',
      // text/plain avoids a CORS preflight Apps Script can't answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: process.env.GMAIL_SCRIPT_SECRET ?? '',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text ?? '',
        name: process.env.MAIL_FROM_NAME || 'Glitter Shop',
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!res.ok || !body?.ok) {
      const reason = body?.error ?? `HTTP ${res.status}`;
      this.logger.error(`Gmail script send failed: ${reason}`);
      throw new Error(`Could not send email (${reason})`);
    }
  }

  /** A simple branded one-time-code email. */
  async sendVerificationCode(to: string, code: string): Promise<void> {
    const subject = `Your verification code: ${code}`;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px;color:#111">Verify your email</h2>
        <p style="margin:0 0 20px;color:#555;font-size:14px">
          Enter this code to confirm your email address. It expires in 10 minutes.
        </p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#111;background:#f4f4f5;border-radius:12px;padding:16px;text-align:center">
          ${code}
        </div>
        <p style="margin:20px 0 0;color:#999;font-size:12px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>`;
    await this.send({
      to,
      subject,
      html,
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });
  }
}
