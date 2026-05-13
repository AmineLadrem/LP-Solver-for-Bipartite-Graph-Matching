declare module "react-katex" {
  import type { FC } from "react";
  interface KatexProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
  }
  export const InlineMath: FC<KatexProps>;
  export const BlockMath: FC<KatexProps>;
}
