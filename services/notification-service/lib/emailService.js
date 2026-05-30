import nodemailer from "nodemailer";
import { createLogger } from "shared";

const logger = createLogger("notification-email");

let transporter = null;
let useMock = true;
let initialized = false;

const initTransporter = () => {
  if (initialized) return;

  if (process.env.Isrender) {
    useMock = !process.env.RESEND_API_KEY;
    if (!useMock) {
      logger.info("Render environment detected. Using Resend API for emails.");
    } else {
      logger.warn("Render environment detected, but RESEND_API_KEY is missing — emails log to stdout (mock mode).");
    }
  } else {
    useMock = !process.env.MY_GMAIL || !process.env.MY_PASS;
    if (!useMock) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        auth: {
          user: process.env.MY_GMAIL,
          pass: process.env.MY_PASS
        }
      });
      logger.info("SMTP transporter configured.");
    } else {
      logger.warn("Gmail credentials missing — emails log to stdout (mock mode).");
    }
  }

  initialized = true;
};

export const sendEmail = async ({ email, subject, text, correlationId }) => {
  if (!email || !subject || !text) {
    throw new Error("email, subject, and text are required");
  }

  initTransporter();

  if (useMock) {
    logger.info(`
================================================================================
📧 [MOCK EMAIL]
================================================================================
Correlation : ${correlationId || "n/a"}
To          : ${email}
Subject     : ${subject}
---
${text}
================================================================================
`);
    return;
  }

  if (process.env.Isrender) {
    const fromEmail = process.env.RESEND_FROM || "onboarding@resend.dev";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Resend API error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to send email via Resend API: ${response.statusText}`);
    }

    logger.info(`Email sent via Resend to ${email}`);
  } else {
    await transporter.sendMail({
      from: process.env.MY_GMAIL,
      to: email,
      subject,
      text
    });
    logger.info(`Email sent to ${email}`);
  }
};

export const isEmailMockMode = () => {
  initTransporter();
  return useMock;
};
