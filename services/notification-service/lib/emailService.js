import nodemailer from "nodemailer";
import { createLogger } from "shared";

const logger = createLogger("notification-email");

let transporter = null;
let useMock = true;
let initialized = false;

const initTransporter = () => {
  if (initialized) return;
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

  await transporter.sendMail({
    from: process.env.MY_GMAIL,
    to: email,
    subject,
    text
  });
  logger.info(`Email sent to ${email}`);
};

export const isEmailMockMode = () => {
  initTransporter();
  return useMock;
};
