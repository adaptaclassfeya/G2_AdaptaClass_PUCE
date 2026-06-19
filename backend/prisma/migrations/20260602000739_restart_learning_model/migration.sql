-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "Tema" AS ENUM ('LENGUA_CULTURA', 'COMUNICACION_ORAL', 'LECTURA', 'ESCRITURA', 'LITERATURA');

-- CreateEnum
CREATE TYPE "TipoJuego" AS ENUM ('BASE', 'CAMBIANTE');

-- CreateEnum
CREATE TYPE "TipoFuente" AS ENUM ('DEFAULT', 'MANUAL', 'IA');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('PLAY_TIME', 'PLAY_DISTINCT', 'ANSWER_CORRECT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "puntos_xp" INTEGER NOT NULL DEFAULT 0,
    "racha_dias" INTEGER NOT NULL DEFAULT 0,
    "last_login_date" DATE,
    "paralelo_id" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "paralelos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "grado" INTEGER NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "codigo_acceso" VARCHAR(6) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paralelos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" "Tema" NOT NULL,
    "tipo" "TipoJuego" NOT NULL,
    "acepta_preguntas_ia" BOOLEAN NOT NULL DEFAULT false,
    "config_default" JSONB,
    "grado_min" INTEGER NOT NULL,
    "grado_max" INTEGER NOT NULL,
    "descripcion" TEXT,
    "thumbnail_url" TEXT,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_content" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "grado" INTEGER NOT NULL,
    "contenido_json" JSONB NOT NULL,

    CONSTRAINT "game_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_sources" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "tema" "Tema" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "source_id" TEXT,
    "tema" "Tema" NOT NULL,
    "texto" TEXT NOT NULL,
    "opciones" JSONB NOT NULL,
    "respuesta_correcta" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "paralelo_id" TEXT NOT NULL,
    "tipo" "MissionType" NOT NULL,
    "goal_value" INTEGER NOT NULL,
    "fecha_limite" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_mission_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "xp_otorgado" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "student_mission_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutos_jugados" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "preguntas_correctas" INTEGER NOT NULL DEFAULT 0,
    "preguntas_intentadas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "correcta" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "students_paralelo_id_idx" ON "students"("paralelo_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_cedula_key" ON "teachers"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "paralelos_codigo_acceso_key" ON "paralelos"("codigo_acceso");

-- CreateIndex
CREATE UNIQUE INDEX "games_titulo_key" ON "games"("titulo");

-- CreateIndex
CREATE UNIQUE INDEX "game_content_game_id_grado_key" ON "game_content"("game_id", "grado");

-- CreateIndex
CREATE INDEX "student_mission_progress_student_id_idx" ON "student_mission_progress"("student_id");

-- CreateIndex
CREATE INDEX "student_mission_progress_mission_id_idx" ON "student_mission_progress"("mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_mission_progress_student_id_mission_id_key" ON "student_mission_progress"("student_id", "mission_id");

-- CreateIndex
CREATE INDEX "notifications_student_id_idx" ON "notifications"("student_id");

-- CreateIndex
CREATE INDEX "notifications_mission_id_idx" ON "notifications"("mission_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paralelos" ADD CONSTRAINT "paralelos_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_content" ADD CONSTRAINT "game_content_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sources" ADD CONSTRAINT "question_sources_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "question_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_paralelo_id_fkey" FOREIGN KEY ("paralelo_id") REFERENCES "paralelos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mission_progress" ADD CONSTRAINT "student_mission_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mission_progress" ADD CONSTRAINT "student_mission_progress_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
