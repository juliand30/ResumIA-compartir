# app.py
import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from backend2 import transcribir_y_procesar

app = Flask(__name__)
CORS(app)  # Permite que tu frontend local se conecte sin problemas

@app.route("/api/transcribir", methods=["POST"])
def procesar_audio():
    """
    Recibe un archivo de audio del frontend, lo guarda temporalmente,
    ejecuta la lógica de transcripción y devuelve el resultado.
    """
    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "El archivo no tiene nombre"}), 400

    try:
        # Guarda el archivo temporalmente
        temp_path = os.path.join("temp_" + file.filename)
        file.save(temp_path)

        # Llama a la función de tu script
        resultado = transcribir_y_procesar(temp_path)

        # Elimina el archivo temporal
        os.remove(temp_path)

        # Devuelve el resultado como HTML seguro
        return Response(resultado, mimetype="text/html") 
    
        #return jsonify({"resultado": resultado}) 
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)