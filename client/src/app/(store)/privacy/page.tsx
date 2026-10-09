import type { Metadata } from "next";
import { Article } from "@/components/shared/article";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What ALI_IWANBUY Gadgets collects, why, and how to ask us to delete it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Article
      title="Privacy"
      standfirst={`How ${SITE.legalName} handles the information you give us when you shop here.`}
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you create an account</strong> — your name, email address and, if you give it, your
          phone number. Your email address cannot be changed afterwards, because it identifies your orders.
        </li>
        <li>
          <strong>When you order</strong> — the delivery address you enter, what you bought, and how you chose
          to pay. If you pay by transfer, the reference you give us.
        </li>
        <li>
          <strong>While you browse</strong> — your cart, kept in your own browser, and a session cookie once
          you sign in. We do not run advertising trackers.
        </li>
      </ul>

      <h2>Why we hold it</h2>
      <p>
        To take and fulfil your order, to confirm your payment, to issue an invoice, to answer you when you
        call about an order, and to keep the records a registered Nigerian company is required to keep.
      </p>

      <h2>Who else sees it</h2>
      <p>
        The courier who delivers your order sees your name, address and phone number. Our email provider
        handles the messages we send you. Nobody buys this information from us, because we do not sell it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order and invoice records are kept for as long as the law requires. Account details are kept until you
        ask us to close the account.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask for a copy of what we hold about you, ask us to correct it, or ask us to close your
        account and delete what we are not required to keep. Email{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call <a href={SITE.phoneHref}>{SITE.phone}</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        We use one cookie to keep you signed in, and your browser&apos;s own storage to remember your cart. No
        advertising or analytics cookies are set by this site.
      </p>
    </Article>
  );
}
