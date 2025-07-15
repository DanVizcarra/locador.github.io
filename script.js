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


function agregarFilaATabla(registro) {
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${registro.apellidos}</td>
    <td>${registro.nombres}</td>
    <td>${registro.dni}</td>
    <td>${registro.fechaIngreso}</td>
    <td>${registro.remuneracion}</td>
    <td>${registro.puesto}</td>
    <td>${registro.quincena || `<div style="display: flex; justify-content: center;"><button onclick='prepararPago("quincena", this)'>Calcular</button></div>`}</td>
    <td>${registro.mensual || `<div style="display: flex; justify-content: center;"><button onclick='prepararPago("mensual", this)'>Calcular</button></div>`}</td>
    <td>${registro.cese || `<div style="display: flex; justify-content: center;"><button onclick="abrirFormularioCese(this)">Cesar</button></div>`}</td>
    <td>${registro.empresa || ""}</td>
    <td><div style="display: flex; justify-content: center; gap: 6px;"><button onclick="editarRegistro('${registro.dni}')">Editar</button></div></td>
  `;

  const cuerpo = document.querySelector("#tablaRegistros tbody");
  const mensaje = document.getElementById("mensajeVacio");
  if (mensaje) mensaje.remove();
  cuerpo.appendChild(fila);
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
  const fechaIngreso = new Date(personaSeleccionada.fechaIngreso);
  const remuneracion = personaSeleccionada.remuneracion;
  const adelanto = parseFloat(document.getElementById("adelanto").value || 0);
  const bono = parseFloat(document.getElementById("bono").value || 0);
  const diasInasistencia = parseFloat(document.getElementById("diasInasistencia").value || 0);
  const otrosDescuentos = parseFloat(document.getElementById("otrosDescuentos").value || 0);
  const horas = parseInt(document.getElementById("horas").value) || 0;
  const minutos = parseInt(document.getElementById("minutos").value) || 0;

  const horasInasistencia = horas + minutos / 60;
  const hoy = new Date();
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const diasTrabajados = (fechaIngreso > primerDiaMes)
    ? Math.floor((ultimoDiaMes - fechaIngreso) / MS_POR_DIA) + 1
    : 30;

  const descuentoDias = (remuneracion / 30) * diasInasistencia;
  const descuentoHoras = (remuneracion / 30 / 8) * horasInasistencia;
  const sueldoFinal = remuneracion - adelanto + bono - descuentoDias - descuentoHoras - otrosDescuentos;

  personaSeleccionada.mensualData = { adelanto, bono, diasInasistencia, otrosDescuentos, horas, minutos };

  filaSeleccionada.cells[7].innerHTML = `
    S/ ${sueldoFinal.toFixed(2)}<br>
    <button onclick="editarMensual()">Editar</button>
  `;
  actualizarPagoEnStorage("mensual", sueldoFinal.toFixed(2));

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
    if (tipo === "quincena") persona.quincena = `S/ ${monto}`;
    else persona.mensual = `S/ ${monto}`;
    localStorage.setItem("registros", JSON.stringify(registros));
  }
}

let filaCese = null;

function abrirFormularioCese(boton) {
  filaCese = boton.closest("tr");
  document.getElementById("formularioCese").style.display = "block";
  document.getElementById("tablaRegistros").classList.add("hidden");
}

function cancelarCese() {
  filaCese = null;
  document.getElementById("formularioCese").style.display = "none";
  document.getElementById("tablaRegistros").classList.remove("hidden");
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

function renderizarTabla() {
  const cuerpo = document.querySelector("#tablaRegistros tbody");
  cuerpo.innerHTML = "";
  const registros = JSON.parse(localStorage.getItem("registros")) || [];

  if (registros.length === 0) {
    cuerpo.innerHTML = `<tr id="mensajeVacio"><td colspan="10" style="text-align:center; font-style: italic;">Aún no has llenado la tabla. Presiona "Nuevo" para agregar los datos.</td></tr>`;
  } else {
    registros.forEach(agregarFilaATabla);
  }
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

function eliminarTodo() {
  if (confirm("¿Estás seguro de que deseas eliminar todos los datos?")) {
    localStorage.removeItem("registros");
    renderizarTabla();
  }
}

window.onload = renderizarTabla;