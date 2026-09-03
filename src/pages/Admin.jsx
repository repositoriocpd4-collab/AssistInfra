import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [profiles, setProfiles] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('access_profiles').select('*').order('id'),
      supabase.from('users').select('*, schools(name)').order('id'),
    ]).then(([resP, resU]) => {
      setProfiles(resP.data || []);
      setUsersList(resU.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-content">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--blue-dark)' }}>
          Administração do Ambiente
        </h1>
        <p className="text-muted" style={{ margin: '4px 0 0' }}>
          Gestão de usuários, perfis de acesso e parâmetros do sistema
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Tabela de Usuários */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', color: 'var(--blue-dark)' }}>
            Usuários Cadastrados ({usersList.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Nome</th>
                  <th style={{ padding: '8px' }}>E-mail</th>
                  <th style={{ padding: '8px' }}>Perfil</th>
                  <th style={{ padding: '8px' }}>Unidade Associada</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: '600' }}>{u.name}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--muted)' }}>{u.email}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span className="badge P4">{u.role}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>{u.schools?.name || 'Visão Geral (Todas)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Perfis de Acesso */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', color: 'var(--blue-dark)' }}>
            Perfis de Acesso e Regras
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Perfil</th>
                  <th style={{ padding: '8px' }}>Escopo</th>
                  <th style={{ padding: '8px' }}>Permissões</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 8px' }}>
                      <strong>{p.label}</strong>
                      <small style={{ display: 'block', color: 'var(--muted)' }}>{p.slug}</small>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      {p.school_scoped ? 'Restrito à própria escola' : 'Visão completa da rede'}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.can_edit_analysis && <span className="badge P4">Análise técnica</span>}
                        {p.can_manage_admin && <span className="badge P4">Administração</span>}
                        {p.can_view_reports && <span className="badge P4">Relatórios</span>}
                        {p.can_view_planning && <span className="badge P4">Planejamento</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
