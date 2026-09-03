import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Informe seu e-mail e senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Erro ao efetuar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    login(quickEmail, quickPassword).catch((err) => setError(err.message));
  };

  return (
    <div className="login-screen" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #071d41 0%, #005a9c 100%)', padding: '20px'
    }}>
      <div className="login-card" style={{
        background: 'var(--surface)', borderRadius: '16px', maxWidth: '440px', width: '100%',
        padding: '36px 32px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', textAlign: 'center'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <img
            src="/static/brasao.png"
            alt="Prefeitura de Itaguaí"
            style={{ width: '84px', height: 'auto', margin: '0 auto 12px', display: 'block' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--blue-dark)', margin: '0 0 4px' }}>
            Agenda Integrada
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Infraestrutura e Gestão Escolar · SMEDU Itaguaí
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{
            background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171',
            borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px', textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              E-mail institucional
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@edu.itaguai.rj.gov.br"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Senha
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--primary)',
              color: '#fff', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer'
            }}
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--line)', fontSize: '12px' }}>
          <span style={{ color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Acesso de demonstração:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('gestor@agenda.local', 'gestor123')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Gestor da Infraestrutura
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('escola@agenda.local', 'escola123')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Unidade Escolar (Direção)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('planejamento@agenda.local', 'plan123')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Equipe de Planejamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
