# Minha dieta

Planejador semanal da dieta passada pela nutricionista. Para cada dia e refeição você escolhe a opção principal ou uma substituição, e a página monta a lista de compras da semana, convertendo os pesos do prato pronto para o peso cru de compra.

## Rodando

```bash
npm install
npm run dev
```

Build de produção: `npm run build` (saída em `dist/`). Checagem de tipos: `npm run typecheck`.

## Stack

Vite + React 18 + TypeScript, Tailwind CSS 3 e componentes no estilo shadcn/ui (Radix) em `src/components/ui`.

## Onde mexer

- `src/data.ts`: refeições, opções, porções e os fatores de conversão pronto → cru.
- `src/App.tsx`: tela do cardápio e da lista de compras.

## Persistência

As escolhas e os itens marcados ficam salvos no Firestore, num documento único em `cardapios/{VITE_CARDAPIO_ID}` (padrão `semana`), sem login. Assim o mesmo cardápio aparece em qualquer dispositivo. O cache offline do Firestore deixa usar sem internet e sincroniza quando a conexão volta. Sem as variáveis do Firebase, a página usa só o `localStorage`.

Para configurar:

1. Copie `.env.example` para `.env.local` e preencha com a config web do projeto Firebase.
2. Crie o banco Firestore no console e publique as regras de `firestore.rules`.
3. Na Vercel, cadastre as mesmas variáveis `VITE_*` no projeto.

Como não há login, qualquer pessoa com a config (que vai no bundle) consegue ler e alterar esse documento. As regras só limitam o formato do que é gravado.
