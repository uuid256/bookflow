import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      businessId: string;
      branchId: string | null;
      businessName: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    businessId: string;
    branchId: string | null;
    businessName: string;
  }
}
