# Diccionario de Datos - AdaptaClassX

Este documento describe la estructura de la base de datos de AdaptaClassX, detallando qué representa cada tabla (colección) y cuáles son sus campos principales, basándose en el esquema de Prisma.

---

## 1. Autenticación y Usuarios

### Tabla: `users`
Representa la entidad central de autenticación y autorización en el sistema. Todos los actores (estudiantes y profesores) tienen un registro aquí.
- **id**: Identificador único (UUID).
- **email**: Correo electrónico del usuario (único).
- **password_hash**: Contraseña encriptada.
- **role**: Rol del usuario (`STUDENT`, `TEACHER`, `ADMIN`).
- **created_at**: Fecha de creación de la cuenta.

### Tabla: `students`
Contiene la información de perfil y gamificación específica para los usuarios con rol de estudiante.
- **user_id**: Llave foránea conectada a `users`.
- **nombre**: Nombre del estudiante.
- **puntos_xp**: Puntos de experiencia acumulados en la plataforma.
- **racha_dias**: Cantidad de días consecutivos ingresando a la plataforma.
- **last_login_date**: Fecha del último inicio de sesión (usado para calcular rachas).
- **paralelo_id**: Referencia al paralelo (aula) al que pertenece el estudiante.

### Tabla: `teachers`
Contiene la información de perfil de los usuarios con rol de profesor.
- **user_id**: Llave foránea conectada a `users`.
- **nombre**: Nombre del profesor.
- **cedula**: Documento de identidad del profesor (opcional).

---

## 2. Gestión de Aulas

### Tabla: `paralelos`
Representa un grupo de clases, grado o aula virtual administrada por un profesor.
- **id**: Identificador único (UUID).
- **nombre**: Nombre del paralelo (ej. "Matemáticas Básicas").
- **grado**: Nivel escolar asignado al paralelo.
- **teacher_id**: Identificador del profesor que administra el aula.
- **codigo_acceso**: Código único de 6 caracteres para que los estudiantes se unan al paralelo.
- **chatbot_enabled** / **chatbot_llm_enabled**: Configuraciones para habilitar o limitar la Inteligencia Artificial del chatbot en esa aula.

---

## 3. Gamificación y Contenido

### Tabla: `games`
Representa la configuración base de un juego interactivo dentro de la plataforma.
- **id**: Identificador único (UUID).
- **titulo**: Nombre del juego.
- **tema**: Tema educativo abordado.
- **tipo**: Modalidad de juego (`BASE` o `CAMBIANTE`).
- **acepta_preguntas_ia**: Indica si el juego soporta integración con preguntas generadas por IA.
- **grado_min** / **grado_max**: Rango de grados escolares para los cuales es apto el juego.

### Tabla: `game_content`
Almacena el contenido o configuración específica de un juego para un grado particular.
- **game_id**: Juego al que pertenece.
- **grado**: Nivel escolar específico de esta configuración.
- **contenido_json**: Estructura JSON con las reglas o niveles del juego.

---

## 4. Banco de Preguntas (IA y Manual)

### Tabla: `question_sources`
Almacena la referencia a los documentos base (ej. PDFs, textos) subidos por los profesores para generar preguntas con IA.
- **id**: Identificador único (UUID).
- **teacher_id**: Profesor que subió la fuente.
- **filename**: Nombre del archivo original.
- **tema**: Tema general de la fuente.

### Tabla: `questions`
Almacena preguntas individuales, generadas por IA a partir de fuentes o creadas manualmente.
- **id**: Identificador único.
- **texto**: Enunciado de la pregunta.
- **opciones**: Estructura JSON con las múltiples respuestas disponibles.
- **respuesta_correcta**: La opción que es validada como correcta.
- **source_id**: Documento base de donde se generó (si aplica).

---

## 5. Misiones y Progreso

### Tabla: `missions`
Misiones o retos creados por los profesores para que los estudiantes del paralelo los cumplan y ganen recompensas.
- **id**: Identificador único (UUID).
- **tipo**: Tipo de misión (`PLAY_TIME`, `PLAY_DISTINCT`, `ANSWER_CORRECT`).
- **goal_value**: Valor objetivo (ej. 10 minutos jugados, 5 respuestas correctas).
- **xp_reward**: Puntos de experiencia otorgados al completar.
- **fecha_limite**: Fecha máxima para completar la misión.

### Tabla: `student_mission_progress`
Registra el avance individual de cada estudiante en una misión específica.
- **student_id** / **mission_id**: Relación estudiante-misión.
- **current_value**: Progreso actual (ej. 4.5 minutos jugados).
- **completado**: Estado booleano de la misión.
- **xp_otorgado**: Indica si la recompensa ya fue reclamada/otorgada al estudiante.

---

## 6. Historial de Sesiones e Intentos

### Tabla: `game_sessions`
Registra cada vez que un estudiante inicia una sesión de un juego. Sirve para métricas y misiones.
- **id**: Identificador único.
- **student_id** / **game_id**: El estudiante y el juego que jugó.
- **minutos_jugados**: Tiempo activo dentro del juego.
- **preguntas_correctas** / **preguntas_intentadas**: Estadísticas de rendimiento durante esta sesión específica.

### Tabla: `question_attempts`
Registra a nivel granular cada intento de respuesta que un estudiante realiza. Útil para el dashboard de analíticas del profesor (Adapta-G).
- **id**: Identificador único.
- **question_id**: Pregunta que se intentó responder.
- **game_session_id**: Sesión donde ocurrió el intento.
- **correcta**: Indica si la respuesta fue correcta o no.

---

## 7. Recompensas y Notificaciones

### Tabla: `achievements`
Insignias o logros globales configurables del sistema (ej. "Primera Misión", "Racha de 7 días").
- **codigo**: Identificador clave único (ej. `STREAK_7`).
- **nombre** / **descripcion**: Textos presentados al usuario.
- **xp_reward**: Cantidad de experiencia que da la insignia.
- **icon**: Nombre del icono para la interfaz gráfica.

### Tabla: `student_achievements`
Tabla intermedia que guarda cuándo y qué estudiante ha ganado un logro específico.
- **student_id** / **achievement_id**: Relación entre el alumno y el logro.
- **earned_at**: Fecha en la que se desbloqueó el logro.

### Tabla: `notifications`
Alertas enviadas a los estudiantes (ej. "¡Has completado una misión!").
- **student_id** / **mission_id**: Datos del contexto.
- **mensaje**: El texto de la notificación.
- **leida**: Si el estudiante ya revisó la alerta.
