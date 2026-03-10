import { requireAdmin, getBusinessId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BranchForm } from "./branch-form";
import { MapPin, Phone } from "lucide-react";

export default async function BranchesPage() {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const branches = await prisma.branch.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branches</h1>
          <p className="text-muted-foreground">
            Manage your business locations.
          </p>
        </div>
        <BranchForm />
      </div>

      {branches.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-6 text-center text-sm text-muted-foreground">
              No branches yet. Click &quot;Add Branch&quot; to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  {branch.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={branch.isActive ? "default" : "secondary"}
                  >
                    {branch.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <BranchForm
                    branch={{
                      id: branch.id,
                      name: branch.name,
                      address: branch.address,
                      phone: branch.phone,
                      isActive: branch.isActive,
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {!branch.address && !branch.phone && (
                  <p className="text-sm text-muted-foreground">
                    No contact details added.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
