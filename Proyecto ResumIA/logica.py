# logica.py

import os
from google import genai
from js import document, FileReader
import pyodide
# Inicializa rel cliente de la API
client = genai.Client(api_key="AIzaSyCgGI9zZWeVcrh0nLEK_xY9NbFHi2jbm60") 

def cargar_y_guardar_archivo(event):
    """
    Carga un archivo del input HTML, lo guarda en el sistema de archivos
    virtual de Pyodide y devuelve una 'ruta' usable.
    """
    input_el = document.getElementById("fileInput")
    file = input_el.files[0]

    if not file:
        document.getElementById("salida").textContent = "⚠️ No seleccionaste ningún archivo."
        return None

    # Crear un lector
    lector = FileReader()
    salida = document.getElementById("salida")

    def cuando_cargue(e):
        data = e.target.result  # contenido binario (bytes o texto)
        nombre_virtual = file.name  # nombre real
        # Guardamos el archivo en el FS virtual
        if isinstance(data, str):
            pyodide.FS.writeFile(nombre_virtual, data)
        else:
            # Para binario (audio)
            pyodide.FS.writeFile(nombre_virtual, bytes(data.to_py()))
        
        salida.textContent = f"✅ Archivo '{nombre_virtual}' guardado en el FS virtual."
        
        # Función con parámetro path
        resultado = transcribir_y_procesar(nombre_virtual)

        # Mostrar el resultado
        salida.textContent = resultado
        
        document.querySelector("#resultado").innerText = resultado
        

    
    lector.onload = cuando_cargue
    lector.readAsArrayBuffer(file)  # usar binario para audio


def transcribir_y_procesar(file_path):
    
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError("No se encontró el archivo de audio especificado.")

    print(f"Subiendo archivo: {file_path}...")

    # 1. Subir archivo
    audio_file = client.files.upload(file=file_path)

    # 2. Prompt con instrucciones
    instruccion_prompt = (
        """Transcribe el siguiente audio. Una vez transcrito, por favor: 
        Actúa como un analista de información experto. 
        Tu tarea es resumirlo en puntos clave, detectar lagunas y complementarlas.
        Si es necesario, añade información verificada para enriquecer el contexto.
        Mantén el lenguaje claro, ordenado y objetivo, sin opiniones personales.
        Entrega la respuesta en el formato:
        Resumen de puntos clave:
        Información complementada:
        Notas adicionales:
        No incluyas la transcripción original ni subtítulos adicionales."""
    )

    # 3. Generar contenido con el modelo
    print("Generando transcripción y resumen...")
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[instruccion_prompt, audio_file]
    )

    # 4. Limpiar el archivo remoto
    client.files.delete(name=audio_file.name)
    print(f"Archivo subido {audio_file.name} eliminado.")

    # 5. Retornar el texto final
    return response.text  

document.getElementById("btnProcesar").addEventListener("click", cargar_y_guardar_archivo)


def ejecutar(nombre_virtual):
    resultado = transcribir_y_procesar(nombre_virtual)