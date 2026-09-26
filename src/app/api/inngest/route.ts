import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { reconcileNaboopay } from "../../../inngest/functions/reconcile-naboopay";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    reconcileNaboopay,
  ],
});
