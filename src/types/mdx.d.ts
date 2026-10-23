declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { MDXProps } from "mdx/types";
  export const note: import("../lib/note-metadata").NoteMetadata;
  export const toc: import("../lib/note-metadata").TocEntry[] | undefined;
  const Content: ComponentType<MDXProps>;
  export default Content;
}
