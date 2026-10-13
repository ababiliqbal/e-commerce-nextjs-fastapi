import sys
import uuid
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from database import Base, SessionLocal, engine
from models import Product

MOCK_PRODUCTS = [
    {
        "id": uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
        "name": "Wireless Mechanical Keyboard RGB",
        "description": "Keyboard mekanikal nirkabel dengan switch taktil responsif, lampu latar RGB dinamis, dan konektivitas Bluetooth multi-device.",
        "price": 850000,
        "stock_quantity": 25,
    },
    {
        "id": uuid.UUID("b2c1d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e"),
        "name": "Noise-Cancelling Wireless Headphones",
        "description": "Headphone over-ear nirkabel dengan active noise cancellation (ANC) premium, audio resolusi tinggi, dan baterai hingga 30 jam.",
        "price": 1250000,
        "stock_quantity": 15,
    },
    {
        "id": uuid.UUID("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"),
        "name": "Ergonomic Desk Mat Leather",
        "description": "Alas meja kerja kulit sintetis premium tahan air dan goresan untuk kenyamanan mengetik serta pergerakan mouse yang presisi.",
        "price": 175000,
        "stock_quantity": 50,
    },
    {
        "id": uuid.UUID("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a"),
        "name": "Fitness Tracker Smartwatch",
        "description": "Jam tangan pintar dengan sensor pemantau detak jantung, pelacak kualitas tidur, GPS akurat, dan ketahanan air hingga 50 meter.",
        "price": 620000,
        "stock_quantity": 30,
    },
    {
        "id": uuid.UUID("e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b"),
        "name": "Portable Waterproof Bluetooth Speaker",
        "description": "Speaker portabel tahan air bersertifikasi IPX7 dengan dentuman bass mendalam dan daya tahan baterai 12 jam pemutaran nonstop.",
        "price": 450000,
        "stock_quantity": 40,
    },
]


def seed_products():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Product).count()
        if count == 0:
            print("Tabel products kosong. Menambahkan data seed...")
            for item in MOCK_PRODUCTS:
                product = Product(
                    id=item["id"],
                    name=item["name"],
                    description=item["description"],
                    price=item["price"],
                    stock_quantity=item["stock_quantity"],
                )
                db.add(product)
            db.commit()
            print(f"Berhasil menambahkan {len(MOCK_PRODUCTS)} produk ke database.")
        else:
            print(f"Tabel products sudah memiliki {count} data. Seeding dilewati.")
    except Exception as e:
        db.rollback()
        print(f"Error saat seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_products()
