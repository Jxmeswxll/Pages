import csv
import re
import json

# --- Maintainable Hardware Tier Data ---
# This section can be easily updated with new hardware releases.
GPU_TIERS = {
    # Tier 10 (Top Tier)
    "5090": 10, "6000 ada": 10, "7965wx": 10, "7960x": 10,
    # Tier 9
    "5080": 9, "4000 ada": 9, "4090": 9,
    # Tier 8 (High-End)
    "5070 ti": 8, "4070 ti": 8,
    # Tier 7
    "5070": 7, "4070": 7,
    # Tier 6 (Mid-Range)
    "5060 ti": 6, "4060 ti": 6,
    # Tier 5
    "5060": 5, "4060": 5, "9060xt": 5,
    # Tier 4 (Entry-Level)
    "3050": 4, "4050": 4, "780m": 4, # As per user feedback
    # Tier 2 (Integrated)
    "760m": 2, "arc": 2, "integrated": 2,
}

CPU_TIERS = {
    # Tier 10 (Top Tier)
    "threadripper": 10, "7965wx": 10, "7960x": 10,
    # Tier 9
    "9950x": 9, "ultra 9 285k": 9, "ultra 9 275hx": 9,
    # Tier 8
    "9800x3d": 8, "7800x3d": 8,
    # Tier 7 (High-End)
    "9700x": 7, "ultra 7 265k": 7, "14900hx": 7,
    # Tier 6
    "7700": 6, "8940hx": 6, "14600kf": 6,
    # Tier 5 (Mid-Range)
    "7600": 5, "7500f": 5, "8845hs": 5, "ultra 5 245k": 5,
    # Tier 4
    "7400f": 4, "8600g": 4,
    # Tier 3 (Entry-Level)
    "7530u": 3, "13620h": 3,
}

def get_tier(name, tiers, default_tier=3):
    if not name:
        return 0
    name_lower = name.lower()
    for key, tier in tiers.items():
        if key in name_lower:
            return tier
    return default_tier

def get_gpu_tier(gpu_name):
    return get_tier(gpu_name, GPU_TIERS)

def get_cpu_tier(cpu_name):
    return get_tier(cpu_name, CPU_TIERS)

def get_form_factor(row):
    return row.get('TYPE', 'Desktop')

def calculate_scores(row):
    scores = {}
    gpu_tier = get_gpu_tier(row.get('GPU'))
    cpu_tier = get_cpu_tier(row.get('CPU'))
    
    try:
        ram_gb = int(re.search(r'(\d+)GB', row.get('RAM', '16GB')).group(1))
    except (AttributeError, ValueError):
        ram_gb = 16 # Default RAM if parsing fails

    is_laptop = get_form_factor(row) == 'Laptop'
    gpu_debuff = 0.85 if is_laptop else 1

    # Resolution Scores
    scores['score_res_1080p'] = min(10, int(gpu_tier * 1.2 * gpu_debuff))
    scores['score_res_1440p'] = min(10, int(gpu_tier * 1.0 * gpu_debuff))
    scores['score_res_1440p_heavy'] = min(10, int(gpu_tier * 0.8 * gpu_debuff))
    scores['score_res_4k_light'] = min(10, int(gpu_tier * 0.7 * gpu_debuff))
    scores['score_res_4k_heavy'] = min(10, int(gpu_tier * 0.6 * gpu_debuff)) if gpu_tier >= 8 else max(1, int(gpu_tier * 0.5 * gpu_debuff))

    # Game Scores
    scores['score_game_fortnite'] = min(10, int((gpu_tier * 0.7 + cpu_tier * 0.3) * 1.1))
    scores['score_game_gta_v'] = min(10, int((gpu_tier * 0.6 + cpu_tier * 0.4) * 1.0))
    scores['score_game_cod'] = min(10, int((gpu_tier * 0.8 + cpu_tier * 0.2) * 1.1))
    scores['score_game_diablo'] = min(10, int((gpu_tier * 0.8 + cpu_tier * 0.2) * 1.0))
    scores['score_game_starfield'] = min(10, int((gpu_tier * 0.5 + cpu_tier * 0.5) * 1.0))
    scores['score_game_league'] = min(10, int((gpu_tier * 0.4 + cpu_tier * 0.6) * 1.2))
    scores['score_game_sim_racing'] = min(10, int((gpu_tier * 0.6 + cpu_tier * 0.4) * 1.1))
    scores['score_game_flight_sim'] = min(10, int((gpu_tier * 0.4 + cpu_tier * 0.6) * 1.0))
    scores['score_game_cyberpunk'] = min(10, int((gpu_tier * 0.9 + cpu_tier * 0.1) * 1.0))
    scores['score_game_apex'] = min(10, int((gpu_tier * 0.7 + cpu_tier * 0.3) * 1.2))
    scores['score_game_valorant'] = min(10, int((gpu_tier * 0.5 + cpu_tier * 0.5) * 1.3))
    scores['score_game_bg3'] = min(10, int((gpu_tier * 0.6 + cpu_tier * 0.4) * 1.0))

    # Work Scores
    ram_score_work = 10 if ram_gb >= 64 else (8 if ram_gb >= 32 else 6)
    scores['score_work_documents'] = min(10, int(cpu_tier * 0.5 + ram_score_work * 0.5))
    scores['score_work_creative'] = min(10, int(gpu_tier * 0.4 + cpu_tier * 0.4 + ram_score_work * 0.2))
    scores['score_work_coding'] = min(10, int(cpu_tier * 0.7 + ram_score_work * 0.3))
    scores['score_work_3d'] = min(10, int(gpu_tier * 0.5 + cpu_tier * 0.5))

    # Study Scores
    ram_score_study = 10 if ram_gb >= 32 else (8 if ram_gb >= 16 else 6)
    scores['score_study_assignments'] = min(10, int(cpu_tier * 0.5 + ram_score_study * 0.5))
    scores['score_study_online_classes'] = 10
    scores['score_study_creative_software'] = min(10, int(gpu_tier * 0.4 + cpu_tier * 0.4 + ram_score_study * 0.2))
    scores['score_study_stem'] = min(10, int(cpu_tier * 0.6 + ram_score_study * 0.4))

    # Essentials Scores
    scores['score_essentials_browsing'] = 10
    scores['score_essentials_streaming'] = 10
    scores['score_essentials_office_apps'] = 10
    scores['score_essentials_light_gaming'] = min(10, int(gpu_tier * 1.5))

    # Clamp scores to be within 1-10
    for key, value in scores.items():
        scores[key] = max(1, min(10, value))
        
    return scores

def get_persona_tags(row, scores):
    tags = set()
    gpu_tier = get_gpu_tier(row.get('GPU'))
    
    try:
        price = int(row.get('PRICE', 0))
    except (ValueError, TypeError):
        price = 0

    if scores['score_res_4k_heavy'] >= 7:
        tags.add("Ultimate Gamer")
        tags.add("4K Gamer")
    elif scores['score_res_1440p_heavy'] >= 7:
        tags.add("1440p Gamer")
    
    if scores['score_work_3d'] >= 8 or scores['score_work_creative'] >= 8:
        tags.add("Creative Professional")
        tags.add("Content Creator")

    if scores['score_work_coding'] >= 7:
        tags.add("Software Developer")
    
    if scores['score_study_stem'] >= 7:
        tags.add("Engineering Student")

    if price < 1500:
        tags.add("Budget-Conscious")
        tags.add("Student")

    if scores['score_essentials_light_gaming'] >= 5 and gpu_tier <= 5:
        tags.add("Light Gamer")

    if scores['score_work_documents'] >= 7:
        tags.add("Home Office")
        
    if not tags:
        if gpu_tier > 5:
            tags.add("1440p Gamer")
        else:
            tags.add("Light Gamer")

    return list(tags)[:4]

def get_style_tags(row):
    tags = set()
    title = row.get('TITLE', '').lower()
    case = row.get('CASE', '').lower()
    
    if 'white' in title or 'white' in case or 'ice' in title:
        tags.add("White Build")
    if 'rgb' in row.get('RAM', '').lower() or 'rgb' in case:
        tags.add("RGB Showcase")
    if 'minimalist' in title or 'hush' in title or 'north' in case:
        tags.add("Minimalist")
    if get_form_factor(row) == 'Laptop' and ('14r' in title or 'lunar' in title):
        tags.add("Ultraportable")
    if 'mini' in case or 'nuc' in title or 'sff' in case or 'a3' in case:
        tags.add("Compact")
    if 'pro' in title or 'elite' in title or 'master' in title:
        tags.add("Premium Aesthetic")
    if 'flow' in case or 'mesh' in case:
        tags.add("High Airflow")
    if 'workstation' in row.get('CATEGORY', '').lower() or 'creator' in title:
        tags.add("Workstation Style")
        
    if not tags:
        tags.add("Minimalist")
        
    return list(tags)[:3]

def get_strengths(row, scores):
    strengths = set()
    try:
        price = int(row.get('PRICE', 9999))
    except (ValueError, TypeError):
        price = 9999

    if scores['score_res_4k_heavy'] >= 8:
        strengths.add("top-tier-gaming")
    if scores['score_res_1440p'] >= 8:
        strengths.add("excellent-1440p-performance")
    if scores['score_res_4k_light'] >= 7:
        strengths.add("4k-capable")
    if get_gpu_tier(row.get('GPU')) >= 9 and get_cpu_tier(row.get('CPU')) >= 9:
        strengths.add("future-proof-specs")
    if price < 1600:
        strengths.add("budget-friendly")
    if scores['score_work_creative'] >= 8:
        strengths.add("best-for-creative-workflows")
    if 'mini' in row.get('CASE', '').lower() or 'nuc' in row.get('TITLE', '').lower():
        strengths.add("compact-form-factor")
    if 'hush' in row.get('TITLE', '').lower() or 'silent' in row.get('CASE', '').lower():
        strengths.add("quiet-operation")
    if get_form_factor(row) == 'Laptop' and ('14r' in row.get('TITLE', '').lower() or 'lunar' in row.get('TITLE', '').lower()):
        strengths.add("ultraportable-laptop")
    if scores['score_essentials_light_gaming'] >= 5 and get_gpu_tier(row.get('GPU')) <= 4:
        strengths.add("light-gaming-ready")
        
    if not strengths:
        strengths.add("excellent-1440p-performance")

    return list(strengths)[:5]

def get_target_resolution(scores):
    resolutions = []
    if scores['score_res_1080p'] >= 7:
        resolutions.append("1080p")
    if scores['score_res_1440p'] >= 7:
        resolutions.append("1440p")
    if scores['score_res_4k_heavy'] >= 7:
        resolutions.append("4K")
    return resolutions

def enrich_row(row):
    enriched_data = {}
    scores = calculate_scores(row)
    
    enriched_data['form_factor'] = get_form_factor(row)
    enriched_data['persona_tags'] = get_persona_tags(row, scores)
    enriched_data['style_tags'] = get_style_tags(row)
    enriched_data['strengths'] = get_strengths(row, scores)
    enriched_data['target_resolution'] = get_target_resolution(scores)
    
    enriched_data.update(scores)
    
    return enriched_data

def main():
    input_filename = '../../../../../../Downloads/RTS_Live_Inventory_Template - QuizFinal (1).csv'
    output_filename = 'script_generated_enrichment.csv'
    
    try:
        with open(input_filename, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            original_headers = reader.fieldnames
            data = list(reader)
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_filename}")
        return

    enriched_data_list = []
    for row in data:
        if any(key is None for key in row):
            print(f"Skipping malformed row: {row}")
            continue
        
        enriched_values = enrich_row(row)
        
        for key, value in enriched_values.items():
            if isinstance(value, list):
                enriched_values[key] = json.dumps(value)

        row.update(enriched_values)
        enriched_data_list.append(row)

    if not enriched_data_list:
        print("No data was processed.")
        return

    enrichment_headers = list(enriched_data_list[0].keys() - original_headers)
    final_headers = original_headers + enrichment_headers
    
    seen = set()
    unique_headers = [h for h in final_headers if not (h in seen or seen.add(h))]

    with open(output_filename, mode='w', newline='', encoding='utf-8') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=unique_headers)
        writer.writeheader()
        writer.writerows(enriched_data_list)
        
    print(f"Enriched data for {len(enriched_data_list)} products saved to {output_filename}")

if __name__ == '__main__':
    main()
