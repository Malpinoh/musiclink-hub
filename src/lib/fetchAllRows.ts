import { supabase } from "@/integrations/supabase/client";

type Builder = ReturnType<ReturnType<typeof supabase.from>["select"]>;

/**
 * Paginate a Supabase query to fetch ALL matching rows, bypassing the 1000-row cap.
 * Pass a function that returns a fresh query each call (PostgREST builders aren't reusable).
 *
 *   const all = await fetchAllRows(() => supabase.from("clicks").select("clicked_at").eq("fanlink_id", id));
 */
export async function fetchAllRows<T = unknown>(
  buildQuery: () => Builder,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // safety: cap at 200 pages = 200k rows
  for (let i = 0; i < 200; i++) {
    const { data, error } = (await buildQuery().range(from, from + pageSize - 1)) as {
      data: T[] | null;
      error: unknown;
    };
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
