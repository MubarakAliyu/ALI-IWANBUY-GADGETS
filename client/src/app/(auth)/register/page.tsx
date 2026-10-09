import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/account/register-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an ALI_IWANBUY Gadgets account to check out, keep a wishlist and follow your orders.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
      <RegisterForm />
    </Suspense>
  );
}
