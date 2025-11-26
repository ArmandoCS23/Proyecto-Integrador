@echo off
REM Script para recolectar datos y entrenar el modelo

echo.
echo ==============================================================================
echo          ENTRENADOR DE POSTURAS - RECOLECCION Y ENTRENAMIENTO
echo ==============================================================================
echo.
echo Este script te ayudara a:
echo 1. Capturar mas imagenes del dataset (PASO 1)
echo 2. Entrenar el modelo con los nuevos datos (PASO 2)
echo.

setlocal enabledelayedexpansion

set choice=0

:menu
echo.
echo ==============================================================================
echo Selecciona una opcion:
echo ==============================================================================
echo.
echo 1. Capturar imagenes RAPIDO (recomendado - captura multiples frames)
echo 2. Capturar imagenes de forma manual (una por una)
echo 3. Capturar videos etiquetados (recomendado para entrenar)
echo 4. Entrenar modelo con los datos recolectados (imágenes + videos)
echo 5. Entrenar modelo SOLO con videos (usar --videos-only)
echo 6. Salir
echo.
set /p choice="Ingresa tu opcion (1-6): "

if "%choice%"=="1" (
    echo.
    echo Iniciando captura RAPIDA...
    echo.
    python captura_rapida_desde_video.py
    goto menu
) else if "%choice%"=="2" (
    echo.
    echo Iniciando captura manual...
    echo.
    python captura_imagenes.py
    goto menu
 ) else if "%choice%"=="3" (
    echo.
    echo Iniciando captura de videos etiquetados...
    echo.
    python captura_videos.py
    goto menu
 ) else if "%choice%"=="4" (
    echo.
    echo Iniciando entrenamiento del modelo (imagenes + videos)...
    echo.
    python entrenar_modelo.py
    echo.
    echo Entrenamiento completado.
    goto menu
 ) else if "%choice%"=="5" (
    echo.
    echo Iniciando entrenamiento del modelo SOLO con videos...
    echo.
    python entrenar_modelo.py --videos-only --fps 1
    echo.
    echo Entrenamiento completado.
    goto menu
 ) else if "%choice%"=="6" (
    echo.
    echo Saliendo...
    exit /b 0
) else (
    echo.
    echo Opcion invalida. Intenta de nuevo.
    goto menu
)
