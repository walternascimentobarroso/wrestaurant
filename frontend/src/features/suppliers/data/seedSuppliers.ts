import type { Supplier } from "../types";

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: "supplier-edp",
    name: "EDP Comercial",
    contactName: "Linha de apoio",
    email: "clientes@edp.pt",
    phone: "808 505 505",
    notes: "Energia elétrica",
    createdAt: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "supplier-agua",
    name: "Águas do Litoral",
    contactName: "Atendimento",
    email: "faturacao@aguaslitoral.pt",
    phone: "800 200 300",
    createdAt: "2026-01-10T09:00:00.000Z",
  },
  {
    id: "supplier-contabilista",
    name: "Silva & Associados",
    contactName: "Dr. Ricardo Silva",
    email: "ricardo@silvaassociados.pt",
    phone: "+351 912 345 678",
    notes: "Contabilidade e impostos",
    createdAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "supplier-imobiliaria",
    name: "Imobiliária Centro",
    contactName: "Ana Ferreira",
    email: "ana@imobcentro.pt",
    phone: "+351 213 456 789",
    notes: "Aluguel do espaço",
    createdAt: "2026-02-01T11:00:00.000Z",
  },
  {
    id: "supplier-nos",
    name: "NOS Comunicações",
    email: "empresas@nos.pt",
    phone: "1699",
    notes: "Internet e telefone",
    createdAt: "2026-02-01T11:00:00.000Z",
  },
  {
    id: "supplier-galp",
    name: "Galp Gás Natural",
    phone: "808 280 280",
    createdAt: "2026-03-01T08:00:00.000Z",
  },
];
