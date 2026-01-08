
import json
import csv
import os

gtfs_path = r'd:\Iker\Proyectos_GitHub\bilbotrans\src\data\data-prueba\gtfs_bilbobus_barrios_altitud_CORREGIDO'
output_stops = r'd:\Iker\Proyectos_GitHub\bilbotrans\src\data\bilbobus-stops.json'
output_routes = r'd:\Iker\Proyectos_GitHub\bilbotrans\src\data\bilbobus-routes.json'

# Convert stops.txt
print("Processing stops.txt...")
stops = []
with open(os.path.join(gtfs_path, 'stops.txt'), mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        stops.append({
            "PROVINCIA": "48",
            "DESCRIPCION_PROVINCIA": "BIZKAIA",
            "MUNICIPIO": "020",
            "DESCRIPCION_MUNICIPIO": "BILBAO",
            "PARADA": row['stop_code'],
            "DENOMINACION": row['stop_name'],
            "DIRECCION": row.get('stop_desc', ''),
            "LATITUD": row['stop_lat'],
            "LONGITUD": row['stop_lon']
        })

print(f"Total stops: {len(stops)}")
with open(output_stops, 'w', encoding='utf-8') as f:
    json.dump(stops, f, indent=4, ensure_ascii=False)

# Convert routes.txt
print("Processing routes.txt...")
routes = []
with open(os.path.join(gtfs_path, 'routes.txt'), mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        routes.append({
            "lineId": row['route_short_name'],
            "name": row['route_long_name'],
            "url": row.get('route_url', '')
        })

print(f"Total routes: {len(routes)}")
with open(output_routes, 'w', encoding='utf-8') as f:
    json.dump(routes, f, indent=4, ensure_ascii=False)

print("Done!")
