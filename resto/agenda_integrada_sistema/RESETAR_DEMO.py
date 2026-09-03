from pathlib import Path
import shutil

base = Path(__file__).resolve().parent
db = base / "agenda_integrada.db"
if db.exists():
    db.unlink()
    print("Banco demonstrativo removido.")
else:
    print("Banco demonstrativo já estava ausente.")

uploads = base / "uploads"
if uploads.exists():
    for p in uploads.iterdir():
        if p.is_file():
            p.unlink()
        elif p.is_dir():
            shutil.rmtree(p)
print("Anexos demonstrativos removidos.")
print("Abra o sistema novamente para recriar os dados iniciais.")
