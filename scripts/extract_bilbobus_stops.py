
import json
import os

input_file = r'd:\Iker\Proyectos_GitHub\bilbotrans\arin-main\arin-main\paradas_api.json'
output_file = r'd:\Iker\Proyectos_GitHub\bilbotrans\src\data\bilbobus-stops.json'

if not os.path.exists(input_file):
    print(f"Error: {input_file} not found")
    exit(1)

print(f"Reading {input_file}...")
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Filtering stops for Bilbao (MUNICIPIO: 020)...")
# We filter by MUNICIPIO 020 (Bilbao)
# We also want to make sure it's a bus stop. In this dataset, most are.
bilbao_stops = [
    {
        "PROVINCIA": stop.get("PROVINCIA"),
        "DESCRIPCION_PROVINCIA": stop.get("DESCRIPCION_PROVINCIA"),
        "MUNICIPIO": stop.get("MUNICIPIO"),
        "DESCRIPCION_MUNICIPIO": stop.get("DESCRIPCION_MUNICIPIO"),
        "PARADA": stop.get("PARADA"),
        "DENOMINACION": stop.get("DENOMINACION"),
        "DIRECCION": stop.get("DIRECCION"),
        "COORDX": stop.get("COORDX"),
        "COORDY": stop.get("COORDY"),
        "LATITUD": stop.get("LATITUD"),
        "LONGITUD": stop.get("LONGITUD")
    }
    for stop in data if stop.get("MUNICIPIO") == "020"
]

print(f"Found {len(bilbao_stops)} stops.")

print(f"Writing to {output_file}...")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(bilbao_stops, f, indent=4, ensure_ascii=False)

print("Done!")
