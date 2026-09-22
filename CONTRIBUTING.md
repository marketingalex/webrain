# Acompanhar e contribuir

Este repositório contém o frontend demonstrativo do WeBrain. A aplicação abre
diretamente pelo `index.html`; a prévia de login está em `login.html`.

- Use Issues para registrar problemas e propostas, indicando tela, passos para
  reproduzir e resultado esperado.
- Faça alterações em uma branch e envie um pull request com resumo e validação.
- Não adicione credenciais, dados reais de clientes, arquivos de configuração
  privados ou exportações do armazenamento do navegador.

Execute os testes com Node.js, a partir da raiz do repositório. Este comando
funciona também no Windows, sem depender da expansão de curingas pelo shell:

```sh
node -e "const fs=require('fs'),cp=require('child_process');const files=fs.readdirSync('tests').filter(x=>x.endsWith('.test.cjs')).map(x=>'tests/'+x);process.exitCode=cp.spawnSync(process.execPath,['--test',...files],{stdio:'inherit'}).status;"
```

O roteiro `tests/verificacao.html` cobre verificações adicionais no navegador.
Os testes de Node não substituem a revisão visual e a navegação por teclado.

Autenticação e integrações externas ainda não estão implementadas. As alterações
do protótipo são armazenadas no navegador e não são compartilhadas entre pessoas.
