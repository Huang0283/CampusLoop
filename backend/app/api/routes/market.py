from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query, Response, UploadFile
from sqlalchemy import delete, func, select

from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import Favorite, Product, ProductImage, User, WantedPost
from app.schemas.business import ProductStatusWrite, ProductWrite, WantedWrite
from app.services import business_serializers as dto
from app.services.auth import Actor, Db, student
from app.services.business import idempotent, load
from app.services.storage import owned_keys, upload

router = APIRouter(tags=["Market"])
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]
Key = Annotated[str | None, Header(alias="Idempotency-Key")]


def page_data(db, query, page, page_size, serialize):
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return ok(
        {
            "items": serialize(items),
            "pagination": {"page": page, "pageSize": page_size, "total": total},
        }
    )


def visible_products():
    return (
        select(Product)
        .join(User, User.id == Product.owner_id)
        .where(Product.deleted_at.is_(None), Product.status != "HIDDEN", User.status == "ACTIVE")
    )


@router.get("/products", operation_id="listProducts")
def list_products(
    db: Db,
    page: Page = 1,
    pageSize: PageSize = 20,
    query: str = "",
    category: str = "",
    condition: str = "",
    status: Literal["ON_SALE", "RESERVED", "SOLD", "HIDDEN"] | None = None,
    sort: Literal["newest", "price_asc", "price_desc"] = "newest",
):
    stmt = visible_products()
    if query:
        term = "%" + query.replace("%", r"\%").replace("_", r"\_") + "%"
        stmt = stmt.where(Product.title.ilike(term) | Product.description.ilike(term))
    if category:
        stmt = stmt.where(Product.category == category)
    if condition:
        stmt = stmt.where(Product.condition == condition)
    stmt = stmt.where(Product.status == (status or "ON_SALE"))
    stmt = stmt.order_by(
        Product.price.asc()
        if sort == "price_asc"
        else Product.price.desc()
        if sort == "price_desc"
        else Product.created_at.desc(),
        Product.id.desc(),
    )
    return page_data(db, stmt, page, pageSize, lambda items: dto.products(db, items))


@router.get("/products/mine", operation_id="listMyProducts")
def my_products(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    query: str = "",
    status: str | None = None,
):
    stmt = select(Product).where(Product.owner_id == actor.id, Product.deleted_at.is_(None))
    if query:
        stmt = stmt.where(Product.title.contains(query, autoescape=True))
    if status:
        stmt = stmt.where(Product.status == status)
    return page_data(
        db, stmt.order_by(Product.id.desc()), page, pageSize, lambda items: dto.products(db, items)
    )


@router.post("/products", status_code=201, operation_id="createProduct")
def create_product(body: ProductWrite, db: Db, actor: Actor, idempotency_key: Key = None):
    def action():
        keys = owned_keys(db, actor, body.images, "product")
        item = Product(
            owner_id=actor.id,
            title=body.title,
            category=body.category,
            condition=body.condition,
            price=body.price,
            original_price=body.originalPrice,
            campus_location=body.campusLocation,
            description=body.description,
            status="ON_SALE",
        )
        db.add(item)
        db.flush()
        for position, key in enumerate(keys):
            db.add(ProductImage(product_id=item.id, object_key=key, sort_order=position))
        db.flush()
        return ok(dto.product(db, item))

    return idempotent(
        db, actor, "create-product", idempotency_key, body.model_dump(mode="json"), action
    )


@router.get("/products/{productId}", operation_id="getProduct")
def get_product(productId: int, db: Db):
    item = db.scalar(visible_products().where(Product.id == productId))
    if item is None:
        raise BusinessError(404, "NOT_FOUND", "Product not found.")
    return ok(dto.product(db, item))


def editable_product(db, identity, actor):
    student(actor)
    item = load(db, Product, identity, lock=True)
    if item.owner_id != actor.id:
        raise BusinessError(403, "FORBIDDEN", "Only owner can change product.")
    if item.deleted_at or item.status in ("RESERVED", "SOLD"):
        raise BusinessError(
            409, "PRODUCT_STATE_CONFLICT", "Product cannot be edited in this state."
        )
    return item


@router.patch("/products/{productId}", operation_id="updateProduct")
def update_product(productId: int, body: ProductWrite, db: Db, actor: Actor):
    item = editable_product(db, productId, actor)
    keys = owned_keys(db, actor, body.images, "product")
    for field, value in {
        "title": body.title,
        "description": body.description,
        "category": body.category,
        "condition": body.condition,
        "price": body.price,
        "original_price": body.originalPrice,
        "campus_location": body.campusLocation,
    }.items():
        setattr(item, field, value)
    db.execute(delete(ProductImage).where(ProductImage.product_id == item.id))
    for position, key in enumerate(keys):
        db.add(ProductImage(product_id=item.id, object_key=key, sort_order=position))
    db.flush()
    result = ok(dto.product(db, item))
    db.commit()
    return result


@router.patch("/products/{productId}/status", operation_id="updateProductStatus")
def product_status(productId: int, body: ProductStatusWrite, db: Db, actor: Actor):
    item = editable_product(db, productId, actor)
    if body.status not in ("ON_SALE", "HIDDEN"):
        raise BusinessError(409, "PRODUCT_STATE_CONFLICT", "Trade states are controlled by orders.")
    item.status = body.status
    db.flush()
    result = ok(dto.product(db, item))
    db.commit()
    return result


@router.delete("/products/{productId}", status_code=204, operation_id="deleteProduct")
def delete_product(productId: int, db: Db, actor: Actor):
    item = editable_product(db, productId, actor)
    item.status = "HIDDEN"
    item.deleted_at = utcnow()
    db.commit()
    return Response(status_code=204)


@router.get("/favorites", operation_id="listFavorites")
def favorites(db: Db, actor: Actor, page: Page = 1, pageSize: PageSize = 20):
    stmt = (
        visible_products()
        .join(Favorite, Favorite.product_id == Product.id)
        .where(Favorite.user_id == actor.id)
        .order_by(Favorite.id.desc())
    )
    return page_data(db, stmt, page, pageSize, lambda items: dto.products(db, items))


@router.put("/favorites/{productId}", status_code=204, operation_id="addFavorite")
def add_favorite(productId: int, db: Db, actor: Actor):
    student(actor)
    if not db.scalar(visible_products().where(Product.id == productId)):
        raise BusinessError(404, "NOT_FOUND", "Product not found.")
    if not db.scalar(
        select(Favorite).where(Favorite.user_id == actor.id, Favorite.product_id == productId)
    ):
        db.add(Favorite(user_id=actor.id, product_id=productId))
    db.commit()
    return Response(status_code=204)


@router.delete("/favorites/{productId}", status_code=204, operation_id="removeFavorite")
def remove_favorite(productId: int, db: Db, actor: Actor):
    student(actor)
    db.execute(
        delete(Favorite).where(Favorite.user_id == actor.id, Favorite.product_id == productId)
    )
    db.commit()
    return Response(status_code=204)


@router.post("/uploads/images", status_code=201, operation_id="uploadImage")
def upload_image(
    file: UploadFile,
    db: Db,
    actor: Actor,
    purpose: Literal["product", "evidence", "chat"] = "product",
):
    student(actor)
    return ok(upload(db, actor, file.file.read(5 * 1024 * 1024 + 1), purpose))


@router.get("/wanted", operation_id="listWanted")
def list_wanted(
    db: Db, page: Page = 1, pageSize: PageSize = 20, query: str = "", status: str = "OPEN"
):
    stmt = (
        select(WantedPost)
        .join(User, User.id == WantedPost.owner_id)
        .where(User.status == "ACTIVE", WantedPost.status == status)
    )
    if status == "OPEN":
        stmt = stmt.where((WantedPost.expires_at.is_(None)) | (WantedPost.expires_at > utcnow()))
    if query:
        stmt = stmt.where(WantedPost.title.contains(query, autoescape=True))
    return page_data(
        db,
        stmt.order_by(WantedPost.id.desc()),
        page,
        pageSize,
        lambda items: [dto.wanted(db, item) for item in items],
    )


@router.post("/wanted", status_code=201, operation_id="createWanted")
def create_wanted(body: WantedWrite, db: Db, actor: Actor, idempotency_key: Key = None):
    def action():
        if body.expireAt <= utcnow():
            raise BusinessError(422, "VALIDATION_ERROR", "Expiry must be in the future.")
        item = WantedPost(
            owner_id=actor.id,
            title=body.title,
            description=body.description,
            category="ANY",
            budget_min=body.budgetMin,
            budget_max=body.budgetMax,
            requirements={"condition": body.condition, "location": body.location},
            expires_at=body.expireAt,
            status="OPEN",
        )
        db.add(item)
        db.flush()
        return ok(dto.wanted(db, item))

    return idempotent(
        db, actor, "create-wanted", idempotency_key, body.model_dump(mode="json"), action
    )


@router.get("/wanted/{wantedId}", operation_id="getWanted")
def get_wanted(wantedId: int, db: Db):
    item = load(db, WantedPost, wantedId)
    if db.get(User, item.owner_id).status != "ACTIVE":
        raise BusinessError(404, "NOT_FOUND", "Wanted post not found.")
    return ok(dto.wanted(db, item))


@router.patch("/wanted/{wantedId}", operation_id="updateWanted")
def update_wanted(wantedId: int, body: WantedWrite, db: Db, actor: Actor):
    student(actor)
    item = load(db, WantedPost, wantedId, lock=True)
    if item.owner_id != actor.id:
        raise BusinessError(403, "FORBIDDEN", "Only owner can change wanted post.")
    if item.status != "OPEN":
        raise BusinessError(409, "WANTED_STATE_CONFLICT", "Wanted post is closed.")
    if body.expireAt <= utcnow():
        raise BusinessError(422, "VALIDATION_ERROR", "Expiry must be in the future.")
    item.title, item.description = body.title, body.description
    item.budget_min, item.budget_max = body.budgetMin, body.budgetMax
    item.requirements = {"condition": body.condition, "location": body.location}
    item.expires_at = body.expireAt
    db.flush()
    result = ok(dto.wanted(db, item))
    db.commit()
    return result


@router.delete("/wanted/{wantedId}", status_code=204, operation_id="closeWanted")
def close_wanted(wantedId: int, db: Db, actor: Actor):
    student(actor)
    item = load(db, WantedPost, wantedId, lock=True)
    if item.owner_id != actor.id:
        raise BusinessError(403, "FORBIDDEN", "Only owner can close wanted post.")
    item.status = "CLOSED"
    db.commit()
    return Response(status_code=204)
