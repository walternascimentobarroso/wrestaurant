import { TableDetailPage } from "@/features/tables/components/TableDetailPage";

interface MesaPageProps {
  params: Promise<{ id: string }>;
}

export default async function MesaPage({ params }: MesaPageProps) {
  const { id } = await params;
  const tableId = Number(id);

  return <TableDetailPage tableId={tableId} />;
}
