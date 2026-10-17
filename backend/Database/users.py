import json
from typing import Any, cast
from postgrest.exceptions import APIError
from ..models.users import CreateUser
from ..utils.passwords import hash_password
from .supabase import supabase

def insert_user(user: CreateUser):
    hashed_password = hash_password(user.password)

    response = supabase.table('users').insert({
        'username': user.username,
        'email': user.email,
        'password': hashed_password
    }).execute()

def find_user_by_id(id: str) -> dict[str, Any] | None:
    try:
        response = (supabase.table('users').select('*').eq('id',id).single()).execute()
        return cast(dict[str, Any], response.data)
    except APIError as error:
        if error.code == "PGRST116":
            return None
        else:
            raise error


def find_user_by_username(username: str) -> dict[str, Any] | None:
    try: 
        response = supabase.table('users').select("*").eq('username',username).single().execute()
        return cast(dict[str, Any], response.data)
    except APIError as error:
        if error.code == "PGRST116":
            return None
        else:
            raise error

    
def find_user_by_email(email: str) -> dict[str, Any] | None:
    try: 
        response = supabase.table('users').select("*").eq('email',email).single().execute()
        return cast(dict[str, Any], response.data)
    except APIError as error:
        if error.code == "PGRST116":
            return None
        else:
            raise error

def update_user_streak(user_id: str, streak: int):
    try:
        response = supabase.table('users').update({"current_streak": streak}).eq('id', user_id).execute()
        return response.data
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_user_password(user_id: str, new_password: str):
    hashed_password = hash_password(new_password)
    supabase.table('users').update({"password": hashed_password}).eq('id', user_id).execute()

def set_users_active_program(program_id: str | None, user_id: str):
    try:
        response = supabase.table('users').update({"active_program":program_id}).eq('id',user_id).execute()
        return response.data
    except Exception as e:
        return {"success": False, "error": str(e)}