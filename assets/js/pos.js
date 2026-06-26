// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
let carrito = []; 
let catalogoProductos = []; // Guardamos el catálogo en memoria

// Al cargar la página, traemos los productos de la BD
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoPOS();

    // Escuchamos el buscador (Tanto si hace clic en la lista como si usa un escáner/Enter)
    const inputBuscador = document.getElementById('input-buscador-pos');
    if (inputBuscador) {
        inputBuscador.addEventListener('input', procesarSeleccionBuscador);
        inputBuscador.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') procesarSeleccionBuscador(e, true);
        });
    }
});

// ==========================================
// 2. BUSCADOR Y CATÁLOGO
// ==========================================
async function cargarCatalogoPOS() {
    try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch('http://127.0.0.1:5000/api/inventario/productos', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        });

        // Seguridad Zero Trust
        if (respuesta.status === 403) {
            alert("No tienes permisos para acceder al catálogo.");
            return;
        } else if (respuesta.status === 401) {
            window.location.replace('/pages/login.html');
            return;
        }

        // Si tu backend devuelve { success: true, data: [...] } o directo el array
        const json = await respuesta.json();
        catalogoProductos = json.data || json; 
        
        const datalist = document.getElementById('pos-lista-productos');
        datalist.innerHTML = '';

        // Llenamos el Datalist
        catalogoProductos.forEach(prod => {
            datalist.innerHTML += `<option value="${prod.nombre} (SKU-${prod.sku})" data-id="${prod.id}"></option>`;
        });
    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
    }
}

// Intercepta cuando el usuario elige algo de la lista
function procesarSeleccionBuscador(evento, esEnter = false) {
    const input = document.getElementById('input-buscador-pos');
    const textoIngresado = input.value;
    const opciones = document.getElementById('pos-lista-productos').options;
    
    let productoEncontrado = null;

    // Buscamos si el texto coincide con la lista desplegable
    for (let i = 0; i < opciones.length; i++) {
        if (opciones[i].value === textoIngresado) {
            const idProd = opciones[i].getAttribute('data-id');
            productoEncontrado = catalogoProductos.find(p => p.id == idProd);
            break;
        }
    }

    // Si encontró el producto, lo agregamos al carrito y limpiamos el buscador
    if (productoEncontrado) {
        // Asumiendo que tu tabla en BD tiene 'precio_venta'
        const precio = parseFloat(productoEncontrado.precio_venta || productoEncontrado.precio || 0);
        
        agregarProducto(productoEncontrado.id, productoEncontrado.nombre, precio, productoEncontrado.stock_actual);
        
        input.value = ''; // Limpiamos para el siguiente escaneo
        input.focus();    // Mantenemos el cursor ahí
    } else if (esEnter) {
        // Si dio Enter y no encontró nada (ej. código de barras mal leído)
        alert("Producto no encontrado en el catálogo.");
        input.value = '';
    }
}

// ==========================================
// 3. LOGICA DEL CARRITO (Agregar, Quitar, Calcular)
// ==========================================
function agregarProducto(id, nombre, precio, stock) {
    if (stock <= 0) {
        alert(`El producto ${nombre} no tiene stock disponible.`);
        return;
    }

    const existe = carrito.find(item => item.id_producto === id);
    if (existe) {
        if (existe.cantidad < stock) {
            existe.cantidad++;
        } else {
            alert(`Solo hay ${stock} unidades de ${nombre} en stock.`);
        }
    } else {
        carrito.push({
            id_producto: id,
            nombre: nombre,
            precio: precio,
            stock: stock,
            cantidad: 1
        });
    }
    actualizarVistaCarrito();
}

function modificarCantidad(idProducto, cambio) {
    const item = carrito.find(p => p.id_producto === idProducto);
    if (!item) return;

    const nuevaCantidad = item.cantidad + cambio;
    
    if (nuevaCantidad <= 0) {
        eliminarProducto(idProducto);
    } else if (nuevaCantidad > item.stock) {
        alert("Stock máximo alcanzado.");
    } else {
        item.cantidad = nuevaCantidad;
        actualizarVistaCarrito();
    }
}

function eliminarProducto(idProducto) {
    carrito = carrito.filter(p => p.id_producto !== idProducto);
    actualizarVistaCarrito();
}

function vaciarCarrito() {
    if(carrito.length > 0 && confirm("¿Estás seguro de vaciar todo el carrito?")) {
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
                <div class="small text-google-muted">Stock Disp: ${item.stock} und</div>
            </td>
            <td class="text-center text-google-muted">S/ ${item.precio.toFixed(2)}</td>
            <td>
                <div class="d-flex justify-content-center align-items-center gap-2">
                    <button class="btn btn-sm btn-light border" onclick="modificarCantidad(${item.id_producto}, -1)">-</button>
                    <span class="fw-bold fs-6 text-google-title" style="width: 30px; text-align: center;">${item.cantidad}</span>
                    <button class="btn btn-sm btn-light border" onclick="modificarCantidad(${item.id_producto}, 1)">+</button>
                </div>
            </td>
            <td class="text-end fw-bold text-google-title fs-6">S/ ${subtotalItem.toFixed(2)}</td>
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
// 4. FLUJO DE COBRO (MODAL Y BACKEND)
// ==========================================

// Esta función es la que llama el botón verde gigante de tu HTML: onclick="procesarCobro()"
function procesarCobro() {
    if (carrito.length === 0) {
        alert("El carrito está vacío. Busca o escanea productos primero.");
        return;
    }

    // 1. Extraemos los datos generales
    const subtotalHTML = document.getElementById('resumen-subtotal').innerText;
    const igvHTML = document.getElementById('resumen-igv').innerText;
    const totalHTML = document.getElementById('resumen-total').innerText;
    const medioPagoSeleccionado = document.querySelector('input[name="medioPagoRadio"]:checked').value;

    // 2. Llenamos los totales y el método de pago en el Modal
    document.getElementById('modal-ticket-subtotal').innerText = subtotalHTML;
    document.getElementById('modal-ticket-igv').innerText = igvHTML;
    document.getElementById('modal-monto-total').innerText = totalHTML;
    document.getElementById('modal-metodo-pago').innerText = medioPagoSeleccionado;

    // 3. PINTAMOS LOS DETALLES DE LOS PRODUCTOS EN EL VOUCHER
    const tbodyModal = document.getElementById('modal-ticket-detalles');
    tbodyModal.innerHTML = ''; // Limpiamos primero
    
    carrito.forEach(item => {
        const subtotalItem = (item.precio * item.cantidad).toFixed(2);
        tbodyModal.innerHTML += `
        <tr>
            <td class="py-1 text-start fw-bold">${item.cantidad}</td>
            <td class="py-1 text-start text-truncate" style="max-width: 140px;" title="${item.nombre}">${item.nombre}</td>
            <td class="py-1 text-end">S/ ${subtotalItem}</td>
        </tr>`;
    });

    // 4. Mostramos el Modal
    const modalCobro = new bootstrap.Modal(document.getElementById('modalCobrar'));
    modalCobro.show();
}
// Esta función se llama desde el botón "Emitir Ticket" DENTRO del Modal
async function procesarCobroBackend() {
    const btnConfirmar = document.getElementById('btn-confirmar-cobro');
    btnConfirmar.disabled = true;
    btnConfirmar.innerText = "Procesando...";

    const igvHTML = parseFloat(document.getElementById('resumen-igv').innerText);
    const totalHTML = parseFloat(document.getElementById('resumen-total').innerText);
    const medioPagoSeleccionado = document.querySelector('input[name="medioPagoRadio"]:checked').value;

    const detallesPydantic = carrito.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio
    }));

    const payload = {
        igv: igvHTML,
        total: totalHTML,
        medio_pago: medioPagoSeleccionado,
        detalles: detallesPydantic
    };

   try {
        const token = localStorage.getItem('token');
        const respuesta = await fetch('http://127.0.0.1:5000/api/ventas/registrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        // 🛡️ EL ESCUDO QUE FALTABA
        if (respuesta.status === 403) {
            // 1. Escondemos el modal del voucher
            bootstrap.Modal.getInstance(document.getElementById('modalCobrar')).hide();
            // 2. Disparamos tu modal de seguridad
            const modalSeguridad = new bootstrap.Modal(document.getElementById('modalAccesoDenegado'));
            modalSeguridad.show();
            
            // Restauramos el botón del voucher por si acaso
            btnConfirmar.disabled = false;
            btnConfirmar.innerText = "Emitir Ticket";
            return; // Cortamos la ejecución antes de leer el JSON
        } else if (respuesta.status === 401) {
            window.location.replace('/pages/login.html');
            return;
        }

        const data = await respuesta.json();

        if (respuesta.status === 201 && data.success) {
            // Éxito: Ocultamos el modal, vaciamos carrito (sin confirmación) y avisamos
            bootstrap.Modal.getInstance(document.getElementById('modalCobrar')).hide();
            carrito = [];
            actualizarVistaCarrito();
            alert(`¡Venta Exitosa!\nNro de Ticket: ${data.data.nro_ticket}`);
        } else {
            alert("Error al procesar la venta: " + (data.message || JSON.stringify(data.data)));
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Fallo de conexión con el servidor.");
    } finally {
        // Restauramos el botón por si falló y quieren reintentar
        btnConfirmar.disabled = false;
        btnConfirmar.innerText = "Emitir Ticket";
    }
}