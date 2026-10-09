import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "./product-grid";

/** Every data view has a skeleton while it loads (S-14), and a live region so the wait is announced. */
function Loading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span role="status" className="sr-only">
        Loading
      </span>
      {children}
    </>
  );
}

export function CatalogueLoading() {
  return (
    <Loading>
      <Container className="py-8">
        <Skeleton className="mb-4 h-3 w-40" />
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="hidden gap-4 lg:grid">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-36 w-full" />
            ))}
          </div>
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-48" />
            </div>
            <ProductGridSkeleton count={8} />
          </div>
        </div>
      </Container>
    </Loading>
  );
}

export function ProductLoading() {
  return (
    <Loading>
      <Container className="py-8">
        <Skeleton className="mb-5 h-3 w-56" />
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <Skeleton className="aspect-square w-full" />
          <div className="grid content-start gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </Container>
    </Loading>
  );
}

export function HomeLoading() {
  return (
    <Loading>
      <Skeleton className="h-[420px] w-full rounded-none" />
      <Container className="grid gap-8 py-12">
        <Skeleton className="h-7 w-56" />
        <ProductGridSkeleton count={8} />
      </Container>
    </Loading>
  );
}
