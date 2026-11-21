--
-- PostgreSQL database dump
--

\restrict nqve3LflAmF7oIqUyioYvO7NbDHolamYNKairhtfibN4cZBp5UdFH4zlwcIMQRD

-- Dumped from database version 14.24 (Ubuntu 14.24-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.24 (Ubuntu 14.24-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.achievements (id, title, description, xp_reward, icon, created_at, updated_at) VALUES ('fb681940-1497-48f2-ab14-e4cc3c8d360d', 'Primer entrenamiento', 'Completa tu primer entrenamiento.', 50, 'trophy', '2026-08-27 19:02:25.590642-06', '2026-08-27 19:02:25.590642-06');
INSERT INTO public.achievements (id, title, description, xp_reward, icon, created_at, updated_at) VALUES ('9849380e-75c1-47e3-a267-08e11d8a67de', 'En marcha', 'Completa 5 entrenamientos.', 100, 'dumbbell', '2026-08-27 19:02:25.590642-06', '2026-08-27 19:02:25.590642-06');
INSERT INTO public.achievements (id, title, description, xp_reward, icon, created_at, updated_at) VALUES ('4cce8b6a-6a64-485b-b4d0-f369979dbbc0', '500 Club', 'Acumula 500 XP.', 150, 'star', '2026-08-27 19:02:25.590642-06', '2026-08-27 19:02:25.590642-06');
INSERT INTO public.achievements (id, title, description, xp_reward, icon, created_at, updated_at) VALUES ('2bdaf3be-c635-4f48-85ed-e14efd718ebf', 'Nivel 2', 'Alcanza el nivel 2.', 100, 'level-up', '2026-08-27 19:02:25.590642-06', '2026-08-27 19:02:25.590642-06');
INSERT INTO public.achievements (id, title, description, xp_reward, icon, created_at, updated_at) VALUES ('c9ef4717-4749-4e63-b915-602caf8b3b1c', 'Constancia', 'Alcanza una racha de 3 semanas.', 100, 'flame', '2026-08-27 19:02:25.590642-06', '2026-08-27 19:02:25.590642-06');
INSERT INTO public.achievements (id, title, description, xp_reward, icon, created_at, updated_at) VALUES ('31e78e70-a0e9-4c3b-b209-1787789a5366', 'Imparable', 'Alcanza una racha de 7 semanas.', 200, 'fire', '2026-08-27 19:02:25.590642-06', '2026-08-27 19:02:25.590642-06');


--
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.challenges (id, title, description, goal, start_date, end_date, xp_reward, created_at, updated_at) VALUES ('b3d63ccc-bd12-4465-92bd-f555833a9b2e', 'Primer Impulso', 'Completa 2 entrenamientos durante el reto.', 2, '2026-09-01 00:00:00-06', '2026-12-31 23:59:59-06', 100, '2026-09-26 13:08:50.205234-06', '2026-09-26 13:08:50.205234-06');
INSERT INTO public.challenges (id, title, description, goal, start_date, end_date, xp_reward, created_at, updated_at) VALUES ('8cd65dd9-0676-4ae8-93bf-18dbc15b7500', 'Semana Activa', 'Completa 3 entrenamientos durante el reto.', 3, '2026-09-01 00:00:00-06', '2026-12-31 23:59:59-06', 150, '2026-09-26 13:08:50.205234-06', '2026-09-26 13:08:50.205234-06');
INSERT INTO public.challenges (id, title, description, goal, start_date, end_date, xp_reward, created_at, updated_at) VALUES ('4b9f7958-f21e-4d7e-a118-7ec4ad0f5e5c', 'A Todo Ritmo', 'Completa 5 entrenamientos durante el reto.', 5, '2026-09-01 00:00:00-06', '2026-12-31 23:59:59-06', 250, '2026-09-26 13:08:50.205234-06', '2026-09-26 13:08:50.205234-06');


--
-- Data for Name: exercises; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('22721daa-f1bf-4dcd-85f0-50386e58c132', 'Bicep Curl', 'Curl para trabajar bíceps.', true, 'arms', 'Dumbbells', 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/81/Biceps-curl-1.png.400x400_q85.png', 'Everkinetic', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://wger.de/en/exercise/92/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('fada5cd6-f32c-4019-8a00-8bd1520819a6', 'Tricep Pushdown', 'Extensión de tríceps utilizando polea.', true, 'arms', 'Cable Machine', 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/805/7a437824-e2cc-46e1-804a-674f0ea31d25.png.400x400_q85.png', 'wger.de', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://wger.de/en/exercise/805/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('db17c7fe-287c-486e-a302-f5c41a2d7015', 'Lat Pulldown', 'Jalón en polea para trabajar espalda.', true, 'back', 'Cable Machine', 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/158/0d51a0f2-622f-434b-beb8-1a003c54712a.png.400x400_q85.jpg', 'Franpol', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://wger.de/en/exercise/158/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('ac65d8bd-8fc6-4a6f-8cc3-ef6c1925da44', 'Barbell Row', 'Remo con barra enfocado en espalda.', true, 'back', 'Barbell', 'intermediate', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png.400x400_q85.jpg', 'Everkinetic', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://wger.de/en/exercise/83/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('05581c3c-536f-4e64-a383-bae03e813cf4', 'Push Up', 'Ejercicio de peso corporal enfocado en pecho y tríceps.', true, 'chest', NULL, 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/1217/590e65db-de60-4727-b7eb-55f80af56043.png.400x400_q85.png', 'wger.de', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://wger.de/en/exercise/1217/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('30c08618-43dd-4426-958b-4dcf79d305d6', 'Bench Press', 'Press de banca para trabajar principalmente pecho.', true, 'chest', 'Barbell', 'intermediate', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/192/Bench-press-1.png.400x400_q85.png', 'Everkinetic', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://wger.de/en/exercise/73/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('de90a267-4b62-4852-9b80-5dff3c7c2173', 'Plank', 'Ejercicio isométrico para fortalecer el core.', true, 'core', NULL, 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png.400x400_q85.png', 'utkb', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://wger.de/en/exercise/458/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('23acabe9-11b0-4016-9aa5-325b52cf378f', 'Romanian Deadlift', 'Ejercicio enfocado en femorales y cadena posterior.', true, 'legs', 'Barbell', 'intermediate', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp.400x400_q85.jpg', 'AlucardEvil40', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://wger.de/en/exercise/1652/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('65550f2f-60b8-453d-b38d-92ee37c56d7d', 'Leg Press', 'Prensa de piernas en máquina.', true, 'legs', 'Leg Press Machine', 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp.400x400_q85.png', 'wger.de', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', 'https://wger.de/en/exercise/371/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('b971f3f4-4c3d-48bc-83be-7fc677d34ddd', 'Squat', 'Sentadilla para trabajar principalmente piernas.', true, 'legs', 'Barbell', 'intermediate', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/191/Front-squat-2-857x1024.png.400x400_q85.png', 'Everkinetic', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://wger.de/en/exercise/257/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('5e4cc240-9b44-4355-86a0-14ee596a4991', 'Shoulder Press', 'Press vertical para trabajar hombros.', true, 'shoulders', 'Dumbbells', 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png.400x400_q85.jpg', 'Everkinetic', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://wger.de/en/exercise/567/view/');
INSERT INTO public.exercises (id, name, description, is_active, muscle_group, equipment, difficulty, created_at, updated_at, image_url, image_author, image_license, image_license_url, image_source_url) VALUES ('fe1f85e4-017b-402e-aeea-987cb344f349', 'Lateral Raise', 'Elevaciones laterales para hombros.', true, 'shoulders', 'Dumbbells', 'beginner', '2026-08-25 18:11:32.045611-06', '2026-08-25 18:11:32.045611-06', 'https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png.400x400_q85.jpg', 'Everkinetic', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0/', 'https://wger.de/en/exercise/348/view/');


--
-- PostgreSQL database dump complete
--

\unrestrict nqve3LflAmF7oIqUyioYvO7NbDHolamYNKairhtfibN4cZBp5UdFH4zlwcIMQRD

