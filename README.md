![APKParcher Glaciar Cover](assets/cover.png)

# APKParcher Glaciar

Interfaz web estilo **Glaciar** conectada a **GitHub Actions** para automatizar el parcheo de aplicaciones Android de uso personal mediante **ReVanced CLI** y **APKEditor**.

## Características incluidas

* **Soporte multi-formato:** Acepta archivos `.apk`, `.apkm` y `.apks` mediante enlaces públicos de Google Drive.
* **Filtro automático de idioma español:** Al procesar bundles (`.apkm` / `.apks`), conserva únicamente el paquete de idioma español (`split_config.es*.apk`) cuando está presente para reducir el tamaño final y priorizar el español al instalar.
* **Nombre de salida dinámico:** Renombra automáticamente el archivo compilado como `<NombreOriginal>_parcheado.apk`.
* **Identidad visual completa:** Incluye portada para el repositorio (`assets/cover.png`), icono principal (`assets/icon-512.png`) y favicon (`assets/favicon.png`).

## Estructura del paquete

* `.github/workflows/parchear.yml` — Flujo de trabajo en la nube (subir al repositorio privado `APKParcher`).
* `index.html`, `style.css`, `app.js` — Interfaz web Glaciar (subir al repositorio público de GitHub Pages).
* `assets/` — Portada, icono de aplicación y favicon.
