// =====================================================
// Regras do carrinho usadas pelo cardápio e pelo checkout
// =====================================================

// Lanche "personalizado" = tem adicional ou observação
export function temPersonalizacao(item: any): boolean {
  return (
    (item?.adicionais?.length ?? 0) > 0 ||
    !!item?.observacao?.trim()
  );
}

// Lanche personalizado vira uma linha por unidade:
// "2x X-Tudo + Bacon" -> duas linhas "1x X-Tudo + Bacon".
// Assim o cliente edita cada um e a cozinha vê separado.
// Lanche sem personalização continua agrupado (2x X-Burguer).
export function separarItensPersonalizados(itens: any[]): any[] {
  const resultado: any[] = [];

  for (const item of itens ?? []) {
    if (!temPersonalizacao(item) || item.quantidade <= 1) {
      resultado.push(item);
      continue;
    }

    for (let i = 0; i < item.quantidade; i++) {
      resultado.push(copiarItem(item, 1));
    }
  }

  return resultado;
}

export function copiarItem(item: any, quantidade: number): any {
  return {
    ...item,
    quantidade,
    adicionais: (item.adicionais ?? []).map((a: any) => ({ ...a }))
  };
}

// Valor de UM lanche: produto + adicionais (cada um × sua quantidade)
export function valorUnitarioItem(item: any): number {
  let total = paraNumero(item.preco);

  for (const adicional of item.adicionais ?? []) {
    total += paraNumero(adicional.preco) * (adicional.quantidade ?? 1);
  }

  return total;
}

// "Bacon" ou "2x Bacon"
export function nomeAdicional(adicional: any): string {
  const quantidade = adicional.quantidade ?? 1;

  return quantidade > 1
    ? `${quantidade}x ${adicional.nome}`
    : adicional.nome;
}

function paraNumero(valor: any): number {
  return Number((valor ?? 0).toString().replace(',', '.')) || 0;
}
