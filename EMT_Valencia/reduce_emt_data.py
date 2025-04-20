import json
import math

def process_json(input_file, output_prefix):
    # Read the input JSON file
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Process each dictionary
    processed_data = []
    for item in data:
        new_item = {
            "denominacion": item["denominacion"],
            "lat": item["geo_point_2d"]["lat"],
            "lon": item["geo_point_2d"]["lon"],
            "proximas_llegadas": item["proximas_llegadas"],
            "suprimida": item["suprimida"]
        }
        processed_data.append(new_item)
    
    # Calculate number of items per file
    total_items = len(processed_data)
    items_per_file = math.ceil(total_items / 10)
    
    # Distribute across 10 files
    for i in range(10):
        start_idx = i * items_per_file
        end_idx = min((i + 1) * items_per_file, total_items)
        
        # Skip if no items for this file
        if start_idx >= total_items:
            break
            
        # Write chunk to file
        output_file = f"{output_prefix}_{i+1}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(processed_data[start_idx:end_idx], f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    input_file = "emt.json"  # Replace with your input file path
    output_prefix = "emt"   # Prefix for output files (will be emt_1.json, emt_2.json, etc.)
    process_json(input_file, output_prefix)