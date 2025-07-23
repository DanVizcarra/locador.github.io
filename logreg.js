//Ejecutando funciones
document.getElementById("btn__iniciar-sesion").addEventListener("click", iniciarSesion);
document.getElementById("btn__registrarse").addEventListener("click", register);
window.addEventListener("resize", anchoPage);

//Declarando variables
var formulario_login = document.querySelector(".formulario__login");
var formulario_register = document.querySelector(".formulario__register");
var contenedor_login_register = document.querySelector(".contenedor__login-register");
var caja_trasera_login = document.querySelector(".caja__trasera-login");
var caja_trasera_register = document.querySelector(".caja__trasera-register");

    //FUNCIONES

function anchoPage(){

    if (window.innerWidth > 850){
        caja_trasera_register.style.display = "block";
        caja_trasera_login.style.display = "block";
    }else{
        caja_trasera_register.style.display = "block";
        caja_trasera_register.style.opacity = "1";
        caja_trasera_login.style.display = "none";
        formulario_login.style.display = "block";
        contenedor_login_register.style.left = "0px";
        formulario_register.style.display = "none";   
    }
}

anchoPage();


    function iniciarSesion(){
        if (window.innerWidth > 850){
            formulario_login.style.display = "block";
            contenedor_login_register.style.left = "10px";
            formulario_register.style.display = "none";
            caja_trasera_register.style.opacity = "1";
            caja_trasera_login.style.opacity = "0";
        }else{
            formulario_login.style.display = "block";
            contenedor_login_register.style.left = "0px";
            formulario_register.style.display = "none";
            caja_trasera_register.style.display = "block";
            caja_trasera_login.style.display = "none";
        }
    }

    function register(){
        if (window.innerWidth > 850){
            formulario_register.style.display = "block";
            contenedor_login_register.style.left = "410px";
            formulario_login.style.display = "none";
            caja_trasera_register.style.opacity = "0";
            caja_trasera_login.style.opacity = "1";
        }else{
            formulario_register.style.display = "block";
            contenedor_login_register.style.left = "0px";
            formulario_login.style.display = "none";
            caja_trasera_register.style.display = "none";
            caja_trasera_login.style.display = "block";
            caja_trasera_login.style.opacity = "1";
        }
    }

    function registrarUsuario() {
      const nombre = document.getElementById("registerNombre").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const usuario = document.getElementById("registerUsuario").value.trim();
      const password = document.getElementById("registerPassword").value;

      if (!nombre || !email || !usuario || !password) {
        alert("Por favor, completa todos los campos.");
        return;
      }

      const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

      const yaExiste = usuarios.some(u => u.usuario === usuario || u.email === email);
      if (yaExiste) {
        alert("El usuario o correo ya está registrado.");
        return;
      }

      usuarios.push({ nombre, email, usuario, password });
      localStorage.setItem("usuarios", JSON.stringify(usuarios));

      alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
      iniciarSesion();
    }

    function cerrarSesion() {
      document.getElementById("pantallaApp").classList.add("hidden");
      document.getElementById("pantallaLogin").style.display = "flex";

      document.getElementById("loginEmail").value = "";
      document.getElementById("loginPassword").value = "";

      localStorage.removeItem("sesionActiva");
      localStorage.removeItem("usuarioActual");

      formulario_login.style.display = "block";
      formulario_register.style.display = "none";
      contenedor_login_register.style.left = "0px";

      if (window.innerWidth > 850) {
        caja_trasera_register.style.display = "block";
        caja_trasera_register.style.opacity = "1";
        caja_trasera_login.style.display = "block";
        caja_trasera_login.style.opacity = "0";
      } else {
        caja_trasera_register.style.display = "block";
        caja_trasera_register.style.opacity = "1";
        caja_trasera_login.style.display = "none";
      }
    }