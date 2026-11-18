# APK Patcher — Interfaz Glaciar

Interfaz web personal conectada con **GitHub Actions** para unir archivos `.apkm`/`.xapk` y aplicar parches de **ReVanced** en la nube.

## Contenido del paquete
- `index.html`, `style.css`, `app.js`: Interfaz web estilo Glaciar con barra de progreso en tiempo real y descarga directa.
- `.github/workflows/parchear.yml`: Flujo de trabajo automatizado que descarga desde Google Drive, une bundles con APKEditor, parchea con ReVanced CLI y deja el `.apk` listo para bajar desde la web.

## Pasos de instalación
1. Sube estos archivos a la raíz de tu repositorio en GitHub (manteniendo la ruta `.github/workflows/parchear.yml`).
2. Activa **GitHub Pages** en `Settings -> Pages -> Branch: main / (root)` (si el repositorio es privado y tienes cuenta gratuita, puedes alojar `index.html`, `style.css` y `app.js` en un repositorio público separado y apuntar al repositorio privado `APKParcher` desde la configuración de la página).
3. Crea un **Personal Access Token (Classic)** en GitHub con permisos `repo` y `workflow`, ingrésalo una sola vez en **Configurar Repositorio y Token** dentro de la página web y empieza a parchear.
