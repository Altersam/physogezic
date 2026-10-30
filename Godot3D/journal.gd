extends RefCounted

const HOUR: int = 3600
const LOG_PATH: String = "user://logs/game.log"
var current_hour: int = -1

func _init() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("user://logs"))
	current_hour=int(FileAccess.get_modified_time(LOG_PATH)/HOUR) if FileAccess.file_exists(LOG_PATH) else int(Time.get_unix_time_from_system()/HOUR)
	reset_if_due()

func reset_if_due(now: float = -1.0) -> bool:
	if now<0:now=Time.get_unix_time_from_system()
	var next_hour: int=int(now/HOUR)
	if next_hour==current_hour:return false
	current_hour=next_hour
	var file:=FileAccess.open(LOG_PATH,FileAccess.WRITE)
	if file:file.close()
	return true

func record(message: String) -> void:
	reset_if_due()
	var file:=FileAccess.open(LOG_PATH,FileAccess.READ_WRITE if FileAccess.file_exists(LOG_PATH) else FileAccess.WRITE)
	if not file:return
	file.seek_end()
	file.store_line(Time.get_datetime_string_from_system()+" "+message.replace("\n"," ").left(1500))
	file.close()
