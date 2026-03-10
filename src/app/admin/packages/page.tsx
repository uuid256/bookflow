import { requireAuth, getBusinessId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageForm, AssignPackageForm } from "./package-form";

export default async function PackagesPage() {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const [packages, services, customers, customerPackages] = await Promise.all([
    prisma.package.findMany({
      where: { businessId },
      include: {
        packageServices: {
          include: { service: { select: { id: true, name: true } } },
        },
        _count: { select: { customerPackages: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customerPackage.findMany({
      where: { package: { businessId } },
      include: {
        customer: { select: { name: true, email: true } },
        package: { select: { name: true, totalSessions: true } },
      },
      orderBy: { purchasedAt: "desc" },
    }),
  ]);

  const activePackages = packages
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Packages</h1>
          <p className="text-muted-foreground">
            Manage session packages and customer assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AssignPackageForm customers={customers} packages={activePackages} />
          <PackageForm services={services} />
        </div>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="customer-packages">
            Customer Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>All Packages</CardTitle>
            </CardHeader>
            <CardContent>
              {packages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No packages yet. Click &quot;Add Package&quot; to create one.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Valid Days</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Customers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{pkg.name}</p>
                            {pkg.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{pkg.totalSessions}</TableCell>
                        <TableCell>{formatCurrency(pkg.price)}</TableCell>
                        <TableCell>{pkg.validDays} days</TableCell>
                        <TableCell>
                          {pkg.packageServices.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pkg.packageServices.map((ps) => (
                                <Badge key={ps.id} variant="secondary" className="text-xs">
                                  {ps.service.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              All services
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {pkg._count.customerPackages}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={pkg.isActive ? "default" : "secondary"}
                          >
                            {pkg.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <PackageForm
                            pkg={{
                              id: pkg.id,
                              name: pkg.name,
                              description: pkg.description,
                              totalSessions: pkg.totalSessions,
                              price: pkg.price,
                              validDays: pkg.validDays,
                              isActive: pkg.isActive,
                              serviceIds: pkg.packageServices.map(
                                (ps) => ps.serviceId
                              ),
                            }}
                            services={services}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-packages">
          <Card>
            <CardHeader>
              <CardTitle>Customer Packages</CardTitle>
            </CardHeader>
            <CardContent>
              {customerPackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No packages assigned yet. Click &quot;Assign Package&quot; to
                  assign one to a customer.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerPackages.map((cp) => (
                      <TableRow key={cp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cp.customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {cp.customer.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{cp.package.name}</TableCell>
                        <TableCell>
                          {cp.remainingSessions} / {cp.package.totalSessions}
                        </TableCell>
                        <TableCell>{formatDate(cp.purchasedAt)}</TableCell>
                        <TableCell>{formatDate(cp.expiresAt)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              cp.status === "ACTIVE"
                                ? "default"
                                : cp.status === "EXPIRED"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {cp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
