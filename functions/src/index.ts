/* eslint-disable */
import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";
import { defineString } from "firebase-functions/params";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Define environment variables/secrets for the function
const smtpHost = defineString("SMTP_HOST");
const smtpPort = defineString("SMTP_PORT");
const smtpUser = defineString("SMTP_USER");
const smtpPass = defineString("SMTP_PASS");
const allowedOrigin = defineString("ALLOWED_ORIGIN", {
  default: "https://bounteouscodex.vercel.app",
  description: "The URL of the web app allowed to call this function.",
});

// A simple email template
const createEmailHtml = (name: string, quizTitle: string, link: string) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
      .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; }
      footer { margin-top: 20px; font-size: 0.8em; color: #777; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Hello ${name},</h2>
      <p>You have been invited to take the following quiz: <strong>${quizTitle}</strong>.</p>
      <p>Please click the button below to start your assessment. The link will expire, so please complete it in a timely manner.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${link}" class="button">Start Quiz</a>
      </p>
      <p>If you have any questions, please contact the HR department.</p>
      <footer>
        <p>This is an automated message from the CodePrep platform.</p>
      </footer>
    </div>
  </body>
  </html>
`;

export const createAndSendExternalAssignment = onCall(
  { 
    secrets: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] 
  },
  async (request) => {
    // 1. Validate data from the client
    const {
      name,
      email,
      quizId,
      quizTitle,
      expiresAt: expiresAtISO, // Expecting ISO date string from client
    } = request.data;

    if (!name || !email || !quizId || !quizTitle || !expiresAtISO) {
      logger.error("Missing required data from client", request.data);
      throw new HttpsError(
        "invalid-argument",
        "Missing required data fields."
      );
    }

    const expiresAt = Timestamp.fromDate(new Date(expiresAtISO));
    const assignmentData = {
      name,
      email,
      quizId,
      quizTitle,
      expiresAt,
      createdAt: Timestamp.now(),
    };

    try {
      // 2. Create the assignment document in Firestore
      logger.info("Creating Firestore document for:", { email, quizId });
      const assignmentRef = await db
        .collection("externalCandidates")
        .add(assignmentData);
      const assignmentId = assignmentRef.id;
      logger.info("Successfully created document with ID:", assignmentId);
      
      const origin = request.rawRequest.headers.origin || allowedOrigin.value();
      const quizLink = `${origin}/take-quiz/${assignmentId}`;
      //const quizLink = `${allowedOrigin.value()}/take-quiz/${assignmentId}`;

      // 3. Initialize Nodemailer and send the email
      const transporter = nodemailer.createTransport({
          host: smtpHost.value(),
          port: parseInt(smtpPort.value(), 10),
          secure: parseInt(smtpPort.value(), 10) === 465, // true for 465, false for other ports
          auth: {
              user: smtpUser.value(),
              pass: smtpPass.value(),
          },
      });
      
      logger.info("Sending email via Nodemailer to:", email);


      
      await transporter.sendMail({
          from: "codex@bounteous.com",
          to: email,
          subject: `Invitation to take the ${quizTitle} Quiz`,
          html: createEmailHtml(name, quizTitle, quizLink),
      });
      logger.info("Email sent successfully.");

      // 4. Return the new assignment ID and the generated link to the client
      return { success: true, assignmentId, generatedLink: quizLink };

    } catch (error) {
      logger.error("An error occurred:", error);
      if (error instanceof Error) {
        throw new HttpsError("internal", error.message);
      }
      throw new HttpsError("internal", "An unknown error occurred.");
    }
  }
);