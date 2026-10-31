import sys
import uuid
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from sqlalchemy import text
from database import Base, SessionLocal, engine
from models import AuthProvider, Product, ProductImage, User, UserRole

MOCK_USERS = [
    {
        "id": uuid.UUID("11111111-1111-4111-a111-111111111111"),
        "email": "admin@ambashop.com",
        "full_name": "Admin AmbaShop",
        "password_hash": "$2b$12$mockhashforadminambashoppassword1234567890",
        "auth_provider": AuthProvider.LOCAL.value,
        "role": UserRole.ADMIN.value,
        "is_active": True,
    },
    {
        "id": uuid.UUID("22222222-2222-4222-a222-222222222222"),
        "email": "customer@ambashop.com",
        "full_name": "Customer AmbaShop",
        "password_hash": "$2b$12$mockhashforcustomerambashoppassword123456",
        "auth_provider": AuthProvider.LOCAL.value,
        "role": UserRole.CUSTOMER.value,
        "is_active": True,
    },
]

MOCK_PRODUCTS = [
    {
        "id": uuid.UUID("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"),
        "name": "Ergonomic Desk Mat Leather",
        "description": "Alas meja kerja kulit sintetis premium tahan air dan goresan untuk kenyamanan mengetik serta pergerakan mouse yang presisi.",
        "price": 17500,
        "stock_quantity": 15,
        "weight_grams": 450,
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1000&q=80",
                "is_primary": True,
                "display_order": 0,
            },
            {
                "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1000&q=80",
                "is_primary": False,
                "display_order": 1,
            },
        ],
    },
    {
        "id": uuid.UUID("e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b"),
        "name": "Portable Waterproof Bluetooth Speaker",
        "description": "Speaker portabel tahan air bersertifikasi IPX7 dengan dentuman bass mendalam dan daya tahan baterai 12 jam pemutaran nonstop.",
        "price": 4500,
        "stock_quantity": 17,
        "weight_grams": 650,
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1000&q=80",
                "is_primary": True,
                "display_order": 0,
            },
            {
                "image_url": "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=1000&q=80",
                "is_primary": False,
                "display_order": 1,
            },
        ],
    },
    {
        "id": uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
        "name": "Wireless Mechanical Keyboard RGB",
        "description": "Keyboard mekanikal nirkabel dengan switch taktil responsif, lampu latar RGB dinamis, dan konektivitas Bluetooth multi-device.",
        "price": 850000,
        "stock_quantity": 10,
        "weight_grams": 850,
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80",
                "is_primary": True,
                "display_order": 0,
            },
            {
                "image_url": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1000&q=80",
                "is_primary": False,
                "display_order": 1,
            },
        ],
    },
    {
        "id": uuid.UUID("b2c1d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e"),
        "name": "Noise-Cancelling Wireless Headphones",
        "description": "Headphone over-ear nirkabel dengan active noise cancellation (ANC) premium, audio resolusi tinggi, dan baterai hingga 30 jam.",
        "price": 12500,
        "stock_quantity": 5,
        "weight_grams": 380,
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80",
                "is_primary": True,
                "display_order": 0,
            },
            {
                "image_url": "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1000&q=80",
                "is_primary": False,
                "display_order": 1,
            },
        ],
    },
    {
        "id": uuid.UUID("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a"),
        "name": "Fitness Tracker Smartwatch",
        "description": "Jam tangan pintar dengan sensor pemantau detak jantung, pelacak kualitas tidur, GPS akurat, dan ketahanan air hingga 50 meter.",
        "price": 5000,
        "stock_quantity": 20,
        "weight_grams": 120,
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
                "is_primary": True,
                "display_order": 0,
            },
            {
                "image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1000&q=80",
                "is_primary": False,
                "display_order": 1,
            },
        ],
    },
]


def seed_users(db):
    added_users = 0
    for u_data in MOCK_USERS:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            user = User(
                id=u_data["id"],
                email=u_data["email"],
                full_name=u_data["full_name"],
                password_hash=u_data["password_hash"],
                auth_provider=u_data["auth_provider"],
                role=u_data["role"],
                is_active=u_data["is_active"],
            )
            db.add(user)
            added_users += 1

    if added_users > 0:
        db.commit()
        print(f"Berhasil menambahkan {added_users} pengguna (Admin/Customer) ke database.")
    else:
        print("Data pengguna (Admin/Customer) sudah ada. Seeding pengguna dilewati.")


def seed_products(db):
    updated_products = 0
    added_products = 0
    repopulated_images = 0

    for item in MOCK_PRODUCTS:
        # Tentukan image_url utama dari gambar pertama dengan is_primary=True
        primary_img_url = None
        for img in item.get("images", []):
            if img.get("is_primary"):
                primary_img_url = img.get("image_url")
                break
        if not primary_img_url and item.get("images"):
            primary_img_url = item["images"][0].get("image_url")

        product = (
            db.query(Product)
            .filter((Product.id == item["id"]) | (Product.name == item["name"]))
            .first()
        )

        if product:
            # Perbarui data produk dan image_url tanpa merusak riwayat orders
            product.image_url = primary_img_url
            product.description = item.get("description", product.description)
            product.price = item.get("price", product.price)
            product.stock_quantity = item.get("stock_quantity", product.stock_quantity)
            if "weight_grams" in item:
                product.weight_grams = item["weight_grams"]
            updated_products += 1
        else:
            product = Product(
                id=item["id"],
                name=item["name"],
                description=item["description"],
                price=item["price"],
                stock_quantity=item["stock_quantity"],
                weight_grams=item.get("weight_grams", 1000),
                image_url=primary_img_url,
            )
            db.add(product)
            db.flush()
            added_products += 1

        # Ganti isi product_images dengan URL aktif terbaru
        db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
        for img_data in item.get("images", []):
            prod_image = ProductImage(
                product_id=product.id,
                image_url=img_data["image_url"],
                is_primary=img_data["is_primary"],
                display_order=img_data["display_order"],
            )
            db.add(prod_image)
            repopulated_images += 1

    db.commit()
    print(
        f"Seeding produk selesai: {updated_products} produk diperbarui, "
        f"{added_products} produk baru ditambahkan, dan {repopulated_images} gambar diperbarui."
    )


def seed_all():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);"))
        conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams INTEGER DEFAULT 1000;"))
        conn.commit()

    db = SessionLocal()
    try:
        print("Memulai proses seeding database...")
        seed_users(db)
        seed_products(db)
        print("Proses seeding selesai dengan sukses.")
    except Exception as e:
        db.rollback()
        print(f"Error saat seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
