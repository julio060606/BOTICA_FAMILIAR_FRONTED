// Variables globales para mantener los datos en memoria
let listaProductos = [];
let listaCategorias = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos iniciales
    await cargarCategorias();
    await cargarProductos();

    // 2. Conectar Botones de Guardar (Modales)
    const btnGuardarNuevo = document.getElementById('btn-guardar-nuevo');
    if (btnGuardarNuevo) btnGuardarNuevo.addEventListener('click', guardarNuevoProducto);
    
    const btnGuardarEdit = document.getElementById('btn-guardar-edit');
    if (btnGuardarEdit) btnGuardarEdit.addEventListener('click', guardarEdicionProducto);

    // 3. CONECTAR FILTROS Y BUSCADOR (Eventos en tiempo real)
    const inputBuscador = document.getElementById('cat-buscador');
    if (inputBuscador) inputBuscador.addEventListener('input', filtrarCatalogo);
    
    const filtroCategoria = document.getElementById('cat-filtro-categoria');
    if (filtroCategoria) filtroCategoria.addEventListener('change', filtrarCatalogo);
    
    const filtroEstado = document.getElementById('cat-filtro-estado');
    if (filtroEstado) filtroEstado.addEventListener('change', filtrarCatalogo);
});

// ==========================================
// LECTURA (GET) - TABLA Y CATEGORÍAS
// ==========================================

async function cargarCategorias() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/inventario/categorias');
        listaCategorias = await res.json();
        
        // Llenamos los select de los Modales
        let opcionesFormularios = '<option value="" selected disabled>Seleccionar...</option>';
        // Llenamos el select del Filtro Superior
        let opcionesFiltro = '<option value="" selected>Todas las categorías</option>';

        listaCategorias.forEach(cat => {
            const opcion = `<option value="${cat.id}">${cat.nombre}</option>`;
            opcionesFormularios += opcion;
            opcionesFiltro += opcion;
        });

        // Inyectamos al HTML
        const selectNuevoCat = document.getElementById('nuevo-categoria');
        if (selectNuevoCat) selectNuevoCat.innerHTML = opcionesFormularios;
        
        const selectEditCat = document.getElementById('edit-categoria');
        if (selectEditCat) selectEditCat.innerHTML = opcionesFormularios;
        
        const selectFiltroCat = document.getElementById('cat-filtro-categoria');
        if (selectFiltroCat) selectFiltroCat.innerHTML = opcionesFiltro;

    } catch (error) { console.error("Error cargando categorías:", error); }
}

async function cargarProductos() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/inventario/productos');
        listaProductos = await res.json();
        
        // En lugar de renderizar todo, llamamos a filtrar para que aplique 
        // los filtros por defecto (ej. Mostrar solo ACTIVOS al iniciar)
        filtrarCatalogo();
    } catch (error) { console.error("Error cargando productos:", error); }
}

// ==========================================
// LÓGICA DE FILTRADO (Buscador y Selects)
// ==========================================
function filtrarCatalogo() {
    // 1. Capturamos qué quiere buscar el usuario de forma segura
    const inputBuscador = document.getElementById('cat-buscador');
    const textoBusqueda = inputBuscador ? inputBuscador.value.toLowerCase() : "";
    
    const selectCategoria = document.getElementById('cat-filtro-categoria');
    const categoriaSeleccionada = selectCategoria ? selectCategoria.value : "";
    
    const selectEstado = document.getElementById('cat-filtro-estado');
    const estadoSeleccionado = selectEstado ? selectEstado.value : "ACTIVOS";

    // 2. Filtramos la lista global de productos
    const productosFiltrados = listaProductos.filter(prod => {
        
        // A. Coincidencia de texto (A PRUEBA DE BALAS: Evita errores si algo viene vacío o es número)
        const skuStr = (prod.sku || "").toString().toLowerCase();
        const nombreStr = (prod.nombre || "").toString().toLowerCase();
        const descStr = (prod.descripcion_presentacion || "").toString().toLowerCase();

        const coincideTexto = 
            skuStr.includes(textoBusqueda) || 
            nombreStr.includes(textoBusqueda) || 
            descStr.includes(textoBusqueda);

        // B. Coincidencia de Categoría
        const coincideCategoria = (categoriaSeleccionada === "") || (prod.id_categoria == categoriaSeleccionada);

        // C. Coincidencia de Estado
        let coincideEstado = true;
        if (estadoSeleccionado === "ACTIVOS") {
            coincideEstado = (prod.estado === "ACTIVO");
        } else if (estadoSeleccionado === "INACTIVOS") {
            coincideEstado = (prod.estado === "INACTIVO");
        }
        // Si es "TODOS", coincideEstado se queda en true

        // Solo devuelve el producto si pasa LOS TRES filtros
        return coincideTexto && coincideCategoria && coincideEstado;
    });

    // 3. Mandamos la lista ya filtrada a dibujar
    renderizarTabla(productosFiltrados);
}

// ==========================================
// RENDERIZADO DE TABLA
// ==========================================
function renderizarTabla(productos) {
    const tbody = document.getElementById('cat-tabla-body');
    if (!tbody) return; // Si no encuentra la tabla, se detiene
    
    tbody.innerHTML = '';

    // Mensaje si no hay resultados
    if (productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-google-muted">No se encontraron productos con estos filtros.</td></tr>`;
        return;
    }

    productos.forEach(prod => {
        const nombreCategoria = prod.categorias?.nombre || "Sin categoría";
        
        // Colores y estilos según el estado
        let estadoBadge = '';
        let estiloFila = '';
        
        if (prod.estado === 'ACTIVO') {
            estadoBadge = '<span class="badge badge-tonal-success rounded-pill px-3 py-2 fw-medium">Activo</span>';
        } else {
            estadoBadge = '<span class="badge badge-tonal-inactive rounded-pill px-3 py-2 fw-medium bg-light text-secondary">Inactivo</span>';
            estiloFila = 'opacity: 0.6;'; // Atenuar la fila si está inactiva
        }

        const fila = `
        <tr style="${estiloFila}">
            <td class="text-google-muted small font-monospace">${prod.sku || '-'}</td>
            <td>
                <div class="fw-medium ${prod.estado === 'ACTIVO' ? 'text-google-title' : 'text-decoration-line-through'}">${prod.nombre} ${prod.es_combo ? '📦 (Combo)' : ''}</div>
                <div class="small mt-1" style="color: #5f6368;">${prod.descripcion_presentacion || '-'}</div>
            </td>
            <td><span class="badge border-google text-google-muted bg-white fw-normal rounded-pill px-3 py-2">${nombreCategoria}</span></td>
            <td class="text-end text-google-muted">S/ ${(prod.precio_costo || 0).toFixed(2)}</td>
            <td class="text-end fw-medium" style="color: #1e8e3e;">S/ ${(prod.precio_venta || 0).toFixed(2)}</td>
            <td class="text-center fw-medium text-google-muted">${prod.stock_minimo || 0}</td>
            <td class="text-center">${estadoBadge}</td>
            <td class="text-end">
                <button class="btn btn-sm text-primary fw-medium rounded-pill px-3" 
                        style="background-color: #e8f0fe;" 
                        onclick="abrirModalEditar(${prod.id})">Editar</button>
            </td>
        </tr>`;
        tbody.innerHTML += fila;
    });
}

// ==========================================
// CREAR PRODUCTO (POST)
// ==========================================

async function guardarNuevoProducto() {
    let sku = document.getElementById('nuevo-sku').value;
    const nombre = document.getElementById('nuevo-nombre').value;
    const idCat = document.getElementById('nuevo-categoria').value;
    const venta = document.getElementById('nuevo-venta').value;

    if (!nombre || !idCat || !venta) {
        alert("El Nombre, Categoría y Precio de Venta son obligatorios.");
        return;
    }

    if (!sku) {
        sku = 'SKU-' + Math.floor(Math.random() * 1000000);
    }

    const datos = {
        sku: sku,
        nombre: nombre,
        descripcion_presentacion: document.getElementById('nuevo-desc').value || null,
        id_categoria: parseInt(idCat),
        precio_costo: parseFloat(document.getElementById('nuevo-costo').value) || 0.00,
        precio_venta: parseFloat(venta),
        stock_minimo: parseInt(document.getElementById('nuevo-stock-min').value) || 10,
        es_combo: document.getElementById('nuevo-combo').checked,
        estado: 'ACTIVO'
    };

    try {
        const res = await fetch('http://127.0.0.1:5000/api/inventario/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalNuevoProducto')).hide();
            document.querySelector('#modalNuevoProducto form').reset();
            cargarProductos(); // Recarga y aplica filtros automáticamente
        } else {
            alert("Error al guardar en el servidor");
        }
    } catch (error) { console.error(error); }
}

// ==========================================
// EDITAR PRODUCTO (PUT)
// ==========================================

function abrirModalEditar(idProducto) {
    const prod = listaProductos.find(p => p.id === idProducto);
    if (!prod) return;
    
    document.getElementById('edit-id').value = prod.id;
    document.getElementById('edit-sku').value = prod.sku || '';
    document.getElementById('edit-nombre').value = prod.nombre || '';
    document.getElementById('edit-desc').value = prod.descripcion_presentacion || '';
    document.getElementById('edit-categoria').value = prod.id_categoria || '';
    document.getElementById('edit-costo').value = prod.precio_costo || 0;
    document.getElementById('edit-venta').value = prod.precio_venta || 0;
    document.getElementById('edit-stock-min').value = prod.stock_minimo || 0;
    
    document.getElementById('edit-estado').checked = (prod.estado === 'ACTIVO');

    const modal = new bootstrap.Modal(document.getElementById('modalEditarProducto'));
    modal.show();
}

async function guardarEdicionProducto() {
    const idProducto = document.getElementById('edit-id').value;
    const estadoActivo = document.getElementById('edit-estado').checked;

    const datos = {
        nombre: document.getElementById('edit-nombre').value,
        descripcion_presentacion: document.getElementById('edit-desc').value || null,
        id_categoria: parseInt(document.getElementById('edit-categoria').value),
        precio_costo: parseFloat(document.getElementById('edit-costo').value) || 0.00,
        precio_venta: parseFloat(document.getElementById('edit-venta').value),
        stock_minimo: parseInt(document.getElementById('edit-stock-min').value) || 0,
        estado: estadoActivo ? 'ACTIVO' : 'INACTIVO'
    };

    try {
        const res = await fetch(`http://127.0.0.1:5000/api/inventario/productos/${idProducto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalEditarProducto')).hide();
            cargarProductos(); // Recarga y aplica filtros automáticamente
        } else {
            alert("Error al actualizar");
        }
    } catch (error) { console.error(error); }
}