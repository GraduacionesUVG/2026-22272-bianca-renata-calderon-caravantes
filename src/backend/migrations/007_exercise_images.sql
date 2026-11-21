-- Imágenes de ejercicios de wger.de (https://wger.de), base de datos abierta
-- de ejercicios. Las imágenes tienen licencias Creative Commons Attribution
-- ShareAlike: la app debe mostrar el autor y la licencia junto a la imagen.
--
-- Se enlazan las miniaturas de 400x400 que sirve wger. image_source_url
-- apunta a la ficha del ejercicio en wger, donde está la atribución completa.

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS image_author VARCHAR(100),
    ADD COLUMN IF NOT EXISTS image_license VARCHAR(50),
    ADD COLUMN IF NOT EXISTS image_license_url TEXT,
    ADD COLUMN IF NOT EXISTS image_source_url TEXT;

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/81/Biceps-curl-1.png.400x400_q85.png',
    image_author = 'Everkinetic',
    image_license = 'CC BY-SA 3.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/3.0/',
    image_source_url = 'https://wger.de/en/exercise/92/view/'
WHERE name = 'Bicep Curl';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/805/7a437824-e2cc-46e1-804a-674f0ea31d25.png.400x400_q85.png',
    image_author = 'wger.de',
    image_license = 'CC BY-SA 4.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_source_url = 'https://wger.de/en/exercise/805/view/'
WHERE name = 'Tricep Pushdown';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/158/0d51a0f2-622f-434b-beb8-1a003c54712a.png.400x400_q85.jpg',
    image_author = 'Franpol',
    image_license = 'CC BY-SA 4.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_source_url = 'https://wger.de/en/exercise/158/view/'
WHERE name = 'Lat Pulldown';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png.400x400_q85.jpg',
    image_author = 'Everkinetic',
    image_license = 'CC BY-SA 3.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/3.0/',
    image_source_url = 'https://wger.de/en/exercise/83/view/'
WHERE name = 'Barbell Row';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/1217/590e65db-de60-4727-b7eb-55f80af56043.png.400x400_q85.png',
    image_author = 'wger.de',
    image_license = 'CC BY-SA 4.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_source_url = 'https://wger.de/en/exercise/1217/view/'
WHERE name = 'Push Up';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/192/Bench-press-1.png.400x400_q85.png',
    image_author = 'Everkinetic',
    image_license = 'CC BY-SA 3.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/3.0/',
    image_source_url = 'https://wger.de/en/exercise/73/view/'
WHERE name = 'Bench Press';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png.400x400_q85.png',
    image_author = 'utkb',
    image_license = 'CC BY-SA 4.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_source_url = 'https://wger.de/en/exercise/458/view/'
WHERE name = 'Plank';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp.400x400_q85.jpg',
    image_author = 'AlucardEvil40',
    image_license = 'CC BY-SA 4.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_source_url = 'https://wger.de/en/exercise/1652/view/'
WHERE name = 'Romanian Deadlift';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp.400x400_q85.png',
    image_author = 'wger.de',
    image_license = 'CC BY-SA 4.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    image_source_url = 'https://wger.de/en/exercise/371/view/'
WHERE name = 'Leg Press';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/191/Front-squat-2-857x1024.png.400x400_q85.png',
    image_author = 'Everkinetic',
    image_license = 'CC BY-SA 3.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/3.0/',
    image_source_url = 'https://wger.de/en/exercise/257/view/'
WHERE name = 'Squat';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png.400x400_q85.jpg',
    image_author = 'Everkinetic',
    image_license = 'CC BY-SA 3.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/3.0/',
    image_source_url = 'https://wger.de/en/exercise/567/view/'
WHERE name = 'Shoulder Press';

UPDATE exercises SET
    image_url = 'https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png.400x400_q85.jpg',
    image_author = 'Everkinetic',
    image_license = 'CC BY-SA 3.0',
    image_license_url = 'https://creativecommons.org/licenses/by-sa/3.0/',
    image_source_url = 'https://wger.de/en/exercise/348/view/'
WHERE name = 'Lateral Raise';

