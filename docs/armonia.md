# Armonía y sonidos en Wheel Synth

Guía de referencia de todo lo que la app sabe de acordes, escalas y síntesis, y de cómo ampliarlo. Las tablas de acordes, escalas, acordes por grado y presets se generaron a partir del código, así que coinciden con lo que suena.

| Tema | Dónde vive en el código |
| --- | --- |
| Catálogo de acordes | `src/music/chords.ts` |
| Catálogo de escalas | `src/music/scales.ts` |
| Acordes por grado y números romanos | `src/music/diatonic.ts` |
| Ortografía y voice leading | `src/music/theory.ts` |
| Presets de sonido | `src/audio/presets.ts` |
| Ruedas por defecto | `src/config.ts` |

---

## 1. Intervalos

Un **intervalo** es la distancia entre dos notas, medida en semitonos (una tecla del piano a la siguiente, blancas y negras incluidas). Todo lo demás se construye con ellos.

| Semitonos | Intervalo | Desde C |
| --- | --- | --- |
| 0 | Unísono | C |
| 1 | 2ª menor | D♭ |
| 2 | 2ª mayor | D |
| 3 | 3ª menor | E♭ |
| 4 | 3ª mayor | E |
| 5 | 4ª justa | F |
| 6 | 4ª aumentada / 5ª disminuida (tritono) | F♯ / G♭ |
| 7 | 5ª justa | G |
| 8 | 5ª aumentada / 6ª menor | G♯ / A♭ |
| 9 | 6ª mayor | A |
| 10 | 7ª menor | B♭ |
| 11 | 7ª mayor | B |
| 12 | Octava | C |
| 13 · 14 · 15 | 9ª menor · 9ª · 9ª aumentada | D♭ · D · D♯ |
| 17 · 18 | 11ª · 11ª aumentada | F · F♯ |
| 21 | 13ª | A |

La **9ª, la 11ª y la 13ª** son la 2ª, la 4ª y la 6ª una octava más arriba. Se llaman así cuando se suman a un acorde que ya tiene séptima.

---

## 2. Acordes

### Cómo se construye uno

- **Tríada:** raíz + tercera + quinta, apiladas de tercera en tercera. El tipo de tercera decide el carácter:

  | Tríada | Terceras | Suena |
  | --- | --- | --- |
  | Mayor | 3ª mayor + 3ª menor | estable, luminosa |
  | Menor | 3ª menor + 3ª mayor | estable, triste |
  | Disminuida | 3ª menor + 3ª menor | tensa, inestable |
  | Aumentada | 3ª mayor + 3ª mayor | flotante, misteriosa |

- **Suspendidos (sus2, sus4):** reemplazan la tercera por una 2ª o una 4ª. No son ni mayores ni menores y piden resolver.
- **Sextas y séptimas:** añaden una cuarta nota.
  - `maj7` lleva la 7ª mayor: suave, jazzística.
  - `7` (dominante) lleva la 7ª menor sobre un acorde mayor: tensión que quiere ir a la tónica.
  - `m7` es el menor con 7ª menor.
  - `m7♭5` (ø) y `dim7` (°) son los acordes disminuidos con séptima.
- **Extensiones (9, 11, 13):** se sigue apilando terceras por encima de la octava. Las alteradas (♭9, ♯9, ♯11) son el color típico del jazz.
- **`add9` frente a `9`:** `add9` añade la novena sin séptima; `9` la tiene.

**¹ Notas omitidas en el voicing.** En los acordes de 5 o más notas, la app no hace sonar la quinta justa: casi no aporta color y amontona el sonido, igual que hacen pianistas y guitarristas. El nombre y la lista de notas siguen mostrando el acorde completo.

### Ortografía

Cada nota se escribe con la letra de su grado. La tercera de C es una E, así que Cm es C – E♭ – G y no C – D♯ – G. Por la misma razón, el B mayor lleva D♯ y la séptima del Cdim7 es B𝄫 (B doble bemol).

En las teclas negras, el nombre elige la grafía más fácil de leer: A♯ mayor se escribe B♭ (B♭ – D – F) porque A♯ – C𝄪 – E♯ sería ilegible. Si eliges una tonalidad, manda la tonalidad: el IV de E♭ mayor es A♭, nunca G♯.

### Catálogo

#### Tríadas

| Símbolo | Nombre | Fórmula | Semitonos | En C |
| --- | --- | --- | --- | --- |
| `maj` | Mayor | 1 – 3 – 5 | 0 4 7 | C: C E G |
| `m` | Menor | 1 – ♭3 – 5 | 0 3 7 | Cm: C E♭ G |
| `dim` | Disminuido | 1 – ♭3 – ♭5 | 0 3 6 | Cdim: C E♭ G♭ |
| `aug` | Aumentado | 1 – 3 – ♯5 | 0 4 8 | Caug: C E G♯ |
| `sus2` | Suspendido de 2ª | 1 – 2 – 5 | 0 2 7 | Csus2: C D G |
| `sus4` | Suspendido de 4ª | 1 – 4 – 5 | 0 5 7 | Csus4: C F G |
| `5` | Quinta (power chord) | 1 – 5 | 0 7 | C5: C G |

#### Sextas

| Símbolo | Nombre | Fórmula | Semitonos | En C |
| --- | --- | --- | --- | --- |
| `6` | Sexta | 1 – 3 – 5 – 6 | 0 4 7 9 | C6: C E G A |
| `m6` | Menor sexta | 1 – ♭3 – 5 – 6 | 0 3 7 9 | Cm6: C E♭ G A |
| `6/9` | Sexta y novena ¹ | 1 – 3 – 5 – 6 – 9 | 0 4 7 9 14 | C6/9: C E G A D |

#### Séptimas

| Símbolo | Nombre | Fórmula | Semitonos | En C |
| --- | --- | --- | --- | --- |
| `maj7` | Mayor séptima | 1 – 3 – 5 – 7 | 0 4 7 11 | Cmaj7: C E G B |
| `7` | Séptima de dominante | 1 – 3 – 5 – ♭7 | 0 4 7 10 | C7: C E G B♭ |
| `m7` | Menor séptima | 1 – ♭3 – 5 – ♭7 | 0 3 7 10 | Cm7: C E♭ G B♭ |
| `m7♭5` | Semidisminuido (ø) | 1 – ♭3 – ♭5 – ♭7 | 0 3 6 10 | Cm7♭5: C E♭ G♭ B♭ |
| `dim7` | Disminuido séptima (°7) | 1 – ♭3 – ♭5 – 𝄫7 | 0 3 6 9 | Cdim7: C E♭ G♭ B𝄫 |
| `m(maj7)` | Menor con séptima mayor | 1 – ♭3 – 5 – 7 | 0 3 7 11 | Cm(maj7): C E♭ G B |
| `maj7♯5` | Mayor séptima aumentado | 1 – 3 – ♯5 – 7 | 0 4 8 11 | Cmaj7♯5: C E G♯ B |
| `7♯5` | Séptima aumentada | 1 – 3 – ♯5 – ♭7 | 0 4 8 10 | C7♯5: C E G♯ B♭ |
| `7♭5` | Séptima con 5ª disminuida | 1 – 3 – ♭5 – ♭7 | 0 4 6 10 | C7♭5: C E G♭ B♭ |
| `7sus4` | Séptima suspendida | 1 – 4 – 5 – ♭7 | 0 5 7 10 | C7sus4: C F G B♭ |

#### Añadidos

| Símbolo | Nombre | Fórmula | Semitonos | En C |
| --- | --- | --- | --- | --- |
| `add9` | Añadida novena | 1 – 3 – 5 – 9 | 0 4 7 14 | Cadd9: C E G D |
| `madd9` | Menor añadida novena | 1 – ♭3 – 5 – 9 | 0 3 7 14 | Cmadd9: C E♭ G D |

#### Novenas y extendidos

| Símbolo | Nombre | Fórmula | Semitonos | En C |
| --- | --- | --- | --- | --- |
| `maj9` | Mayor novena ¹ | 1 – 3 – 5 – 7 – 9 | 0 4 7 11 14 | Cmaj9: C E G B D |
| `9` | Novena de dominante ¹ | 1 – 3 – 5 – ♭7 – 9 | 0 4 7 10 14 | C9: C E G B♭ D |
| `m9` | Menor novena ¹ | 1 – ♭3 – 5 – ♭7 – 9 | 0 3 7 10 14 | Cm9: C E♭ G B♭ D |
| `m(maj9)` | Menor novena con séptima mayor ¹ | 1 – ♭3 – 5 – 7 – 9 | 0 3 7 11 14 | Cm(maj9): C E♭ G B D |
| `m9♭5` | Semidisminuido con novena | 1 – ♭3 – ♭5 – ♭7 – 9 | 0 3 6 10 14 | Cm9♭5: C E♭ G♭ B♭ D |
| `7♭9` | Séptima con 9ª menor ¹ | 1 – 3 – 5 – ♭7 – ♭9 | 0 4 7 10 13 | C7♭9: C E G B♭ D♭ |
| `7♯9` | Séptima con 9ª aumentada (Hendrix) ¹ | 1 – 3 – 5 – ♭7 – ♯9 | 0 4 7 10 15 | C7♯9: C E G B♭ D♯ |
| `m7♭9` | Menor séptima con 9ª menor ¹ | 1 – ♭3 – 5 – ♭7 – ♭9 | 0 3 7 10 13 | Cm7♭9: C E♭ G B♭ D♭ |
| `9sus4` | Novena suspendida ¹ | 1 – 4 – 5 – ♭7 – 9 | 0 5 7 10 14 | C9sus4: C F G B♭ D |
| `maj7♯11` | Mayor séptima con 11ª aumentada (lidio) ¹ | 1 – 3 – 5 – 7 – ♯11 | 0 4 7 11 18 | Cmaj7♯11: C E G B F♯ |
| `m11` | Menor oncena ¹ | 1 – ♭3 – 5 – ♭7 – 9 – 11 | 0 3 7 10 14 17 | Cm11: C E♭ G B♭ D F |
| `13` | Trecena de dominante ¹ | 1 – 3 – 5 – ♭7 – 9 – 13 | 0 4 7 10 14 21 | C13: C E G B♭ D A |
| `maj13` | Mayor trecena ¹ | 1 – 3 – 5 – 7 – 9 – 13 | 0 4 7 11 14 21 | Cmaj13: C E G B D A |

---

## 3. Escalas

Una **escala** es la colección de notas de la que sale una melodía o una tonalidad. La escala mayor, que da el sonido «normal» de casi todo el pop, es tono – tono – semitono – tono – tono – tono – semitono.

Los **modos** usan las mismas siete notas de la escala mayor, pero tomando como centro otra nota. C mayor, D dórica y A menor natural comparten teclas (todas blancas) y aun así suenan distinto, porque cambia la nota que se siente «en casa». En las fórmulas, ♭3 significa «tercera un semitono más baja que en la escala mayor».

#### Modos de la escala mayor

| Escala | Fórmula | Por grados | Carácter |
| --- | --- | --- | --- |
| Mayor (jónica) | 1 2 3 4 5 6 7 | sí | Brillante y estable: la base del pop y del rock. |
| Dórica | 1 2 ♭3 4 5 6 ♭7 | sí | Menor con 6ª mayor: funk, soul, jazz modal. |
| Frigia | 1 ♭2 ♭3 4 5 ♭6 ♭7 | sí | Menor con 2ª menor: oscura, flamenca, metal. |
| Lidia | 1 2 3 ♯4 5 6 7 | sí | Mayor con 4ª aumentada: soñadora, de banda sonora. |
| Mixolidia | 1 2 3 4 5 6 ♭7 | sí | Mayor con 7ª menor: rock clásico, blues, folk. |
| Menor natural (eólica) | 1 2 ♭3 4 5 ♭6 ♭7 | sí | La menor de siempre: melancólica. |
| Locria | 1 ♭2 ♭3 4 ♭5 ♭6 ♭7 | sí | Tónica disminuida: inestable, poco usada. |

#### Menores y armónicas

| Escala | Fórmula | Por grados | Carácter |
| --- | --- | --- | --- |
| Menor armónica | 1 2 ♭3 4 5 ♭6 7 | sí | Menor con 7ª mayor: dominante fuerte, aire clásico y oriental. |
| Menor melódica | 1 2 ♭3 4 5 6 7 | sí | Menor con 6ª y 7ª mayores: muy usada en jazz. |
| Mayor armónica | 1 2 3 4 5 ♭6 7 | sí | Mayor con 6ª menor: dramática, el iv menor dentro de una tonalidad mayor. |
| Frigia dominante | 1 ♭2 3 4 5 ♭6 ♭7 | sí | 5º modo de la menor armónica: flamenco, música de Medio Oriente. |

#### Pentatónicas y blues

| Escala | Fórmula | Por grados | Carácter |
| --- | --- | --- | --- |
| Pentatónica mayor | 1 2 3 5 6 | — | Cinco notas sin semitonos: folk, country, melodías que nunca chocan. |
| Pentatónica menor | 1 ♭3 4 5 ♭7 | — | La escala de los solos de rock y blues. |
| Blues | 1 ♭3 4 ♭5 5 ♭7 | — | Pentatónica menor con la «blue note» (5ª disminuida). |

#### Simétricas

| Escala | Fórmula | Por grados | Carácter |
| --- | --- | --- | --- |
| Tonos enteros | 1 2 3 ♭5 ♭6 ♭7 | — | Solo tonos enteros: flotante, de sueño (Debussy). |
| Disminuida (tono-semitono) | 1 2 ♭3 4 ♭5 ♭6 6 7 | — | Simétrica de 8 notas, sobre acordes dim7. |
| Disminuida (semitono-tono) | 1 ♭2 ♭3 3 ♭5 5 6 ♭7 | — | Simétrica de 8 notas, sobre dominantes 7♭9. |

#### Exóticas

| Escala | Fórmula | Por grados | Carácter |
| --- | --- | --- | --- |
| Doble armónica (bizantina) | 1 ♭2 3 4 5 ♭6 7 | — | Dos segundas aumentadas: sonido árabe y bizantino. |
| Húngara menor | 1 2 ♭3 ♯4 5 ♭6 7 | — | Menor armónica con 4ª aumentada: gitana, dramática. |
| Hirajōshi | 1 2 ♭3 5 ♭6 | — | Pentatónica japonesa, afinación de koto. |
| In-sen | 1 ♭2 4 5 ♭7 | — | Pentatónica japonesa con 2ª menor: austera. |

En la escala de tonos enteros, ♭5 y ♭6 se escriben habitualmente ♯4 y ♯5: es la misma nota.

---

## 4. Acordes de una escala (armonía diatónica)

Si cada acorde se arma **solo con notas de la escala**, apilando terceras desde cada grado, salen siete acordes que suenan bien juntos. Eso es lo que hace el modo **Por grados**.

### Números romanos

Cada acorde se nombra por su grado con un número romano:

- **Mayúscula** si es mayor (I, IV, V).
- **Minúscula** si es menor (ii, iii, vi).
- **°** si es disminuido, **+** si es aumentado, **ø** si es semidisminuido.

Así, una progresión se puede describir sin depender de la tonalidad: «I – V – vi – IV» es C – G – Am – F en C mayor y G – D – Em – C en G mayor. En las escalas menores, los números son relativos a la propia escala: en menor natural, i ii° III iv v VI VII.

Cada grado cumple una función:

- **Tónica** (I, vi, iii): reposo.
- **Subdominante** (IV, ii): alejamiento.
- **Dominante** (V, vii°): tensión que pide volver a la tónica.

### Los siete acordes de cada escala

Los modos de la escala mayor van con su tónica natural (todas teclas blancas), para que se vea que comparten acordes.

**Mayor (jónica) de C**

| | I | ii | iii | IV | V | vi | vii° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | C | Dm | Em | F | G | Am | Bdim |
| Séptima | Cmaj7 | Dm7 | Em7 | Fmaj7 | G7 | Am7 | Bm7♭5 |

**Dórica de D**

| | i | ii | III | IV | v | vi° | VII |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | Dm | Em | F | G | Am | Bdim | C |
| Séptima | Dm7 | Em7 | Fmaj7 | G7 | Am7 | Bm7♭5 | Cmaj7 |

**Frigia de E**

| | i | II | III | iv | v° | VI | vii |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | Em | F | G | Am | Bdim | C | Dm |
| Séptima | Em7 | Fmaj7 | G7 | Am7 | Bm7♭5 | Cmaj7 | Dm7 |

**Lidia de F**

| | I | II | iii | iv° | V | vi | vii |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | F | G | Am | Bdim | C | Dm | Em |
| Séptima | Fmaj7 | G7 | Am7 | Bm7♭5 | Cmaj7 | Dm7 | Em7 |

**Mixolidia de G**

| | I | ii | iii° | IV | v | vi | VII |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | G | Am | Bdim | C | Dm | Em | F |
| Séptima | G7 | Am7 | Bm7♭5 | Cmaj7 | Dm7 | Em7 | Fmaj7 |

**Menor natural (eólica) de A**

| | i | ii° | III | iv | v | VI | VII |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | Am | Bdim | C | Dm | Em | F | G |
| Séptima | Am7 | Bm7♭5 | Cmaj7 | Dm7 | Em7 | Fmaj7 | G7 |

**Locria de B**

| | i° | II | iii | iv | V | VI | vii |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | Bdim | C | Dm | Em | F | G | Am |
| Séptima | Bm7♭5 | Cmaj7 | Dm7 | Em7 | Fmaj7 | G7 | Am7 |

**Menor armónica de A**

| | i | ii° | III+ | iv | V | VI | vii° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | Am | Bdim | Caug | Dm | E | F | G♯dim |
| Séptima | Am(maj7) | Bm7♭5 | Cmaj7♯5 | Dm7 | E7 | Fmaj7 | G♯dim7 |

**Menor melódica de C**

| | i | ii | III+ | IV | V | vi° | vii° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | Cm | Dm | E♭aug | F | G | Adim | Bdim |
| Séptima | Cm(maj7) | Dm7 | E♭maj7♯5 | F7 | G7 | Am7♭5 | Bm7♭5 |

**Mayor armónica de C**

| | I | ii° | iii | iv | V | VI+ | vii° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | C | Ddim | Em | Fm | G | A♭aug | Bdim |
| Séptima | Cmaj7 | Dm7♭5 | Em7 | Fm(maj7) | G7 | A♭maj7♯5 | Bdim7 |

**Frigia dominante de E**

| | I | II | iii° | iv | v° | VI+ | vii |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tríada | E | F | G♯dim | Am | Bdim | Caug | Dm |
| Séptima | E7 | Fmaj7 | G♯dim7 | Am(maj7) | Bm7♭5 | Cmaj7♯5 | Dm7 |

### Tipos de acorde en el modo por grados

En el modo por grados, la rueda derecha no elige una calidad fija sino un **tipo**. La calidad la decide la escala: la «7ª» del grado I de C mayor es Cmaj7 y la del grado V es G7.

| Tipo | Etiqueta | Notas de la escala desde el grado | En C mayor, grado I | En C mayor, grado ii |
| --- | --- | --- | --- | --- |
| Tríada | `Tríada` | grado + 3ª + 5ª | C | Dm |
| Séptima | `7ª` | grado + 3ª + 5ª + 7ª | Cmaj7 | Dm7 |
| Novena | `9ª` | grado + 3ª + 5ª + 7ª + 9ª | Cmaj9 | Dm9 |
| Suspendido de 2ª | `sus2` | grado + 2ª + 5ª | Csus2 | Dsus2 |
| Suspendido de 4ª | `sus4` | grado + 4ª + 5ª | Csus4 | Dsus4 |
| Añadida novena | `add9` | grado + 3ª + 5ª + 9ª | Cadd9 | Dmadd9 |
| Sexta | `6` | grado + 3ª + 5ª + 6ª | C6 | Dm6 |
| Quinta (power chord) | `5` | grado + 5ª | C5 | D5 |

Si un tipo da un acorde que no está en el catálogo, suena la tríada. Pasa, por ejemplo, con el sus4 del IV en mayor (F – B – C, con 4ª aumentada) o con la 9ª del vii°.

---

## 5. Progresiones para practicar

En el modo **Por grados**, el I queda arriba y los demás grados siguen en sentido horario. En el modo **Libre**, cada nota está en la hora del reloj que le corresponde: C a las 12, G a las 7, B a las 11.

| Progresión | Grados | Ejemplo | Modo en la app | Se oye en |
| --- | --- | --- | --- | --- |
| Pop de cuatro acordes | I – V – vi – IV | C – G – Am – F | Por grados, C mayor | «Let It Be» (The Beatles) |
| Doo-wop | I – vi – IV – V | A – F♯m – D – E | Por grados, A mayor | «Stand by Me» (Ben E. King) |
| La misma, desde el vi | vi – IV – I – V | Em – C – G – D | Por grados, G mayor | «Zombie» (The Cranberries) |
| Canon | I – V – vi – iii – IV – I – IV – V | D – A – Bm – F♯m – G – D – G – A | Por grados, D mayor | Canon de Pachelbel |
| ii – V – I | ii7 – V7 – Imaj7 | Dm7 – G7 – Cmaj7 | Por grados, C mayor, tipo 7ª | Casi todo el jazz («Autumn Leaves») |
| Vamp dórico | i7 – IV9 | Am7 – D9 | Libre (o por grados en A dórica: i y IV) | «Oye Como Va» (Santana) |
| Mixolidio | I – ♭VII – IV | D – C – G | Por grados, D mixolidia (I, VII, IV) | «Sweet Child o' Mine» (Guns N' Roses) |
| Cadencia andaluza | i – ♭VII – ♭VI – V | Am – G – F – E | Libre (el E mayor viene de la menor armónica) | «Hit the Road Jack» (Ray Charles) |
| Blues de 12 compases | I7 ×4, IV7 ×2, I7 ×2, V7, IV7, I7, V7 | A7 – D7 – E7 | Libre, calidad `7` | «Johnny B. Goode» (Chuck Berry) |
| Creep | I – III – IV – iv | G – B – C – Cm | Libre | «Creep» (Radiohead) |

**Creep** se toca en modo libre porque dos de sus acordes no pertenecen a G mayor: el **III mayor** (B, con D♯) y el **iv menor** (Cm, «prestado» de G menor). Ese salirse de la tonalidad es justamente lo que le da su color.

---

## 6. Sonidos

### Técnicas de síntesis que usa la app

- **Sustractiva.** Osciladores con muchos armónicos (sierra, cuadrada, pulso) pasan por un filtro pasa-bajos que va quitando brillo. Una envolvente ADSR controla el volumen y otra el corte del filtro. Así funcionan la mayoría de los presets.
- **Desafinación y unísono.** Dos o más osciladores casi en la misma nota (±7 cents) «laten» entre sí y suenan anchos. El Supersaw usa siete, abiertos en estéreo.
- **Ancho de pulso.** Una onda cuadrada es un pulso al 50 %. Más estrecho suena más nasal: el Juno usa 38 % y el Chiptune 25 % y 12,5 %.
- **FM (frecuencia modulada).** Un oscilador modulador hace vibrar la frecuencia del que suena. Con una relación entera (1:1) suena armónico, como un piano eléctrico. Con una no entera (3,5:1) suena inarmónico, como una campana. El índice controla el brillo y decae con el tiempo, igual que en un DX7. La relación es respecto a la nota que suena.
- **Formantes.** Las vocales se distinguen por resonancias fijas del tracto vocal. Tres filtros pasa-banda en paralelo convierten una sierra en un «aah». Para otras vocales, cambia las frecuencias del preset Choir. Son valores medios de voz masculina (Peterson y Barney, 1952):

  | Vocal | F1 | F2 | F3 |
  | --- | --- | --- | --- |
  | a | 730 | 1090 | 2440 |
  | e | 530 | 1840 | 2480 |
  | i | 270 | 2290 | 3010 |
  | o | 570 | 840 | 2410 |
  | u | 300 | 870 | 2240 |

- **Ruido.** El ruido rosa (menos agudos que el blanco) filtrado en banda imita el soplido de una flauta o el aire de una voz.
- **Modulación.** El vibrato hace oscilar la afinación; el trémolo, el volumen (Wurlitzer). El LFO de filtro mueve el brillo despacio (Juno, Dark Drone). El chorus mezcla copias del sonido con un retardo que oscila, y lo ensancha.
- **Saturación.** Una curva suave (tanh) redondea los picos y suma armónicos cálidos.
- **Sala.** Dos reverbs generadas por código: «room» (2,8 s) y «hall» (6 s). Cada preset elige una y la mezcla se ajusta con el control Reverb.

### Los 17 presets

#### Clásicos

| Preset | Cómo suena | Cómo está hecho |
| --- | --- | --- |
| **Warm Pad** | Pad cálido de dos sierras con sub-octava; se abre despacio. | 2 sierras + 1 triángulo |
| **Bright Saw** | Tres sierras brillantes con ataque de filtro marcado. | 3 sierras |
| **Strings** | Sección de cuerdas sintética con vibrato. | 3 sierras, vibrato |
| **Electric Piano** | Piano eléctrico FM con campana al atacar. | 2 senos, FM 1:1 (índice 2.6), re-ataca al cambiar |
| **Organ** | Órgano de tres registros (8, 4 y 2⅔ pies) con vibrato. | 3 senos, vibrato |

#### Pads modernos

| Preset | Cómo suena | Cómo está hecho |
| --- | --- | --- |
| **Supersaw** | Siete sierras desafinadas abiertas en estéreo: el pad gigante del trance. | 7 sierras, abiertos en estéreo, chorus |
| **Juno Pad** | Pulso y sierra con sub-octava, filtro que respira y el chorus clásico de los 80. | 1 pulso 38 % + 1 sierra + 1 pulso 50 %, LFO de filtro, chorus |
| **Choir "Aah"** | Coro sintético: sierras filtradas por las resonancias de la vocal «a». | 2 sierras + 1 pulso 30 %, abiertos en estéreo, ruido rosa, formantes 800/1150/2900 Hz, vibrato, chorus |

#### Ataque y carácter

| Preset | Cómo suena | Cómo está hecho |
| --- | --- | --- |
| **Pluck** | Cuerda pulsada sintética: un golpe de filtro brevísimo que se apaga solo. | 1 sierra + 1 cuadrada, chorus, re-ataca al cambiar |
| **Analog Brass** | Metales analógicos: el filtro se abre al atacar, con un poco de saturación. | 2 sierras, vibrato, saturación |
| **Chiptune** | Pulsos finos sin filtro, como una consola de 8 bits. | 1 pulso 25 % + 1 pulso 12,5 %, vibrato, re-ataca al cambiar |

#### Teclas y campanas FM

| Preset | Cómo suena | Cómo está hecho |
| --- | --- | --- |
| **Glass Bells** | Campanas de vidrio: FM con relación inarmónica 3.5:1 y cola larga. | 2 senos, FM 3.5:1 (índice 3.2), sala grande, re-ataca al cambiar |
| **Lo-fi Keys** | Piano eléctrico tipo Wurlitzer: FM 1:1, trémolo y saturación cálida. | 2 senos, FM 1:1 (índice 1.6), trémolo, saturación, chorus, re-ataca al cambiar |
| **Music Box** | Caja de música: una octava arriba, metálica y de decaimiento corto. | 2 senos, FM 10:1 (índice 0.25), sala grande, re-ataca al cambiar |

#### Texturas ambient

| Preset | Cómo suena | Cómo está hecho |
| --- | --- | --- |
| **Air Flute** | Flauta de aire: senoide con soplido de ruido rosa y vibrato suave. | 1 seno + 1 triángulo, ruido rosa, vibrato, chorus |
| **Dark Drone** | Drone oscuro: sierras graves tras un filtro muy cerrado que se mueve lento. | 2 sierras + 1 seno, abiertos en estéreo, LFO de filtro, chorus, sala grande |
| **Hall Pad** | Pad etéreo de entrada y salida lentísimas en una sala enorme. | 2 triángulos + 1 sierra, abiertos en estéreo, chorus, sala grande |

### Límite conocido

Una cuerda pulsada realista (Karplus-Strong) necesita un AudioWorklet. En Web Audio, un retardo dentro de un lazo de realimentación no puede ser menor de 128 muestras, lo que limita la nota más aguda a unos 375 Hz. Por eso Pluck es sustractivo.

---

## 7. Cómo añadir cosas

Después de cualquier cambio, corre `pnpm test`: los tests revisan automáticamente la ortografía de cada acorde en las 12 raíces y que las escalas por grados tengan todos sus acordes.

- **Un acorde.**
  1. Añádelo a `CHORDS` en `src/music/chords.ts` con:
     - `intervals`: semitonos desde la raíz;
     - `degrees`: el grado de cada intervalo (1, 3, 5, 7, 9…);
     - `suffix`: el sufijo en ASCII, con `b` y `#`.
  2. Añade su id a `QUALITY_IDS` en el lugar donde quieras verlo.

  Aparece solo en el editor de la rueda. Ejemplo:

  ```ts
  '7b13': { name: 'Séptima con 13ª menor', category: 'extended', intervals: [0, 4, 7, 10, 20], degrees: [1, 3, 5, 7, 13], suffix: '7b13' },
  ```

- **Una escala.** Añádela a `SCALES` en `src/music/scales.ts`. Si tiene 7 notas y quieres tocarla por grados, pon `degrees: true`: el test avisará si alguno de sus acordes no existe en el catálogo.
- **Un tipo para el modo por grados.** Añádelo a `DEGREE_TYPES` en `src/music/diatonic.ts`. `steps` son pasos de escala desde el grado: 0 el grado, 2 su tercera, 4 su quinta, 6 su séptima…
- **Un preset.** Añade su id a `PRESET_IDS` y su definición a `PRESETS` en `src/audio/presets.ts`. Los campos opcionales (`pulseWidth`, `pan`, `noise`, `filterLfo`, `formants`, `drive`, `tremolo`, `chorus`, `space`) solo crean nodos si se usan. Ajusta `level` para que suene tan fuerte como los demás: en las pruebas, los presets sostenidos rondan −12 a −14 dB RMS.
- **Las ruedas por defecto.** Están en `DEFAULT_WHEEL_CHORDS` y `DEFAULT_DEGREE_TYPES` (`src/config.ts`). Lo que cada persona elige desde la app se guarda en su navegador.
