import { redirect } from "next/navigation";

/** `/account` is not a page of its own — settings is where a customer means to land. */
export default function AccountIndexPage() {
  redirect("/account/settings");
}
