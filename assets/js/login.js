// Atrapamos el evento de enviar el formulario
document.getElementById('form-login').addEventListener('submit', async function(evento) {
    
    // 🛑 LA LÍNEA MÁGICA: Esto frena al navegador para que no recargue la página
    evento.preventDefault();

    // 1. Capturamos lo que el usuario escribió en las cajas de texto
    const usernameIngresado = document.getElementById('username').value;
    const passwordIngresado = document.getElementById('password').value;

    try {
        // 2. Hacemos la petición al Backend
        const respuesta = await fetch('http://127.0.0.1:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: usernameIngresado, 
                password: passwordIngresado 
            })
        });

        const data = await respuesta.json();

        // 3. Evaluamos la respuesta estructurada de tu Backend
        if (data.success) {
            // Guardamos la llave y el rol en la mochila
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('rol', data.data.usuario.rol);
            
            // Lo dejamos entrar al sistema
            window.location.href = '/pages/dashboard.html'; // Pon aquí la página a la que quieres que vaya
        } else {
            // Si la clave está mal, lanzamos una alerta
            alert("Error: " + data.message);
        }

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        alert("El servidor backend está apagado o no responde.");
    }
});