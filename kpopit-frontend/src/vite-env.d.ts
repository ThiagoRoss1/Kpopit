/// <reference types="vite/client" />
/// <reference types="wicg-file-system-access" />

declare module "*.svg?react" {
  import * as React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}