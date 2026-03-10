import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  // Reject sessions for deactivated accounts without a DB roundtrip
  if ((session.user as any).isActive === false) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/admin");
  return session;
}

export function getBusinessId(session: any): string {
  return session.user.businessId;
}
