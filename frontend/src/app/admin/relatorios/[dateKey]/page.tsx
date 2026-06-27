import { AdminReportDetailPage } from "@/features/admin/components/AdminReportDetailPage";

export default async function AdminRelatorioDetailPage({
  params,
}: Readonly<{
  params: Promise<{ dateKey: string }>;
}>) {
  const { dateKey } = await params;

  return <AdminReportDetailPage dateKey={dateKey} />;
}
