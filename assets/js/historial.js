let listaTicketsGlobal = [];
let modalInstancia = null; // Para controlar el modal de forma segura

document.addEventListener('DOMContentLoaded', () => {
    // 1. Poner fecha de hoy
    const inputFecha = document.getElementById('filtro-fecha');
    if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];

    // 2. Traer datos
    cargarHistorialTickets();

    // 3. Activar los filtros interactivos
    document.getElementById('filtro-fecha')?.addEventListener('change', aplicarFiltrosLocales);
    document.getElementById('filtro-estado')?.addEventListener('change', aplicarFiltrosLocales);
    document.getElementById('input-buscar')?.addEventListener('input', aplicarFiltrosLocales);
});

// ==========================================================
// 1. TRAER TICKETS DEL BACKEND
// ==========================================================
async function cargarHistorialTickets() {
    const tbody = document.getElementById('tickets-tabla-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Cargando historial...</td></tr>`;

    try {
        const token = localStorage.getItem('token');
        // 🔥 CORREGIDO: Apuntando a /api/ticket (SIN LA "S")
        const respuesta = await fetch('http://127.0.0.1:5000/api/ticket/', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.status === 403) return new bootstrap.Modal(document.getElementById('modalAccesoDenegado')).show();
        if (respuesta.status === 401) return window.location.replace('/pages/login.html');

        const dataUniversal = await respuesta.json();
        
        if (dataUniversal.success && dataUniversal.data) {
            listaTicketsGlobal = dataUniversal.data;
            aplicarFiltrosLocales(); // Filtramos desde el inicio para que aplique la fecha de hoy
        } else {
            // Adaptación por si tu backend devuelve el array directo en vez de un objeto success
            if (Array.isArray(dataUniversal)) {
                listaTicketsGlobal = dataUniversal;
                aplicarFiltrosLocales();
            } else {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hay tickets registrados.</td></tr>`;
            }
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Error de conexión.</td></tr>`;
    }
}

// ==========================================================
// 2. DIBUJAR TABLA
// ==========================================================
function dibujarTablaTickets(tickets) {
    const tbody = document.getElementById('tickets-tabla-body');
    tbody.innerHTML = ''; 

    if (tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">No se encontraron tickets.</td></tr>`;
        document.getElementById('contador-tickets').innerText = `Mostrando 0 tickets en pantalla`;
        return;
    }

    tickets.forEach(ticket => {
        const fObj = new Date(ticket.fecha_hora);
        const metodoPago = ticket.medio_pago ? ticket.medio_pago.toUpperCase() : 'EFECTIVO';
        
        let emojiPago = "💵"; 
        if (metodoPago === 'TARJETA') emojiPago = "💳";
        if (metodoPago === 'YAPE' || metodoPago === 'PLIN') emojiPago = "📱";

        const esAnulado = ticket.estado && ticket.estado.toLowerCase() === 'anulado';
        
        const filaClass = esAnulado ? 'class="bg-light opacity-75"' : '';
        const estadoBadge = esAnulado 
            ? `<span class="badge rounded-pill px-3 py-1" style="background-color:#f8d7da; color:#721c24">Anulado</span>`
            : `<span class="badge rounded-pill px-3 py-1" style="background-color:#d4edda; color:#155724">Válido</span>`;
        
        const totalClase = esAnulado ? "text-muted text-decoration-line-through" : "text-primary";
        const totalS = `<td class="text-end fw-bold ${totalClase}">S/ ${parseFloat(ticket.total || 0).toFixed(2)}</td>`;

        const cajero = ticket.usuarios ? ticket.usuarios.nombres : "Cajero"; 

        const fila = `
        <tr ${filaClass}>
            <td class="ps-4"><span class="fw-bold font-monospace">${ticket.nro_ticket}</span></td>
            <td class="text-muted small">${fObj.toLocaleDateString('es-PE')} <br> ${fObj.toLocaleTimeString('es-PE', { hour12: false })}</td>
            <td>${ticket.cliente_nombre || "Público en General"}</td>
            <td class="text-center"><span class="fs-5" title="${metodoPago}">${emojiPago}</span></td>
            <td class="text-muted">${cajero}</td>
            ${totalS}
            <td class="text-center">${estadoBadge}</td>
            <td class="text-center pe-4">
                <button class="btn btn-sm btn-light border text-primary" title="Ver Detalle" onclick="abrirModalDetalle(${ticket.id})">👁️ Ver</button>
            </td>
        </tr>`;
        
        tbody.innerHTML += fila;
    });

    document.getElementById('contador-tickets').innerText = `Mostrando ${tickets.length} tickets en pantalla`;
}

// ==========================================================
// 3. ABRIR MODAL DE DETALLE Y CARGAR PRODUCTOS
// ==========================================================
async function abrirModalDetalle(ticketId) {
    const ticket = listaTicketsGlobal.find(t => t.id === ticketId);
    if (!ticket) return;

    // Llenamos cabecera estática
    document.getElementById('detalle-ticket-nro').innerText = ticket.nro_ticket;
    const fObj = new Date(ticket.fecha_hora);
    document.getElementById('detalle-ticket-fecha').innerText = `${fObj.toLocaleDateString('es-PE')} ${fObj.toLocaleTimeString('es-PE')}`;
    document.getElementById('detalle-ticket-cajero').innerText = ticket.usuarios ? ticket.usuarios.nombres : "Desconocido";
    document.getElementById('detalle-ticket-cliente').innerText = ticket.cliente_nombre || "Público en General";
    document.getElementById('detalle-ticket-total').innerText = parseFloat(ticket.total).toFixed(2);
    document.getElementById('detalle-ticket-pago').innerText = ticket.medio_pago;

    // Configurar el botón de Anular
    const btnAnular = document.getElementById('btn-anular-ticket');
    if (ticket.estado && ticket.estado.toLowerCase() === 'anulado') {
        btnAnular.disabled = true;
        btnAnular.innerText = "Ya está Anulado";
        btnAnular.className = "btn btn-secondary fw-medium flex-grow-1";
    } else {
        btnAnular.disabled = false;
        btnAnular.innerText = "Anular Ticket";
        btnAnular.className = "btn btn-outline-danger fw-medium flex-grow-1";
        btnAnular.onclick = () => procesarAnulacion(ticket.id, ticket.nro_ticket);
    }

    // Abrimos el modal
    const modalDOM = document.getElementById('modalDetalleTicket');
    if (!modalInstancia) { modalInstancia = new bootstrap.Modal(modalDOM); }
    modalInstancia.show();

    // Traemos los productos de la API
    const tbodyDetalle = document.getElementById('tabla-detalle-productos');
    tbodyDetalle.innerHTML = `<tr><td colspan="3" class="text-center small py-2">Cargando productos...</td></tr>`;

    try {
        const token = localStorage.getItem('token');
        // 🔥 CORREGIDO: Apuntando a /api/ticket/{id}/productos (SIN LA "S")
        const respuesta = await fetch(`http://127.0.0.1:5000/api/ticket/${ticketId}/productos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await respuesta.json();
        tbodyDetalle.innerHTML = '';

        // Soporta si backend envía {success: true, data: [...]} o directo el array [...]
        const listadoProductos = data.data || data;

        if (listadoProductos && listadoProductos.length > 0) {
            listadoProductos.forEach(item => {
                const nomProd = item.productos ? item.productos.nombre : 'Producto';
                tbodyDetalle.innerHTML += `
                <tr>
                    <td class="py-1 text-start fw-bold">${item.cantidad}</td>
                    <td class="py-1 text-start text-truncate" style="max-width: 120px;" title="${nomProd}">${nomProd}</td>
                    <td class="py-1 text-end">S/ ${parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>`;
            });
        } else {
            tbodyDetalle.innerHTML = `<tr><td colspan="3" class="text-center small text-danger">No se encontraron detalles.</td></tr>`;
        }
    } catch (e) {
        tbodyDetalle.innerHTML = `<tr><td colspan="3" class="text-center small text-danger">Error de red.</td></tr>`;
    }
}

// ==========================================================
// 4. LÓGICA DE ANULACIÓN DE TICKET
// ==========================================================
async function procesarAnulacion(ticketId, nroTicket) {
    const confirmacion = confirm(`⚠️ ADVERTENCIA ⚠️\n\n¿Estás absolutamente seguro de anular el ticket ${nroTicket}?\nEl dinero se restará de la caja y los productos volverán al stock del inventario. Esta acción no se puede deshacer.`);
    
    if (!confirmacion) return;

    try {
        const token = localStorage.getItem('token');
        // 🔥 CORREGIDO: Apuntando a /api/ticket/anular/{id} (SIN LA "S")
        const respuesta = await fetch(`http://127.0.0.1:5000/api/ticket/anular/${ticketId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await respuesta.json();

        if (respuesta.status === 403) {
            alert("Acceso denegado: Solo el Administrador puede anular tickets.");
            return;
        }

        if (data.success || respuesta.status === 200) {
            alert(`✅ El ticket ${nroTicket} fue anulado correctamente.`);
            modalInstancia.hide();
            cargarHistorialTickets(); // Refrescamos la tabla
        } else {
            alert("Error al anular: " + (data.error || "Fallo interno"));
        }
    } catch (error) {
        alert("Fallo de conexión con el servidor.");
    }
}

// ==========================================================
// 5. FILTROS LOCALES
// ==========================================================
function aplicarFiltrosLocales() {
    const txtBuscar = document.getElementById('input-buscar').value.toLowerCase().trim();
    const txtFecha = document.getElementById('filtro-fecha').value;
    const txtEstado = document.getElementById('filtro-estado').value;

    const filtrados = listaTicketsGlobal.filter(ticket => {
        const matcheaTexto = !txtBuscar || 
            (ticket.nro_ticket && ticket.nro_ticket.toLowerCase().includes(txtBuscar)) ||
            (ticket.cliente_nombre && ticket.cliente_nombre.toLowerCase().includes(txtBuscar));

        const fechaTicket = ticket.fecha_hora ? ticket.fecha_hora.split('T')[0] : '';
        const matcheaFecha = !txtFecha || fechaTicket === txtFecha;

        const estadoTicket = ticket.estado ? ticket.estado.toLowerCase() : 'valido';
        const matcheaEstado = (txtEstado === 'todos') || (estadoTicket === txtEstado);

        return matcheaTexto && matcheaFecha && matcheaEstado;
    });

    dibujarTablaTickets(filtrados);
}