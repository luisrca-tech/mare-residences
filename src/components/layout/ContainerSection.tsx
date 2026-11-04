import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ContainerSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  fillChildren?: boolean;
}

export function ContainerSection({
  children,
  className,
  fillChildren = false,
  ...rest
}: ContainerSectionProps) {
  return (
    <div
      {...rest}
      className={cn(
        "m-auto h-full w-full max-w-360 px-4 md:px-10 2xl:max-w-480",
        fillChildren && "lg:*:h-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
