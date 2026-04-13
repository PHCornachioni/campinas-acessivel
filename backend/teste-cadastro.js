// Script rápido para testar nossa rota POST
fetch('http://localhost:3000/api/locais', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nome: "SESC Campinas",
    tipo: "Centro Cultural",
    endereco: "R. Dom José I, 270/333 - Bonfim, Campinas - SP",
    latitude: -22.895315,
    longitude: -47.076632,
    acessibilidade_fisica: true,
    acessibilidade_visual: true,
    acessibilidade_auditiva: false,
    acessibilidade_intelectual: true
  })
})
.then(resposta => resposta.json())
.then(dados => console.log('Resposta da API:', dados))
.catch(erro => console.error('Erro no envio:', erro));