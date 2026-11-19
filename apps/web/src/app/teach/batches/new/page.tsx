import { DATA_LIVE } from "@/lib/data";
import BatchForm from "./BatchForm";

export default function NewBatchPage() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  return <BatchForm />;
}
