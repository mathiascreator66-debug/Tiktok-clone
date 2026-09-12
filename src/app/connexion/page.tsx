import AuthForm from "@/components/AuthForm";
import { getSession, isGoogleAuthConfigured } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function ConnexionPage() {
  const session = await getSession();
  if (session) redirect("/");
  const googleEnabled = isGoogleAuthConfigured();
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-black" />}>
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </Suspense>
  );
}
