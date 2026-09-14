# Usamos la imagen oficial ligera de PHP
FROM php:8.2-cli

# Instalamos dependencias del sistema y la extensión oficial de MongoDB para PHP
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libssl-dev \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && rm -rf /var/lib/apt/lists/*

# Copiamos Composer desde su imagen oficial
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Directorio de trabajo
WORKDIR /app

# Copiamos el código del proyecto
COPY . /app

# Instalamos las librerías de Composer
RUN composer install --no-dev --optimize-autoloader

# Variable de puerto dinámico que asigna Render
ENV PORT=10000
EXPOSE 10000

# Comando de inicio del servidor web en la carpeta public
CMD php -S 0.0.0.0:${PORT:-10000} -t public
