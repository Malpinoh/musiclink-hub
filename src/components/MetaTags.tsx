import { useEffect } from "react";
import { applyMeta, MetaDescriptor } from "@/lib/seoMeta";

/**
 * Applies a fully-built metadata descriptor to the document head.
 * Use the builders in `@/lib/seoMeta` to create the descriptor.
 */
const MetaTags = ({ meta }: { meta: MetaDescriptor }) => {
  const key = JSON.stringify(meta);

  useEffect(() => {
    return applyMeta(JSON.parse(key) as MetaDescriptor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
};

export default MetaTags;
