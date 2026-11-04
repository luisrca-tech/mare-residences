import type { ReactNode } from "react";

export type ContainerProps = {
  children: ReactNode;
  className?: string;
  fullBleed?: boolean;
};

export type ActionLinkProps = ContainerProps & { href: string };

export type MeasuredHeaderProps = { children: ReactNode };
