# Texturas Hiperrealistas de Losetas (Catan Tabletop)

Coloca tus imágenes `.webp` o `.png` en esta carpeta (`public/assets/tiles/`) con los siguientes nombres para que el motor SVG las inyecte automáticamente dentro de los hexágonos con bisel 3D y sombras proyectadas:

- `wood.webp` (o `wood.png`) — Bosque frondoso (Madera)
- `brick.webp` (o `brick.png`) — Colinas arcillosas (Arcilla)
- `sheep.webp` (o `sheep.png`) — Praderas y pastos (Oveja)
- `wheat.webp` (o `wheat.png`) — Campos de espigas doradas (Trigo)
- `ore.webp` (o `ore.png`) — Montañas escarpadas (Piedra/Mineral)
- `desert.webp` (o `desert.png`) — Dunas áridas y oasis (Desierto)
- `sea.webp` (o `sea.png`) — Océano con oleaje (Mar)
- `gold.webp` (o `gold.png`) — Río de Oro (Expansión Navegantes)

Mientras algún archivo no exista aún en disco, el motor renderiza automáticamente una textura procedural multicapa de alta definición como fallback.

