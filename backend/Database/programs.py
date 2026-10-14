from typing import List, Dict, Any
from supabase import Client
from datetime import datetime, timezone
from ..models.programs import ProgramImport, Exercise, Workout
from .supabase import supabase
from .users import find_user_by_id
from ..utils.programs import (
    _convert_workouts_to_json,
    escape_like,
    plan_program_page,
    to_program_summary,
)
import ast


def insert_program_from_import(program_import: ProgramImport, current_user_id) -> Dict[str, Any]:
    try:
        # Convert Pydantic models to dictionaries for JSON serialization
        response = find_user_by_id(current_user_id)
        convertedResponse = ast.literal_eval(str(response))
        
        id_key, id_value = next(iter(convertedResponse.items()))

        program_data = {
            "program_name": program_import.program_name,
            "description": None,  # Could be added later if needed
            "program_structure": _convert_workouts_to_json(program_import.program_structure),
            "user_id": id_value
        }

        # Insert the program using Supabase
        insertResponse = supabase.table("workout_programs").insert(program_data).execute()
        convertedInsertResponse = ast.literal_eval(str(insertResponse.data[0]))

        program_id_key, program_id_value = next(iter(convertedInsertResponse.items()))
        
        program_id = program_id_value
        
        return {
            "success": True,
            "program_id": program_id,
            "message": f"Program '{program_import.program_name}' imported successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to import program: {str(e)}"
        }
    
def get_program_by_id(program_id: str) -> Dict[str, Any]:
    try:
        response = supabase.table("workout_programs").select("*").eq("id", program_id).execute()
        if response.data and len(response.data) > 0:
            return {
                "success": True,
                "data": response.data[0]
            }
        return {"success": False, "error": "Program not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_owned_program(program_id: str | None, user_id: str) -> Dict[str, Any] | None:
    if not program_id:
        return None
    result = get_program_by_id(str(program_id))
    if not result["success"]:
        return None
    program = result["data"]
    if program.get("user_id") != user_id or program.get("deleted_at") is not None:
        return None
    return program


# program_structure is only read to count days; it never leaves the server
PROGRAM_SUMMARY_COLUMNS = "id, program_name, program_structure, updated_at"


def _matching_programs(user_id: str, terms: List[str], count: str | None = None):
    query = supabase.table("active_workout_programs").select(PROGRAM_SUMMARY_COLUMNS, count=count).eq("user_id", user_id)
    for term in terms:
        query = query.ilike("program_name", f"%{escape_like(term)}%")
    return query


def get_program_summaries_page(
    user_id: str,
    active_program_id: str | None,
    page: int,
    limit: int,
    terms: List[str],
) -> Dict[str, Any]:
    try:
        active_row = None
        if active_program_id:
            active_response = _matching_programs(user_id, terms).eq("id", active_program_id).execute()
            active_row = active_response.data[0] if active_response.data else None

        plan = plan_program_page(page, limit, pin_active=active_row is not None)
        others_query = _matching_programs(user_id, terms, count="exact")
        if active_program_id:
            others_query = others_query.neq("id", active_program_id)
        others_response = (
            others_query
            .order("created_at", desc=True)
            .order("id", desc=True)
            .range(plan["offset"], plan["offset"] + max(plan["size"], 1) - 1)
            .execute()
        )
        other_rows = (others_response.data or [])[:plan["size"]]

        items = [to_program_summary(row, is_active=False) for row in other_rows]
        if plan["include_active"]:
            items.insert(0, to_program_summary(active_row, is_active=True))

        return {
            "success": True,
            "data": {
                "items": items,
                "total": (others_response.count or 0) + (1 if active_row else 0),
                "page": page,
                "limit": limit,
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def update_program(program_id: str, user_id: str, program_import: ProgramImport) -> Dict[str, Any]:
    try:
        updates = {
            "program_name": program_import.program_name,
            "program_structure": _convert_workouts_to_json(program_import.program_structure),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        # Scoped to the owner and to programs that haven't been soft deleted
        response = supabase.table("active_workout_programs").update(updates).eq("id", program_id).eq("user_id", user_id).execute()
        return {
            "success": True,
            "data": response.data,
            "message": "Program updated successfully"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def delete_program(program_id: str, user_id: str) -> Dict[str, Any]:
    try:
        response = supabase.table("active_workout_programs").update({"deleted_at": datetime.now(timezone.utc).isoformat()}).eq("id", program_id).eq("user_id", user_id).execute()
        return {
            "success": True,
            "data": response.data,
            "message": "Program deleted successfully"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
