import type { Metadata } from "next";
import { ChoosePasswordForm } from "@/components/admin/choose-password-form";

export const metadata: Metadata = { title: "Choose your password" };

export default function ChoosePasswordPage() {
  return <ChoosePasswordForm />;
}
