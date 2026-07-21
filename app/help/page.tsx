import { HelpHubPage } from "@/components/help/help-pages";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function HelpPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <HelpHubPage initialQuery={sp.q?.trim() || ""} />;
}
