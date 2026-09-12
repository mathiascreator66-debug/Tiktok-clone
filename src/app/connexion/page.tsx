import AuthForm from "@/components/AuthForm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ConnexionPage() {
  const session = await getSession();
  if (session) redirect("/");
  return <AuthForm mode="login" />;
}
