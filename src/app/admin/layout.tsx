import { requireAuth } from "@/lib/auth-guard";
import { SessionProvider } from "@/components/session-provider";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <SessionProvider>
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar businessName={session.user.businessName} />
        <main className="md:ml-64">
          <div className="p-4 pt-16 md:p-8 md:pt-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
