from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import os
import secrets
import sqlite3
import math
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, Form, UploadFile, File, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, StreamingResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
import httpx
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "agenda_integrada.db"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

APP_VERSION = "1.1.0"
VISUAL_VERSION = "GOV.BR V3"

app = FastAPI(title="Agenda Integrada — Infraestrutura e Gestão Escolar", version=APP_VERSION)
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("AGENDA_SECRET", "troque-esta-chave-em-producao-2026"), same_site="lax")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

PRIORITIES = {
    "P1": {"label": "Urgente", "rank": 1},
    "P2": {"label": "Alta", "rank": 2},
    "P3": {"label": "Programada", "rank": 3},
    "P4": {"label": "Planejamento/Projeto", "rank": 4},
}

STATUSES = [
    "Nova", "Recebida", "Em triagem", "Em análise técnica", "Aguardando informações da escola",
    "Visita técnica agendada", "Em planejamento", "Serviço programado", "Aguardando material",
    "Aguardando orçamento", "Aguardando contratação", "Aguardando empresa", "Encaminhada para outro setor",
    "Em execução", "Parcialmente executada", "Reprogramada", "Planejamento futuro", "Concluída", "Cancelada"
]

CATEGORIES = [
    "Elétrica", "Hidráulica", "Cobertura/Telhado", "Pintura", "Climatização", "Serralheria", "Alvenaria",
    "Acessibilidade", "Mobiliário", "Equipamentos", "Segurança", "Saneamento", "Estrutura", "Área externa",
    "Iluminação", "Portas e janelas", "Reforma", "Obra", "Aquisição", "Outros"
]

# Semente inicial (usada só na primeira inicialização do banco — depois disso a fonte da verdade
# passa a ser a tabela `categories`, editável pelo administrador).
CATEGORY_ICONS = {
    'Elétrica': 'bolt', 'Hidráulica': 'drop', 'Cobertura/Telhado': 'roof', 'Pintura': 'paint', 'Climatização': 'wind',
    'Serralheria': 'wrench', 'Alvenaria': 'brick', 'Acessibilidade': 'wheelchair', 'Mobiliário': 'chair', 'Equipamentos': 'monitor',
    'Segurança': 'shield', 'Saneamento': 'drain', 'Estrutura': 'column', 'Área externa': 'tree', 'Iluminação': 'bulb',
    'Portas e janelas': 'door', 'Reforma': 'hammer', 'Obra': 'crane', 'Aquisição': 'cart', 'Outros': 'dots',
}
CATEGORY_HINTS = {
    'Elétrica': 'Fiação, tomada, quadro de força, curto-circuito', 'Hidráulica': 'Vazamento, entupimento, cano estourado',
    'Cobertura/Telhado': 'Goteira, infiltração, telha quebrada', 'Pintura': 'Parede descascando, mofo, pintura antiga',
    'Climatização': 'Ventilador ou ar-condicionado com problema', 'Serralheria': 'Portão, grade ou trava com defeito',
    'Alvenaria': 'Rachadura, muro ou parede danificada', 'Acessibilidade': 'Rampa, corrimão, piso tátil',
    'Mobiliário': 'Mesa, cadeira, armário quebrado', 'Equipamentos': 'Computador, projetor, equipamento com defeito',
    'Segurança': 'Câmera, alarme, iluminação de segurança', 'Saneamento': 'Esgoto, caixa de gordura, fossa',
    'Estrutura': 'Coluna, viga, laje ou base comprometida', 'Área externa': 'Quadra, pátio, jardim, área externa',
    'Iluminação': 'Lâmpada queimada, poste ou luminária', 'Portas e janelas': 'Porta ou janela emperrada, vidro quebrado',
    'Reforma': 'Melhoria ou reparo de maior porte', 'Obra': 'Construção ou ampliação',
    'Aquisição': 'Compra de material ou equipamento novo', 'Outros': 'Não se encaixa nas opções acima',
}


# --- Mapa de rota (OpenFreeMap + Nominatim + OSRM) --------------------------
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving"
GEOCODE_USER_AGENT = "AgendaIntegrada-Itaguai/1.1 (uso interno - Secretaria Municipal de Educacao de Itaguai-RJ)"


def geocode_address(address: Optional[str]) -> Optional[dict]:
    """Converte um endereço em texto para latitude/longitude usando o Nominatim (OpenStreetMap).
    Retorna None se o endereço estiver vazio ou não puder ser localizado."""
    if not address or not address.strip():
        return None
    try:
        resp = httpx.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1, "countrycodes": "br", "addressdetails": 0},
            headers={"User-Agent": GEOCODE_USER_AGENT, "Accept-Language": "pt-BR"},
            timeout=8.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        item = data[0]
        return {"lat": float(item["lat"]), "lon": float(item["lon"]), "display_name": item.get("display_name")}
    except Exception:
        return None


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat(sep=" ")


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt, digest = encoded.split("$", 1)
        candidate = hash_password(password, salt).split("$", 1)[1]
        return hmac.compare_digest(candidate, digest)
    except Exception:
        return False


DEFAULT_PERM = {"school_scoped": True, "can_edit_analysis": False, "can_manage_admin": False, "can_view_reports": False, "can_view_planning": False}


def get_profile_by_slug(conn: sqlite3.Connection, slug: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM access_profiles WHERE slug=?", (slug,)).fetchone()
    return dict(row) if row else None


def perm_from_profile(profile: Optional[dict]) -> dict:
    if not profile:
        return dict(DEFAULT_PERM)
    return {
        "school_scoped": bool(profile["school_scoped"]),
        "can_edit_analysis": bool(profile["can_edit_analysis"]),
        "can_manage_admin": bool(profile["can_manage_admin"]),
        "can_view_reports": bool(profile["can_view_reports"]),
        "can_view_planning": bool(profile["can_view_planning"]),
    }


def require_admin(user: dict) -> None:
    if not user.get("perm", {}).get("can_manage_admin"):
        raise HTTPException(403, "Acesso restrito à administração")


def get_categories(conn: sqlite3.Connection, only_active: bool = True) -> list:
    q = "SELECT * FROM categories" + (" WHERE active=1" if only_active else "") + " ORDER BY sort_order, id"
    return [dict(r) for r in conn.execute(q).fetchall()]


def get_priorities(conn: sqlite3.Connection) -> list:
    return [dict(r) for r in conn.execute("SELECT * FROM priority_levels ORDER BY rank").fetchall()]


def get_kanban_stages(conn: sqlite3.Connection) -> list:
    rows = [dict(r) for r in conn.execute("SELECT * FROM kanban_stages ORDER BY sort_order, id").fetchall()]
    for r in rows:
        r["statuses"] = json.loads(r["statuses"])
    return rows


def init_db() -> None:
    conn = db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS schools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            director TEXT,
            address TEXT,
            phone TEXT,
            email TEXT,
            code TEXT,
            external_id TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            school_id INTEGER,
            FOREIGN KEY (school_id) REFERENCES schools(id)
        );

        CREATE TABLE IF NOT EXISTS demands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            location TEXT,
            impact TEXT,
            affected_people INTEGER DEFAULT 0,
            risk INTEGER DEFAULT 0,
            blocks_activity INTEGER DEFAULT 0,
            school_id INTEGER NOT NULL,
            priority TEXT NOT NULL DEFAULT 'P3',
            status TEXT NOT NULL DEFAULT 'Nova',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            due_date TEXT,
            responsible TEXT,
            sector TEXT,
            cost_estimate REAL DEFAULT 0,
            action_defined TEXT,
            technical_opinion TEXT,
            dependencies TEXT,
            needs_visit INTEGER DEFAULT 0,
            needs_budget INTEGER DEFAULT 0,
            needs_material INTEGER DEFAULT 0,
            needs_contract INTEGER DEFAULT 0,
            future_year INTEGER,
            planning_kind TEXT,
            planned_quantity REAL DEFAULT 0,
            planned_unit TEXT,
            created_by INTEGER,
            FOREIGN KEY (school_id) REFERENCES schools(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS demand_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            demand_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            message TEXT NOT NULL,
            author TEXT NOT NULL,
            visibility TEXT NOT NULL DEFAULT 'public',
            created_at TEXT NOT NULL,
            FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            demand_id INTEGER NOT NULL,
            category TEXT,
            filename TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            mime TEXT,
            size INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS planning_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            year INTEGER NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            kind TEXT NOT NULL,
            status TEXT NOT NULL,
            estimated_cost REAL DEFAULT 0,
            quantity REAL DEFAULT 0,
            unit TEXT,
            justification TEXT,
            schools_count INTEGER DEFAULT 1,
            process_number TEXT,
            procurement_number TEXT,
            contract_number TEXT,
            supplier TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS planning_links (
            planning_id INTEGER NOT NULL,
            demand_id INTEGER NOT NULL,
            PRIMARY KEY (planning_id, demand_id),
            FOREIGN KEY (planning_id) REFERENCES planning_items(id) ON DELETE CASCADE,
            FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            icon TEXT NOT NULL DEFAULT 'wrench',
            color TEXT NOT NULL DEFAULT 'blue',
            hint TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS priority_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            label TEXT NOT NULL,
            hint TEXT,
            color TEXT NOT NULL DEFAULT 'red',
            rank INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS kanban_stages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stage_key TEXT UNIQUE NOT NULL,
            label TEXT NOT NULL,
            hint TEXT,
            accent TEXT NOT NULL DEFAULT 'blue',
            statuses TEXT NOT NULL,
            target_status TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS access_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            label TEXT NOT NULL,
            description TEXT,
            school_scoped INTEGER NOT NULL DEFAULT 0,
            can_edit_analysis INTEGER NOT NULL DEFAULT 1,
            can_manage_admin INTEGER NOT NULL DEFAULT 0,
            can_view_reports INTEGER NOT NULL DEFAULT 1,
            can_view_planning INTEGER NOT NULL DEFAULT 1,
            is_system INTEGER NOT NULL DEFAULT 0,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );
        """
    )

    # Migração leve para bancos criados antes das colunas code/external_id (importação de escolas reais).
    school_cols = {r["name"] for r in conn.execute("PRAGMA table_info(schools)").fetchall()}
    if "code" not in school_cols:
        conn.execute("ALTER TABLE schools ADD COLUMN code TEXT")
    if "external_id" not in school_cols:
        conn.execute("ALTER TABLE schools ADD COLUMN external_id TEXT")
    if "lat" not in school_cols:
        conn.execute("ALTER TABLE schools ADD COLUMN lat REAL")
    if "lon" not in school_cols:
        conn.execute("ALTER TABLE schools ADD COLUMN lon REAL")
    if "active" not in school_cols:
        conn.execute("ALTER TABLE schools ADD COLUMN active INTEGER NOT NULL DEFAULT 1")

    user_cols = {r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "active" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1")

    demand_cols = {r["name"] for r in conn.execute("PRAGMA table_info(demands)").fetchall()}
    if "prov_description" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_description TEXT")
    if "prov_action_type" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_action_type TEXT")
    if "prov_responsible" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_responsible TEXT")
    if "prov_due_date" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_due_date TEXT")
    if "prov_priority" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_priority TEXT")
    if "prov_note" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_note TEXT")
    if "prov_notify_school" not in demand_cols:
        conn.execute("ALTER TABLE demands ADD COLUMN prov_notify_school INTEGER NOT NULL DEFAULT 0")

    attachment_cols = {r["name"] for r in conn.execute("PRAGMA table_info(attachments)").fetchall()}
    if "category" not in attachment_cols:
        conn.execute("ALTER TABLE attachments ADD COLUMN category TEXT")

    if conn.execute("SELECT COUNT(*) c FROM schools").fetchone()["c"] == 0:
        schools = [
            ('CEMAEE Centro Municipal de Atendimento Educacional Especializado', 'CRISTIANO VITOR SOUZA', 'Rua José Bonifácio, s/n - Centro - Itaguaí/RJ - CEP: 23815-650', '21 99192-4296', 'cemaee@edu.itaguai.rj.gov.br', None, '7d044cda-ad4d-4466-8e68-856754057278'),
            ('CESMI-Centro Municipal de Estudos Supletivos de Itaguaí', 'LENIEDJA DA SILVA BRANDÃO BARBOSA', 'Rua João Rosa Gonzales, nº 1242 - Engenho - Itaguaí/RJ - CEP: 23820-380', '21 99370-9845', 'cesmi@edu.itaguai.rj.gov.br', None, '7fc75500-9132-4d61-8160-adb8ca6c6caf'),
            ('CIEP 300 Munic. Prefeito Vicente Cicarino', 'Cleiton Magalhães Pereira dos Santos', 'Rua Professor Chico, s/n - Santana - Itaguaí/RJ - CEP: 23810-085', '(21) 96435-8547', 'ciep300@edu.itaguai.rj.gov.br', None, '79b7d5f7-1746-4b0d-80aa-7758ce5c1e1e'),
            ('CIEP 496 Munic. Maestro Francisco Mignone', 'RAFAEL RIBEIRO MENEZES', 'Itaguaí/RJ - endereço cadastrado da unidade', '21 97003-0018', 'ciep496@itaguai.rj.gov.br', None, '58046c75-b5a5-46e5-ba7f-b38c489ba2d7'),
            ('CIEP 497 Munic. Prof.ª Sílvia Tupinambá', 'FLAVIA MOTTA DA SILVEIRA SALGADO', 'R Manoel Soares da Costa, s/n - Engenho - Itaguaí/RJ - CEP: 23821-740', '21 97036-3871', 'ciep497@edu.itaguai.rj.gov.br', None, 'e06c2f23-f966-4ba9-b75d-ea799bf95ed8'),
            ('C.M. Aparecida Azêdo', 'Luciana Lisboa', 'Estrada do Teixeira, nº 2 - Vista Alegre - Itaguaí/RJ - CEP: 23820-275', '(21) 99323-3809', 'cm.aparecidaazedo@edu.itaguai.rj.gov.br', '33228019', 'fbe4db60-c40d-43c7-9fdb-3e1f2e740658'),
            ('C.M. Danielle Batista da Silva', 'NINAH DE FREITAS RIBEIRO', 'Rua A, s/n (Qd 06, Lt 26) - Vila Ibirapitanga - Itaguaí/RJ - CEP: 23811-703', '(21) 96487-8016', 'cm.daniellebatistadasilva@edu.itaguai.rj.gov.br', None, '651e49dc-f172-4428-a44f-272a4d2b156e'),
            ('C.M. Edson Cruz Amado', 'Bianca Gonçalves da Silva', 'Rua Argentina, s/n (esquina com a Rua Bolívia, Qd. 16) - Jardim América - Itaguaí/RJ - CEP: 23810-130', '(21) 96930-7327', 'cm.edsoncruzamado@edu.itaguai.rj.gov.br', '33439290', '18eb69f3-7226-4c1d-b875-94a5a03a91f1'),
            ('C.M. Euclydes José Borges', 'Denise Spoliante Salutti', 'Rua Salim Francisco do Nascimento, nº (Antiga Rua 41) - Engenho - Itaguaí/RJ - CEP: 23820-100', '(21) 96468-9552', 'cm.euclydesjoseborges@edu.itaguai.rj.gov.br', None, '0180b6c6-c49b-43fc-b70d-f4807151b32c'),
            ('C.M. Florentino Elias', 'MARIA ROZINETE MOREIRA DE OLIVEIRA', 'Rua das Tulipas, s/n - Parque Primavera - Itaguaí/RJ - CEP: 23830-400', '(21) 97572-8405', 'cm.florentinoelias@edu.itaguai.rj.gov.br', None, 'a28076db-4a53-459d-8ef8-978dc7acc7dd'),
            ('C.M. Francisco Xavier de Moura Brito (Chico Pitanga)', 'Veronice Felix (21) 986805418', 'Rua Manoel Soares da Costa, s/n - Engenho - Itaguaí/RJ - CEP: 23821-740', '(21) 98680-5418', 'cm.franciscoxavierdemourabrito@edu.itaguai.rj.gov.br', None, 'cf3282c0-cd0e-41fc-a040-a93ec0cfeb59'),
            ('C.M. Maria Eduviges do Rosario Silva', 'ADRIANA CHAVES PIRES', 'Rua Madalena Tortorrele, nº 20 (Qd. 62) - Brisamar - Itaguaí/RJ - CEP: 23825-590', '(21) 98374-7329', 'cm.mariaeduvigesdorosariosilva@edu.itaguai.rj.gov.br', None, '9ace17a3-764d-47d7-a9ab-2275d5434daf'),
            ('C.M. Maria Rosa Gomes do Nascimento', 'JANILZA MARIA BISPO', 'Rua Genecildo Aguiar Vieira Teixeira, s/n - Teixeira - Itaguaí/RJ', '21 97206-8628', 'cm.mariarosagomesdonascimento@edu.itaguai.rj.gov.br', None, '4882aaf0-cd12-429f-8727-694a1d1d281e'),
            ('C.M. Prof.ª Eliane Lopes Barbosa (Vila Geni)', 'INGRID CARVALHO COSTA', 'Rua Odilon Penolon Fialho, s/n - Vila Geny - Itaguaí/RJ - CEP: 23825-160', '(21) 97177-4700', 'cm.elianelopesbarbosa@edu.itaguai.rj.gov.br', None, 'b8fe1f4d-9fa8-464a-b403-443b54ffd127'),
            ('C.M. Prof.º Goethe Coutinho Madruga', 'ANDREZA AZEVEDO DOS SANTOS', 'Rua dos Coqueiros, s/n (Qd. 39) - Jardim Mar - Itaguaí/RJ - CEP: 23823-120', '(21) 97990-5973', 'cm.jardimmar@edu.itaguai.rj.gov.br', None, 'e9680a99-5867-4252-a9b1-0117f5b98ceb'),
            ('C.M. Prof.º Joaquim Inouê', 'ROSANGELA NASCIMENTO DA SILVA', 'Rua Dezoito, s/n (Qd. 22, Gleba A) - Chaperó - Itaguaí/RJ - CEP: 23815-000', '21 99261-9889', 'cm.joaquiminoue@edu.itaguai.rj.gov.br', None, 'b15ce9fa-0288-405f-be14-307d0b58176c'),
            ('C.M. Prof.ª Maria de Lurdes S. Garcia', 'ELISABETE ALVES DE OLIVEIRA RAMOS', 'Rua Machado de Assis, s/n - Vila Ibirapitanga - Itaguaí/RJ - CEP: 23811-820', '21 97145-3594', 'cm.mariadelurdessgarcia@edu.itaguai.rj.gov.br', None, 'eebe50f4-2abc-4437-9e51-68283ef3da5d'),
            ('C.M. Prof.ª M.ª Cristina Padela Cabral da Silva', 'RENATA MENDES VALVERDE DE OLIVEIRA GONCALVES', 'Rua Pref. José de Moraes Dias, s/n (Lote 18) - Parque Paraíso - Itaguaí/RJ - CEP: 23810-211', '(21) 96437-7241', 'cm.mariacristinapadelacabraldasilva@edu.itaguai.rj.gov.br', None, '03d5a82b-ef2f-4614-a020-5259bfafa502'),
            ('C.M. Prof.º Renato Barbosa Ladislau', 'Caroline Pedrazzi de Almeida Vieira', 'Estrada do Mazomba, s/n - Leandro - Itaguaí/RJ - CEP: 23830-000', '(21) 99422-5843', 'cm.renatobarbosaladislau@edu.itaguai.rj.gov.br', None, '608c43e0-f2ba-444d-953f-6748c14cf64c'),
            ('C.M. Prof.ª Tania Mara Mota de Menezes', 'ERICA CRISTINA OLIVEIRA DA SILVA', 'Rua Antônio Batista Ramos, s/n (Lt 39, Qd 18) - Brisamar - Itaguaí/RJ - CEP: 23826-155', '21 96855-3018', 'cm.taniamaramottademenezes@edu.itaguai.rj.gov.br', None, 'a6c18879-5445-4156-9778-aa05a039fdcc'),
            ('C.M. Profª Teresinha de Jesus Campos de Farias', 'Lucia Sayuri Yokoyama Sagava', 'R. Antônio M Pereira, nº 149 - Itaguaí/RJ', '21 985232368', 'cm.teresinhadejesuscamposdefarias@edu.itaguai.rj.gov.br', None, '55c3c54c-82d3-437c-acd0-98b5cc97781a'),
            ('C.M. Rita Ferreira Feijó', 'CAROLINA MONTEIRO DO NASCIMENTO PEDRO', 'Av. Guilherme Serrano, s/n (Lotes 8, Quadra C) - Vila Geny - Itaguaí/RJ - CEP: 23825-480', '21 99326-2233', 'cm.ritaferreirafeijo@edu.itaguai.rj.gov.br/', None, '558c9613-d276-4ebc-b9e0-95aa0d597912'),
            ('C.M. Vereador José Antônio Carrasco', 'ANA CRISTINA BELMONTE LIMA PINHA', 'Rua Eduardo de Oliveira Júnior, s/n - Estrela do Geny - Itaguaí/RJ - CEP: 23811-480', '21 98573-6422', 'cm.estreladoceu@edu.itaguai.rj.gov.br', None, '2db1d115-97ba-46d7-917b-55267e801798'),
            ('Colégio M. Senador Teotônio Vilella', 'Cássia Regina R. da Silva', 'Rua Ivete Lino Ribeiro, nº 22 - Centro - Itaguaí/RJ - CEP: 23810-540', '(21) 97026-4258', 'cm.senadorteotoniovilella@edu.itaguai.rj.gov.br', None, 'afaf97d9-fa67-4b61-b580-5d88911f1ca0'),
            ('CRECHE M. PROF. TERESINHA DE JESUS CAMPOS DE FARIAS', 'LUCIA SAYURI YOKOYAMA SAGAVA', 'Itaguaí - RJ', '21 98523-2368', None, None, 'bd5ca15e-0c9e-4428-8c02-138596b34dca'),
            ('E. E. M. Camilo Cuquejo', 'NATALINA ALVES BATISTA', 'Estr. Jair Pereira Nascimento, s/n - Ma Geny - Itaguaí/RJ - CEP: 23830-330', '21 96476-3838', 'eem.camilocuquejo@edu.itaguai.rj.gov.br/ eemcamilocuquejo@gmail.com', None, '19b35c4f-28d4-487f-8c60-37717385a41e'),
            ('E. E. M. Carmem Menezes Direito', 'CLAUDIA REGINA DE LIMA SANTIAGO', 'Rua Manoel Araújo dos Santos, nº 1043 - Brisamar - Itaguaí/RJ - CEP: 23825-435', '21 96425-1829', 'eem.carmemmenezesdireito@edu.itaguai.rj.gov.br carmem.menezes.adm@gmail.com', None, 'df6272f1-4cfa-42af-b9aa-f61dcbcbbe1a'),
            ('E. E. M. Chaperó', 'THAIS SILVA DE SOUZA', 'Rua Dezesseis, s/n (Gleba B) - Chaperó - Itaguaí/RJ - CEP: 23835-000', '21 99499-1646', 'eem.chapero@edu.itaguai.rj.gov.br', None, '536e89e8-ea1c-4a30-83e7-006490a5c304'),
            ('E. E. M. Fazenda Santa Cândida', 'ANA CRISTINA BORGES DE SANTANA', 'Rua Altamiro Domiciano da Cruz, s/n - Santa Cândida - Itaguaí/RJ - CEP: 23830-640', '21 96573-1339', 'eem.fazsantacandida@edu.itaguai.rj.gov.br', None, '8c2ed8c0-0e78-43ba-bb4f-a7859805cc20'),
            ('E. E. M. Mazomba - Dr. Jorge Abrahão', 'FERNANDA LIMA FELICIANO PINTO', 'Estrada do Mazomba, nº 22 - Mazomba - Itaguaí/RJ - CEP: 23830-250', '21 96436-0626', 'eem.drjorgeabrahao@edu.itaguai.rj.gov.br', None, '56d9b8b3-48bf-4c58-beb9-f247c14cea5e'),
            ('E. E. M. Santa Rosa', 'MARLI DOS SANTOS FERNANDES', 'Estrada Santa Rosa, nº 2587 - Santa Rosa - Itaguaí/RJ - CEP: 23855-205', '21 99690-6262', 'eem.santarosa@edu.itaguai.rj.gov.br', None, 'a0b20bb8-a32a-43a8-be6a-23c28fb0506f'),
            ('E. E. M. Taciano Basílio', 'DAYSE ADRIANA SODRE GONCALVES', 'Estr.Bom Jardim, nº 953 ((Estr. Caçador)) - Saco da Prata - Itaguaí/RJ - CEP: 23835-700', '21 97471-8656', 'eem.tacianobasilio@edu.itaguai.rj.gov.br', None, '13a13a48-b76b-4235-87d2-b825917dac3a'),
            ('E. M. Alexandre Ignácio', 'SANDRA DIAS PIMENTA DA SILVA', 'Estrada do Caçador, s/n - Ibituporanga - Itaguaí/RJ - CEP: 23835-090', '21 97060-1512', 'em.alexandreignacio@edu.itaguai.rj.gov.br', None, '073ab9da-0276-45ff-8ab6-072c8dce1567'),
            ('E. M. Amauri Ferreira', 'ILONIA MARCIA DE MIRANDA PAULO', 'Rua Guilherme Serrano, s/n - Vila Geny - Itaguaí/RJ - CEP: 23825-480', '21 97360-1960', 'em.amauriferreira@edu.itaguai.rj.gov.br', None, 'a2d22cfe-e258-43de-bf95-7d1626db9a7a'),
            ('E. M. Antônio Tupinambá', 'MONICA DE LIMA DRUMOND', 'Rua Júlio Verne,, s/n - Vila Margarida - Itaguaí/RJ - CEP: 23820-770', '(21) 99101-6799', 'em.antoniotupinamba@edu.itaguai.rj.gov.br', None, '65a98c71-580e-45dc-b5c2-08a9940b4cdc'),
            ('E. M. Argentina Coutinho', 'JULIANA AVILEZ', 'Rua Pedro Pacheco, s/n - Brisamar - Itaguaí/RJ - CEP: 23825-205', '21 98063-3998', 'em.argentinacoutinho@edu.itaguai.rj.gov.br', None, '0022776c-f85f-4b2b-b6a1-e95dca34c2aa'),
            ('E. M. Coronel Alziro Santiago', 'ROBERTA OLIVEIRA DA SILVA GALDINO', 'Estrada do Mazomba, s/n - Mazomba - Itaguaí/RJ - CEP: 23830-250', '21 97012-4395', 'em.celalzirosantiago@edu.itaguai.rj.gov.br', None, '15ac96a0-1a7b-40cf-ad46-a8380dc60a78'),
            ('E. M. das Acácias', 'CAMILA LOPES SABINO FONSECA', 'Rua das Camélias,, s/n (Qd 131) - Parque Primavera - Itaguaí/RJ - CEP: 23830-395', '21 99295-4593', 'em.acacias@edu.itaguai.rj.gov.br', None, 'b8590fd5-1050-4a04-8632-c4db93d8ddd3'),
            ('E. M. de Educação Infantil Hypolito Vieira de Carvalho', 'SONIA ISABEL VALENTIM COSTA MACHADO', 'Rua Estados Unidos, nº 66 - Jardim América - Itaguaí/RJ - CEP: 23810-100', '21 97633-6683', 'emei.hypolitovieradecarvalho@edu.itaguai.rj.gov.br', None, '61345a18-800e-49d3-8395-e0be1f6d4853'),
            ('E. M. de Educação Infantil Monteiro Lobato', 'DÉBORA DOMINGOS CARNEIRO', 'Rua Kaisser Abraão, nº 9 - Mont Serrat - Itaguaí/RJ - CEP: 23810-560', '21 98062-0658', 'emei.monteirolobato@edu.itaguai.rj.gov.br', None, 'a4bcd7be-709f-41f4-8884-cf5b8f2279df'),
            ('E. M. de Educação Infantil Pref. Isoldackson Cruz de Brito', 'Marinalda de Lima Lemes', 'Rua Dezesseis, nº 180 (Bleba B) - Gleba B - Chaperó - Itaguaí/RJ - CEP: 23812-285', '(21) 99226-8412', 'emei.prefisoldacksoncruzdebrito@edu.itaguai.rj.gov.br', None, '73f6df36-8765-40c3-acc5-dbdbd7c27aca'),
            ('E. M. Eider Ribeiro Dantas', 'JOSENI DE SOUZA BARRETO BARBOSA', 'Rua Argentina da Silva Coutinho, s/n (Lote 11 - Qd 52) - Brisamar - Itaguaí/RJ - CEP: 23825-210', '21 96667-0417', 'em.eiderribeirodantas@edu.itaguai.rj.gov.br', None, 'bd92c0ea-d8ec-4e8f-9d5d-33016e3e940f'),
            ('E. M. Elmira Figueira', 'SONIA REGINA SILVA DE OLIVEIRA BARBOSA', 'Rua Tocantins, s/n - Estrela do Céu - Itaguaí/RJ - CEP: 23815-180', '21 96465-2372', 'em.elmirafigueira@edu.itaguai.rj.gov.br', None, '13501024-7e2f-4272-aa62-b83142002314'),
            ('E. M. Elmo Baptista Coelho', 'DANNUBIA', 'Est Joaquim Fernandes, nº 407/409 - Ilha da Madeira - Itaguaí/RJ - CEP: 23821-450', '(21) 98228-8351', 'em.elmobaptistacoelho@edu.itaguai.rj.gov.br', None, 'a5d3e651-627b-4503-b55f-f55a73a334d1'),
            ('E. M. Fusao Fukamati', 'KILSA CRISTINA ARANTES GONCALVES SILVA', 'Rua Dezoito, s/n (Quadra 18, Gleba A) - Chaperó - Itaguaí/RJ - CEP: 23835-000', '21 99359-1145', 'em.fusaofukmati@edu.itaguai.gov.br', None, '65a45236-8c51-4d8f-9eae-d8e97de66950'),
            ('E. M. João Vicente Soares', 'LUCIANA KARLA DE OLIVEIRA CICARINO', 'Av. Machado de Assis c/ a Rua Cesar Lattes, s/n - Vila Ibirapitanga - Itaguaí/RJ - CEP: 23811-140', '21 96424-5859', 'em.joaovicentesoares@edu.itaguai.rj.gov.br', None, '6d2574af-9599-4027-acaf-fb088dca7d20'),
            ('E. M. Jorge Flores da Silva', 'LEANDRO FERREIRA', 'Rua Ary Parreira esquina com Estrada do Tronco, s/n - Weda - Itaguaí/RJ - CEP: 23820-303', '21 98711-9622', 'em.jorgefloresdasilva@edu.itaguai.rj.gov.br', None, '7083e4b9-43e5-48b2-9664-0255d9d5528d'),
            ('E. M. Oscar José de Souza', 'ERIKA FRANCISCA FERREIRA SILVA DE MATOS', 'Rua Lucia Tieme Hara, s/n - Santana - Itaguaí/RJ - CEP: 23810-170', '21 97133-0378', 'em.oscarjosedesouza@edu.itaguai.rj.gov.br', None, '6a4f5b1b-0745-4a5d-a5e3-47227c91beb2'),
            ('E. M. Padre Rafael Scarfó', 'LILIAN KELLY AMARAL DE SOUZA EUGENIO', 'Rua Elvira Ciuffo Cicarino, nº 40 - Vila Margarida - Itaguaí/RJ - CEP: 23821-135', '21 96415-3882', 'em.padrerafaelscarfo@edu.itaguai.rj.gov.br', None, '1a585773-7d2d-439f-88d9-0b8fd1b23b75'),
            ('E. M. Prefeito Abeilard Goulart de Souza', 'DAYANE LIMA FELICIANO PINTO', 'R. Jonas Costa Pereira, s/n - Parque Paraíso - Itaguaí/RJ - CEP: 23815-100', '21 98657-6449', 'em.prefalbeilardgoulartdesouza@edu.itaguai.rj.gov.br', None, 'd44b44d7-503b-4e38-94cf-d8b3f44f3b06'),
            ('E. M. Prefeito Otoni Rocha', 'TANIA MARIA DA SILVA MEDEIROS', 'RuaTravessa Pedro Augusto, s/n - Centro - Itaguaí/RJ - CEP: 23821-210', '21 98414-8338', 'em.prefotonirocha@edu.itaguai.rj.gov.br', None, '1cefd2ff-55ea-449d-a94e-6b7dcea4453a'),
            ('E. M. Prefeito Wilson Pedro Francisco', 'IVANETE FERREIRA DE SIQUEIRA', 'Estrada do Teixeira, s/n (lote 25, Quadra 06) - Vista Alegre - Itaguaí/RJ - CEP: 23820-275', '21 98288-3163', 'em.prefwilsonpedrofrancisco@edu.itaguai.rj.gov.br', None, '6be9001d-16d8-4249-8bb8-77eefbc6b788'),
            ('E. M. Prof.ª Maria Guilhermina de Souza Farias', 'THAIS RIBEIRO CORREA PINTO', 'Estrada Engenheiro Ivan Mundin, s/n - Leandro - Itaguaí/RJ - CEP: 23830-250', '21 96474-6039', 'em.mariaguilherminadesouzafreire@edu.itaguai.rj.gov.br', None, '4e4fb381-5582-4f04-8a09-6f7e27e446d1'),
            ('E. M. Profª. Marianilde Siqueira Gonçalves', 'SANDRO CORRÊA', 'Rua Capitao Landulfo Alves de Almeida, s/n (Qd39) - Jardim Mar - Itaguaí/RJ - CEP: 23823-000', '21 97033-4403', 'em.jardimmar@edu.itaguai.rj.gov.br', None, '0f5c41ee-9227-4cea-89d8-b8eb6310c61c'),
            ('E. M. Prof.ª Severina dos Ramos de Sousa', 'FLAVIO COSME ROCHA DE LIMA', 'Rua Evelina Reis e Geny Reis, s/n (Lotes 25, 26 e 27) - Vila Geny - Itaguaí/RJ - CEP: 23825-350', '21 96467-1717', 'em.severinadosramosdesousa@edu.itaguai.rj.gov.br', None, '1e348461-0da0-4b59-a14f-db42af063503'),
            ('E. M. Prof.ª Yolanda Rangel Pereira', 'MARGARETH FERREIRA', 'Rua Francisco Costa Pereira, s/n - Engenho - Itaguaí/RJ - CEP: 23820-240', '21 98650-4463', 'em.yolandarangelpereira@edu.itaguai.rj.gov.br', None, 'a2c2a3e9-97d5-4466-8f40-f92a10bc4d09'),
            ('E. M. Renato Gonçalves Martins', 'Lusmar Moraes Barbosa', 'Est. Jose Paulo Andrade, nº 2584 - Chaperó - Itaguaí/RJ - CEP: 23855-120', '(21) 97581-1877', 'em.renatogoncalvesmartins@edu.itaguai.rj.gov.br', None, '0f1883eb-8814-42d5-8d50-51476a67dd14'),
            ('E. M. Severino Salustiano de Freitas', 'INA DANIELA DE OLIVEIRA TAMAKI', 'Rua Genecildo A Vieira, s/n (esquina com Rua 2) - Teixeira - Itaguaí/RJ - CEP: 23820-270', '21 97579-5737', 'em.severinosalustianodefrarias@edu.itaguai.rj.gov.br', None, '5be3e450-d3a7-4763-b191-83f5629ec59f'),
            ('E. M. São Sebastião', 'MARINALVA DOS SANTOS CONDE', 'Estr. Zeferino Goulart, s/n - Raiz da Serra - Itaguaí/RJ - CEP: 23830-000', '21 98819-5235', 'em.saosebastiao@edu.itaguai.rj.gov.br', None, '5a7eaffb-e3e0-4772-8b1e-ecdec8d3c146'),
            ('E. M. Sylvia Souza Siquineli', 'ROGERIA TAVARES', 'Estr. Décio Muniz da Silva Filho, nº 1006 (, Lagoa Nova, Gleba B) - Chaperó - Itaguaí/RJ - CEP: 23831-300', '21 99103-3333', None, None, 'f4d35649-c605-42f1-8ead-59255f76d752'),
            ('E. M. Tereza de Araújo Sagário', 'DAYANE RODRIGUES DA CONCEIÇÃO MOURA', 'Av. Tabajara, s/n - Ibirapitanga - Itaguaí/RJ - CEP: 23812-150', '21 97514-0994', 'em.terezadearaujosagario@edu.itaguai.rj.gov.br', None, '928521e6-e869-425f-88fb-0e4d939767fd'),
            ('E. M. Vereador Américo Rodrigues de Amorim', 'Luciane Leal do Valle', 'R Sebastião Bruno de Oliveira, s/n - Itimirim - Itaguaí/RJ - CEP: 23826-320', '(21) 99228-3003', 'em.veramericorodriguesdeamorim@edu.itaguai.rj.gov.br', None, '8782b024-8651-4a01-85af-9118a2d8f488'),
            ('E. M. Vereador José Galliaço Prata', 'MARCELO DONIZETE DE BARROS', 'Estrada do Teixeira, s/n - Amendoeira - Itaguaí/RJ - CEP: 23820-275', '21 99374-4482', 'em.vereadorgalliacoprata@edu.itaguai.rj.gov.br', None, 'a3622b18-9a09-4536-b9c1-0a1d3d79c010'),
            ('E. M. Vereador Taciano Fernandes Nunes', 'ROSINEIA ALVES BATISTA', 'Av. Gov. Mario Covas, nº 36 - Brisamar - Itaguaí/RJ - CEP: 23826-240', '21 96415-4572', 'em.vertaianofernandesnunes@edu.itaguai.rj.gov.br', None, 'c51e906f-a897-4134-8918-eb4183875c1e'),
            ('E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO', 'MARIA JOSE DE ANDRADE MARIANO', 'Itaguaí/RJ', '21 96931-0516', 'em.verprofessorarthurbritodecastro@edu.itaguai.rj.gov.br', None, 'aff3d54e-e671-4f6f-9248-a4197f49dd3a'),
        ]
        conn.executemany("INSERT INTO schools(name,director,address,phone,email,code,external_id) VALUES(?,?,?,?,?,?,?)", schools)

    if conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"] == 0:
        school_id = conn.execute("SELECT id FROM schools ORDER BY id LIMIT 1").fetchone()["id"]
        users = [
            ("Gestor da Infraestrutura", "gestor@agenda.local", hash_password("Gestor@2026"), "gestor", None),
            ("Direção Escolar", "escola@agenda.local", hash_password("Escola@2026"), "escola", school_id),
            ("Equipe de Planejamento", "planejamento@agenda.local", hash_password("Planeja@2026"), "planejamento", None),
        ]
        conn.executemany("INSERT INTO users(name,email,password_hash,role,school_id) VALUES(?,?,?,?,?)", users)

    if conn.execute("SELECT COUNT(*) c FROM demands").fetchone()["c"] == 0:
        schools = [r["id"] for r in conn.execute("SELECT id FROM schools ORDER BY id").fetchall()]
        samples = [
            ("Reparo de infiltração no telhado — Bloco B", "Infiltração intensa em duas salas durante períodos de chuva, com risco de dano ao forro e interrupção das aulas.", "Cobertura/Telhado", "Sala 3 / Bloco B", "Risco à estrutura e às atividades pedagógicas", 64, 1, 1, schools[0], "P1", "Em execução", 5, "Equipe de manutenção predial", "Infraestrutura", 15400, "Reparo emergencial da cobertura e impermeabilização", "Vistoria confirmou falha na membrana de impermeabilização.", "Compra pontual de manta e agendamento da equipe", 1, 1, 1, 0, None),
            ("Substituição da trava do portão principal", "Trava do portão principal danificada, dificultando o controle seguro do acesso à unidade.", "Serralheria", "Portão principal", "Impacto direto na segurança do acesso", 420, 1, 0, schools[3], "P2", "Aguardando contratação", 10, "Empresa terceirizada", "Infraestrutura", 3200, "Substituição da fechadura e reforço da estrutura", "Necessária contratação de serralheria.", "Contratação de empresa especializada", 0, 1, 1, 1, None),
            ("Pintura das salas de aula", "Paredes com desgaste de pintura e marcas de umidade já sanadas.", "Pintura", "Bloco pedagógico", "Melhoria do ambiente escolar", 280, 0, 0, schools[1], "P3", "Serviço programado", 35, "Equipe de manutenção", "Infraestrutura", 9800, "Pintura prevista para o próximo recesso", "Serviço pode ser executado sem urgência.", "Recesso escolar", 0, 1, 1, 0, None),
            ("Construção de rampa de acessibilidade", "Adequação do acesso ao refeitório para garantir acessibilidade.", "Acessibilidade", "Acesso ao refeitório", "Acessibilidade e inclusão", 45, 0, 0, schools[2], "P4", "Planejamento futuro", 180, "Equipe de projetos", "Planejamento", 78000, "Elaboração de projeto e contratação futura", "Demanda requer projeto executivo e previsão orçamentária.", "Projeto, orçamento e licitação", 1, 1, 1, 1, 2027),
            ("Revisão do quadro elétrico", "Quadro elétrico apresenta aquecimento em períodos de maior consumo.", "Elétrica", "Cozinha", "Risco operacional e possível interrupção", 75, 1, 1, schools[4], "P1", "Em análise técnica", 3, "Engenharia elétrica", "Infraestrutura", 12000, "", "Aguardando medição de carga.", "Visita técnica especializada", 1, 1, 0, 0, None),
            ("Aquisição de aparelhos de ar-condicionado", "Necessidade de renovação de equipamentos antigos e inoperantes.", "Climatização", "Salas de aula", "Conforto térmico e continuidade das atividades", 310, 0, 0, schools[5], "P4", "Planejamento futuro", 220, "Planejamento de compras", "Planejamento", 145000, "Consolidar com demandas de outras unidades para licitação", "Demanda adequada para aquisição consolidada.", "Planejamento orçamentário e licitação", 0, 1, 1, 1, 2027),
            ("Reparo de vazamento na cozinha", "Vazamento contínuo sob pia industrial, causando acúmulo de água.", "Hidráulica", "Cozinha", "Risco de queda e prejuízo à rotina da alimentação escolar", 35, 1, 1, schools[0], "P2", "Concluída", -2, "Equipe hidráulica", "Infraestrutura", 950, "Troca de conexão e vedação", "Atendimento concluído e validado pela direção.", "", 0, 0, 1, 0, None),
            ("Recomposição do muro lateral", "Trecho de muro apresenta fissuras e pontos de desprendimento.", "Estrutura", "Limite lateral", "Segurança patrimonial", 190, 1, 0, schools[1], "P2", "Reprogramada", -4, "Equipe de obras", "Infraestrutura", 28000, "Escoramento preventivo e recomposição", "Prazo reprogramado por indisponibilidade de material.", "Material específico", 1, 1, 1, 0, None),
        ]
        for i, s in enumerate(samples, start=1):
            created = datetime.now() - timedelta(days=18 - i)
            due = (datetime.now() + timedelta(days=s[11])).date().isoformat()
            cur = conn.execute(
                """INSERT INTO demands(title,description,category,location,impact,affected_people,risk,blocks_activity,school_id,priority,status,created_at,updated_at,due_date,responsible,sector,cost_estimate,action_defined,technical_opinion,dependencies,needs_visit,needs_budget,needs_material,needs_contract,future_year,created_by)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""",
                (s[0],s[1],s[2],s[3],s[4],s[5],s[6],s[7],s[8],s[9],s[10],created.isoformat(sep=" ", timespec="seconds"),created.isoformat(sep=" ", timespec="seconds"),due,s[12],s[13],s[14],s[15],s[16],s[17],s[18],s[19],s[20],s[21],s[22])
            )
            did = cur.lastrowid
            code = f"INF-{created.year}-{did:05d}"
            conn.execute("UPDATE demands SET code=? WHERE id=?", (code, did))
            conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,created_at) VALUES(?,?,?,?,?)",
                         (did, "Criação", "Demanda registrada no sistema.", "Sistema", created.isoformat(sep=" ", timespec="seconds")))
            if s[10] != "Nova":
                conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,created_at) VALUES(?,?,?,?,?)",
                             (did, "Status", f"Status atualizado para {s[10]}.", "Equipe de Infraestrutura", (created + timedelta(days=1)).isoformat(sep=" ", timespec="seconds")))

    if conn.execute("SELECT COUNT(*) c FROM planning_items").fetchone()["c"] == 0:
        items = [
            (2027, "Aquisição de aparelhos de ar-condicionado Split 12k BTU", "Climatização", "Aquisição futura", "Aprovada para planejamento", 145000, 41, "un", "Consolidar necessidades de climatização de 12 unidades.", 12),
            (2027, "Atualização de infraestrutura de rede (Cat6a)", "Equipamentos", "Contratação futura", "Em levantamento", 85500, 8, "unidades", "Modernização de rede lógica e cabeamento estruturado.", 8),
            (2027, "Reposição de equipamentos de laboratório", "Equipamentos", "Aquisição futura", "Aguardando estimativa", 32000, 18, "itens", "Reposição de equipamentos danificados e obsoletos.", 5),
            (2028, "Projeto de instalação de painéis solares — Fase 1", "Obra", "Projeto futuro", "Rascunho", 450000, 3, "unidades", "Projeto-piloto de eficiência energética.", 3),
        ]
        for idx, item in enumerate(items, start=1):
            cur = conn.execute("""INSERT INTO planning_items(year,title,category,kind,status,estimated_cost,quantity,unit,justification,schools_count,created_at,updated_at)
                                  VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                               (*item, now_iso(), now_iso()))
            conn.execute("UPDATE planning_items SET code=? WHERE id=?", (f"PLAN-{item[0]}-{cur.lastrowid:04d}", cur.lastrowid))

    # Categorias, prioridades, colunas do Kanban e perfis de acesso — semeados uma única vez a
    # partir dos valores que já existiam fixos no código; depois disso, editáveis em Administração.
    if conn.execute("SELECT COUNT(*) c FROM categories").fetchone()["c"] == 0:
        color_cycle = ['red', 'orange', 'teal', 'violet', 'green', 'blue']
        for i, name in enumerate(CATEGORIES):
            conn.execute(
                "INSERT INTO categories(name,icon,color,hint,sort_order,active) VALUES(?,?,?,?,?,1)",
                (name, CATEGORY_ICONS.get(name, 'wrench'), color_cycle[i % len(color_cycle)], CATEGORY_HINTS.get(name, ''), i),
            )

    if conn.execute("SELECT COUNT(*) c FROM priority_levels").fetchone()["c"] == 0:
        priority_seed = [
            ("P1", "Urgente", "Risco agora ou impede a aula", "red", 1),
            ("P2", "Alta", "Já incomoda a rotina da escola", "orange", 2),
            ("P3", "Programada", "Não atrapalha o dia a dia agora", "blue", 3),
            ("P4", "Planejamento/Projeto", "Reservada para um exercício futuro", "green", 4),
        ]
        conn.executemany("INSERT INTO priority_levels(code,label,hint,color,rank) VALUES(?,?,?,?,?)", priority_seed)

    if conn.execute("SELECT COUNT(*) c FROM kanban_stages").fetchone()["c"] == 0:
        stage_seed = [
            ("novas", "Novas", "Acabaram de chegar, ainda sem triagem", "blue", ["Nova", "Recebida"], "Recebida"),
            ("analise", "Em Análise", "Triagem, avaliação técnica ou visita agendada", "orange",
             ["Em triagem", "Em análise técnica", "Aguardando informações da escola", "Visita técnica agendada"], "Em análise técnica"),
            ("aguardando", "Aguardando", "Depende de material, orçamento, contratação ou outro setor", "violet",
             ["Em planejamento", "Aguardando material", "Aguardando orçamento", "Aguardando contratação", "Aguardando empresa",
              "Encaminhada para outro setor", "Reprogramada"], "Aguardando contratação"),
            ("execucao", "Em Execução", "Serviço programado ou em andamento", "teal",
             ["Serviço programado", "Em execução", "Parcialmente executada"], "Em execução"),
            ("futuro", "Planejamento Futuro", "Reservada para um exercício futuro", "blue", ["Planejamento futuro"], "Planejamento futuro"),
            ("concluida", "Concluída", "Atendimento finalizado", "green", ["Concluída"], "Concluída"),
            ("cancelada", "Cancelada", "Encerrada sem execução", "red", ["Cancelada"], "Cancelada"),
        ]
        for i, (key, label, hint, accent, statuses, target) in enumerate(stage_seed):
            conn.execute(
                "INSERT INTO kanban_stages(stage_key,label,hint,accent,statuses,target_status,sort_order) VALUES(?,?,?,?,?,?,?)",
                (key, label, hint, accent, json.dumps(statuses, ensure_ascii=False), target, i),
            )

    if conn.execute("SELECT COUNT(*) c FROM access_profiles").fetchone()["c"] == 0:
        profile_seed = [
            ("gestor", "Gestor da Infraestrutura", "Visão completa, análise técnica, priorização, relatórios e administração.", 0, 1, 1, 1, 1),
            ("escola", "Unidade Escolar", "Cadastro e acompanhamento das demandas da própria unidade.", 1, 0, 0, 0, 0),
            ("planejamento", "Planejamento", "Consolidação de demandas futuras, exercícios e planejamento orçamentário.", 0, 1, 0, 1, 1),
        ]
        for slug, label, desc, school_scoped, can_edit_analysis, can_manage_admin, can_view_reports, can_view_planning in profile_seed:
            conn.execute(
                """INSERT INTO access_profiles(slug,label,description,school_scoped,can_edit_analysis,can_manage_admin,can_view_reports,can_view_planning,is_system,created_at)
                   VALUES(?,?,?,?,?,?,?,?,1,?)""",
                (slug, label, desc, school_scoped, can_edit_analysis, can_manage_admin, can_view_reports, can_view_planning, now_iso()),
            )

    conn.commit()
    seed_school_coordinates(conn)
    conn.close()


def seed_school_coordinates(conn: sqlite3.Connection) -> None:
    schools = conn.execute("SELECT id, name, address, lat, lon FROM schools").fetchall()
    zones = {
        "chaperó": (-22.8350, -43.7450),
        "brisamar": (-22.8850, -43.7950),
        "engenho": (-22.8690, -43.7680),
        "santana": (-22.8540, -43.7820),
        "coroa grande": (-22.9100, -43.8350),
        "geni": (-22.8780, -43.7880),
        "geny": (-22.8780, -43.7880),
        "mazomba": (-22.8420, -43.8150),
        "primavera": (-22.8580, -43.7650),
        "vista alegre": (-22.8520, -43.7580),
        "ibirapitanga": (-22.8710, -43.7800),
        "jardim américa": (-22.8670, -43.7720),
        "jardim mar": (-22.8820, -43.7910),
        "teixeira": (-22.8480, -43.7600),
        "centro": (-22.8622, -43.7758),
    }
    for r in schools:
        if r["lat"] is not None and r["lon"] is not None:
            continue
        text = f"{r['name']} {r['address'] or ''}".lower()
        base_lat, base_lon = (-22.8622, -43.7758)
        for k, coords in zones.items():
            if k in text:
                base_lat, base_lon = coords
                break
        sid = r["id"]
        lat_offset = (((sid * 17) % 31) - 15) * 0.0012
        lon_offset = (((sid * 23) % 37) - 18) * 0.0012
        conn.execute("UPDATE schools SET lat=?, lon=? WHERE id=?", (round(base_lat + lat_offset, 6), round(base_lon + lon_offset, 6), sid))
    conn.commit()


init_db()


def current_user(request: Request):
    uid = request.session.get("user_id")
    if not uid:
        return None
    conn = db()
    row = conn.execute(
        "SELECT u.id,u.name,u.email,u.role,u.school_id,u.active,s.name school_name FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.id=?",
        (uid,),
    ).fetchone()
    if not row or not row["active"]:
        conn.close()
        return None
    result = dict(row)
    profile = get_profile_by_slug(conn, result["role"])
    conn.close()
    result["perm"] = perm_from_profile(profile)
    result["profile_label"] = profile["label"] if profile else result["role"]
    return result


def require_user(request: Request):
    user = current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return user


def render(request: Request, template: str, **context):
    user = current_user(request)
    if not user:
        return RedirectResponse("/login", status_code=303)
    conn = db()
    priority_rows = get_priorities(conn)
    priorities = {r["code"]: {"label": r["label"], "rank": r["rank"], "hint": r["hint"], "color": r["color"]} for r in priority_rows} or PRIORITIES
    active_categories = get_categories(conn, only_active=True)
    all_categories = get_categories(conn, only_active=False)
    category_names = [c["name"] for c in active_categories] or CATEGORIES
    category_meta = {c["name"]: {"icon": c["icon"], "color": c["color"], "hint": c["hint"]} for c in all_categories}
    kanban_stages = get_kanban_stages(conn)
    conn.close()
    base = {
        "request": request,
        "user": user,
        "priorities": priorities,
        "statuses": STATUSES,
        "categories": category_names,
        "category_meta": category_meta,
        "kanban_stages": kanban_stages,
        "today": date.today().isoformat(),
    }
    base.update(context)
    return templates.TemplateResponse(template, base)


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    if current_user(request):
        return RedirectResponse("/", status_code=303)
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    conn = db()
    row = conn.execute("SELECT * FROM users WHERE lower(email)=lower(?)", (email.strip(),)).fetchone()
    conn.close()
    if not row or not verify_password(password, row["password_hash"]):
        return templates.TemplateResponse("login.html", {"request": request, "error": "E-mail ou senha inválidos.", "email": email}, status_code=401)
    request.session["user_id"] = row["id"]
    return RedirectResponse("/", status_code=303)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    return render(request, "index.html", page="dashboard", title="Visão Geral")


@app.get("/demandas", response_class=HTMLResponse)
def demands_page(request: Request):
    return render(request, "index.html", page="demands", title="Demandas Escolares")


@app.get("/demandas/{demand_id}", response_class=HTMLResponse)
def demand_detail_page(request: Request, demand_id: int):
    conn = db()
    row = conn.execute("SELECT id, code, title FROM demands WHERE id=?", (demand_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404)
    return render(request, "index.html", page="demand-detail", title=row["title"], entity_id=demand_id)


@app.get("/mapa", response_class=HTMLResponse)
def map_page(request: Request):
    return render(request, "index.html", page="map", title="Mapa Operacional da Rede")


@app.get("/kanban")
def kanban_page():
    return RedirectResponse("/mapa", status_code=303)


@app.get("/planejamento", response_class=HTMLResponse)
def planning_page(request: Request):
    user = current_user(request)
    if user and not user["perm"]["can_view_planning"]:
        return RedirectResponse("/", status_code=303)
    return render(request, "index.html", page="planning", title="Planejamento Futuro")


@app.get("/escolas", response_class=HTMLResponse)
def schools_page(request: Request):
    return render(request, "index.html", page="schools", title="Unidades Escolares")


@app.get("/relatorios", response_class=HTMLResponse)
def reports_page(request: Request):
    user = current_user(request)
    if user and not user["perm"]["can_view_reports"]:
        return RedirectResponse("/", status_code=303)
    return render(request, "index.html", page="reports", title="Relatórios")


@app.get("/administracao", response_class=HTMLResponse)
def admin_page(request: Request):
    user = current_user(request)
    if user and not user["perm"]["can_manage_admin"]:
        return RedirectResponse("/", status_code=303)
    return render(request, "index.html", page="admin", title="Administração")


@app.get("/sobre", response_class=HTMLResponse)
def about_page(request: Request):
    return render(request, "index.html", page="about", title="Sobre o Sistema")


@app.get("/api/about")
def api_about(request: Request):
    require_user(request)
    conn = db()
    profiles = [dict(r) for r in conn.execute("SELECT * FROM access_profiles WHERE active=1 ORDER BY id").fetchall()]
    conn.close()
    return {
        "system_name": "Agenda Integrada — Infraestrutura e Gestão Escolar em Ação",
        "version": APP_VERSION,
        "visual_version": VISUAL_VERSION,
        "port": int(os.environ.get("AGENDA_PORT", os.environ.get("PORT", "8017"))),
        "organization": "Secretaria Municipal de Educação — Prefeitura Municipal de Itaguaí",
        "stack": {
            "backend": "FastAPI",
            "database": "SQLite",
            "frontend": "HTML + CSS + JavaScript puro",
            "templates": "Jinja2",
            "session": "Starlette SessionMiddleware",
        },
        "roles": [{"role": p["slug"], "label": p["label"], "description": p["description"] or ""} for p in profiles],
    }


def demand_scope_sql(user: dict):
    if user["perm"]["school_scoped"] and user.get("school_id"):
        return " AND d.school_id=? ", [user["school_id"]]
    return "", []


@app.get("/api/dashboard")
def api_dashboard(request: Request):
    user = require_user(request)
    scope, params = demand_scope_sql(user)
    conn = db()
    rows = conn.execute(f"SELECT d.* FROM demands d WHERE 1=1 {scope}", params).fetchall()
    data = [dict(r) for r in rows]
    today = date.today()

    def count_status(keyword):
        return sum(1 for d in data if keyword.lower() in d["status"].lower())

    total = len(data)
    completed = sum(1 for d in data if d["status"] == "Concluída")
    overdue = sum(1 for d in data if d["due_date"] and d["status"] not in ("Concluída", "Cancelada") and date.fromisoformat(d["due_date"]) < today)
    due_soon = sum(1 for d in data if d["due_date"] and d["status"] not in ("Concluída", "Cancelada") and today <= date.fromisoformat(d["due_date"]) <= today + timedelta(days=7))
    open_data = [d for d in data if d["status"] not in ("Concluída", "Cancelada")]
    stats = {
        "total": total,
        "urgent": sum(1 for d in data if d["priority"] == "P1" and d["status"] != "Concluída"),
        "high": sum(1 for d in open_data if d["priority"] == "P2"),
        "analysis": sum(1 for d in data if d["status"] in ("Em triagem", "Em análise técnica", "Recebida")),
        "progress": sum(1 for d in data if d["status"] in ("Em execução", "Parcialmente executada", "Serviço programado")),
        "contract": sum(1 for d in data if d["status"] in ("Aguardando contratação", "Aguardando empresa")),
        "overdue": overdue,
        "due_soon": due_soon,
        "completed": completed,
        "future": sum(1 for d in data if d["status"] == "Planejamento futuro" or d["future_year"]),
        "unassigned": sum(1 for d in open_data if not (d["responsible"] or "").strip()),
        "open_cost": sum(d["cost_estimate"] or 0 for d in open_data),
        "execution": round((completed / total * 100), 1) if total else 0,
    }
    recent = conn.execute(f"""SELECT d.*, s.name school_name FROM demands d JOIN schools s ON s.id=d.school_id
                              WHERE 1=1 {scope} ORDER BY datetime(d.updated_at) DESC LIMIT 6""", params).fetchall()
    attention = conn.execute(f"""SELECT d.*, s.name school_name FROM demands d JOIN schools s ON s.id=d.school_id
                                 WHERE d.status NOT IN ('Concluída','Cancelada') {scope}
                                 ORDER BY CASE d.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
                                          date(d.due_date) ASC LIMIT 5""", params).fetchall()
    category_rows = conn.execute(f"SELECT d.category, COUNT(*) qty FROM demands d WHERE 1=1 {scope} GROUP BY d.category ORDER BY qty DESC LIMIT 6", params).fetchall()
    status_rows = conn.execute(f"SELECT d.status, COUNT(*) qty FROM demands d WHERE 1=1 {scope} GROUP BY d.status ORDER BY qty DESC LIMIT 7", params).fetchall()
    # Detalhamento do "Custo em aberto" para o botão "Ver detalhes" do Painel — campos aditivos,
    # não alteram nenhum campo que já era retornado por este endpoint.
    cost_by_cat = {}
    for d in open_data:
        cat = d["category"] or "Sem categoria"
        cost_by_cat[cat] = cost_by_cat.get(cat, 0) + (d["cost_estimate"] or 0)
    cost_breakdown = sorted(
        ({"category": k, "cost": v} for k, v in cost_by_cat.items() if v),
        key=lambda x: -x["cost"]
    )
    cost_top_rows = conn.execute(f"""SELECT d.*, s.name school_name FROM demands d JOIN schools s ON s.id=d.school_id
                                     WHERE d.status NOT IN ('Concluída','Cancelada') AND d.cost_estimate > 0 {scope}
                                     ORDER BY d.cost_estimate DESC LIMIT 8""", params).fetchall()
    conn.close()
    return {"stats": stats, "recent": [dict(x) for x in recent], "attention": [dict(x) for x in attention], "categories": [dict(x) for x in category_rows], "status_breakdown": [dict(x) for x in status_rows], "cost_breakdown": cost_breakdown, "cost_top": [dict(x) for x in cost_top_rows]}


@app.get("/api/demands/category-counts")
def api_demand_category_counts(request: Request):
    user = require_user(request)
    scope, params = demand_scope_sql(user)
    conn = db()
    rows = conn.execute(f"SELECT d.category, COUNT(*) qty FROM demands d WHERE 1=1 {scope} GROUP BY d.category", params).fetchall()
    conn.close()
    return {"counts": {r["category"]: r["qty"] for r in rows}}


@app.get("/api/demands")
def api_demands(request: Request, q: str = "", status: str = "", priority: str = "", category: str = "", year: str = "", overdue: int = 0, due_soon: int = 0, unassigned: int = 0):
    user = require_user(request)
    where = ["1=1"]
    params: list = []
    if user["perm"]["school_scoped"] and user.get("school_id"):
        where.append("d.school_id=?")
        params.append(user["school_id"])
    if q:
        where.append("(lower(d.title) LIKE ? OR lower(d.code) LIKE ? OR lower(s.name) LIKE ?)")
        like = f"%{q.lower()}%"
        params += [like, like, like]
    if status:
        where.append("d.status=?"); params.append(status)
    if priority:
        where.append("d.priority=?"); params.append(priority)
    if category:
        where.append("d.category=?"); params.append(category)
    if year:
        where.append("substr(d.created_at,1,4)=?"); params.append(str(year))
    if overdue:
        where.append("d.due_date IS NOT NULL AND date(d.due_date) < date('now','localtime') AND d.status NOT IN ('Concluída','Cancelada')")
    if due_soon:
        where.append("d.due_date IS NOT NULL AND date(d.due_date) BETWEEN date('now','localtime') AND date('now','localtime','+7 days') AND d.status NOT IN ('Concluída','Cancelada')")
    if unassigned:
        where.append("(d.responsible IS NULL OR trim(d.responsible)='') AND d.status NOT IN ('Concluída','Cancelada')")
    conn = db()
    rows = conn.execute(f"""SELECT d.*, s.name school_name, s.director FROM demands d JOIN schools s ON s.id=d.school_id
                            WHERE {' AND '.join(where)}
                            ORDER BY CASE d.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, datetime(d.updated_at) DESC""", params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/demands/{demand_id}")
def api_demand_detail(request: Request, demand_id: int):
    user = require_user(request)
    conn = db()
    row = conn.execute("""SELECT d.*, s.name school_name, s.director, s.address, s.phone, s.email school_email
                        FROM demands d JOIN schools s ON s.id=d.school_id WHERE d.id=?""", (demand_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404, "Demanda não encontrada")
    if user["perm"]["school_scoped"] and row["school_id"] != user.get("school_id"):
        conn.close(); raise HTTPException(403)
    updates = conn.execute("SELECT * FROM demand_updates WHERE demand_id=? ORDER BY datetime(created_at) DESC", (demand_id,)).fetchall()
    attachments = conn.execute("SELECT * FROM attachments WHERE demand_id=? ORDER BY datetime(created_at) DESC", (demand_id,)).fetchall()
    planning = conn.execute("""SELECT p.* FROM planning_items p JOIN planning_links l ON l.planning_id=p.id WHERE l.demand_id=?""", (demand_id,)).fetchall()
    conn.close()
    return {"demand": dict(row), "updates": [dict(x) for x in updates], "attachments": [dict(x) for x in attachments], "planning": [dict(x) for x in planning]}


@app.post("/api/demands")
async def create_demand(request: Request):
    user = require_user(request)
    payload = await request.json()
    required = ["title", "description", "category", "school_id"]
    if any(not payload.get(k) for k in required):
        raise HTTPException(400, "Preencha os campos obrigatórios")
    school_id = int(payload["school_id"])
    if user["perm"]["school_scoped"]:
        school_id = int(user["school_id"])
    created = now_iso()
    conn = db()
    cur = conn.execute("""INSERT INTO demands(title,description,category,subcategory,location,impact,affected_people,risk,blocks_activity,school_id,priority,status,created_at,updated_at,due_date,responsible,sector,cost_estimate,action_defined,technical_opinion,dependencies,needs_visit,needs_budget,needs_material,needs_contract,future_year,planning_kind,planned_quantity,planned_unit,created_by)
                          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                       (payload["title"], payload["description"], payload["category"], payload.get("subcategory"), payload.get("location"), payload.get("impact"), int(payload.get("affected_people") or 0), int(bool(payload.get("risk"))), int(bool(payload.get("blocks_activity"))), school_id, payload.get("priority", "P3"), payload.get("status", "Nova"), created, created, payload.get("due_date"), payload.get("responsible"), payload.get("sector"), float(payload.get("cost_estimate") or 0), payload.get("action_defined"), payload.get("technical_opinion"), payload.get("dependencies"), int(bool(payload.get("needs_visit"))), int(bool(payload.get("needs_budget"))), int(bool(payload.get("needs_material"))), int(bool(payload.get("needs_contract"))), int(payload["future_year"]) if payload.get("future_year") else None, payload.get("planning_kind"), float(payload.get("planned_quantity") or 0), payload.get("planned_unit"), user["id"]))
    did = cur.lastrowid
    code = f"INF-{datetime.now().year}-{did:05d}"
    conn.execute("UPDATE demands SET code=? WHERE id=?", (code, did))
    conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,created_at) VALUES(?,?,?,?,?)", (did, "Criação", "Demanda registrada no sistema.", user["name"], created))
    conn.commit(); conn.close()
    return {"ok": True, "id": did, "code": code}


@app.put("/api/demands/{demand_id}")
async def update_demand(request: Request, demand_id: int):
    user = require_user(request)
    payload = await request.json()
    conn = db()
    old = conn.execute("SELECT * FROM demands WHERE id=?", (demand_id,)).fetchone()
    if not old:
        conn.close(); raise HTTPException(404)
    if user["perm"]["school_scoped"] and old["school_id"] != user.get("school_id"):
        conn.close(); raise HTTPException(403)
    allowed = ["title", "description", "category", "subcategory", "location", "impact", "affected_people", "risk", "blocks_activity"]
    if user["perm"]["can_edit_analysis"]:
        allowed += ["priority", "status", "due_date", "responsible", "sector", "cost_estimate", "action_defined", "technical_opinion", "dependencies", "needs_visit", "needs_budget", "needs_material", "needs_contract", "future_year", "planning_kind", "planned_quantity", "planned_unit", "prov_description", "prov_action_type", "prov_responsible", "prov_due_date", "prov_priority", "prov_note", "prov_notify_school"]
    changes = []
    for key in allowed:
        if key in payload:
            new = payload[key]
            if key in ("risk", "blocks_activity", "needs_visit", "needs_budget", "needs_material", "needs_contract", "prov_notify_school"):
                new = int(bool(new))
            if key in ("affected_people", "future_year") and new not in (None, ""):
                new = int(new)
            if key in ("cost_estimate", "planned_quantity") and new not in (None, ""):
                new = float(new)
            if old[key] != new:
                changes.append((key, old[key], new))
                conn.execute(f"UPDATE demands SET {key}=? WHERE id=?", (new if new != "" else None, demand_id))
    conn.execute("UPDATE demands SET updated_at=? WHERE id=?", (now_iso(), demand_id))
    if changes:
        labels = {"priority":"Prioridade", "status":"Status", "due_date":"Prazo", "responsible":"Responsável", "future_year":"Exercício futuro", "prov_action_type":"Tipo de ação", "prov_responsible":"Responsável pela providência", "prov_due_date":"Prazo da providência", "prov_priority":"Prioridade da providência", "prov_description":"Descrição da providência", "prov_note":"Observação da providência"}
        summary = "; ".join(f"{labels.get(k,k)}: {a or '—'} → {b or '—'}" for k,a,b in changes[:6])
        conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,created_at) VALUES(?,?,?,?,?)", (demand_id, "Alteração", summary, user["name"], now_iso()))
    conn.commit(); conn.close()
    return {"ok": True}


@app.post("/api/demands/{demand_id}/updates")
async def add_update(request: Request, demand_id: int):
    user = require_user(request)
    payload = await request.json()
    message = (payload.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "Informe a mensagem")
    kind = payload.get("kind") or "Devolutiva"
    visibility = payload.get("visibility") or "public"
    conn = db()
    demand = conn.execute("SELECT school_id FROM demands WHERE id=?", (demand_id,)).fetchone()
    if not demand:
        conn.close(); raise HTTPException(404)
    if user["perm"]["school_scoped"] and demand["school_id"] != user.get("school_id"):
        conn.close(); raise HTTPException(403)
    conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,visibility,created_at) VALUES(?,?,?,?,?,?)", (demand_id, kind, message, user["name"], visibility, now_iso()))
    conn.execute("UPDATE demands SET updated_at=? WHERE id=?", (now_iso(), demand_id))
    conn.commit(); conn.close()
    return {"ok": True}


@app.post("/api/demands/{demand_id}/attachments")
async def upload_attachment(request: Request, demand_id: int, file: UploadFile = File(...), category: Optional[str] = Form(None)):
    user = require_user(request)
    conn = db()
    demand = conn.execute("SELECT school_id FROM demands WHERE id=?", (demand_id,)).fetchone()
    if not demand:
        conn.close(); raise HTTPException(404)
    if user["perm"]["school_scoped"] and demand["school_id"] != user.get("school_id"):
        conn.close(); raise HTTPException(403)
    allowed_ext = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv"}
    suffix = Path(file.filename or "arquivo").suffix.lower()
    if suffix not in allowed_ext:
        conn.close(); raise HTTPException(415, "Tipo de arquivo não permitido")
    content = await file.read()
    if len(content) > 12 * 1024 * 1024:
        conn.close(); raise HTTPException(413, "Arquivo excede 12 MB")
    safe_ext = suffix[:10]
    stored = f"{demand_id}_{secrets.token_hex(10)}{safe_ext}"
    (UPLOAD_DIR / stored).write_bytes(content)
    cat_text = category.strip() if category and category.strip() else None
    conn.execute("INSERT INTO attachments(demand_id,category,filename,stored_name,mime,size,created_at) VALUES(?,?,?,?,?,?,?)", (demand_id, cat_text, file.filename or "arquivo", stored, file.content_type, len(content), now_iso()))
    msg = f"Foto/Arquivo anexado ({cat_text}): {file.filename}" if cat_text else f"Arquivo anexado: {file.filename}"
    conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,created_at) VALUES(?,?,?,?,?)", (demand_id, "Anexo", msg, user["name"], now_iso()))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/uploads/{attachment_id}")
def download_attachment(request: Request, attachment_id: int):
    require_user(request)
    conn = db(); row = conn.execute("SELECT * FROM attachments WHERE id=?", (attachment_id,)).fetchone(); conn.close()
    if not row: raise HTTPException(404)
    path = UPLOAD_DIR / row["stored_name"]
    if not path.exists(): raise HTTPException(404)
    return FileResponse(path, filename=row["filename"], media_type=row["mime"] or "application/octet-stream")


@app.get("/api/staff")
def api_staff(request: Request):
    require_user(request)
    conn = db()
    rows = conn.execute("""SELECT u.id, u.name, u.email, p.label profile_label
                           FROM users u JOIN access_profiles p ON p.slug=u.role
                           WHERE p.school_scoped=0 AND p.can_edit_analysis=1 AND u.active=1
                           ORDER BY u.name""").fetchall()
    conn.close(); return [dict(x) for x in rows]


@app.get("/api/schools")
def api_schools(request: Request, include_inactive: int = 0):
    user = require_user(request)
    conn = db()
    show_inactive = bool(include_inactive) and user["perm"]["can_manage_admin"]
    active_clause = "" if show_inactive else "AND s.active=1"
    if user["perm"]["school_scoped"]:
        rows = conn.execute(f"""SELECT s.*, COUNT(d.id) total_demands,
                             SUM(CASE WHEN d.status='Concluída' THEN 1 ELSE 0 END) completed,
                             SUM(CASE WHEN d.priority='P1' AND d.status!='Concluída' THEN 1 ELSE 0 END) urgent
                             FROM schools s LEFT JOIN demands d ON d.school_id=s.id WHERE s.id=? {active_clause} GROUP BY s.id""", (user["school_id"],)).fetchall()
    else:
        rows = conn.execute(f"""SELECT s.*, COUNT(d.id) total_demands,
                             SUM(CASE WHEN d.status='Concluída' THEN 1 ELSE 0 END) completed,
                             SUM(CASE WHEN d.priority='P1' AND d.status!='Concluída' THEN 1 ELSE 0 END) urgent
                             FROM schools s LEFT JOIN demands d ON d.school_id=s.id WHERE 1=1 {active_clause} GROUP BY s.id ORDER BY s.name""").fetchall()
    conn.close(); return [dict(x) for x in rows]


@app.get("/api/schools/{school_id}")
def api_school(request: Request, school_id: int):
    user = require_user(request)
    if user["perm"]["school_scoped"] and school_id != user.get("school_id"):
        raise HTTPException(403)
    conn = db()
    school = conn.execute("SELECT * FROM schools WHERE id=?", (school_id,)).fetchone()
    if not school: conn.close(); raise HTTPException(404)
    demands = conn.execute("SELECT * FROM demands WHERE school_id=? ORDER BY datetime(updated_at) DESC", (school_id,)).fetchall()
    conn.close()
    return {"school": dict(school), "demands": [dict(x) for x in demands]}


@app.get("/api/schools/{school_id}/geocode")
def api_school_geocode(request: Request, school_id: int):
    user = require_user(request)
    if user["perm"]["school_scoped"] and school_id != user.get("school_id"):
        raise HTTPException(403)
    conn = db()
    school = conn.execute("SELECT * FROM schools WHERE id=?", (school_id,)).fetchone()
    if not school:
        conn.close(); raise HTTPException(404)
    if school["lat"] is not None and school["lon"] is not None:
        conn.close()
        return {"lat": school["lat"], "lon": school["lon"], "cached": True}
    address = school["address"] or f"{school['name']}, Itaguaí - RJ"
    result = geocode_address(address)
    if not result:
        conn.close()
        raise HTTPException(404, "Não foi possível localizar o endereço desta escola no mapa.")
    conn.execute("UPDATE schools SET lat=?, lon=? WHERE id=?", (result["lat"], result["lon"], school_id))
    conn.commit(); conn.close()
    return {"lat": result["lat"], "lon": result["lon"], "cached": False}


@app.get("/api/geocode")
def api_geocode(request: Request, q: str = Query("", min_length=3)):
    require_user(request)
    result = geocode_address(q)
    if not result:
        raise HTTPException(404, "Endereço não encontrado. Tente incluir bairro e cidade.")
    return result


@app.get("/api/route")
def api_route(request: Request, from_lat: float, from_lon: float, to_lat: float, to_lon: float):
    require_user(request)
    try:
        resp = httpx.get(
            f"{OSRM_ROUTE_URL}/{from_lon},{from_lat};{to_lon},{to_lat}",
            params={"overview": "full", "geometries": "geojson"},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        raise HTTPException(502, "Serviço de rotas indisponível no momento. Tente novamente em instantes.")
    if data.get("code") != "Ok" or not data.get("routes"):
        raise HTTPException(404, "Não foi possível calcular uma rota entre os dois endereços.")
    route = data["routes"][0]
    return {"geometry": route["geometry"], "distance_m": route["distance"], "duration_s": route["duration"]}


SMEDU_LAT = -22.868666015828296
SMEDU_LON = -43.7889040053576
SMEDU_MAPS_LINK = "https://maps.app.goo.gl/Js5S88kfqb2HrNnP7"


@app.get("/api/map/network")
def api_map_network(request: Request, q: str = "", neighborhood: str = "", criticality: str = "", status: str = ""):
    user = require_user(request)
    conn = db()
    scope, params = demand_scope_sql(user)
    
    schools_raw = conn.execute("SELECT id, name, code, director, address, phone, email, lat, lon, inep, neighborhood, cep, ramal, maps_link, modality, school_type, photo_url FROM schools WHERE active=1 ORDER BY name").fetchall()
    demands_raw = conn.execute(f"""SELECT d.id, d.code, d.title, d.category, d.school_id, d.priority, d.status, d.cost_estimate, d.due_date, d.created_at, d.updated_at
                                   FROM demands d WHERE 1=1 {scope}""", params).fetchall()
    conn.close()
    
    all_neighborhoods = sorted(list(set(s["neighborhood"].strip() for s in schools_raw if s["neighborhood"] and s["neighborhood"].strip())))

    demands_by_school = {}
    for d in demands_raw:
        sid = d["school_id"]
        demands_by_school.setdefault(sid, []).append(dict(d))
        
    schools_list = []
    total_schools_count = len(schools_raw)
    critical_schools_count = 0
    in_progress_schools_count = 0
    overdue_schools_count = 0
    
    structural_cats = {"estrutura", "alvenaria", "cobertura/telhado", "reforma", "obra", "área externa", "pintura", "telhado"}
    electrical_cats = {"elétrica", "iluminação", "iluminação externa", "iluminação interna"}
    budget_statuses = {"aguardando orçamento", "aguardando material", "aguardando contratação", "aguardando empresa", "em planejamento"}
    
    structural_schools = set()
    electrical_schools = set()
    budget_schools = set()
    
    today_str = date.today().isoformat()
    
    for s in schools_raw:
        s_dict = dict(s)
        s_demands = demands_by_school.get(s["id"], [])
        
        open_demands = [d for d in s_demands if d["status"] not in ("Concluída", "Cancelada")]
        urgent_p1 = [d for d in open_demands if d["priority"] == "P1"]
        high_p2 = [d for d in open_demands if d["priority"] == "P2"]
        overdue = [d for d in open_demands if d["due_date"] and str(d["due_date"])[:10] < today_str]
        in_progress = [d for d in open_demands if any(x in (d["status"] or "").lower() for x in ["execu", "programado", "andamento"])]
        waiting_contract = [d for d in open_demands if any(b in (d["status"] or "").lower() for b in ["contrata", "orçamento", "material", "empresa", "planejamento"])]
        completed = [d for d in s_demands if d["status"] == "Concluída"]
        
        cost_estimate_open = sum(d["cost_estimate"] or 0 for d in open_demands)
        
        cat_counts = {}
        for d in open_demands:
            c = d["category"] or "Geral"
            cat_counts[c] = cat_counts.get(c, 0) + 1
            c_low = c.lower()
            if any(sc in c_low for sc in structural_cats):
                structural_schools.add(s["id"])
            if any(ec in c_low for ec in electrical_cats):
                electrical_schools.add(s["id"])
            if (d["status"] or "").lower() in budget_statuses:
                budget_schools.add(s["id"])
                
        predominant_cat = max(cat_counts.items(), key=lambda x: x[1])[0] if cat_counts else (s_demands[0]["category"] if s_demands else "Sem pendências")
        
        total_d_count = len(s_demands)
        exec_percent = round((len(completed) / total_d_count * 100)) if total_d_count > 0 else 100
        
        if len(urgent_p1) > 0 or len(overdue) > 0:
            crit = "critical"
            critical_schools_count += 1
        elif len(high_p2) > 0 or len(open_demands) >= 3:
            crit = "warning"
        elif len(in_progress) > 0:
            crit = "in_progress"
            in_progress_schools_count += 1
        else:
            crit = "regular"
            
        if len(overdue) > 0:
            overdue_schools_count += 1
        if len(in_progress) > 0 and crit != "in_progress":
            in_progress_schools_count += 1
            
        # Demands summary for interactive rich popup
        sorted_open_demands = sorted(
            open_demands,
            key=lambda d: (
                0 if d["priority"] == "P1" else (1 if d["priority"] == "P2" else (2 if (d["due_date"] and str(d["due_date"])[:10] < today_str) else 3)),
                d["due_date"] or "9999-99-99"
            )
        )
        demands_summary = []
        for d in sorted_open_demands[:4]:
            is_overdue = bool(d["due_date"] and str(d["due_date"])[:10] < today_str)
            created_d = str(d["created_at"])[:10] if d["created_at"] else None
            c_formatted = f"{created_d[8:10]}/{created_d[5:7]}/{created_d[:4]}" if created_d and len(created_d) == 10 else "—"
            due_d = str(d["due_date"])[:10] if d["due_date"] else None
            due_formatted = f"{due_d[8:10]}/{due_d[5:7]}/{due_d[:4]}" if due_d and len(due_d) == 10 else "Sem prazo"
            demands_summary.append({
                "id": d["id"],
                "code": d["code"],
                "title": d["title"],
                "category": d["category"] or "Infraestrutura",
                "priority": d["priority"] or "P3",
                "status": d["status"] or "Registrada",
                "created_at_fmt": c_formatted,
                "due_date_fmt": due_formatted,
                "is_overdue": is_overdue,
                "cost_estimate": d["cost_estimate"] or 0
            })
            
        s_dict.update({
            "open_demands_count": len(open_demands),
            "urgent_p1_count": len(urgent_p1),
            "high_p2_count": len(high_p2),
            "overdue_count": len(overdue),
            "in_progress_count": len(in_progress),
            "waiting_contract_count": len(waiting_contract),
            "completed_count": len(completed),
            "total_demands_count": total_d_count,
            "cost_estimate_open": cost_estimate_open,
            "predominant_category": predominant_cat,
            "execution_percent": exec_percent,
            "criticality": crit,
            "demands_summary": demands_summary
        })
        
        match = True
        if q:
            q_low = q.lower()
            match = (
                q_low in s_dict["name"].lower() or
                q_low in (s_dict.get("address") or "").lower() or
                q_low in (s_dict.get("neighborhood") or "").lower() or
                q_low in (s_dict.get("director") or "").lower() or
                q_low in (s_dict.get("inep") or "").lower() or
                q_low in (s_dict.get("code") or "").lower() or
                q_low in predominant_cat.lower()
            )
        if neighborhood and neighborhood != "all":
            if (s_dict.get("neighborhood") or "").strip().lower() != neighborhood.strip().lower():
                match = False
        if criticality and criticality != "all":
            if s_dict["criticality"] != criticality:
                match = False
        if status and status != "all":
            if status == "critical" and s_dict["criticality"] != "critical": match = False
            elif status == "p1" and s_dict["urgent_p1_count"] == 0: match = False
            elif status == "p2" and s_dict["high_p2_count"] == 0: match = False
            elif status == "overdue" and s_dict["overdue_count"] == 0: match = False
            elif status == "in_progress" and s_dict["in_progress_count"] == 0: match = False
            elif status == "waiting_contract" and s_dict["waiting_contract_count"] == 0: match = False
            
        if match:
            schools_list.append(s_dict)
            
    priority_queue = sorted(
        [s for s in schools_list if s["open_demands_count"] > 0],
        key=lambda x: (x["urgent_p1_count"] * 10 + x["overdue_count"] * 5 + x["high_p2_count"] * 2 + x["open_demands_count"]),
        reverse=True
    )[:8]
    
    return {
        "schools": schools_list,
        "neighborhoods": all_neighborhoods,
        "kpi_stats": {
            "total_schools": total_schools_count,
            "critical_schools": critical_schools_count,
            "in_progress_schools": in_progress_schools_count,
            "overdue_schools": overdue_schools_count
        },
        "priority_queue": priority_queue,
        "operational_summary": {
            "structural_schools_count": len(structural_schools),
            "electrical_schools_count": len(electrical_schools),
            "budget_schools_count": len(budget_schools),
            "avg_response_days": 6
        },
        "smedu": {
            "lat": SMEDU_LAT,
            "lon": SMEDU_LON,
            "maps_link": SMEDU_MAPS_LINK,
            "name": "Secretaria Municipal de Educação (SMEDU)",
            "address": "Sede Administrativa · Itaguaí - RJ"
        }
    }


@app.get("/api/school_photo/{school_id}")
async def api_school_photo(school_id: int, lat: float = None, lon: float = None):
    cache_path = f"static/school_cache/school_{school_id}.png"
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 1000:
        return FileResponse(cache_path, media_type="image/png")
    
    conn = db()
    c = conn.cursor()
    row = c.execute("SELECT lat, lon FROM schools WHERE id = ?", (school_id,)).fetchone()
    if row and row["lat"] and row["lon"]:
        s_lat, s_lon = float(row["lat"]), float(row["lon"])
    elif lat is not None and lon is not None:
        s_lat, s_lon = float(lat), float(lon)
    else:
        s_lat, s_lon = SMEDU_LAT, SMEDU_LON
        
    esri_url = f"https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox={s_lon-0.0009},{s_lat-0.00055},{s_lon+0.0009},{s_lat+0.00055}&bboxSR=4326&imageSR=4326&size=450,200&format=png&f=image"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(esri_url)
            if r.status_code == 200 and len(r.content) > 1000:
                os.makedirs("static/school_cache", exist_ok=True)
                with open(cache_path, "wb") as f:
                    f.write(r.content)
                return Response(content=r.content, media_type="image/png")
    except Exception:
        pass
    
    return RedirectResponse(url=esri_url)


def _haversine_distance_m(lat1, lon1, lat2, lon2):
    R = 6371000  # metros
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@app.get("/api/route")
def api_route(
    request: Request,
    from_lat: float = Query(SMEDU_LAT),
    from_lon: float = Query(SMEDU_LON),
    to_lat: float = Query(...),
    to_lon: float = Query(...)
):
    require_user(request)
    # Tenta rota via OSRM oficial
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{from_lon},{from_lat};{to_lon},{to_lat}?overview=full&geometries=geojson"
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(osrm_url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    r = data["routes"][0]
                    return {
                        "distance_m": r.get("distance", 0),
                        "duration_s": r.get("duration", 0),
                        "geometry": r.get("geometry", {
                            "type": "LineString",
                            "coordinates": [[from_lon, from_lat], [to_lon, to_lat]]
                        })
                    }
    except Exception:
        pass
    
    # Fallback seguro
    dist = _haversine_distance_m(from_lat, from_lon, to_lat, to_lon) * 1.35
    duration = dist / 8.88  # ~32 km/h
    return {
        "distance_m": round(dist, 1),
        "duration_s": round(duration),
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [from_lon, from_lat],
                [(from_lon + to_lon) / 2 + 0.001, (from_lat + to_lat) / 2 - 0.001],
                [to_lon, to_lat]
            ]
        }
    }


@app.get("/api/route/circuit")
def api_route_circuit(
    request: Request,
    school_ids: str = Query(..., description="IDs das escolas separados por vírgula (máximo 10)"),
    optimize: bool = Query(True, description="Se True, otimiza a ordem pelo percurso mais curto")
):
    require_user(request)
    raw_ids = [int(x.strip()) for x in school_ids.split(",") if x.strip().isdigit()]
    if not raw_ids:
        raise HTTPException(status_code=400, detail="Nenhum ID de escola fornecido.")
    
    selected_ids = raw_ids[:10]  # Limite rigoroso de até 10 unidades
    conn = db()
    placeholders = ",".join(["?"] * len(selected_ids))
    schools_raw = conn.execute(f"SELECT * FROM schools WHERE id IN ({placeholders})", selected_ids).fetchall()
    
    # Busca demandas ativas para enriquecer as paradas
    demands_raw = conn.execute(f"""
        SELECT school_id, priority, COUNT(*) as count 
        FROM demands 
        WHERE school_id IN ({placeholders}) AND status NOT IN ('Concluída', 'Cancelada')
        GROUP BY school_id, priority
    """, selected_ids).fetchall()
    conn.close()
    
    demands_map = {}
    for d in demands_raw:
        demands_map.setdefault(d["school_id"], {})[d["priority"]] = d["count"]
        
    schools_dict = {s["id"]: dict(s) for s in schools_raw}
    valid_schools = [schools_dict[sid] for sid in selected_ids if sid in schools_dict and schools_dict[sid].get("lat") and schools_dict[sid].get("lon")]
    
    if not valid_schools:
        raise HTTPException(status_code=400, detail="Nenhuma escola com coordenadas válidas encontrada.")
        
    start_point = {"name": "Sede SMEDU", "lat": SMEDU_LAT, "lon": SMEDU_LON, "is_smedu": True}
    
    # 1. Tenta otimização via OSRM Trip API se optimize=True
    ordered_schools = list(valid_schools)
    route_geometry = None
    total_dist_m = 0
    total_dur_s = 0
    osrm_success = False
    
    # Prepara coordenadas: Origem SMEDU + Escolas
    coords_list = [f"{SMEDU_LON},{SMEDU_LAT}"] + [f"{s['lon']},{s['lat']}" for s in valid_schools]
    coords_str = ";".join(coords_list)
    
    if optimize and len(valid_schools) > 1:
        # Trip API resolve TSP com origem fixada (source=first)
        trip_url = f"http://router.project-osrm.org/trip/v1/driving/{coords_str}?roundtrip=false&source=first&overview=full&geometries=geojson"
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(trip_url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") == "Ok" and data.get("trips"):
                        trip = data["trips"][0]
                        route_geometry = trip.get("geometry")
                        total_dist_m = trip.get("distance", 0)
                        total_dur_s = trip.get("duration", 0)
                        
                        # Waypoints mapeiam a ordem otimizada
                        waypoints = data.get("waypoints", [])
                        # waypoints[i].waypoint_index é a posição na rota
                        sorted_wp = sorted(waypoints, key=lambda w: w.get("waypoint_index", 0))
                        # O primeiro é sempre a SMEDU (índice 0)
                        reordered = []
                        for wp in sorted_wp:
                            input_idx = wp.get("trips_index", wp.get("location", [0])) # índice original na lista de entrada
                            # O input_idx do OSRM Trip:
                            pt_idx = wp.get("waypoint_index")
                            orig_idx = wp.get("trips_index")
                        
                        # Extrai a ordem real das escolas
                        # OSRM waypoints têm campo 'location' correspondente
                        # Mapeamos pelos índices dos pontos
                        wp_order = [w.get("trips_index") for w in sorted_wp if w.get("trips_index") != 0]
                        if len(wp_order) == len(valid_schools):
                            ordered_schools = [valid_schools[idx - 1] for idx in wp_order if 0 < idx <= len(valid_schools)]
                        
                        osrm_success = True
        except Exception:
            pass

    # 2. Se não otimizou pelo trip ou deu erro, tenta Route API sequencial
    if not osrm_success:
        if optimize and len(valid_schools) > 1:
            # Algoritmo TSP Heurístico 2-Opt local
            unvisited = list(valid_schools)
            reordered = []
            curr_lat, curr_lon = SMEDU_LAT, SMEDU_LON
            while unvisited:
                closest = min(unvisited, key=lambda s: _haversine_distance_m(curr_lat, curr_lon, s["lat"], s["lon"]))
                reordered.append(closest)
                unvisited.remove(closest)
                curr_lat, curr_lon = closest["lat"], closest["lon"]
            ordered_schools = reordered
            
        # Calcula rota sequencial via OSRM Route
        seq_coords = [f"{SMEDU_LON},{SMEDU_LAT}"] + [f"{s['lon']},{s['lat']}" for s in ordered_schools]
        seq_str = ";".join(seq_coords)
        route_url = f"http://router.project-osrm.org/route/v1/driving/{seq_str}?overview=full&geometries=geojson"
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(route_url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        r = data["routes"][0]
                        route_geometry = r.get("geometry")
                        total_dist_m = r.get("distance", 0)
                        total_dur_s = r.get("duration", 0)
                        osrm_success = True
        except Exception:
            pass

    # 3. Fallback geométrico offline se necessário
    if not route_geometry:
        coords = [[SMEDU_LON, SMEDU_LAT]]
        total_dist_m = 0
        curr_lat, curr_lon = SMEDU_LAT, SMEDU_LON
        for s in ordered_schools:
            leg_dist = _haversine_distance_m(curr_lat, curr_lon, s["lat"], s["lon"]) * 1.35
            total_dist_m += leg_dist
            coords.append([s["lon"], s["lat"]])
            curr_lat, curr_lon = s["lat"], s["lon"]
        total_dur_s = total_dist_m / 8.88  # ~32 km/h
        route_geometry = {
            "type": "LineString",
            "coordinates": coords
        }

    # Monta paradas ordenadas com detalhes para UX
    stops = []
    # Origem SMEDU
    stops.append({
        "order": 0,
        "is_origin": True,
        "name": "Secretaria Municipal de Educação (SMEDU)",
        "address": "Sede Administrativa · Itaguaí - RJ",
        "neighborhood": "Centro",
        "lat": SMEDU_LAT,
        "lon": SMEDU_LON,
        "badge": "🏛️ Partida",
        "maps_link": SMEDU_MAPS_LINK
    })
    
    gmaps_points = [f"{SMEDU_LAT},{SMEDU_LON}"]
    for idx, s in enumerate(ordered_schools, 1):
        p1_count = demands_map.get(s["id"], {}).get("P1", 0)
        p2_count = demands_map.get(s["id"], {}).get("P2", 0)
        total_open = sum(demands_map.get(s["id"], {}).values())
        
        stops.append({
            "order": idx,
            "school_id": s["id"],
            "name": s["name"],
            "address": s.get("full_address") or s.get("address") or "Itaguaí - RJ",
            "neighborhood": s.get("neighborhood") or "Itaguaí",
            "director": s.get("director") or "—",
            "phone": s.get("phone") or "—",
            "lat": s["lat"],
            "lon": s["lon"],
            "p1_count": p1_count,
            "p2_count": p2_count,
            "total_open_demands": total_open,
            "maps_link": s.get("maps_link") or f"https://www.google.com/maps/search/?api=1&query={s['lat']},{s['lon']}"
        })
        gmaps_points.append(f"{s['lat']},{s['lon']}")

    # Monta link de navegação multi-paradas para o Google Maps
    gmaps_nav_url = f"https://www.google.com/maps/dir/{'/'.join(gmaps_points)}"

    return {
        "total_schools": len(ordered_schools),
        "total_distance_km": round(total_dist_m / 1000, 1),
        "total_duration_min": max(round(total_dur_s / 60), 5),
        "stops": stops,
        "geometry": route_geometry,
        "google_maps_url": gmaps_nav_url
    }


@app.get("/api/planning")
def api_planning(request: Request, year: Optional[int] = None, q: str = ""):
    require_user(request)
    conn = db()
    where = ["1=1"]; params=[]
    if year: where.append("year=?"); params.append(year)
    if q: where.append("lower(title) LIKE ?"); params.append(f"%{q.lower()}%")
    rows = conn.execute(f"SELECT * FROM planning_items WHERE {' AND '.join(where)} ORDER BY year, id DESC", params).fetchall()
    year_stats = conn.execute("""SELECT year, COUNT(*) items, SUM(estimated_cost) total_cost, SUM(schools_count) schools FROM planning_items GROUP BY year ORDER BY year""").fetchall()
    conn.close()
    return {"items": [dict(x) for x in rows], "year_stats": [dict(x) for x in year_stats]}


@app.get("/api/planning/insights")
def api_planning_insights(request: Request, year: int):
    require_user(request)
    conn = db()
    items = conn.execute("SELECT * FROM planning_items WHERE year=? ORDER BY estimated_cost DESC", (year,)).fetchall()

    all_schools = {}
    item_list = []
    for it in items:
        schools = conn.execute("""SELECT DISTINCT s.id, s.name FROM planning_links l
            JOIN demands d ON d.id = l.demand_id
            JOIN schools s ON s.id = d.school_id
            WHERE l.planning_id = ? ORDER BY s.name""", (it["id"],)).fetchall()
        for s in schools:
            all_schools[s["id"]] = s["name"]
        item_list.append({**dict(it), "linked_schools": [dict(s) for s in schools]})

    by_category = conn.execute("""SELECT category, COUNT(*) items, SUM(estimated_cost) cost FROM planning_items
        WHERE year=? GROUP BY category ORDER BY cost DESC""", (year,)).fetchall()
    by_status = conn.execute("""SELECT status, COUNT(*) items FROM planning_items
        WHERE year=? GROUP BY status ORDER BY items DESC""", (year,)).fetchall()

    items_count = len(items)
    total_cost = sum((it["estimated_cost"] or 0) for it in items)
    schools_estimate = sum((it["schools_count"] or 0) for it in items)
    conn.close()
    return {
        "year": year,
        "items": item_list,
        "by_category": [dict(x) for x in by_category],
        "by_status": [dict(x) for x in by_status],
        "summary": {
            "items": items_count,
            "total_cost": total_cost,
            "schools_estimate": schools_estimate,
            "schools_confirmed": len(all_schools),
            "schools_confirmed_list": [{"id": k, "name": v} for k, v in sorted(all_schools.items(), key=lambda kv: kv[1])],
        },
    }


@app.post("/api/planning")
async def create_planning(request: Request):
    user = require_user(request)
    if user["perm"]["school_scoped"]:
        raise HTTPException(403, "Perfil sem permissão para consolidar planejamento")
    payload = await request.json()
    for k in ("year","title","category","kind"):
        if not payload.get(k): raise HTTPException(400, f"Campo obrigatório: {k}")
    conn = db()
    cur = conn.execute("""INSERT INTO planning_items(year,title,category,kind,status,estimated_cost,quantity,unit,justification,schools_count,created_at,updated_at)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                       (int(payload["year"]), payload["title"], payload["category"], payload["kind"], payload.get("status","Identificada"), float(payload.get("estimated_cost") or 0), float(payload.get("quantity") or 0), payload.get("unit"), payload.get("justification"), int(payload.get("schools_count") or 1), now_iso(), now_iso()))
    pid = cur.lastrowid
    code = f"PLAN-{payload['year']}-{pid:04d}"
    conn.execute("UPDATE planning_items SET code=? WHERE id=?", (code,pid))
    for did in payload.get("demand_ids", []):
        conn.execute("INSERT OR IGNORE INTO planning_links(planning_id,demand_id) VALUES(?,?)", (pid,int(did)))
        conn.execute("UPDATE demands SET status='Planejamento futuro', future_year=?, updated_at=? WHERE id=?", (int(payload["year"]), now_iso(), int(did)))
    conn.commit(); conn.close()
    return {"ok":True, "id":pid, "code":code}


@app.get("/api/admin/summary")
def admin_summary(request: Request):
    user = require_user(request)
    require_admin(user)
    conn = db()
    data = {
        "schools": conn.execute("SELECT COUNT(*) c FROM schools").fetchone()["c"],
        "users": conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"],
        "demands": conn.execute("SELECT COUNT(*) c FROM demands").fetchone()["c"],
        "planning": conn.execute("SELECT COUNT(*) c FROM planning_items").fetchone()["c"],
        "attachments": conn.execute("SELECT COUNT(*) c FROM attachments").fetchone()["c"],
        "categories": conn.execute("SELECT COUNT(*) c FROM categories WHERE active=1").fetchone()["c"],
        "profiles": conn.execute("SELECT COUNT(*) c FROM access_profiles WHERE active=1").fetchone()["c"],
        "db_size": DB_PATH.stat().st_size if DB_PATH.exists() else 0,
    }
    conn.close(); return data


@app.get("/api/export/demands.csv")
def export_demands(request: Request, status: str = "", priority: str = ""):
    user = require_user(request)
    where=["1=1"]; params=[]
    if user["perm"]["school_scoped"]: where.append("d.school_id=?"); params.append(user["school_id"])
    if status: where.append("d.status=?"); params.append(status)
    if priority: where.append("d.priority=?"); params.append(priority)
    conn=db()
    rows=conn.execute(f"""SELECT d.code,d.title,s.name school,d.category,d.priority,d.status,d.created_at,d.due_date,d.responsible,d.cost_estimate
                         FROM demands d JOIN schools s ON s.id=d.school_id WHERE {' AND '.join(where)} ORDER BY d.id DESC""", params).fetchall()
    conn.close()
    output=io.StringIO(); writer=csv.writer(output, delimiter=';')
    writer.writerow(["Código","Demanda","Unidade Escolar","Categoria","Prioridade","Status","Criada em","Prazo","Responsável","Custo estimado"])
    for r in rows: writer.writerow(list(r))
    content='\ufeff'+output.getvalue()
    headers={"Content-Disposition": f'attachment; filename="demandas_{date.today().isoformat()}.csv"'}
    return StreamingResponse(iter([content.encode('utf-8')]), media_type='text/csv; charset=utf-8', headers=headers)


# ================================================================
# ADMINISTRAÇÃO — categorias, prioridades, colunas do Kanban,
# unidades escolares, perfis de acesso e usuários. Tudo abaixo
# exige perfil com permissão de administração (can_manage_admin).
# ================================================================

@app.get("/api/admin/categories")
def admin_list_categories(request: Request):
    user = require_user(request); require_admin(user)
    conn = db()
    rows = get_categories(conn, only_active=False)
    conn.close(); return rows


@app.post("/api/admin/categories")
async def admin_create_category(request: Request):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Informe o nome da categoria")
    conn = db()
    if conn.execute("SELECT id FROM categories WHERE name=?", (name,)).fetchone():
        conn.close(); raise HTTPException(409, "Já existe uma categoria com esse nome")
    max_order = conn.execute("SELECT COALESCE(MAX(sort_order),-1) m FROM categories").fetchone()["m"]
    cur = conn.execute("INSERT INTO categories(name,icon,color,hint,sort_order,active) VALUES(?,?,?,?,?,1)",
                        (name, payload.get("icon") or "wrench", payload.get("color") or "blue", payload.get("hint") or "", max_order + 1))
    conn.commit(); conn.close()
    return {"ok": True, "id": cur.lastrowid}


@app.put("/api/admin/categories/{cat_id}")
async def admin_update_category(request: Request, cat_id: int):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    new_name = (payload.get("name") or row["name"]).strip()
    if new_name != row["name"] and conn.execute("SELECT id FROM categories WHERE name=? AND id!=?", (new_name, cat_id)).fetchone():
        conn.close(); raise HTTPException(409, "Já existe uma categoria com esse nome")
    old_name = row["name"]
    # sort_order é opcional (usado para reordenar a lista de categorias); quando omitido,
    # mantém o valor atual — não altera o comportamento do formulário de edição existente.
    new_sort_order = int(payload["sort_order"]) if payload.get("sort_order") is not None else row["sort_order"]
    conn.execute("UPDATE categories SET name=?, icon=?, color=?, hint=?, active=?, sort_order=? WHERE id=?",
                 (new_name, payload.get("icon") or row["icon"], payload.get("color") or row["color"],
                  payload.get("hint", row["hint"]), int(bool(payload.get("active", row["active"]))), new_sort_order, cat_id))
    if new_name != old_name:
        conn.execute("UPDATE demands SET category=? WHERE category=?", (new_name, old_name))
    conn.commit(); conn.close()
    return {"ok": True}


@app.delete("/api/admin/categories/{cat_id}")
def admin_delete_category(request: Request, cat_id: int):
    user = require_user(request); require_admin(user)
    conn = db()
    row = conn.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    in_use = conn.execute("SELECT COUNT(*) c FROM demands WHERE category=?", (row["name"],)).fetchone()["c"]
    if in_use:
        conn.close(); raise HTTPException(409, f"Categoria usada em {in_use} demanda(s). Desative em vez de excluir.")
    conn.execute("DELETE FROM categories WHERE id=?", (cat_id,))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/api/admin/priorities")
def admin_list_priorities(request: Request):
    user = require_user(request); require_admin(user)
    conn = db(); rows = get_priorities(conn); conn.close()
    return rows


@app.put("/api/admin/priorities/{code}")
async def admin_update_priority(request: Request, code: str):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM priority_levels WHERE code=?", (code,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    conn.execute("UPDATE priority_levels SET label=?, hint=?, color=? WHERE code=?",
                 (payload.get("label") or row["label"], payload.get("hint", row["hint"]), payload.get("color") or row["color"], code))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/api/admin/kanban-stages")
def admin_list_stages(request: Request):
    user = require_user(request); require_admin(user)
    conn = db(); rows = get_kanban_stages(conn); conn.close()
    return rows


def _validate_stage_statuses(conn: sqlite3.Connection, stage_id: Optional[int], statuses: list) -> None:
    for s in statuses:
        if s not in STATUSES:
            raise HTTPException(400, f'Status "{s}" não existe no fluxo do sistema.')
    others = conn.execute("SELECT id, statuses FROM kanban_stages" + (" WHERE id!=?" if stage_id else ""), ((stage_id,) if stage_id else ())).fetchall()
    used = set()
    for r in others:
        used |= set(json.loads(r["statuses"]))
    overlap = used & set(statuses)
    if overlap:
        raise HTTPException(409, f'Status já usados em outra coluna: {", ".join(sorted(overlap))}')


@app.post("/api/admin/kanban-stages")
async def admin_create_stage(request: Request):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    label = (payload.get("label") or "").strip()
    if not label:
        raise HTTPException(400, "Informe o nome da coluna")
    key = (payload.get("stage_key") or label).strip().lower()
    key = "".join(c if c.isalnum() else "-" for c in key).strip("-") or f"coluna-{secrets.token_hex(3)}"
    statuses = payload.get("statuses") or []
    if not statuses:
        raise HTTPException(400, "Selecione ao menos um status para a coluna")
    target = payload.get("target_status") or statuses[0]
    if target not in statuses:
        raise HTTPException(400, "O status padrão precisa estar entre os status da coluna")
    conn = db()
    if conn.execute("SELECT id FROM kanban_stages WHERE stage_key=?", (key,)).fetchone():
        conn.close(); raise HTTPException(409, "Já existe uma coluna com essa chave")
    _validate_stage_statuses(conn, None, statuses)
    max_order = conn.execute("SELECT COALESCE(MAX(sort_order),0) m FROM kanban_stages").fetchone()["m"]
    cur = conn.execute("INSERT INTO kanban_stages(stage_key,label,hint,accent,statuses,target_status,sort_order) VALUES(?,?,?,?,?,?,?)",
                        (key, label, payload.get("hint") or "", payload.get("accent") or "blue", json.dumps(statuses, ensure_ascii=False), target, max_order + 1))
    conn.commit(); conn.close()
    return {"ok": True, "id": cur.lastrowid}


@app.put("/api/admin/kanban-stages/{stage_id}")
async def admin_update_stage(request: Request, stage_id: int):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM kanban_stages WHERE id=?", (stage_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    statuses = payload.get("statuses", json.loads(row["statuses"]))
    if not statuses:
        conn.close(); raise HTTPException(400, "A coluna precisa manter ao menos um status")
    target = payload.get("target_status", row["target_status"])
    if target not in statuses:
        conn.close(); raise HTTPException(400, "O status padrão precisa estar entre os status da coluna")
    _validate_stage_statuses(conn, stage_id, statuses)
    conn.execute("UPDATE kanban_stages SET label=?, hint=?, accent=?, statuses=?, target_status=?, sort_order=? WHERE id=?",
                 (payload.get("label") or row["label"], payload.get("hint", row["hint"]), payload.get("accent") or row["accent"],
                  json.dumps(statuses, ensure_ascii=False), target, payload.get("sort_order", row["sort_order"]), stage_id))
    conn.commit(); conn.close()
    return {"ok": True}


@app.delete("/api/admin/kanban-stages/{stage_id}")
def admin_delete_stage(request: Request, stage_id: int):
    user = require_user(request); require_admin(user)
    conn = db()
    row = conn.execute("SELECT * FROM kanban_stages WHERE id=?", (stage_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    if json.loads(row["statuses"]):
        conn.close(); raise HTTPException(409, "Mova os status desta coluna para outra antes de excluí-la")
    conn.execute("DELETE FROM kanban_stages WHERE id=?", (stage_id,))
    conn.commit(); conn.close()
    return {"ok": True}


@app.post("/api/admin/schools")
async def admin_create_school(request: Request):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Informe o nome da unidade")
    conn = db()
    
    street = (payload.get("street") or "").strip()
    num = (payload.get("number") or "").strip()
    comp = (payload.get("complement") or "").strip()
    bairro = (payload.get("neighborhood") or "").strip()
    city = (payload.get("city") or "Itaguaí").strip()
    state = (payload.get("state") or "RJ").strip()
    cep = (payload.get("cep") or "").strip()
    
    parts = []
    if street:
        st_num = street + (f", {num}" if num and num.lower() != 's/n' else (", s/n" if num else ""))
        if comp and comp.lower() != 's/n' and comp != num:
            st_num += f" ({comp})"
        parts.append(st_num)
    if bairro: parts.append(bairro)
    parts.append(f"{city} - {state}")
    if cep: parts.append(f"CEP {cep}")
    full_addr = payload.get("full_address") or payload.get("address") or (" · ".join(parts) if parts else f"{city} - {state}")

    inep = payload.get("inep") or payload.get("code") or ""
    try:
        lat = float(payload.get("lat") or payload.get("latitude") or -22.868685)
        lon = float(payload.get("lon") or payload.get("longitude") or -43.788898)
    except (ValueError, TypeError):
        lat, lon = -22.868685, -43.788898

    cur = conn.execute("""
        INSERT INTO schools(
            name, inep, code, director, email, phone, ramal, 
            street, number, complement, neighborhood, city, state, cep, 
            address, full_address, lat, lon, maps_link, modality, school_type, active
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (
        name, inep, inep, payload.get("director") or "", payload.get("email") or "",
        payload.get("phone") or "", payload.get("ramal") or "",
        street, num, comp, bairro, city, state, cep,
        full_addr, full_addr, lat, lon,
        payload.get("maps_link") or "", payload.get("modality") or "",
        payload.get("school_type") or "Escola"
    ))
    conn.commit(); conn.close()
    return {"ok": True, "id": cur.lastrowid}


@app.put("/api/admin/schools/{school_id}")
async def admin_update_school(request: Request, school_id: int):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM schools WHERE id=?", (school_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
        
    street = (payload.get("street") if "street" in payload else row["street"]) or ""
    num = (payload.get("number") if "number" in payload else row["number"]) or ""
    comp = (payload.get("complement") if "complement" in payload else row["complement"]) or ""
    bairro = (payload.get("neighborhood") if "neighborhood" in payload else row["neighborhood"]) or ""
    city = (payload.get("city") if "city" in payload else row["city"]) or "Itaguaí"
    state = (payload.get("state") if "state" in payload else row["state"]) or "RJ"
    cep = (payload.get("cep") if "cep" in payload else row["cep"]) or ""

    parts = []
    if street:
        st_num = street + (f", {num}" if num and num.lower() != 's/n' else (", s/n" if num else ""))
        if comp and comp.lower() != 's/n' and comp != num:
            st_num += f" ({comp})"
        parts.append(st_num)
    if bairro: parts.append(bairro)
    parts.append(f"{city} - {state}")
    if cep: parts.append(f"CEP {cep}")
    full_addr = payload.get("full_address") or payload.get("address") or (" · ".join(parts) if parts else f"{city} - {state}")

    inep = payload.get("inep") or payload.get("code") or row["code"] or row["inep"] or ""
    try:
        lat = float(payload.get("lat") or payload.get("latitude") or row["lat"] or -22.868685)
        lon = float(payload.get("lon") or payload.get("longitude") or row["lon"] or -43.788898)
    except (ValueError, TypeError):
        lat, lon = row["lat"] or -22.868685, row["lon"] or -43.788898

    conn.execute("""
        UPDATE schools SET 
            name=?, inep=?, code=?, director=?, email=?, phone=?, ramal=?,
            street=?, number=?, complement=?, neighborhood=?, city=?, state=?, cep=?,
            address=?, full_address=?, lat=?, lon=?, maps_link=?, modality=?, school_type=?
        WHERE id=?
    """, (
        payload.get("name", row["name"]), inep, inep,
        payload.get("director", row["director"]), payload.get("email", row["email"]),
        payload.get("phone", row["phone"]), payload.get("ramal", row["ramal"]),
        street, num, comp, bairro, city, state, cep,
        full_addr, full_addr, lat, lon,
        payload.get("maps_link", row["maps_link"]),
        payload.get("modality", row["modality"]),
        payload.get("school_type", row["school_type"] or "Escola"),
        school_id
    ))
    conn.commit(); conn.close()
    return {"ok": True}


@app.post("/api/admin/schools/{school_id}/toggle-active")
def admin_toggle_school(request: Request, school_id: int):
    user = require_user(request); require_admin(user)
    conn = db()
    row = conn.execute("SELECT * FROM schools WHERE id=?", (school_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    new_active = 0 if row["active"] else 1
    conn.execute("UPDATE schools SET active=? WHERE id=?", (new_active, school_id))
    conn.commit(); conn.close()
    return {"ok": True, "active": bool(new_active)}


@app.delete("/api/admin/schools/{school_id}")
def admin_delete_school(request: Request, school_id: int):
    user = require_user(request); require_admin(user)
    conn = db()
    demands_c = conn.execute("SELECT COUNT(*) c FROM demands WHERE school_id=?", (school_id,)).fetchone()["c"]
    users_c = conn.execute("SELECT COUNT(*) c FROM users WHERE school_id=?", (school_id,)).fetchone()["c"]
    if demands_c or users_c:
        conn.close(); raise HTTPException(409, "Unidade com demandas ou usuários vinculados. Desative em vez de excluir.")
    conn.execute("DELETE FROM schools WHERE id=?", (school_id,))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/api/admin/profiles")
def admin_list_profiles(request: Request):
    user = require_user(request); require_admin(user)
    conn = db()
    rows = [dict(r) for r in conn.execute("SELECT * FROM access_profiles ORDER BY id").fetchall()]
    conn.close(); return rows


@app.post("/api/admin/profiles")
async def admin_create_profile(request: Request):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    label = (payload.get("label") or "").strip()
    if not label:
        raise HTTPException(400, "Informe o nome do perfil")
    slug = (payload.get("slug") or label).strip().lower()
    slug = "".join(c if (c.isalnum() or c == "_") else "_" for c in slug).strip("_") or f"perfil_{secrets.token_hex(3)}"
    conn = db()
    if conn.execute("SELECT id FROM access_profiles WHERE slug=?", (slug,)).fetchone():
        conn.close(); raise HTTPException(409, "Já existe um perfil com essa identificação")
    cur = conn.execute(
        """INSERT INTO access_profiles(slug,label,description,school_scoped,can_edit_analysis,can_manage_admin,can_view_reports,can_view_planning,is_system,created_at)
           VALUES(?,?,?,?,?,?,?,?,0,?)""",
        (slug, label, payload.get("description") or "", int(bool(payload.get("school_scoped"))), int(bool(payload.get("can_edit_analysis"))),
         int(bool(payload.get("can_manage_admin"))), int(bool(payload.get("can_view_reports"))), int(bool(payload.get("can_view_planning"))), now_iso()))
    conn.commit(); conn.close()
    return {"ok": True, "id": cur.lastrowid, "slug": slug}


@app.put("/api/admin/profiles/{profile_id}")
async def admin_update_profile(request: Request, profile_id: int):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM access_profiles WHERE id=?", (profile_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    conn.execute(
        """UPDATE access_profiles SET label=?, description=?, school_scoped=?, can_edit_analysis=?, can_manage_admin=?,
           can_view_reports=?, can_view_planning=?, active=? WHERE id=?""",
        (payload.get("label") or row["label"], payload.get("description", row["description"]),
         int(bool(payload.get("school_scoped", row["school_scoped"]))), int(bool(payload.get("can_edit_analysis", row["can_edit_analysis"]))),
         int(bool(payload.get("can_manage_admin", row["can_manage_admin"]))), int(bool(payload.get("can_view_reports", row["can_view_reports"]))),
         int(bool(payload.get("can_view_planning", row["can_view_planning"]))), int(bool(payload.get("active", row["active"]))), profile_id))
    conn.commit(); conn.close()
    return {"ok": True}


@app.delete("/api/admin/profiles/{profile_id}")
def admin_delete_profile(request: Request, profile_id: int):
    user = require_user(request); require_admin(user)
    conn = db()
    row = conn.execute("SELECT * FROM access_profiles WHERE id=?", (profile_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    if row["is_system"]:
        conn.close(); raise HTTPException(409, "Perfis padrão do sistema não podem ser excluídos — apenas desativados ou editados.")
    in_use = conn.execute("SELECT COUNT(*) c FROM users WHERE role=?", (row["slug"],)).fetchone()["c"]
    if in_use:
        conn.close(); raise HTTPException(409, f"Perfil em uso por {in_use} usuário(s). Reatribua-os antes de excluir.")
    conn.execute("DELETE FROM access_profiles WHERE id=?", (profile_id,))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/api/admin/users")
def admin_list_users(request: Request):
    user = require_user(request); require_admin(user)
    conn = db()
    rows = conn.execute("""SELECT u.id,u.name,u.email,u.role,u.school_id,u.active,s.name school_name,p.label profile_label
                           FROM users u LEFT JOIN schools s ON s.id=u.school_id
                           LEFT JOIN access_profiles p ON p.slug=u.role ORDER BY u.name""").fetchall()
    conn.close(); return [dict(x) for x in rows]


@app.post("/api/admin/users")
async def admin_create_user(request: Request):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = payload.get("role") or ""
    if not name or not email or not password or not role:
        raise HTTPException(400, "Preencha nome, e-mail, senha e perfil de acesso")
    conn = db()
    profile = get_profile_by_slug(conn, role)
    if not profile:
        conn.close(); raise HTTPException(400, "Perfil de acesso inválido")
    if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        conn.close(); raise HTTPException(409, "Já existe um usuário com esse e-mail")
    school_id = payload.get("school_id")
    if profile["school_scoped"] and not school_id:
        conn.close(); raise HTTPException(400, "Este perfil exige a seleção de uma unidade escolar")
    cur = conn.execute("INSERT INTO users(name,email,password_hash,role,school_id,active) VALUES(?,?,?,?,?,1)",
                        (name, email, hash_password(password), role, school_id or None))
    conn.commit(); conn.close()
    return {"ok": True, "id": cur.lastrowid}


@app.put("/api/admin/users/{user_id}")
async def admin_update_user(request: Request, user_id: int):
    user = require_user(request); require_admin(user)
    payload = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        conn.close(); raise HTTPException(404)
    role = payload.get("role", row["role"])
    profile = get_profile_by_slug(conn, role)
    if not profile:
        conn.close(); raise HTTPException(400, "Perfil de acesso inválido")
    school_id = payload.get("school_id", row["school_id"])
    if profile["school_scoped"] and not school_id:
        conn.close(); raise HTTPException(400, "Este perfil exige a seleção de uma unidade escolar")
    if user_id == user["id"] and not bool(payload.get("active", row["active"])):
        conn.close(); raise HTTPException(400, "Você não pode desativar o seu próprio usuário")
    if user_id == user["id"] and not profile["can_manage_admin"]:
        conn.close(); raise HTTPException(400, "Você não pode remover sua própria permissão de administração")
    conn.execute("UPDATE users SET name=?, email=?, role=?, school_id=?, active=? WHERE id=?",
                 (payload.get("name") or row["name"], payload.get("email") or row["email"], role, school_id or None,
                  int(bool(payload.get("active", row["active"]))), user_id))
    if payload.get("password"):
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_password(payload["password"]), user_id))
    conn.commit(); conn.close()
    return {"ok": True}


@app.get("/health")
def health():
    return {"status":"ok", "database": str(DB_PATH.name), "time": now_iso()}


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=int(os.environ.get("AGENDA_PORT", os.environ.get("PORT", "8017"))), reload=False)
