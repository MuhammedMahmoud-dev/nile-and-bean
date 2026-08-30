from fastapi import FastAPI
from routers import users, products, orders
import models
from database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(users.router)
app.include_router(products.router)
app.include_router(orders.router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

app.mount("/static", StaticFiles(directory="C:\Sw_project_Deliverable-_3-main"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("C:\Sw_project_Deliverable-_3-main\index.html", "r", encoding="utf-8") as f:
        return f.read()