// Leer la llave de la memoria
const token = localStorage.getItem('token');

// Si NO hay llave, lo pateamos a la pantalla de login inmediatamente
if (!token) {
    window.location.replace('/pages/login.html');
}

// LOGOUT GLOBAL: La llave maestra que se puede usar en cualquier parte del código

window.TOKEN_GLOBAL = token;

// ==========================================
// FUNCIÓN PARA CERRAR SESIÓN (Global)
// ==========================================
function cerrarSesion() {
    // 1. Vaciamos la mochila del navegador
    localStorage.clear();

    // 2. Lo pateamos al login sin dejar que regrese con la flecha "Atrás"
    window.location.replace('/pages/login.html'); 
}