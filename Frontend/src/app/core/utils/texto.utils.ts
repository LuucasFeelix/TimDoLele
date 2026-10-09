// =====================================================
// Texto que vai para a impressora térmica
// =====================================================

// Mantém só o que a impressora térmica imprime:
// letras (com acento), números, espaço, quebra de linha
// e pontuação comum. Remove emojis e símbolos especiais.
// A mesma regra existe no backend (TextoHelper.cs).
const CARACTERES_NAO_PERMITIDOS =
  /[^A-Za-z0-9À-ÿ \n.,;:!?()\-\/'"%+*&@#$ºª°]/g;

export function limparTextoImpressao(texto: string): string {
  return (texto ?? '').replace(CARACTERES_NAO_PERMITIDOS, '');
}
