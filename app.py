# server.py
import os
import sys
import json
import uuid
from flask import Flask, request, send_from_directory

app = Flask(__name__)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9999
DATABASE_FILE = 'database.json'
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = os.path.abspath(os.path.dirname(__file__))

if not os.path.exists(DATABASE_FILE):
    with open(DATABASE_FILE, 'w') as db_file:
        json.dump({"entries": []}, db_file)

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload', methods=['POST'])
def upload():
    data = request.form.to_dict()
    pdf_file = request.files['file']
    file_uuid = str(uuid.uuid4())
    file_name = f"{file_uuid}.pdf"
    pdf_file.save(os.path.join(UPLOAD_FOLDER, file_name))
    entry = {**data, "file_name": file_name, "file_uuid": file_uuid}

    with open(DATABASE_FILE, 'r+') as db_file:
        db_data = json.load(db_file)
        db_data["entries"].append(entry)
        db_file.seek(0)
        json.dump(db_data, db_file)

    return entry, 201

@app.route('/entries', methods=['GET'])
def get_entries():
    entries = []
    server_url = request.host_url.rstrip('/')
    with open(DATABASE_FILE, 'r') as db_file:
        db_data = json.load(db_file)
        for entry in db_data["entries"]:
            file_uuid = entry["file_uuid"]
            entry["file_url"] = f"{server_url}/file/{file_uuid}"
            entries.append(entry)
    return entries, 200

@app.route('/file/<uuid>', methods=['GET'])
def get_file(uuid):
    return send_from_directory(UPLOAD_FOLDER, f"{uuid}.pdf")

@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    allowed_extensions = {'html', 'js', 'css', 'jpg', 'jpeg', 'png', 'gif', 'svg','map'}
    if '.' in path and path.rsplit('.', 1)[1].lower() in allowed_extensions:
        return send_from_directory(STATIC_FOLDER, path)
    else:
        return "File not found", 404

if __name__ == '__main__':
    app.run(port=PORT,debug=True)
