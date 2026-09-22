# Marcador de tenis

Aplicacion web sencilla para llevar el marcador de un partido de tenis.

## Uso

Abre `index.html` directamente en el navegador. No requiere instalacion ni servidor.

- Abre `Configuracion` para editar los nombres de ambos jugadores.
- Al abrir la aplicacion o pulsar `Reiniciar`, la configuracion aparece antes de iniciar el partido.
- Define el nombre del marcador y la categoria del partido; ambos se muestran en la cabecera.
- Al iniciar, realiza el sorteo: quien gana elige sacar primero o elegir lado.
- El punto junto al nombre indica quien esta sirviendo y cambia al terminar cada juego.
- Elige partido al mejor de 3 o de 5 sets.
- Configura el ultimo set como set normal o supertiebreak a 10 puntos.
- Pulsa el boton del jugador que gano cada punto.
- Despues de seleccionar al ganador, clasifica el punto como `Winner`, `Error forzado` o `Error no forzado`.
- Usa `Ace` cuando el jugador que saca gana directamente el punto y `Doble falta` cuando pierde el saque; ambas acciones asignan el punto automaticamente.
- Usa `Deshacer` para corregir el ultimo punto.
- Consulta la tabla de estadisticas y pulsa `Exportar a Excel` para descargar un archivo CSV compatible con Excel.
- La tabla incluye `Winner`, errores forzados y errores no forzados por jugador.
- En la columna `Warnings`, el primero es una advertencia, el segundo otorga el punto al rival y el tercero termina el partido a favor del rival.
- Usa `Reiniciar` para comenzar un nuevo partido.
- Al finalizar, aparece una pestaña con el nombre del ganador.
- Tambien puedes usar las teclas `1` y `2`.

Los sets normales se juegan a 6 juegos y, si llegan a 6-6, se resuelven con tiebreak a 7 puntos con diferencia de 2. El ultimo set puede configurarse como set normal o supertiebreak a 10 puntos.
