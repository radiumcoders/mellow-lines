import { cn } from "@/lib/utils";

function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn(`w-full max-w-4xl mx-auto ${className}`)}>
      {children}
    </main>
  );
}

export default Container;
