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

As escolhas e os itens marcados ficam no `localStorage` do navegador.
