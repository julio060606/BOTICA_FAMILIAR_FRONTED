// ==========================================
// 1. MOTOR DE INYECCIÓN DE COMPONENTES
// ==========================================
async function loadComponent(id, file) {
  const container = document.getElementById(id);
  
  // Validamos si el contenedor existe en la página actual antes de inyectar
  // (Así evitamos errores si estás en una página que no tiene modal de edición, por ejemplo)
  if (container) {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`No se pudo cargar ${file}`);
      const html = await res.text();
      container.innerHTML = html;
    } catch (error) {
      console.error(error);
    }
  }
}

// Cargar todos los componentes al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
  // COMPONENTES
  loadComponent("sidebar-container", "/components/sidebar.html");
  loadComponent("navbar-container", "/components/navbar.html");

  // INVENTARIO - MODALES
  loadComponent("modal-editar-producto-container", "/modals/inventario/catalogo-editar-producto.html");
  loadComponent("modal-nuevo-producto-container", "/modals/inventario/catalogo-nuevo-producto.html");
  loadComponent("modal-ingresar-producto-container", "/modals/inventario/ingresos-agregar-producto.html");

  // VENTAS - MODALES
  loadComponent("modal-movimiento-caja-container", "/modals/ventas/control-caja-movimiento.html");
  loadComponent("modal-cerrar-caja-container", "/modals/ventas/control-caja-cerrar.html");
  loadComponent("modal-abrir-caja-container", "/modals/ventas/control-caja-abrir.html");

  //MODALES
  loadComponent("modal-acceso-denegado", "/modals/error-403.html");
  
});