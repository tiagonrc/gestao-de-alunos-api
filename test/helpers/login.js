import request from 'supertest';
import { expect } from 'chai';
import app from '../../src/app.js';
import cenarios from '../fixtures/cenarios.json' with { type: 'json' };

async function login(credenciais, role) {
  const resposta = await request(app).post('/api/auth/login').send(credenciais);
  expect(resposta.status).to.equal(200);
  expect(resposta.body.token).to.be.a('string').and.not.empty;
  expect(resposta.body.usuario.role).to.equal(role);
  return resposta.body.token;
}

export const loginAdmin = () => login(cenarios.admin, 'admin');
export const loginAluno = (email, senha) => login({ email, senha }, 'aluno');
