// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
let carrito = []; 
let catalogoProductos = [];

document.addEventListener('DOMContentLoaded', async () => {
    const cajaAbierta = await verificarCajaAbierta();
    if (cajaAbierta) {
        cargarCatalogoPOS();
        const inputBuscador = document.getElementById('input-buscador-pos');
        if (inputBuscador) {
            inputBuscador.addEventListener('input', procesarSeleccionBuscador);
            inputBuscador.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') procesarSeleccionBuscador(e, true);
            });
        }
    }
});

async function verificarCajaAbierta() {
    try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch('http://127.0.0.1:5000/api/caja/turno/activo', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.status === 401) {
            window.location.replace('/pages/login.html');
            return false;
        }

        const data = await respuesta.json();

        if (respuesta.status === 403 && data.codigo_error === "CAJA_AJENA") {
            alert("⚠️ " + data.message);
            window.location.replace('/pages/ventas/control-caja.html');
            return false;
        }

        if (data.success && data.data === null) {
            alert("⚠️ Atención: No tienes un turno de caja abierto.\nSerás redirigido al Control de Caja.");
            window.location.replace('/pages/ventas/control-caja.html');
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

// ==========================================
// 2. BUSCADOR Y CARRITO
// ==========================================
async function cargarCatalogoPOS() {
    try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch('http://127.0.0.1:5000/api/inventario/productos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.status === 403) return alert("No tienes permisos.");
        if (respuesta.status === 401) return window.location.replace('/pages/login.html');

        const json = await respuesta.json();
        catalogoProductos = json.data || json; 
        
        const datalist = document.getElementById('pos-lista-productos');
        datalist.innerHTML = '';
        catalogoProductos.forEach(prod => {
            datalist.innerHTML += `<option value="${prod.nombre} (SKU-${prod.sku})" data-id="${prod.id}"></option>`;
        });
    } catch (error) {}
}

function procesarSeleccionBuscador(evento, esEnter = false) {
    const input = document.getElementById('input-buscador-pos');
    const textoIngresado = input.value;
    const opciones = document.getElementById('pos-lista-productos').options;
    let productoEncontrado = null;

    for (let i = 0; i < opciones.length; i++) {
        if (opciones[i].value === textoIngresado) {
            const idProd = opciones[i].getAttribute('data-id');
            productoEncontrado = catalogoProductos.find(p => p.id == idProd);
            break;
        }
    }

    if (productoEncontrado) {
        const precio = parseFloat(productoEncontrado.precio_venta || productoEncontrado.precio || 0);
        agregarProducto(productoEncontrado.id, productoEncontrado.nombre, precio, productoEncontrado.stock_actual);
        input.value = ''; 
        input.focus();    
    } else if (esEnter) {
        alert("Producto no encontrado.");
        input.value = '';
    }
}

function agregarProducto(id, nombre, precio, stock) {
    if (stock <= 0) return alert(`Sin stock: ${nombre}`);
    const existe = carrito.find(item => item.id_producto === id);
    if (existe) {
        if (existe.cantidad < stock) existe.cantidad++;
        else alert(`Solo hay ${stock} en stock.`);
    } else {
        carrito.push({ id_producto: id, nombre: nombre, precio: precio, stock: stock, cantidad: 1 });
    }
    actualizarVistaCarrito();
}

function modificarCantidad(idProducto, cambio) {
    const item = carrito.find(p => p.id_producto === idProducto);
    if (!item) return;
    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad <= 0) eliminarProducto(idProducto);
    else if (nuevaCantidad > item.stock) alert("Stock máximo.");
    else { item.cantidad = nuevaCantidad; actualizarVistaCarrito(); }
}

function eliminarProducto(idProducto) {
    carrito = carrito.filter(p => p.id_producto !== idProducto);
    actualizarVistaCarrito();
}

function vaciarCarrito() {
    if(carrito.length > 0 && confirm("¿Vaciar todo el carrito?")) {
        carrito = [];
        actualizarVistaCarrito();
    }
}

function actualizarVistaCarrito() {
    const tbody = document.getElementById('tabla-carrito-body');
    tbody.innerHTML = ''; 
    let subtotalCrudo = 0;

    carrito.forEach(item => {
        const subtotalItem = item.precio * item.cantidad;
        subtotalCrudo += subtotalItem;
        tbody.innerHTML += `
        <tr data-id="${item.id_producto}">
            <td>
                <div class="text-google-title fw-bold">${item.nombre}</div>
                <div class="small text-google-muted">Stock Disp: ${item.stock}</div>
            </td>
            <td class="text-center text-google-muted">S/ ${item.precio.toFixed(2)}</td>
            <td>
                <div class="d-flex justify-content-center align-items-center gap-2">
                    <button class="btn btn-sm btn-light border" onclick="modificarCantidad(${item.id_producto}, -1)">-</button>
                    <span class="fw-bold fs-6" style="width: 30px; text-align: center;">${item.cantidad}</span>
                    <button class="btn btn-sm btn-light border" onclick="modificarCantidad(${item.id_producto}, 1)">+</button>
                </div>
            </td>
            <td class="text-end fw-bold fs-6">S/ ${subtotalItem.toFixed(2)}</td>
            <td class="text-center">
                <button class="btn btn-sm p-2 text-danger shadow-none fs-5" onclick="eliminarProducto(${item.id_producto})">🗑️</button>
            </td>
        </tr>`;
    });

    const baseImponible = subtotalCrudo / 1.18;
    const igv = subtotalCrudo - baseImponible;

    document.getElementById('resumen-subtotal').innerText = baseImponible.toFixed(2);
    document.getElementById('resumen-igv').innerText = igv.toFixed(2);
    document.getElementById('resumen-total').innerText = subtotalCrudo.toFixed(2);
    document.getElementById('contador-productos').innerText = `Ticket Actual (${carrito.length} Productos)`;
}

// ==========================================
// 4. FLUJO DE COBRO (VOUCHER Y VUELTO)
// ==========================================
function procesarCobro() {
    if (carrito.length === 0) return alert("El carrito está vacío.");

    // Leemos el radio seleccionado en la pantalla principal
    const radioSeleccionado = document.querySelector('input[name="medioPagoRadio"]:checked');
    if (!radioSeleccionado) return alert("Selecciona un método de pago.");
    const medioPago = radioSeleccionado.value;

    const totalHTML = document.getElementById('resumen-total').innerText;

    // Llenamos el Modal
    document.getElementById('modal-monto-total').innerText = totalHTML;
    document.getElementById('modal-metodo-pago').innerText = medioPago;

    // Lógica para mostrar la calculadora
    const cajaVuelto = document.getElementById('caja-calculadora-vuelto');
    const inputEntregado = document.getElementById('input-monto-entregado');
    
    if (medioPago === 'EFECTIVO') {
        cajaVuelto.style.display = 'block';
        inputEntregado.value = totalHTML; 
        calcularVueltoEnPantalla();
    } else {
        cajaVuelto.style.display = 'none';
        inputEntregado.value = 0; 
    }

    // Tabla del voucher
    const tbodyModal = document.getElementById('modal-ticket-detalles');
    tbodyModal.innerHTML = ''; 
    carrito.forEach(item => {
        const subtotalItem = (item.precio * item.cantidad).toFixed(2);
        tbodyModal.innerHTML += `
        <tr>
            <td class="py-1 text-start fw-bold">${item.cantidad}</td>
            <td class="py-1 text-start text-truncate" style="max-width: 140px;">${item.nombre}</td>
            <td class="py-1 text-end">S/ ${subtotalItem}</td>
        </tr>`;
    });

    const modalCobro = new bootstrap.Modal(document.getElementById('modalCobrar'));
    modalCobro.show();
}

function calcularVueltoEnPantalla() {
    const totalVenta = parseFloat(document.getElementById('resumen-total').innerText) || 0;
    const montoEntregado = parseFloat(document.getElementById('input-monto-entregado').value) || 0;
    const vuelto = montoEntregado - totalVenta;
    const textoVuelto = document.getElementById('texto-vuelto-calculado');

    if (vuelto < 0) {
        textoVuelto.innerText = "Faltan S/ " + Math.abs(vuelto).toFixed(2);
        textoVuelto.className = "fw-bold fs-5 text-danger";
    } else {
        textoVuelto.innerText = "S/ " + vuelto.toFixed(2);
        textoVuelto.className = "fw-bold fs-4 text-primary";
    }
}

async function procesarCobroBackend() {
    const btnConfirmar = document.getElementById('btn-confirmar-cobro');
    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Procesando...";

    const totalHTML = parseFloat(document.getElementById('resumen-total').innerText);
    const medioPagoSeleccionado = document.querySelector('input[name="medioPagoRadio"]:checked').value;
    
    let montoEntregadoReal = 0;
    if (medioPagoSeleccionado === 'EFECTIVO') {
        montoEntregadoReal = parseFloat(document.getElementById('input-monto-entregado').value) || 0;
        if (montoEntregadoReal < totalHTML) {
            alert("El cliente no ha entregado suficiente dinero.");
            btnConfirmar.disabled = false;
            btnConfirmar.innerText = "Emitir Ticket";
            return;
        }
    }

    const detallesPydantic = carrito.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio
    }));

    const payload = {
        igv: parseFloat(document.getElementById('resumen-igv').innerText),
        total: totalHTML,
        medio_pago: medioPagoSeleccionado,
        monto_entregado: montoEntregadoReal, 
        detalles: detallesPydantic
    };

    try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch('http://127.0.0.1:5000/api/ventas/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (respuesta.status === 401) return window.location.replace('/pages/login.html');

        const data = await respuesta.json();

        if (respuesta.status === 403) {
            bootstrap.Modal.getInstance(document.getElementById('modalCobrar')).hide();
            if (data.codigo_error === "CAJA_CERRADA" || data.codigo_error === "CAJA_AJENA") {
                alert("⚠️ " + data.message);
                window.location.href = '/pages/ventas/control-caja.html';
            } else {
                new bootstrap.Modal(document.getElementById('modalAccesoDenegado')).show();
            }
            btnConfirmar.disabled = false;
            btnConfirmar.innerText = "Emitir Ticket";
            return; 
        }

        if (respuesta.status === 201 && data.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalCobrar')).hide();
            carrito = [];
            actualizarVistaCarrito();
            alert(`¡Venta Exitosa!\nNro de Ticket: ${data.data.nro_ticket}`);
        } else {
            alert("Error al procesar la venta: " + (data.message || JSON.stringify(data.data)));
        }

    } catch (error) {
        alert("Fallo de conexión con el servidor.");
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "Emitir Ticket";
    }
}