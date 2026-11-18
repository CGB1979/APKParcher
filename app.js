const STORAGE_KEY = 'apkparcher_config';

const els = {
  ghUser: document.getElementById('ghUser'),
  ghRepo: document.getElementById('ghRepo'),
  ghToken: document.getElementById('ghToken'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  configStatus: document.getElementById('configStatus'),
  apkUrl: document.getElementById('apkUrl'),
  startBtn: document.getElementById('startBtn'),
  progressSection: document.getElementById('progressSection'),
  progressFill: document.getElementById('progressFill'),
  progressPercent: document.getElementById('progressPercent'),
  statusText: document.getElementById('statusText'),
  downloadBtn: document.getElementById('downloadBtn')
};

let currentDownloadUrl = null;
let pollingTimer = null;

function loadConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const cfg = JSON.parse(saved);
    els.ghUser.value = cfg.user || '';
    els.ghRepo.value = cfg.repo || 'APKParcher';
    els.ghToken.value = cfg.token || '';
    if (cfg.user && cfg.repo && cfg.token) {
      els.configStatus.textContent = `Conectado: ${cfg.user}/${cfg.repo}`;
      els.configStatus.classList.add('connected');
    }
  }
}

els.saveConfigBtn.addEventListener('click', () => {
  const cfg = {
    user: els.ghUser.value.trim(),
    repo: els.ghRepo.value.trim() || 'APKParcher',
    token: els.ghToken.value.trim()
  };
  if (!cfg.user || !cfg.token) {
    alert('Completa tu usuario de GitHub y el Personal Access Token.');
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  els.configStatus.textContent = `Conectado: ${cfg.user}/${cfg.repo}`;
  els.configStatus.classList.add('connected');
});

function setProgress(percent, text) {
  els.progressFill.style.width = `${percent}%`;
  els.progressPercent.textContent = `${percent}%`;
  els.statusText.textContent = text;
}

els.startBtn.addEventListener('click', async () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    alert('Primero configura y guarda tu Usuario y Token de GitHub arriba.');
    return;
  }
  const cfg = JSON.parse(saved);
  const url = els.apkUrl.value.trim();
  if (!url) {
    alert('Pega el enlace de Google Drive del archivo .apk, .apkm o .apks.');
    return;
  }

  const tag = `build-${Date.now()}`;
  currentDownloadUrl = null;

  els.startBtn.disabled = true;
  els.downloadBtn.disabled = true;
  els.progressSection.classList.remove('hidden');
  setProgress(10, 'Enviando orden a GitHub Actions...');

  try {
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${cfg.user}/${cfg.repo}/actions/workflows/parchear.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            apk_url: url,
            release_tag: tag
          }
        })
      }
    );

    if (!dispatchRes.ok) {
      const errData = await dispatchRes.json().catch(() => ({}));
      throw new Error(errData.message || `Error HTTP ${dispatchRes.status}`);
    }

    setProgress(20, 'En cola en el servidor de GitHub...');
    await new Promise(r => setTimeout(r, 5000));
    monitorWorkflow(cfg, tag);
  } catch (err) {
    setProgress(0, `Error al iniciar: ${err.message}`);
    els.startBtn.disabled = false;
  }
});

async function monitorWorkflow(cfg, tag) {
  let fakeProgress = 25;

  pollingTimer = setInterval(async () => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${cfg.user}/${cfg.repo}/actions/runs?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );
      const data = await res.json();
      const run = data.workflow_runs && data.workflow_runs;
      if (!run) return;

      if (run.status === 'queued') {
        setProgress(22, 'Esperando servidor disponible...');
      } else if (run.status === 'in_progress') {
        if (fakeProgress < 90) fakeProgress += 5;
        setProgress(fakeProgress, 'Descargando, filtrando español y aplicando parches...');
      } else if (run.status === 'completed') {
        clearInterval(pollingTimer);
        if (run.conclusion === 'success') {
          const relRes = await fetch(
            `https://api.github.com/repos/${cfg.user}/${cfg.repo}/releases/tags/${tag}`,
            {
              headers: {
                Authorization: `Bearer ${cfg.token}`,
                Accept: 'application/vnd.github+json'
              }
            }
          );
          const relData = await relRes.json();
          const asset = relData.assets && relData.assets;
          if (asset) {
            currentDownloadUrl = asset.browser_download_url;
            setProgress(100, `¡Listo! Generado: ${asset.name}`);
            els.downloadBtn.textContent = `⬇️ Descargar ${asset.name}`;
            els.downloadBtn.disabled = false;
          } else {
            setProgress(100, 'Parcheado listo. Descárgalo desde Releases en GitHub.');
          }
        } else {
          setProgress(0, `El proceso falló (${run.conclusion}). Revisa Actions en GitHub.`);
        }
        els.startBtn.disabled = false;
      }
    } catch (e) {
      console.error(e);
    }
  }, 5000);
}

els.downloadBtn.addEventListener('click', () => {
  if (!currentDownloadUrl) return;
  window.open(currentDownloadUrl, '_blank');
});

loadConfig();
