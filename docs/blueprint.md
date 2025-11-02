# **App Name**: Araval Cotizaciones

## Core Features:

- Datos Generales: Captura de información de la empresa (Razón Social, RUT, Dirección) y del solicitante (Nombre, RUT, Cargo, Mail).
- Catálogo de Exámenes: Carga dinámica del catálogo de exámenes desde Firestore, filtrado por categorías (Psicosensométricos, Específicos, Baterías, Drogas y Alcohol, Imágenes).
- Selección de Exámenes: Interfaz para seleccionar exámenes del catálogo, con resumen flotante de la cotización (nombre, valor unitario, subtotal acumulado).
- Generación de Cotización: Generación de vista con información completa de la cotización: datos de la empresa, datos del solicitante, detalle de exámenes y total final.
- Simulación PDF/Word: Botón 'Imprimir/Exportar' para guardar la vista como PDF (simulación de documento editable/exportable).
- Admin Catálogo: Vista de administración para usuarios con rol 'admin', que permite la edición en línea de los precios de los exámenes directamente en Firestore.
- Autenticación de Usuario: Sistema de autenticación de usuarios con roles diferenciados (usuario estándar vs. administrador) para controlar el acceso al módulo de administración de catálogo.

## Style Guidelines:

- Color primario: Azul medio (#5DADE2) que transmite confianza y profesionalismo.
- Color de fondo: Azul muy claro (#EBF5FB) para un diseño limpio y fácil de usar.
- Color de acento: Verde (#A3E4D7) para resaltar acciones importantes y elementos interactivos.
- Fuente para cuerpo del texto: 'PT Sans' (sans-serif) para una lectura clara y moderna.
- Fuente para encabezados: 'Space Grotesk' (sans-serif) para un aspecto tecnológico y fácil de leer. Utilizar 'PT Sans' para el cuerpo del texto.
- Iconos claros y sencillos para identificar categorías de exámenes y acciones dentro de la aplicación.
- Diseño de interfaz limpio y organizado, con una navegación intuitiva para facilitar la creación de cotizaciones y la administración del catálogo.
- Animaciones sutiles al cargar datos o actualizar la base de datos para mejorar la experiencia del usuario.