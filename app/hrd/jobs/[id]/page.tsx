import HrdJobDetailClient from "./HrdJobDetailClient";

export default async function HrdJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HrdJobDetailClient jobId={Number(id)} />;
}