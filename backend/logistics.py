import datetime
from datetime import timezone
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from dotenv import load_dotenv
from fastapi import HTTPException, status
import httpx

from schemas import (
    CityDTO,
    ProvinceDTO,
    ShipmentTrackingResponse,
    ShippingRateResponse,
    ShippingServiceOptionDTO,
    TrackingManifestItemDTO,
)

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

RAJAONGKIR_API_KEY = os.getenv("RAJAONGKIR_API_KEY", "").strip()
STORE_ORIGIN_CITY_ID = os.getenv("STORE_ORIGIN_CITY_ID", "152").strip()  # Jakarta Pusat

# ============================================================================
# 1. Direktori Wilayah & Data Tarif Geografis Indonesia (Built-in Fallback)
# ============================================================================

BUILTIN_PROVINCES: List[Dict[str, str]] = [
    {"province_id": "1", "province_name": "Bali"},
    {"province_id": "2", "province_name": "Bangka Belitung"},
    {"province_id": "3", "province_name": "Banten"},
    {"province_id": "4", "province_name": "Bengkulu"},
    {"province_id": "5", "province_name": "DI Yogyakarta"},
    {"province_id": "6", "province_name": "DKI Jakarta"},
    {"province_id": "7", "province_name": "Gorontalo"},
    {"province_id": "8", "province_name": "Jambi"},
    {"province_id": "9", "province_name": "Jawa Barat"},
    {"province_id": "10", "province_name": "Jawa Tengah"},
    {"province_id": "11", "province_name": "Jawa Timur"},
    {"province_id": "12", "province_name": "Kalimantan Barat"},
    {"province_id": "13", "province_name": "Kalimantan Selatan"},
    {"province_id": "14", "province_name": "Kalimantan Tengah"},
    {"province_id": "15", "province_name": "Kalimantan Timur"},
    {"province_id": "16", "province_name": "Lampung"},
    {"province_id": "17", "province_name": "Riau"},
    {"province_id": "18", "province_name": "Sulawesi Selatan"},
    {"province_id": "19", "province_name": "Sumatera Barat"},
    {"province_id": "20", "province_name": "Sumatera Selatan"},
    {"province_id": "21", "province_name": "Sumatera Utara"},
]

# Daftar Kota/Kabupaten Populer di Indonesia dengan Tarif Dasar Reguler dari Jakarta Pusat (IDR / Kg)
BUILTIN_CITIES: List[Dict[str, Any]] = [
    # DKI Jakarta
    {"city_id": "151", "province_id": "6", "province_name": "DKI Jakarta", "city_name": "Jakarta Barat", "type": "Kota", "postal_code": "11220", "base_rate": 10000, "base_etd": 1},
    {"city_id": "152", "province_id": "6", "province_name": "DKI Jakarta", "city_name": "Jakarta Pusat", "type": "Kota", "postal_code": "10110", "base_rate": 10000, "base_etd": 1},
    {"city_id": "153", "province_id": "6", "province_name": "DKI Jakarta", "city_name": "Jakarta Selatan", "type": "Kota", "postal_code": "12120", "base_rate": 10000, "base_etd": 1},
    {"city_id": "154", "province_id": "6", "province_name": "DKI Jakarta", "city_name": "Jakarta Timur", "type": "Kota", "postal_code": "13330", "base_rate": 10000, "base_etd": 1},
    {"city_id": "155", "province_id": "6", "province_name": "DKI Jakarta", "city_name": "Jakarta Utara", "type": "Kota", "postal_code": "14140", "base_rate": 10000, "base_etd": 1},

    # Banten & Bodetabek
    {"city_id": "456", "province_id": "3", "province_name": "Banten", "city_name": "Tangerang", "type": "Kota", "postal_code": "15111", "base_rate": 11000, "base_etd": 1},
    {"city_id": "457", "province_id": "3", "province_name": "Banten", "city_name": "Tangerang Selatan", "type": "Kota", "postal_code": "15310", "base_rate": 11000, "base_etd": 1},
    {"city_id": "106", "province_id": "3", "province_name": "Banten", "city_name": "Cilegon", "type": "Kota", "postal_code": "42417", "base_rate": 13000, "base_etd": 2},
    {"city_id": "403", "province_id": "3", "province_name": "Banten", "city_name": "Serang", "type": "Kota", "postal_code": "42111", "base_rate": 13000, "base_etd": 2},
    {"city_id": "78", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Bogor", "type": "Kota", "postal_code": "16111", "base_rate": 11000, "base_etd": 1},
    {"city_id": "79", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Bogor", "type": "Kabupaten", "postal_code": "16911", "base_rate": 12000, "base_etd": 2},
    {"city_id": "115", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Depok", "type": "Kota", "postal_code": "16411", "base_rate": 10500, "base_etd": 1},
    {"city_id": "54", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Bekasi", "type": "Kota", "postal_code": "17111", "base_rate": 11000, "base_etd": 1},
    {"city_id": "55", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Bekasi", "type": "Kabupaten", "postal_code": "17530", "base_rate": 12000, "base_etd": 2},

    # Jawa Barat
    {"city_id": "22", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Bandung", "type": "Kota", "postal_code": "40111", "base_rate": 14000, "base_etd": 2},
    {"city_id": "23", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Bandung", "type": "Kabupaten", "postal_code": "40311", "base_rate": 15000, "base_etd": 2},
    {"city_id": "108", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Cirebon", "type": "Kota", "postal_code": "45111", "base_rate": 14000, "base_etd": 2},
    {"city_id": "430", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Sukabumi", "type": "Kota", "postal_code": "43111", "base_rate": 13000, "base_etd": 2},
    {"city_id": "468", "province_id": "9", "province_name": "Jawa Barat", "city_name": "Tasikmalaya", "type": "Kota", "postal_code": "46111", "base_rate": 15000, "base_etd": 2},

    # Jawa Tengah & DI Yogyakarta
    {"city_id": "398", "province_id": "10", "province_name": "Jawa Tengah", "city_name": "Semarang", "type": "Kota", "postal_code": "50111", "base_rate": 18000, "base_etd": 2},
    {"city_id": "427", "province_id": "10", "province_name": "Jawa Tengah", "city_name": "Surakarta (Solo)", "type": "Kota", "postal_code": "57111", "base_rate": 18000, "base_etd": 2},
    {"city_id": "249", "province_id": "10", "province_name": "Jawa Tengah", "city_name": "Magelang", "type": "Kota", "postal_code": "56111", "base_rate": 18000, "base_etd": 2},
    {"city_id": "469", "province_id": "10", "province_name": "Jawa Tengah", "city_name": "Tegal", "type": "Kota", "postal_code": "52111", "base_rate": 16000, "base_etd": 2},
    {"city_id": "344", "province_id": "10", "province_name": "Jawa Tengah", "city_name": "Pekalongan", "type": "Kota", "postal_code": "51111", "base_rate": 17000, "base_etd": 2},
    {"city_id": "501", "province_id": "5", "province_name": "DI Yogyakarta", "city_name": "Yogyakarta", "type": "Kota", "postal_code": "55111", "base_rate": 18000, "base_etd": 2},
    {"city_id": "419", "province_id": "5", "province_name": "DI Yogyakarta", "city_name": "Sleman", "type": "Kabupaten", "postal_code": "55511", "base_rate": 18000, "base_etd": 2},
    {"city_id": "39", "province_id": "5", "province_name": "DI Yogyakarta", "city_name": "Bantul", "type": "Kabupaten", "postal_code": "55711", "base_rate": 18000, "base_etd": 2},

    # Jawa Timur & Bali
    {"city_id": "444", "province_id": "11", "province_name": "Jawa Timur", "city_name": "Surabaya", "type": "Kota", "postal_code": "60111", "base_rate": 22000, "base_etd": 2},
    {"city_id": "255", "province_id": "11", "province_name": "Jawa Timur", "city_name": "Malang", "type": "Kota", "postal_code": "65111", "base_rate": 22000, "base_etd": 2},
    {"city_id": "409", "province_id": "11", "province_name": "Jawa Timur", "city_name": "Sidoarjo", "type": "Kabupaten", "postal_code": "61211", "base_rate": 22000, "base_etd": 2},
    {"city_id": "133", "province_id": "11", "province_name": "Jawa Timur", "city_name": "Gresik", "type": "Kabupaten", "postal_code": "61111", "base_rate": 22000, "base_etd": 2},
    {"city_id": "178", "province_id": "11", "province_name": "Jawa Timur", "city_name": "Kediri", "type": "Kota", "postal_code": "64111", "base_rate": 23000, "base_etd": 2},
    {"city_id": "162", "province_id": "11", "province_name": "Jawa Timur", "city_name": "Jember", "type": "Kabupaten", "postal_code": "68111", "base_rate": 25000, "base_etd": 3},
    {"city_id": "114", "province_id": "1", "province_name": "Bali", "city_name": "Denpasar", "type": "Kota", "postal_code": "80111", "base_rate": 28000, "base_etd": 2},
    {"city_id": "17", "province_id": "1", "province_name": "Bali", "city_name": "Badung", "type": "Kabupaten", "postal_code": "80351", "base_rate": 28000, "base_etd": 2},

    # Sumatera
    {"city_id": "278", "province_id": "21", "province_name": "Sumatera Utara", "city_name": "Medan", "type": "Kota", "postal_code": "20111", "base_rate": 36000, "base_etd": 3},
    {"city_id": "112", "province_id": "21", "province_name": "Sumatera Utara", "city_name": "Deli Serdang", "type": "Kabupaten", "postal_code": "20511", "base_rate": 38000, "base_etd": 3},
    {"city_id": "327", "province_id": "20", "province_name": "Sumatera Selatan", "city_name": "Palembang", "type": "Kota", "postal_code": "30111", "base_rate": 26000, "base_etd": 2},
    {"city_id": "350", "province_id": "17", "province_name": "Riau", "city_name": "Pekanbaru", "type": "Kota", "postal_code": "28111", "base_rate": 32000, "base_etd": 3},
    {"city_id": "48", "province_id": "17", "province_name": "Riau", "city_name": "Batam", "type": "Kota", "postal_code": "29411", "base_rate": 30000, "base_etd": 2},
    {"city_id": "318", "province_id": "19", "province_name": "Sumatera Barat", "city_name": "Padang", "type": "Kota", "postal_code": "25111", "base_rate": 32000, "base_etd": 3},
    {"city_id": "21", "province_id": "16", "province_name": "Lampung", "city_name": "Bandar Lampung", "type": "Kota", "postal_code": "35111", "base_rate": 20000, "base_etd": 2},

    # Kalimantan & Sulawesi
    {"city_id": "19", "province_id": "15", "province_name": "Kalimantan Timur", "city_name": "Balikpapan", "type": "Kota", "postal_code": "76111", "base_rate": 42000, "base_etd": 3},
    {"city_id": "389", "province_id": "15", "province_name": "Kalimantan Timur", "city_name": "Samarinda", "type": "Kota", "postal_code": "75111", "base_rate": 44000, "base_etd": 3},
    {"city_id": "30", "province_id": "13", "province_name": "Kalimantan Selatan", "city_name": "Banjarmasin", "type": "Kota", "postal_code": "70111", "base_rate": 38000, "base_etd": 3},
    {"city_id": "365", "province_id": "12", "province_name": "Kalimantan Barat", "city_name": "Pontianak", "type": "Kota", "postal_code": "78111", "base_rate": 36000, "base_etd": 3},
    {"city_id": "254", "province_id": "18", "province_name": "Sulawesi Selatan", "city_name": "Makassar", "type": "Kota", "postal_code": "90111", "base_rate": 42000, "base_etd": 3},
    {"city_id": "265", "province_id": "18", "province_name": "Sulawesi Selatan", "city_name": "Manado", "type": "Kota", "postal_code": "95111", "base_rate": 48000, "base_etd": 4},
    {"city_id": "273", "province_id": "1", "province_name": "Nusa Tenggara Barat", "city_name": "Mataram", "type": "Kota", "postal_code": "83111", "base_rate": 32000, "base_etd": 3},
]

# Quick index by city_id
CITIES_BY_ID: Dict[str, Dict[str, Any]] = {c["city_id"]: c for c in BUILTIN_CITIES}

COURIER_META = {
    "jne": {"name": "JNE Express", "official_code": "jne"},
    "jnt": {"name": "J&T Express", "official_code": "jnt"},
    "sicepat": {"name": "SiCepat Ekspres", "official_code": "sicepat"},
    "pos": {"name": "POS Indonesia", "official_code": "pos"},
}


def round_to_nearest_500(amount: float) -> int:
    """Membulatkan nominal biaya pengiriman ke kelipatan Rp 500 terdekat."""
    return int(round(amount / 500.0) * 500)


def get_all_provinces() -> List[ProvinceDTO]:
    """Mengembalikan daftar seluruh provinsi Indonesia yang didukung."""
    return [
        ProvinceDTO(
            province_id=p["province_id"],
            province_name=p["province_name"],
        )
        for p in BUILTIN_PROVINCES
    ]


def get_cities(
    province_id: Optional[str] = None,
    search: Optional[str] = None,
) -> List[CityDTO]:
    """Mengembalikan daftar kota/kabupaten dengan filter opsional province_id atau search nama kota."""
    results = []
    search_clean = search.strip().lower() if search and search.strip() else None

    for c in BUILTIN_CITIES:
        if province_id and c["province_id"] != str(province_id).strip():
            continue
        if search_clean:
            match_city = search_clean in c["city_name"].lower()
            match_type = search_clean in c["type"].lower()
            match_prov = search_clean in c["province_name"].lower()
            if not (match_city or match_type or match_prov):
                continue

        results.append(
            CityDTO(
                city_id=c["city_id"],
                province_id=c["province_id"],
                province_name=c["province_name"],
                city_name=f"{c['type']} {c['city_name']}",
                type=c["type"],
                postal_code=c["postal_code"],
            )
        )
    return results


def find_city_by_id(city_id: str) -> Optional[Dict[str, Any]]:
    """Mencari data internal kota berdasarkan ID atau nama jika format string."""
    clean_id = str(city_id).strip()
    if clean_id in CITIES_BY_ID:
        return CITIES_BY_ID[clean_id]

    # Fallback pencarian fuzzy nama kota jika client mengirim string ID custom
    for c in BUILTIN_CITIES:
        if clean_id.lower() in c["city_name"].lower():
            return c
    return None


# ============================================================================
# 2. Mesin Kalkulasi Tarif Logistik Hibrida (Hybrid Logistics Engine)
# ============================================================================


def calculate_builtin_courier_services(
    city_data: Dict[str, Any],
    courier_code: str,
    chargeable_weight_kg: int,
) -> List[ShippingServiceOptionDTO]:
    """Menghitung tarif layanan kurir secara deterministik berdasarkan zona geografis tujuan."""
    base_rate = float(city_data["base_rate"])
    base_etd = int(city_data["base_etd"])
    courier = courier_code.lower()

    services: List[ShippingServiceOptionDTO] = []

    if courier == "jne":
        # 1. OKE (Ekonomis)
        rate_oke = round_to_nearest_500(base_rate * 0.85)
        services.append(
            ShippingServiceOptionDTO(
                service="OKE",
                description="Ongkos Kirim Ekonomis",
                cost=float(rate_oke * chargeable_weight_kg),
                etd=f"{base_etd + 2}-{base_etd + 3} Hari",
            )
        )
        # 2. REG (Reguler)
        rate_reg = round_to_nearest_500(base_rate * 1.0)
        services.append(
            ShippingServiceOptionDTO(
                service="REG",
                description="Layanan Reguler JNE",
                cost=float(rate_reg * chargeable_weight_kg),
                etd=f"{base_etd}-{base_etd + 1} Hari",
            )
        )
        # 3. YES (Yakin Esok Sampai)
        rate_yes = round_to_nearest_500(base_rate * 1.45)
        services.append(
            ShippingServiceOptionDTO(
                service="YES",
                description="Yakin Esok Sampai",
                cost=float(rate_yes * chargeable_weight_kg),
                etd="1 Hari",
            )
        )

    elif courier == "jnt":
        # 1. ECO (Economy)
        rate_eco = round_to_nearest_500(base_rate * 0.85)
        services.append(
            ShippingServiceOptionDTO(
                service="ECO",
                description="J&T Economy Service",
                cost=float(rate_eco * chargeable_weight_kg),
                etd=f"{base_etd + 2}-{base_etd + 3} Hari",
            )
        )
        # 2. EZ (Reguler)
        rate_ez = round_to_nearest_500(base_rate * 1.0)
        services.append(
            ShippingServiceOptionDTO(
                service="EZ",
                description="J&T Reguler (EZ)",
                cost=float(rate_ez * chargeable_weight_kg),
                etd=f"{base_etd}-{base_etd + 1} Hari",
            )
        )
        # 3. JND (Next Day)
        rate_jnd = round_to_nearest_500(base_rate * 1.4)
        services.append(
            ShippingServiceOptionDTO(
                service="JND",
                description="J&T Next Day Delivery",
                cost=float(rate_jnd * chargeable_weight_kg),
                etd="1 Hari",
            )
        )

    elif courier == "sicepat":
        # 1. HALU (Ekonomis)
        rate_halu = round_to_nearest_500(base_rate * 0.8)
        services.append(
            ShippingServiceOptionDTO(
                service="HALU",
                description="Harga Mulai Lima Ribu (Ekonomis)",
                cost=float(rate_halu * chargeable_weight_kg),
                etd=f"{base_etd + 2}-{base_etd + 3} Hari",
            )
        )
        # 2. REG (Reguler)
        rate_reg = round_to_nearest_500(base_rate * 0.95)
        services.append(
            ShippingServiceOptionDTO(
                service="REG",
                description="Layanan Reguler SiCepat",
                cost=float(rate_reg * chargeable_weight_kg),
                etd=f"{base_etd}-{base_etd + 1} Hari",
            )
        )
        # 3. BEST (Besok Sampai Tujuan)
        rate_best = round_to_nearest_500(base_rate * 1.4)
        services.append(
            ShippingServiceOptionDTO(
                service="BEST",
                description="Besok Sampai Tujuan (Next Day)",
                cost=float(rate_best * chargeable_weight_kg),
                etd="1 Hari",
            )
        )

    elif courier == "pos":
        # 1. POS Reguler
        rate_reg = round_to_nearest_500(base_rate * 0.9)
        services.append(
            ShippingServiceOptionDTO(
                service="POS Reguler",
                description="Pos Indonesia Reguler Nusantara",
                cost=float(rate_reg * chargeable_weight_kg),
                etd=f"{base_etd + 1}-{base_etd + 2} Hari",
            )
        )
        # 2. POS Nextday
        rate_next = round_to_nearest_500(base_rate * 1.35)
        services.append(
            ShippingServiceOptionDTO(
                service="POS Nextday",
                description="Pos Indonesia Next Day Service",
                cost=float(rate_next * chargeable_weight_kg),
                etd="1 Hari",
            )
        )

    return services


async def fetch_rajaongkir_costs(
    destination_city_id: str,
    weight_grams: int,
    courier_code: str,
) -> Optional[List[ShippingServiceOptionDTO]]:
    """Mencoba memanggil API RajaOngkir Starter jika kunci API tersedia."""
    if not RAJAONGKIR_API_KEY:
        return None

    courier_lower = courier_code.lower()
    # RajaOngkir Starter resmi hanya mendukung JNE, POS, TIKI
    if courier_lower not in ("jne", "pos"):
        return None

    url = "https://api.rajaongkir.com/starter/cost"
    headers = {
        "key": RAJAONGKIR_API_KEY,
        "content-type": "application/x-www-form-urlencoded",
    }
    payload = {
        "origin": STORE_ORIGIN_CITY_ID,
        "destination": destination_city_id,
        "weight": max(100, weight_grams),
        "courier": courier_lower,
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, data=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("rajaongkir", {}).get("results", [])
                if results and results[0].get("costs"):
                    options: List[ShippingServiceOptionDTO] = []
                    for c in results[0]["costs"]:
                        svc_name = c.get("service", "").strip()
                        desc = c.get("description", "").strip()
                        cost_details = c.get("cost", [])
                        if cost_details:
                            cost_val = float(cost_details[0].get("value", 0))
                            etd_val = cost_details[0].get("etd", "").strip()
                            if etd_val and not etd_val.lower().endswith("hari"):
                                etd_val = f"{etd_val} Hari"
                            options.append(
                                ShippingServiceOptionDTO(
                                    service=svc_name,
                                    description=desc or f"Layanan {svc_name}",
                                    cost=cost_val,
                                    etd=etd_val or "2-3 Hari",
                                )
                            )
                    if options:
                        return options
    except Exception:
        # Fallback senyap jika API Rajaongkir timeout, kuota habis, atau error
        pass

    return None


async def calculate_shipping_rates(
    destination_city_id: str,
    weight_grams: int,
    courier_code: str,
) -> ShippingRateResponse:
    """Menghitung tarif ongkos kirim multi-kurir secara dinamis dengan proteksi fallback built-in."""
    clean_courier = courier_code.strip().lower()
    if clean_courier not in COURIER_META:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kurir '{courier_code}' tidak didukung. Pilih dari: jne, jnt, sicepat, pos.",
        )

    city_data = find_city_by_id(destination_city_id)
    if not city_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kota tujuan pengiriman dengan ID '{destination_city_id}' tidak ditemukan di direktori wilayah.",
        )

    chargeable_weight_kg = max(1, math.ceil(weight_grams / 1000))
    provider_mode = "BUILTIN_ENGINE"

    # Coba panggil live RajaOngkir API jika API key disetel
    live_services = await fetch_rajaongkir_costs(
        destination_city_id=city_data["city_id"],
        weight_grams=weight_grams,
        courier_code=clean_courier,
    )

    if live_services:
        services = live_services
        provider_mode = "LIVE_RAJAONGKIR"
    else:
        services = calculate_builtin_courier_services(
            city_data=city_data,
            courier_code=clean_courier,
            chargeable_weight_kg=chargeable_weight_kg,
        )

    dest_dto = CityDTO(
        city_id=city_data["city_id"],
        province_id=city_data["province_id"],
        province_name=city_data["province_name"],
        city_name=f"{city_data['type']} {city_data['city_name']}",
        type=city_data["type"],
        postal_code=city_data["postal_code"],
    )

    return ShippingRateResponse(
        origin_city="Kota Jakarta Pusat",
        destination_city=dest_dto,
        weight_grams=weight_grams,
        chargeable_weight_kg=chargeable_weight_kg,
        courier_code=clean_courier,
        courier_name=COURIER_META[clean_courier]["name"],
        services=services,
        provider_mode=provider_mode,
    )


def verify_and_get_service_rate(
    destination_city_id: str,
    weight_grams: int,
    courier_code: str,
    courier_service: str,
) -> Tuple[float, str, CityDTO, str, str]:
    """Memverifikasi tarif pengiriman di sisi server secara tertutup (Zero-Trust Shipping Verification).

    Mengembalikan tuple: (cost, etd, city_dto, courier_name, canonical_service_name).
    """
    clean_courier = courier_code.strip().lower()
    if clean_courier not in COURIER_META:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ekspedisi kurir '{courier_code}' tidak valid.",
        )

    city_data = find_city_by_id(destination_city_id)
    if not city_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kota tujuan ID '{destination_city_id}' tidak valid atau tidak terdaftar.",
        )

    chargeable_weight_kg = max(1, math.ceil(weight_grams / 1000))
    services = calculate_builtin_courier_services(
        city_data=city_data,
        courier_code=clean_courier,
        chargeable_weight_kg=chargeable_weight_kg,
    )

    clean_service = courier_service.strip().upper()
    matched_svc = next(
        (s for s in services if s.service.upper() == clean_service),
        None,
    )

    if not matched_svc:
        # Coba periksa substring
        matched_svc = next(
            (s for s in services if clean_service in s.service.upper() or s.service.upper() in clean_service),
            None,
        )

    if not matched_svc:
        available_str = ", ".join(s.service for s in services)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Layanan pengiriman '{courier_service}' tidak tersedia untuk kurir {COURIER_META[clean_courier]['name']}. "
                f"Layanan yang tersedia: {available_str}."
            ),
        )

    dest_dto = CityDTO(
        city_id=city_data["city_id"],
        province_id=city_data["province_id"],
        province_name=city_data["province_name"],
        city_name=f"{city_data['type']} {city_data['city_name']}",
        type=city_data["type"],
        postal_code=city_data["postal_code"],
    )

    return (
        matched_svc.cost,
        matched_svc.etd,
        dest_dto,
        COURIER_META[clean_courier]["name"],
        matched_svc.service,
    )


# ============================================================================
# 3. Generator Nomor Resi & Manifes Pelacakan Paket (Airwaybill & Manifest)
# ============================================================================


def generate_tracking_number(courier_code: Optional[str]) -> str:
    """Menghasilkan nomor resi alfanumerik unik: AMBA-{COURIER}-{YYYYMMDD}-{6_HEX}."""
    courier_tag = (courier_code or "REG").strip().upper()
    now_str = datetime.datetime.now(timezone.utc).strftime("%Y%m%d")
    import secrets

    random_hex = secrets.token_hex(3).upper()
    return f"AMBA-{courier_tag}-{now_str}-{random_hex}"


def build_tracking_manifest(order: Any) -> List[TrackingManifestItemDTO]:
    """Membangun manifes lini masa pelacakan perjalanan paket secara kronologis

    berdasarkan status pesanan, stempel waktu, kota asal, dan kota tujuan.
    """
    manifest: List[TrackingManifestItemDTO] = []
    created_at: datetime.datetime = order.created_at or datetime.datetime.now(timezone.utc)
    shipped_at: Optional[datetime.datetime] = getattr(order, "shipped_at", None)
    completed_at: Optional[datetime.datetime] = getattr(order, "completed_at", None)
    tracking_number = getattr(order, "tracking_number", None) or "Dalam Penerbitan Resi"
    courier_name = getattr(order, "courier_code", "Kurir").upper() if getattr(order, "courier_code", None) else "Kurir"
    courier_service = getattr(order, "courier_service", "Reguler") or "Reguler"
    dest_city = getattr(order, "shipping_city_name", None) or "Kota Tujuan"

    order_status = (order.status or "").strip().upper()

    # 1. Event Pesanan Dibuat
    manifest.append(
        TrackingManifestItemDTO(
            timestamp=created_at.strftime("%d %b %Y, %H:%M WIB"),
            status_title="Pesanan Dibuat",
            description=f"Pesanan berhasil dibuat oleh pelanggan dan tercatat di sistem Amba Shop.",
            city="Jakarta Pusat",
            is_current=order_status == "PENDING",
        )
    )

    if order_status == "CANCELLED":
        manifest.append(
            TrackingManifestItemDTO(
                timestamp=created_at.strftime("%d %b %Y, %H:%M WIB"),
                status_title="Pesanan Dibatalkan",
                description="Pesanan telah dibatalkan dan alokasi stok produk telah dikembalikan.",
                city="Jakarta Pusat",
                is_current=True,
            )
        )
        return manifest

    # 2. Event Pembayaran Terverifikasi (untuk status PAID, SHIPPED, COMPLETED)
    if order_status in ("PAID", "SHIPPED", "COMPLETED"):
        paid_time = created_at + datetime.timedelta(minutes=5)
        manifest.append(
            TrackingManifestItemDTO(
                timestamp=paid_time.strftime("%d %b %Y, %H:%M WIB"),
                status_title="Pembayaran Berhasil Diverifikasi",
                description="Pembayaran telah terverifikasi secara otomatis melalui Midtrans Payment Gateway.",
                city="Jakarta Pusat",
                is_current=order_status == "PAID",
            )
        )

        # Event Pengemasan Gudang
        prep_time = paid_time + datetime.timedelta(minutes=25)
        manifest.append(
            TrackingManifestItemDTO(
                timestamp=prep_time.strftime("%d %b %Y, %H:%M WIB"),
                status_title="Pengemasan Barang di Gudang",
                description=f"Item pesanan sedang diperiksa kualitasnya dan dikemas rapi di Warehouse Amba Shop Jakarta Pusat.",
                city="Jakarta Pusat",
                is_current=False,
            )
        )

    # 3. Event Pengiriman / Resi Terbit (untuk status SHIPPED, COMPLETED)
    if order_status in ("SHIPPED", "COMPLETED"):
        ship_time = shipped_at or (created_at + datetime.timedelta(hours=4))
        manifest.append(
            TrackingManifestItemDTO(
                timestamp=ship_time.strftime("%d %b %Y, %H:%M WIB"),
                status_title=f"Paket Diserahkan ke {courier_name}",
                description=f"Paket telah diserahkan ke kurir {courier_name} ({courier_service}) dengan No. Resi: {tracking_number}.",
                city="Jakarta Pusat",
                is_current=False,
            )
        )

        in_transit_time = ship_time + datetime.timedelta(hours=2)
        manifest.append(
            TrackingManifestItemDTO(
                timestamp=in_transit_time.strftime("%d %b %Y, %H:%M WIB"),
                status_title="Dalam Pengiriman Menuju Kota Tujuan",
                description=f"Paket telah meninggalkan Hub Sortir Pusat Jakarta dan sedang dalam perjalanan armada menuju {dest_city}.",
                city="Hub Logistik Jakarta",
                is_current=order_status == "SHIPPED",
            )
        )

    # 4. Event Selesai / Diterima (untuk status COMPLETED)
    if order_status == "COMPLETED":
        comp_time = completed_at or (created_at + datetime.timedelta(days=2))
        arrived_time = comp_time - datetime.timedelta(hours=3)
        manifest.append(
            TrackingManifestItemDTO(
                timestamp=arrived_time.strftime("%d %b %Y, %H:%M WIB"),
                status_title=f"Paket Tiba di Drop Point {dest_city}",
                description=f"Paket telah tiba di kantor perwakilan {courier_name} {dest_city} dan dibawa kurir pengantar.",
                city=dest_city,
                is_current=False,
            )
        )

        manifest.append(
            TrackingManifestItemDTO(
                timestamp=comp_time.strftime("%d %b %Y, %H:%M WIB"),
                status_title="Paket Berhasil Diterima",
                description=f"Paket telah diterima dengan baik di alamat tujuan ({order.customer_name}). Terima kasih telah berbelanja di Amba Shop!",
                city=dest_city,
                is_current=True,
            )
        )

    return manifest
