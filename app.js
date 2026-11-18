const ownerInput = document.getElementById("ownerInput");
const repoInput = document.getElementById("repoInput");
const tokenInput = document.getElementById("tokenInput");
const configPanel = document.getElementById("configPanel");
const toggleConfigBtn = document.getElementById("toggleConfigBtn");
const saveConfigBtn = document.getElementById("saveConfigBtn");
const configStatus = document.getElementById("configStatus");

const apkUrlInput = document.getElementById("apkUrlInput");
const startBtn = document.getElementById("startBtn");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const stepText = document.getElementById("stepText");
const downloadBtn = document.getElementById("downloadBtn");

const WORKFLOW_FILE = "parchear.yml";
let pollTimer = null;

function loadConfig() {
  const owner = localStorage.getItem("gh_owner") || "";
  const repo = localStorage.getItem("gh_repo") || "APKParcher";
  const token = localStorage.getItem("gh_token") || "";

  ownerInput.value = owner;
  repoInput.value = repo;
  tokenInput.value = token;

  if (owner && repo && token) {
    configStatus.textContent = "Conectado: " + owner + "/" + repo;
    configStatus.classList.add("ready");
  } else {
    configStatus.textContent = "Falta configurar";
    configStatus.classList.remove("ready");
    configPanel.classList.remove("hidden");
  }
}

toggleConfigBtn.addEventListener("click", () => {
  configPanel.classList.toggle("hidden");
});

saveConfigBtn.addEventListener("click", () => {
  const owner = ownerInput.value.trim();
  const repo = repoInput.value.trim();
  const token = tokenInput.value.trim();

  if (!owner || !repo || !token) {
    alert("Completa usuario, repositorio y token.");
    return;
  }

  localStorage.setItem("gh_owner", owner);
  localStorage.setItem("gh_repo", repo);
  localStorage.setItem("gh_token", token);
  loadConfig();
  configPanel.classList.add("hidden");
});

function setProgress(percent, text) {
  progressBar.style.width = percent + "%";
  progressPercent.textContent = percent + "%";
  stepText.textContent = text;
}

function resetDownloadButton() {
  downloadBtn.classList.add("disabled");
  downloadBtn.setAttribute("aria-disabled", "true");
  downloadBtn.href = "#";
}

function enableDownloadButton(url, filename) {
  downloadBtn.href = url;
  downloadBtn.setAttribute("download", filename || "app-parcheada.apk");
  downloadBtn.classList.remove("disabled");
  downloadBtn.setAttribute("aria-disabled", "false");
}

async function ghFetch(url, token, options = {}) {
  const headers = Object.assign(
    {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    options.headers || {}
  );
  return fetch(url, Object.assign({}, options, { headers }));
}

startBtn.addEventListener("click", async () => {
  const owner = localStorage.getItem("gh_owner");
  const repo = localStorage.getItem("gh_repo");
  const token = localStorage.getItem("gh_token");
  const apkUrl = apkUrlInput.value.trim();

  if (!owner || !repo || !token) {
    configPanel.classList.remove("hidden");
    alert("Primero guarda tu usuario, repositorio y token de GitHub.");
    return;
  }

  if (!apkUrl) {
    alert("Pega el enlace de Google Drive del APK o APKM.");
    return;
  }

  if (pollTimer) clearInterval(pollTimer);
  resetDownloadButton();
  startBtn.disabled = true;
  setProgress(8, "Enviando orden al servidor de GitHub Actions...");

  const runTag = "build-" + Date.now();
  const dispatchEndpoint =
    "https://api.github.com/repos/" +
    owner +
    "/" +
    repo +
    "/actions/workflows/" +
    WORKFLOW_FILE +
    "/dispatches";

  try {
    const res = await ghFetch(dispatchEndpoint, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          apk_url: apkUrl,
          release_tag: runTag
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Error HTTP " + res.status);
    }

    setProgress(18, "En cola de ejecución... esperando inicio del servidor...");
    monitorWorkflow(owner, repo, token, runTag);
  } catch (err) {
    setProgress(0, "Error al iniciar: " + err.message);
    startBtn.disabled = false;
  }
});

function monitorWorkflow(owner, repo, token, runTag) {
  let elapsed = 0;

  pollTimer = setInterval(async () => {
    elapsed += 5;
    try {
      const runsUrl =
        "https://api.github.com/repos/" +
        owner +
        "/" +
        repo +
        "/actions/workflows/" +
        WORKFLOW_FILE +
        "/runs?per_page=1";

      const res = await ghFetch(runsUrl, token);
      const data = await res.json();
      const latestRun = data.workflow_runs && data.workflow_runs[0];

      if (!latestRun) return;

      if (latestRun.status === "queued") {
        setProgress(22, "En cola de GitHub Actions...");
      } else if (latestRun.status === "in_progress") {
        const simulated = Math.min(88, 30 + Math.floor(elapsed / 3));
        setProgress(simulated, "Descargando, uniendo splits y parcheando con ReVanced...");
      } else if (latestRun.status === "completed") {
        clearInterval(pollTimer);
        if (latestRun.conclusion === "success") {
          setProgress(95, "Parcheo finalizado. Preparando descarga directa...");
          await fetchReleaseAsset(owner, repo, token, runTag);
        } else {
          setProgress(0, "El proceso falló (" + latestRun.conclusion + "). Revisa la pestaña Actions en GitHub.");
          startBtn.disabled = false;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, 5000);
}

async function fetchReleaseAsset(owner, repo, token, runTag) {
  try {
    const relUrl =
      "https://api.github.com/repos/" +
      owner +
      "/" +
      repo +
      "/releases/tags/" +
      runTag;

    const res = await ghFetch(relUrl, token);
    if (!res.ok) {
      throw new Error("No se encontró el archivo publicado.");
    }

    const release = await res.json();
    const asset = release.assets && release.assets[0];

    if (!asset) {
      throw new Error("El release no contiene ningún APK.");
    }

    const assetRes = await fetch(asset.url, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/octet-stream"
      }
    });

    if (!assetRes.ok) {
      throw new Error("No se pudo descargar el APK desde el servidor.");
    }

    const blob = await assetRes.blob();
    const objectUrl = URL.createObjectURL(blob);

    setProgress(100, "¡Listo! Tu APK parcheado está preparado para descargar.");
    enableDownloadButton(objectUrl, asset.name || "app-parcheada.apk");
  } catch (err) {
    setProgress(100, "Parcheado listo, pero descarga falló: " + err.message);
  } finally {
    startBtn.disabled = false;
  }
}

loadConfig();
