// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
let saldoEsperadoGlobal = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Iniciamos la lógica, confiando en que inyector.js está haciendo su trabajo
    verificarSiInyectorTermino();
});

// ==========================================
// ESPERA INTELIGENTE AL INYECTOR
// ==========================================
function verificarSiInyectorTermino() {
    // Verificamos si el modal crítico ya fue inyectado en el DOM
    if (!document.getElementById('modalAbrirCaja')) {
        // Si aún no está, esperamos 50ms y volvemos a preguntar
        setTimeout(verificarSiInyectorTermino, 50);
        return;
    }
    // Si ya existe en el DOM, procedemos con la lógica del backend
    obtenerEstadoCaja();
}

// ==========================================
// 2. LÓGICA CORE: OBTENER ESTADO CAJA Y DUEÑO
// ==========================================
async function obtenerEstadoCaja() {
    try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch('http://127.0.0.1:5000/api/caja/turno/activo', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.status === 401) {
            window.location.replace('/pages/login.html');
            return;
        }

        const data = await respuesta.json();

        // 🛡️ BLOQUEO: CAJA AJENA O FALTA DE ROL
        if (respuesta.status === 403) {
            if (data.codigo_error === "CAJA_AJENA") {
                document.getElementById('etiqueta-estado-caja').innerText = "Caja Bloqueada";
                document.getElementById('etiqueta-estado-caja').className = "badge bg-warning text-dark rounded-pill px-3 py-1";
                document.getElementById('texto-info-turno').innerText = "⚠️ " + data.message;
                
                document.getElementById('btn-nuevo-movimiento').disabled = true;
                document.getElementById('btn-cerrar-caja').disabled = false; // Permitimos cerrar caja ajena
                return;
            } else {
                new bootstrap.Modal(document.getElementById('modalAccesoDenegado')).show();
                return;
            }
        }

        // SI PASÓ LOS FILTROS
        if (data.success) {
            if (data.data === null) {
                // TRAMPA INELUDIBLE: CAJA CERRADA
                document.getElementById('etiqueta-estado-caja').innerText = "Caja Cerrada";
                document.getElementById('etiqueta-estado-caja').className = "badge bg-danger rounded-pill px-3 py-1";
                
                const modalAbrir = new bootstrap.Modal(document.getElementById('modalAbrirCaja'));
                modalAbrir.show();
            } else {
                // CAJA ABIERTA POR ESTE USUARIO
                document.getElementById('etiqueta-estado-caja').innerText = "Caja Abierta (Tu Turno)";
                document.getElementById('etiqueta-estado-caja').className = "badge badge-tonal-success rounded-pill px-3 py-1 border border-success border-opacity-25";
                
                const fecha = new Date(data.data.turno.fecha_apertura).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                document.getElementById('texto-info-turno').innerText = `Turno actual: ${fecha}`;

                document.getElementById('btn-nuevo-movimiento').disabled = false;
                document.getElementById('btn-cerrar-caja').disabled = false;

                dibujarDashboardCaja(data.data.turno, data.data.resumen);
            }
        }
    } catch (error) {
        console.error("Error de red:", error);
    }
}

// ==========================================
// 3. RENDERIZAR EL DASHBOARD
// ==========================================
function dibujarDashboardCaja(turno, resumen) {
    saldoEsperadoGlobal = resumen.saldo_esperado;

    document.getElementById('caja-saldo-inicial').innerText = "S/ " + resumen.saldo_inicial.toFixed(2);
    document.getElementById('caja-ventas-efectivo').innerText = "+ S/ " + resumen.ventas_efectivo.toFixed(2);
    document.getElementById('caja-ingresos-manuales').innerText = "+ S/ " + resumen.ingresos_manuales.toFixed(2);
    document.getElementById('caja-egresos-manuales').innerText = "- S/ " + resumen.egresos_manuales.toFixed(2);
    document.getElementById('caja-saldo-esperado').innerText = "S/ " + resumen.saldo_esperado.toFixed(2);
    
    document.getElementById('caja-ventas-tarjeta').innerText = "S/ " + resumen.ventas_tarjeta.toFixed(2);
    document.getElementById('caja-ventas-yape').innerText = "S/ " + resumen.ventas_yape_plin.toFixed(2);

    const tbody = document.getElementById('tabla-flujo-caja');
    tbody.innerHTML = '';

    resumen.flujo.forEach(mov => {
        const horaStr = new Date(mov.hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        let badgeColor = "bg-secondary";
        let montoColor = "text-muted";
        let signo = "";

        if (mov.monto > 0) { badgeColor = "bg-success"; montoColor = "text-success"; signo = "+"; }
        if (mov.monto < 0) { badgeColor = "bg-danger"; montoColor = "text-danger"; }
        if (mov.tipo === "APERTURA") { badgeColor = "bg-primary"; montoColor = "text-google-title"; signo = ""; }

        tbody.innerHTML += `
        <tr>
            <td class="text-google-muted small">${horaStr}</td>
            <td><span class="badge ${badgeColor} rounded-pill px-3">${mov.tipo.replace('_', ' ')}</span></td>
            <td class="text-google-title">${mov.concepto}</td>
            <td class="text-end fw-bold ${montoColor}">${signo} S/ ${Math.abs(mov.monto).toFixed(2)}</td>
        </tr>`;
    });
}

// ==========================================
// 4. OPERACIONES DE CAJA (POST)
// ==========================================
async function abrirCajaBackend() {
    const btnSubmit = document.getElementById('btn-abrir-caja-submit');
    const saldo = parseFloat(document.getElementById('abrir-saldo-inicial').value);
    
    btnSubmit.disabled = true;
    const payload = { saldo_inicial: saldo, observaciones: "Apertura normal" };
    
    await enviarPeticionCaja('/api/caja/turno/abrir', payload, 'modalAbrirCaja');
    btnSubmit.disabled = false;
}

async function registrarMovimientoBackend() {
    const tipo = document.querySelector('input[name="tipoMovimiento"]:checked').value; 
    const monto = parseFloat(document.getElementById('mov-monto').value);
    const concepto = document.getElementById('mov-concepto').value;

    const payload = { tipo: tipo, monto: monto, concepto: concepto };
    await enviarPeticionCaja('/api/caja/movimiento', payload, 'modalMovimientoCaja');
    
    document.getElementById('form-movimiento').reset();
}

function calcularDiferenciaCierre() {
    document.getElementById('cierre-sistema-espera').innerText = saldoEsperadoGlobal.toFixed(2);
    const fisico = parseFloat(document.getElementById('cierre-dinero-fisico').value) || 0;
    const diferencia = fisico - saldoEsperadoGlobal;
    const divBox = document.getElementById('cierre-diferencia-box');

    if (diferencia === 0) {
        divBox.style.backgroundColor = "var(--g-success-soft)";
        divBox.innerHTML = `<span class="fw-bold text-success">✅ CAJA CUADRADA EXACTA</span>`;
    } else if (diferencia > 0) {
        divBox.style.backgroundColor = "#e8f0fe";
        divBox.innerHTML = `<span class="fw-bold text-primary">⚠️ SOBRANTE: + S/ ${diferencia.toFixed(2)}</span>`;
    } else {
        divBox.style.backgroundColor = "var(--g-danger-soft)";
        divBox.innerHTML = `<span class="fw-bold text-danger">🚨 FALTANTE: - S/ ${Math.abs(diferencia).toFixed(2)}</span>`;
    }
}

async function cerrarCajaBackend() {
    const fisico = parseFloat(document.getElementById('cierre-dinero-fisico').value);
    const obs = document.getElementById('cierre-observaciones').value;
    
    const payload = { saldo_fisico_real: fisico, observaciones: obs };
    const exito = await enviarPeticionCaja('/api/caja/turno/cerrar', payload, 'modalCerrarCaja');
    
    if (exito) {
        alert("Turno cerrado correctamente. Sesión de caja finalizada.");
        
        // 🔴 MODIFICA AQUÍ: Cambia el reload por la ruta de tu dashboard general
        window.location.href = '/pages/dashboard.html';
    }
}

async function enviarPeticionCaja(ruta, payload, idModal) {
    try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch(`http://127.0.0.1:5000${ruta}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (respuesta.status === 401) { window.location.replace('/pages/login.html'); return false; }
        
        const data = await respuesta.json();

        if (respuesta.status === 403) {
            if(data.codigo_error !== "CAJA_CERRADA"){
                new bootstrap.Modal(document.getElementById('modalAccesoDenegado')).show();
            } else {
                alert("⚠️ Operación bloqueada: " + data.message);
            }
            return false;
        }

        if ((respuesta.status === 200 || respuesta.status === 201) && data.success) {
            bootstrap.Modal.getInstance(document.getElementById(idModal)).hide();
            obtenerEstadoCaja(); 
            return true;
        } else {
            alert("Error: " + (data.message || "Revisa los datos ingresados"));
            return false;
        }
    } catch (error) {
        alert("Fallo de red al conectar con el servidor.");
        return false;
    }
}