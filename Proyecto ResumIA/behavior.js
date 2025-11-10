document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const responseElement = document.getElementById("response");
  const uploadBtn = document.getElementById("uploadBtn");
  const loader = document.getElementById("loader");

  const summariesListEl = document.getElementById("summaries-list");
  const searchInput = document.getElementById("search-summaries"); // opcional: añade en index.html si quieres buscar
  const deleteAllBtn = document.getElementById("deleteAll");
  const settingsBtn = document.getElementById("settings-button");
  const popup = document.getElementById("Setting-page");
  const closePopupBtn = document.getElementById("cerrarAjustes");
  const fontsizeSelector = document.getElementById("fontsize-selector");

  const STORAGE_KEY = "resumia-summaries";
  const FONT_STORAGE_KEY = "resumia-fontsize";
  const MARKDOWN_CLASS = "markdown-body";

  /* ---------- helpers ---------- */
  function loadSummaries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }
  function saveSummaries(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function extractTitle(html) {
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const h = tmp.querySelector("h1,h2,h3,h4,h5");
    if (h && h.textContent.trim()) return h.textContent.trim();
    const firstLine = (tmp.textContent || "").trim().split("\n").find(Boolean);
    return firstLine ? firstLine.trim().slice(0,60) : "Resumen";
  }
  function createPreview(html) {
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || "";
    return text.trim().slice(0,120);
  }

  function applyFontSize(size) {
    const md = document.querySelector(`.${MARKDOWN_CLASS}`);
    if (!md) return;
    md.classList.remove("size-small","size-medium","size-large");
    md.classList.add(`size-${size}`);
  }

  /* ---------- render / storage for sidebar ---------- */
  function renderSummariesList(filter = "") {
    if (!summariesListEl) return;
    const items = loadSummaries();
    const filtered = items.filter(i => (i.title + " " + i.preview).toLowerCase().includes(filter.toLowerCase()));
    summariesListEl.innerHTML = "";
    if (filtered.length === 0) {
      const li = document.createElement("li"); li.className = "empty-note"; li.textContent = "No hay resúmenes guardados";
      summariesListEl.appendChild(li); return;
    }
    filtered.forEach(item => {
      const li = document.createElement("li");
      li.className = "summary-item";
      li.dataset.id = item.id;
      li.innerHTML = `<strong>${escapeHtml(item.title)}</strong><br><small>${new Date(item.ts).toLocaleString()}</small>`;
      li.addEventListener("click", () => showSavedSummary(item.id));
      summariesListEl.appendChild(li);
    });
  }

  function saveSummary(html) {
    const items = loadSummaries();
    const id = Date.now().toString();
    const title = extractTitle(html);
    const preview = createPreview(html);
    items.unshift({ id, title, preview, content: html, ts: Date.now() });
    saveSummaries(items.slice(0,50));
    renderSummariesList(searchInput ? searchInput.value || "" : "");
  }

  function showSavedSummary(id) {
    const items = loadSummaries();
    const found = items.find(i => i.id === id);
    if (!found) return;
    if (responseElement) {
      responseElement.innerHTML = found.content;
      const savedFont = localStorage.getItem(FONT_STORAGE_KEY) || "medium";
      applyFontSize(savedFont);
    }
  }

  function clearAllSummaries() {
    localStorage.removeItem(STORAGE_KEY);
    renderSummariesList(searchInput ? searchInput.value || "" : "");
    if (responseElement) responseElement.innerHTML = "";
  }

  /* ---------- popup handlers ---------- */
  if (settingsBtn && popup && closePopupBtn) {
    settingsBtn.addEventListener("click", () => { popup.setAttribute("aria-hidden","false"); document.body.style.overflow = "hidden"; });
    closePopupBtn.addEventListener("click", () => { popup.setAttribute("aria-hidden","true"); document.body.style.overflow = ""; });
    popup.addEventListener("click", (e) => { if (e.target === popup) { popup.setAttribute("aria-hidden","true"); document.body.style.overflow = ""; }});
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && popup.getAttribute("aria-hidden")==="false") { popup.setAttribute("aria-hidden","true"); document.body.style.overflow = ""; }});
  }

  /* ---------- init UI state ---------- */
  renderSummariesList();
  const savedFont = localStorage.getItem(FONT_STORAGE_KEY) || "medium";
  applyFontSize(savedFont);
  if (fontsizeSelector) {
    fontsizeSelector.value = savedFont;
    fontsizeSelector.addEventListener("change", (e) => { const v = e.target.value || "medium"; applyFontSize(v); localStorage.setItem(FONT_STORAGE_KEY, v); });
  }

  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", () => { if (!confirm("¿Eliminar todos los resúmenes guardados?")) return; clearAllSummaries(); });
  }
  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderSummariesList(e.target.value || ""));
  }

  /* ---------- upload handler (single, robust) ---------- */
  if (uploadBtn) {
    uploadBtn.addEventListener("click", async () => {
      if (uploadBtn.disabled) return;
      if (!fileInput || !fileInput.files.length) {
        if (responseElement) responseElement.textContent = "Por favor selecciona un archivo.";
        return;
      }

      const formData = new FormData();
      formData.append("file", fileInput.files[0]);

      uploadBtn.disabled = true;
      fileInput.disabled = true;
      if (loader) loader.classList.remove("hidden");
      const prevText = uploadBtn.textContent;
      uploadBtn.textContent = "Procesando...";

      try {
        const response = await fetch("http://127.0.0.1:5000/api/transcribir", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Error en la transcripción");

        const html = await response.text();
        if (responseElement) responseElement.innerHTML = html;

        // crucial: guardar el resumen y actualizar la lista
        saveSummary(html);

        // reaplicar tamaño de fuente guardado
        const cur = localStorage.getItem(FONT_STORAGE_KEY) || "medium";
        applyFontSize(cur);
      } catch (err) {
        console.error(err);
        if (responseElement) responseElement.textContent = "Hubo un error en la conexión con el servidor.";
      } finally {
        uploadBtn.disabled = false;
        fileInput.disabled = false;
        if (loader) loader.classList.add("hidden");
        uploadBtn.textContent = prevText || "Enviar";
      }
    });
  }
  const createBtn = document.getElementById("create-button");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      // limpiar área de respuesta
      if (responseElement) responseElement.innerHTML = "";

      // cerrar popup si está abierto
      if (popup) {
        popup.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }

      // reset y abrir selector de archivo
      if (fileInput) {
        fileInput.value = "";
        // habilitar botón por si estaba deshabilitado
        if (uploadBtn) {
          uploadBtn.disabled = true;
          uploadBtn.textContent = "Enviar";
        }
        // abrir diálogo de selección de archivo
        fileInput.focus();
        fileInput.click();
      }

      // desplazar suavemente al área de subida
      const inputContainer = document.querySelector(".input-container");
      if (inputContainer) inputContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // habilitar/deshabilitar botón enviar según selección de archivo
  if (fileInput && uploadBtn) {
    fileInput.addEventListener("change", () => {
      uploadBtn.disabled = !(fileInput.files && fileInput.files.length);
    });
  }
});
