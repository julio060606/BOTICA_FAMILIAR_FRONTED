let carrito = [];
let productosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Inyectar sidebar y navbar
    loadComponent("sidebar-container", "/components/sidebar.html");
    loadComponent("navbar-container", "/components/navbar.html");

    // Cargar productos para autocompletado
    await cargarProductosParaBusqueda();

    // Configurar buscador
    const buscador = document.getElementById('buscador-pos');
    buscador.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            agregarProductoPorBusqueda(buscador.value);
            buscador.value = '';
        }
    });
});

// Cargar todos los productos y crear datalist para autocompletado
async function cargarProductosParaBusqueda() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/inventario/productos');
        productosGlobal = await response.json();

        // Crear datalist dinámico
        let datalist = document.getElementById('lista-productos-pos');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'lista-productos-pos';
            document.body.appendChild(datalist);
        }

        datalist.innerHTML = '';

        productosGlobal.forEach(prod => {
            const option = document.createElement('option');
            option.value = `${prod.nombre} (${prod.sku || 'Sin SKU'})`;
            option.dataset.id = prod.id;
            option.dataset.precio = prod.precio_venta;
            datalist.appendChild(option);
        });

        // Asignar datalist al input
        document.getElementById('buscador-pos').setAttribute('list', 'lista-productos-pos');

    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

// Agregar producto desde el buscador
function agregarProductoPorBusqueda(texto) {
    if (!texto.trim()) return;

    const producto = productosGlobal.find(p => 
        `${p.nombre} (${p.sku || 'Sin SKU'})` === texto ||
        p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
        (p.sku && p.sku.includes(texto))
    );

    if (producto) {
        agregarAlCarrito(producto);
    } else {
        alert("❌ Producto no encontrado. Intenta escribir el nombre o SKU.");
    }
}

// Agregar al carrito
function agregarAlCarrito(producto) {
    const existente = carrito.find(item => item.id_producto === producto.id);

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({
            id_producto: producto.id,
            nombre: producto.nombre,
            precio_unitario: parseFloat(producto.precio_venta),
            cantidad: 1
        });
    }

    actualizarCarrito();
}

// Actualizar tabla del carrito
function actualizarCarrito() {
    const tbody = document.getElementById('carrito-body');
    tbody.innerHTML = '';

    let subtotal = 0;

    carrito.forEach((item, index) => {
        const sub = item.precio_unitario * item.cantidad;
        subtotal += sub;

        tbody.innerHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td class="text-end">S/ ${item.precio_unitario.toFixed(2)}</td>
                <td class="text-center">
                    <button onclick="cambiarCantidad(${index}, -1)" class="btn btn-sm btn-light">-</button>
                    <span class="mx-3 fw-bold">${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)" class="btn btn-sm btn-light">+</button>
                </td>
                <td class="text-end fw-bold">S/ ${sub.toFixed(2)}</td>
                <td class="text-center">
                    <button onclick="eliminarDelCarrito(${index})" class="btn btn-sm text-danger">🗑</button>
                </td>
            </tr>`;
    });

    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    document.getElementById('subtotal').textContent = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById('igv').textContent = `S/ ${igv.toFixed(2)}`;
    document.getElementById('total').textContent = `S/ ${total.toFixed(2)}`;
}

// Cambiar cantidad
function cambiarCantidad(index, cambio) {
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }
    actualizarCarrito();
}

// Eliminar producto
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

// Vaciar carrito
function vaciarCarrito() {
    if (confirm("¿Estás seguro de vaciar todo el ticket?")) {
        carrito = [];
        actualizarCarrito();
    }
}

// Cobrar Ticket
async function cobrarTicket() {
    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    const medioPago = document.querySelector('input[name="medio_pago"]:checked').value;
    const total = parseFloat(document.getElementById('total').textContent.replace('S/ ', ''));

    const datosVenta = {
        id_usuario: 1,                    // Cambiar según sistema de login
        total: total,
        igv: total * 0.18 / 1.18,
        medio_pago: medioPago,
        detalles: carrito
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/ventas/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVenta)
        });

        const resultado = await response.json();

        if (resultado.success) {
            alert(`✅ Venta registrada correctamente!\nTicket: ${resultado.nro_ticket}`);
            carrito = [];
            actualizarCarrito();
        } else {
            alert("❌ Error: " + resultado.error);
        }
    } catch (error) {
        alert("❌ Error de conexión con el servidor");
        console.error(error);
    }
}
