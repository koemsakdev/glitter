import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Provider-agnostic SMTP mailer. Reads standard SMTP env vars, so it works with
 * Gmail, Brevo, a cPanel mailbox, etc. without code changes:
 *
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * Port 465 uses implicit SSL; anything else (e.g. 587) uses STARTTLS.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.MAIL_FROM || (user ? `Glitter <${user}>` : '');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP mailer ready (${host}:${port}).`);
    } else {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST/USER/PASS missing) — emails will not be sent.',
      );
    }
  }

  /** Whether the mailer has valid SMTP credentials. */
  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
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
