"use client";

import { useState } from "react";
import { ORDER_STATUS } from "@aib/shared";
import { HeartIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { logoManifest, type LogoVariant } from "@/components/brand/logo-manifest";
import { Container } from "@/components/shared/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { PriceTag } from "@/components/ui/price-tag";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, StockBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The design system on one page: every primitive, every variant, every state.
 *
 * This file is `page.dev.tsx`, so it is a route in development only — `next.config.ts` drops `dev.tsx` from
 * the page extensions when building for production, and the route is not compiled into the output at all.
 */

const TYPE_SCALE = [
  ["Display 48/700", "text-display"],
  ["H1 32/700", "text-h1"],
  ["H2 24/600", "text-h2"],
  ["H3 20/600", "text-h3"],
  ["H4 16/500", "text-h4"],
  ["Body 16/400", "text-body"],
  ["Body small 14", "text-body-sm"],
  ["Label 13/600 tracked", "text-label uppercase"],
  ["Caption 12 muted", "text-caption text-text-muted"],
] as const;

const COLOURS = [
  ["brand-primary", "#156FBF", "bg-brand-primary"],
  ["brand-navy", "#1E2A35", "bg-brand-navy"],
  ["brand-grey", "#88939E", "bg-brand-grey"],
  ["text-muted", "#646F7A", "bg-text-muted"],
  ["primary-50", "#EAF2FA", "bg-primary-50"],
  ["primary-700", "#0D4475", "bg-primary-700"],
  ["grey-100", "#F1F4F6", "bg-grey-100"],
  ["grey-200", "#DFE4E8", "bg-grey-200"],
  ["success", "#16A34A", "bg-success"],
  ["warning", "#D97706", "bg-warning"],
  ["danger", "#DC2626", "bg-danger"],
] as const;

export default function StyleGuidePage() {
  const [qty, setQty] = useState(2);
  const [checked, setChecked] = useState(true);

  return (
    <TooltipProvider>
      <Container className="grid gap-12 py-12">
        <header className="grid gap-2">
          <Badge variant="warning">Development only</Badge>
          <h1 className="text-h1">ALI_IWANBUY Gadgets — style guide</h1>
          <p className="text-body text-text-muted">
            Every primitive the storefront is built from. Montserrat only; colours come from the tokens in
            `globals.css`.
          </p>
        </header>

        <Section title="Logo">
          <div className="flex flex-wrap items-end gap-8">
            {(Object.keys(logoManifest) as LogoVariant[]).map((variant) => (
              <div key={variant} className="grid gap-2">
                <div
                  className={
                    variant === "white" || variant === "markWhite" || variant === "horizontalWhite"
                      ? "rounded-md bg-brand-navy p-4"
                      : "rounded-md border border-grey-200 p-4"
                  }
                >
                  <Logo variant={variant} width={variant === "mark" || variant === "markWhite" ? 48 : 150} />
                </div>
                <p className="text-caption text-text-muted">
                  {variant}
                  {logoManifest[variant].placeholder ? " · placeholder" : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {COLOURS.map(([name, hex, className]) => (
              <li key={name} className="grid gap-1">
                <span className={`block h-14 rounded-md border border-grey-200 ${className}`} />
                <span className="text-caption font-medium">{name}</span>
                <span className="text-caption numeric text-text-muted">{hex}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Typography">
          <div className="grid gap-3">
            {TYPE_SCALE.map(([name, className]) => (
              <div key={name} className="flex flex-wrap items-baseline gap-4">
                <span className="w-44 shrink-0 text-caption text-text-muted">{name}</span>
                <span className={className}>Clean. Modern. Reliable.</span>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="w-44 shrink-0 text-caption text-text-muted">numeric utility</span>
              <span className="text-h3 numeric">₦1,250,000 · AIB-ORD-202610-0001</span>
            </div>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="grid gap-4">
            {(["primary", "dark", "outline", "ghost", "danger", "link", "onDark"] as const).map((variant) => (
              <div
                key={variant}
                className={`flex flex-wrap items-center gap-3 rounded-md p-3 ${variant === "onDark" ? "bg-brand-navy" : ""}`}
              >
                <span className="w-20 shrink-0 text-caption text-text-muted">{variant}</span>
                <Button variant={variant}>Default</Button>
                <Button variant={variant} data-preview="hover">
                  Hover
                </Button>
                <Button variant={variant} data-preview="active">
                  Active
                </Button>
                <Button variant={variant} data-preview="focus">
                  Focus
                </Button>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
                <Button variant={variant} loading loadingLabel="Working…">
                  Loading
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-20 shrink-0 text-caption text-text-muted">sizes</span>
              <Button size="sm">Small</Button>
              <Button>Default 44px</Button>
              <Button size="hero">Hero 48px</Button>
              <Button size="icon" aria-label="Favourite">
                <HeartIcon />
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            {(["neutral", "brand", "outline", "success", "warning", "danger"] as const).map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUS.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <StockBadge stock={12} />
            <StockBadge stock={2} />
            <StockBadge stock={1} />
            <StockBadge stock={0} />
          </div>
        </Section>

        <Section title="Price">
          <div className="flex flex-wrap items-end gap-8">
            <PriceTag priceKobo={125_000_000} size="sm" />
            <PriceTag priceKobo={125_000_000} compareAtPriceKobo={149_000_000} />
            <PriceTag priceKobo={28_500_000} compareAtPriceKobo={32_000_000} size="lg" from />
          </div>
        </Section>

        <Section title="Form controls">
          <div className="grid max-w-md gap-4">
            <Field label="Email address" hint="We use this for your order updates.">
              {(control) => <Input {...control} type="email" placeholder="you@example.com" />}
            </Field>
            <Field label="Phone" error="Enter a Nigerian phone number.">
              {(control) => <Input {...control} defaultValue="0803" />}
            </Field>
            <Field label="Disabled">
              {(control) => <Input {...control} disabled value="Locked" readOnly />}
            </Field>

            <div className="grid gap-2">
              <Label htmlFor="sg-select">Sort</Label>
              <Select defaultValue="newest">
                <SelectTrigger id="sg-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="sg-check"
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
              />
              <Label htmlFor="sg-check" className="font-normal">
                In stock only
              </Label>
            </div>

            <RadioGroup defaultValue="pickup">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pickup" id="sg-pickup" />
                <Label htmlFor="sg-pickup" className="font-normal">
                  Pickup at the shop
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="delivery" id="sg-delivery" />
                <Label htmlFor="sg-delivery" className="font-normal">
                  Delivery
                </Label>
              </div>
            </RadioGroup>

            <QuantityStepper value={qty} onChange={setQty} max={5} />
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove this item?</DialogTitle>
                  <DialogDescription>It will be taken out of your cart.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Keep it</Button>
                  <Button variant="danger">Remove</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Panel</SheetTitle>
                </SheetHeader>
                <p className="p-5 text-body-sm text-text-muted">Used for the mini-cart and mobile filters.</p>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign in</DropdownMenuItem>
                <DropdownMenuItem>Create account</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Only two left in stock</TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              onClick={() => toast.success("Added to cart", { description: "iPhone 15" })}
            >
              Toast
            </Button>
          </div>
        </Section>

        <Section title="Containers">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>White, 10px radius, 1px border.</CardDescription>
              </CardHeader>
              <CardContent>Cards hold summaries, totals and forms.</CardContent>
            </Card>

            <div className="grid gap-3">
              <Tabs defaultValue="one">
                <TabsList>
                  <TabsTrigger value="one">Specifications</TabsTrigger>
                  <TabsTrigger value="two">Delivery</TabsTrigger>
                </TabsList>
                <TabsContent value="one" className="text-body-sm text-text-muted">
                  Tab content one.
                </TabsContent>
                <TabsContent value="two" className="text-body-sm text-text-muted">
                  Tab content two.
                </TabsContent>
              </Tabs>
              <Separator />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>

          <EmptyState
            icon={<SearchIcon />}
            title="Nothing matches those filters"
            description="Try widening the price range."
            action={<Button variant="outline">Clear filters</Button>}
          />

          <Pagination page={3} pages={9} hrefFor={(page) => `/style-guide?page=${page}`} />
        </Section>
      </Container>
    </TooltipProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="border-b border-grey-200 pb-2 text-h2">{title}</h2>
      {children}
    </section>
  );
}
