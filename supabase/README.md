# Preparacao do banco SEA

As etapas 1 a 4 foram aplicadas ao projeto SEA original (`mbyyifijehebsgezamqw`)
apos aprovacao. Nenhum ambiente de teste remoto foi criado.

## Etapa 1: papel do perfil

Migracao: `migrations/20261024221520_protect_profile_role.sql`, criada com
`supabase migration new protect_profile_role` (CLI 2.122.0). O nome local foi
alinhado a versao `20261024221520` registrada pelo Supabase na aplicacao.

A migracao adiciona uma funcao `SECURITY INVOKER`, com `search_path` vazio,
e um trigger em `public.profiles`. Somente os papeis efetivos do Postgres
`postgres` e `service_role` podem atribuir papeis privilegiados ou mudar um
papel existente. Os clientes comuns podem inserir apenas `aluno` e atualizar
um perfil sem alterar o papel, respeitando tambem a RLS existente.

O bloqueio usa `current_user`, nao o campo `profiles.role`, dados enviados no
corpo da requisicao ou claims editaveis. Ele vale tambem para INSERT e UPSERT,
evitando contornar o UPDATE por exclusao e recriacao do perfil.

Nenhum perfil existente e modificado. A atualizacao atual de pontos continua
funcionando. Um administrador conectado pelo navegador tambem nao pode trocar
papeis diretamente; essa operacao devera passar por um backend autorizado.

## Etapa 2: cadastro e criacao de professores

Migracao: `migrations/20261024222329_secure_account_creation.sql`. O arquivo foi
gerado pela CLI e alinhado a versao registrada no Supabase. A Edge Function
versionada em `functions/smart-action/index.ts` esta publicada na versao 2.

`handle_new_user` agora ignora o papel em metadados editaveis. O papel padrao e
`aluno`; papeis confiaveis podem ser definidos pelo backend em
`app_metadata.sea_role`. A funcao tem `search_path` vazio e EXECUTE revogado
para PUBLIC, anon, authenticated e service_role. O trigger existente permanece
ativo. Falhas ao gravar profiles nao sao mais engolidas: cancelam o cadastro.

`smart-action` valida o token no Auth e exige perfil atual de administrador
com `ativo = true`. Valida o corpo da requisicao, atribui sempre o papel de
professor pelo backend, trata OPTIONS/CORS, limita o retorno ao identificador
e evita expor erros internos. Nenhum papel enviado no corpo e utilizado.

A funcao foi publicada antes da migracao, enviando o papel em app_metadata e
tambem no campo legado de user_metadata para manter compatibilidade durante a
transicao. O trigger novo ignora o campo legado. As contas existentes nao
foram convertidas nem regravadas.

Verificacao posterior: codigo remoto igual ao local, funcao ACTIVE versao 2,
JWT habilitado, trigger de Auth ativo e zero usuarios sem perfil. As contagens
continuam em um aluno, um professor e um administrador. Requisicao OPTIONS
retornou 204 com CORS; POST sem token retornou 401. Nenhuma conta ficticia foi
criada. Os dois alertas de EXECUTE publico de handle_new_user desapareceram;
permanece o alerta de protecao contra senhas vazadas desativada.

TypeScript estrito da Edge Function (com tipos locais e declaracoes Deno em
memoria), TypeScript da aplicacao e lint direcionado passaram. Nao foi feito
cadastro real de aluno/professor para verificar o fluxo completo. O build tambem
passou com `.env` desabilitado e valores ficticios; os avisos conhecidos de
Browserslist e tamanho do bundle permanecem.

## Etapa 3: RLS de perfis e vinculos de turmas

Migracao: `migrations/20261024224416_profile_access_and_teacher_classes.sql`,
gerada pela CLI e alinhada a versao registrada no Supabase.

Foi criada a tabela `professor_turmas`, com chave unica por professor/turma,
RLS e validacao do papel do professor. Nenhum vinculo foi inferido ou criado.
Somente administradores ativos podem inserir/remover vinculos. Professores
ativos leem seus proprios vinculos; alunos nao leem os vinculos de professores.

As politicas de profiles permitem leitura do proprio perfil, inclusive inativo
para logout; administradores ativos leem todos os perfis; professores ativos
leem alunos ativos somente de turmas atribuidas. Auxiliares em `sea_private`
consultam o solicitante identificado por auth.uid(), com search_path vazio,
para evitar recursao. Nao usam metadados editaveis como autorizacao.

Insercao e exclusao de profiles pelo navegador foram bloqueadas; a criacao via
Auth continua passando pelo trigger autorizado. Administradores ativos podem
gerenciar nome, avatar, turma e situacao de alunos/professores, preservando a
protecao de papel. Usuarios comuns nao alteram turma, situacao, identidade ou
badges. O credito de pontos ao proprio aluno ativo permanece como excecao
temporaria para o cliente existente, ate a etapa de pontuacao no servidor.

A RPC `set_professor_turmas` e SECURITY INVOKER, exige administrador ativo e
substitui os vinculos em uma transacao, com bloqueio do perfil do professor.
Uma lista vazia remove todos os vinculos desse professor.

A interface em GerenciarProfessores ganhou coluna e botao Turmas. Dados de
turmas indisponiveis bloqueiam a edicao para evitar apagar vinculos sem saber
o estado atual. DataContext e DashboardProfessor passaram a usar os vinculos
administrativos, em vez das turmas de atividades. Essas mudancas da interface
ainda dependem do deploy do frontend pelo usuario.

Verificacao remota, sem gravacao de dados: em transacoes READ ONLY com o papel
authenticated e contexto de cada perfil existente, administrador visualizou
3 perfis, professor sem vinculos visualizou somente o proprio perfil e aluno
visualizou somente o proprio perfil. A tabela de vinculos permanece vazia;
nao foram feitas atribuicoes ficticias nem exercitadas escritas no original.
Os tres perfis e o vinculo de Auth foram preservados. Nenhum novo alerta de
seguranca apareceu; permanece a protecao contra senhas vazadas desativada.

TypeScript e build passaram. Lint direcionado passou sem erros, com o aviso
de Fast Refresh em DataContext. O build foi feito com envFile desabilitado,
valores ficticios e saida temporaria; permanecem os avisos de Browserslist e
bundle. Nao houve acesso a .env, criacao de ambiente remoto ou commit.

## Etapa 4: RLS de atividades e respostas

Migracao: `migrations/20261024230742_restrict_activity_response_access.sql`,
gerada pela CLI e alinhada a versao registrada no Supabase.

As politicas ALL abertas foram substituidas por regras por operacao. O admin
ativo tem leitura global para relatorios. O professor ativo consulta e gerencia
atividades proprias somente quando todas as turmas pertencem aos seus vinculos.
Rascunhos sem turma continuam permitidos; publicacao exige ao menos uma turma.
Autoria, identificadores e datas existentes nao podem ser regravados pelo cliente.

O aluno ativo consulta atividades publicadas para sua turma somente quando o
professor autor tambem esta vinculado a essa turma. O envio exige aluno_id igual
a auth.uid(), atividade publicada e a mesma elegibilidade. A resposta propria
continua legivel independentemente da disponibilidade atual da atividade. O
professor le respostas de alunos ativos nas atividades proprias autorizadas.

UPDATE e DELETE de respostas pelo navegador foram revogados. INSERT legado
ainda recebe pontuacao e feedback do cliente, ate a etapa da correcao no servidor.
IDs e datas sao gerados no banco. Privilegios CREATE no schema public e TRUNCATE
nas duas tabelas foram retirados dos papeis de API. Anon nao acessa as tabelas.

A FK respostas_atividade_id_fkey passou de ON DELETE CASCADE para ON DELETE
RESTRICT. Assim, a atividade com respostas nao pode ser excluida, mesmo quando
as respostas nao sao visiveis ao autor ou ha operacoes concorrentes. O cliente
mostra uma mensagem explicita para essa recusa. Nenhuma resposta foi regravada.

Os formularios de criar e editar atividades agora oferecem somente as turmas
atribuidas. Eles bloqueiam salvamento com vinculos indisponiveis ou turmas que
deixaram de estar atribuidas, sem descartar silenciosamente essas selecoes.
Essas mudancas da interface dependem do deploy do frontend pelo usuario.

Verificacoes em transacoes READ ONLY com os perfis existentes: admin visualizou
1 atividade e 1 resposta; professor sem vinculos visualizou 0 atividades e 0
respostas; aluno visualizou 0 atividades e sua propria resposta. Para o professor,
a autorizacao de rascunho vazio retornou true. Nenhum contexto pode enviar para
a atividade existente enquanto os vinculos continuam vazios. Nao foram criados
vinculos automaticos, contas ficticias ou submissões. As contagens permanecem em
3 perfis, 1 atividade, 1 resposta e 0 vinculos.

O historico no cliente atual depende de conseguir carregar a atividade: uma
resposta pode nao aparecer no modal enquanto o acesso a atividade estiver
bloqueado. O registro continua preservado no banco. A leitura historica separada
e o versionamento ainda precisam ser preparados em outra etapa.

TypeScript, lint direcionado e build passaram. Persistem os avisos conhecidos
de Fast Refresh em DataContext, Browserslist e bundle. O build nao carregou .env.
O advisor de seguranca manteve somente o alerta de senhas vazadas desativado.
Nao foi exercitado um envio real ou uma exclusao no projeto original.

## Pendencias do backend

- Pontos ainda dependem da correcao e do credito atomicos pelo servidor.
- RLS de atividades/respostas, correcao no servidor, atomicidade, unicidade e
  preservacao de historico permanecem pendentes.
- Separar a entrega das questoes de seus gabaritos: a RLS restringe linhas, mas
  o JSON legado ainda contem gabaritos para qualquer aluno que se torne elegivel.

Esta e uma protecao incremental, nao uma liberacao para ampliar testes com
usuarios reais. Nao aplicar arquivos de teste em producao.

## Verificacao da aplicacao

O Supabase confirmou a aplicacao da migracao `protect_profile_role`. Consultas
posteriores confirmaram o trigger ativo, `SECURITY INVOKER`, `search_path` vazio
e ausencia de EXECUTE para anon, authenticated e service_role. As contagens de
perfis por papel permaneceram em um aluno, um professor e um administrador.
Nao foram criadas contas ficticias ou feitas tentativas de escrita para testar
a protecao no original. Os alertas de seguranca restantes continuam relacionados
ao cadastro legado e a protecao de senhas vazadas naquele momento. Os alertas
do cadastro foram tratados na etapa 2.

## Validacao local

`tests/profile-role-guard.test.mjs` foi utilizado antes da publicacao da etapa 1.
Ele inicia Postgres em memoria via PGlite, reproduz a estrutura anterior a
essas correcoes e as politicas observadas com dados ficticios,
demonstra o problema anterior e aplica a migracao somente nesse banco efemero.
Nao carrega `.env`, nao aceita URL de banco e nao usa a conexao do Supabase.
O fixture legado desse runner nao representa o cadastro corrigido na etapa 2.

O runner aceita o caminho de um modulo PGlite instalado fora do projeto:

```powershell
node supabase/tests/profile-role-guard.test.mjs 'C:\caminho\temporario\node_modules\@electric-sql\pglite\dist\index.js'
```

Foi utilizado `@electric-sql/pglite@0.5.11` em pasta temporaria, sem alterar
`package.json`, lockfiles ou dependencias da aplicacao.

Validacao desta preparacao: 19 cenarios do banco em memoria passaram. TypeScript
(`tsconfig.app.json` e `tsconfig.node.json`), lint direcionado a
`DashboardAdmin.tsx` e verificacao de sintaxe do runner tambem passaram.
O build passou com `envFile: false`, valores ficticios e saida temporaria;
permanecem os avisos conhecidos de Browserslist e bundle acima de 500 kB.

Por decisao do usuario, as proximas etapas serao feitas diretamente no projeto
original, sem criar ambiente remoto de teste. Cada nova mudanca continua sujeita
ao relatorio previo e aprovacao. Testes locais de Postgres nao equivalem a
validacao de Auth, Data API e Edge Functions reais. Nenhum projeto foi vinculado
pela CLI; a aplicacao foi feita pela integracao Supabase.
