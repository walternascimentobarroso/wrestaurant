import type { ChecklistItem, ChecklistStore, ChecklistTemplate } from "../types";

const OPENING_TEMPLATE_ID = "template-opening";
const CLOSING_TEMPLATE_ID = "template-closing";

export const SEED_TEMPLATES: ChecklistTemplate[] = [
  {
    id: OPENING_TEMPLATE_ID,
    type: "opening",
    title: "Abertura",
    timeWindowStart: "06:30",
    timeWindowEnd: "07:00",
    sortOrder: 0,
    active: true,
  },
  {
    id: CLOSING_TEMPLATE_ID,
    type: "closing",
    title: "Fecho",
    timeWindowStart: "19:30",
    timeWindowEnd: "20:00",
    sortOrder: 1,
    active: true,
  },
];

const OPENING_GENERAL_ITEMS: string[] = [
  "Colocar placa de preço externa",
  "Desligar o alarme e ligar as luzes",
  "Subir os stores",
  "Receber os fornecedores de bolos e pães",
  "Checar se os itens vêm corretamente",
  "Tirar a máquina de cartão do carregador",
  "Ligar o open",
  "Limpar balcão",
  "Limpar os vidros da frente",
  "Limpar os vidros da montra",
  "Pegar os pães com o fornecedor (ele deixa na loja no primeiro horário)",
  "Organizar a montra para ficar visivelmente chamativa",
  "Assar os salgados",
  "Colocar os sacos de lixos na lixeira",
  "Colocar os sacos de lixos na lixeira do banheiro",
  "Colocar os sacos de lixos na lixeira de perto da máquina de café",
  "Colocar os sacos de lixos na lixeira da cozinha",
  "Colocar a água com sabão na vasilha de lavar louça",
  "Pegar panos limpos",
  "Lavar os panos de molho",
  "Colocar as cadeiras e mesas para fora",
];

const OPENING_MONDAY_ITEMS: string[] = [
  "Colocar o óleo da fritadeira",
  "Édellen trazer panos secos e limpos",
];

const OPENING_FRIDAY_ITEMS: string[] = [
  "Às ~6:50 — Limpeza do condomínio na frente do prédio",
];

const CLOSING_GENERAL_ITEMS: string[] = [
  "Recolher placa de preço externa",
  "Recolher placa interna",
  "Contar o caixa",
  "Deixar o troco para o dia seguinte",
  "Lavar o banheiro",
  "Tirar o lixo do banheiro (se o lixeiro tiver sujo, lavar)",
  "Tirar o lixo de perto da máquina de café (se o lixeiro tiver sujo, lavar)",
  "Tirar o lixo da cozinha (se o lixeiro tiver sujo, lavar)",
  "Desligar o open",
  "Deixar a máquina de cartão no carregador",
  "Remover a água da vasilha de lavar louça",
  "Deixar os panos de molho",
  "Varrer o chão e passar o pano",
  "Colocar as cadeiras e mesas para dentro",
  "Baixar os stores",
  "Ligar o alarme e desligar as luzes",
  "Jogar os lixos nos lugares correspondentes",
  "Limpar o exaustor",
  "Limpar cozinha",
  "Limpar as mesas e cadeiras",
];

const CLOSING_FRIDAY_ITEMS: string[] = [
  "Retirar o óleo da fritadeira",
  "Remover todos os sacos de lixos mesmo que não estejam completos",
  "Entregar os panos para Édellen lavar em casa",
];

function buildItems(
  templateId: string,
  labels: string[],
  daysOfWeek: ChecklistItem["daysOfWeek"],
  idPrefix: string,
  sortOrderStart: number,
): ChecklistItem[] {
  return labels.map((label, index) => ({
    id: `${idPrefix}-${String(index + 1).padStart(2, "0")}`,
    templateId,
    label,
    sortOrder: sortOrderStart + index,
    daysOfWeek,
    active: true,
  }));
}

export function buildSeedChecklistItems(): ChecklistItem[] {
  const openingGeneral = buildItems(
    OPENING_TEMPLATE_ID,
    OPENING_GENERAL_ITEMS,
    "all",
    "opening-general",
    0,
  );

  const openingMonday = buildItems(
    OPENING_TEMPLATE_ID,
    OPENING_MONDAY_ITEMS,
    [1],
    "opening-monday",
    openingGeneral.length,
  );

  const openingFriday = buildItems(
    OPENING_TEMPLATE_ID,
    OPENING_FRIDAY_ITEMS,
    [5],
    "opening-friday",
    openingGeneral.length + openingMonday.length,
  );

  const closingGeneral = buildItems(
    CLOSING_TEMPLATE_ID,
    CLOSING_GENERAL_ITEMS,
    "all",
    "closing-general",
    0,
  );

  const closingFriday = buildItems(
    CLOSING_TEMPLATE_ID,
    CLOSING_FRIDAY_ITEMS,
    [5],
    "closing-friday",
    closingGeneral.length,
  );

  return [
    ...openingGeneral,
    ...openingMonday,
    ...openingFriday,
    ...closingGeneral,
    ...closingFriday,
  ];
}

export function buildSeedChecklists(): ChecklistStore {
  return {
    templates: SEED_TEMPLATES,
    items: buildSeedChecklistItems(),
    completions: [],
  };
}

export const OPENING_TEMPLATE = SEED_TEMPLATES[0];
export const CLOSING_TEMPLATE = SEED_TEMPLATES[1];
