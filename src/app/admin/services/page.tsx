import { requireAuth, getBusinessId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
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
import { ServiceForm } from "./service-form";

export default async function ServicesPage() {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Manage the services your business offers.
          </p>
        </div>
        <ServiceForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No services yet. Click &quot;Add Service&quot; to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Buffer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.durationMinutes} min</TableCell>
                    <TableCell>{formatCurrency(service.price)}</TableCell>
                    <TableCell>
                      {service.depositAmount > 0
                        ? formatCurrency(service.depositAmount)
                        : "None"}
                    </TableCell>
                    <TableCell>
                      {service.bufferBefore > 0 || service.bufferAfter > 0 ? (
                        <span className="text-sm">
                          {service.bufferBefore > 0 &&
                            `${service.bufferBefore}m before`}
                          {service.bufferBefore > 0 &&
                            service.bufferAfter > 0 &&
                            ", "}
                          {service.bufferAfter > 0 &&
                            `${service.bufferAfter}m after`}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={service.isActive ? "default" : "secondary"}
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ServiceForm
                        service={{
                          id: service.id,
                          name: service.name,
                          description: service.description,
                          durationMinutes: service.durationMinutes,
                          price: service.price,
                          depositAmount: service.depositAmount,
                          depositPercent: service.depositPercent,
                          bufferBefore: service.bufferBefore,
                          bufferAfter: service.bufferAfter,
                          isActive: service.isActive,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
