let alertasGlobales = [];

document.addEventListener('DOMContentLoaded', async () => {
    await cargarAlertas();

    // Conectar el buscador
    const buscador = document.getElementById('alertas-buscador');
    if (buscador) {
        buscador.addEventListener('input', filtrarAlertas);
    }
});

async function cargarAlertas() {
    try {
        const respuesta = await fetch('http://127.0.0.1:5000/api/notificaciones');
        const datos = await respuesta.json();
        
        alertasGlobales = datos.alertas || [];
        renderizarAlertas(alertasGlobales);
    } catch (error) {
        console.error("Error al cargar las notificaciones:", error);
    }
}

function filtrarAlertas() {
    const textoBusqueda = document.getElementById('alertas-buscador').value.toLowerCase();
    
    const filtradas = alertasGlobales.filter(alerta => {
        const mensajeStr = (alerta.mensaje || "").toLowerCase();
        const tituloStr = (alerta.titulo || "").toLowerCase();
        return mensajeStr.includes(textoBusqueda) || tituloStr.includes(textoBusqueda);
    });
    
    renderizarAlertas(filtradas);
}

function renderizarAlertas(alertas) {
    const listaStock = document.getElementById('lista-stock');
    const listaVencer = document.getElementById('lista-vencer');
    
    // Separar las alertas por tipo
    const alertasStock = alertas.filter(a => a.tipo === 'STOCK');
    const alertasVencimiento = alertas.filter(a => a.tipo === 'VENCIMIENTO');

    // Actualizar los numeritos (Badges) de las pestañas
    document.getElementById('badge-stock').innerText = alertasStock.length;
    document.getElementById('badge-vencer').innerText = alertasVencimiento.length;

    // --- RENDERIZAR STOCK ---
    listaStock.innerHTML = '';
    if (alertasStock.length === 0) {
        listaStock.innerHTML = `<div class="p-5 text-center text-google-muted">✅ ¡Todo en orden! No hay problemas de stock.</div>`;
    } else {
        alertasStock.forEach(alerta => {
            // Determinar colores según si es Agotado (Crítico) o Bajo (Advertencia)
            const esCritico = alerta.nivel === 'CRITICO';
            const bgColor = esCritico ? 'var(--g-danger-soft)' : 'var(--g-warning-soft)';
            const txtColor = esCritico ? 'var(--g-danger)' : 'var(--g-warning-dark)';
            const icono = esCritico ? '🚨' : '📉';

            listaStock.innerHTML += `
            <div class="list-group-item d-flex align-items-sm-center align-items-start gap-3 p-4 border-bottom">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                     style="width: 48px; height: 48px; background-color: ${bgColor}; color: ${txtColor};">
                  <span class="fs-5">${icono}</span>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <h6 class="text-google-title m-0 fw-bold">${alerta.titulo}</h6>
                    <span class="small text-google-muted">Detectado hoy</span>
                  </div>
                  <p class="small text-google-muted m-0">${alerta.mensaje}</p>
                </div>
                <div class="d-flex flex-column gap-2 ms-sm-3 mt-3 mt-sm-0 flex-shrink-0">
                  <a href="ingresos.html" class="btn btn-sm btn-google-primary px-3">Generar Compra</a>
                </div>
            </div>`;
        });
    }

    // --- RENDERIZAR VENCIMIENTOS ---
    listaVencer.innerHTML = '';
    if (alertasVencimiento.length === 0) {
        listaVencer.innerHTML = `<div class="p-5 text-center text-google-muted">✅ ¡Todo fresco! No hay productos por vencer pronto.</div>`;
    } else {
        alertasVencimiento.forEach(alerta => {
            const esCritico = alerta.nivel === 'CRITICO'; // Ya venció
            const bgColor = esCritico ? 'var(--g-danger-soft)' : 'var(--g-warning-soft)';
            const txtColor = esCritico ? 'var(--g-danger)' : 'var(--g-warning-dark)';
            const icono = esCritico ? '❌' : '⏳';
            const prioridad = esCritico ? 'VENCIDO - RETIRAR' : 'Atención Requerida';

            listaVencer.innerHTML += `
            <div class="list-group-item d-flex align-items-sm-center align-items-start gap-3 p-4 border-bottom">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                     style="width: 48px; height: 48px; background-color: ${bgColor}; color: ${txtColor};">
                  <span class="fs-5">${icono}</span>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <h6 class="text-google-title m-0 fw-bold">${alerta.titulo}</h6>
                    <span class="small fw-bold" style="color: ${txtColor};">${prioridad}</span>
                  </div>
                  <p class="small text-google-muted m-0">${alerta.mensaje}</p>
                </div>
            </div>`;
        });
    }
}