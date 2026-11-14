import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";
import { mailUnavailable } from "./errors";

export type MailResult = {
  delivered: boolean;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!env.SMTP_HOST) {
    throw mailUnavailable();
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  // Development tanpa SMTP: tautan verifikasi cukup dicetak di console.
  if (!env.SMTP_HOST) {
    if (process.env.NODE_ENV === "production") {
      throw mailUnavailable();
    }

    console.log(
      `\n[MAILER:DEV] Ke: ${input.to}\nSubjek: ${input.subject}\n${input.text}\n`,
    );
    return { delivered: false };
  }

  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { delivered: true };
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<MailResult> {
  const verifyUrl = new URL("/api/auth/verify", env.APP_URL);
  verifyUrl.searchParams.set("token", token);
  const url = verifyUrl.toString();
  const safeName = escapeHtml(name);

  return sendMail({
    to,
    subject: "Verifikasi akun HireMatch AI",
    text: `Halo ${name},\n\nVerifikasi akun HireMatch AI Anda melalui tautan berikut:\n${url}\n\nJika Anda tidak mendaftar, abaikan email ini.`,
    html: `<p>Halo ${safeName},</p><p>Klik tautan berikut untuk memverifikasi akun HireMatch AI Anda:</p><p><a href="${url}">${url}</a></p><p>Jika Anda tidak mendaftar, abaikan email ini.</p>`,
  });
}
