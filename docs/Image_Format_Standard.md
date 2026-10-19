# Estándar de imágenes del proyecto

Vigente desde el 19 de octubre de 2026.

- Todas las imágenes nuevas o reemplazadas deben almacenarse en formato `.webp`.
- No se deben agregar archivos `.png`, `.jpg`, `.jpeg`, `.gif` ni `.bmp` al repositorio.
- Los recursos del juego deben usar WebP con pérdida y una calidad entre 65 y 80, conservando transparencia cuando corresponda.
- Las capturas de pruebas deben usar una calidad entre 50 y 70 para evitar que el material de revisión aumente demasiado el tamaño del repositorio.
- WebP sin pérdida solo se permite para recursos pequeños cuando exista una razón visual comprobable y el tamaño resultante sea razonable.
- Toda referencia en código, datos, documentación y pruebas debe usar la extensión `.webp`.
- Antes de integrar un cambio, se debe comprobar que no existan imágenes con formatos anteriores y que cada recurso WebP se pueda decodificar.

Los efectos de Effekseer conservan nombres `.png` dentro de sus archivos binarios `.efkefc`. El cargador del proyecto redirige esas solicitudes a los recursos `.webp` equivalentes; no se deben volver a incorporar las texturas PNG.
