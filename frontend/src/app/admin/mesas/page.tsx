import dynamic from "next/dynamic";

import { AdminTablesPageLoading } from "@/features/admin/components/AdminTablesPageLoading";

const AdminTablesPage = dynamic(
  () =>
    import("@/features/admin/components/AdminTablesPage").then((module) => ({
      default: module.AdminTablesPage,
    })),
  { loading: () => <AdminTablesPageLoading /> },
);

export default function AdminMesasPage() {
  return <AdminTablesPage />;
}
