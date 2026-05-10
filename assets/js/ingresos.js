// ==========================================
// VARIABLE GLOBAL
// ==========================================
// Aquí se guardarán los medicamentos que el usuario va agregando
let listaDetalles = []; 

// ==========================================
// INICIALIZADOR (Cuando la página carga)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Llenar los menús desplegables al abrir la página
    cargarProveedores();
    cargarProductosModal();

    // 🔴 NUEVO: Dibujar la tabla vacía al inicio
    actualizarTablaHTML();

    // 2. Conectar el botón "Agregar a la tabla" del Modal
    const btnAgregarModal = document.getElementById('btn-agregar-modal');
    if (btnAgregarModal) {
        btnAgregarModal.addEventListener('click', agregarDesdeModal);
    }

    // 3. Conectar el botón principal "Registrar Ingreso de Mercadería"
    const btnGuardar = document.getElementById('ing-btn-guardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarIngreso);
    }
});


// ==========================================
// FUNCIONES DE LECTURA (GET)
// ==========================================

async function cargarProveedores() {
    try {
        const respuesta = await fetch('http://127.0.0.1:5000/api/compras/proveedores');
        const proveedores = await respuesta.json();
        
        const selectProveedor = document.getElementById('ing-proveedor');
        selectProveedor.innerHTML = '<option value="" selected disabled>Seleccionar laboratorio/droguería...</option>';

        proveedores.forEach(prov => {
            selectProveedor.innerHTML += `<option value="${prov.id}">${prov.razon_social} (${prov.ruc})</option>`;
        });
    } catch (error) {
        console.error("Error al cargar proveedores:", error);
    }
}

async function cargarProductosModal() {
    try {
        const respuesta = await fetch('http://127.0.0.1:5000/api/inventario/productos');
        const productos = await respuesta.json();
        
        const datalist = document.getElementById('lista-productos');
        datalist.innerHTML = ''; // Limpiamos

        productos.forEach(prod => {
            // Creamos las sugerencias. Guardamos el ID oculto para usarlo luego
            datalist.innerHTML += `<option value="${prod.nombre} (SKU-${prod.id})" data-id="${prod.id}" data-nombre="${prod.nombre}"></option>`;
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}


// ==========================================
// LÓGICA DEL MODAL Y LA TABLA
// ==========================================

function agregarDesdeModal() {
    // 1. Capturamos lo que el usuario escribió o seleccionó
    const inputVal = document.getElementById('ing-modal-producto-input').value;
    const opcionesDatalist = document.getElementById('lista-productos').options;
    
    // 2. Buscamos el ID oculto que corresponde a ese texto
    let idProductoSeleccionado = null;
    let nombreProductoSeleccionado = "";

    for (let i = 0; i < opcionesDatalist.length; i++) {
        if (opcionesDatalist[i].value === inputVal) {
            idProductoSeleccionado = opcionesDatalist[i].getAttribute('data-id');
            nombreProductoSeleccionado = opcionesDatalist[i].getAttribute('data-nombre');
            break;
        }
    }

    const lote = document.getElementById('ing-modal-lote').value;
    const vencimiento = document.getElementById('ing-modal-vencimiento').value;
    const cantidad = document.getElementById('ing-modal-cantidad').value;
    const costo = document.getElementById('ing-modal-costo').value;

    // Validamos que haya seleccionado un producto válido de la lista y llenado todo
    if (!idProductoSeleccionado) {
        alert("Por favor, seleccione un producto válido de la lista sugerida.");
        return;
    }
    if (!lote || !vencimiento || !cantidad || !costo) {
        alert("Por favor, complete todos los campos (Lote, Vencimiento, Cantidad, Costo).");
        return;
    }

    const fechaSQL = vencimiento + "-01"; 
    const cantNum = parseInt(cantidad);
    const costoNum = parseFloat(costo);

    const nuevoItem = {
        id_producto: parseInt(idProductoSeleccionado),
        nombre_producto: nombreProductoSeleccionado,
        codigo_lote: lote.toUpperCase(),
        fecha_vencimiento: fechaSQL,
        cantidad: cantNum,
        costo_unitario: costoNum,
        subtotal: cantNum * costoNum
    };

    // Empujamos y dibujamos
    listaDetalles.push(nuevoItem);
    actualizarTablaHTML();

    // Limpiamos los inputs del modal
    document.getElementById('ing-modal-producto-input').value = '';
    document.getElementById('ing-modal-lote').value = '';
    document.getElementById('ing-modal-vencimiento').value = '';
    document.getElementById('ing-modal-cantidad').value = '';
    document.getElementById('ing-modal-costo').value = '';

    // Cerramos el modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarIngreso'));
    if(modal) modal.hide();
}

function actualizarTablaHTML() {
    const tbody = document.getElementById('ing-tabla-body');
    const totalTexto = document.getElementById('ing-total-text');
    
    tbody.innerHTML = ''; // Limpiamos

    if (listaDetalles.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5 text-google-muted">
                No hay productos agregados a este documento aún.
            </td>
        </tr>`;
        totalTexto.innerText = 'S/ 0.00';
        return;
    }

    let sumaTotal = 0;

    listaDetalles.forEach((item, index) => {
        sumaTotal += item.subtotal;
        
        const fila = `
        <tr>
            <td>
                <div class="text-google-title fw-medium">${item.nombre_producto}</div>
                <div class="small text-google-muted font-monospace">SKU-${item.id_producto}</div>
            </td>
            <td>
                <div class="small fw-bold" style="color: var(--g-text-title);">${item.codigo_lote}</div>
                <div class="small text-google-muted">${item.fecha_vencimiento}</div>
            </td>
            <td class="text-center fw-medium text-google-title">${item.cantidad}</td>
            <td class="text-end text-google-muted">S/ ${item.costo_unitario.toFixed(2)}</td>
            <td class="text-end fw-medium" style="color: var(--g-text-title);">S/ ${item.subtotal.toFixed(2)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm p-1 text-danger shadow-none" onclick="eliminarProducto(${index})" title="Quitar">
                    🗑️
                </button>
            </td>
        </tr>`;
        
        tbody.innerHTML += fila;
    });

    totalTexto.innerText = `S/ ${sumaTotal.toFixed(2)}`;
}

function eliminarProducto(index) {
    listaDetalles.splice(index, 1);
    actualizarTablaHTML();
}


// ==========================================
// FUNCIÓN PRINCIPAL DE GUARDADO (POST)
// ==========================================

async function guardarIngreso() {
    const idProveedor = document.getElementById('ing-proveedor').value;
    const nroDoc = document.getElementById('ing-nro-doc').value;
    const fecha = document.getElementById('ing-fecha').value;

    if (!idProveedor || !nroDoc || listaDetalles.length === 0) {
        alert("Por favor, seleccione un proveedor, ingrese el número de factura y agregue al menos un producto.");
        return;
    }

    const totalCompra = listaDetalles.reduce((suma, item) => suma + item.subtotal, 0);

    const paqueteDatos = {
        id_proveedor: parseInt(idProveedor),
        id_usuario: 1, // ID temporal
        nro_documento: nroDoc,
        fecha_emision: fecha,
        total: totalCompra,
        detalles: listaDetalles
    };

    try {
        const respuesta = await fetch('http://127.0.0.1:5000/api/compras/ingresar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paqueteDatos)
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert("¡Éxito! " + resultado.mensaje);
            window.location.reload(); // Recarga la página para limpiar todo
        } else {
            alert("Hubo un error en el servidor: " + resultado.error);
        }

    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor.");
    }
}