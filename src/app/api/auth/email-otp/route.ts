import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";

/**
 * Optional email verification code flow (secondary to Google OAuth).
 * Without SMTP_* env keys, the code is logged server-side only (dev/demo).
 * Real delivery requires SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM.
 */
const codes = new Map<string, { code: string; expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const action = String(body.action || "send");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail invalide." }, { status: 400 });
    }

    if (action === "verify") {
      const code = String(body.code || "").trim();
      const entry = codes.get(email);
      if (!entry || entry.expires < Date.now() || entry.code !== code) {
        return NextResponse.json(
          { error: "Code invalide ou expiré." },
          { status: 400 }
        );
      }
      codes.delete(email);
      return NextResponse.json({ ok: true, verified: true });
    }

    const code = String(randomInt(100000, 999999));
    codes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });

    const smtpReady = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );

    if (!smtpReady) {
      console.info(
        `[email-otp] SMTP non configuré — code pour ${email}: ${code} (valide 10 min)`
      );
      return NextResponse.json({
        ok: true,
        delivered: false,
        note: "SMTP non configuré : le code est loggé côté serveur uniquement. Configurez SMTP_* pour un envoi réel.",
        // Expose only in non-production for demos
        demoCode:
          process.env.NODE_ENV === "production" ? undefined : code,
      });
    }

    // Placeholder: real nodemailer/send would go here when SMTP keys exist.
    console.info(`[email-otp] would send ${code} to ${email} via SMTP`);
    return NextResponse.json({
      ok: true,
      delivered: false,
      note: "SMTP détecté mais l'envoi réel n'est pas encore branché — code loggé.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
