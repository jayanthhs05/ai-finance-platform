"use server";

import { Resend } from "resend";

export async function sendEmail({ to, subject, react }) {
  const resend = new Resend(process.env.RESEND_API_KEY || "");

  console.log(`Attempting to send email to: ${to} with subject: ${subject}`);

  try {
    const { data, error } = await resend.emails.send({
      from: "Finance App <onboarding@resend.dev>",
      to: [to],
      subject,
      react,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return { success: false, error };
    }

    console.log("Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email (Exception):", error);
    return { success: false, error };
  }
}
