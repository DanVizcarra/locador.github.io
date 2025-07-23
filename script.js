const MS_POR_DIA = 1000 * 60 * 60 * 24;
let personaSeleccionada = null;
let filaSeleccionada = null;
let dniEditando = null;

function mostrarFormulario() {
  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("pagina1").classList.remove("hidden");
}

function cancelarFormulario() {
  document.getElementById("pagina1").classList.add("hidden");
  document.getElementById("tablaRegistros").classList.remove("hidden");
  limpiarFormulario();
}

function limpiarFormulario() {
  ["apellidos", "nombres", "dni", "fechaIngreso", "remuneracion", "puesto"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

function guardarRegistro() {
  const campos = ["apellidos", "nombres", "dni", "fechaIngreso", "remuneracion", "puesto"];
  for (let id of campos) {
    if (!document.getElementById(id).value) {
      alert("Por favor completa todos los campos.");
      return;
    }
  }

  const nuevoRegistro = {
    apellidos: document.getElementById("apellidos").value.trim(),
    nombres: document.getElementById("nombres").value.trim(),
    dni: document.getElementById("dni").value.trim(),
    fechaIngreso: document.getElementById("fechaIngreso").value,
    remuneracion: parseFloat(document.getElementById("remuneracion").value).toFixed(2),
    puesto: document.getElementById("puesto").value.trim(),
    quincena: "",
    mensual: "",
    cese: "",
    empresa: document.getElementById("empresa").value.trim()
  };

  const registros = JSON.parse(localStorage.getItem("registros")) || [];

  const duplicado = registros.some(r =>
    r.dni === nuevoRegistro.dni &&
    r.apellidos.toLowerCase() === nuevoRegistro.apellidos.toLowerCase() &&
    r.nombres.toLowerCase() === nuevoRegistro.nombres.toLowerCase() &&
    r.empresa.toLowerCase() === nuevoRegistro.empresa.toLowerCase()
  );

  if (duplicado) {
    alert("Ya existe un registro con los mismos datos. No se puede agregar duplicado.");
    return;
  }

  registros.push(nuevoRegistro);
  localStorage.setItem("registros", JSON.stringify(registros));

  agregarFilaATabla(nuevoRegistro);
  cancelarFormulario();
}

function convertirFecha(fechaStr) {
  if (fechaStr.includes("-")) return fechaStr;
  const partes = fechaStr.split("/");
  if (partes.length === 3) {
    const [dia, mes, año] = partes;
    return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return "";
}

function generarPeriodos(fechaInicio, fechaFin = null) {
  const periodos = [];
  const inicio = new Date(fechaInicio);
  const hoy = new Date();
  const fin = fechaFin ? new Date(fechaFin) : hoy;

  let actual = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

  while (actual <= fin) {
    const mes = actual.toLocaleString("default", { month: "long" });
    const año = actual.getFullYear();
    periodos.push({
      periodo: `${mes} ${año}`,
      pagos: 0,
      fechaPago: "",
    });
    actual.setMonth(actual.getMonth() + 1);
  }

  return periodos;
}

function agregarFilaATabla(registro) {
  const fila = document.createElement("tr");
  const filaDetalle = document.createElement("tr");
  filaDetalle.style.display = "none";

  if (registro.quincenaData) {
    registro.quincenaData.inasistencia ??= 0;
    registro.quincenaData.adelanto ??= 0;
  }
  if (registro.mensualData) {
    registro.mensualData.adelanto ??= 0;
    registro.mensualData.bono ??= 0;
    registro.mensualData.diasInasistencia ??= 0;
    registro.mensualData.otrosDescuentos ??= 0;
    registro.mensualData.horas ??= 0;
    registro.mensualData.minutos ??= 0;
  }

  let sueldoFinal;
  const remuneracion = parseFloat(registro.remuneracion) || 0;

  if (registro.mensualData) {
    const adelanto = parseFloat(registro.mensualData.adelanto) || 0;
    const bono = parseFloat(registro.mensualData.bono) || 0;
    const descuentoDias = (parseFloat(registro.mensualData.diasInasistencia) || 0) * (remuneracion / 30);
    const descuentoHoras = ((parseFloat(registro.mensualData.horas) || 0) + (parseFloat(registro.mensualData.minutos) || 0) / 60) * (remuneracion / 240);
    const otrosDescuentos = parseFloat(registro.mensualData.otrosDescuentos) || 0;

    sueldoFinal = remuneracion - adelanto + bono - descuentoDias - descuentoHoras - otrosDescuentos;
  } else {
    sueldoFinal = remuneracion;
  }

  fila.innerHTML = `
    <td>
      <button class="btn-desplegar" onclick="toggleDetalles(this)">▼</button>
      <span>${registro.apellidos}</span>
    </td>
    <td>${registro.nombres}</td>
    <td>${registro.dni}</td>
    <td>${registro.fechaIngreso}</td>
    <td>${registro.remuneracion}</td>
    <td>${registro.puesto}</td>
    <td>${registro.quincena ? `S/ ${registro.quincena.replace("S/ ", "")}<br><button onclick="editarQuincenaDesdeTabla('${registro.dni}')">Editar</button>` : `<div style="display: flex; justify-content: center;"><button onclick='prepararPago("quincena", this)'>Calcular</button></div>`}</td>
    <td>${registro.mensual ? `S/ ${registro.mensual.replace("S/ ", "")}<br><button onclick="editarMensualDesdeTabla('${registro.dni}')">Editar</button>` : `<div style="display: flex; justify-content: center;"><button onclick='prepararPago("mensual", this)'>Calcular</button></div>`}</td>
    <td>${registro.cese ? `${registro.cese}<br><button onclick="editarCese('${registro.dni}')">Editar</button>` : `<div style="display: flex; justify-content: center;"><button onclick="abrirFormularioCese(this)">Cesar</button></div>`}</td>
    <td>${registro.empresa || ""}</td>
    <td><div style="display: flex; justify-content: center; gap: 6px;"><button onclick="editarRegistro('${registro.dni}')">Editar</button></div></td>
  `;

  const fechaIngreso = convertirFecha(registro.fechaIngreso);
  const fechaCese = registro.cese ? convertirFecha(registro.cese) : null;
  const periodos = generarPeriodos(fechaIngreso, fechaCese);

  const pagosGuardados = JSON.parse(localStorage.getItem("pagos_" + registro.dni)) || {};
  const fechasGuardadas = JSON.parse(localStorage.getItem("fechas_" + registro.dni)) || {};
  const sueldosPorMes = JSON.parse(localStorage.getItem("sueldosMes_" + registro.dni)) || {};

  let filasHTML = "";

  periodos.forEach((p, i) => {
    const clavePeriodo = p.periodo;
    const sueldoMes = sueldosPorMes[clavePeriodo];
    const sueldoMostrado = sueldoMes !== undefined ? `S/ ${sueldoMes.toFixed(2)}<br><button onclick="abrirIngresoSueldo('${registro.dni}', '${clavePeriodo}')">Editar</button>` : `<button onclick="abrirIngresoSueldo('${registro.dni}', '${clavePeriodo}')">Ingresar</button>`;

    const pagosPeriodo = pagosGuardados[clavePeriodo] || [];
    const fechasPeriodo = fechasGuardadas[clavePeriodo] || [];

    const totalPagos = pagosPeriodo.reduce((a, b) => a + parseFloat(b), 0);
    const sueldoBase = sueldoMes !== undefined
      ? sueldoMes
      : (registro.mensualData?.sueldoFinal ?? 0);
    const saldo = Math.max(sueldoBase - totalPagos, 0);
    const estado = saldo === 0 ? "PAGADO" : "PENDIENTE";
    const color = saldo === 0 ? "green" : "red";

    const pagosHTML = pagosPeriodo.map(monto => `<div>S/ ${parseFloat(monto).toFixed(2)}</div>`).join("");
    const fechasHTML = fechasPeriodo.map(fecha => `<div>${fecha}</div>`).join("");

    filasHTML += `
      <tr data-index="${i}">
        <td>${clavePeriodo}</td>
        <td>${sueldoMostrado}</td>
        <td>
          <div>
            <input type="number" placeholder="Monto" />
            <button onclick="agregarPago(this, '${registro.dni}', '${clavePeriodo}', ${sueldoBase})">＋</button>
            <div class="pagos-adicionales">${pagosHTML}</div>
          </div>
        </td>
        <td class="saldo">S/ ${saldo.toFixed(2)}</td>
        <td>
          <div>
            <input type="date" />
            <button onclick="agregarFechaPago(this, '${registro.dni}', '${clavePeriodo}')">＋</button>
            <div class="fechas-adicionales">${fechasHTML}</div>
          </div>
        </td>
        <td class="estado" style="color: ${color}; font-weight: bold;">${estado}</td>
      </tr>
    `;
  });

  filaDetalle.innerHTML = `
    <td colspan="12">
      <table class="tabla-detalle">
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Sueldo Final</th>
            <th>Pago a Cuenta</th>
            <th>Saldo</th>
            <th>Fecha de pago</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>
    </td>
  `;

  const cuerpo = document.querySelector("#tablaRegistros tbody");
  const mensaje = document.getElementById("mensajeVacio");
  if (mensaje) mensaje.remove();

  cuerpo.appendChild(fila);
  cuerpo.appendChild(filaDetalle);
}


function renderizarTabla() {
  const cuerpo = document.querySelector("#tablaRegistros tbody");
  cuerpo.innerHTML = "";

  let registros = JSON.parse(localStorage.getItem("registros")) || [];

  if (registros.length === 0) {
    cuerpo.innerHTML = `<tr id="mensajeVacio"><td colspan="11" style="text-align:center; font-style: italic;">Aún no has llenado la tabla. Presiona "Nuevo" para agregar los datos.</td></tr>`;
  } else {
    registros.sort((a, b) =>
      a.apellidos.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
          .localeCompare(
            b.apellidos.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
            'es',
            { sensitivity: 'base' }
          )
    );

    registros.forEach(agregarFilaATabla);
  }
}

function prepararPago(tipo, boton) {
  const fila = boton.closest("tr");
  const celdas = fila.querySelectorAll("td");

  personaSeleccionada = {
    apellidos: celdas[0].innerText,
    nombres: celdas[1].innerText,
    dni: celdas[2].innerText,
    fechaIngreso: celdas[3].innerText,
    remuneracion: parseFloat(celdas[4].innerText),
    puesto: celdas[5].innerText
  };

  filaSeleccionada = fila;

  document.getElementById("pagina1").classList.add("hidden");
  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("pagoQuincena").classList.add("hidden");
  document.getElementById("pagoMensual").classList.add("hidden");

  if (tipo === "quincena") {
    document.getElementById("pagoQuincena").classList.remove("hidden");
  } else {
    document.getElementById("pagoMensual").classList.remove("hidden");
  }
}

function cancelarFormularioPago() {
  document.getElementById("pagoQuincena").classList.add("hidden");
  document.getElementById("pagoMensual").classList.add("hidden");
  document.getElementById("tablaRegistros").classList.remove("hidden");
}

function calcularQuincena() {
  const fechaPagoStr = document.getElementById("fechaQuincena").value;
  const diasInasistencia = parseFloat(document.getElementById("quincenaDiasInasistencia").value || 0);
  const adelanto = parseFloat(document.getElementById("adelantoQuincena").value || 0);
  if (!fechaPagoStr) return;

  const fechaIngreso = new Date(personaSeleccionada.fechaIngreso);
  const fechaPago = new Date(fechaPagoStr);
  const remuneracion = personaSeleccionada.remuneracion;

  const diaLimite = new Date(fechaPago.getFullYear(), fechaPago.getMonth(), 15);
  const primerDiaMes = new Date(fechaPago.getFullYear(), fechaPago.getMonth(), 1);

  const fechaInicio = fechaIngreso > primerDiaMes ? fechaIngreso : primerDiaMes;
  const fechaFin = diaLimite;

  let diasTrabajados = 0;

  if (fechaInicio <= fechaFin) {
    diasTrabajados = Math.floor((fechaFin - fechaInicio) / MS_POR_DIA) + 1;
  }
  const pagoPorDia = remuneracion / 30;
  const sueldoBase = pagoPorDia * diasTrabajados;

  const descuentoInasistencia = pagoPorDia * diasInasistencia;

  const sueldoFinal = sueldoBase - descuentoInasistencia - adelanto;

  personaSeleccionada.quincenaData = {
    fecha: fechaPagoStr,
    inasistencia: diasInasistencia,
    adelanto: adelanto
  };

  filaSeleccionada.cells[6].innerHTML = `
    S/ ${sueldoFinal.toFixed(2)}<br>
    <button onclick="editarQuincena()">Editar</button>
  `;

  actualizarPagoEnStorage("quincena", sueldoFinal.toFixed(2));
  cancelarFormularioPago();
}

function editarQuincena() {
  const data = personaSeleccionada.quincenaData;
  if (!data) return;
  document.getElementById("fechaQuincena").value = data.fecha;
  document.getElementById("quincenaDiasInasistencia").value = data.inasistencia;
  document.getElementById("adelantoQuincena").value = data.adelanto || 0;
  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("pagoQuincena").classList.remove("hidden");
}

function calcularMensual() {
  const adelanto = parseFloat(document.getElementById("adelanto").value) || 0;
  const bono = parseFloat(document.getElementById("bono").value) || 0;
  const diasInasistencia = parseFloat(document.getElementById("diasInasistencia").value) || 0;
  const horas = parseFloat(document.getElementById("horas").value) || 0;
  const minutos = parseFloat(document.getElementById("minutos").value) || 0;
  const otrosDescuentos = parseFloat(document.getElementById("otrosDescuentos").value) || 0;

  const registroActual = personaSeleccionada;
  if (!registroActual) {
    alert("No se encontró el trabajador para aplicar el cálculo mensual.");
    return;
  }

  const remuneracion = parseFloat(registroActual.remuneracion) || 0;

  // Validación de remuneración positiva
  if (remuneracion <= 0) {
    alert("La remuneración debe ser mayor a 0 para calcular el sueldo mensual.");
    return;
  }

  const descuentoDias = diasInasistencia * (remuneracion / 30);
  const descuentoHoras = (horas + minutos / 60) * (remuneracion / 240);

  let sueldoFinal = remuneracion - adelanto + bono - descuentoDias - descuentoHoras - otrosDescuentos;

  // No permitir sueldos negativos (opcional, puedes comentarlo si no lo quieres)
  if (sueldoFinal < 0) sueldoFinal = 0;

  // Guardamos los datos en personaSeleccionada
  registroActual.mensualData = {
    adelanto,
    bono,
    diasInasistencia,
    horas,
    minutos,
    otrosDescuentos,
    sueldoFinal
  };
  personaSeleccionada = registroActual;

  // Mostrar el resultado en la celda correspondiente
  if (filaSeleccionada && filaSeleccionada.cells[7]) {
    filaSeleccionada.cells[7].innerHTML = `
      S/ ${sueldoFinal.toFixed(2)}<br>
      <button onclick="editarMensual()">Editar</button>
    `;
  }

  // Guardar en localStorage
  actualizarPagoEnStorage("mensual", sueldoFinal.toFixed(2));

  // Ocultar formularios y volver a la tabla
  cancelarFormularioPago();
}


function editarMensual() {
  const data = personaSeleccionada.mensualData;
  if (!data) return;
  document.getElementById("adelanto").value = data.adelanto;
  document.getElementById("bono").value = data.bono;
  document.getElementById("diasInasistencia").value = data.diasInasistencia;
  document.getElementById("otrosDescuentos").value = data.otrosDescuentos;
  document.getElementById("horas").value = data.horas;
  document.getElementById("minutos").value = data.minutos;
  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("pagoMensual").classList.remove("hidden");
}

function actualizarPagoEnStorage(tipo, monto) {
  const dni = personaSeleccionada.dni;
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (persona) {
    if (tipo === "quincena") {
      persona.quincena = `S/ ${monto}`;
      persona.quincenaData = personaSeleccionada.quincenaData; // 🟢 guarda los datos completos
    } else {
      persona.mensual = `S/ ${monto}`;
      persona.mensualData = personaSeleccionada.mensualData; // 🟢 guarda los datos completos
    }
    localStorage.setItem("registros", JSON.stringify(registros));
  }
}

let filaCese = null;

function abrirFormularioCese(boton) {
  filaCese = boton.closest("tr");
  document.getElementById("formularioCese").style.display = "block";
  document.getElementById("tablaRegistros").classList.add("hidden");
}

function confirmarCese() {
  const fechaSeleccionada = document.getElementById("fechaCese").value;
  if (!fechaSeleccionada) {
    alert("Por favor selecciona una fecha de cese.");
    return;
  }

  const dni = filaCese.cells[2].innerText;
  filaCese.cells[8].innerHTML = `${fechaSeleccionada}<br><button onclick="editarCese('${dni}')">Editar</button>`;

  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (persona) {
    persona.cese = fechaSeleccionada;
    localStorage.setItem("registros", JSON.stringify(registros));
  }

  filaCese = null;
  document.getElementById("formularioCese").style.display = "none";
  document.getElementById("tablaRegistros").classList.remove("hidden");
}

function quitarCese() {
  if (!filaCese) return;

  const dni = filaCese.cells[2].innerText;

  filaCese.cells[8].innerHTML = `<div style="display: flex; justify-content: center;"><button onclick="abrirFormularioCese(this)">Cesar</button></div>`;

  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (persona) {
    delete persona.cese;
    localStorage.setItem("registros", JSON.stringify(registros));
  }

  filaCese = null;
  document.getElementById("formularioCese").style.display = "none";
  document.getElementById("tablaRegistros").classList.remove("hidden");
}

function cancelarCese() {
  filaCese = null;
  document.getElementById("formularioCese").style.display = "none";
  document.getElementById("tablaRegistros").classList.remove("hidden");
}

function editarRegistro(dni) {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (!persona) return;
  dniEditando = dni;
  document.getElementById("editApellidos").value = persona.apellidos;
  document.getElementById("editNombres").value = persona.nombres;
  document.getElementById("editDni").value = persona.dni;
  document.getElementById("editFechaIngreso").value = persona.fechaIngreso;
  document.getElementById("editRemuneracion").value = persona.remuneracion;
  document.getElementById("editPuesto").value = persona.puesto;
  document.getElementById("editEmpresa").value = persona.empresa || "";
  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("paginaEditar").classList.remove("hidden");
}

function editarCese(dni) {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (!persona) return;

  const filas = document.querySelectorAll("#tablaRegistros tbody tr");
  for (let fila of filas) {
    if (fila.cells[2].innerText === dni) {
      filaCese = fila;
      break;
    }
  }

  document.getElementById("fechaCese").value = persona.cese;
  document.getElementById("formularioCese").style.display = "block";
  document.getElementById("tablaRegistros").classList.add("hidden");
}

function actualizarRegistro() {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const index = registros.findIndex(p => p.dni === dniEditando);
  if (index === -1) return;

  registros[index].apellidos = document.getElementById("editApellidos").value;
  registros[index].nombres = document.getElementById("editNombres").value;
  registros[index].dni = document.getElementById("editDni").value;
  registros[index].fechaIngreso = document.getElementById("editFechaIngreso").value;
  registros[index].remuneracion = parseFloat(document.getElementById("editRemuneracion").value).toFixed(2);
  registros[index].puesto = document.getElementById("editPuesto").value;
  registros[index].empresa = document.getElementById("editEmpresa").value;

  localStorage.setItem("registros", JSON.stringify(registros));
  dniEditando = null;
  document.getElementById("paginaEditar").classList.add("hidden");
  document.getElementById("tablaRegistros").classList.remove("hidden");
  renderizarTabla();
}

function cancelarEdicion() {
  dniEditando = null;
  document.getElementById("paginaEditar").classList.add("hidden");
  document.getElementById("tablaRegistros").classList.remove("hidden");
}

function exportarXLS() {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  if (!registros.length) {
    alert("No hay datos para exportar.");
    return;
  }

  // Encabezados
  const encabezados = ["Empresa", "Apellidos", "Nombres", "DNI", "Fecha Ingreso", "Remuneración", "Puesto", "Quincena", "Mensual", "Cese"];
  
  // HTML para tabla
  let tablaHTML = '<table border="1" style="border-collapse:collapse;"><thead><tr style="font-weight:bold; background-color:#f0f0f0; text-align:center;">';
  encabezados.forEach(t => {
    tablaHTML += `<th>${t}</th>`;
  });
  tablaHTML += '</tr></thead><tbody>';

  // Cuerpo de tabla
  registros.forEach(r => {
    tablaHTML += '<tr>';
    tablaHTML += `<td>${r.empresa || ""}</td>`;
    tablaHTML += `<td>${r.apellidos}</td>`;
    tablaHTML += `<td>${r.nombres}</td>`;
    tablaHTML += `<td>${r.dni}</td>`;
    tablaHTML += `<td>${r.fechaIngreso}</td>`;
    tablaHTML += `<td>${r.remuneracion}</td>`;
    tablaHTML += `<td>${r.puesto}</td>`;
    tablaHTML += `<td>${r.quincena || ""}</td>`;
    tablaHTML += `<td>${r.mensual || ""}</td>`;
    tablaHTML += `<td>${r.cese || ""}</td>`;
    tablaHTML += '</tr>';
  });

  tablaHTML += '</tbody></table>';

  // Crear archivo Excel
  const blob = new Blob([`
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Registros</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head>
    <body>${tablaHTML}</body></html>
  `], {
    type: 'application/vnd.ms-excel'
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Registros_${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const existeAdmin = usuarios.some(u => u.email === "admin@locador.com");
  if (!existeAdmin) {
    usuarios.push({ email: "admin@locador.com", password: "1234" });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
  }

  const usuarioEncontrado = usuarios.find(u => u.email === email && u.password === password);

  if (usuarioEncontrado) {
    document.getElementById("pantallaLogin").style.display = "none";
    document.getElementById("pantallaApp").classList.remove("hidden");

    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("usuarioActual", JSON.stringify(usuarioEncontrado));
  } else {
    alert("Correo o contraseña incorrectos.");
  }
}

function editarQuincenaDesdeTabla(dni) {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (!persona || !persona.quincenaData) return;

  personaSeleccionada = persona;

  document.getElementById("fechaQuincena").value = persona.quincenaData.fecha;
  document.getElementById("quincenaDiasInasistencia").value = persona.quincenaData.inasistencia;
  document.getElementById("adelantoQuincena").value = persona.quincenaData.adelanto;

  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("pagoQuincena").classList.remove("hidden");
}

function editarMensualDesdeTabla(dni) {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const persona = registros.find(p => p.dni === dni);
  if (!persona || !persona.mensualData) return;

  personaSeleccionada = persona;

  document.getElementById("adelanto").value = persona.mensualData.adelanto;
  document.getElementById("bono").value = persona.mensualData.bono;
  document.getElementById("diasInasistencia").value = persona.mensualData.diasInasistencia;
  document.getElementById("otrosDescuentos").value = persona.mensualData.otrosDescuentos;
  document.getElementById("horas").value = persona.mensualData.horas;
  document.getElementById("minutos").value = persona.mensualData.minutos;

  document.getElementById("tablaRegistros").classList.add("hidden");
  document.getElementById("pagoMensual").classList.remove("hidden");
}

function actualizarTabla() {
  const tbody = document.querySelector("#tablaRegistros tbody");
  tbody.innerHTML = "";
  const trabajadores = JSON.parse(localStorage.getItem("trabajadores")) || [];
  trabajadores.forEach(agregarFilaATabla);
}

function toggleDetalles(boton) {
  const fila = boton.closest("tr");
  const filaSiguiente = fila.nextElementSibling;

  if (filaSiguiente && filaSiguiente.classList.contains("fila-detalle") || filaSiguiente.querySelector(".tabla-detalle")) {
    const visible = filaSiguiente.style.display !== "none";
    filaSiguiente.style.display = visible ? "none" : "table-row";
    boton.textContent = visible ? "▼" : "▲";
  }
}

function guardarSueldoManual(input, dni, periodo) {
  const sueldo = parseFloat(input.value) || 0;
  const sueldos = JSON.parse(localStorage.getItem("sueldos_" + dni)) || {};
  sueldos[periodo] = sueldo;
  localStorage.setItem("sueldos_" + dni, JSON.stringify(sueldos));
  location.reload(); // Recarga para actualizar saldo y estado
}

function actualizarPago(input) {
  const fila = input.closest("tr");
  const pagosDiv = fila.querySelector(".pagos-adicionales");
  const otros = pagosDiv.querySelectorAll("input");
  let suma = parseFloat(input.value) || 0;
  otros.forEach(inp => suma += parseFloat(inp.value) || 0);

  const saldoTd = fila.querySelector(".saldo");
  const estadoTd = fila.querySelector(".estado");
  const remuneracion = parseFloat(fila.querySelectorAll("td")[1].textContent.replace("S/ ", "")) || 0;

  const nuevoSaldo = remuneracion - suma;
  saldoTd.textContent = `S/ ${nuevoSaldo.toFixed(2)}`;

  if (nuevoSaldo <= 0) {
    estadoTd.textContent = "PAGADO";
    estadoTd.style.color = "green";
  } else {
    estadoTd.textContent = "PENDIENTE";
    estadoTd.style.color = "red";
  }

  guardarPagoEnRegistro(fila, suma);
}

let dniSueldoActual = null;
let periodoSueldoActual = null;

function abrirIngresoSueldo(dni, periodo) {
  dniSueldoActual = dni;
  periodoSueldoActual = periodo;

  const sueldos = JSON.parse(localStorage.getItem("sueldosMes_" + dni)) || {};
  const montoGuardado = sueldos[periodo];

  document.getElementById("tituloModalSueldo").innerText = montoGuardado ? "Editar Sueldo Final" : "Ingresar Sueldo Final";
  document.getElementById("infoPeriodo").innerText = `Periodo: ${periodo}`;
  document.getElementById("inputSueldoFinal").value = montoGuardado ?? "";

  document.getElementById("modalSueldo").classList.remove("hidden");
}

function cerrarModalSueldo() {
  dniSueldoActual = null;
  periodoSueldoActual = null;
  document.getElementById("modalSueldo").classList.add("hidden");
}

function confirmarSueldo() {
  const valor = parseFloat(document.getElementById("inputSueldoFinal").value);
  if (isNaN(valor) || valor <= 0) {
    alert("Por favor ingrese un monto válido.");
    return;
  }

  const sueldos = JSON.parse(localStorage.getItem("sueldosMes_" + dniSueldoActual)) || {};
  sueldos[periodoSueldoActual] = valor;
  localStorage.setItem("sueldosMes_" + dniSueldoActual, JSON.stringify(sueldos));

  cerrarModalSueldo();
  actualizarTabla(); // Vuelve a generar la tabla para reflejar cambios
  location.reload()
}

function agregarPago(boton, dni, periodo, sueldoBase) {
  const contenedor = boton.closest("td");
  const input = contenedor.querySelector("input[type='number']");
  const valor = parseFloat(input.value);
  if (isNaN(valor) || valor <= 0) return;

  // Agregar visualmente el nuevo pago
  const pagosDiv = contenedor.querySelector(".pagos-adicionales");
  const nuevoPago = document.createElement("div");
  nuevoPago.textContent = `S/ ${valor.toFixed(2)}`;
  pagosDiv.appendChild(nuevoPago);
  input.value = "";

  // Guardar en localStorage
  const key = "pagos_" + dni;
  const datos = JSON.parse(localStorage.getItem(key)) || {};
  if (!datos[periodo]) datos[periodo] = [];
  datos[periodo].push(valor);
  localStorage.setItem(key, JSON.stringify(datos));

  // Recalcular saldo y estado en el DOM
  const fila = boton.closest("tr");
  const tdSaldo = fila.querySelector(".saldo");
  const tdEstado = fila.querySelector(".estado");

  const totalPagos = datos[periodo].reduce((a, b) => a + parseFloat(b), 0);
  const nuevoSaldo = Math.max(sueldoBase - totalPagos, 0);
  const estado = nuevoSaldo === 0 ? "PAGADO" : "PENDIENTE";
  const color = nuevoSaldo === 0 ? "green" : "red";

  if (tdSaldo) tdSaldo.textContent = `S/ ${nuevoSaldo.toFixed(2)}`;
  if (tdEstado) {
    tdEstado.textContent = estado;
    tdEstado.style.color = color;
  }
}

function guardarPagoEnRegistro(fila, monto) {
  const periodo = fila.querySelectorAll("td")[0].textContent;
  const dni = fila.closest("tbody").closest("tr").previousSibling.querySelectorAll("td")[2].textContent;

  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const registro = registros.find(r => r.dni === dni);
  if (!registro.pagosPorPeriodo) registro.pagosPorPeriodo = {};
  registro.pagosPorPeriodo[periodo] = monto;

  localStorage.setItem("registros", JSON.stringify(registros));
}

function obtenerPagosGuardados(dni, periodo) {
  const clave = `pagos_${dni}_${periodo}`;
  const datos = localStorage.getItem(clave);
  return datos ? JSON.parse(datos) : [];
}

function guardarPago(dni, periodo, monto) {
  const clave = `pagos_${dni}_${periodo}`;
  const pagos = obtenerPagosGuardados(dni, periodo);
  pagos.push(monto);
  localStorage.setItem(clave, JSON.stringify(pagos));
}

function recargarSubtabla(dni) {
  const registros = JSON.parse(localStorage.getItem("registros") || "[]");
  const registro = registros.find(r => r.dni === dni);
  if (!registro) return;

  // Elimina fila y subtabla actual
  const cuerpo = document.querySelector("#tablaRegistros tbody");
  cuerpo.querySelectorAll("tr").forEach(f => {
    if (f.innerHTML.includes(dni)) f.remove();
  });

  agregarFilaATabla(registro);
}

function actualizarPago(input, dni, periodo) {
  // Solo visual, no guarda
  const fila = input.closest("tr");
  const remuneracion = parseFloat(fila.children[1].textContent.replace("S/ ", ""));
  const adicionales = obtenerPagosGuardados(dni, periodo);
  const inputValue = parseFloat(input.value) || 0;
  const total = adicionales.reduce((s, x) => s + x, 0) + inputValue;

  const saldo = remuneracion - total;
  const estado = saldo <= 0 ? "PAGADO" : "PENDIENTE";
  const color = saldo <= 0 ? "green" : "red";

  fila.querySelector(".saldo").textContent = `S/ ${saldo.toFixed(2)}`;
  const estadoElem = fila.querySelector(".estado");
  estadoElem.textContent = estado;
  estadoElem.style.color = color;
}

function agregarFechaPago(boton, dni, periodo) {
  const contenedor = boton.closest("td");
  const input = contenedor.querySelector("input[type='date']");
  const valor = input.value;
  if (!valor) return;

  const fechasDiv = contenedor.querySelector(".fechas-adicionales");
  const nuevaFecha = document.createElement("div");
  nuevaFecha.textContent = valor;
  fechasDiv.appendChild(nuevaFecha);
  input.value = "";

  const key = "fechas_" + dni;
  const datos = JSON.parse(localStorage.getItem(key)) || {};
  if (!datos[periodo]) datos[periodo] = [];
  datos[periodo].push(valor);
  localStorage.setItem(key, JSON.stringify(datos));
}

function eliminarTodo() {
  if (!confirm("¿Estás seguro de que deseas eliminar toda la información del sistema? Esta acción no se puede deshacer.")) return;
  localStorage.clear();
  location.reload();
}

window.onload = () => {
  renderizarTabla();

  const sesion = localStorage.getItem("sesionActiva");
  if (sesion === "true") {
    document.getElementById("pantallaLogin").style.display = "none";
    document.getElementById("pantallaApp").classList.remove("hidden");
  }
};