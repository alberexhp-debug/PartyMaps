This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Iconos de juego (assets opcionales)

Cada juego del catálogo tiene un icono propio minimalista integrado en el código
(`src/components/todh/gameGlyphs.tsx`), pintado con el color del juego. Si prefieres
usar el logo oficial de un juego (obtenido por tu cuenta de su press kit), colócalo en:

```
public/assets/games/<slug>.svg    (preferido)
public/assets/games/<slug>.png    (alternativa)
```

`GameIcon` lo detecta y lo usa automáticamente, tal cual (respetando sus colores).
Prioridad de resolución: **1)** `<slug>.svg` → **2)** `<slug>.png` → **3)** glifo propio
integrado → **4)** para juegos creados en runtime sin glifo, la inicial del nombre corto
sobre el color del juego. No hace falta tocar código ni reiniciar nada: basta con dejar
el archivo en la carpeta.

Slugs del catálogo:

| Slug       | Juego                       |
| ---------- | --------------------------- |
| `smash`    | Super Smash Bros. Ultimate  |
| `magic`    | Magic: The Gathering        |
| `pokemon`  | Pokémon TCG                 |
| `tft`      | Teamfight Tactics           |
| `tekken`   | Tekken 8                    |
| `sf6`      | Street Fighter 6            |
| `valorant` | VALORANT                    |
| `lol`      | League of Legends           |
| `cod`      | Call of Duty                |
| `cs`       | Counter-Strike 2            |

Los juegos dados de alta desde el panel usan como slug su `id`; el mismo mecanismo
(`/assets/games/<id>.svg|png`) funciona también para ellos.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
