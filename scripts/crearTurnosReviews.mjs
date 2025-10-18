import dotenv from "dotenv";
import mongoose from "mongoose";
import { ReviewSlot } from "../models/ReviewSlot.mjs";

dotenv.config();

const REVIEW_NUMBERS = [1, 2, 3, 4];
const TURNOS_POR_REVIEW = 10;
const COHORT_POR_DEFECTO = Number(process.env.DEFAULT_REVIEW_COHORT) || 1;
const DURACION_MINUTOS = Number(process.env.DEFAULT_REVIEW_DURATION) || 30;

function formatearHora(fecha) {
  const horas = fecha.getUTCHours().toString().padStart(2, "0");
  const minutos = fecha.getUTCMinutes().toString().padStart(2, "0");
  return `${horas}:${minutos}`;
}

function construirFechaBase() {
  const ahora = new Date();
  const base = new Date(
    Date.UTC(
      ahora.getUTCFullYear(),
      ahora.getUTCMonth(),
      ahora.getUTCDate(),
      13,
      0,
      0,
      0
    )
  );
  return base;
}

function construirSlot(reviewNumber, indice) {
  const base = construirFechaBase();
  const diasExtra = (reviewNumber - 1) * 7 + Math.floor(indice / 5);
  base.setUTCDate(base.getUTCDate() + diasExtra);
  base.setUTCHours(13 + (indice % 5), 0, 0, 0);

  const inicio = new Date(base.getTime());
  const fin = new Date(inicio.getTime() + DURACION_MINUTOS * 60 * 1000);

  return {
    cohort: COHORT_POR_DEFECTO,
    reviewNumber,
    date: inicio,
    start: inicio,
    end: fin,
    startTime: formatearHora(inicio),
    endTime: formatearHora(fin),
    room: `Review ${reviewNumber} - Sala ${indice + 1}`,
    zoomLink: "",
    comentarios: "",
    estado: "Disponible",
    reviewStatus: "revisar",
    student: null,
  };
}

async function asegurarTurnos() {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    throw new Error("MONGO_URL no definido en las variables de entorno.");
  }

  await mongoose.connect(uri);

  try {
    for (const reviewNumber of REVIEW_NUMBERS) {
      const filtro = {
        reviewNumber,
        cohort: COHORT_POR_DEFECTO,
      };

      const existentes = await ReviewSlot.find(filtro).sort({ date: 1 });
      const faltantes = TURNOS_POR_REVIEW - existentes.length;

      if (faltantes <= 0) {
        console.log(
          `Review ${reviewNumber}: ya existen ${existentes.length} turnos.`
        );
        continue;
      }

      const nuevos = [];
      for (let indice = existentes.length; indice < TURNOS_POR_REVIEW; indice++) {
        nuevos.push(construirSlot(reviewNumber, indice));
      }

      await ReviewSlot.insertMany(nuevos, { ordered: false });
      console.log(
        `Review ${reviewNumber}: creados ${nuevos.length} turnos (total: ${
          existentes.length + nuevos.length
        }).`
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

asegurarTurnos()
  .then(() => {
    console.log("Turnos asegurados correctamente.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error asegurando turnos:", error);
    mongoose.disconnect().finally(() => process.exit(1));
  });

