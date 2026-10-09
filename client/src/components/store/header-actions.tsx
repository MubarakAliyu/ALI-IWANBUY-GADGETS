"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HeartIcon, LogOutIcon, PackageIcon, SettingsIcon, ShoppingBagIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/account";
import { cartCount, useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";

/**
 * The cart button (S-1). The count only appears once the persisted cart has been read, so the server-rendered
 * header and the first client render agree.
 */
export function CartButton() {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const setMiniCartOpen = useUiStore((state) => state.setMiniCartOpen);
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart, empty"}
      data-testid="cart-button"
      onClick={() => setMiniCartOpen(true)}
      className="relative"
    >
      <ShoppingBagIcon aria-hidden="true" className="size-5" />
      {count > 0 ? (
        <span
          data-testid="cart-count"
          className="absolute top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-caption font-semibold numeric text-white"
        >
          {count}
        </span>
      ) : null}
    </Button>
  );
}

/** The wishlist icon, with its count once someone is signed in (S-7). */
export function WishlistButton() {
  const { isSignedIn, customer } = useSession();
  const count = customer?.wishlistCount ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      aria-label={isSignedIn && count > 0 ? `Wishlist, ${count} saved` : "Wishlist"}
      className="relative hidden sm:inline-flex"
    >
      <Link href={isSignedIn ? "/account/wishlist" : "/login?next=/account/wishlist"}>
        <HeartIcon aria-hidden="true" className="size-5" />
        {count > 0 ? (
          <span
            data-testid="wishlist-count"
            className="absolute top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-caption font-semibold numeric text-white"
          >
            {count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

/** The account menu (S-1): the signed-out items until there is a session, then the customer's own. */
export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { customer, isSignedIn, refresh } = useSession();
  const clearCart = useCartStore((state) => state.clear);

  async function signOut() {
    await logout();
    clearCart();
    await refresh();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isSignedIn ? `Account menu for ${customer?.firstName}` : "Account"}
          data-testid="account-menu"
        >
          <UserIcon aria-hidden="true" className="size-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {isSignedIn && customer ? (
          <>
            <DropdownMenuLabel>Hello, {customer.firstName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account/settings">
                <SettingsIcon aria-hidden="true" />
                Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders">
                <PackageIcon aria-hidden="true" />
                My orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/wishlist">
                <HeartIcon aria-hidden="true" />
                Wishlist
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOutIcon aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/register?next=${encodeURIComponent(pathname)}`}>Create account</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login?next=/account/orders">My orders</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/login?next=/account/wishlist">Wishlist</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
