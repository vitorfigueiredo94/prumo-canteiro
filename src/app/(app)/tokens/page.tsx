import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PortalClienteView } from "../portal/portal-view";

export default async function TokensPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <PortalClienteView />;
}
