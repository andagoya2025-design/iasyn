/*
 IASYN · CONFIG CENTRO — MONTAJE AUTÓNOMO 2026-09
 - Expone window.IASYN_CONFIG_CENTRO.init().
 - Monta el formulario dentro de #configCentroMount.
 - No modifica pacientes, atenciones, historias ni módulos clínicos.
 - Conserva acciones backend existentes para configuración y logo.
*/
/* ==========================================================
   IASYN ERP DEMO - CONFIG CENTRO JS
   Versión: 2026-07-06
   Objetivo:
   - Mantener carga y guardado actual de datos del centro.
   - Conectar archivo de logo seleccionado con Apps Script.
   - Subir logo a Google Drive mediante endpoint del scrib.gs.
   - Guardar logo_url en configuracion.
   - No toca pacientes, agenda, historia clínica, recetas ni módulos clínicos.
   ========================================================== */

  let logoCentroArchivoSeleccionado = null;

  function valorConfigCentro(clave, valorDefault){
    const v = configuracionCentro && configuracionCentro[clave] !== undefined ? configuracionCentro[clave] : '';
    return v !== '' && v !== null && v !== undefined ? v : (valorDefault || '');
  }

  function textoSeguroCentro(valor){
    try{
      if(typeof safeText === 'function') return safeText(valor);
    }catch(e){}
    return String(valor === null || valor === undefined ? '' : valor)
      .replace(/[&<>"']/g, function(c){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c];
      });
  }

  function extraerDriveFileIdCentro(url){
    const raw = String(url || '').trim();
    if(!raw) return '';

    let m = raw.match(/\/file\/d\/([^/]+)/);
    if(m && m[1]) return decodeURIComponent(m[1]);

    m = raw.match(/[?&]id=([^&]+)/);
    if(m && m[1]) return decodeURIComponent(m[1]);

    if(/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;

    return '';
  }

  function normalizarDriveImageUrl(url){
    const raw = String(url || '').trim();
    if(!raw) return '';

    const id = extraerDriveFileIdCentro(raw);
    if(id) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w400';

    return raw;
  }

  function obtenerUrlsPreviewLogoCentro(url){
    const raw = String(url || '').trim();
    if(!raw) return [];

    const id = extraerDriveFileIdCentro(raw);
    if(id){
      return [
        'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w400',
        'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(id),
        raw
      ];
    }

    return [raw];
  }

  function obtenerInputLogoArchivoCentro(){
    const ids = [
      'cfgLogoFile',
      'cfgLogoArchivo',
      'cfgLogoInput',
      'logoCentroFile',
      'logoFile',
      'inputLogoCentro'
    ];

    for(const id of ids){
      const el = document.getElementById(id);
      if(el && el.type === 'file') return el;
    }

    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    return inputs.find(el => {
      const txt = String((el.id || '') + ' ' + (el.name || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
      return txt.includes('logo');
    }) || inputs[0] || null;
  }

  function setEstadoArchivoLogoCentro(html){
    const ids = [
      'cfgLogoFileStatus',
      'cfgLogoArchivoEstado',
      'cfgLogoEstado',
      'logoCentroEstado',
      'logoFileStatus',
      'estadoLogoCentro'
    ];

    for(const id of ids){
      const el = document.getElementById(id);
      if(el){ el.innerHTML = html || ''; return; }
    }
  }

  function actualizarPreviewLogoCentro(){
    const input = document.getElementById('cfgLogoUrl');
    const img = document.getElementById('cfgLogoPreview');
    const fallback = document.getElementById('cfgLogoFallback');
    if(!input || !img || !fallback) return;

    const urls = obtenerUrlsPreviewLogoCentro(input.value);
    if(!urls.length){
      img.style.display = 'none';
      fallback.style.display = 'grid';
      img.removeAttribute('src');
      return;
    }

    let intento = 0;
    const cargar = () => {
      const url = urls[intento];
      img.onload = () => { img.style.display = 'block'; fallback.style.display = 'none'; };
      img.onerror = () => {
        intento++;
        if(intento < urls.length){
          cargar();
          return;
        }
        img.style.display = 'none';
        fallback.style.display = 'grid';
      };
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    };

    cargar();
  }

  function previsualizarArchivoLogoCentro(file){
    const img = document.getElementById('cfgLogoPreview');
    const fallback = document.getElementById('cfgLogoFallback');
    if(!file || !img || !fallback) return;

    const urlLocal = URL.createObjectURL(file);
    img.onload = () => {
      img.style.display = 'block';
      fallback.style.display = 'none';
      try{ URL.revokeObjectURL(urlLocal); }catch(e){}
    };
    img.onerror = () => {
      img.style.display = 'none';
      fallback.style.display = 'grid';
      try{ URL.revokeObjectURL(urlLocal); }catch(e){}
    };
    img.src = urlLocal;
  }

  function validarArchivoLogoCentro(file){
    if(!file) return {success:false, message:'No se seleccionó archivo.'};

    const tipo = String(file.type || '').toLowerCase();
    const nombre = String(file.name || '').toLowerCase();
    const esImagen = tipo.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(nombre);

    if(!esImagen){
      return {success:false, message:'Seleccione una imagen válida: PNG, JPG, JPEG o WEBP.'};
    }

    const maxBytes = 2 * 1024 * 1024;
    if(file.size > maxBytes){
      return {success:false, message:'El logo es demasiado pesado. Use una imagen menor a 2 MB.'};
    }

    return {success:true};
  }

  function leerArchivoComoDataUrlCentro(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
      reader.readAsDataURL(file);
    });
  }

  function extraerBase64Centro(dataUrl){
    const txt = String(dataUrl || '');
    const idx = txt.indexOf(',');
    return idx >= 0 ? txt.substring(idx + 1) : txt;
  }

  function obtenerUrlLogoDesdeRespuestaCentro(r){
    r = r || {};
    return r.logo_url || r.url_publica || r.url_visual || r.url || r.webViewLink || r.webContentLink || '';
  }

  async function subirLogoCentroSiExiste(){
    const inputUrl = document.getElementById('cfgLogoUrl');
    const file = logoCentroArchivoSeleccionado;

    if(!file) return '';

    const validacion = validarArchivoLogoCentro(file);
    if(!validacion.success) throw new Error(validacion.message);

    setEstadoArchivoLogoCentro('<i class="bi bi-arrow-clockwise me-1"></i> Subiendo logo a Google Drive...');

    const dataUrl = await leerArchivoComoDataUrlCentro(file);
    const base64 = extraerBase64Centro(dataUrl);

    const r = await apiPost('subirLogoCentroDriveERP', {
      nombre_archivo: file.name || 'logo-centro.png',
      mime_type: file.type || 'image/png',
      base64: base64,
      tipo_archivo: 'logo_centro'
    });

    if(!r || !r.success){
      throw new Error((r && r.message) || 'No se pudo subir el logo a Google Drive.');
    }

    const urlLogo = obtenerUrlLogoDesdeRespuestaCentro(r);
    if(!urlLogo){
      throw new Error('El servidor subió el logo, pero no devolvió una URL válida.');
    }

    if(inputUrl){
      inputUrl.value = urlLogo;
      actualizarPreviewLogoCentro();
    }

    setEstadoArchivoLogoCentro('<i class="bi bi-check2-circle me-1"></i> Logo subido correctamente a Google Drive.');

    logoCentroArchivoSeleccionado = null;
    const inputFile = obtenerInputLogoArchivoCentro();
    if(inputFile) inputFile.value = '';

    return urlLogo;
  }

  function inicializarLogoUploaderCentro(){
    const inputFile = obtenerInputLogoArchivoCentro();
    if(!inputFile || inputFile.dataset.iasynLogoInit === '1') return;

    inputFile.dataset.iasynLogoInit = '1';
    inputFile.addEventListener('change', function(){
      const file = this.files && this.files.length ? this.files[0] : null;
      logoCentroArchivoSeleccionado = file || null;

      if(!file){
        setEstadoArchivoLogoCentro('Sin archivo seleccionado.');
        return;
      }

      const validacion = validarArchivoLogoCentro(file);
      if(!validacion.success){
        logoCentroArchivoSeleccionado = null;
        setEstadoArchivoLogoCentro('<span class="text-danger fw-bold">' + textoSeguroCentro(validacion.message) + '</span>');
        alert(validacion.message);
        this.value = '';
        return;
      }

      const kb = Math.round((file.size || 0) / 1024);
      setEstadoArchivoLogoCentro('<i class="bi bi-image me-1"></i> Archivo listo: <b>' + textoSeguroCentro(file.name || 'logo') + '</b> (' + kb + ' KB). Se subirá al guardar.');
      previsualizarArchivoLogoCentro(file);
    });
  }


  /* ==========================================================
     IASYN 2026-08-21 · IDENTIDAD VISUAL DE CONFIGURACIÓN
     QUIRÚRGICO / ANTIRREGRESIVO
     - Sin crear botones ni navegación.
     - Sin tocar seguridad, sesión, permisos ni backend.
     - Solo sincroniza textos visibles con obtenerConfiguracion().
     ========================================================== */
  function aplicarIdentidadVisualConfiguracionCentro(){
    const nombre = String(valorConfigCentro('nombre_clinica', 'IASYN') || 'IASYN').trim();
    const modo = String(valorConfigCentro('modo_sistema', '') || '').trim();

    try{
      document.title = nombre + ' - Configuración';
    }catch(e){}

    const brandTitulo = document.querySelector('#sidebar .brand h1');
    const brandSubtitulo = document.querySelector('#sidebar .brand small');

    if(brandTitulo) brandTitulo.textContent = nombre;
    if(brandSubtitulo) brandSubtitulo.textContent = 'Configuración';

    const banner = document.querySelector('.demo-banner');
    if(banner){
      banner.innerHTML =
        '<div><b>CONFIGURACIÓN INSTITUCIONAL</b> — Administración segura del centro médico.</div>' +
        '<small>Centro: ' + textoSeguroCentro(nombre) +
        (modo ? ' · Modo ' + textoSeguroCentro(modo) : '') +
        '</small>';
    }

    const subtitulo = document.querySelector('.topbar > div:first-child p');
    if(subtitulo){
      subtitulo.textContent =
        'Parámetros institucionales, agenda, seguridad y administración del centro.';
    }

    const tarjetas = Array.from(document.querySelectorAll('.stat'));
    const tarjetaCentro = tarjetas.find(function(card){
      const label = card.querySelector('small');
      return label &&
        String(label.textContent || '').trim().toLowerCase() === 'centro';
    });

    if(tarjetaCentro){
      const valor = tarjetaCentro.querySelector('h3');
      if(valor){
        valor.textContent = nombre;
        valor.title = nombre;
        valor.style.fontSize = '20px';
        valor.style.lineHeight = '1.15';
        valor.style.wordBreak = 'break-word';
      }
    }
  }

  async function cargarConfiguracionCentro(){
    const msg = document.getElementById('centroMsg');
    try{
      configuracionCentro = await apiGet('obtenerConfiguracion');
      if(!configuracionCentro || typeof configuracionCentro !== 'object' || Array.isArray(configuracionCentro)) configuracionCentro = {};

      document.getElementById('cfgNombreClinica').value = valorConfigCentro('nombre_clinica', 'IASYN DEMO');
      document.getElementById('cfgWhatsappClinica').value = valorConfigCentro('whatsapp_clinica', '');
      document.getElementById('cfgEmailClinica').value = valorConfigCentro('email_clinica', '');
      document.getElementById('cfgDireccionClinica').value = valorConfigCentro('direccion_clinica', '');
      const logoUrlGuardado = valorConfigCentro('logo_url', '');
      const logoFileIdGuardado = valorConfigCentro('logo_file_id', '');
      document.getElementById('cfgLogoUrl').value = logoUrlGuardado || (logoFileIdGuardado ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(logoFileIdGuardado) + '&sz=w400' : '');
      document.getElementById('cfgColorPrincipal').value = valorConfigCentro('color_principal', '#8b1e5a');
      document.getElementById('cfgColorSecundario').value = valorConfigCentro('color_secundario', '#c23b83');
      document.getElementById('cfgModoSistema').value = valorConfigCentro('modo_sistema', 'DEMO');
      actualizarPreviewLogoCentro();
      inicializarLogoUploaderCentro();
      aplicarIdentidadVisualConfiguracionCentro();

      if(msg) msg.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Datos institucionales cargados desde la hoja <b>configuracion</b>. Colores y modo sistema están bloqueados por seguridad.';
    }catch(e){
      console.error(e);
      if(msg) msg.innerHTML = '<span class="text-danger fw-bold">Error cargando datos del centro. Revise conexión o Apps Script.</span>';
    }
  }

  async function guardarConfiguracionCentro(){
    const msg = document.getElementById('centroMsg');
    const btn = document.getElementById('btnGuardarCentro');

    if(!document.getElementById('cfgNombreClinica').value.trim()){
      alert('Ingrese el nombre del centro médico.');
      return;
    }

    const old = btn ? btn.innerHTML : '';
    if(btn){
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Guardando...';
    }
    if(msg) msg.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Guardando datos institucionales...';

    try{
      if(logoCentroArchivoSeleccionado){
        await subirLogoCentroSiExiste();
      }

      const datosSeguros = {
        nombre_clinica: document.getElementById('cfgNombreClinica').value.trim(),
        whatsapp_clinica: document.getElementById('cfgWhatsappClinica').value.trim(),
        email_clinica: document.getElementById('cfgEmailClinica').value.trim(),
        direccion_clinica: document.getElementById('cfgDireccionClinica').value.trim(),
        logo_url: document.getElementById('cfgLogoUrl').value.trim()
      };

      for(const [clave, valor] of Object.entries(datosSeguros)){
        const r = await apiPost('editarConfiguracion', {clave, valor});
        if(!r.success) throw new Error(r.message || 'No se pudo guardar ' + clave);
      }

      await cargarConfiguracionCentro();
      if(msg) msg.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Configuración institucional guardada correctamente.';
      alert('Datos del centro guardados correctamente.');
    }catch(e){
      console.error(e);
      if(msg) msg.innerHTML = '<span class="text-danger fw-bold">Error: ' + textoSeguroCentro(e.message || e) + '</span>';
      alert('Error al guardar configuración: ' + (e.message || e));
    }finally{
      if(btn){
        btn.disabled = false;
        btn.innerHTML = old;
      }
    }
  }


  /* ==========================================================
     IASYN 2026-09 · MONTAJE AUTÓNOMO DE DATOS DEL CENTRO
     - Crea únicamente la interfaz dentro de configCentroMount.
     - No modifica backend ni estructura de la hoja configuracion.
     - Reutiliza cargarConfiguracionCentro() y guardarConfiguracionCentro().
     ========================================================== */

  function renderConfigCentroMount_(mount){
    if(!mount) return false;
    if(mount.dataset.iasynCentroMontado === '1') return true;

    mount.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label fw-bold" for="cfgNombreClinica">Nombre del centro</label>
          <input id="cfgNombreClinica" class="form-control" autocomplete="organization" placeholder="Nombre del centro médico">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold" for="cfgWhatsappClinica">WhatsApp</label>
          <input id="cfgWhatsappClinica" class="form-control" inputmode="tel" autocomplete="tel" placeholder="Ej. 593999999999">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold" for="cfgEmailClinica">Correo institucional</label>
          <input id="cfgEmailClinica" type="email" class="form-control" autocomplete="email" placeholder="correo@centro.com">
        </div>

        <div class="col-md-6">
          <label class="form-label fw-bold" for="cfgDireccionClinica">Dirección</label>
          <input id="cfgDireccionClinica" class="form-control" autocomplete="street-address" placeholder="Dirección del centro">
        </div>

        <div class="col-12">
          <div class="cardx p-3" style="border-radius:18px!important">
            <div class="row g-3 align-items-center">
              <div class="col-md-3">
                <div id="cfgLogoFallback" class="d-grid place-items-center text-muted"
                     style="min-height:120px;border:1px dashed #e5e7eb;border-radius:16px;background:#fffafd">
                  <div class="text-center">
                    <i class="bi bi-image" style="font-size:28px"></i>
                    <div class="small mt-1">Sin logo</div>
                  </div>
                </div>
                <img id="cfgLogoPreview" alt="Logo del centro"
                     style="display:none;max-width:100%;max-height:120px;object-fit:contain;margin:auto">
              </div>

              <div class="col-md-9">
                <label class="form-label fw-bold" for="cfgLogoFile">Logo institucional</label>
                <input id="cfgLogoFile" type="file" class="form-control" accept="image/png,image/jpeg,image/webp">
                <div id="cfgLogoFileStatus" class="small text-muted mt-2">PNG, JPG o WEBP · máximo 2 MB.</div>

                <label class="form-label fw-bold mt-3" for="cfgLogoUrl">URL del logo</label>
                <input id="cfgLogoUrl" class="form-control" placeholder="Se completa al subir el logo">
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label fw-bold" for="cfgColorPrincipal">Color principal</label>
          <input id="cfgColorPrincipal" class="form-control" readonly aria-readonly="true">
        </div>

        <div class="col-md-4">
          <label class="form-label fw-bold" for="cfgColorSecundario">Color secundario</label>
          <input id="cfgColorSecundario" class="form-control" readonly aria-readonly="true">
        </div>

        <div class="col-md-4">
          <label class="form-label fw-bold" for="cfgModoSistema">Modo del sistema</label>
          <input id="cfgModoSistema" class="form-control" readonly aria-readonly="true">
        </div>

        <div class="col-12">
          <div id="centroMsg" class="notice">
            <i class="bi bi-hourglass-split me-1"></i> Preparando configuración institucional...
          </div>
        </div>

        <div class="col-12 d-flex justify-content-end">
          <button id="btnGuardarCentro" type="button" class="btn-auro">
            <i class="bi bi-save me-1"></i> Guardar datos del centro
          </button>
        </div>
      </div>
    `;

    const btn = mount.querySelector('#btnGuardarCentro');
    if(btn && btn.dataset.iasynCentroGuardarInit !== '1'){
      btn.dataset.iasynCentroGuardarInit = '1';
      btn.addEventListener('click', guardarConfiguracionCentro);
    }

    const logoUrl = mount.querySelector('#cfgLogoUrl');
    if(logoUrl && logoUrl.dataset.iasynLogoUrlInit !== '1'){
      logoUrl.dataset.iasynLogoUrlInit = '1';
      logoUrl.addEventListener('input', actualizarPreviewLogoCentro);
      logoUrl.addEventListener('change', actualizarPreviewLogoCentro);
    }

    mount.dataset.iasynCentroMontado = '1';
    inicializarLogoUploaderCentro();
    return true;
  }

  async function initConfiguracionCentroIASYN_(opciones){
    const opts = opciones || {};
    const mountId = String(opts.mountId || 'configCentroMount').trim();
    const mount = document.getElementById(mountId);

    if(!mount){
      console.warn('IASYN Config Centro: no existe el contenedor #' + mountId);
      return {success:false, message:'No existe el contenedor de Datos del centro.'};
    }

    renderConfigCentroMount_(mount);

    try{
      await cargarConfiguracionCentro();
      return {success:true};
    }catch(error){
      console.error('IASYN Config Centro - init:', error);
      return {success:false, message:String(error && error.message || error || 'Error cargando configuración del centro.')};
    }
  }

  const IASYN_CONFIG_CENTRO_API = Object.freeze({
    init: initConfiguracionCentroIASYN_,
    cargar: cargarConfiguracionCentro,
    guardar: guardarConfiguracionCentro,
    montar: function(mountId){
      return renderConfigCentroMount_(document.getElementById(mountId || 'configCentroMount'));
    },
    actualizarPreviewLogo: actualizarPreviewLogoCentro
  });

  window.IASYN_CONFIG_CENTRO = IASYN_CONFIG_CENTRO_API;
  /* Compatibilidad temporal con configuracion.html heredado. */
  window.AUROSANAX_CONFIG_CENTRO = IASYN_CONFIG_CENTRO_API;

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inicializarLogoUploaderCentro);
  }else{
    inicializarLogoUploaderCentro();
  }
