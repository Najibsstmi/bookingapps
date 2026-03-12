import { supabase } from "./supabase"
import { defaultRooms } from "./defaultRooms"

export async function seedDefaultRooms(schoolId: string) {
  const { count, error: countError } = await supabase
    .from("rooms")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId)

  if (countError) {
    throw countError
  }

  if ((count ?? 0) > 0) {
    return
  }

  const payload = defaultRooms.map((room) => ({
    school_id: schoolId,
    room_name: room.room_name,
    room_category: room.room_category ?? null,
    capacity: room.capacity ?? null,
    is_active: true,
  }))

  const { error } = await supabase.from("rooms").insert(payload)

  if (error) {
    throw error
  }
}

export async function getRoomsBySchool(schoolId: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("school_id", schoolId)
    .order("room_name", { ascending: true })

  if (error) throw error
  return data
}

export async function addRoom(schoolId: string, name: string) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error("Nama bilik tidak boleh kosong.")
  }

  const { error } = await supabase.from("rooms").insert({
    school_id: schoolId,
    room_name: trimmedName,
    room_category: null,
    capacity: null,
    is_default: false,
    is_active: true,
  })

  if (error) throw error
}
