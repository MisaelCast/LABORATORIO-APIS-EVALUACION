const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

const { readData, writeData } = require("./utils/fileManager");

//  Endpoints de Pacientes

// POST /pacientes - - Registrar nuevo paciente
app.post("/pacientes", (req, res) => {
  const pacientes = readData("pacientes.json");
  const { nombre, edad, telefono, email } = req.body;

  // Validaciones
  if (!nombre || !edad || !telefono || !email) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }
  if (edad <= 0) {
    return res.status(400).json({ error: "La edad debe ser mayor a 0" });
  }
  if (pacientes.some((p) => p.email === email)) {
    return res.status(400).json({ error: "El email ya está registrado" });
  }

  const nuevoPaciente = {
    id: `P${String(pacientes.length + 1).padStart(3, "0")}`,
    nombre,
    edad,
    telefono,
    email,
    fechaRegistro: new Date().toLocaleDateString("en-CA"),
  };

  pacientes.push(nuevoPaciente);
  writeData("pacientes.json", pacientes);
  res.status(201).json(nuevoPaciente);
});

// GET /pacientes - Listar todos los pacientes
app.get("/pacientes", (req, res) => {
  const pacientes = readData("pacientes.json");
  res.json(pacientes);
});

// GET /pacientes/:id
app.get("/pacientes/:id", (req, res) => {
  const pacientes = readData("pacientes.json");
  const paciente = pacientes.find((p) => p.id === req.params.id);
  if (!paciente)
    return res.status(404).json({ error: "Paciente no encontrado" });
  res.json(paciente);
});

// PUT /pacientes/:id
app.put("/pacientes/:id", (req, res) => {
  const pacientes = readData("pacientes.json");
  const index = pacientes.findIndex((p) => p.id === req.params.id);
  if (index === -1)
    return res.status(404).json({ error: "Paciente no encontrado" });

  pacientes[index] = { ...pacientes[index], ...req.body };
  writeData("pacientes.json", pacientes);
  res.json(pacientes[index]);
});

// GET /pacientes/:id/historial
app.get("/pacientes/:id/historial", (req, res) => {
  const citas = readData("citas.json");
  const historial = citas.filter((c) => c.pacienteId === req.params.id);
  res.json(historial);
});

//  Endpoints de Doctores

// POST /doctores - Registrar nuevo doctor
app.post("/doctores", (req, res) => {
  const doctores = readData("doctores.json");
  const { nombre, especialidad, horarioInicio, horarioFin, diasDisponibles } =
    req.body;

  //  Validaciones
  if (
    !nombre ||
    !especialidad ||
    !horarioInicio ||
    !horarioFin ||
    !diasDisponibles
  ) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  if (horarioInicio >= horarioFin) {
    return res
      .status(400)
      .json({ error: "El horario de inicio debe ser menor que el de fin" });
  }

  // 1. Validar que sea un Array y no esté vacío
  if (!Array.isArray(diasDisponibles) || diasDisponibles.length < 1) {
    return res
      .status(400)
      .json({
        error:
          "Debe especificar al menos un día disponible como un arreglo de cadenas.",
      });
  }

  // 2. validacion
  for (const dia of diasDisponibles) {
    if (typeof dia !== "string" || dia.trim().length < 5) {
      return res.status(400).json({
        error: `Introduce por lo menos un dia`,
      });
    }
  }

  if (
    doctores.some((d) => d.nombre === nombre && d.especialidad === especialidad)
  ) {
    return res
      .status(400)
      .json({ error: "Ya existe un doctor con ese nombre y especialidad" });
  }

  const nuevoDoctor = {
    id: `D${String(doctores.length + 1).padStart(3, "0")}`,
    nombre,
    especialidad,
    horarioInicio,
    horarioFin,
    diasDisponibles,
  };

  doctores.push(nuevoDoctor);
  writeData("doctores.json", doctores);

  res.status(201).json(nuevoDoctor);
});

// GET /doctores - Listar todos los doctores
app.get("/doctores", (req, res) => {
  const doctores = readData("doctores.json");
  res.json(doctores);
});



// GET /doctores/disponibles?fecha=YYYY-MM-DD&hora=HH:MM
app.get('/doctores/disponibles', (req, res) => {
  const { fecha, hora } = req.query;
  if (!fecha || !hora) {
    return res.status(400).json({ error: 'Debe proporcionar fecha y hora en los parámetros' });
  }

  const doctores = readData('doctores.json');
  const citas = readData('citas.json');

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dia = diasSemana[new Date(fecha).getDay()];

  const disponibles = doctores.filter(d => {
    const trabajaEseDia = d.diasDisponibles.includes(dia);
    const dentroDelHorario = hora >= d.horarioInicio && hora <= d.horarioFin;
    const tieneCita = citas.some(c =>
      c.doctorId === d.id &&
      c.fecha === fecha &&
      c.hora === hora &&
      c.estado === "programada"
    );
    return trabajaEseDia && dentroDelHorario && !tieneCita;
  });

  if (disponibles.length === 0) {
    return res.json({ mensaje: 'No hay doctores disponibles para esa fecha y hora' });
  }

  res.json(disponibles);
});


// GET /doctores/:id - Obtener doctor por ID
app.get("/doctores/:id", (req, res) => {
  const doctores = readData("doctores.json");
  const doctor = doctores.find((d) => d.id === req.params.id);
  if (!doctor) return res.status(404).json({ error: "Doctor no encontrado" });
  res.json(doctor);
});

// GET /doctores/especialidad/:especialidad - Buscar doctores por especialidad
app.get("/doctores/especialidad/:especialidad", (req, res) => {
  const doctores = readData("doctores.json");
  const especialidad = req.params.especialidad.toLowerCase();
  const resultado = doctores.filter(
    (d) => d.especialidad.toLowerCase() === especialidad
  );
  if (resultado.length === 0) {
    return res
      .status(404)
      .json({ mensaje: "No se encontraron doctores con esa especialidad" });
  }
  res.json(resultado);
});

// POST /citas - Agendar nueva cita
app.post('/citas', (req, res) => {
  const citas = readData('citas.json');
  const pacientes = readData('pacientes.json');
  const doctores = readData('doctores.json');

  const { pacienteId, doctorId, fecha, hora, motivo } = req.body;

  // Validaciones basicas
  if (!pacienteId || !doctorId || !fecha || !hora || !motivo) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Validar paciente
  const paciente = pacientes.find(p => p.id === pacienteId);
  if (!paciente) return res.status(400).json({ error: 'Paciente no encontrado' });

  // Validar doctor
  const doctor = doctores.find(d => d.id === doctorId);
  if (!doctor) return res.status(400).json({ error: 'Doctor no encontrado' });

  // Validar fecha futura
  const hoy = new Date();
  const fechaCita = new Date(fecha + 'T' + hora);
  if (fechaCita <= hoy) {
    return res.status(400).json({ error: 'La cita debe ser en una fecha y hora futura' });
  }

  // Validar dia de la semana disponible
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dia = diasSemana[fechaCita.getDay()];
  if (!doctor.diasDisponibles.includes(dia)) {
    return res.status(400).json({ error: `El doctor no trabaja los ${dia}` });
  }

  // Validar hora dentro del horario
  if (hora < doctor.horarioInicio || hora > doctor.horarioFin) {
    return res.status(400).json({ error: 'La hora está fuera del horario del doctor' });
  }

  // Validar disponibilidad del doctor
  const citaOcupada = citas.find(c => c.doctorId === doctorId && c.fecha === fecha && c.hora === hora && c.estado === "programada");
  if (citaOcupada) {
    return res.status(400).json({ error: 'El doctor ya tiene una cita a esa hora' });
  }

  // Crear nueva cita
  const nuevaCita = {
    id: `C${String(citas.length + 1).padStart(3, '0')}`,
    pacienteId,
    doctorId,
    fecha,
    hora,
    motivo,
    estado: "programada"
  };

  citas.push(nuevaCita);
  writeData('citas.json', citas);

  res.status(201).json(nuevaCita);
});

// GET /citas - Listar todas las citas (con filtros opcionales por fecha y estado)
app.get('/citas', (req, res) => {
  const citas = readData('citas.json');
  let resultado = citas;

  const { fecha, estado } = req.query;
  if (fecha) resultado = resultado.filter(c => c.fecha === fecha);
  if (estado) resultado = resultado.filter(c => c.estado === estado);

  res.json(resultado);
});

// Endpoint para saber las citas en las siguientes 24 horas
app.get('/citas/proximas', (req, res) => {
    const citas = readData('citas.json');
    const ahora = new Date();
    const dentroDe24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const proximasCitas = citas.filter(c => {

        const fechaCita = new Date(c.fecha + 'T' + c.hora);
        
        if (isNaN(fechaCita.getTime())) {
            console.error(`Error al parsear la fecha/hora: ${c.fecha} ${c.hora}`);
            return false; 
        }

        return fechaCita > ahora && fechaCita <= dentroDe24Horas && c.estado === "programada";
    });
    res.json(proximasCitas);
});

// GET /citas/:id - Obtener cita por ID
app.get('/citas/:id', (req, res) => {
  const citas = readData('citas.json');
  const cita = citas.find(c => c.id === req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json(cita);
});

// PUT /citas/:id/cancelar - Cancelar una cita
app.put('/citas/:id/cancelar', (req, res) => {
  const citas = readData('citas.json');
  const index = citas.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Cita no encontrada' });

  if (citas[index].estado !== "programada") {
    return res.status(400).json({ error: 'Solo se pueden cancelar citas programadas' });
  }

  citas[index].estado = "cancelada";
  writeData('citas.json', citas);
  res.json({ mensaje: 'Cita cancelada correctamente', cita: citas[index] });
});

// GET /citas/doctor/:doctorId - Ver agenda de un doctor
app.get('/citas/doctor/:doctorId', (req, res) => {
  const citas = readData('citas.json');
  const agenda = citas.filter(c => c.doctorId === req.params.doctorId);
  res.json(agenda);
});

// ENDPOINTS DE ESTADISTICAS

// GET /estadisticas/doctores - Doctor con más citas
app.get('/estadisticas/doctores', (req, res) => {
  const citas = readData('citas.json');
  const doctores = readData('doctores.json');

  if (citas.length === 0) return res.json({ mensaje: "No hay citas registradas" });

  const conteo = {};
  citas.forEach(c => {
    if (c.estado === "programada" || c.estado === "realizada") {
      conteo[c.doctorId] = (conteo[c.doctorId] || 0) + 1;
    }
  });

  const doctorId = Object.keys(conteo).reduce((a, b) => conteo[a] > conteo[b] ? a : b);
  const doctor = doctores.find(d => d.id === doctorId);

  res.json({
    doctor: doctor ? doctor.nombre : "Desconocido",
    totalCitas: conteo[doctorId] || 0
  });
});

// GET /estadisticas/especialidades - Especialidad más solicitada
app.get('/estadisticas/especialidades', (req, res) => {
  const citas = readData('citas.json');
  const doctores = readData('doctores.json');

  if (citas.length === 0) return res.json({ mensaje: "No hay citas registradas" });

  const conteo = {};

  citas.forEach(c => {
    const doctor = doctores.find(d => d.id === c.doctorId);
    if (doctor && (c.estado === "programada" || c.estado === "realizada")) {
      conteo[doctor.especialidad] = (conteo[doctor.especialidad] || 0) + 1;
    }
  });

  const especialidad = Object.keys(conteo).reduce((a, b) => conteo[a] > conteo[b] ? a : b);
  res.json({
    especialidadMasSolicitada: especialidad,
    totalCitas: conteo[especialidad]
  });
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send(" API Sistema de Gestión de Citas Médicas funcionando...");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
