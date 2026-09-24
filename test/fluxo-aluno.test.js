import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Trabalho from '../src/models/trabalho.model.js';
import Matricula from '../src/models/matricula.model.js';
import cenarios from './fixtures/cenarios.json' with { type: 'json' };
import { loginAdmin, loginAluno } from './helpers/login.js';

describe('Fluxo de cadastro e entrega de trabalho', () => {
  after(async () => {
    await mongoose.disconnect();
  });

  it('recusa senha incorreta no login de administrador', async () => {
    const resposta = await request(app).post('/api/auth/login')
      .send({ ...cenarios.admin, senha: 'senha-incorreta' });
    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('E-mail ou senha inválidos.');
  });

  for (const { aluno, disciplinaId, trabalho } of cenarios.cenarios) {
    it(`cadastra ${aluno.nome}, autentica e registra sua entrega`, async () => {
      const identificador = randomUUID();
      const dadosAluno = {
        ...aluno,
        email: `teste-${identificador}@example.com`,
        matricula: identificador,
      };
      let alunoId;
      let trabalhoId;

      try {
        const adminToken = await loginAdmin();
        const cadastro = await request(app).post('/api/admin/alunos')
          .set('Authorization', `Bearer ${adminToken}`).send(dadosAluno);
        expect(cadastro.status).to.equal(201);
        expect(cadastro.body).to.include({ nome: aluno.nome, email: dadosAluno.email });
        expect(cadastro.body).not.to.have.property('senha');
        alunoId = cadastro.body.id;
        expect(alunoId).to.be.a('string');

        const matricula = await request(app)
          .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
          .set('Authorization', `Bearer ${adminToken}`).send({ alunoId });
        expect(matricula.status).to.equal(201);

        const alunoToken = await loginAluno(dadosAluno.email, aluno.senha);
        const tentativaAdmin = await request(app).get('/api/admin/alunos')
          .set('Authorization', `Bearer ${alunoToken}`);
        expect(tentativaAdmin.status).to.equal(403);

        const entrega = await request(app).post(`/api/alunos/${alunoId}/trabalhos`)
          .set('Authorization', `Bearer ${alunoToken}`)
          .send({ ...trabalho, disciplinaId });
        expect(entrega.status).to.equal(201);
        expect(entrega.body).to.include({
          alunoId, disciplinaId, titulo: trabalho.titulo, status: 'entregue',
        });
        expect(entrega.body.dataEntrega).to.be.a('string');
        trabalhoId = entrega.body.id;

        const listagem = await request(app).get(`/api/alunos/${alunoId}/trabalhos`)
          .set('Authorization', `Bearer ${alunoToken}`);
        expect(listagem.status).to.equal(200);
        expect(listagem.body.some(({ id }) => id === trabalhoId)).to.equal(true);
      } finally {
        if (trabalhoId) await Trabalho.findByIdAndDelete(trabalhoId);
        if (alunoId) {
          await Matricula.deleteMany({ alunoId });
          await request(app).delete(`/api/admin/alunos/${alunoId}`)
            .set('Authorization', `Bearer ${await loginAdmin()}`);
        }
      }
    });
  }
});
