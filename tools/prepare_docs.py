"""Copy only our rendered previews into the repository documentation."""
from pathlib import Path
import shutil,tempfile

ROOT=Path(__file__).resolve().parents[1]
TEMP=Path(tempfile.gettempdir())/'opencode'
OUT=ROOT/'docs'/'images'
OUT.mkdir(parents=True,exist_ok=True)
for source,name in [
    (TEMP/'fizogezik-table'/'table-closed-cards.png','web-table.png'),
    (TEMP/'fizogezik-godot-effects'/'correct.png','godot-feedback.png'),
    (TEMP/'fizogezik-godot-effects'/'victory.png','godot-victory.png')]:
    if not source.exists():raise RuntimeError('Run the corresponding browser/Godot capture first: '+str(source))
    shutil.copy2(source,OUT/name)
print('Documentation previews:',OUT)
shutil.copy2(TEMP/'fizogezik-godot-effects'/'victory.png',ROOT/'Godot3D'/'preview.png')
