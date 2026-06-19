import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AlertasView } from "./alertas-view";

export default async function AlertasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <AlertasView />;
}
