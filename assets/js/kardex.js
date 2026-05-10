// Variable para guardar el catálogo y no consultar la BD a cada rato
let catalogoProductos = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarBuscador();

    // Escuchamos cuando el usuario elige un producto del datalist
    const inputBuscador = document.getElementById('kardex-buscador-input');
    if (inputBuscador) {
        inputBuscador.addEventListener('input', procesarSeleccion);
    }
});

// ==========================================
// 1. CARGAR EL BUSCADOR
// ==========================================
async function cargarBuscador() {
    try {
        const respuesta = await fetch('http://127.0.0.1:5000/api/inventario/productos');
        catalogoProductos = await respuesta.json();
        
        const datalist = document.getElementById('kardex-lista-productos');
        datalist.innerHTML = '';

        catalogoProductos.forEach(prod => {
            datalist.innerHTML += `<option value="${prod.nombre} (SKU-${prod.sku})" data-id="${prod.id}"></option>`;
        });
    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
    }
}

// ==========================================
// 2. PROCESAR LA SELECCIÓN
// ==========================================
function procesarSeleccion(evento) {
    const textoIngresado = evento.target.value;
    const opciones = document.getElementById('kardex-lista-productos').options;
    
    let idProducto = null;
    let productoSeleccionado = null;

    // Buscamos si el texto coincide con alguna opción
    for (let i = 0; i < opciones.length; i++) {
        if (opciones[i].value === textoIngresado) {
            idProducto = opciones[i].getAttribute('data-id');
            // Buscamos los datos completos del producto en nuestra variable global
            productoSeleccionado = catalogoProductos.find(p => p.id == idProducto);
            break;
        }
    }

    // Si encontró un producto válido, actualizamos la interfaz
    if (productoSeleccionado) {
        actualizarResumen(productoSeleccionado);
        cargarHistorialKardex(idProducto);
    }
}

// ==========================================
// 3. ACTUALIZAR EL CUADRO DE RESUMEN
// ==========================================
function actualizarResumen(producto) {
    document.getElementById('kardex-resumen-sku').innerText = `SKU: ${producto.sku}`;
    document.getElementById('kardex-resumen-nombre').innerText = producto.nombre;
    // Si tu bd devuelve categorias(nombre), lo mostramos. Si no, mostramos la presentación
    document.getElementById('kardex-resumen-categoria').innerText = producto.categorias?.nombre || producto.descripcion_presentacion || "Sin categoría";
    document.getElementById('kardex-resumen-stock').innerText = producto.stock_actual;
}

// ==========================================
// 4. TRAER Y DIBUJAR EL HISTORIAL
// ==========================================
async function cargarHistorialKardex(idProducto) {
    const tbody = document.getElementById('kardex-tabla-body');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">Cargando movimientos...</td></tr>`;

    try {
        const respuesta = await fetch(`http://127.0.0.1:5000/api/kardex/${idProducto}`);
        
        if (!respuesta.ok) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-google-muted">Este producto no tiene movimientos registrados aún.</td></tr>`;
            return;
        }

        const movimientos = await respuesta.json();
        tbody.innerHTML = ''; // Limpiamos

        movimientos.forEach(mov => {
            // Formatear fecha (De SQL a formato legible)
            const fechaObj = new Date(mov.fecha_hora);
            const fechaLegible = fechaObj.toLocaleString('es-PE', { hour12: false });

            // Configurar el color y texto de la etiqueta según el tipo de movimiento
            let badgeClass = "";
            let textoTipo = mov.tipo_movimiento;
            let colorCantidad = "";
            let signoCantidad = mov.cantidad > 0 ? "+" : "";

            switch (mov.tipo_movimiento) {
                case 'ENTRADA_COMPRA':
                    badgeClass = "badge-tonal-success text-success";
                    textoTipo = "Entrada por Compra";
                    colorCantidad = "text-success";
                    break;
                case 'SALIDA_VENTA':
                    badgeClass = "badge-tonal-danger text-danger";
                    textoTipo = "Salida por Venta";
                    colorCantidad = "text-danger";
                    break;
                case 'ENTRADA_ANULACION':
                    badgeClass = "badge-tonal-primary text-primary"; // O el color que tengas para primario
                    textoTipo = "Entrada por Anulación";
                    colorCantidad = "text-primary";
                    break;
                case 'SALIDA_VENCIMIENTO':
                case 'AJUSTE_INVENTARIO':
                    badgeClass = "badge-tonal-warning text-warning";
                    textoTipo = mov.tipo_movimiento.replace('_', ' ');
                    colorCantidad = "text-warning";
                    break;
                default:
                    badgeClass = "bg-secondary";
            }

            // Extraer el nombre del usuario si viene en el JSON, sino poner "Sistema"
            const nombreUsuario = mov.usuarios?.nombres || "Sistema";

            const fila = `
            <tr>
                <td class="text-google-muted">${fechaLegible}</td>
                <td>
                    <span class="badge ${badgeClass} rounded-pill fw-medium px-3 py-2" style="background-color: var(--g-${colorCantidad.split('-')[1]}-soft, #e9ecef);">${textoTipo}</span>
                </td>
                <td class="text-google-title">${mov.referencia}</td>
                <td class="text-google-muted">${nombreUsuario}</td>
                <td class="text-center fw-bold ${colorCantidad}">${signoCantidad}${mov.cantidad}</td>
                <td class="text-center fw-bold text-google-title fs-6">${mov.saldo_final}</td>
            </tr>`;
            
            tbody.innerHTML += fila;
        });

    } catch (error) {
        console.error("Error al cargar el kardex:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error al conectar con el servidor.</td></tr>`;
    }
}