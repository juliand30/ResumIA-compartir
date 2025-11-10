# logica.py

import markdown # Para convertir texto a formato Markdown si es necesario
import os
from google import genai
from dotenv import load_dotenv

load_dotenv(r"C:\Users\Julian\OneDrive\Documentos\Universidad\Proyectos\Backend ResumIA\secreto.env")

key = os.getenv("KEY")

# Inicializa el cliente de la API
client = genai.Client(api_key= key) 

def transcribir_y_procesar(file_path):
    """
    Sube un archivo de audio, lo transcribe y genera un resumen estructurado.
    """
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
        No incluyas la transcripción original ni subtítulos adicionales.
        Aegúrate de que el return sea en formato Markdown para mejor legibilidad.
        Cuando uses viñetas, utiliza guiones (-) para cada punto.
        Aegurate de que cada subtitulo sea más grande, usando ## para los subtitulos 
        principales y ### para los secundarios y que esté en negrita.
        Asegúrate de empezar cada resumen con un subtitulo de nivel 2 titulado 'Resumen de:' (tema del audio)."""
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
    #Convierte a Markdown
    md_text = response.text or ""                                       
    html = markdown.markdown(md_text, extensions=["extra", "nl2br"])
    return html
    # 5. Retornar el texto final
    #return response.text  