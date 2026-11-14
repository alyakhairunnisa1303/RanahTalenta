import assert from "node:assert/strict";
import test from "node:test";
import { anonymize } from "./anonymize";

test("menyamarkan data pribadi yang umum di CV", () => {
  const input = [
    "Nama: Budi Santoso",
    "Email: budi.santoso@gmail.com",
    "Telepon: +62 812-3456-7890",
    "NIK: 3273010101990001",
    "TTL: Bandung, 12 Januari 1998",
    "Alamat: Jl. Merdeka No. 1",
    "Jenis Kelamin: Laki-laki",
    "Status Pernikahan: Belum Kawin",
    "Agama: Islam",
    "Pendidikan: Universitas Indonesia",
    "Budi Santoso berpengalaman membangun aplikasi web.",
  ].join("\n");

  const output = anonymize(input, "Budi Santoso");

  assert.match(output, /\[EMAIL\]/);
  assert.match(output, /\[TELEPON\]/);
  assert.match(output, /\[NIK\]/);
  assert.match(output, /\[TANGGAL_LAHIR\]/);
  assert.match(output, /\[ALAMAT\]/);
  assert.match(output, /\[GENDER\]/);
  assert.match(output, /\[STATUS_PERKAWINAN\]/);
  assert.match(output, /\[AGAMA\]/);
  assert.match(output, /\[ALMAMATER\]/);
  assert.match(output, /\[NAMA\]/);

  assert.doesNotMatch(output, /Budi Santoso/i);
  assert.doesNotMatch(output, /budi\.santoso@gmail\.com/i);
  assert.doesNotMatch(output, /812-3456-7890/);
  assert.doesNotMatch(output, /3273010101990001/);
  assert.doesNotMatch(output, /12 Januari 1998/);
  assert.doesNotMatch(output, /Jl\. Merdeka/);
  assert.doesNotMatch(output, /Laki-laki/i);
  assert.doesNotMatch(output, /Belum Kawin/i);
  assert.doesNotMatch(output, /Islam/i);
  assert.doesNotMatch(output, /Universitas Indonesia/i);
});

test("mengganti nama parsial", () => {
  const output = anonymize("Budi membangun aplikasi.", "Budi Santoso");
  assert.equal(output, "[NAMA] membangun aplikasi.");
});

test("menyamarkan tanggal format ISO dan angka", () => {
  const output = anonymize(
    "Lahir 1998-05-12, usia: 27 tahun, NIK 3273010101990001.",
    "Siti Aminah",
  );

  assert.doesNotMatch(output, /1998-05-12/);
  assert.doesNotMatch(output, /usia:\s*27/i);
  assert.doesNotMatch(output, /3273010101990001/);
});

test("teks tanpa data pribadi tidak berubah", () => {
  const input = "Menguasai React, TypeScript, Node.js, dan PostgreSQL.";
  assert.equal(anonymize(input, "Budi Santoso"), input);
});
