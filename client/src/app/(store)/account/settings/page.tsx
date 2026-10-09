import type { Metadata } from "next";
import { SettingsView } from "@/components/account/settings-view";

export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false, follow: false },
};

export default function AccountSettingsPage() {
  return <SettingsView />;
}
