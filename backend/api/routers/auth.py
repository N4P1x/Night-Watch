from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps import (
    clear_auth_cookie,
    get_current_user_from_cookie_or_header,
    log_audit,
    set_auth_cookie,
)
from backend.core.database import get_db
from backend.models.user import User as UserModel
from backend.schemas.auth import User, UserCreate, UserUpdate
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=User)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    db_user = await service.register(user)

    await log_audit(db, db_user.id, "user_register", "user", details={"username": user.username})

    return db_user


@router.post("/login")
async def login(
    response: Response,
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    user = await service.login(form_data.username, form_data.password)
    set_auth_cookie(response, user["access_token"])

    result = await db.execute(
        select(UserModel).filter(UserModel.username == form_data.username)
    )
    db_user = result.scalars().first()

    await log_audit(db, db_user.id, "user_login", "user", details=f"User {form_data.username} logged in")

    return {"access_token": user["access_token"], "token_type": "bearer"}


@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    current_user: UserModel = Depends(get_current_user_from_cookie_or_header),
    db: AsyncSession = Depends(get_db)
):
    clear_auth_cookie(response)

    await log_audit(db, current_user.id, "user_logout", "user", details=f"User {current_user.username} logged out")

    return {"message": "Logout successful"}


@router.get("/me", response_model=User)
async def get_me(current_user: UserModel = Depends(get_current_user_from_cookie_or_header)):
    return current_user


@router.put("/me", response_model=User)
async def update_me(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_user_from_cookie_or_header),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    result = await service.update_user(current_user, user_update)

    await log_audit(db, current_user.id, "user_update_profile", "user", details=f"User {current_user.username} updated profile")

    return result
