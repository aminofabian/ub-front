import { HelpHubPage } from "@/components/help/help-pages";

// Next static export (`output: "export"`, desktop SKU) cannot await
// `searchParams` at prerender time. The `?q=` prefill is read client-side by
// HelpSearch, so this page needs no searchParams dependency.
export default function HelpPage() {
  return <HelpHubPage />;
}
