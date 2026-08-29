from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request, Form, UploadFile, File, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
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
            email TEXT
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
        """
    )

    if conn.execute("SELECT COUNT(*) c FROM schools").fetchone()["c"] == 0:
        schools = [
            ("E.M. Prefeito Otoni Rocha", "Mariana Oliveira", "Itaguaí - RJ", "(21) 3782-1001", "otoni@edu.itaguai.rj.gov.br"),
            ("C.M. Senador Teotônio Vilella", "Carlos Menezes", "Itaguaí - RJ", "(21) 3782-1002", "teotonio@edu.itaguai.rj.gov.br"),
            ("E.M. João Vicente Soares", "Patrícia Lima", "Itaguaí - RJ", "(21) 3782-1003", "joaovicente@edu.itaguai.rj.gov.br"),
            ("E.M. Oscar José de Souza", "Erika Francisca Ferreira Silva de Matos", "Itaguaí - RJ", "(21) 3782-1004", "oscar@edu.itaguai.rj.gov.br"),
            ("E.M. Vereador Prof. Artur Bittó de Castro", "Renata Alves", "Itaguaí - RJ", "(21) 3782-1005", "arturbitto@edu.itaguai.rj.gov.br"),
            ("C.M. Teresinha de Jesus Campos de Farias", "Luciana Rocha", "Itaguaí - RJ", "(21) 3782-1006", "teresinha@edu.itaguai.rj.gov.br"),
        ]
        conn.executemany("INSERT INTO schools(name,director,address,phone,email) VALUES(?,?,?,?,?)", schools)

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

    conn.commit()
    conn.close()


init_db()


def current_user(request: Request):
    uid = request.session.get("user_id")
    if not uid:
        return None
    conn = db()
    user = conn.execute("SELECT u.id,u.name,u.email,u.role,u.school_id,s.name school_name FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.id=?", (uid,)).fetchone()
    conn.close()
    return dict(user) if user else None


def require_user(request: Request):
    user = current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return user


def render(request: Request, template: str, **context):
    user = current_user(request)
    if not user:
        return RedirectResponse("/login", status_code=303)
    base = {
        "request": request,
        "user": user,
        "priorities": PRIORITIES,
        "statuses": STATUSES,
        "categories": CATEGORIES,
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


@app.get("/planejamento", response_class=HTMLResponse)
def planning_page(request: Request):
    return render(request, "index.html", page="planning", title="Planejamento Futuro")


@app.get("/escolas", response_class=HTMLResponse)
def schools_page(request: Request):
    return render(request, "index.html", page="schools", title="Unidades Escolares")


@app.get("/relatorios", response_class=HTMLResponse)
def reports_page(request: Request):
    return render(request, "index.html", page="reports", title="Relatórios")


@app.get("/administracao", response_class=HTMLResponse)
def admin_page(request: Request):
    return render(request, "index.html", page="admin", title="Administração")


@app.get("/sobre", response_class=HTMLResponse)
def about_page(request: Request):
    return render(request, "index.html", page="about", title="Sobre o Sistema")


@app.get("/api/about")
def api_about(request: Request):
    require_user(request)
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
        "roles": [
            {"role": "gestor", "label": "Gestor da Infraestrutura", "description": "Visão completa, análise técnica, priorização, relatórios e administração."},
            {"role": "escola", "label": "Unidade Escolar", "description": "Cadastro e acompanhamento das demandas da própria unidade."},
            {"role": "planejamento", "label": "Planejamento", "description": "Consolidação de demandas futuras, exercícios e planejamento orçamentário."},
        ],
    }


def demand_scope_sql(user: dict):
    if user["role"] == "escola" and user.get("school_id"):
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
    stats = {
        "total": total,
        "urgent": sum(1 for d in data if d["priority"] == "P1" and d["status"] != "Concluída"),
        "analysis": sum(1 for d in data if d["status"] in ("Em triagem", "Em análise técnica", "Recebida")),
        "progress": sum(1 for d in data if d["status"] in ("Em execução", "Parcialmente executada", "Serviço programado")),
        "contract": sum(1 for d in data if d["status"] in ("Aguardando contratação", "Aguardando empresa")),
        "overdue": overdue,
        "completed": completed,
        "future": sum(1 for d in data if d["status"] == "Planejamento futuro" or d["future_year"]),
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
    conn.close()
    return {"stats": stats, "recent": [dict(x) for x in recent], "attention": [dict(x) for x in attention], "categories": [dict(x) for x in category_rows], "status_breakdown": [dict(x) for x in status_rows]}


@app.get("/api/demands")
def api_demands(request: Request, q: str = "", status: str = "", priority: str = "", category: str = "", year: str = "", overdue: int = 0):
    user = require_user(request)
    where = ["1=1"]
    params: list = []
    if user["role"] == "escola" and user.get("school_id"):
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
    if user["role"] == "escola" and row["school_id"] != user.get("school_id"):
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
    if user["role"] == "escola":
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
    if user["role"] == "escola" and old["school_id"] != user.get("school_id"):
        conn.close(); raise HTTPException(403)
    allowed = ["title", "description", "category", "subcategory", "location", "impact", "affected_people", "risk", "blocks_activity"]
    if user["role"] != "escola":
        allowed += ["priority", "status", "due_date", "responsible", "sector", "cost_estimate", "action_defined", "technical_opinion", "dependencies", "needs_visit", "needs_budget", "needs_material", "needs_contract", "future_year", "planning_kind", "planned_quantity", "planned_unit"]
    changes = []
    for key in allowed:
        if key in payload:
            new = payload[key]
            if key in ("risk", "blocks_activity", "needs_visit", "needs_budget", "needs_material", "needs_contract"):
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
        labels = {"priority":"Prioridade", "status":"Status", "due_date":"Prazo", "responsible":"Responsável", "future_year":"Exercício futuro"}
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
    if user["role"] == "escola" and demand["school_id"] != user.get("school_id"):
        conn.close(); raise HTTPException(403)
    conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,visibility,created_at) VALUES(?,?,?,?,?,?)", (demand_id, kind, message, user["name"], visibility, now_iso()))
    conn.execute("UPDATE demands SET updated_at=? WHERE id=?", (now_iso(), demand_id))
    conn.commit(); conn.close()
    return {"ok": True}


@app.post("/api/demands/{demand_id}/attachments")
async def upload_attachment(request: Request, demand_id: int, file: UploadFile = File(...)):
    user = require_user(request)
    conn = db()
    demand = conn.execute("SELECT school_id FROM demands WHERE id=?", (demand_id,)).fetchone()
    if not demand:
        conn.close(); raise HTTPException(404)
    if user["role"] == "escola" and demand["school_id"] != user.get("school_id"):
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
    conn.execute("INSERT INTO attachments(demand_id,filename,stored_name,mime,size,created_at) VALUES(?,?,?,?,?,?)", (demand_id, file.filename or "arquivo", stored, file.content_type, len(content), now_iso()))
    conn.execute("INSERT INTO demand_updates(demand_id,kind,message,author,created_at) VALUES(?,?,?,?,?)", (demand_id, "Anexo", f"Arquivo anexado: {file.filename}", user["name"], now_iso()))
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


@app.get("/api/schools")
def api_schools(request: Request):
    user = require_user(request)
    conn = db()
    if user["role"] == "escola":
        rows = conn.execute("""SELECT s.*, COUNT(d.id) total_demands,
                             SUM(CASE WHEN d.status='Concluída' THEN 1 ELSE 0 END) completed,
                             SUM(CASE WHEN d.priority='P1' AND d.status!='Concluída' THEN 1 ELSE 0 END) urgent
                             FROM schools s LEFT JOIN demands d ON d.school_id=s.id WHERE s.id=? GROUP BY s.id""", (user["school_id"],)).fetchall()
    else:
        rows = conn.execute("""SELECT s.*, COUNT(d.id) total_demands,
                             SUM(CASE WHEN d.status='Concluída' THEN 1 ELSE 0 END) completed,
                             SUM(CASE WHEN d.priority='P1' AND d.status!='Concluída' THEN 1 ELSE 0 END) urgent
                             FROM schools s LEFT JOIN demands d ON d.school_id=s.id GROUP BY s.id ORDER BY s.name""").fetchall()
    conn.close(); return [dict(x) for x in rows]


@app.get("/api/schools/{school_id}")
def api_school(request: Request, school_id: int):
    user = require_user(request)
    if user["role"] == "escola" and school_id != user.get("school_id"):
        raise HTTPException(403)
    conn = db()
    school = conn.execute("SELECT * FROM schools WHERE id=?", (school_id,)).fetchone()
    if not school: conn.close(); raise HTTPException(404)
    demands = conn.execute("SELECT * FROM demands WHERE school_id=? ORDER BY datetime(updated_at) DESC", (school_id,)).fetchall()
    conn.close()
    return {"school": dict(school), "demands": [dict(x) for x in demands]}


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


@app.post("/api/planning")
async def create_planning(request: Request):
    user = require_user(request)
    if user["role"] == "escola":
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
    if user["role"] == "escola": raise HTTPException(403)
    conn = db()
    data = {
        "schools": conn.execute("SELECT COUNT(*) c FROM schools").fetchone()["c"],
        "users": conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"],
        "demands": conn.execute("SELECT COUNT(*) c FROM demands").fetchone()["c"],
        "planning": conn.execute("SELECT COUNT(*) c FROM planning_items").fetchone()["c"],
        "attachments": conn.execute("SELECT COUNT(*) c FROM attachments").fetchone()["c"],
        "db_size": DB_PATH.stat().st_size if DB_PATH.exists() else 0,
    }
    conn.close(); return data


@app.get("/api/export/demands.csv")
def export_demands(request: Request, status: str = "", priority: str = ""):
    user = require_user(request)
    where=["1=1"]; params=[]
    if user["role"] == "escola": where.append("d.school_id=?"); params.append(user["school_id"])
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


@app.get("/health")
def health():
    return {"status":"ok", "database": str(DB_PATH.name), "time": now_iso()}


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=int(os.environ.get("AGENDA_PORT", os.environ.get("PORT", "8017"))), reload=False)
