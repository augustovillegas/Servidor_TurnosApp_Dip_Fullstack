/**
 * Datos base realistas y configuraciones compartidas para los scripts de seed.
 */

export const SPRINTS = [1, 2, 3, 4, 5];

export const MODULE_PROFESSORS = {
  htmlcss: { nombre: "Laura", apellido: "Silva" },
  javascript: { nombre: "Gabriel", apellido: "Martinez" },
  node: { nombre: "Paula", apellido: "Costa" },
  react: { nombre: "Sergio", apellido: "Ledesma" },
};

export const MODULE_STUDENTS = {
  htmlcss: [
    { nombre: "Mateo", apellido: "Alvarez" },
    { nombre: "Camila", apellido: "Herrera" },
    { nombre: "Santiago", apellido: "Diaz" },
    { nombre: "Valentina", apellido: "Lopez" },
    { nombre: "Lucas", apellido: "Romero" },
    { nombre: "Catalina", apellido: "Morales" },
    { nombre: "Joaquin", apellido: "Vargas" },
    { nombre: "Milagros", apellido: "Ponce" },
    { nombre: "Bruno", apellido: "Navarro" },
    { nombre: "Florencia", apellido: "Castro" },
    { nombre: "Agustin", apellido: "Serrano" },
    { nombre: "Martina", apellido: "Campos" },
    { nombre: "Renzo", apellido: "Cabrera" },
    { nombre: "Abril", apellido: "Figueroa" },
    { nombre: "Tomas", apellido: "Roldan" },
    { nombre: "Julieta", apellido: "Salas" },
    { nombre: "Franco", apellido: "Molina" },
    { nombre: "Bianca", apellido: "Duarte" },
    { nombre: "Nicolas", apellido: "Benitez" },
    { nombre: "Malena", apellido: "Palacios" },
  ],
  javascript: [
    { nombre: "Diego", apellido: "Suarez" },
    { nombre: "Marina", apellido: "Bustos" },
    { nombre: "Ezequiel", apellido: "Gil" },
    { nombre: "Carolina", apellido: "Peralta" },
    { nombre: "Ivan", apellido: "Correa" },
    { nombre: "Rocio", apellido: "Miranda" },
    { nombre: "Leandro", apellido: "Paredes" },
    { nombre: "Victoria", apellido: "Ramos" },
    { nombre: "Pablo", apellido: "Arce" },
    { nombre: "Lara", apellido: "Medina" },
    { nombre: "Gaston", apellido: "Villalba" },
    { nombre: "Ludmila", apellido: "Cabrera" },
    { nombre: "Matias", apellido: "Silva" },
    { nombre: "Noelia", apellido: "Acosta" },
    { nombre: "Ramiro", apellido: "Ortega" },
    { nombre: "Sofia", apellido: "Luna" },
    { nombre: "Federico", apellido: "Sosa" },
    { nombre: "Azul", apellido: "Nunez" },
    { nombre: "Marcos", apellido: "Quiroga" },
    { nombre: "Belen", apellido: "Ortiz" },
  ],
  node: [
    { nombre: "Carla", apellido: "Mansilla" },
    { nombre: "Ivan", apellido: "Robles" },
    { nombre: "Emilia", apellido: "Paredes" },
    { nombre: "Julian", apellido: "Santoro" },
    { nombre: "Pilar", apellido: "Dominguez" },
    { nombre: "Marcos", apellido: "Varela" },
    { nombre: "Tamara", apellido: "Blanco" },
    { nombre: "Ignacio", apellido: "Farias" },
    { nombre: "Daniela", apellido: "Lugo" },
    { nombre: "Martin", apellido: "Funes" },
    { nombre: "Selena", apellido: "Bravo" },
    { nombre: "Lucio", apellido: "Gimenez" },
    { nombre: "Candela", apellido: "Rojo" },
    { nombre: "Nahir", apellido: "Duarte" },
    { nombre: "Santino", apellido: "Mayo" },
    { nombre: "Belen", apellido: "Rios" },
    { nombre: "Valeria", apellido: "Molina" },
    { nombre: "Julieta", apellido: "Pardo" },
    { nombre: "Mauricio", apellido: "Godoy" },
    { nombre: "Ailin", apellido: "Ferreyra" },
  ],
  react: [
    { nombre: "Hernan", apellido: "Toledo" },
    { nombre: "Micaela", apellido: "Pinto" },
    { nombre: "Cristian", apellido: "Olivera" },
    { nombre: "Daiana", apellido: "Franco" },
    { nombre: "Sebastian", apellido: "Monzon" },
    { nombre: "Antonella", apellido: "Vega" },
    { nombre: "Gonzalo", apellido: "Cabrera" },
    { nombre: "Nadia", apellido: "Portillo" },
    { nombre: "Maximo", apellido: "Avalos" },
    { nombre: "Jimena", apellido: "Ruiz" },
    { nombre: "Rodrigo", apellido: "Rivas" },
    { nombre: "Agustina", apellido: "Ibarra" },
    { nombre: "Lisandro", apellido: "Pereyra" },
    { nombre: "Magali", apellido: "Corbalan" },
    { nombre: "Emmanuel", apellido: "Bustamante" },
    { nombre: "Melina", apellido: "Godoy" },
    { nombre: "Franco", apellido: "Gimenez" },
    { nombre: "Ariadna", apellido: "Cabrera" },
    { nombre: "Ulises", apellido: "Luna" },
    { nombre: "Priscila", apellido: "Herrera" },
  ],
};

export const SUBMISSION_STATUS_ROTATION = [
  {
    reviewStatus: "A revisar",
    comentario: "Listo para una nueva revision del profesor.",
  },
  {
    reviewStatus: "Pendiente",
    comentario: "Entrega pendiente de feedback definitivo.",
  },
  {
    reviewStatus: "Aprobado",
    comentario: "Trabajo aprobado con sugerencias menores.",
  },
  {
    reviewStatus: "Desaprobado",
    comentario: "Se requieren ajustes antes de volver a enviar.",
  },
];

export const TURNOS_CONFIG = {
  reviewsPerModule: 4, // 4 revisiones * 5 turnos = 20 turnos por modulo
  slotsPerReview: 5,
  startHour: 9,
  slotDurationMinutes: 35,
};
