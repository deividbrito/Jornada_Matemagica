# Roteiro — Jornada Matemágica

Roteiro completo para a run contínua narrativa. Cada bloco é uma cutscene a ser implementada via `OverworldEvent.textMessage` (texto-por-vez). Falas estão cortadas em mensagens curtas (~120-180 caracteres) para caber bem no `TextMessage` do jogo.

---

## Premissa

O **Colégio Saint-Math** foi tomado por uma magia antiga. O **Mago Sombrio**, antigo vice-diretor amargurado pela aposentadoria forçada, descobriu um grimório nos arquivos da biblioteca e enfeitiçou seis alunos e professores — cada um se tornou guardião distorcido de um conceito matemático que dominava em vida.

**Alice**, aluna recém-chegada, é a única que ainda consegue raciocinar livre do feitiço. Ela precisa percorrer as salas, derrotar cada mago num duelo de provas matemáticas, e libertar as pessoas presas dentro dos guardiões. No fim, encarará o próprio Mago Sombrio no Jardim.

A filosofia: cada mago acredita que **seu** conceito é o único caminho verdadeiro. Alice prova, através do domínio, que a matemática é uma rede — não um único trono.

---

## Personagens

| Sprite | Papel | Personalidade |
|---|---|---|
| `alice.png` | Protagonista | Curiosa, prática, fala pouco |
| `p1.png` | **Professor Mentor** (Corredor) | Sereno, enigmático, antigo professor de Alice |
| `p2.png`-`p5.png` | NPCs auxiliares | Figuras que sobreviveram, dão dicas |
| `figurante1.png`-`figurante10.png` | Alunos comuns | Aterrorizados, comentários ambientais |
| `vilao.png` | **Mago Sombrio** | Antagonista oculto; ex-vice-diretor; voz ecoante |
| `vilao2.png` | **Conde dos Decimais** (Sala 1) | Formal, lento, pedante. Ex-professor de cálculo |
| `vilao3.png` | **Mestre da Aproximação** (Sala 2) | Confuso, divagador. Ex-bibliotecário |
| `vilao4.png` | **Sentinela dos Primos** (Grêmio) | Frio, analítico. Ex-presidente do grêmio |
| `vilao5.png` | **Bibliófilo das Frações** (Biblioteca) | Culto, melancólico. Ex-professor de literatura |
| `vilao6.png` | **Trapaceiro Racional** (Pátio) | Debochado, irônico. Ex-aluno popular |
| `vilao7.png` | **Mestre das Porcentagens** (Jardim) | Ameaçador, hierárquico. Ex-coordenador |

---

## Capítulo 0 — Abertura

**Onde:** Corredor, primeiro boot do jogador (storyFlag `intro_done` ausente)
**Gatilho:** mapa carrega; cutscene auto-disparada via `entryCutscene` com `required: !intro_done`

```
[Alice acorda no chão do Corredor, sozinha. Tela escurecida que abre.]

Alice: ...onde estão todos?

[Professor Mentor caminha lentamente em direção a ela.]

Professor: Alice. Que bom que você acordou.
Professor: Algo terrível aconteceu enquanto você dormia na biblioteca.
Professor: Seis alunos e professores foram tomados por uma magia antiga.
Professor: Cada um se trancou numa sala diferente, dominado por um conceito que amava em vida.
Professor: Você é a única que ainda pensa com clareza. Sabe o que isso significa?

Alice: ...que sou a única que pode pará-los?

Professor: Sim. Comece pela Sala 1. O Conde dos Decimais já está te esperando.
Professor: Use as setas para se mover, e Enter para falar com quem encontrar.
Professor: Quando derrotar todos os seis... volte aqui. Há algo maior por trás disso.

[Mentor recua, dando passagem.]
```

**Salva:** `storyFlags.intro_done = true`

---

## Capítulo 1 — O Conde dos Decimais

### 1.A — Aviso (figurante perto da porta da Sala 1)

**Onde:** Corredor, tile próximo à porta da Sala 1
**Gatilho:** primeira vez pisando no tile (`cutsceneSpaces`, `required: !mago1_aviso`)

```
[Figurante encolhido contra a parede, tremendo.]

Figurante: Não... não entre aí!
Figurante: Eu o vi! Ele está cobrindo o quadro com vírgulas. Não para. Não pisca.
Figurante: Ele murmura números... números que nunca terminam.
```

**Salva:** `storyFlags.mago1_aviso = true`

### 1.B — Pré-luta (falar com Conde dentro da Sala 1)

**Onde:** Sala 1, falar com NPC mago (`vilao2.png`, antes da derrota)
**Gatilho:** `talking` com `required: !MAGO_DECIMAIS_DERROTADO`

```
[Alice se aproxima. O Conde nem se vira.]

Conde: ...zero vírgula zero zero zero... um... cinco...
Conde: Ah. Uma intrusa.

[Vira-se lentamente.]

Conde: Você acha que sabe contar? Que conhece o valor de cada algarismo?
Conde: Mostre-me. Erre uma única vírgula, e eu te apago do quadro.

[O combate matemático começa.]
```

Após o jogador aceitar (ou ao abrir o menu de quiz), inicia a fase `sala1_decimais` → teleport pra `Desafio1d1`.

### 1.C — Pós-luta (falar com Conde derrotado na Sala 1)

**Onde:** Sala 1, falar com mago após `MAGO_DECIMAIS_DERROTADO`
**Gatilho:** `talking` com `required: [MAGO_DECIMAIS_DERROTADO]`. Sprite trocado para `vilao2_derrotado.png`.

```
[Conde sentado no chão, exausto, lúcido pela primeira vez em dias.]

Conde: ...obrigado. Eu já não me lembrava do meu próprio nome.
Conde: Quando o Mago Sombrio me tocou, tudo virou número. Eu só conseguia ver vírgulas.
Conde: Cada aluno que entrava nesta sala... eu queria apagar.

Alice: Quem é o Mago Sombrio?

Conde: Alguém que esta escola esqueceu. E que não esquece. Cuide-se, Alice.
```

---

## Capítulo 2 — Mestre da Aproximação

### 2.A — Aviso

**Onde:** Corredor, tile próximo à porta da Sala 2
**Gatilho:** primeira vez no tile, `required: [MAGO_DECIMAIS_DERROTADO, !mago2_aviso]`

```
[Outro figurante, mais inquieto.]

Figurante: A Sala 2... ela respira.
Figurante: Tudo lá dentro fica meio fora de foco, sabe? Meio aproximado.
Figurante: Eu queria contar quantas cadeiras tinham. Mas não consegui... era sempre "umas dez"...
```

### 2.B — Pré-luta

**Onde:** Sala 2, falar com `vilao3.png`
**Gatilho:** `required: [!MAGO_APROXIMACAO_DERROTADO]`

```
[O Mestre balança levemente, como se não soubesse onde está parado.]

Mestre: Aproximadamente... uma intrusa. Mais ou menos uma ameaça.
Mestre: Por que se importar com a casa do meio? Com a casa exata?
Mestre: O suficiente sempre foi suficiente. Por que insistir em ser preciso?
Mestre: Mostre-me que sabe arredondar... antes que eu te arredonde pra fora daqui.
```

### 2.C — Pós-luta

**Onde:** Sala 2, mago derrotado (`vilao3_derrotado.png`)
**Gatilho:** `required: [MAGO_APROXIMACAO_DERROTADO]`

```
[Mestre olha para as próprias mãos, vendo-as nitidamente pela primeira vez.]

Mestre: Eu via tudo borrado. Tudo "mais ou menos". E achava bom assim.
Mestre: Mas precisão importa, não importa? Saber onde está o número exato... é saber onde você está.
Mestre: O Sombrio me ofereceu o conforto da imprecisão. Eu aceitei.

Alice: Conforto?

Mestre: Se você nunca tenta acertar... você nunca erra. Mas também nunca chega a lugar nenhum.
```

---

## Capítulo 3 — Sentinela dos Primos

### 3.A — Aviso

**Onde:** Corredor, tile próximo à porta do Grêmio
**Gatilho:** primeira vez, `required: [MAGO_APROXIMACAO_DERROTADO, !mago3_aviso]`

```
[Figurante mexendo em papéis amassados.]

Figurante: A Sentinela rasgou todas as listas de presença.
Figurante: Disse que só os indivisíveis tinham direito a ficar. Que os outros eram "ruído".
Figurante: Ela contou um por um. Os que eram primos, ficaram. Os outros... sumiram.
```

### 3.B — Pré-luta

**Onde:** Grêmio, falar com `vilao4.png`
**Gatilho:** `required: [!MAGO_PRIMOS_DERROTADO]`

```
[A Sentinela está em pé, imóvel, contando algo em silêncio.]

Sentinela: Dois. Três. Cinco. Sete.
Sentinela: Você não está na lista. Você é... composta.

Alice: Composta de quê?

Sentinela: De partes. De divisões. De fraquezas.
Sentinela: O número primo é puro. Indivisível. Como deveria ser todo aluno deste colégio.
Sentinela: Prove que sabe a diferença entre o puro e o sujo. Ou seja descartada.
```

### 3.C — Pós-luta

**Onde:** Grêmio, derrotada (`vilao4_derrotado.png`)
**Gatilho:** `required: [MAGO_PRIMOS_DERROTADO]`

```
[Sentinela está sentada, recolhendo os papéis que rasgou.]

Sentinela: Eu fui presidente do grêmio. Eu organizava festas, debates, eleições.
Sentinela: O Sombrio me disse que só os "melhores" mereciam representação.
Sentinela: E eu acreditei. Eu acreditei que dividir era fraqueza.

Alice: Mas todo número composto é feito de primos.

Sentinela: ...sim. Eu esqueci disso. Obrigada.
```

---

## Transição 1 — Metade do Caminho

**Onde:** Corredor, ao retornar após derrotar os 3 primeiros magos
**Gatilho:** `cutsceneSpaces` no tile central do Corredor, `required: [MAGO_PRIMOS_DERROTADO, !metade_caminho_done]`

```
[Professor Mentor está esperando, olhando para uma das paredes do Corredor.]

Professor: Três magos. Três alunos libertos. Você é mais forte do que eu esperava, Alice.

[Pausa. Mentor vira-se.]

Professor: Mas você precisa saber quem está por trás disso.
Professor: O nome dele se foi dos registros. A escola o expulsou há vinte anos.
Professor: Ele era vice-diretor. Adorava número, ordem, hierarquia.
Professor: Quando o tiraram do cargo... ele não conseguiu aceitar.

Alice: Ele virou o Mago Sombrio?

Professor: Ele descobriu algo na biblioteca. Algo que esta escola devia ter queimado.
Professor: Cuidado. Os próximos três magos sentirão o cheiro dele em você.
```

**Salva:** `storyFlags.metade_caminho_done = true`

---

## Capítulo 4 — Bibliófilo das Frações

### 4.A — Aviso

**Onde:** Corredor, porta da Biblioteca
**Gatilho:** `required: [MAGO_PRIMOS_DERROTADO, !mago4_aviso]`

```
[Figurante segurando metade de um livro.]

Figurante: Ele rasga. Ele rasga tudo.
Figurante: Diz que os livros mentem quando falam de "inteiros". Que não existe inteiro.
Figurante: Só pedaços. Só denominadores e numeradores.
Figurante: Eu salvei só esta metade...
```

### 4.B — Pré-luta

**Onde:** Biblioteca, `vilao5.png`
**Gatilho:** `required: [!MAGO_FRACOES_DERROTADO]`

```
[Bibliófilo está sentado entre montes de páginas soltas, lendo metade de um livro.]

Bibliófilo: Você chegou em pedaços, Alice. Como todos nós.
Bibliófilo: Meu corpo é três quartos memória, um quarto presente.
Bibliófilo: Minha alma é dois terços tristeza, um terço esperança que rasguei.
Bibliófilo: Você acha que existe inteiro? Diga-me, antes que eu te divida também.
Bibliófilo: Some, subtraia, compare. Mostre-me que entende as partes.
```

### 4.C — Pós-luta

**Onde:** Biblioteca, derrotado (`vilao5_derrotado.png`)
**Gatilho:** `required: [MAGO_FRACOES_DERROTADO]`

```
[Bibliófilo está colando páginas soltas com fita adesiva, tentando reconstruir um livro.]

Bibliófilo: Você somou minhas partes. Conseguiu juntar o que eu separava.
Bibliófilo: Eu era professor de literatura. Eu ensinava poesia.
Bibliófilo: Mas ninguém ouvia. As salas estavam sempre vazias.
Bibliófilo: O Sombrio me sussurrou que se eu virasse fragmentos... talvez alguém recolhesse.

Alice: Eu vou ler seus livros. Os inteiros e os que sobraram.

Bibliófilo: ...isso é mais do que eu mereço.
```

---

## Capítulo 5 — Trapaceiro Racional

### 5.A — Aviso

**Onde:** Corredor, porta do Pátio
**Gatilho:** `required: [MAGO_FRACOES_DERROTADO, !mago5_aviso]`

```
[Figurante encostado na parede, com cara de derrotado.]

Figurante: O Trapaceiro me convenceu de que três vezes dois era cinco.
Figurante: E eu ri junto com ele. Eu RI. Como se fosse engraçado.
Figurante: Ele faz isso. Ele faz parecer que regra é piada.
Figurante: Não caia nisso, Alice. Por favor.
```

### 5.B — Pré-luta

**Onde:** Pátio, `vilao6.png`
**Gatilho:** `required: [!MAGO_RACIONAIS_DERROTADO]`

```
[O Trapaceiro está jogando uma moeda no ar, pegando-a sem olhar.]

Trapaceiro: Olha só quem chegou! A herói da escola!
Trapaceiro: Quer apostar? Eu te dou dois terços, você me dá metade. Ninguém perde, ninguém ganha. Topa?

Alice: Isso não faz sentido.

Trapaceiro: EXATAMENTE! Hahaha! Sentido é só um acordo entre tolos.
Trapaceiro: Mas tudo bem, vamos brincar do seu jeito. Operações com racionais. Você. Eu. Cinco rodadas.
Trapaceiro: Tenta acompanhar. Se conseguir.
```

### 5.C — Pós-luta

**Onde:** Pátio, derrotado (`vilao6_derrotado.png`)
**Gatilho:** `required: [MAGO_RACIONAIS_DERROTADO]`

```
[Trapaceiro está sentado no chão, sem rir. A moeda está parada na mão dele.]

Trapaceiro: ...você levou a sério. Ninguém leva a sério.
Trapaceiro: Eu era o mais popular daqui. Todo mundo ria das minhas piadas.
Trapaceiro: Mas ninguém me ouvia quando eu falava sério. Então eu parei de falar sério.
Trapaceiro: O Sombrio me ofereceu uma piada eterna. Uma onde ninguém me cobrava resposta.

Alice: Você ainda pode falar sério. Comigo, pelo menos.

Trapaceiro: ...obrigado. Mesmo.
```

---

## Transição 2 — Antes do Jardim

**Onde:** Pátio, ao se aproximar do portão para o Jardim
**Gatilho:** `cutsceneSpaces` no tile do portão, `required: [MAGO_RACIONAIS_DERROTADO, !antes_jardim_done]`

```
[Alice se aproxima do portão. O ar fica mais frio. Sons da escola desaparecem.]

Alice: ...por que o jardim está tão silencioso?

[Voz do Professor Mentor ecoa, vinda de longe.]

Professor (eco): Alice. Está me ouvindo?
Professor (eco): O último mago não é como os outros. Ele já estava perdido antes do feitiço.
Professor (eco): O Sombrio o escolheu primeiro. Ele é o mais próximo de virar o Sombrio.
Professor (eco): Se você cair lá dentro... ninguém vem te buscar.

Alice: Eu não vou cair.

Professor (eco): Eu sei. Por isso eu te chamei.
```

**Salva:** `storyFlags.antes_jardim_done = true`

---

## Capítulo 6 — Mestre das Porcentagens

### 6.A — Aviso (sem figurante; ambiente)

**Onde:** Jardim, entrada
**Gatilho:** `cutsceneSpaces` no tile de entrada, `required: !mago6_aviso`

```
[O Jardim está enevoado. As plantas estão imóveis, como se congeladas no tempo.]

Alice: ...as plantas. Elas não se mexem.
Alice: É como se 100% delas tivessem parado de existir ao mesmo tempo.
```

**Salva:** `storyFlags.mago6_aviso = true`

### 6.B — Pré-luta

**Onde:** Jardim, `vilao7.png`
**Gatilho:** `required: [!MAGO_PORCENTAGEM_DERROTADO]`

```
[O Mestre está parado no centro, mãos atrás das costas. Não se vira.]

Mestre: 100% dos que entraram neste jardim... 100% foram aniquilados.
Mestre: A estatística é minha amiga. A história, minha aliada.
Mestre: Você é a sexta. As cinco anteriores eu transformei em adubo.

[Vira-se lentamente.]

Mestre: Mas... talvez você seja diferente. 16,67% de chance, eu calculei.
Mestre: Prove-me. Domine a parte e dominará o todo. Vamos ver se você é a exceção.
```

### 6.C — Pós-luta — **Revelação do Mago Sombrio**

**Onde:** Jardim, após `MAGO_PORCENTAGEM_DERROTADO`
**Gatilho:** auto-disparada via `entryCutscene` do mapa Jardim (ou cutsceneSpace) — `required: [MAGO_PORCENTAGEM_DERROTADO, !boss_revelado]`

```
[Mestre das Porcentagens cai de joelhos. As plantas começam a se mexer levemente.]

Mestre (derrotado): Você... é a exceção. 100% da minha confiança. Estava errado.
Mestre (derrotado): Cuidado... ele está aqui. Ele sempre esteve aqui.

[Um vento frio. A figura do Mago Sombrio aparece atrás de Alice, sem aviso.]

Mago Sombrio: Impressionante, Alice. Não acreditei quando soube que você ainda pensava.
Mago Sombrio: Vinte anos. Vinte anos esta escola me esqueceu.
Mago Sombrio: Eu fui o vice-diretor. Eu organizei tudo. Cada nota. Cada matrícula. Cada nome.
Mago Sombrio: E quando me aposentaram... apagaram o meu também.

Alice: Você usou meus colegas. Eles eram só ferramentas pra você.

Mago Sombrio: Eles eram instrumentos. Eu sou o regente.
Mago Sombrio: Mas você... você é diferente. Você sabe somar, dividir, fracionar.
Mago Sombrio: Será que sabe enfrentar tudo de uma vez?

[Cutscene termina; combate final começa — mesma fase `jardim_porcentagem` reutiliza o engine, mas pode ser uma "fase 7" futura.]
```

**Salva:** `storyFlags.boss_revelado = true`

---

## Epílogo

**Onde:** Corredor, após derrotar todos os 6 magos
**Gatilho:** `cutsceneSpaces` central do Corredor, `required: [MAGO_PORCENTAGEM_DERROTADO, boss_revelado, !epilogo_done]`

```
[O Corredor está iluminado de novo. Alunos voltaram a circular. Os 6 magos (com sprites _derrotado) estão de pé, alguns conversando.]

Professor: Você conseguiu, Alice. A escola respira de novo.

[Alice olha em volta. O Conde dos Decimais acena. O Bibliófilo abraça um livro inteiro. A Sentinela cumprimenta um aluno "composto".]

Alice: E o Mago Sombrio?

Professor: Ele se foi. Pra onde, eu não sei.
Professor: Mas ele deixou algo importante pra trás: a prova de que ser esquecido não dá direito a apagar os outros.

[Pausa.]

Professor: Há outros colégios, Alice. Outras escolas com magos. Você só começou.

[Tela escurece. Texto de "fim de capítulo" / créditos.]
```

**Salva:** `storyFlags.epilogo_done = true`

---

## Falas Idle do Professor Mentor

Falar com o Mentor a qualquer momento (NPC permanente no Corredor) deve mostrar uma fala diferente conforme o progresso. Lista por estado:

| Progresso | Fala |
|---|---|
| Nenhum mago derrotado | "Comece pela Sala 1, Alice. O Conde está esperando." |
| 1 derrotado | "Bom. A Sala 2 te espera. O Mestre da Aproximação é... vago. Não se distraia." |
| 2 derrotados | "Três salas, três magos. O Grêmio é o próximo. A Sentinela conta números — e pessoas — friamente." |
| 3 derrotados (após Transição 1) | "Metade do caminho. Você sabe quem é o Sombrio agora. Não tema; saiba." |
| 4 derrotados | "A Biblioteca está mais leve. As páginas voltam a se colar. Vá ao Pátio." |
| 5 derrotados (após Transição 2) | "Apenas o Jardim resta. Eu não posso ir junto. Volte inteira." |
| 6 derrotados, pré-epílogo | "Você fez o impossível. Venha, vamos conversar." |
| Pós-epílogo | "Que tipo de matemágico você quer ser hoje, Alice?" |

---

## Falas Idle de Figurantes (ambientação curta)

Para encher os mapas com vida. Cada figurante pode ter 1 fala fixa. Use para preencher tile no Corredor e nas salas.

| Sprite | Sala | Fala |
|---|---|---|
| `figurante1.png` | Corredor | "Eu vi um número se mexer. Sério." |
| `figurante2.png` | Corredor | "A diretora trancou o gabinete dela. Ninguém sabe se ela está bem." |
| `figurante3.png` | Sala 1 | "Já tentei contar as vírgulas no quadro. Não consegui chegar ao fim." |
| `figurante4.png` | Sala 2 | "Tudo aqui é 'mais ou menos'. Sinto falta do exato." |
| `figurante5.png` | Grêmio | "Eu estava na lista da Sentinela. Acho que eu sumi por um tempo." |
| `figurante6.png` | Biblioteca | "Esse livro... metade tá faltando." |
| `figurante7.png` | Pátio | "Ele me convenceu de uma piada que ainda dói." |
| `figurante8.png` | Jardim | "Eu não sei como cheguei aqui. As plantas pararam." |
| `figurante9.png` | Corredor (pós-jogo) | "A escola voltou. Você é a Alice, né? Obrigada." |
| `figurante10.png` | Corredor (pós-jogo) | "Quer dividir meu lanche? Eu sei calcular as porções." |

---

## Mapa de StoryFlags

Tabela de referência para o programador (eu) implementar `required`/`set`:

| Flag | Setada quando |
|---|---|
| `intro_done` | Após cutscene de abertura |
| `mago1_aviso` | Após cutscene 1.A |
| `MAGO_DECIMAIS_DERROTADO` | Após concluir `sala1_decimais` (sync com backend) |
| `mago2_aviso` | Após cutscene 2.A |
| `MAGO_APROXIMACAO_DERROTADO` | Após concluir `sala2_aproximacao` |
| `mago3_aviso` | Após cutscene 3.A |
| `MAGO_PRIMOS_DERROTADO` | Após concluir `gremio_primos` |
| `metade_caminho_done` | Após Transição 1 |
| `mago4_aviso` | Após cutscene 4.A |
| `MAGO_FRACOES_DERROTADO` | Após concluir `biblioteca_fracoes` |
| `mago5_aviso` | Após cutscene 5.A |
| `MAGO_RACIONAIS_DERROTADO` | Após concluir `patio_racionais` |
| `antes_jardim_done` | Após Transição 2 |
| `mago6_aviso` | Após cutscene 6.A |
| `MAGO_PORCENTAGEM_DERROTADO` | Após concluir `jardim_porcentagem` |
| `boss_revelado` | Após cutscene 6.C |
| `epilogo_done` | Após cutscene de epílogo |

As 6 flags `MAGO_X_DERROTADO` vêm do backend via sync após login (ver Pilar 1 dos ajustes mecânicos).

---

## Total de cutscenes a implementar

| Tipo | Quantidade |
|---|---|
| Abertura | 1 |
| Aviso de mago | 6 |
| Pré-luta | 6 |
| Pós-luta | 6 |
| Transições no Corredor | 2 |
| Boss & epílogo | 2 |
| **Total cutscenes narrativas** | **23** |
| Falas idle do Mentor (8 estados) | 8 |
| Figurantes ambientais | 10 |
| **Total entradas de diálogo** | **41** |
