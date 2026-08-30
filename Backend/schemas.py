from pydantic import BaseModel

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool
    class Config:
        orm_mode = True

class ProductBase(BaseModel):
    name: str
    price: int
    description: str

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    class Config:
        orm_mode = True

class OrderBase(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: int
    user_id: int
    class Config:
        orm_mode = True