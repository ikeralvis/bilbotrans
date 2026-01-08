
import json
import csv
import os

gtfs_path = r'd:\Iker\Proyectos_GitHub\bilbotrans\src\data\data-prueba\gtfs_bilbobus_barrios_altitud_CORREGIDO'
output_file = r'd:\Iker\Proyectos_GitHub\bilbotrans\src\data\bilbobus-data.json'

# 1. Load stops.txt (map internal stop_id to stop_code and details)
print("Loading stops...")
stop_id_to_data = {}
all_stops = {}
with open(os.path.join(gtfs_path, 'stops.txt'), mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        stop_data = {
            "id": row['stop_code'],
            "name": row['stop_name'],
            "lat": float(row['stop_lat']),
            "lon": float(row['stop_lon']),
            "lines": []
        }
        stop_id_to_data[row['stop_id']] = stop_data
        all_stops[row['stop_code']] = stop_data

# 2. Load routes.txt (map route_id to line_id and name)
print("Loading routes...")
route_id_to_data = {}
with open(os.path.join(gtfs_path, 'routes.txt'), mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        route_id_to_data[row['route_id']] = {
            "id": row['route_short_name'],
            "name": row['route_long_name'],
            "stops": set()
        }

# 3. Load trips.txt (link trip_id to route_id)
print("Loading trips...")
trip_id_to_route_id = {}
with open(os.path.join(gtfs_path, 'trips.txt'), mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trip_id_to_route_id[row['trip_id']] = row['route_id']

# 4. Load stop_times.txt (link stops to routes)
print("Processing stop_times (this may take a while)...")
with open(os.path.join(gtfs_path, 'stop_times.txt'), mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        trip_id = row['trip_id']
        stop_id = row['stop_id']
        
        if trip_id in trip_id_to_route_id:
            route_id = trip_id_to_route_id[trip_id]
            if route_id in route_id_to_data and stop_id in stop_id_to_data:
                line_id = route_id_to_data[route_id]['id']
                stop_code = stop_id_to_data[stop_id]['id']
                
                route_id_to_data[route_id]['stops'].add(stop_code)
                if line_id not in all_stops[stop_code]['lines']:
                    all_stops[stop_code]['lines'].append(line_id)

# 5. Clean up and structure
print("Structuring final data...")
final_lines = {}
for r_id, data in route_id_to_data.items():
    line_id = data['id']
    if line_id not in final_lines:
        final_lines[line_id] = {
            "id": line_id,
            "name": data['name'],
            "stops": sorted(list(data['stops'])) # Set converted to sorted list for unique stops
        }
    else:
        # Merge stops if multiple route_ids map to same line_id (IDA/VUELTA sometimes)
        final_lines[line_id]['stops'] = sorted(list(set(final_lines[line_id]['stops']) | data['stops']))

result = {
    "lines": final_lines,
    "stops": all_stops
}

print(f"Stops processed: {len(all_stops)}")
print(f"Lines processed: {len(final_lines)}")

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print("Done!")
